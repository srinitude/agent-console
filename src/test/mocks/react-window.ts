import { vi } from "vitest";
import React from "react";

interface ListProps {
  height: number;
  width: number;
  itemCount: number;
  itemSize: number | ((index: number) => number);
  children: React.ComponentType<{
    index: number;
    style: React.CSSProperties;
    data?: unknown;
  }>;
  itemData?: unknown;
  onItemsRendered?: (props: {
    visibleStartIndex: number;
    visibleStopIndex: number;
  }) => void;
}

// Mock List component that renders all items (up to a limit) for testing
export const MockList = vi.fn(
  ({
    itemCount,
    itemSize,
    children: RowComponent,
    itemData,
    onItemsRendered,
    height,
  }: ListProps) => {
    // Render up to 50 items for testing (prevents infinite renders)
    const maxItems = Math.min(itemCount, 50);
    const items = [];

    for (let i = 0; i < maxItems; i++) {
      const rowHeight = typeof itemSize === "function" ? itemSize(i) : itemSize;
      items.push(
        React.createElement(RowComponent, {
          key: i,
          index: i,
          style: {
            height: rowHeight,
            position: "absolute" as const,
            top: i * (typeof itemSize === "number" ? itemSize : 32),
            left: 0,
            width: "100%",
          },
          data: itemData,
        })
      );
    }

    // Call onItemsRendered if provided
    React.useEffect(() => {
      if (onItemsRendered && maxItems > 0) {
        onItemsRendered({
          visibleStartIndex: 0,
          visibleStopIndex: maxItems - 1,
        });
      }
    }, [onItemsRendered, maxItems]);

    return React.createElement(
      "div",
      {
        "data-testid": "virtual-list",
        style: { height, position: "relative", overflow: "auto" },
      },
      items
    );
  }
);

// Mock VariableSizeList with same implementation
export const MockVariableSizeList = MockList;

// Setup function to mock react-window
export function setupReactWindowMock() {
  vi.mock("react-window", () => ({
    List: MockList,
    VariableSizeList: MockVariableSizeList,
    FixedSizeList: MockList,
  }));
}

// Helper to get rendered items from mock
export function getRenderedItems(container: HTMLElement) {
  const list = container.querySelector('[data-testid="virtual-list"]');
  return list ? Array.from(list.children) : [];
}
