import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAssignmentActions } from "./useAssignmentActions";
import type { Assignment } from "@/api/client";
import * as authStore from "@/stores/auth";
import * as demoStore from "@/stores/demo";
import * as languageStore from "@/stores/language";
import * as settingsStore from "@/stores/settings";
import { toast } from "@/stores/toast";
import { MODAL_CLEANUP_DELAY } from "@/utils/assignment-helpers";

vi.mock("@/stores/auth");
vi.mock("@/stores/demo");
vi.mock("@/stores/language");
vi.mock("@/stores/settings");
vi.mock("@/stores/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: "en",
  }),
}));
vi.mock("@/i18n", () => ({
  t: (key: string) => key,
  getLocale: () => "en",
  setLocale: vi.fn(),
  setLocaleImmediate: vi.fn(),
}));

function createMockAssignment(leagueName = "NLA"): Assignment {
  return {
    __identity: "test-assignment-1",
    refereePosition: "head-one",
    refereeConvocationStatus: "active",
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
        group: {
          phase: {
            league: {
              leagueCategory: {
                name: leagueName,
              },
            },
          },
        },
      },
    },
  } as Assignment;
}

const mockAssignment = createMockAssignment();
const mockAddAssignmentToExchange = vi.fn();

describe("useAssignmentActions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Default: not in demo mode, safe mode disabled
    vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
      selector({ isDemoMode: false } as ReturnType<
        typeof authStore.useAuthStore.getState
      >),
    );

    vi.mocked(languageStore.useLanguageStore).mockImplementation((selector) =>
      selector({ locale: "de" } as ReturnType<
        typeof languageStore.useLanguageStore.getState
      >),
    );

    vi.mocked(settingsStore.useSettingsStore).mockImplementation((selector) =>
      selector({ isSafeModeEnabled: false } as ReturnType<
        typeof settingsStore.useSettingsStore.getState
      >),
    );

    vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
      selector({
        addAssignmentToExchange: mockAddAssignmentToExchange,
      } as unknown as ReturnType<typeof demoStore.useDemoStore.getState>),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should initialize with closed modals", () => {
    const { result } = renderHook(() => useAssignmentActions());

    expect(result.current.editCompensationModal.isOpen).toBe(false);
    expect(result.current.editCompensationModal.assignment).toBeNull();
    expect(result.current.validateGameModal.isOpen).toBe(false);
    expect(result.current.validateGameModal.assignment).toBeNull();
    expect(result.current.pdfReportModal.isOpen).toBe(false);
    expect(result.current.pdfReportModal.assignment).toBeNull();
    expect(result.current.pdfReportModal.isLoading).toBe(false);
    expect(result.current.pdfReportModal.defaultLanguage).toBe("de");
  });

  it("should open and close edit compensation modal", () => {
    const { result } = renderHook(() => useAssignmentActions());

    act(() => {
      result.current.editCompensationModal.open(mockAssignment);
    });

    expect(result.current.editCompensationModal.isOpen).toBe(true);
    expect(result.current.editCompensationModal.assignment).toBe(
      mockAssignment,
    );

    act(() => {
      result.current.editCompensationModal.close();
    });

    expect(result.current.editCompensationModal.isOpen).toBe(false);

    // Assignment should still be present until timeout
    expect(result.current.editCompensationModal.assignment).toBe(
      mockAssignment,
    );

    // Fast-forward to trigger cleanup
    act(() => {
      vi.advanceTimersByTime(MODAL_CLEANUP_DELAY);
    });

    expect(result.current.editCompensationModal.assignment).toBeNull();
  });

  it("should open and close validate game modal", () => {
    const { result } = renderHook(() => useAssignmentActions());

    act(() => {
      result.current.validateGameModal.open(mockAssignment);
    });

    expect(result.current.validateGameModal.isOpen).toBe(true);
    expect(result.current.validateGameModal.assignment).toBe(mockAssignment);

    act(() => {
      result.current.validateGameModal.close();
    });

    expect(result.current.validateGameModal.isOpen).toBe(false);

    // Assignment should still be present until timeout
    expect(result.current.validateGameModal.assignment).toBe(mockAssignment);

    // Fast-forward to trigger cleanup
    act(() => {
      vi.advanceTimersByTime(MODAL_CLEANUP_DELAY);
    });

    expect(result.current.validateGameModal.assignment).toBeNull();
  });

  it("should cleanup timeout on unmount", () => {
    const { result, unmount } = renderHook(() => useAssignmentActions());

    act(() => {
      result.current.editCompensationModal.open(mockAssignment);
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
    const { result } = renderHook(() => useAssignmentActions());

    act(() => {
      result.current.editCompensationModal.open(mockAssignment);
    });

    act(() => {
      result.current.editCompensationModal.close();
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Open and close again before first timeout completes
    act(() => {
      result.current.editCompensationModal.open(mockAssignment);
    });

    act(() => {
      result.current.editCompensationModal.close();
    });

    // First timeout should be cleared, only second one should fire
    act(() => {
      vi.advanceTimersByTime(MODAL_CLEANUP_DELAY);
    });

    expect(result.current.editCompensationModal.assignment).toBeNull();
  });

  it("should open PDF report modal for NLA/NLB games", () => {
    const { result } = renderHook(() => useAssignmentActions());

    act(() => {
      result.current.handleGenerateReport(mockAssignment);
    });

    expect(result.current.pdfReportModal.isOpen).toBe(true);
    expect(result.current.pdfReportModal.assignment).toBe(mockAssignment);
  });

  it("should block generate report for non-NLA/NLB games", () => {
    const { result } = renderHook(() => useAssignmentActions());

    const nonEligibleAssignment = createMockAssignment("1L");

    act(() => {
      result.current.handleGenerateReport(nonEligibleAssignment);
    });

    expect(toast.info).toHaveBeenCalledWith("assignments.gameReportNotAvailable");
    expect(result.current.pdfReportModal.isOpen).toBe(false);
  });

  it("should open PDF report modal for NLB games", () => {
    const { result } = renderHook(() => useAssignmentActions());

    const nlbAssignment = createMockAssignment("NLB");

    act(() => {
      result.current.handleGenerateReport(nlbAssignment);
    });

    expect(result.current.pdfReportModal.isOpen).toBe(true);
    expect(result.current.pdfReportModal.assignment).toBe(nlbAssignment);
  });

  it("should block generate report when league data is undefined", () => {
    const { result } = renderHook(() => useAssignmentActions());

    const assignmentWithoutLeague: Assignment = {
      __identity: "test-assignment-1",
      refereePosition: "head-one",
      refereeConvocationStatus: "active",
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
    } as Assignment;

    act(() => {
      result.current.handleGenerateReport(assignmentWithoutLeague);
    });

    expect(toast.info).toHaveBeenCalledWith("assignments.gameReportNotAvailable");
    expect(result.current.pdfReportModal.isOpen).toBe(false);
  });

  it("should block generate report for second referee (head-two)", () => {
    const { result } = renderHook(() => useAssignmentActions());

    const secondRefereeAssignment: Assignment = {
      ...createMockAssignment("NLA"),
      refereePosition: "head-two",
    } as Assignment;

    act(() => {
      result.current.handleGenerateReport(secondRefereeAssignment);
    });

    expect(toast.info).toHaveBeenCalledWith("assignments.gameReportNotAvailable");
    expect(result.current.pdfReportModal.isOpen).toBe(false);
  });

  it("should block generate report for linesman positions", () => {
    const { result } = renderHook(() => useAssignmentActions());

    const linesmanAssignment: Assignment = {
      ...createMockAssignment("NLA"),
      refereePosition: "linesman-one",
    } as Assignment;

    act(() => {
      result.current.handleGenerateReport(linesmanAssignment);
    });

    expect(toast.info).toHaveBeenCalledWith("assignments.gameReportNotAvailable");
    expect(result.current.pdfReportModal.isOpen).toBe(false);
  });

  it("should open and close PDF report modal", () => {
    const { result } = renderHook(() => useAssignmentActions());

    act(() => {
      result.current.pdfReportModal.open(mockAssignment);
    });

    expect(result.current.pdfReportModal.isOpen).toBe(true);
    expect(result.current.pdfReportModal.assignment).toBe(mockAssignment);

    act(() => {
      result.current.pdfReportModal.close();
    });

    expect(result.current.pdfReportModal.isOpen).toBe(false);

    act(() => {
      vi.advanceTimersByTime(MODAL_CLEANUP_DELAY);
    });

    expect(result.current.pdfReportModal.assignment).toBeNull();
  });

  it("should handle add to exchange action", () => {
    const { result } = renderHook(() => useAssignmentActions());

    act(() => {
      result.current.handleAddToExchange(mockAssignment);
    });

    expect(toast.success).toHaveBeenCalledWith("exchange.addedToExchangeSuccess");
  });

  describe("demo mode guards", () => {
    beforeEach(() => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );
    });

    it("should use demo store for add to exchange in demo mode", () => {
      const { result } = renderHook(() => useAssignmentActions());

      act(() => {
        result.current.handleAddToExchange(mockAssignment);
      });

      expect(mockAddAssignmentToExchange).toHaveBeenCalledWith(
        mockAssignment.__identity,
      );
      expect(toast.success).toHaveBeenCalledWith("exchange.addedToExchangeSuccess");
    });

    it("should open PDF report modal in demo mode", () => {
      const { result } = renderHook(() => useAssignmentActions());

      act(() => {
        result.current.handleGenerateReport(mockAssignment);
      });

      expect(result.current.pdfReportModal.isOpen).toBe(true);
      expect(result.current.pdfReportModal.assignment).toBe(mockAssignment);
    });
  });

  describe("safe mode guards", () => {
    beforeEach(() => {
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

    it("should block add to exchange when safe mode is enabled", () => {
      const { result } = renderHook(() => useAssignmentActions());

      act(() => {
        result.current.handleAddToExchange(mockAssignment);
      });

      expect(mockAddAssignmentToExchange).not.toHaveBeenCalled();
      expect(toast.warning).toHaveBeenCalledWith("settings.safeModeBlocked");
    });

    it("should block validate game when safe mode is enabled", () => {
      const { result } = renderHook(() => useAssignmentActions());

      act(() => {
        result.current.validateGameModal.open(mockAssignment);
      });

      expect(result.current.validateGameModal.isOpen).toBe(false);
      expect(toast.warning).toHaveBeenCalledWith("settings.safeModeBlocked");
    });

    it("should not block operations in demo mode even with safe mode enabled", () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      const { result } = renderHook(() => useAssignmentActions());

      act(() => {
        result.current.handleAddToExchange(mockAssignment);
      });

      expect(mockAddAssignmentToExchange).toHaveBeenCalledWith(
        mockAssignment.__identity,
      );
      expect(toast.success).toHaveBeenCalledWith("exchange.addedToExchangeSuccess");
    });
  });
});
