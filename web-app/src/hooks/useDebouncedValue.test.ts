import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebouncedValue("initial"));
    expect(result.current).toBe("initial");
  });

  it("does not update value before delay has passed", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value),
      { initialProps: { value: "initial" } },
    );

    rerender({ value: "updated" });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe("initial");
  });

  it("updates value after default delay (200ms)", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value),
      { initialProps: { value: "initial" } },
    );

    rerender({ value: "updated" });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe("updated");
  });

  it("respects custom delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: "initial", delay: 500 } },
    );

    rerender({ value: "updated", delay: 500 });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("updated");
  });

  it("resets timer on rapid changes", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value),
      { initialProps: { value: "initial" } },
    );

    rerender({ value: "first" });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: "second" });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: "third" });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe("third");
  });

  it("works with different value types", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value),
      { initialProps: { value: 42 } },
    );

    expect(result.current).toBe(42);

    rerender({ value: 100 });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe(100);
  });

  it("handles object values", () => {
    const initialObj = { name: "test" };
    const updatedObj = { name: "updated" };

    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value),
      { initialProps: { value: initialObj } },
    );

    expect(result.current).toBe(initialObj);

    rerender({ value: updatedObj });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe(updatedObj);
  });
});
