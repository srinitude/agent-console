import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventLogViewer } from "./event-log-viewer";
import { ThemeProvider } from "@/components/theme-provider";
import { createMockSessionEvent } from "@/test/mocks/tauri";

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));

// Mock react-window
vi.mock("react-window", () => ({
  List: ({ rowCount, rowComponent: RowComponent, rowProps }: {
    rowCount: number;
    rowComponent: React.ComponentType<{ index: number; style: object }>;
    rowProps: Record<string, unknown>;
  }) => (
    <div data-testid="virtual-list" data-row-count={rowCount}>
      {Array.from({ length: Math.min(rowCount, 10) }, (_, i) => (
        <RowComponent key={i} index={i} style={{}} {...rowProps} />
      ))}
    </div>
  ),
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

describe("EventLogViewer", () => {
  const defaultProps = {
    events: [],
    loading: false,
    loadingMore: false,
    filter: "all",
    onFilterChange: vi.fn(),
    filterMode: "filter" as const,
    onFilterModeChange: vi.fn(),
    highlightedIndices: undefined,
    summaryMap: new Map<string, string>(),
    onLoadMore: vi.fn(),
    totalCount: 0,
    hasMore: false,
    projectPath: "/path/to/project",
    sessionId: "session-123",
    selectedSubagentId: null,
    onSelectSubagent: vi.fn(),
    searchQuery: "",
    onSearchChange: vi.fn(),
    searchLoading: false,
    searchResults: null,
    snippetMap: undefined,
    isSearchMode: false,
    searchEventsLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invoke).mockResolvedValue(null);
  });

  it("should show loading state", () => {
    render(
      <TestWrapper>
        <EventLogViewer {...defaultProps} loading={true} />
      </TestWrapper>
    );

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("should show empty state when no events", () => {
    render(
      <TestWrapper>
        <EventLogViewer {...defaultProps} events={[]} />
      </TestWrapper>
    );

    // Multiple "No events found" messages may appear (main panel and sub-agent panel)
    const noEventsMessages = screen.getAllByText("No events found");
    expect(noEventsMessages.length).toBeGreaterThan(0);
  });

  it("should display filter buttons", () => {
    render(
      <TestWrapper>
        <EventLogViewer {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Me")).toBeInTheDocument();
    expect(screen.getByText("Context")).toBeInTheDocument();
    expect(screen.getByText("Assistant")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
    expect(screen.getByText("Compaction")).toBeInTheDocument();
    // "Sub-agent" appears multiple times (filter button and panel header), so use getAllByText
    const subagentTexts = screen.getAllByText("Sub-agent");
    expect(subagentTexts.length).toBeGreaterThan(0);
  });

  it("should call onFilterChange when filter button is clicked", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(
      <TestWrapper>
        <EventLogViewer {...defaultProps} onFilterChange={onFilterChange} />
      </TestWrapper>
    );

    await user.click(screen.getByText("Me"));

    expect(onFilterChange).toHaveBeenCalledWith("me");
  });

  it("should highlight active filter", () => {
    render(
      <TestWrapper>
        <EventLogViewer {...defaultProps} filter="assistant" />
      </TestWrapper>
    );

    const assistantButton = screen.getByText("Assistant");
    expect(assistantButton.className).toContain("bg-primary");
  });

  it("should display event count", () => {
    const events = [
      createMockSessionEvent({ sequence: 0 }),
      createMockSessionEvent({ sequence: 1 }),
      createMockSessionEvent({ sequence: 2 }),
    ];

    render(
      <TestWrapper>
        <EventLogViewer {...defaultProps} events={events} totalCount={100} />
      </TestWrapper>
    );

    expect(screen.getByText(/3.*\/.*100 events/)).toBeInTheDocument();
  });

  it("should have search input", () => {
    render(
      <TestWrapper>
        <EventLogViewer {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByPlaceholderText("Search (AND, OR)")).toBeInTheDocument();
  });

  it("should call onSearchChange when typing in search", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();

    render(
      <TestWrapper>
        <EventLogViewer {...defaultProps} onSearchChange={onSearchChange} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText("Search (AND, OR)");
    await user.type(searchInput, "test query");

    expect(onSearchChange).toHaveBeenCalled();
  });

  it("should show search loading indicator", () => {
    render(
      <TestWrapper>
        <EventLogViewer {...defaultProps} searchLoading={true} />
      </TestWrapper>
    );

    // Should have a spinner in the search area
    const spinners = document.querySelectorAll(".animate-spin");
    expect(spinners.length).toBeGreaterThan(0);
  });

  it("should display search result count", () => {
    render(
      <TestWrapper>
        <EventLogViewer
          {...defaultProps}
          searchResults={{
            matches: [
              { sequence: 0, byteOffset: 0, snippet: "match 1" },
              { sequence: 1, byteOffset: 100, snippet: "match 2" },
            ],
            truncated: false,
          }}
        />
      </TestWrapper>
    );

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("should show truncated indicator for search results", () => {
    render(
      <TestWrapper>
        <EventLogViewer
          {...defaultProps}
          searchResults={{
            matches: Array(100).fill({ sequence: 0, byteOffset: 0, snippet: "match" }),
            truncated: true,
          }}
        />
      </TestWrapper>
    );

    expect(screen.getByText(/100\+/)).toBeInTheDocument();
  });

  it("should have filter/highlight mode dropdown", () => {
    render(
      <TestWrapper>
        <EventLogViewer {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("Filter")).toBeInTheDocument();
  });

  it("should render events through virtual list", () => {
    const events = [
      createMockSessionEvent({ sequence: 0, preview: "Event 1" }),
      createMockSessionEvent({ sequence: 1, preview: "Event 2" }),
    ];

    render(
      <TestWrapper>
        <EventLogViewer {...defaultProps} events={events} />
      </TestWrapper>
    );

    expect(screen.getByTestId("virtual-list")).toHaveAttribute(
      "data-row-count",
      "2"
    );
  });

  it("should show loading more indicator", () => {
    const events = [createMockSessionEvent()];

    render(
      <TestWrapper>
        <EventLogViewer {...defaultProps} events={events} loadingMore={true} />
      </TestWrapper>
    );

    const spinners = document.querySelectorAll(".animate-spin");
    expect(spinners.length).toBeGreaterThan(0);
  });

  it("should display search mode event count", () => {
    const events = [
      createMockSessionEvent({ sequence: 0 }),
      createMockSessionEvent({ sequence: 1 }),
    ];

    render(
      <TestWrapper>
        <EventLogViewer
          {...defaultProps}
          events={events}
          isSearchMode={true}
        />
      </TestWrapper>
    );

    expect(screen.getByText("2 search results")).toBeInTheDocument();
  });
});
