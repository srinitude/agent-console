import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getLanguageFromPath,
  buildFileTree,
  formatRelativeTime,
  truncateUuid,
  formatTimestamp,
  getEventDisplayLabel,
  getEventBadgeClass,
  formatEventTime,
} from "./utils";
import type { FileEdit, SessionEvent } from "@/lib/types";

// =============================================================================
// getLanguageFromPath Tests
// =============================================================================

describe("getLanguageFromPath", () => {
  it("should return typescript for .ts files", () => {
    expect(getLanguageFromPath("src/app.ts")).toBe("typescript");
  });

  it("should return typescript for .tsx files", () => {
    expect(getLanguageFromPath("src/App.tsx")).toBe("typescript");
  });

  it("should return javascript for .js files", () => {
    expect(getLanguageFromPath("src/index.js")).toBe("javascript");
  });

  it("should return javascript for .jsx files", () => {
    expect(getLanguageFromPath("src/Component.jsx")).toBe("javascript");
  });

  it("should return rust for .rs files", () => {
    expect(getLanguageFromPath("src/main.rs")).toBe("rust");
  });

  it("should return python for .py files", () => {
    expect(getLanguageFromPath("script.py")).toBe("python");
  });

  it("should return go for .go files", () => {
    expect(getLanguageFromPath("main.go")).toBe("go");
  });

  it("should return shell for .sh files", () => {
    expect(getLanguageFromPath("script.sh")).toBe("shell");
  });

  it("should return shell for .bash files", () => {
    expect(getLanguageFromPath("script.bash")).toBe("shell");
  });

  it("should return json for .json files", () => {
    expect(getLanguageFromPath("package.json")).toBe("json");
  });

  it("should return yaml for .yaml files", () => {
    expect(getLanguageFromPath("config.yaml")).toBe("yaml");
  });

  it("should return yaml for .yml files", () => {
    expect(getLanguageFromPath("config.yml")).toBe("yaml");
  });

  it("should return markdown for .md files", () => {
    expect(getLanguageFromPath("README.md")).toBe("markdown");
  });

  it("should return plaintext for unknown extensions", () => {
    expect(getLanguageFromPath("file.unknown")).toBe("plaintext");
  });

  it("should handle files without extension", () => {
    // Dockerfile is recognized as a special file
    expect(getLanguageFromPath("Dockerfile")).toBe("dockerfile");
    // Unknown files without extension return plaintext
    expect(getLanguageFromPath("Makefile")).toBe("plaintext");
  });

  it("should be case-insensitive", () => {
    expect(getLanguageFromPath("file.TS")).toBe("typescript");
    expect(getLanguageFromPath("file.PY")).toBe("python");
  });

  it("should handle nested paths", () => {
    expect(getLanguageFromPath("src/components/ui/button.tsx")).toBe(
      "typescript"
    );
  });
});

// =============================================================================
// buildFileTree Tests
// =============================================================================

describe("buildFileTree", () => {
  const createFileEdit = (
    path: string,
    editType: "added" | "modified" | "deleted" = "modified"
  ): FileEdit => ({
    path,
    editType,
    lastEditedAt: new Date().toISOString(),
  });

  it("should build a tree from flat file paths", () => {
    const files = [createFileEdit("src/app.ts"), createFileEdit("src/lib/utils.ts")];

    const tree = buildFileTree(files);

    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe("src");
    expect(tree[0].type).toBe("folder");
    expect(tree[0].children).toHaveLength(2);
  });

  it("should sort folders before files", () => {
    const files = [createFileEdit("src/app.ts"), createFileEdit("src/lib/utils.ts")];

    const tree = buildFileTree(files);
    const srcChildren = tree[0].children;

    expect(srcChildren[0].type).toBe("folder"); // lib folder first
    expect(srcChildren[0].name).toBe("lib");
    expect(srcChildren[1].type).toBe("file"); // app.ts second
    expect(srcChildren[1].name).toBe("app.ts");
  });

  it("should handle empty input", () => {
    expect(buildFileTree([])).toEqual([]);
  });

  it("should assign correct editType to files", () => {
    const files = [createFileEdit("added.ts", "added"), createFileEdit("deleted.ts", "deleted")];

    const tree = buildFileTree(files);

    expect(tree[0].editType).toBe("added");
    expect(tree[1].editType).toBe("deleted");
  });

  it("should handle root-level files", () => {
    const files = [createFileEdit("README.md"), createFileEdit("package.json")];

    const tree = buildFileTree(files);

    expect(tree).toHaveLength(2);
    expect(tree[0].type).toBe("file");
    expect(tree[1].type).toBe("file");
  });

  it("should handle deeply nested paths", () => {
    const files = [createFileEdit("src/components/ui/forms/input.tsx")];

    const tree = buildFileTree(files);

    expect(tree[0].name).toBe("src");
    expect(tree[0].children[0].name).toBe("components");
    expect(tree[0].children[0].children[0].name).toBe("ui");
    expect(tree[0].children[0].children[0].children[0].name).toBe("forms");
    expect(tree[0].children[0].children[0].children[0].children[0].name).toBe(
      "input.tsx"
    );
  });

  it("should sort files alphabetically within folders", () => {
    const files = [
      createFileEdit("src/zebra.ts"),
      createFileEdit("src/apple.ts"),
      createFileEdit("src/mango.ts"),
    ];

    const tree = buildFileTree(files);
    const srcChildren = tree[0].children;

    expect(srcChildren[0].name).toBe("apple.ts");
    expect(srcChildren[1].name).toBe("mango.ts");
    expect(srcChildren[2].name).toBe("zebra.ts");
  });

  it("should merge files into existing folders", () => {
    const files = [
      createFileEdit("src/a.ts"),
      createFileEdit("src/b.ts"),
      createFileEdit("src/lib/c.ts"),
    ];

    const tree = buildFileTree(files);

    expect(tree[0].name).toBe("src");
    expect(tree[0].children).toHaveLength(3); // lib folder + a.ts + b.ts
  });
});

// =============================================================================
// formatRelativeTime Tests
// =============================================================================

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  it('should return "Just now" for recent times', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe("Just now");
  });

  it("should return minutes ago", () => {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    expect(formatRelativeTime(thirtyMinsAgo)).toBe("30m ago");
  });

  it("should return hours ago", () => {
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveHoursAgo)).toBe("5h ago");
  });

  it('should return "Yesterday"', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(yesterday)).toBe("Yesterday");
  });

  it("should return days ago", () => {
    const threeDaysAgo = new Date(
      Date.now() - 3 * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(formatRelativeTime(threeDaysAgo)).toBe("3d ago");
  });

  it("should handle edge case at 59 minutes", () => {
    const fiftyNineMins = new Date(Date.now() - 59 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiftyNineMins)).toBe("59m ago");
  });

  it("should handle edge case at 23 hours", () => {
    const twentyThreeHours = new Date(
      Date.now() - 23 * 60 * 60 * 1000
    ).toISOString();
    expect(formatRelativeTime(twentyThreeHours)).toBe("23h ago");
  });
});

// =============================================================================
// truncateUuid Tests
// =============================================================================

describe("truncateUuid", () => {
  it("should return first 8 characters", () => {
    expect(truncateUuid("12345678-abcd-efgh-ijkl-mnopqrstuvwx")).toBe(
      "12345678"
    );
  });

  it("should handle short strings", () => {
    expect(truncateUuid("short")).toBe("short");
  });

  it("should handle exactly 8 characters", () => {
    expect(truncateUuid("12345678")).toBe("12345678");
  });
});

// =============================================================================
// formatTimestamp Tests
// =============================================================================

describe("formatTimestamp", () => {
  it("should format timestamp with hours, minutes, seconds", () => {
    const result = formatTimestamp("2024-01-15T14:30:45Z");
    // Result depends on local timezone, but should contain colon-separated time
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
  });
});

// =============================================================================
// getEventDisplayLabel Tests
// =============================================================================

describe("getEventDisplayLabel", () => {
  const createEvent = (overrides: Partial<SessionEvent> = {}): SessionEvent => ({
    sequence: 0,
    uuid: "test-uuid",
    timestamp: new Date().toISOString(),
    eventType: "user",
    subtype: null,
    toolName: null,
    preview: "Test preview",
    byteOffset: 0,
    compactMetadata: null,
    summary: null,
    logicalParentUuid: null,
    leafUuid: null,
    launchedAgentId: null,
    launchedAgentDescription: null,
    launchedAgentPrompt: null,
    launchedAgentIsAsync: null,
    launchedAgentStatus: null,
    userType: null,
    isCompactSummary: null,
    isToolResult: false,
    isMeta: false,
    ...overrides,
  });

  it('should return "compaction" for compact_boundary subtype', () => {
    const event = createEvent({
      eventType: "system",
      subtype: "compact_boundary",
    });
    expect(getEventDisplayLabel(event)).toBe("compaction");
  });

  it('should return "me" for external user input', () => {
    const event = createEvent({
      eventType: "user",
      userType: "external",
      isCompactSummary: null,
      isMeta: false,
      isToolResult: false,
      preview: "Hello",
    });
    expect(getEventDisplayLabel(event)).toBe("me");
  });

  it('should return "context" for compact summaries', () => {
    const event = createEvent({
      eventType: "user",
      isCompactSummary: true,
    });
    expect(getEventDisplayLabel(event)).toBe("context");
  });

  it('should return "context" for tool results', () => {
    const event = createEvent({
      eventType: "user",
      isToolResult: true,
    });
    expect(getEventDisplayLabel(event)).toBe("context");
  });

  it('should return "context" for meta injections', () => {
    const event = createEvent({
      eventType: "user",
      isMeta: true,
    });
    expect(getEventDisplayLabel(event)).toBe("context");
  });

  it('should return "context" for command notifications', () => {
    const event = createEvent({
      eventType: "user",
      preview: "<command-message>Some command</command-message>",
    });
    expect(getEventDisplayLabel(event)).toBe("context");
  });

  it("should return event type for assistant events", () => {
    const event = createEvent({ eventType: "assistant" });
    expect(getEventDisplayLabel(event)).toBe("assistant");
  });

  it("should return event type for system events", () => {
    const event = createEvent({ eventType: "system" });
    expect(getEventDisplayLabel(event)).toBe("system");
  });

  it("should return event type for summary events", () => {
    const event = createEvent({ eventType: "summary" });
    expect(getEventDisplayLabel(event)).toBe("summary");
  });
});

// =============================================================================
// getEventBadgeClass Tests
// =============================================================================

describe("getEventBadgeClass", () => {
  const createEvent = (overrides: Partial<SessionEvent> = {}): SessionEvent => ({
    sequence: 0,
    uuid: "test-uuid",
    timestamp: new Date().toISOString(),
    eventType: "user",
    subtype: null,
    toolName: null,
    preview: "Test",
    byteOffset: 0,
    compactMetadata: null,
    summary: null,
    logicalParentUuid: null,
    leafUuid: null,
    launchedAgentId: null,
    launchedAgentDescription: null,
    launchedAgentPrompt: null,
    launchedAgentIsAsync: null,
    launchedAgentStatus: null,
    userType: null,
    isCompactSummary: null,
    isToolResult: false,
    isMeta: false,
    ...overrides,
  });

  it("should return amber class for compact_boundary", () => {
    const event = createEvent({
      eventType: "system",
      subtype: "compact_boundary",
    });
    expect(getEventBadgeClass(event)).toContain("amber");
  });

  it("should return blue class for human user input", () => {
    const event = createEvent({
      eventType: "user",
      userType: "external",
    });
    expect(getEventBadgeClass(event)).toContain("blue");
  });

  it("should return slate class for context/system user messages", () => {
    const event = createEvent({
      eventType: "user",
      isToolResult: true,
    });
    expect(getEventBadgeClass(event)).toContain("slate");
  });

  it("should return purple class for assistant events", () => {
    const event = createEvent({ eventType: "assistant" });
    expect(getEventBadgeClass(event)).toContain("purple");
  });

  it("should return yellow class for system events", () => {
    const event = createEvent({ eventType: "system" });
    expect(getEventBadgeClass(event)).toContain("yellow");
  });

  it("should return green class for summary events", () => {
    const event = createEvent({ eventType: "summary" });
    expect(getEventBadgeClass(event)).toContain("green");
  });

  it("should return muted class for unknown event types", () => {
    const event = createEvent({ eventType: "unknown" });
    expect(getEventBadgeClass(event)).toContain("muted");
  });
});

// =============================================================================
// formatEventTime Tests
// =============================================================================

describe("formatEventTime", () => {
  it("should return empty string for null", () => {
    expect(formatEventTime(null)).toBe("");
  });

  it("should format timestamp with milliseconds", () => {
    const result = formatEventTime("2025-01-28T12:53:06.082Z");
    expect(result).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}/);
  });

  it("should include timezone abbreviation", () => {
    const result = formatEventTime("2025-01-28T12:53:06.082Z");
    // Should have some timezone at the end (like EST, PST, UTC, etc.)
    expect(result).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} \w+/);
  });

  it("should return empty string for invalid timestamp", () => {
    expect(formatEventTime("invalid-date")).toBe("");
  });
});
