import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JsonViewer, JsonViewerRoot } from "./json-viewer";

describe("JsonViewer", () => {
  it("should render null value", () => {
    render(<JsonViewer data={null} />);
    expect(screen.getByText("null")).toBeInTheDocument();
  });

  it("should render undefined as italic text", () => {
    render(<JsonViewer data={undefined} />);
    expect(screen.getByText("undefined")).toBeInTheDocument();
  });

  it("should render string value with quotes", () => {
    render(<JsonViewer data="hello world" />);
    expect(screen.getByText('"hello world"')).toBeInTheDocument();
  });

  it("should render number value", () => {
    render(<JsonViewer data={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("should render boolean true", () => {
    render(<JsonViewer data={true} />);
    expect(screen.getByText("true")).toBeInTheDocument();
  });

  it("should render boolean false", () => {
    render(<JsonViewer data={false} />);
    expect(screen.getByText("false")).toBeInTheDocument();
  });

  it("should render empty object", () => {
    render(<JsonViewer data={{}} />);
    expect(screen.getByText("{}")).toBeInTheDocument();
  });

  it("should render empty array", () => {
    render(<JsonViewer data={[]} />);
    expect(screen.getByText("[]")).toBeInTheDocument();
  });

  it("should render object with label", () => {
    render(<JsonViewer data="value" label="key" />);
    expect(screen.getByText('"key":')).toBeInTheDocument();
    expect(screen.getByText('"value"')).toBeInTheDocument();
  });

  it("should show item count for collapsed object", () => {
    render(<JsonViewer data={{ a: 1, b: 2, c: 3 }} />);
    expect(screen.getByText("3 keys")).toBeInTheDocument();
  });

  it("should show item count for collapsed array", () => {
    render(<JsonViewer data={[1, 2, 3, 4, 5]} />);
    expect(screen.getByText("5 items")).toBeInTheDocument();
  });

  it("should expand object when clicked", async () => {
    const user = userEvent.setup();

    render(<JsonViewer data={{ name: "test" }} />);

    // Initially collapsed, should show "1 keys"
    expect(screen.getByText("1 keys")).toBeInTheDocument();

    // Click to expand
    await user.click(screen.getByText("1 keys"));

    // Should now show the key
    expect(screen.getByText('"name":')).toBeInTheDocument();
    expect(screen.getByText('"test"')).toBeInTheDocument();
  });

  it("should render when defaultExpanded is true", () => {
    render(<JsonViewer data={{ name: "expanded" }} defaultExpanded={true} />);

    // Should immediately show the content
    expect(screen.getByText('"name":')).toBeInTheDocument();
    expect(screen.getByText('"expanded"')).toBeInTheDocument();
  });

  it("should handle nested objects", async () => {
    const user = userEvent.setup();

    render(
      <JsonViewer
        data={{
          outer: {
            inner: "value",
          },
        }}
      />
    );

    // Initially collapsed - outer shows "1 keys"
    expect(screen.getByText("1 keys")).toBeInTheDocument();

    // Click to expand outer
    await user.click(screen.getByText("1 keys"));

    // Outer key should now be visible
    expect(screen.getByText('"outer":')).toBeInTheDocument();

    // Inner object is still collapsed, showing "1 keys"
    const innerKeysText = screen.getAllByText("1 keys");
    expect(innerKeysText.length).toBeGreaterThan(0);

    // Click to expand inner
    await user.click(innerKeysText[0]);

    // Inner should now be visible
    expect(screen.getByText('"inner":')).toBeInTheDocument();
    expect(screen.getByText('"value"')).toBeInTheDocument();
  });

  it("should handle arrays with mixed types", () => {
    render(<JsonViewer data={["string", 42, true, null]} defaultExpanded={true} />);

    expect(screen.getByText('"string"')).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("true")).toBeInTheDocument();
    expect(screen.getByText("null")).toBeInTheDocument();
  });

  it("should show copy button on hover for values", async () => {
    const user = userEvent.setup();

    render(<JsonViewer data="copyable" />);

    const value = screen.getByText('"copyable"');
    await user.hover(value);

    // Copy button should appear
    expect(screen.getByTitle(/Copy/)).toBeInTheDocument();
  });
});

describe("JsonViewerRoot", () => {
  it("should parse and render valid JSON", () => {
    render(<JsonViewerRoot json='{"key": "value"}' />);

    expect(screen.getByText('"key":')).toBeInTheDocument();
    expect(screen.getByText('"value"')).toBeInTheDocument();
  });

  it("should handle invalid JSON gracefully", () => {
    render(<JsonViewerRoot json="not valid json {" />);

    // Should display the raw text
    expect(screen.getByText("not valid json {")).toBeInTheDocument();
  });

  it("should handle complex nested JSON", () => {
    const json = JSON.stringify({
      user: {
        name: "John",
        age: 30,
        active: true,
        tags: ["admin", "user"],
      },
    });

    render(<JsonViewerRoot json={json} />);

    // Should show expanded by default
    expect(screen.getByText('"user":')).toBeInTheDocument();
    expect(screen.getByText('"name":')).toBeInTheDocument();
  });

  it("should have monospace font", () => {
    const { container } = render(<JsonViewerRoot json='{"test": 1}' />);

    expect(container.querySelector(".font-mono")).toBeInTheDocument();
  });

  it("should handle arrays at root level", () => {
    render(<JsonViewerRoot json='[1, 2, 3]' />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("should handle primitives at root level", () => {
    render(<JsonViewerRoot json='"just a string"' />);
    expect(screen.getByText('"just a string"')).toBeInTheDocument();
  });

  it("should handle null at root level", () => {
    render(<JsonViewerRoot json="null" />);
    expect(screen.getByText("null")).toBeInTheDocument();
  });

  it("should handle empty object", () => {
    render(<JsonViewerRoot json="{}" />);
    expect(screen.getByText("{}")).toBeInTheDocument();
  });
});
