import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useModalState } from "./useModalState";
import { MODAL_CLEANUP_DELAY } from "@/utils/assignment-helpers";

interface TestData {
  id: string;
  name: string;
}

const mockData: TestData = { id: "test-1", name: "Test Item" };
const mockData2: TestData = { id: "test-2", name: "Test Item 2" };

describe("useModalState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("should initialize with modal closed and no data", () => {
      const { result } = renderHook(() => useModalState<TestData>());

      expect(result.current.isOpen).toBe(false);
      expect(result.current.data).toBeNull();
    });

    it("should provide stable open and close functions", () => {
      const { result, rerender } = renderHook(() => useModalState<TestData>());

      const firstOpen = result.current.open;
      const firstClose = result.current.close;

      rerender();

      expect(result.current.open).toBe(firstOpen);
      expect(result.current.close).toBe(firstClose);
    });
  });

  describe("open", () => {
    it("should open modal and set data", () => {
      const { result } = renderHook(() => useModalState<TestData>());

      act(() => {
        result.current.open(mockData);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.data).toBe(mockData);
    });

    it("should replace data when opening with new data", () => {
      const { result } = renderHook(() => useModalState<TestData>());

      act(() => {
        result.current.open(mockData);
      });

      expect(result.current.data).toBe(mockData);

      act(() => {
        result.current.open(mockData2);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.data).toBe(mockData2);
    });

    it("should cancel pending cleanup when opening", () => {
      const { result } = renderHook(() => useModalState<TestData>());

      act(() => {
        result.current.open(mockData);
      });

      act(() => {
        result.current.close();
      });

      // Partially advance time (cleanup not yet triggered)
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Open again with new data before cleanup completes
      act(() => {
        result.current.open(mockData2);
      });

      // Advance past original cleanup time
      act(() => {
        vi.advanceTimersByTime(MODAL_CLEANUP_DELAY);
      });

      // Data should NOT be cleared because open cancelled the cleanup
      expect(result.current.isOpen).toBe(true);
      expect(result.current.data).toBe(mockData2);
    });
  });

  describe("close", () => {
    it("should close modal immediately", () => {
      const { result } = renderHook(() => useModalState<TestData>());

      act(() => {
        result.current.open(mockData);
      });

      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it("should keep data until cleanup delay passes", () => {
      const { result } = renderHook(() => useModalState<TestData>());

      act(() => {
        result.current.open(mockData);
      });

      act(() => {
        result.current.close();
      });

      // Data should still be present (for animation purposes)
      expect(result.current.data).toBe(mockData);

      // Advance just before cleanup
      act(() => {
        vi.advanceTimersByTime(MODAL_CLEANUP_DELAY - 1);
      });

      expect(result.current.data).toBe(mockData);

      // Advance past cleanup delay
      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(result.current.data).toBeNull();
    });

    it("should clear data after default cleanup delay (300ms)", () => {
      const { result } = renderHook(() => useModalState<TestData>());

      act(() => {
        result.current.open(mockData);
      });

      act(() => {
        result.current.close();
      });

      act(() => {
        vi.advanceTimersByTime(MODAL_CLEANUP_DELAY);
      });

      expect(result.current.data).toBeNull();
    });

    it("should clear previous timeout when closing multiple times", () => {
      const { result } = renderHook(() => useModalState<TestData>());

      act(() => {
        result.current.open(mockData);
      });

      act(() => {
        result.current.close();
      });

      // Partial advance
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Open and close again
      act(() => {
        result.current.open(mockData);
      });

      act(() => {
        result.current.close();
      });

      // Advance remaining time from first close (should not trigger cleanup)
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.data).toBe(mockData);

      // Advance rest of second cleanup delay
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe("custom cleanup delay", () => {
    it("should use custom cleanup delay when provided", () => {
      const customDelay = 500;
      const { result } = renderHook(() =>
        useModalState<TestData>({ cleanupDelay: customDelay }),
      );

      act(() => {
        result.current.open(mockData);
      });

      act(() => {
        result.current.close();
      });

      // Advance past default delay but before custom delay
      act(() => {
        vi.advanceTimersByTime(MODAL_CLEANUP_DELAY);
      });

      expect(result.current.data).toBe(mockData);

      // Advance to custom delay
      act(() => {
        vi.advanceTimersByTime(customDelay - MODAL_CLEANUP_DELAY);
      });

      expect(result.current.data).toBeNull();
    });

    it("should allow zero cleanup delay", () => {
      const { result } = renderHook(() =>
        useModalState<TestData>({ cleanupDelay: 0 }),
      );

      act(() => {
        result.current.open(mockData);
      });

      act(() => {
        result.current.close();
      });

      // Even with 0 delay, setTimeout is async
      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe("unmount cleanup", () => {
    it("should cleanup timeout on unmount", () => {
      const { result, unmount } = renderHook(() => useModalState<TestData>());

      act(() => {
        result.current.open(mockData);
      });

      act(() => {
        result.current.close();
      });

      // Unmount before cleanup timeout completes
      unmount();

      // Should not throw or cause memory leak
      expect(() => {
        act(() => {
          vi.advanceTimersByTime(MODAL_CLEANUP_DELAY);
        });
      }).not.toThrow();
    });

    it("should handle unmount when no timeout is pending", () => {
      const { unmount } = renderHook(() => useModalState<TestData>());

      // Unmount immediately without any open/close
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe("rapid open/close cycles", () => {
    it("should handle rapid open/close without issues", () => {
      const { result } = renderHook(() => useModalState<TestData>());

      // Rapid open/close cycle
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.open({ id: `test-${i}`, name: `Item ${i}` });
        });

        act(() => {
          result.current.close();
        });
      }

      // Final state should be closed
      expect(result.current.isOpen).toBe(false);

      // Advance time to clear all pending timeouts
      act(() => {
        vi.advanceTimersByTime(MODAL_CLEANUP_DELAY);
      });

      expect(result.current.data).toBeNull();
    });

    it("should only have one pending cleanup at a time", () => {
      const { result } = renderHook(() => useModalState<TestData>());

      // Track state changes through rapid cycles
      act(() => {
        result.current.open(mockData);
        result.current.close();
        vi.advanceTimersByTime(50);
        result.current.open(mockData2);
        result.current.close();
        vi.advanceTimersByTime(50);
      });

      // At this point only one cleanup should be pending (the most recent one)
      // The first cleanup was cancelled by the second open

      // Advance remaining cleanup time
      act(() => {
        vi.advanceTimersByTime(MODAL_CLEANUP_DELAY - 50);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe("type safety", () => {
    it("should work with different data types", () => {
      // String
      const { result: stringResult } = renderHook(() => useModalState<string>());
      act(() => {
        stringResult.current.open("test");
      });
      expect(stringResult.current.data).toBe("test");

      // Number
      const { result: numberResult } = renderHook(() => useModalState<number>());
      act(() => {
        numberResult.current.open(42);
      });
      expect(numberResult.current.data).toBe(42);

      // Complex object
      interface ComplexData {
        nested: { value: number };
        array: string[];
      }
      const complexData: ComplexData = { nested: { value: 1 }, array: ["a", "b"] };
      const { result: complexResult } = renderHook(() =>
        useModalState<ComplexData>(),
      );
      act(() => {
        complexResult.current.open(complexData);
      });
      expect(complexResult.current.data).toBe(complexData);
    });
  });

  describe("function stability", () => {
    it("should maintain stable open reference across re-renders", () => {
      const { result, rerender } = renderHook(() => useModalState<TestData>());

      const initialOpen = result.current.open;

      // Trigger re-render
      rerender();

      expect(result.current.open).toBe(initialOpen);
    });

    it("should maintain stable close reference when cleanupDelay is stable", () => {
      const { result, rerender } = renderHook(() =>
        useModalState<TestData>({ cleanupDelay: 300 }),
      );

      const initialClose = result.current.close;

      // Trigger re-render
      rerender();

      expect(result.current.close).toBe(initialClose);
    });

    it("should update close reference when cleanupDelay changes", () => {
      const { result, rerender } = renderHook(
        ({ delay }) => useModalState<TestData>({ cleanupDelay: delay }),
        { initialProps: { delay: 300 } },
      );

      const initialClose = result.current.close;

      // Change delay
      rerender({ delay: 500 });

      expect(result.current.close).not.toBe(initialClose);
    });
  });
});
