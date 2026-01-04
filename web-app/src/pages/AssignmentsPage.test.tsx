import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AssignmentsPage } from "./AssignmentsPage";
import type { Assignment } from "@/api/client";
import type { UseQueryResult } from "@tanstack/react-query";
import * as useConvocations from "@/hooks/useConvocations";
import * as authStore from "@/stores/auth";

// Mock useTour to disable tour mode during tests (see src/test/mocks.ts for shared pattern)
const mockUseTour = vi.hoisted(() => ({
  useTour: () => ({
    isActive: false,
    isTourMode: false,
    showDummyData: false,
    startTour: vi.fn(),
    endTour: vi.fn(),
    currentStep: 0,
    nextStep: vi.fn(),
    shouldShow: false,
  }),
}));

vi.mock("@/hooks/useConvocations");
vi.mock("@/hooks/useTour", () => mockUseTour);
vi.mock("@/stores/auth");
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      // Return readable strings for key assertions
      const translations: Record<string, string> = {
        "assignments.title": "Assignments",
        "assignments.upcoming": "Upcoming",
        "assignments.validationClosed": "Validation Closed",
        "assignments.past": "Past",
        "assignments.loading": "Loading...",
        "assignments.failedToLoadData": "Failed to load data",
        "assignments.noUpcomingTitle": "No upcoming assignments",
        "assignments.noUpcomingDescription": "You have no upcoming assignments",
        "assignments.noClosedTitle": "No closed assignments",
        "assignments.noClosedDescription": "No closed assignments yet",
        "assignments.calendarEmptyTitle": "No calendar data",
        "assignments.calendarEmptyDescription": "Your calendar is empty",
        "assignments.calendarNoUpcomingTitle": "No upcoming calendar events",
        "assignments.calendarNoUpcomingDescription": "No upcoming events in calendar",
        "common.today": "Today",
        "common.tomorrow": "Tomorrow",
        "common.vs": "vs",
        "common.unknown": "Unknown",
        "common.retry": "Retry",
      };
      return translations[key] ?? key;
    },
    locale: "en",
  }),
}));

// Helper to mock auth store
function mockAuthStoreState(overrides: Record<string, unknown> = {}) {
  const state = {
    isAssociationSwitching: false,
    isCalendarMode: () => false,
    ...overrides,
  };
  vi.mocked(authStore.useAuthStore).mockImplementation((selector?: unknown) => {
    if (typeof selector === "function") {
      return selector(state);
    }
    return state as ReturnType<typeof authStore.useAuthStore>;
  });
}
vi.mock("@/hooks/useAssignmentActions", () => ({
  useAssignmentActions: () => ({
    editCompensationModal: {
      isOpen: false,
      assignment: null,
      open: vi.fn(),
      close: vi.fn(),
    },
    validateGameModal: {
      isOpen: false,
      assignment: null,
      open: vi.fn(),
      close: vi.fn(),
    },
    pdfReportModal: {
      isOpen: false,
      assignment: null,
      isLoading: false,
      defaultLanguage: "de",
      open: vi.fn(),
      close: vi.fn(),
      onConfirm: vi.fn(),
    },
    handleGenerateReport: vi.fn(),
    handleAddToExchange: vi.fn(),
  }),
}));

function createMockAssignment(
  overrides: Partial<Assignment> = {},
): Assignment {
  return {
    __identity: `assignment-${Math.random()}`,
    refereeConvocationStatus: "active",
    refereePosition: "head-one",
    refereeGame: {
      isGameInFuture: "1",
      game: {
        startingDateTime: "2025-12-15T18:00:00Z",
        encounter: {
          teamHome: { name: "VBC Zürich" },
          teamAway: { name: "VBC Basel" },
        },
        hall: { name: "Main Arena" },
        group: {
          phase: {
            league: {
              leagueCategory: { name: "NLA" },
              gender: "m",
            },
          },
        },
      },
    },
    ...overrides,
  } as Assignment;
}

function createMockQueryResult(
  data: Assignment[] | undefined,
  isLoading = false,
  error: Error | null = null,
): UseQueryResult<Assignment[], Error> {
  // Compute status first, then derive other flags from it
  const status = isLoading ? "pending" : error !== null ? "error" : "success";
  return {
    data,
    isLoading,
    isFetching: false,
    isError: status === "error",
    error,
    isSuccess: status === "success" && data !== undefined,
    status,
    refetch: vi.fn(),
  } as unknown as UseQueryResult<Assignment[], Error>;
}

// Create a mock for calendar assignments
function createMockCalendarQueryResult(
  data: useConvocations.CalendarAssignment[] | undefined = [],
  isLoading = false,
  error: Error | null = null,
) {
  // Compute status first, then derive other flags from it
  const status = isLoading ? "pending" : error !== null ? "error" : "success";
  return {
    data,
    isLoading,
    isFetching: false,
    isError: status === "error",
    error,
    isSuccess: status === "success" && data !== undefined,
    status,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useConvocations.useCalendarAssignments>;
}

describe("AssignmentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks - not in calendar mode
    mockAuthStoreState();

    // Default mocks - empty data
    vi.mocked(useConvocations.useUpcomingAssignments).mockReturnValue(
      createMockQueryResult([]),
    );
    vi.mocked(useConvocations.useValidationClosedAssignments).mockReturnValue(
      createMockQueryResult([]),
    );
    // Mock calendar assignments (empty by default - calendar mode not active)
    vi.mocked(useConvocations.useCalendarAssignments).mockReturnValue(
      createMockCalendarQueryResult([]),
    );
  });

  describe("Tab Navigation", () => {
    it("should default to Upcoming tab", () => {
      render(<AssignmentsPage />);

      const upcomingTab = screen.getByRole("tab", { name: /upcoming/i });
      expect(upcomingTab).toHaveClass("border-primary-500");
      expect(upcomingTab).toHaveAttribute("aria-selected", "true");
    });

    it("should switch to Validation Closed tab when clicked", () => {
      render(<AssignmentsPage />);

      fireEvent.click(screen.getByRole("tab", { name: /validation closed/i }));

      const validationClosedTab = screen.getByRole("tab", {
        name: /validation closed/i,
      });
      expect(validationClosedTab).toHaveClass("border-primary-500");
      expect(validationClosedTab).toHaveAttribute("aria-selected", "true");
    });

    it("should have proper ARIA attributes on tablist", () => {
      render(<AssignmentsPage />);

      const tablist = screen.getByRole("tablist");
      expect(tablist).toHaveAttribute("aria-label");
    });

    it("should show count badge when upcoming data is available", () => {
      vi.mocked(useConvocations.useUpcomingAssignments).mockReturnValue(
        createMockQueryResult([createMockAssignment(), createMockAssignment()]),
      );

      render(<AssignmentsPage />);

      const upcomingTab = screen.getByRole("tab", { name: /upcoming/i });
      expect(upcomingTab).toHaveTextContent("2");
    });

    it("should show count badge when validation closed data is available", () => {
      vi.mocked(useConvocations.useValidationClosedAssignments).mockReturnValue(
        createMockQueryResult([
          createMockAssignment(),
          createMockAssignment(),
          createMockAssignment(),
        ]),
      );

      render(<AssignmentsPage />);

      const validationClosedTab = screen.getByRole("tab", {
        name: /validation closed/i,
      });
      expect(validationClosedTab).toHaveTextContent("3");
    });
  });

  describe("Content Display - Upcoming Tab", () => {
    it("should show loading state", () => {
      vi.mocked(useConvocations.useUpcomingAssignments).mockReturnValue(
        createMockQueryResult(undefined, true),
      );

      render(<AssignmentsPage />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it("should show error state with retry button", () => {
      vi.mocked(useConvocations.useUpcomingAssignments).mockReturnValue(
        createMockQueryResult(undefined, false, new Error("Failed to load")),
      );

      render(<AssignmentsPage />);

      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /retry/i }),
      ).toBeInTheDocument();
    });

    it("should show empty state when no upcoming assignments", () => {
      vi.mocked(useConvocations.useUpcomingAssignments).mockReturnValue(
        createMockQueryResult([]),
      );

      render(<AssignmentsPage />);

      expect(
        screen.getByRole("heading", { name: /no upcoming/i }),
      ).toBeInTheDocument();
    });

    it("should show assignments when data is available", () => {
      const assignment = createMockAssignment();
      vi.mocked(useConvocations.useUpcomingAssignments).mockReturnValue(
        createMockQueryResult([assignment]),
      );

      render(<AssignmentsPage />);

      expect(screen.getByText(/VBC Zürich/i)).toBeInTheDocument();
      expect(screen.getByText(/VBC Basel/i)).toBeInTheDocument();
    });
  });

  describe("Content Display - Validation Closed Tab", () => {
    it("should show loading state on validation closed tab", () => {
      vi.mocked(useConvocations.useValidationClosedAssignments).mockReturnValue(
        createMockQueryResult(undefined, true),
      );

      render(<AssignmentsPage />);
      fireEvent.click(screen.getByRole("tab", { name: /validation closed/i }));

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it("should show error state on validation closed tab", () => {
      vi.mocked(useConvocations.useValidationClosedAssignments).mockReturnValue(
        createMockQueryResult(undefined, false, new Error("Network error")),
      );

      render(<AssignmentsPage />);
      fireEvent.click(screen.getByRole("tab", { name: /validation closed/i }));

      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    it("should show empty state when no validation closed assignments", () => {
      vi.mocked(useConvocations.useValidationClosedAssignments).mockReturnValue(
        createMockQueryResult([]),
      );

      render(<AssignmentsPage />);
      fireEvent.click(screen.getByRole("tab", { name: /validation closed/i }));

      expect(
        screen.getByRole("heading", { name: /no closed/i }),
      ).toBeInTheDocument();
    });

    it("should show assignments when validation closed data is available", () => {
      const assignment = createMockAssignment({
        refereeGame: {
          isGameInFuture: "0",
          game: {
            startingDateTime: "2025-12-10T18:00:00Z",
            encounter: {
              teamHome: { name: "VBC Bern" },
              teamAway: { name: "VBC Geneva" },
            },
            hall: { name: "Bern Arena" },
          },
        },
      } as Partial<Assignment>);
      vi.mocked(useConvocations.useValidationClosedAssignments).mockReturnValue(
        createMockQueryResult([assignment]),
      );

      render(<AssignmentsPage />);
      fireEvent.click(screen.getByRole("tab", { name: /validation closed/i }));

      expect(screen.getByText(/VBC Bern/i)).toBeInTheDocument();
      expect(screen.getByText(/VBC Geneva/i)).toBeInTheDocument();
    });
  });

  describe("Tab Panel Accessibility", () => {
    it("should have proper tabpanel aria attributes for upcoming tab", () => {
      render(<AssignmentsPage />);

      const tabpanel = screen.getByRole("tabpanel");
      // Tab IDs follow the pattern: tab-{tabId}, tabpanel-{tabId}
      expect(tabpanel).toHaveAttribute("id", "tabpanel-upcoming");
      expect(tabpanel).toHaveAttribute("aria-labelledby", "tab-upcoming");
    });

    it("should have proper tabpanel aria attributes for validation closed tab", () => {
      render(<AssignmentsPage />);
      fireEvent.click(screen.getByRole("tab", { name: /validation closed/i }));

      const tabpanel = screen.getByRole("tabpanel");
      // Tab IDs follow the pattern: tab-{tabId}, tabpanel-{tabId}
      expect(tabpanel).toHaveAttribute("id", "tabpanel-validationClosed");
      expect(tabpanel).toHaveAttribute(
        "aria-labelledby",
        "tab-validationClosed",
      );
    });
  });

  describe("Error Handling", () => {
    it("should call refetch when retry button is clicked on upcoming tab", () => {
      const mockRefetch = vi.fn();
      vi.mocked(useConvocations.useUpcomingAssignments).mockReturnValue({
        ...createMockQueryResult(undefined, false, new Error("Failed")),
        refetch: mockRefetch,
      } as unknown as UseQueryResult<Assignment[], Error>);

      render(<AssignmentsPage />);
      fireEvent.click(screen.getByRole("button", { name: /retry/i }));

      expect(mockRefetch).toHaveBeenCalled();
    });

    it("should call refetch when retry button is clicked on validation closed tab", () => {
      const mockRefetch = vi.fn();
      vi.mocked(useConvocations.useValidationClosedAssignments).mockReturnValue(
        {
          ...createMockQueryResult(undefined, false, new Error("Failed")),
          refetch: mockRefetch,
        } as unknown as UseQueryResult<Assignment[], Error>,
      );

      render(<AssignmentsPage />);
      fireEvent.click(screen.getByRole("tab", { name: /validation closed/i }));
      fireEvent.click(screen.getByRole("button", { name: /retry/i }));

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe("Calendar Mode", () => {
    // Helper to create a future date string for mock assignments
    function getFutureDateString(hoursFromNow = 24): string {
      const date = new Date();
      date.setHours(date.getHours() + hoursFromNow);
      return date.toISOString();
    }

    function createMockCalendarAssignment(
      overrides: Partial<useConvocations.CalendarAssignment> = {},
    ): useConvocations.CalendarAssignment {
      // Use a dynamically computed future date to ensure assignments are "upcoming"
      const startTime = getFutureDateString(48); // 48 hours from now
      const endTime = getFutureDateString(50); // 50 hours from now
      return {
        gameId: `game-${Math.random()}`,
        role: "referee1",
        roleRaw: "1. SR",
        startTime,
        endTime,
        homeTeam: "VBC Zürich",
        awayTeam: "VBC Basel",
        league: "NLA Men",
        address: "Saalsporthalle, Zürich",
        coordinates: null,
        hallName: null,
        gender: "men",
        mapsUrl: null,
        ...overrides,
      };
    }

    beforeEach(() => {
      // Set calendar mode
      mockAuthStoreState({ isCalendarMode: () => true });
    });

    describe("Tab Labels", () => {
      it("should show 'Past' instead of 'Validation Closed' in calendar mode", () => {
        render(<AssignmentsPage />);

        // Should have "Past" tab, not "Validation Closed"
        expect(screen.getByRole("tab", { name: /past/i })).toBeInTheDocument();
        expect(
          screen.queryByRole("tab", { name: /validation closed/i }),
        ).not.toBeInTheDocument();
      });

      it("should still show 'Upcoming' tab in calendar mode", () => {
        render(<AssignmentsPage />);

        expect(
          screen.getByRole("tab", { name: /upcoming/i }),
        ).toBeInTheDocument();
      });
    });

    describe("Data Display", () => {
      it("should show loading state for calendar data", () => {
        vi.mocked(useConvocations.useCalendarAssignments).mockReturnValue(
          createMockCalendarQueryResult(undefined, true),
        );

        render(<AssignmentsPage />);

        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      });

      it("should show calendar assignments when data is available", () => {
        const calendarAssignment = createMockCalendarAssignment({
          homeTeam: "Calendar Team A",
          awayTeam: "Calendar Team B",
        });
        vi.mocked(useConvocations.useCalendarAssignments).mockReturnValue(
          createMockCalendarQueryResult([calendarAssignment]),
        );

        render(<AssignmentsPage />);

        expect(screen.getByText("Calendar Team A")).toBeInTheDocument();
        expect(screen.getByText("Calendar Team B")).toBeInTheDocument();
      });

      it("should display role badge from calendar data", () => {
        const calendarAssignment = createMockCalendarAssignment({
          roleRaw: "2. SR",
        });
        vi.mocked(useConvocations.useCalendarAssignments).mockReturnValue(
          createMockCalendarQueryResult([calendarAssignment]),
        );

        render(<AssignmentsPage />);

        expect(screen.getByText("2. SR")).toBeInTheDocument();
      });

      it("should display league from calendar data", () => {
        const calendarAssignment = createMockCalendarAssignment({
          league: "1. Liga Women",
        });
        vi.mocked(useConvocations.useCalendarAssignments).mockReturnValue(
          createMockCalendarQueryResult([calendarAssignment]),
        );

        render(<AssignmentsPage />);

        expect(screen.getByText("1. Liga Women")).toBeInTheDocument();
      });
    });

    describe("Empty States", () => {
      it("should show calendar-specific empty state when no calendar data", () => {
        vi.mocked(useConvocations.useCalendarAssignments).mockReturnValue(
          createMockCalendarQueryResult([]),
        );

        render(<AssignmentsPage />);

        // Should show calendar-specific empty message
        expect(
          screen.getByRole("heading", { name: /no.*calendar|calendar.*empty/i }),
        ).toBeInTheDocument();
      });

      it("should show calendar-specific no upcoming message", () => {
        // Return an empty array but with isSuccess true
        vi.mocked(useConvocations.useCalendarAssignments).mockReturnValue(
          createMockCalendarQueryResult([]),
        );

        render(<AssignmentsPage />);

        // Should find empty state heading
        const heading = screen.getByRole("heading");
        expect(heading).toBeInTheDocument();
      });
    });

    describe("Error Handling", () => {
      it("should show error state with retry button for calendar data", () => {
        const mockRefetch = vi.fn();
        vi.mocked(useConvocations.useCalendarAssignments).mockReturnValue({
          ...createMockCalendarQueryResult(
            undefined,
            false,
            new Error("Calendar fetch failed"),
          ),
          refetch: mockRefetch,
        } as unknown as ReturnType<
          typeof useConvocations.useCalendarAssignments
        >);

        render(<AssignmentsPage />);

        expect(screen.getByText(/calendar fetch failed/i)).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /retry/i }),
        ).toBeInTheDocument();
      });

      it("should call refetch when retry button is clicked for calendar error", () => {
        const mockRefetch = vi.fn();
        vi.mocked(useConvocations.useCalendarAssignments).mockReturnValue({
          ...createMockCalendarQueryResult(
            undefined,
            false,
            new Error("Failed"),
          ),
          refetch: mockRefetch,
        } as unknown as ReturnType<
          typeof useConvocations.useCalendarAssignments
        >);

        render(<AssignmentsPage />);
        fireEvent.click(screen.getByRole("button", { name: /retry/i }));

        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    describe("Read-Only Mode", () => {
      it("should not show swipe action buttons in calendar mode", () => {
        const calendarAssignment = createMockCalendarAssignment();
        vi.mocked(useConvocations.useCalendarAssignments).mockReturnValue(
          createMockCalendarQueryResult([calendarAssignment]),
        );

        render(<AssignmentsPage />);

        // Swipe actions (confirm, exchange, etc.) should not be visible
        expect(
          screen.queryByRole("button", { name: /confirm/i }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: /exchange/i }),
        ).not.toBeInTheDocument();
      });
    });

    describe("Multiple Assignments", () => {
      it("should display multiple calendar assignments", () => {
        const assignments = [
          createMockCalendarAssignment({
            gameId: "game-1",
            homeTeam: "Team Alpha",
            awayTeam: "Team Beta",
          }),
          createMockCalendarAssignment({
            gameId: "game-2",
            homeTeam: "Team Gamma",
            awayTeam: "Team Delta",
          }),
        ];
        vi.mocked(useConvocations.useCalendarAssignments).mockReturnValue(
          createMockCalendarQueryResult(assignments),
        );

        render(<AssignmentsPage />);

        expect(screen.getByText("Team Alpha")).toBeInTheDocument();
        expect(screen.getByText("Team Beta")).toBeInTheDocument();
        expect(screen.getByText("Team Gamma")).toBeInTheDocument();
        expect(screen.getByText("Team Delta")).toBeInTheDocument();
      });

      it("should show count badge for calendar assignments", () => {
        const assignments = [
          createMockCalendarAssignment({ gameId: "game-1" }),
          createMockCalendarAssignment({ gameId: "game-2" }),
          createMockCalendarAssignment({ gameId: "game-3" }),
        ];
        vi.mocked(useConvocations.useCalendarAssignments).mockReturnValue(
          createMockCalendarQueryResult(assignments),
        );

        render(<AssignmentsPage />);

        const upcomingTab = screen.getByRole("tab", { name: /upcoming/i });
        expect(upcomingTab).toHaveTextContent("3");
      });
    });

    describe("Date and Time Display", () => {
      it("should display time from calendar assignment", () => {
        // Create a specific future time for testing
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7); // 1 week from now
        futureDate.setHours(19, 30, 0, 0);
        const calendarAssignment = createMockCalendarAssignment({
          startTime: futureDate.toISOString(),
        });
        vi.mocked(useConvocations.useCalendarAssignments).mockReturnValue(
          createMockCalendarQueryResult([calendarAssignment]),
        );

        render(<AssignmentsPage />);

        // Time should be displayed (format may vary based on locale)
        expect(screen.getByText(/19:30/)).toBeInTheDocument();
      });

      it("should display address from calendar assignment", () => {
        const calendarAssignment = createMockCalendarAssignment({
          address: "Test Arena, Bern",
        });
        vi.mocked(useConvocations.useCalendarAssignments).mockReturnValue(
          createMockCalendarQueryResult([calendarAssignment]),
        );

        render(<AssignmentsPage />);

        expect(screen.getByText("Test Arena, Bern")).toBeInTheDocument();
      });
    });

    describe("API mode vs Calendar mode", () => {
      it("should use useCalendarAssignments when in calendar mode", () => {
        mockAuthStoreState({ isCalendarMode: () => true });
        const calendarAssignment = createMockCalendarAssignment();
        vi.mocked(useConvocations.useCalendarAssignments).mockReturnValue(
          createMockCalendarQueryResult([calendarAssignment]),
        );

        render(<AssignmentsPage />);

        // Should use calendar data
        expect(useConvocations.useCalendarAssignments).toHaveBeenCalled();
        expect(screen.getByText("VBC Zürich")).toBeInTheDocument();
      });

      it("should use useUpcomingAssignments when NOT in calendar mode", () => {
        mockAuthStoreState({ isCalendarMode: () => false });
        const apiAssignment = createMockAssignment();
        vi.mocked(useConvocations.useUpcomingAssignments).mockReturnValue(
          createMockQueryResult([apiAssignment]),
        );

        render(<AssignmentsPage />);

        // Should use API data
        expect(useConvocations.useUpcomingAssignments).toHaveBeenCalled();
        expect(screen.getByText("VBC Zürich")).toBeInTheDocument();
      });
    });
  });
});
