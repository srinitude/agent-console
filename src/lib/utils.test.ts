import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn (class name utility)", () => {
  it("should merge class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("should merge tailwind classes correctly", () => {
    // Later classes should override earlier ones
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("should handle arrays", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("should handle objects", () => {
    expect(cn({ foo: true, bar: false })).toBe("foo");
  });

  it("should handle empty inputs", () => {
    expect(cn()).toBe("");
    expect(cn("")).toBe("");
    expect(cn(null, undefined)).toBe("");
  });

  it("should handle mixed inputs", () => {
    expect(cn("foo", { bar: true, baz: false }, ["qux"])).toBe("foo bar qux");
  });

  it("should handle complex tailwind merging", () => {
    // Background colors
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");

    // Text colors
    expect(cn("text-sm", "text-lg")).toBe("text-lg");

    // Padding
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("should preserve non-conflicting classes", () => {
    expect(cn("flex items-center", "justify-between")).toBe(
      "flex items-center justify-between"
    );
  });
});
