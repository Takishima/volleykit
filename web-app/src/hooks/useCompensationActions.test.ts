import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCompensationActions } from "./useCompensationActions";
import type { CompensationRecord } from "@/api/client";
import * as compensationActionsModule from "@/utils/compensation-actions";
import * as authStore from "@/stores/auth";
import * as settingsStore from "@/stores/settings";
import { MODAL_CLEANUP_DELAY } from "@/utils/assignment-helpers";

vi.mock("@/stores/auth");
vi.mock("@/stores/settings");

function createMockCompensation(): CompensationRecord {
  return {
    __identity: "test-compensation-1",
    convocationCompensation: {
      gameCompensation: 50,
      travelExpenses: 20,
      paymentDone: false,
    },
    refereeGame: {
      game: {
        startingDateTime: "2025-12-15T18:00:00Z",
        encounter: {
          teamHome: { name: "Team A" },
          teamAway: { name: "Team B" },
        },
      },
    },
  } as CompensationRecord;
}

const mockCompensation = createMockCompensation();

describe("useCompensationActions", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    // Default: not in demo mode
    vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
      selector({ isDemoMode: false } as ReturnType<
        typeof authStore.useAuthStore.getState
      >),
    );

    // Default: safe mode disabled (allow operations)
    vi.mocked(settingsStore.useSettingsStore).mockImplementation((selector) =>
      selector({ isSafeModeEnabled: false } as ReturnType<
        typeof settingsStore.useSettingsStore.getState
      >),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should initialize with closed modal", () => {
    const { result } = renderHook(() => useCompensationActions());

    expect(result.current.editCompensationModal.isOpen).toBe(false);
    expect(result.current.editCompensationModal.compensation).toBeNull();
  });

  it("should open and close edit compensation modal", () => {
    const { result } = renderHook(() => useCompensationActions());

    act(() => {
      result.current.editCompensationModal.open(mockCompensation);
    });

    expect(result.current.editCompensationModal.isOpen).toBe(true);
    expect(result.current.editCompensationModal.compensation).toBe(
      mockCompensation,
    );

    act(() => {
      result.current.editCompensationModal.close();
    });

    expect(result.current.editCompensationModal.isOpen).toBe(false);

    // Compensation record should still be present until timeout
    expect(result.current.editCompensationModal.compensation).toBe(
      mockCompensation,
    );

    // Fast-forward time to trigger cleanup
    act(() => {
      vi.advanceTimersByTime(MODAL_CLEANUP_DELAY);
    });

    expect(result.current.editCompensationModal.compensation).toBeNull();
  });

  it("should cleanup timeout on unmount", () => {
    const { result, unmount } = renderHook(() => useCompensationActions());

    act(() => {
      result.current.editCompensationModal.open(mockCompensation);
    });

    act(() => {
      result.current.editCompensationModal.close();
    });

    // Unmount before timeout completes
    unmount();

    // Should not throw or cause memory leak
    act(() => {
      vi.advanceTimersByTime(MODAL_CLEANUP_DELAY);
    });
  });

  it("should clear previous timeout when closing multiple times", () => {
    const { result } = renderHook(() => useCompensationActions());

    act(() => {
      result.current.editCompensationModal.open(mockCompensation);
    });

    act(() => {
      result.current.editCompensationModal.close();
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Open and close again before first timeout completes
    act(() => {
      result.current.editCompensationModal.open(mockCompensation);
    });

    act(() => {
      result.current.editCompensationModal.close();
    });

    // First timeout should be cleared, only second one should fire
    act(() => {
      vi.advanceTimersByTime(MODAL_CLEANUP_DELAY);
    });

    expect(result.current.editCompensationModal.compensation).toBeNull();
  });

  it("should handle PDF generation success", async () => {
    const downloadSpy = vi
      .spyOn(compensationActionsModule, "downloadCompensationPDF")
      .mockResolvedValue(undefined);

    const { result } = renderHook(() => useCompensationActions());

    await act(async () => {
      await result.current.handleGeneratePDF(mockCompensation);
    });

    expect(downloadSpy).toHaveBeenCalledWith("test-compensation-1");
  });

  it("should handle PDF generation error", async () => {
    vi.spyOn(
      compensationActionsModule,
      "downloadCompensationPDF",
    ).mockRejectedValue(new Error("Network error"));

    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    const { result } = renderHook(() => useCompensationActions());

    await act(async () => {
      await result.current.handleGeneratePDF(mockCompensation);
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "Failed to download compensation PDF. Please try again later.",
    );

    alertSpy.mockRestore();
  });

  it("should prevent concurrent PDF downloads", async () => {
    let resolveDownload: () => void;
    const downloadPromise = new Promise<void>((resolve) => {
      resolveDownload = resolve;
    });

    vi.spyOn(
      compensationActionsModule,
      "downloadCompensationPDF",
    ).mockReturnValue(downloadPromise);

    const { result } = renderHook(() => useCompensationActions());

    // Start first download (don't await yet)
    const promise1 = result.current.handleGeneratePDF(mockCompensation);

    // Try to start second download immediately
    const promise2 = result.current.handleGeneratePDF(mockCompensation);

    // Resolve the download
    resolveDownload!();

    await Promise.all([promise1, promise2]);

    // Should only call download once
    expect(
      compensationActionsModule.downloadCompensationPDF,
    ).toHaveBeenCalledTimes(1);
  });

  describe("demo mode guards", () => {
    beforeEach(() => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );
    });

    it("should not download PDF in demo mode", async () => {
      const downloadSpy = vi
        .spyOn(compensationActionsModule, "downloadCompensationPDF")
        .mockResolvedValue(undefined);

      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      const { result } = renderHook(() => useCompensationActions());

      await act(async () => {
        await result.current.handleGeneratePDF(mockCompensation);
      });

      expect(downloadSpy).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        "PDF downloads are not available in demo mode",
      );

      alertSpy.mockRestore();
    });

    it("should allow editing compensation in demo mode even with safe mode enabled", () => {
      // Demo mode bypasses safe mode since changes are local-only
      vi.mocked(settingsStore.useSettingsStore).mockImplementation((selector) =>
        selector({ isSafeModeEnabled: true } as ReturnType<
          typeof settingsStore.useSettingsStore.getState
        >),
      );

      const { result } = renderHook(() => useCompensationActions());

      act(() => {
        result.current.editCompensationModal.open(mockCompensation);
      });

      expect(result.current.editCompensationModal.isOpen).toBe(true);
    });
  });

  describe("safe mode guards", () => {
    beforeEach(() => {
      // Not in demo mode, safe mode enabled
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

    it("should block editing compensation when safe mode is enabled", () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      const { result } = renderHook(() => useCompensationActions());

      act(() => {
        result.current.editCompensationModal.open(mockCompensation);
      });

      expect(result.current.editCompensationModal.isOpen).toBe(false);
      expect(result.current.editCompensationModal.compensation).toBeNull();
      expect(alertSpy).toHaveBeenCalled();

      alertSpy.mockRestore();
    });
  });
});
