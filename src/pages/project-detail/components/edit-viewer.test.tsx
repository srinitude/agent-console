import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditViewer } from "./edit-viewer";
import { ThemeProvider } from "@/components/theme-provider";
import { createMockFileEdit, createMockFileDiff } from "@/test/mocks/tauri";

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock Monaco editor
vi.mock("@monaco-editor/react", () => ({
  DiffEditor: vi.fn(({ original, modified }) => (
    <div data-testid="monaco-diff-editor">
      <div data-testid="original">{original}</div>
      <div data-testid="modified">{modified}</div>
    </div>
  )),
}));

// Mock react-resizable-panels
vi.mock("react-resizable-panels", () => ({
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PanelGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PanelResizeHandle: () => <div data-testid="resize-handle" />,
}));

import { invoke } from "@tauri-apps/api/core";

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("EditViewer", () => {
  const defaultProps = {
    projectPath: "/path/to/project",
    sessionId: "session-123",
    fileEdits: [],
    fileEditsLoading: false,
    selectedFile: null,
    onSelectFile: vi.fn(),
    diffs: [],
    diffsLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invoke).mockResolvedValue(null);
  });

  it("should show loading state when fileEditsLoading is true", () => {
    render(
      <TestWrapper>
        <EditViewer {...defaultProps} fileEditsLoading={true} />
      </TestWrapper>
    );

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("should show empty state when no files", () => {
    render(
      <TestWrapper>
        <EditViewer {...defaultProps} fileEdits={[]} />
      </TestWrapper>
    );

    expect(screen.getByText("No file edits in this session")).toBeInTheDocument();
  });

  it("should display file list", () => {
    const fileEdits = [
      createMockFileEdit({ path: "src/app.ts", editType: "modified" }),
      createMockFileEdit({ path: "src/lib/utils.ts", editType: "added" }),
    ];

    render(
      <TestWrapper>
        <EditViewer {...defaultProps} fileEdits={fileEdits} />
      </TestWrapper>
    );

    expect(screen.getByText("app.ts")).toBeInTheDocument();
    expect(screen.getByText("utils.ts")).toBeInTheDocument();
  });

  it("should call onSelectFile when file is clicked", async () => {
    const user = userEvent.setup();
    const onSelectFile = vi.fn();
    const fileEdits = [createMockFileEdit({ path: "src/app.ts" })];

    render(
      <TestWrapper>
        <EditViewer
          {...defaultProps}
          fileEdits={fileEdits}
          onSelectFile={onSelectFile}
        />
      </TestWrapper>
    );

    await user.click(screen.getByText("app.ts"));

    expect(onSelectFile).toHaveBeenCalledWith("src/app.ts");
  });

  it("should show file count", () => {
    const fileEdits = [
      createMockFileEdit({ path: "file1.ts" }),
      createMockFileEdit({ path: "file2.ts" }),
      createMockFileEdit({ path: "file3.ts" }),
    ];

    render(
      <TestWrapper>
        <EditViewer {...defaultProps} fileEdits={fileEdits} />
      </TestWrapper>
    );

    // Component shows "Changed Files (3)"
    expect(screen.getByText(/Changed Files.*\(3\)/)).toBeInTheDocument();
  });

  it("should show selected file styling", () => {
    const fileEdits = [createMockFileEdit({ path: "src/app.ts" })];

    const { container } = render(
      <TestWrapper>
        <EditViewer
          {...defaultProps}
          fileEdits={fileEdits}
          selectedFile="src/app.ts"
        />
      </TestWrapper>
    );

    // Should have accent styling for selected file
    expect(container.querySelector(".bg-accent")).toBeInTheDocument();
  });

  it("should display diffs when file is selected", () => {
    const fileEdits = [createMockFileEdit({ path: "src/app.ts" })];
    const diffs = [
      createMockFileDiff({
        oldString: "old code",
        newString: "new code",
        sequence: 1,
      }),
    ];

    render(
      <TestWrapper>
        <EditViewer
          {...defaultProps}
          fileEdits={fileEdits}
          selectedFile="src/app.ts"
          diffs={diffs}
        />
      </TestWrapper>
    );

    expect(screen.getByTestId("monaco-diff-editor")).toBeInTheDocument();
  });

  it("should show loading state when diffs are loading", () => {
    const fileEdits = [createMockFileEdit({ path: "src/app.ts" })];

    render(
      <TestWrapper>
        <EditViewer
          {...defaultProps}
          fileEdits={fileEdits}
          selectedFile="src/app.ts"
          diffsLoading={true}
        />
      </TestWrapper>
    );

    const spinners = document.querySelectorAll(".animate-spin");
    expect(spinners.length).toBeGreaterThan(0);
  });

  it("should display edit type indicators", () => {
    const fileEdits = [
      createMockFileEdit({ path: "added.ts", editType: "added" }),
      createMockFileEdit({ path: "modified.ts", editType: "modified" }),
      createMockFileEdit({ path: "deleted.ts", editType: "deleted" }),
    ];

    const { container } = render(
      <TestWrapper>
        <EditViewer {...defaultProps} fileEdits={fileEdits} />
      </TestWrapper>
    );

    // Should have color indicators for different edit types
    expect(container.querySelector(".text-green-500")).toBeInTheDocument(); // added
    expect(container.querySelector(".text-yellow-500")).toBeInTheDocument(); // modified
    expect(container.querySelector(".text-red-500")).toBeInTheDocument(); // deleted
  });

  it("should have tree and log view mode toggles", () => {
    const fileEdits = [createMockFileEdit({ path: "src/app.ts" })];

    render(
      <TestWrapper>
        <EditViewer {...defaultProps} fileEdits={fileEdits} />
      </TestWrapper>
    );

    // Should have view mode toggle buttons with text
    expect(screen.getByText("Tree")).toBeInTheDocument();
    expect(screen.getByText("Log")).toBeInTheDocument();
  });

  it("should have split/unified view toggle for diffs", () => {
    const fileEdits = [createMockFileEdit({ path: "src/app.ts" })];
    const diffs = [createMockFileDiff()];

    render(
      <TestWrapper>
        <EditViewer
          {...defaultProps}
          fileEdits={fileEdits}
          selectedFile="src/app.ts"
          diffs={diffs}
        />
      </TestWrapper>
    );

    // Buttons have "Side-by-side view" and "Unified view" titles
    expect(screen.getByTitle("Side-by-side view")).toBeInTheDocument();
    expect(screen.getByTitle("Unified view")).toBeInTheDocument();
  });

  it("should show no file selected message", () => {
    const fileEdits = [createMockFileEdit({ path: "src/app.ts" })];

    render(
      <TestWrapper>
        <EditViewer
          {...defaultProps}
          fileEdits={fileEdits}
          selectedFile={null}
        />
      </TestWrapper>
    );

    expect(screen.getByText(/Select a file/)).toBeInTheDocument();
  });

  it("should display timestamp for file edits", () => {
    const fileEdits = [
      createMockFileEdit({
        path: "src/app.ts",
        lastEditedAt: "2025-01-15T14:30:00.000Z",
      }),
    ];

    render(
      <TestWrapper>
        <EditViewer {...defaultProps} fileEdits={fileEdits} />
      </TestWrapper>
    );

    // Should show formatted time
    expect(screen.getByText(/\d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
  });
});
