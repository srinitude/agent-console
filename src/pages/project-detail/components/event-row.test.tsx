import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventRowComponent } from "./event-row";
import { createMockSessionEvent } from "@/test/mocks/tauri";

describe("EventRowComponent", () => {
  const defaultProps = {
    index: 0,
    style: {},
    events: [createMockSessionEvent()],
    onSelectEvent: vi.fn(),
    onSelectSubagent: vi.fn(),
    summaryMap: new Map<string, string>(),
    selectedSubagentId: null,
    highlightedIndices: undefined,
    flashingByteOffsets: undefined,
    snippetMap: undefined,
    searchQuery: undefined,
  };

  it("should render a user event", () => {
    const event = createMockSessionEvent({
      eventType: "user",
      userType: "external",
      preview: "Hello world",
    });

    render(<EventRowComponent {...defaultProps} events={[event]} />);

    expect(screen.getByText("me")).toBeInTheDocument();
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("should render an assistant event", () => {
    const event = createMockSessionEvent({
      eventType: "assistant",
      preview: "I can help with that",
    });

    render(<EventRowComponent {...defaultProps} events={[event]} />);

    expect(screen.getByText("assistant")).toBeInTheDocument();
    expect(screen.getByText("I can help with that")).toBeInTheDocument();
  });

  it("should render a tool result event with tool name", () => {
    const event = createMockSessionEvent({
      eventType: "user",
      isToolResult: true,
      toolName: "Read",
      preview: "File content...",
    });

    render(<EventRowComponent {...defaultProps} events={[event]} />);

    expect(screen.getByText("context")).toBeInTheDocument();
    expect(screen.getByText("Read")).toBeInTheDocument();
  });

  it("should call onSelectEvent when clicked", async () => {
    const user = userEvent.setup();
    const onSelectEvent = vi.fn();
    const event = createMockSessionEvent({ preview: "Click me" });

    render(
      <EventRowComponent
        {...defaultProps}
        events={[event]}
        onSelectEvent={onSelectEvent}
      />
    );

    await user.click(screen.getByText("Click me"));

    expect(onSelectEvent).toHaveBeenCalledWith(event);
  });

  it("should render compaction event as separator", () => {
    const event = createMockSessionEvent({
      eventType: "system",
      subtype: "compact_boundary",
      compactMetadata: {
        trigger: "auto",
        preTokens: 50000,
      },
    });

    render(<EventRowComponent {...defaultProps} events={[event]} />);

    expect(screen.getByText("Compaction")).toBeInTheDocument();
    expect(screen.getByText(/auto/)).toBeInTheDocument();
    expect(screen.getByText(/50,000 tokens/)).toBeInTheDocument();
  });

  it("should render sub-agent launch event", () => {
    const event = createMockSessionEvent({
      eventType: "assistant",
      launchedAgentId: "agent-123",
      launchedAgentDescription: "Exploring codebase",
      launchedAgentIsAsync: true,
    });

    render(<EventRowComponent {...defaultProps} events={[event]} />);

    expect(screen.getByText("Sub-agent")).toBeInTheDocument();
    expect(screen.getByText("agent-123")).toBeInTheDocument();
    expect(screen.getByText("async")).toBeInTheDocument();
    expect(screen.getByText("Exploring codebase")).toBeInTheDocument();
  });

  it("should call onSelectSubagent when sub-agent event is clicked", async () => {
    const user = userEvent.setup();
    const onSelectSubagent = vi.fn();
    const event = createMockSessionEvent({
      eventType: "assistant",
      launchedAgentId: "agent-123",
    });

    render(
      <EventRowComponent
        {...defaultProps}
        events={[event]}
        onSelectSubagent={onSelectSubagent}
      />
    );

    await user.click(screen.getByText("agent-123"));

    expect(onSelectSubagent).toHaveBeenCalledWith("agent-123");
  });

  it("should highlight row when index is in highlightedIndices", () => {
    const event = createMockSessionEvent({ preview: "Highlighted" });
    const highlightedIndices = new Set([0]);

    const { container } = render(
      <EventRowComponent
        {...defaultProps}
        events={[event]}
        highlightedIndices={highlightedIndices}
      />
    );

    // Should have a highlight border
    expect(container.querySelector(".border-primary")).toBeInTheDocument();
  });

  it("should highlight search terms in snippet", () => {
    const event = createMockSessionEvent({
      sequence: 0,
      preview: "The quick brown fox",
    });
    const snippetMap = new Map([[0, "The quick brown fox"]]);

    render(
      <EventRowComponent
        {...defaultProps}
        events={[event]}
        snippetMap={snippetMap}
        searchQuery="quick fox"
      />
    );

    // Should have highlighted marks
    const marks = screen.getAllByText(/quick|fox/);
    expect(marks.length).toBeGreaterThan(0);
  });

  it("should show linked summary for compaction events", () => {
    const event = createMockSessionEvent({
      eventType: "system",
      subtype: "compact_boundary",
      logicalParentUuid: "parent-uuid",
      compactMetadata: {
        trigger: "auto",
        preTokens: 10000,
      },
    });
    const summaryMap = new Map([["parent-uuid", "User worked on authentication"]]);

    render(
      <EventRowComponent
        {...defaultProps}
        events={[event]}
        summaryMap={summaryMap}
      />
    );

    expect(screen.getByText(/"User worked on authentication"/)).toBeInTheDocument();
  });

  it("should display formatted timestamp", () => {
    const timestamp = "2025-01-15T14:30:45.123Z";
    const event = createMockSessionEvent({ timestamp });

    render(<EventRowComponent {...defaultProps} events={[event]} />);

    // Should contain some time format (the exact format depends on locale)
    const timeElement = screen.getByText(/\d{2}:\d{2}:\d{2}/);
    expect(timeElement).toBeInTheDocument();
  });

  it("should show selected state for sub-agent", () => {
    const event = createMockSessionEvent({
      eventType: "assistant",
      launchedAgentId: "agent-123",
    });

    const { container } = render(
      <EventRowComponent
        {...defaultProps}
        events={[event]}
        selectedSubagentId="agent-123"
      />
    );

    // Should have selected styling (purple background)
    expect(container.querySelector(".bg-purple-500\\/20")).toBeInTheDocument();
  });

  it("should render Task for sync sub-agent", () => {
    const event = createMockSessionEvent({
      eventType: "assistant",
      launchedAgentId: "task-456",
      launchedAgentIsAsync: false,
    });

    render(<EventRowComponent {...defaultProps} events={[event]} />);

    expect(screen.getByText("Task")).toBeInTheDocument();
  });
});
