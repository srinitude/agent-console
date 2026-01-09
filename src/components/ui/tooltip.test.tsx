import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./tooltip";

describe("Tooltip Components", () => {
  it("should render trigger element", () => {
    render(
      <Tooltip>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>Tooltip content</TooltipContent>
      </Tooltip>
    );

    expect(screen.getByText("Hover me")).toBeInTheDocument();
  });

  it("should have data-slot attribute on trigger", () => {
    render(
      <Tooltip>
        <TooltipTrigger>Trigger</TooltipTrigger>
        <TooltipContent>Content</TooltipContent>
      </Tooltip>
    );

    expect(screen.getByText("Trigger")).toHaveAttribute(
      "data-slot",
      "tooltip-trigger"
    );
  });

  it("should render with asChild trigger", () => {
    render(
      <Tooltip>
        <TooltipTrigger asChild>
          <button>Custom Button</button>
        </TooltipTrigger>
        <TooltipContent>Tooltip for button</TooltipContent>
      </Tooltip>
    );

    expect(screen.getByRole("button", { name: /custom button/i })).toBeInTheDocument();
  });

  it("should accept custom delayDuration", () => {
    // Just verify it doesn't throw with custom delay
    expect(() => {
      render(
        <TooltipProvider delayDuration={500}>
          <div>Child</div>
        </TooltipProvider>
      );
    }).not.toThrow();
  });
});
