import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AssignmentsPage } from "./AssignmentsPage";
import type { Assignment } from "@/api/client";
import type { UseQueryResult } from "@tanstack/react-query";
import * as useConvocations from "@/features/validation/hooks/useConvocations";
import * as authStore from "@/shared/stores/auth";

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

vi.mock("@/features/validation/hooks/useConvocations");
vi.mock("@/shared/hooks/useTour", () => mockUseTour);
vi.mock("@/shared/stores/auth");
vi.mock("@/shared/hooks/useTranslation", () => ({
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
        "assignments.active": "Active",
        "common.today": "Today",
        "common.tomorrow": "Tomorrow",
        "common.vs": "vs",
        "common.unknown": "Unknown",
        "common.retry": "Retry",
        "common.men": "Men",
        "common.women": "Women",
        "positions.head-one": "1st Referee",
        "positions.head-two": "2nd Referee",
        "occupations.linesmen": "Linesmen",
      };
      return translations[key] ?? key;
    },
    tInterpolate: (key: string) => {
      // Return the key for testing - params would be substituted in real use
      return key;
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
vi.mock("@/shared/hooks/useAssignmentActions", () => ({
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
    // Named constants for time offsets in hours
    const DEFAULT_HOURS_FROM_NOW = 24;
    const GAME_START_HOURS_FROM_NOW = 48;
    const GAME_END_HOURS_FROM_NOW = 50;

    function getFutureDateString(hoursFromNow = DEFAULT_HOURS_FROM_NOW): string {
      const date = new Date();
      date.setHours(date.getHours() + hoursFromNow);
      return date.toISOString();
    }

    function createMockCalendarAssignment(
      overrides: Partial<useConvocations.CalendarAssignment> = {},
    ): useConvocations.CalendarAssignment {
      const startTime = getFutureDateString(GAME_START_HOURS_FROM_NOW);
      const endTime = getFutureDateString(GAME_END_HOURS_FROM_NOW);
      return {
        gameId: `game-${Math.random()}`,
        gameNumber: 392936,
        role: "referee1",
        roleRaw: "ARB 1",
        startTime,
        endTime,
        homeTeam: "VBC Zürich",
        awayTeam: "VBC Basel",
        league: "NLA Men",
        leagueCategory: "NLA",
        address: "Saalsporthalle, 8000 Zürich",
        coordinates: { latitude: 47.3769, longitude: 8.5417 },
        hallName: "Saalsporthalle",
        hallId: "3661",
        gender: "men",
        mapsUrl: "https://maps.google.com/?q=47.3769,8.5417",
        plusCode: null,
        referees: {
          referee1: "Max Mustermann",
          referee2: "Anna Schmidt",
        },
        association: null,
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

        // Home team is shown directly
        expect(screen.getByText("Calendar Team A")).toBeInTheDocument();
        // Away team is prefixed with "vs" in AssignmentCard
        expect(screen.getByText(/vs.*Calendar Team B/)).toBeInTheDocument();
      });

      it("should display position from calendar data", () => {
        const calendarAssignment = createMockCalendarAssignment({
          role: "referee2",
        });
        vi.mocked(useConvocations.useCalendarAssignments).mockReturnValue(
          createMockCalendarQueryResult([calendarAssignment]),
        );

        render(<AssignmentsPage />);

        // AssignmentCard shows translated position - role "referee2" maps to "head-two"
        // which is translated to "2nd Referee" by our mock
        expect(screen.getByText("2nd Referee")).toBeInTheDocument();
      });

      it("should display league category from calendar data", () => {
        const calendarAssignment = createMockCalendarAssignment({
          leagueCategory: "NLB",
        });
        vi.mocked(useConvocations.useCalendarAssignments).mockReturnValue(
          createMockCalendarQueryResult([calendarAssignment]),
        );

        render(<AssignmentsPage />);

        // AssignmentCard shows leagueCategory name - may appear in multiple places
        // (badge and league line), so we use getAllByText
        const nlbElements = screen.getAllByText(/NLB/);
        expect(nlbElements.length).toBeGreaterThan(0);
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
      it("should not show exchange swipe action in calendar mode", () => {
        // Use a non-NLA assignment to avoid report action
        const calendarAssignment = createMockCalendarAssignment({
          leagueCategory: "3L",
        });
        vi.mocked(useConvocations.useCalendarAssignments).mockReturnValue(
          createMockCalendarQueryResult([calendarAssignment]),
        );

        render(<AssignmentsPage />);

        // Exchange action should not be visible in calendar mode
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

        // Home teams are shown directly
        expect(screen.getByText("Team Alpha")).toBeInTheDocument();
        expect(screen.getByText("Team Gamma")).toBeInTheDocument();
        // Away teams are prefixed with "vs" in AssignmentCard
        expect(screen.getByText(/vs.*Team Beta/)).toBeInTheDocument();
        expect(screen.getByText(/vs.*Team Delta/)).toBeInTheDocument();
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

      it("should display city from calendar assignment address", () => {
        const calendarAssignment = createMockCalendarAssignment({
          address: "Sporthalle, 3000 Bern",
        });
        vi.mocked(useConvocations.useCalendarAssignments).mockReturnValue(
          createMockCalendarQueryResult([calendarAssignment]),
        );

        render(<AssignmentsPage />);

        // AssignmentCard shows city extracted from address in compact view
        expect(screen.getAllByText(/Bern/).length).toBeGreaterThan(0);
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
