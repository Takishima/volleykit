import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { canElementScroll } from "./useVerticalSwipeDismiss";

/**
 * Helper to create a mock scrollable element with specified scroll properties.
 * JSDOM doesn't calculate scroll dimensions, so we mock them directly.
 */
function createMockScrollableElement(
  parent: HTMLElement,
  options: {
    overflowY?: string;
    scrollTop?: number;
    scrollHeight?: number;
    clientHeight?: number;
  },
): HTMLDivElement {
  const element = document.createElement("div");
  parent.appendChild(element);

  // Mock getComputedStyle to return the overflow value
  const originalGetComputedStyle = window.getComputedStyle;
  vi.spyOn(window, "getComputedStyle").mockImplementation((el) => {
    if (el === element) {
      return {
        ...originalGetComputedStyle(el),
        overflowY: options.overflowY ?? "visible",
      } as CSSStyleDeclaration;
    }
    return originalGetComputedStyle(el);
  });

  // Mock scroll properties
  Object.defineProperty(element, "scrollTop", {
    value: options.scrollTop ?? 0,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(element, "scrollHeight", {
    value: options.scrollHeight ?? 100,
    configurable: true,
  });
  Object.defineProperty(element, "clientHeight", {
    value: options.clientHeight ?? 100,
    configurable: true,
  });

  return element;
}

describe("canElementScroll", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  describe("null and invalid inputs", () => {
    it("returns false when element is null", () => {
      expect(canElementScroll(null, container, "down")).toBe(false);
    });

    it("returns false when container is null", () => {
      const element = document.createElement("div");
      container.appendChild(element);
      expect(canElementScroll(element, null, "down")).toBe(false);
    });

    it("returns false when element is not an HTMLElement", () => {
      const textNode = document.createTextNode("text");
      expect(canElementScroll(textNode, container, "down")).toBe(false);
    });

    it("returns false when both element and container are null", () => {
      expect(canElementScroll(null, null, "down")).toBe(false);
    });
  });

  describe("scrollable element detection - can scroll down", () => {
    it("returns true when element can scroll down (scrollTop at 0, content overflows)", () => {
      const element = createMockScrollableElement(container, {
        overflowY: "auto",
        scrollTop: 0,
        scrollHeight: 300,
        clientHeight: 100,
      });

      expect(canElementScroll(element, container, "down")).toBe(true);
    });

    it("returns false when element cannot scroll down (already at bottom)", () => {
      const element = createMockScrollableElement(container, {
        overflowY: "auto",
        scrollTop: 200, // scrollHeight - clientHeight
        scrollHeight: 300,
        clientHeight: 100,
      });

      expect(canElementScroll(element, container, "down")).toBe(false);
    });

    it("returns false when content does not overflow (scrollHeight equals clientHeight)", () => {
      const element = createMockScrollableElement(container, {
        overflowY: "auto",
        scrollTop: 0,
        scrollHeight: 100,
        clientHeight: 100,
      });

      expect(canElementScroll(element, container, "down")).toBe(false);
    });
  });

  describe("scrollable element detection - can scroll up", () => {
    it("returns true when element can scroll up (scrollTop > 1)", () => {
      const element = createMockScrollableElement(container, {
        overflowY: "auto",
        scrollTop: 50,
        scrollHeight: 300,
        clientHeight: 100,
      });

      expect(canElementScroll(element, container, "up")).toBe(true);
    });

    it("returns false when element cannot scroll up (at top)", () => {
      const element = createMockScrollableElement(container, {
        overflowY: "auto",
        scrollTop: 0,
        scrollHeight: 300,
        clientHeight: 100,
      });

      expect(canElementScroll(element, container, "up")).toBe(false);
    });
  });

  describe("non-scrollable elements", () => {
    it("returns false for element with overflow: visible", () => {
      const element = createMockScrollableElement(container, {
        overflowY: "visible",
        scrollTop: 0,
        scrollHeight: 300,
        clientHeight: 100,
      });

      expect(canElementScroll(element, container, "down")).toBe(false);
    });

    it("returns false for element with overflow: hidden", () => {
      const element = createMockScrollableElement(container, {
        overflowY: "hidden",
        scrollTop: 0,
        scrollHeight: 300,
        clientHeight: 100,
      });

      expect(canElementScroll(element, container, "down")).toBe(false);
    });
  });

  describe("overflow styles", () => {
    it("detects overflow: scroll", () => {
      const element = createMockScrollableElement(container, {
        overflowY: "scroll",
        scrollTop: 0,
        scrollHeight: 300,
        clientHeight: 100,
      });

      expect(canElementScroll(element, container, "down")).toBe(true);
    });

    it("detects overflow: auto", () => {
      const element = createMockScrollableElement(container, {
        overflowY: "auto",
        scrollTop: 0,
        scrollHeight: 300,
        clientHeight: 100,
      });

      expect(canElementScroll(element, container, "down")).toBe(true);
    });
  });

  describe("nested scrollable containers", () => {
    it("finds scrollable ancestor of deep child", () => {
      // Create a scrollable parent
      const scrollableParent = createMockScrollableElement(container, {
        overflowY: "auto",
        scrollTop: 0,
        scrollHeight: 300,
        clientHeight: 100,
      });

      // Create a non-scrollable child inside the scrollable parent
      const deepChild = document.createElement("div");
      scrollableParent.appendChild(deepChild);

      expect(canElementScroll(deepChild, container, "down")).toBe(true);
    });

    it("stops at container boundary and returns false if no scrollable found", () => {
      const nonScrollableChild = document.createElement("div");
      container.appendChild(nonScrollableChild);

      // Mock getComputedStyle for the non-scrollable child
      vi.spyOn(window, "getComputedStyle").mockImplementation(() => {
        return { overflowY: "visible" } as CSSStyleDeclaration;
      });

      expect(canElementScroll(nonScrollableChild, container, "down")).toBe(
        false,
      );
    });
  });

  describe("scroll boundary conditions with 1px tolerance", () => {
    it("returns true when more than 1px from bottom", () => {
      const element = createMockScrollableElement(container, {
        overflowY: "auto",
        scrollTop: 197, // 3px from max (300 - 100 = 200)
        scrollHeight: 300,
        clientHeight: 100,
      });

      expect(canElementScroll(element, container, "down")).toBe(true);
    });

    it("returns false when within 1px of bottom", () => {
      const element = createMockScrollableElement(container, {
        overflowY: "auto",
        scrollTop: 199.5, // 0.5px from max
        scrollHeight: 300,
        clientHeight: 100,
      });

      expect(canElementScroll(element, container, "down")).toBe(false);
    });

    it("returns true when more than 1px from top", () => {
      const element = createMockScrollableElement(container, {
        overflowY: "auto",
        scrollTop: 2,
        scrollHeight: 300,
        clientHeight: 100,
      });

      expect(canElementScroll(element, container, "up")).toBe(true);
    });

    it("returns false when within 1px of top", () => {
      const element = createMockScrollableElement(container, {
        overflowY: "auto",
        scrollTop: 0.5,
        scrollHeight: 300,
        clientHeight: 100,
      });

      expect(canElementScroll(element, container, "up")).toBe(false);
    });
  });

  describe("element is same as container", () => {
    it("returns false when element equals container (loop does not execute)", () => {
      expect(canElementScroll(container, container, "down")).toBe(false);
    });
  });
});
