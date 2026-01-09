import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "./card";

describe("Card", () => {
  it("should render with default props", () => {
    render(<Card>Card Content</Card>);

    const card = screen.getByText("Card Content");
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute("data-slot", "card");
    expect(card).toHaveAttribute("data-size", "default");
  });

  it("should render children", () => {
    render(
      <Card>
        <div data-testid="child">Child content</div>
      </Card>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  describe("sizes", () => {
    it("should render with default size", () => {
      render(<Card>Card</Card>);

      const card = screen.getByText("Card");
      expect(card).toHaveAttribute("data-size", "default");
    });

    it("should render with sm size", () => {
      render(<Card size="sm">Card</Card>);

      const card = screen.getByText("Card");
      expect(card).toHaveAttribute("data-size", "sm");
    });
  });

  it("should merge custom className", () => {
    render(<Card className="custom-class">Card</Card>);

    const card = screen.getByText("Card");
    expect(card.className).toContain("custom-class");
    expect(card.className).toContain("rounded-lg");
  });
});

describe("CardHeader", () => {
  it("should render with data-slot attribute", () => {
    render(<CardHeader>Header</CardHeader>);

    const header = screen.getByText("Header");
    expect(header).toHaveAttribute("data-slot", "card-header");
  });

  it("should merge custom className", () => {
    render(<CardHeader className="custom-class">Header</CardHeader>);

    const header = screen.getByText("Header");
    expect(header.className).toContain("custom-class");
    expect(header.className).toContain("px-4");
  });
});

describe("CardTitle", () => {
  it("should render with data-slot attribute", () => {
    render(<CardTitle>Title</CardTitle>);

    const title = screen.getByText("Title");
    expect(title).toHaveAttribute("data-slot", "card-title");
  });

  it("should have correct styling", () => {
    render(<CardTitle>Title</CardTitle>);

    const title = screen.getByText("Title");
    expect(title.className).toContain("text-sm");
    expect(title.className).toContain("font-medium");
  });

  it("should merge custom className", () => {
    render(<CardTitle className="custom-class">Title</CardTitle>);

    const title = screen.getByText("Title");
    expect(title.className).toContain("custom-class");
  });
});

describe("CardDescription", () => {
  it("should render with data-slot attribute", () => {
    render(<CardDescription>Description</CardDescription>);

    const description = screen.getByText("Description");
    expect(description).toHaveAttribute("data-slot", "card-description");
  });

  it("should have muted text styling", () => {
    render(<CardDescription>Description</CardDescription>);

    const description = screen.getByText("Description");
    expect(description.className).toContain("text-muted-foreground");
  });
});

describe("CardContent", () => {
  it("should render with data-slot attribute", () => {
    render(<CardContent>Content</CardContent>);

    const content = screen.getByText("Content");
    expect(content).toHaveAttribute("data-slot", "card-content");
  });

  it("should have correct padding", () => {
    render(<CardContent>Content</CardContent>);

    const content = screen.getByText("Content");
    expect(content.className).toContain("px-4");
  });
});

describe("CardFooter", () => {
  it("should render with data-slot attribute", () => {
    render(<CardFooter>Footer</CardFooter>);

    const footer = screen.getByText("Footer");
    expect(footer).toHaveAttribute("data-slot", "card-footer");
  });

  it("should have flex styling for buttons", () => {
    render(<CardFooter>Footer</CardFooter>);

    const footer = screen.getByText("Footer");
    expect(footer.className).toContain("flex");
    expect(footer.className).toContain("items-center");
  });
});

describe("CardAction", () => {
  it("should render with data-slot attribute", () => {
    render(<CardAction>Action</CardAction>);

    const action = screen.getByText("Action");
    expect(action).toHaveAttribute("data-slot", "card-action");
  });

  it("should have grid positioning", () => {
    render(<CardAction>Action</CardAction>);

    const action = screen.getByText("Action");
    expect(action.className).toContain("col-start-2");
    expect(action.className).toContain("row-span-2");
  });
});

describe("Card composition", () => {
  it("should render a complete card with all parts", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description goes here</CardDescription>
          <CardAction>
            <button>Action</button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p>Main content of the card</p>
        </CardContent>
        <CardFooter>
          <button>Cancel</button>
          <button>Submit</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByText("Card Title")).toBeInTheDocument();
    expect(screen.getByText("Card description goes here")).toBeInTheDocument();
    expect(screen.getByText("Main content of the card")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Submit")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();
  });

  it("should work with minimal composition", () => {
    render(
      <Card>
        <CardContent>Simple card content</CardContent>
      </Card>
    );

    expect(screen.getByText("Simple card content")).toBeInTheDocument();
  });
});
