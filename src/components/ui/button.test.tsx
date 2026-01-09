import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("should render with default props", () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("data-variant", "default");
    expect(button).toHaveAttribute("data-size", "default");
  });

  it("should render with children", () => {
    render(<Button>Test Content</Button>);
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  // Variant tests
  describe("variants", () => {
    it.each([
      ["default", "bg-primary"],
      ["outline", "border-border"],
      ["secondary", "bg-secondary"],
      ["ghost", "hover:bg-muted"],
      ["destructive", "bg-destructive/10"],
      ["link", "text-primary"],
    ])("should render %s variant with correct class", (variant, expectedClass) => {
      render(
        <Button variant={variant as Parameters<typeof Button>[0]["variant"]}>
          Button
        </Button>
      );

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("data-variant", variant);
      expect(button.className).toContain(expectedClass);
    });
  });

  // Size tests
  describe("sizes", () => {
    it.each([
      ["default", "h-7"],
      ["xs", "h-5"],
      ["sm", "h-6"],
      ["lg", "h-8"],
      ["icon", "size-7"],
      ["icon-xs", "size-5"],
      ["icon-sm", "size-6"],
      ["icon-lg", "size-8"],
    ])("should render %s size with correct class", (size, expectedClass) => {
      render(
        <Button size={size as Parameters<typeof Button>[0]["size"]}>
          Button
        </Button>
      );

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("data-size", size);
      expect(button.className).toContain(expectedClass);
    });
  });

  // Disabled state
  it("should be disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button.className).toContain("disabled:pointer-events-none");
    expect(button.className).toContain("disabled:opacity-50");
  });

  // Click handler
  it("should call onClick when clicked", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should not call onClick when disabled", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <Button disabled onClick={handleClick}>
        Click me
      </Button>
    );

    await user.click(screen.getByRole("button"));
    expect(handleClick).not.toHaveBeenCalled();
  });

  // asChild prop
  it("should render as Slot when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );

    const link = screen.getByRole("link", { name: /link button/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/test");
    expect(link).toHaveAttribute("data-variant", "default");
  });

  // Custom className
  it("should merge custom className", () => {
    render(<Button className="custom-class">Button</Button>);

    const button = screen.getByRole("button");
    expect(button.className).toContain("custom-class");
    // Should still have default classes
    expect(button.className).toContain("bg-primary");
  });

  // data-slot attribute
  it("should have data-slot attribute", () => {
    render(<Button>Button</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-slot", "button");
  });

  // Combining variant and size
  it("should combine variant and size correctly", () => {
    render(
      <Button variant="ghost" size="lg">
        Button
      </Button>
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-variant", "ghost");
    expect(button).toHaveAttribute("data-size", "lg");
    expect(button.className).toContain("hover:bg-muted");
    expect(button.className).toContain("h-8");
  });

  // Type attribute
  it("should accept type attribute", () => {
    render(<Button type="submit">Submit</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("type", "submit");
  });

  // Icon rendering
  it("should render with an icon", () => {
    render(
      <Button>
        <svg data-testid="icon" />
        With Icon
      </Button>
    );

    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByText("With Icon")).toBeInTheDocument();
  });
});
