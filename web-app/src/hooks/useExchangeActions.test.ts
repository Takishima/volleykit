import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MODAL_CLEANUP_DELAY } from "@/utils/assignment-helpers";
import { useExchangeActions } from "./useExchangeActions";
import type { GameExchange } from "@/api/client";
import type { UseMutationResult } from "@tanstack/react-query";
import * as useConvocations from "./useConvocations";
import * as authStore from "@/stores/auth";
import * as settingsStore from "@/stores/settings";

vi.mock("./useConvocations");
vi.mock("@/stores/auth");
vi.mock("@/stores/settings");

function createMockExchange(): GameExchange {
  return {
    __identity: "test-exchange-1",
    status: "open",
    refereeGame: {
      game: {
        startingDateTime: "2025-12-15T18:00:00Z",
        encounter: {
          teamHome: { name: "Team A" },
          teamAway: { name: "Team B" },
        },
        hall: {
          name: "Main Arena",
        },
      },
    },
  } as GameExchange;
}

const mockExchange = createMockExchange();

describe("useExchangeActions", () => {
  const mockApplyMutate = vi.fn();
  const mockWithdrawMutate = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.spyOn(window, "alert").mockImplementation(() => {});

    // Default: not in demo mode, safe mode disabled
    vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
      selector({ isDemoMode: false } as ReturnType<
        typeof authStore.useAuthStore.getState
      >),
    );

    vi.mocked(settingsStore.useSettingsStore).mockImplementation((selector) =>
      selector({ isSafeModeEnabled: false } as ReturnType<
        typeof settingsStore.useSettingsStore.getState
      >),
    );

    vi.mocked(useConvocations.useApplyForExchange).mockReturnValue({
      mutateAsync: mockApplyMutate,
    } as unknown as UseMutationResult<void, Error, string>);

    vi.mocked(useConvocations.useWithdrawFromExchange).mockReturnValue({
      mutateAsync: mockWithdrawMutate,
    } as unknown as UseMutationResult<void, Error, string>);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should initialize with closed modals", () => {
    const { result } = renderHook(() => useExchangeActions());

    expect(result.current.takeOverModal.isOpen).toBe(false);
    expect(result.current.takeOverModal.exchange).toBeNull();
    expect(result.current.removeFromExchangeModal.isOpen).toBe(false);
    expect(result.current.removeFromExchangeModal.exchange).toBeNull();
  });

  it("should open and close take over modal", () => {
    const { result } = renderHook(() => useExchangeActions());

    act(() => {
      result.current.takeOverModal.open(mockExchange);
    });

    expect(result.current.takeOverModal.isOpen).toBe(true);
    expect(result.current.takeOverModal.exchange).toBe(mockExchange);

    act(() => {
      result.current.takeOverModal.close();
    });

    expect(result.current.takeOverModal.isOpen).toBe(false);
  });

  it("should open and close remove from exchange modal", () => {
    const { result } = renderHook(() => useExchangeActions());

    act(() => {
      result.current.removeFromExchangeModal.open(mockExchange);
    });

    expect(result.current.removeFromExchangeModal.isOpen).toBe(true);
    expect(result.current.removeFromExchangeModal.exchange).toBe(mockExchange);

    act(() => {
      result.current.removeFromExchangeModal.close();
    });

    expect(result.current.removeFromExchangeModal.isOpen).toBe(false);
  });

  it("should cleanup exchange data after modal close delay", () => {
    const { result } = renderHook(() => useExchangeActions());

    act(() => {
      result.current.takeOverModal.open(mockExchange);
    });

    expect(result.current.takeOverModal.exchange).toBe(mockExchange);

    act(() => {
      result.current.takeOverModal.close();
    });

    // Immediately after close, exchange should still be there
    expect(result.current.takeOverModal.exchange).toBe(mockExchange);

    // Fast-forward to trigger cleanup
    act(() => {
      vi.advanceTimersByTime(MODAL_CLEANUP_DELAY);
    });

    expect(result.current.takeOverModal.exchange).toBeNull();
  });

  it("should cleanup timeout on unmount", () => {
    const { result, unmount } = renderHook(() => useExchangeActions());

    act(() => {
      result.current.takeOverModal.open(mockExchange);
    });

    act(() => {
      result.current.takeOverModal.close();
    });

    // Unmount before timeout completes
    unmount();

    // Should not throw or cause memory leak
    act(() => {
      vi.advanceTimersByTime(MODAL_CLEANUP_DELAY);
    });
  });

  it("should clear previous timeout when closing multiple times", () => {
    const { result } = renderHook(() => useExchangeActions());

    act(() => {
      result.current.takeOverModal.open(mockExchange);
    });

    act(() => {
      result.current.takeOverModal.close();
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Open and close again before first timeout completes
    act(() => {
      result.current.takeOverModal.open(mockExchange);
    });

    act(() => {
      result.current.takeOverModal.close();
    });

    // First timeout should be cleared, only second one should fire
    act(() => {
      vi.advanceTimersByTime(MODAL_CLEANUP_DELAY);
    });

    expect(result.current.takeOverModal.exchange).toBeNull();
  });

  it("should handle take over action successfully", async () => {
    vi.useRealTimers();
    mockApplyMutate.mockResolvedValue(undefined);

    const { result } = renderHook(() => useExchangeActions());

    await act(async () => {
      await result.current.handleTakeOver(mockExchange);
    });

    expect(mockApplyMutate).toHaveBeenCalledWith(mockExchange.__identity);
    expect(window.alert).toHaveBeenCalledWith(
      "Successfully applied for exchange",
    );
    vi.useFakeTimers();
  });

  it("should handle take over action failure", async () => {
    vi.useRealTimers();
    mockApplyMutate.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useExchangeActions());

    await act(async () => {
      await result.current.handleTakeOver(mockExchange);
    });

    expect(mockApplyMutate).toHaveBeenCalledWith(mockExchange.__identity);
    expect(window.alert).toHaveBeenCalledWith(
      "Failed to apply for exchange. Please try again.",
    );
    vi.useFakeTimers();
  });

  it("should handle remove from exchange action successfully", async () => {
    vi.useRealTimers();
    mockWithdrawMutate.mockResolvedValue(undefined);

    const { result } = renderHook(() => useExchangeActions());

    await act(async () => {
      await result.current.handleRemoveFromExchange(mockExchange);
    });

    expect(mockWithdrawMutate).toHaveBeenCalledWith(mockExchange.__identity);
    expect(window.alert).toHaveBeenCalledWith(
      "Successfully removed from exchange",
    );
    vi.useFakeTimers();
  });

  it("should handle remove from exchange action failure", async () => {
    vi.useRealTimers();
    mockWithdrawMutate.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useExchangeActions());

    await act(async () => {
      await result.current.handleRemoveFromExchange(mockExchange);
    });

    expect(mockWithdrawMutate).toHaveBeenCalledWith(mockExchange.__identity);
    expect(window.alert).toHaveBeenCalledWith(
      "Failed to remove from exchange. Please try again.",
    );
    vi.useFakeTimers();
  });

  it("should prevent duplicate take over actions", async () => {
    vi.useRealTimers();
    mockApplyMutate.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    const { result } = renderHook(() => useExchangeActions());

    // Start first action
    const promise1 = act(async () => {
      await result.current.handleTakeOver(mockExchange);
    });

    // Try to start second action before first completes
    await act(async () => {
      await result.current.handleTakeOver(mockExchange);
    });

    await promise1;

    // Should only be called once
    expect(mockApplyMutate).toHaveBeenCalledTimes(1);
    vi.useFakeTimers();
  });

  it("should prevent duplicate remove from exchange actions", async () => {
    vi.useRealTimers();
    mockWithdrawMutate.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    const { result } = renderHook(() => useExchangeActions());

    // Start first action
    const promise1 = act(async () => {
      await result.current.handleRemoveFromExchange(mockExchange);
    });

    // Try to start second action before first completes
    await act(async () => {
      await result.current.handleRemoveFromExchange(mockExchange);
    });

    await promise1;

    // Should only be called once
    expect(mockWithdrawMutate).toHaveBeenCalledTimes(1);
    vi.useFakeTimers();
  });

  it("should handle rapid open/close cycles correctly", () => {
    const { result } = renderHook(() => useExchangeActions());

    // Rapidly toggle modal
    act(() => {
      result.current.takeOverModal.open(mockExchange);
    });
    act(() => {
      result.current.takeOverModal.close();
    });
    act(() => {
      result.current.takeOverModal.open(mockExchange);
    });

    expect(result.current.takeOverModal.isOpen).toBe(true);
    expect(result.current.takeOverModal.exchange).toBe(mockExchange);
  });

  it("should handle rapid open/close cycles for removeFromExchange modal", () => {
    const { result } = renderHook(() => useExchangeActions());

    // Rapidly toggle modal
    act(() => {
      result.current.removeFromExchangeModal.open(mockExchange);
    });
    act(() => {
      result.current.removeFromExchangeModal.close();
    });
    act(() => {
      result.current.removeFromExchangeModal.open(mockExchange);
    });

    expect(result.current.removeFromExchangeModal.isOpen).toBe(true);
    expect(result.current.removeFromExchangeModal.exchange).toBe(mockExchange);
  });

  describe("demo mode behavior", () => {
    beforeEach(() => {
      vi.useRealTimers();
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );
    });

    afterEach(() => {
      vi.useFakeTimers();
    });

    it("should use mutation for take over in demo mode (routed to mock API)", async () => {
      const { result } = renderHook(() => useExchangeActions());

      await act(async () => {
        await result.current.handleTakeOver(mockExchange);
      });

      // In the new architecture, demo mode uses the same mutations
      // which are routed to the mock API via getApiClient
      expect(mockApplyMutate).toHaveBeenCalledWith(mockExchange.__identity);
    });

    it("should use mutation for remove from exchange in demo mode (routed to mock API)", async () => {
      const { result } = renderHook(() => useExchangeActions());

      await act(async () => {
        await result.current.handleRemoveFromExchange(mockExchange);
      });

      // In the new architecture, demo mode uses the same mutations
      // which are routed to the mock API via getApiClient
      expect(mockWithdrawMutate).toHaveBeenCalledWith(mockExchange.__identity);
    });

    it("should close modal after demo mode take over", async () => {
      const { result } = renderHook(() => useExchangeActions());

      act(() => {
        result.current.takeOverModal.open(mockExchange);
      });

      expect(result.current.takeOverModal.isOpen).toBe(true);

      await act(async () => {
        await result.current.handleTakeOver(mockExchange);
      });

      expect(result.current.takeOverModal.isOpen).toBe(false);
    });

    it("should close modal after demo mode remove from exchange", async () => {
      const { result } = renderHook(() => useExchangeActions());

      act(() => {
        result.current.removeFromExchangeModal.open(mockExchange);
      });

      expect(result.current.removeFromExchangeModal.isOpen).toBe(true);

      await act(async () => {
        await result.current.handleRemoveFromExchange(mockExchange);
      });

      expect(result.current.removeFromExchangeModal.isOpen).toBe(false);
    });
  });

  describe("safe mode guards", () => {
    beforeEach(() => {
      vi.useRealTimers();
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: false } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );
      vi.mocked(settingsStore.useSettingsStore).mockImplementation((selector) =>
        selector({ isSafeModeEnabled: true } as ReturnType<
          typeof settingsStore.useSettingsStore.getState
        >),
      );
    });

    afterEach(() => {
      vi.useFakeTimers();
    });

    it("should block take over when safe mode is enabled", async () => {
      const { result } = renderHook(() => useExchangeActions());

      await act(async () => {
        await result.current.handleTakeOver(mockExchange);
      });

      expect(mockApplyMutate).not.toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith(
        "This operation is blocked in safe mode. Disable safe mode in Settings to proceed.",
      );
    });

    it("should block remove from exchange when safe mode is enabled", async () => {
      const { result } = renderHook(() => useExchangeActions());

      await act(async () => {
        await result.current.handleRemoveFromExchange(mockExchange);
      });

      expect(mockWithdrawMutate).not.toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith(
        "This operation is blocked in safe mode. Disable safe mode in Settings to proceed.",
      );
    });

    it("should not block operations in demo mode even with safe mode enabled", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      const { result } = renderHook(() => useExchangeActions());

      await act(async () => {
        await result.current.handleTakeOver(mockExchange);
      });

      // In demo mode, operations are allowed even with safe mode enabled
      // because demo mode uses local data and poses no risk
      expect(mockApplyMutate).toHaveBeenCalledWith(mockExchange.__identity);
    });
  });
});
