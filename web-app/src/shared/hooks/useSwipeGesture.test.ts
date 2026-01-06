import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSwipeGesture } from "./useSwipeGesture";

// Mock ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback;
  static instances: MockResizeObserver[] = [];

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  observe() {}
  unobserve() {}
  disconnect() {}

  // Helper to simulate resize
  static triggerResize(entry: Partial<ResizeObserverEntry>) {
    MockResizeObserver.instances.forEach((instance) => {
      instance.callback([entry as ResizeObserverEntry], instance as unknown as ResizeObserver);
    });
  }
}

describe("useSwipeGesture", () => {
  beforeEach(() => {
    MockResizeObserver.instances = [];
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe("initial state", () => {
    it("should return initial state with zero translateX", () => {
      const { result } = renderHook(() => useSwipeGesture());

      expect(result.current.translateX).toBe(0);
      expect(result.current.isDragging).toBe(false);
      expect(result.current.containerWidth).toBe(null);
    });

    it("should provide containerRef", () => {
      const { result } = renderHook(() => useSwipeGesture());

      expect(result.current.containerRef).toBeDefined();
      expect(result.current.containerRef.current).toBe(null);
    });

    it("should provide event handlers", () => {
      const { result } = renderHook(() => useSwipeGesture());

      expect(result.current.handlers.onTouchStart).toBeInstanceOf(Function);
      expect(result.current.handlers.onTouchMove).toBeInstanceOf(Function);
      expect(result.current.handlers.onTouchEnd).toBeInstanceOf(Function);
      expect(result.current.handlers.onMouseDown).toBeInstanceOf(Function);
      expect(result.current.handlers.onMouseMove).toBeInstanceOf(Function);
      expect(result.current.handlers.onMouseUp).toBeInstanceOf(Function);
      expect(result.current.handlers.onMouseLeave).toBeInstanceOf(Function);
    });
  });

  describe("enabled option", () => {
    it("should not start drag when disabled", () => {
      const onDragStart = vi.fn();
      const { result } = renderHook(() =>
        useSwipeGesture({ enabled: false, onDragStart }),
      );

      act(() => {
        result.current.handlers.onMouseDown({
          clientX: 100,
          clientY: 100,
        } as React.MouseEvent);
      });

      expect(result.current.isDragging).toBe(false);
      expect(onDragStart).not.toHaveBeenCalled();
    });

    it("should start drag when enabled", () => {
      const onDragStart = vi.fn();
      const { result } = renderHook(() =>
        useSwipeGesture({ enabled: true, onDragStart }),
      );

      act(() => {
        result.current.handlers.onMouseDown({
          clientX: 100,
          clientY: 100,
        } as React.MouseEvent);
      });

      expect(result.current.isDragging).toBe(true);
      expect(onDragStart).toHaveBeenCalledTimes(1);
    });
  });

  describe("mouse event handling", () => {
    it("should track horizontal drag movement", () => {
      const { result } = renderHook(() => useSwipeGesture());

      // Start drag
      act(() => {
        result.current.handlers.onMouseDown({
          clientX: 100,
          clientY: 100,
        } as React.MouseEvent);
      });

      expect(result.current.isDragging).toBe(true);

      // Move horizontally past direction threshold (10px)
      act(() => {
        result.current.handlers.onMouseMove({
          clientX: 80, // -20px (past threshold)
          clientY: 100,
          preventDefault: vi.fn(),
        } as unknown as React.MouseEvent);
      });

      expect(result.current.translateX).toBe(-20);

      // End drag
      act(() => {
        result.current.handlers.onMouseUp();
      });

      expect(result.current.isDragging).toBe(false);
    });

    it("should ignore vertical movement", () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => {
        result.current.handlers.onMouseDown({
          clientX: 100,
          clientY: 100,
        } as React.MouseEvent);
      });

      // Move vertically past direction threshold
      act(() => {
        result.current.handlers.onMouseMove({
          clientX: 100,
          clientY: 80, // -20px vertical
          preventDefault: vi.fn(),
        } as unknown as React.MouseEvent);
      });

      // Should not translate
      expect(result.current.translateX).toBe(0);
    });

    it("should handle mouse leave as mouse up", () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => {
        result.current.handlers.onMouseDown({
          clientX: 100,
          clientY: 100,
        } as React.MouseEvent);
      });

      expect(result.current.isDragging).toBe(true);

      act(() => {
        result.current.handlers.onMouseLeave();
      });

      expect(result.current.isDragging).toBe(false);
    });
  });

  describe("touch event handling", () => {
    function createTouchEvent(
      clientX: number,
      clientY: number,
      preventDefault = vi.fn(),
    ): React.TouchEvent {
      return {
        touches: [{ clientX, clientY }],
        preventDefault,
      } as unknown as React.TouchEvent;
    }

    it("should track horizontal touch movement", () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => {
        result.current.handlers.onTouchStart(createTouchEvent(100, 100));
      });

      expect(result.current.isDragging).toBe(true);

      act(() => {
        result.current.handlers.onTouchMove(createTouchEvent(120, 100));
      });

      expect(result.current.translateX).toBe(20);

      act(() => {
        result.current.handlers.onTouchEnd();
      });

      expect(result.current.isDragging).toBe(false);
    });

    it("should call preventDefault on horizontal swipe", () => {
      const { result } = renderHook(() => useSwipeGesture());
      const preventDefault = vi.fn();

      act(() => {
        result.current.handlers.onTouchStart(createTouchEvent(100, 100));
      });

      act(() => {
        result.current.handlers.onTouchMove(createTouchEvent(80, 100, preventDefault));
      });

      expect(preventDefault).toHaveBeenCalledTimes(1);
    });

    it("should not call preventDefault on vertical swipe", () => {
      const { result } = renderHook(() => useSwipeGesture());
      const preventDefault = vi.fn();

      act(() => {
        result.current.handlers.onTouchStart(createTouchEvent(100, 100));
      });

      act(() => {
        result.current.handlers.onTouchMove(createTouchEvent(100, 80, preventDefault));
      });

      expect(preventDefault).not.toHaveBeenCalled();
    });
  });

  describe("canSwipe callback", () => {
    it("should block swipe when canSwipe returns false", () => {
      const canSwipe = vi.fn().mockReturnValue(false);
      const { result } = renderHook(() => useSwipeGesture({ canSwipe }));

      act(() => {
        result.current.handlers.onMouseDown({
          clientX: 100,
          clientY: 100,
        } as React.MouseEvent);
      });

      act(() => {
        result.current.handlers.onMouseMove({
          clientX: 80,
          clientY: 100,
          preventDefault: vi.fn(),
        } as unknown as React.MouseEvent);
      });

      expect(result.current.translateX).toBe(0);
      expect(canSwipe).toHaveBeenCalledWith(-20, "left");
    });

    it("should allow swipe when canSwipe returns true", () => {
      const canSwipe = vi.fn().mockReturnValue(true);
      const { result } = renderHook(() => useSwipeGesture({ canSwipe }));

      act(() => {
        result.current.handlers.onMouseDown({
          clientX: 100,
          clientY: 100,
        } as React.MouseEvent);
      });

      act(() => {
        result.current.handlers.onMouseMove({
          clientX: 120,
          clientY: 100,
          preventDefault: vi.fn(),
        } as unknown as React.MouseEvent);
      });

      expect(result.current.translateX).toBe(20);
      expect(canSwipe).toHaveBeenCalledWith(20, "right");
    });
  });

  describe("onDragEnd callback", () => {
    it("should reset position when onDragEnd returns false", async () => {
      const onDragEnd = vi.fn().mockReturnValue(false);
      const { result } = renderHook(() =>
        useSwipeGesture({ onDragEnd, threshold: 50 }),
      );

      // Set container width manually
      act(() => {
        result.current.containerRef.current = {
          offsetWidth: 300,
        } as HTMLDivElement;
      });

      act(() => {
        result.current.handlers.onMouseDown({
          clientX: 100,
          clientY: 100,
        } as React.MouseEvent);
      });

      act(() => {
        result.current.handlers.onMouseMove({
          clientX: 80,
          clientY: 100,
          preventDefault: vi.fn(),
        } as unknown as React.MouseEvent);
      });

      expect(result.current.translateX).toBe(-20);

      await act(async () => {
        result.current.handlers.onMouseUp();
      });

      expect(onDragEnd).toHaveBeenCalled();
      expect(result.current.translateX).toBe(0);
    });

    it("should keep position when onDragEnd returns true", async () => {
      const onDragEnd = vi.fn().mockReturnValue(true);
      const { result } = renderHook(() =>
        useSwipeGesture({ onDragEnd, threshold: 50 }),
      );

      // Set container width
      act(() => {
        result.current.containerRef.current = {
          offsetWidth: 300,
        } as HTMLDivElement;
      });

      act(() => {
        result.current.handlers.onMouseDown({
          clientX: 100,
          clientY: 100,
        } as React.MouseEvent);
      });

      act(() => {
        result.current.handlers.onMouseMove({
          clientX: 50,
          clientY: 100,
          preventDefault: vi.fn(),
        } as unknown as React.MouseEvent);
      });

      const translateBeforeEnd = result.current.translateX;

      await act(async () => {
        result.current.handlers.onMouseUp();
      });

      expect(result.current.translateX).toBe(translateBeforeEnd);
    });
  });

  describe("resetPosition", () => {
    it("should reset translateX to zero", () => {
      const { result } = renderHook(() => useSwipeGesture());

      // Set some translation
      act(() => {
        result.current.setTranslateX(50);
      });

      expect(result.current.translateX).toBe(50);

      act(() => {
        result.current.resetPosition();
      });

      expect(result.current.translateX).toBe(0);
    });
  });

  describe("setTranslateX", () => {
    it("should allow external control of translateX", () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => {
        result.current.setTranslateX(100);
      });

      expect(result.current.translateX).toBe(100);

      act(() => {
        result.current.setTranslateX(-50);
      });

      expect(result.current.translateX).toBe(-50);
    });
  });

  describe("maxSwipeMultiplier", () => {
    it("should clamp translation to max swipe distance", () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          threshold: 100,
          maxSwipeMultiplier: 1.5,
        }),
      );

      act(() => {
        result.current.handlers.onMouseDown({
          clientX: 100,
          clientY: 100,
        } as React.MouseEvent);
      });

      // Try to move beyond max (100 * 1.5 = 150)
      act(() => {
        result.current.handlers.onMouseMove({
          clientX: 300, // +200px, beyond max
          clientY: 100,
          preventDefault: vi.fn(),
        } as unknown as React.MouseEvent);
      });

      // Should be clamped to 150
      expect(result.current.translateX).toBe(150);
    });
  });

  describe("onDragMove callback", () => {
    it("should call onDragMove during horizontal drag", () => {
      const onDragMove = vi.fn();
      const { result } = renderHook(() => useSwipeGesture({ onDragMove }));

      act(() => {
        result.current.handlers.onMouseDown({
          clientX: 100,
          clientY: 100,
        } as React.MouseEvent);
      });

      act(() => {
        result.current.handlers.onMouseMove({
          clientX: 80,
          clientY: 100,
          preventDefault: vi.fn(),
        } as unknown as React.MouseEvent);
      });

      expect(onDragMove).toHaveBeenCalledWith(-20, "left");
    });

    it("should not call onDragMove during vertical drag", () => {
      const onDragMove = vi.fn();
      const { result } = renderHook(() => useSwipeGesture({ onDragMove }));

      act(() => {
        result.current.handlers.onMouseDown({
          clientX: 100,
          clientY: 100,
        } as React.MouseEvent);
      });

      act(() => {
        result.current.handlers.onMouseMove({
          clientX: 100,
          clientY: 80,
          preventDefault: vi.fn(),
        } as unknown as React.MouseEvent);
      });

      expect(onDragMove).not.toHaveBeenCalled();
    });
  });

  describe("direction detection", () => {
    it("should require 10px movement before detecting direction", () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => {
        result.current.handlers.onMouseDown({
          clientX: 100,
          clientY: 100,
        } as React.MouseEvent);
      });

      // Move less than 10px
      act(() => {
        result.current.handlers.onMouseMove({
          clientX: 95, // Only 5px
          clientY: 100,
          preventDefault: vi.fn(),
        } as unknown as React.MouseEvent);
      });

      // Direction not yet determined, no translation
      expect(result.current.translateX).toBe(0);

      // Move past threshold
      act(() => {
        result.current.handlers.onMouseMove({
          clientX: 85, // Now 15px from start
          clientY: 100,
          preventDefault: vi.fn(),
        } as unknown as React.MouseEvent);
      });

      // Now direction is horizontal, translation applies
      expect(result.current.translateX).toBe(-15);
    });
  });
});
