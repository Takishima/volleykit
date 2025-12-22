import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AssignmentsPage } from "./AssignmentsPage";
import type { Assignment } from "@/api/client";
import type { UseQueryResult } from "@tanstack/react-query";
import * as useConvocations from "@/hooks/useConvocations";

vi.mock("@/hooks/useConvocations");
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
  return {
    data,
    isLoading,
    isFetching: false,
    isError: !!error,
    error,
    isSuccess: !isLoading && !error && !!data,
    status: isLoading ? "pending" : error ? "error" : "success",
    refetch: vi.fn(),
  } as unknown as UseQueryResult<Assignment[], Error>;
}

describe("AssignmentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks - empty data
    vi.mocked(useConvocations.useUpcomingAssignments).mockReturnValue(
      createMockQueryResult([]),
    );
    vi.mocked(useConvocations.useValidationClosedAssignments).mockReturnValue(
      createMockQueryResult([]),
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
        screen.getByRole("button", { name: /try again/i }),
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
      expect(tabpanel).toHaveAttribute("id", "upcoming-tabpanel");
      expect(tabpanel).toHaveAttribute("aria-labelledby", "upcoming-tab");
    });

    it("should have proper tabpanel aria attributes for validation closed tab", () => {
      render(<AssignmentsPage />);
      fireEvent.click(screen.getByRole("tab", { name: /validation closed/i }));

      const tabpanel = screen.getByRole("tabpanel");
      expect(tabpanel).toHaveAttribute("id", "validation-closed-tabpanel");
      expect(tabpanel).toHaveAttribute(
        "aria-labelledby",
        "validation-closed-tab",
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
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));

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
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));

      expect(mockRefetch).toHaveBeenCalled();
    });
  });
});
