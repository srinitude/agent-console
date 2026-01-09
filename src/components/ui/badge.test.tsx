import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge", () => {
  it("should render with default props", () => {
    render(<Badge>Default Badge</Badge>);

    const badge = screen.getByText("Default Badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("data-variant", "default");
    expect(badge).toHaveAttribute("data-slot", "badge");
  });

  it("should render children", () => {
    render(<Badge>Test Content</Badge>);
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  // Variant tests
  describe("variants", () => {
    it.each([
      ["default", "bg-primary"],
      ["secondary", "bg-secondary"],
      ["destructive", "bg-destructive/10"],
      ["outline", "border-border"],
      ["ghost", "hover:bg-muted"],
      ["link", "text-primary"],
    ])("should render %s variant with correct class", (variant, expectedClass) => {
      render(
        <Badge variant={variant as Parameters<typeof Badge>[0]["variant"]}>
          Badge
        </Badge>
      );

      const badge = screen.getByText("Badge");
      expect(badge).toHaveAttribute("data-variant", variant);
      expect(badge.className).toContain(expectedClass);
    });
  });

  // Custom className
  it("should merge custom className", () => {
    render(<Badge className="custom-class">Badge</Badge>);

    const badge = screen.getByText("Badge");
    expect(badge.className).toContain("custom-class");
    // Should still have default classes
    expect(badge.className).toContain("rounded-full");
  });

  // asChild prop
  it("should render as Slot when asChild is true", () => {
    render(
      <Badge asChild>
        <a href="/test">Link Badge</a>
      </Badge>
    );

    const link = screen.getByRole("link", { name: /link badge/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/test");
    expect(link).toHaveAttribute("data-variant", "default");
  });

  // Icon rendering
  it("should render with an icon", () => {
    render(
      <Badge>
        <svg data-testid="icon" />
        With Icon
      </Badge>
    );

    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByText("With Icon")).toBeInTheDocument();
  });

  // Styling
  it("should have badge-specific styling", () => {
    render(<Badge>Badge</Badge>);

    const badge = screen.getByText("Badge");
    expect(badge.className).toContain("h-5");
    expect(badge.className).toContain("rounded-full");
    expect(badge.className).toContain("px-2");
    expect(badge.className).toContain("font-medium");
  });

  // Span element by default
  it("should render as span by default", () => {
    const { container } = render(<Badge>Badge</Badge>);

    const span = container.querySelector("span");
    expect(span).toBeInTheDocument();
    expect(span).toHaveTextContent("Badge");
  });

  // Multiple badges
  it("should render multiple badges with different variants", () => {
    render(
      <div>
        <Badge variant="default">Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
      </div>
    );

    expect(screen.getByText("Default")).toHaveAttribute("data-variant", "default");
    expect(screen.getByText("Secondary")).toHaveAttribute("data-variant", "secondary");
    expect(screen.getByText("Destructive")).toHaveAttribute("data-variant", "destructive");
  });
});
