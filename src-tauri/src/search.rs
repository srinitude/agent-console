//! Session event search with boolean query support.
//!
//! Supports queries like:
//! - `error` - single term
//! - `error bash` - implicit AND (both must match)
//! - `error AND bash` - explicit AND
//! - `error OR warning` - explicit OR
//! - `error AND bash OR write` - mixed (AND binds tighter than OR)

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

/// A match result with line number, byte offset, and snippet.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchMatch {
    /// Line number (0-indexed, same as event sequence).
    pub sequence: u32,
    /// Byte offset in file for loading full JSON.
    pub byte_offset: u64,
    /// Snippet of text showing match context.
    pub snippet: String,
}

/// Search response returned to frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResponse {
    /// Matching line indices.
    pub matches: Vec<SearchMatch>,
    /// Total lines searched.
    pub total_searched: u32,
    /// Whether search was truncated (hit max_results limit).
    pub truncated: bool,
}

/// Token from query tokenization.
#[derive(Debug, Clone, PartialEq)]
enum Token {
    Term(String),
    And,
    Or,
}

/// Boolean expression AST for search queries.
#[derive(Debug, Clone)]
pub enum SearchExpr {
    /// Single search term (case-insensitive substring match).
    Term(String),
    /// Both expressions must match.
    And(Box<SearchExpr>, Box<SearchExpr>),
    /// Either expression must match.
    Or(Box<SearchExpr>, Box<SearchExpr>),
}

impl SearchExpr {
    /// Parse a query string into a SearchExpr AST.
    ///
    /// Grammar (implicit AND between terms, explicit OR):
    /// ```text
    /// expr     -> or_expr
    /// or_expr  -> and_expr ("OR" and_expr)*
    /// and_expr -> term (["AND"] term)*
    /// term     -> word
    /// ```
    ///
    /// Examples:
    /// - `error` -> Term("error")
    /// - `error bash` -> And(Term("error"), Term("bash"))
    /// - `error AND bash` -> And(Term("error"), Term("bash"))
    /// - `error OR warning` -> Or(Term("error"), Term("warning"))
    /// - `error AND bash OR write` -> Or(And(Term("error"), Term("bash")), Term("write"))
    pub fn parse(query: &str) -> Option<SearchExpr> {
        let tokens = Self::tokenize(query);
        if tokens.is_empty() {
            return None;
        }
        let mut pos = 0;
        Self::parse_or_expr(&tokens, &mut pos)
    }

    /// Tokenize query into terms and operators.
    /// AND/OR (uppercase) are operators, everything else is a term.
    fn tokenize(query: &str) -> Vec<Token> {
        let mut tokens = Vec::new();
        for word in query.split_whitespace() {
            match word {
                "AND" => tokens.push(Token::And),
                "OR" => tokens.push(Token::Or),
                _ => tokens.push(Token::Term(word.to_lowercase())),
            }
        }
        tokens
    }

    /// Parse OR expression (lowest precedence).
    fn parse_or_expr(tokens: &[Token], pos: &mut usize) -> Option<SearchExpr> {
        let mut left = Self::parse_and_expr(tokens, pos)?;

        while *pos < tokens.len() {
            if matches!(tokens.get(*pos), Some(Token::Or)) {
                *pos += 1;
                // If nothing after OR, just ignore it (trailing operator)
                if let Some(right) = Self::parse_and_expr(tokens, pos) {
                    left = SearchExpr::Or(Box::new(left), Box::new(right));
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        Some(left)
    }

    /// Parse AND expression (higher precedence than OR).
    /// Handles both explicit AND and implicit AND (adjacent terms).
    fn parse_and_expr(tokens: &[Token], pos: &mut usize) -> Option<SearchExpr> {
        let mut left = Self::parse_term(tokens, pos)?;

        while *pos < tokens.len() {
            match tokens.get(*pos) {
                Some(Token::And) => {
                    // Explicit AND
                    *pos += 1;
                    let right = Self::parse_term(tokens, pos)?;
                    left = SearchExpr::And(Box::new(left), Box::new(right));
                }
                Some(Token::Term(_)) => {
                    // Implicit AND (adjacent terms)
                    let right = Self::parse_term(tokens, pos)?;
                    left = SearchExpr::And(Box::new(left), Box::new(right));
                }
                _ => break, // OR or end
            }
        }

        Some(left)
    }

    /// Parse a single term.
    fn parse_term(tokens: &[Token], pos: &mut usize) -> Option<SearchExpr> {
        match tokens.get(*pos) {
            Some(Token::Term(s)) => {
                *pos += 1;
                Some(SearchExpr::Term(s.clone()))
            }
            Some(Token::And) | Some(Token::Or) => {
                // Orphan operator - skip it and try next
                *pos += 1;
                if *pos < tokens.len() {
                    Self::parse_term(tokens, pos)
                } else {
                    None
                }
            }
            None => None,
        }
    }

    /// Check if this expression matches a line (case-insensitive).
    pub fn matches(&self, line: &str) -> bool {
        let line_lower = line.to_lowercase();
        self.matches_impl(&line_lower)
    }

    fn matches_impl(&self, line: &str) -> bool {
        match self {
            SearchExpr::Term(term) => line.contains(term),
            SearchExpr::And(left, right) => left.matches_impl(line) && right.matches_impl(line),
            SearchExpr::Or(left, right) => left.matches_impl(line) || right.matches_impl(line),
        }
    }
}

/// Search a session file for matching events.
///
/// Returns matching sequences in ascending order (oldest first).
pub fn search_session(
    project_path: &str,
    session_id: &str,
    query: &str,
    max_results: Option<u32>,
) -> SearchResponse {
    let empty_response = SearchResponse {
        matches: Vec::new(),
        total_searched: 0,
        truncated: false,
    };

    // Parse query
    let expr = match SearchExpr::parse(query) {
        Some(e) => e,
        None => return empty_response,
    };

    // Get session file path
    let session_file = match crate::claude_code::get_session_file_path(project_path, session_id) {
        Some(p) => p,
        None => return empty_response,
    };

    search_file(&session_file, &expr, max_results)
}

/// Search a sub-agent file for matching events.
pub fn search_subagent(
    project_path: &str,
    agent_id: &str,
    query: &str,
    max_results: Option<u32>,
) -> SearchResponse {
    let empty_response = SearchResponse {
        matches: Vec::new(),
        total_searched: 0,
        truncated: false,
    };

    // Parse query
    let expr = match SearchExpr::parse(query) {
        Some(e) => e,
        None => return empty_response,
    };

    // Get sub-agent file path
    let agent_file = match crate::claude_code::get_subagent_file_path(project_path, agent_id) {
        Some(p) => p,
        None => return empty_response,
    };

    search_file(&agent_file, &expr, max_results)
}

/// Extract all search terms from an expression.
fn collect_terms(expr: &SearchExpr) -> Vec<String> {
    match expr {
        SearchExpr::Term(t) => vec![t.clone()],
        SearchExpr::And(left, right) | SearchExpr::Or(left, right) => {
            let mut terms = collect_terms(left);
            terms.extend(collect_terms(right));
            terms
        }
    }
}

/// Extract text content from a JSON event line.
fn extract_text_from_json(line: &str) -> String {
    let json: Value = match serde_json::from_str(line) {
        Ok(v) => v,
        Err(_) => return line.to_string(),
    };

    // Try message.content first (assistant/user messages)
    if let Some(content) = json.get("message").and_then(|m| m.get("content")) {
        if let Some(text) = extract_text_from_content(content) {
            return text;
        }
    }

    // Try content directly (system messages)
    if let Some(content) = json.get("content").and_then(|c| c.as_str()) {
        return content.to_string();
    }

    // Try summary (summary events)
    if let Some(summary) = json.get("summary").and_then(|s| s.as_str()) {
        return summary.to_string();
    }

    // Fallback to full JSON
    line.to_string()
}

/// Extract text from content field (can be string or array of content blocks).
fn extract_text_from_content(content: &Value) -> Option<String> {
    match content {
        Value::String(s) => Some(s.clone()),
        Value::Array(arr) => {
            // Look for text content first
            for item in arr {
                if let Some(obj) = item.as_object() {
                    if obj.get("type").and_then(|t| t.as_str()) == Some("text") {
                        if let Some(text) = obj.get("text").and_then(|t| t.as_str()) {
                            return Some(text.to_string());
                        }
                    }
                }
            }
            // Check for thinking
            for item in arr {
                if let Some(obj) = item.as_object() {
                    if obj.get("type").and_then(|t| t.as_str()) == Some("thinking") {
                        if let Some(thinking) = obj.get("thinking").and_then(|t| t.as_str()) {
                            return Some(thinking.to_string());
                        }
                    }
                }
            }
            // Check for tool_use
            for item in arr {
                if let Some(obj) = item.as_object() {
                    if obj.get("type").and_then(|t| t.as_str()) == Some("tool_use") {
                        if let Some(name) = obj.get("name").and_then(|n| n.as_str()) {
                            if let Some(input) = obj.get("input") {
                                return Some(format!("[{}] {}", name, input));
                            }
                            return Some(format!("[{}]", name));
                        }
                    }
                }
            }
            None
        }
        _ => None,
    }
}

/// Find the nearest valid UTF-8 char boundary at or before the given byte index.
fn floor_char_boundary(s: &str, index: usize) -> usize {
    if index >= s.len() {
        return s.len();
    }
    let mut i = index;
    while i > 0 && !s.is_char_boundary(i) {
        i -= 1;
    }
    i
}

/// Find the nearest valid UTF-8 char boundary at or after the given byte index.
fn ceil_char_boundary(s: &str, index: usize) -> usize {
    if index >= s.len() {
        return s.len();
    }
    let mut i = index;
    while i < s.len() && !s.is_char_boundary(i) {
        i += 1;
    }
    i
}

/// Build a snippet with context around the first matched term.
fn build_snippet(text: &str, terms: &[String], context_chars: usize) -> String {
    let text_lower = text.to_lowercase();

    // Find the earliest matching term position
    let mut earliest_pos: Option<usize> = None;
    for term in terms {
        if let Some(pos) = text_lower.find(term) {
            earliest_pos = Some(match earliest_pos {
                Some(e) if e < pos => e,
                _ => pos,
            });
        }
    }

    let pos = match earliest_pos {
        Some(p) => p,
        None => 0, // Fallback to start if no term found (shouldn't happen)
    };

    // Calculate snippet bounds (ensure valid UTF-8 boundaries)
    let start = floor_char_boundary(text, pos.saturating_sub(context_chars));
    let end = ceil_char_boundary(text, (pos + context_chars).min(text.len()));

    // Find word boundaries to avoid cutting words (safely slice at char boundaries)
    let start = text[..start].rfind(' ').map(|p| p + 1).unwrap_or(start);
    let end_slice_start = ceil_char_boundary(text, end);
    let end = text[end_slice_start..]
        .find(' ')
        .map(|p| end_slice_start + p)
        .unwrap_or(end);

    // Ensure final slice boundaries are valid
    let start = floor_char_boundary(text, start);
    let end = ceil_char_boundary(text, end);

    let mut snippet = String::new();
    if start > 0 {
        snippet.push_str("...");
    }
    snippet.push_str(text[start..end].trim());
    if end < text.len() {
        snippet.push_str("...");
    }

    snippet
}

/// Search a file for matching lines.
fn search_file(file_path: &Path, expr: &SearchExpr, max_results: Option<u32>) -> SearchResponse {
    let empty_response = SearchResponse {
        matches: Vec::new(),
        total_searched: 0,
        truncated: false,
    };

    let file = match File::open(file_path) {
        Ok(f) => f,
        Err(_) => return empty_response,
    };

    let reader = BufReader::new(file);
    let max_results = max_results.unwrap_or(10000) as usize;
    let mut matches = Vec::new();
    let mut byte_offset: u64 = 0;
    let mut total_searched: u32 = 0;
    let terms = collect_terms(expr);

    for (sequence, line_result) in reader.lines().enumerate() {
        let line = match line_result {
            Ok(l) => l,
            Err(_) => {
                byte_offset += 1; // Account for newline on error
                continue;
            }
        };

        let line_len = line.len() as u64 + 1; // +1 for newline

        if expr.matches(&line) {
            // Extract text and build snippet
            let text = extract_text_from_json(&line);
            let snippet = build_snippet(&text, &terms, 60);

            matches.push(SearchMatch {
                sequence: sequence as u32,
                byte_offset,
                snippet,
            });

            if matches.len() >= max_results {
                return SearchResponse {
                    matches,
                    total_searched,
                    truncated: true,
                };
            }
        }

        byte_offset += line_len;
        total_searched += 1;
    }

    SearchResponse {
        matches,
        total_searched,
        truncated: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // =============================================================================
    // Tokenization Tests
    // =============================================================================

    #[test]
    fn test_tokenize_simple() {
        let tokens = SearchExpr::tokenize("error warning");
        assert_eq!(tokens.len(), 2);
        assert!(matches!(&tokens[0], Token::Term(s) if s == "error"));
        assert!(matches!(&tokens[1], Token::Term(s) if s == "warning"));
    }

    #[test]
    fn test_tokenize_with_operators() {
        let tokens = SearchExpr::tokenize("error AND warning OR info");
        assert_eq!(tokens.len(), 5);
        assert!(matches!(&tokens[0], Token::Term(_)));
        assert!(matches!(&tokens[1], Token::And));
        assert!(matches!(&tokens[2], Token::Term(_)));
        assert!(matches!(&tokens[3], Token::Or));
        assert!(matches!(&tokens[4], Token::Term(_)));
    }

    #[test]
    fn test_tokenize_preserves_lowercase() {
        let tokens = SearchExpr::tokenize("ERROR Warning");
        if let Token::Term(ref s) = tokens[0] {
            assert_eq!(s, "error");
        }
        if let Token::Term(ref s) = tokens[1] {
            assert_eq!(s, "warning");
        }
    }

    #[test]
    fn test_tokenize_and_or_remain_operators() {
        // AND and OR (uppercase) should be operators
        let tokens = SearchExpr::tokenize("and AND or OR");
        assert!(matches!(&tokens[0], Token::Term(s) if s == "and")); // lowercase "and" is a term
        assert!(matches!(&tokens[1], Token::And));
        assert!(matches!(&tokens[2], Token::Term(s) if s == "or")); // lowercase "or" is a term
        assert!(matches!(&tokens[3], Token::Or));
    }

    // =============================================================================
    // Parsing Tests
    // =============================================================================

    #[test]
    fn test_parse_single_term() {
        let expr = SearchExpr::parse("error").unwrap();
        assert!(expr.matches("This is an error message"));
        assert!(expr.matches("ERROR in caps"));
        assert!(!expr.matches("This is fine"));
    }

    #[test]
    fn test_parse_implicit_and() {
        let expr = SearchExpr::parse("error bash").unwrap();
        assert!(expr.matches("error in bash command"));
        assert!(expr.matches("bash threw an error"));
        assert!(!expr.matches("error in python"));
        assert!(!expr.matches("bash completed successfully"));
    }

    #[test]
    fn test_parse_explicit_and() {
        let expr = SearchExpr::parse("error AND bash").unwrap();
        assert!(expr.matches("error in bash command"));
        assert!(!expr.matches("error in python"));
    }

    #[test]
    fn test_parse_or() {
        let expr = SearchExpr::parse("error OR warning").unwrap();
        assert!(expr.matches("This is an error"));
        assert!(expr.matches("This is a warning"));
        assert!(!expr.matches("This is fine"));
    }

    #[test]
    fn test_parse_and_or_precedence() {
        // "error AND bash OR write" should be "(error AND bash) OR write"
        let expr = SearchExpr::parse("error AND bash OR write").unwrap();
        assert!(expr.matches("error in bash")); // matches left side
        assert!(expr.matches("write to file")); // matches right side
        assert!(!expr.matches("error in python")); // doesn't match either
    }

    #[test]
    fn test_parse_multiple_or() {
        let expr = SearchExpr::parse("error OR warning OR info").unwrap();
        assert!(expr.matches("error occurred"));
        assert!(expr.matches("warning issued"));
        assert!(expr.matches("info message"));
        assert!(!expr.matches("debug only"));
    }

    #[test]
    fn test_parse_complex_expression() {
        // "(a b) OR (c d)" => ((a AND b) OR c) AND d with left-to-right
        // Actually: "a b OR c d" = ((a AND b) OR c) AND d? Let's verify
        let expr = SearchExpr::parse("error bash OR write file").unwrap();
        // "error bash OR write file" parses as: (error AND bash) OR (write AND file)
        assert!(expr.matches("error in bash")); // left side
        assert!(expr.matches("write to file")); // right side
        assert!(!expr.matches("error only"));
        assert!(!expr.matches("write only"));
    }

    #[test]
    fn test_case_insensitive() {
        let expr = SearchExpr::parse("Error").unwrap();
        assert!(expr.matches("ERROR"));
        assert!(expr.matches("error"));
        assert!(expr.matches("ErRoR"));
    }

    #[test]
    fn test_empty_query() {
        assert!(SearchExpr::parse("").is_none());
        assert!(SearchExpr::parse("   ").is_none());
    }

    #[test]
    fn test_orphan_operators() {
        // Orphan AND at start - should skip and parse rest
        let expr = SearchExpr::parse("AND error");
        assert!(expr.is_some());
        assert!(expr.unwrap().matches("error here"));

        // Orphan OR at end - should parse what's before
        let expr = SearchExpr::parse("error OR");
        assert!(expr.is_some());
    }

    #[test]
    fn test_only_operators() {
        // Should handle gracefully
        assert!(SearchExpr::parse("AND").is_none());
        assert!(SearchExpr::parse("AND OR").is_none());
        assert!(SearchExpr::parse("OR AND OR").is_none());
    }

    // =============================================================================
    // collect_terms Tests
    // =============================================================================

    #[test]
    fn test_collect_terms_single() {
        let expr = SearchExpr::parse("error").unwrap();
        let terms = collect_terms(&expr);
        assert_eq!(terms, vec!["error".to_string()]);
    }

    #[test]
    fn test_collect_terms_multiple() {
        let expr = SearchExpr::parse("error AND warning OR info").unwrap();
        let terms = collect_terms(&expr);
        assert_eq!(terms.len(), 3);
        assert!(terms.contains(&"error".to_string()));
        assert!(terms.contains(&"warning".to_string()));
        assert!(terms.contains(&"info".to_string()));
    }

    // =============================================================================
    // UTF-8 Boundary Tests
    // =============================================================================

    #[test]
    fn test_floor_char_boundary() {
        let s = "hello";
        assert_eq!(floor_char_boundary(s, 5), 5);
        assert_eq!(floor_char_boundary(s, 10), 5);
        assert_eq!(floor_char_boundary(s, 0), 0);
        assert_eq!(floor_char_boundary(s, 3), 3);
    }

    #[test]
    fn test_ceil_char_boundary() {
        let s = "hello";
        assert_eq!(ceil_char_boundary(s, 0), 0);
        assert_eq!(ceil_char_boundary(s, 3), 3);
        assert_eq!(ceil_char_boundary(s, 10), 5);
    }

    // =============================================================================
    // extract_text_from_json Tests
    // =============================================================================

    #[test]
    fn test_extract_text_from_json_user_message() {
        let line = r#"{"message":{"content":"Hello world"}}"#;
        let text = extract_text_from_json(line);
        assert_eq!(text, "Hello world");
    }

    #[test]
    fn test_extract_text_from_json_system() {
        let line = r#"{"content":"System message"}"#;
        let text = extract_text_from_json(line);
        assert_eq!(text, "System message");
    }

    #[test]
    fn test_extract_text_from_json_summary() {
        let line = r#"{"summary":"Session summary text"}"#;
        let text = extract_text_from_json(line);
        assert_eq!(text, "Session summary text");
    }

    #[test]
    fn test_extract_text_from_json_array_content() {
        let line = r#"{"message":{"content":[{"type":"text","text":"Array text content"}]}}"#;
        let text = extract_text_from_json(line);
        assert_eq!(text, "Array text content");
    }

    #[test]
    fn test_extract_text_from_json_thinking() {
        let line = r#"{"message":{"content":[{"type":"thinking","thinking":"Thinking content"}]}}"#;
        let text = extract_text_from_json(line);
        assert_eq!(text, "Thinking content");
    }

    #[test]
    fn test_extract_text_from_json_invalid() {
        let line = "not valid json";
        let text = extract_text_from_json(line);
        assert_eq!(text, "not valid json"); // Falls back to original line
    }

    // =============================================================================
    // Snippet Building Tests
    // =============================================================================

    #[test]
    fn test_build_snippet_simple() {
        let text = "This is a simple error message";
        let terms = vec!["error".to_string()];
        let snippet = build_snippet(text, &terms, 50);
        assert!(snippet.contains("error"));
    }

    #[test]
    fn test_build_snippet_truncates_long_text() {
        let text = "A very long prefix before the error message and a very long suffix after it";
        let terms = vec!["error".to_string()];
        let snippet = build_snippet(text, &terms, 10);
        assert!(snippet.contains("error"));
        assert!(snippet.len() < text.len());
    }

    #[test]
    fn test_build_snippet_adds_ellipsis() {
        let text = "prefix content error suffix content";
        let terms = vec!["error".to_string()];
        let snippet = build_snippet(text, &terms, 5);
        // Should have ellipsis since we're cutting from middle
        assert!(snippet.contains("..."));
    }

    #[test]
    fn test_snippet_multibyte_utf8() {
        // Test that build_snippet handles multi-byte UTF-8 characters without panicking
        // The box-drawing character '─' is 3 bytes (E2 94 80)
        let text = "prefix ─────────────────────────────────────── error ─────────────────────────────────────── suffix";
        let terms = vec!["error".to_string()];

        // Should not panic - this was the bug that caused the crash
        let snippet = build_snippet(text, &terms, 30);
        assert!(snippet.contains("error"));
    }

    #[test]
    fn test_snippet_emoji() {
        // Test with emoji (4-byte UTF-8)
        let text = "Hello 🎉🎊🎈 world error 🚀🌟 end";
        let terms = vec!["error".to_string()];

        let snippet = build_snippet(text, &terms, 20);
        assert!(snippet.contains("error"));
    }

    #[test]
    fn test_snippet_chinese_characters() {
        // Chinese characters are 3 bytes each
        let text = "这是一段中文文本 error 更多中文内容";
        let terms = vec!["error".to_string()];
        let snippet = build_snippet(text, &terms, 20);
        assert!(snippet.contains("error"));
    }

    // =============================================================================
    // SearchResponse Tests
    // =============================================================================

    #[test]
    fn test_search_response_serialization() {
        let response = SearchResponse {
            matches: vec![SearchMatch {
                sequence: 0,
                byte_offset: 100,
                snippet: "test snippet".to_string(),
            }],
            total_searched: 50,
            truncated: false,
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"sequence\":0"));
        assert!(json.contains("\"byteOffset\":100"));
        assert!(json.contains("\"totalSearched\":50"));
    }
}
