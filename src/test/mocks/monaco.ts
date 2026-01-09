import { vi } from "vitest";
import React from "react";

interface DiffEditorProps {
  original: string;
  modified: string;
  language?: string;
  theme?: string;
  options?: {
    renderSideBySide?: boolean;
    readOnly?: boolean;
    minimap?: { enabled?: boolean };
  };
  onMount?: (editor: unknown) => void;
}

interface EditorProps {
  value?: string;
  language?: string;
  theme?: string;
  options?: Record<string, unknown>;
  onChange?: (value: string | undefined) => void;
  onMount?: (editor: unknown) => void;
}

// Mock DiffEditor component
export const MockDiffEditor = vi.fn(
  ({
    original,
    modified,
    language,
    theme,
    options,
    onMount,
  }: DiffEditorProps) => {
    React.useEffect(() => {
      if (onMount) {
        onMount({
          getOriginalEditor: () => ({
            getValue: () => original,
          }),
          getModifiedEditor: () => ({
            getValue: () => modified,
          }),
        });
      }
    }, [onMount, original, modified]);

    return React.createElement("div", {
      "data-testid": "monaco-diff-editor",
      "data-original": original,
      "data-modified": modified,
      "data-language": language || "plaintext",
      "data-theme": theme || "vs-dark",
      "data-render-side-by-side": options?.renderSideBySide?.toString(),
      "data-readonly": options?.readOnly?.toString(),
      children: React.createElement(
        "div",
        { className: "monaco-diff-mock" },
        React.createElement(
          "div",
          { "data-testid": "original-content" },
          original
        ),
        React.createElement(
          "div",
          { "data-testid": "modified-content" },
          modified
        )
      ),
    });
  }
);

// Mock Editor component
export const MockEditor = vi.fn(
  ({ value, language, theme, options, onChange, onMount }: EditorProps) => {
    React.useEffect(() => {
      if (onMount) {
        onMount({
          getValue: () => value,
          setValue: (newValue: string) => {
            if (onChange) onChange(newValue);
          },
        });
      }
    }, [onMount, value, onChange]);

    return React.createElement("div", {
      "data-testid": "monaco-editor",
      "data-value": value,
      "data-language": language || "plaintext",
      "data-theme": theme || "vs-dark",
      children: value,
    });
  }
);

// Mock loader
export const MockLoader = {
  init: vi.fn().mockResolvedValue(undefined),
  config: vi.fn(),
};

// Setup function to mock Monaco editor
export function setupMonacoMock() {
  vi.mock("@monaco-editor/react", () => ({
    DiffEditor: MockDiffEditor,
    Editor: MockEditor,
    loader: MockLoader,
    default: MockEditor,
  }));
}

// Helper to get diff editor data
export function getDiffEditorData(container: HTMLElement) {
  const editor = container.querySelector('[data-testid="monaco-diff-editor"]');
  if (!editor) return null;

  return {
    original: editor.getAttribute("data-original"),
    modified: editor.getAttribute("data-modified"),
    language: editor.getAttribute("data-language"),
    theme: editor.getAttribute("data-theme"),
    renderSideBySide: editor.getAttribute("data-render-side-by-side") === "true",
    readOnly: editor.getAttribute("data-readonly") === "true",
  };
}
