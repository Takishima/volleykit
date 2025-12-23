import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CompensationsPage } from "./CompensationsPage";
import type { CompensationRecord } from "@/api/client";
import type { UseQueryResult } from "@tanstack/react-query";
import * as useConvocations from "@/hooks/useConvocations";

vi.mock("@/hooks/useConvocations");
vi.mock("@/hooks/useCompensationActions", () => ({
  useCompensationActions: () => ({
    editCompensationModal: {
      isOpen: false,
      compensation: null,
      open: vi.fn(),
      close: vi.fn(),
    },
    handleGeneratePDF: vi.fn(),
  }),
}));

function createMockCompensation(
  overrides: Partial<CompensationRecord> = {},
): CompensationRecord {
  return {
    __identity: `compensation-${Math.random()}`,
    refereeConvocationStatus: "active",
    refereePosition: "head-one",
    refereeGame: {
      game: {
        startingDateTime: "2025-12-15T18:00:00Z",
        encounter: {
          teamHome: { name: "Team A" },
          teamAway: { name: "Team B" },
        },
        hall: { name: "Main Arena" },
      },
    },
    convocationCompensation: {
      paymentDone: false,
      gameCompensation: 100,
      travelExpenses: 50,
      costFormatted: "CHF 150.00",
    },
    ...overrides,
  } as CompensationRecord;
}

function createMockQueryResult(
  data: CompensationRecord[] | undefined,
  isLoading = false,
  error: Error | null = null,
): UseQueryResult<CompensationRecord[], Error> {
  return {
    data,
    isLoading,
    isFetching: false,
    isError: !!error,
    error,
    isSuccess: !isLoading && !error && !!data,
    status: isLoading ? "pending" : error ? "error" : "success",
    refetch: vi.fn(),
  } as unknown as UseQueryResult<CompensationRecord[], Error>;
}

describe("CompensationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks - single useCompensations hook with dynamic filter
    vi.mocked(useConvocations.useCompensations).mockReturnValue(
      createMockQueryResult([]),
    );
    vi.mocked(useConvocations.useCompensationTotals).mockReturnValue({
      paid: 0,
      unpaid: 0,
    });
  });

  describe("Tab Navigation", () => {
    it("should default to Pending tab", () => {
      render(<CompensationsPage />);

      const pendingTab = screen.getByRole("tab", { name: /pending/i });
      expect(pendingTab).toHaveClass("border-primary-500");
      expect(pendingTab).toHaveAttribute("aria-selected", "true");
    });

    it("should switch to All tab when clicked", () => {
      render(<CompensationsPage />);

      fireEvent.click(screen.getByRole("tab", { name: /^all$/i }));

      const allTab = screen.getByRole("tab", { name: /^all$/i });
      expect(allTab).toHaveClass("border-primary-500");
      expect(allTab).toHaveAttribute("aria-selected", "true");
    });

    it("should switch to Paid tab when clicked", () => {
      render(<CompensationsPage />);

      fireEvent.click(screen.getByRole("tab", { name: /^paid$/i }));

      const paidTab = screen.getByRole("tab", { name: /^paid$/i });
      expect(paidTab).toHaveClass("border-primary-500");
      expect(paidTab).toHaveAttribute("aria-selected", "true");
    });

    it("should have proper ARIA attributes on tablist", () => {
      render(<CompensationsPage />);

      const tablist = screen.getByRole("tablist");
      expect(tablist).toHaveAttribute("aria-label");
    });

    it("should support keyboard navigation with arrow keys", () => {
      render(<CompensationsPage />);

      const pendingTab = screen.getByRole("tab", { name: /pending/i });
      pendingTab.focus();

      // Press right arrow to go to Paid tab
      fireEvent.keyDown(pendingTab, { key: "ArrowRight" });

      const paidTab = screen.getByRole("tab", { name: /^paid$/i });
      expect(paidTab).toHaveAttribute("aria-selected", "true");

      // Press right arrow to go to All tab
      fireEvent.keyDown(paidTab, { key: "ArrowRight" });

      const allTab = screen.getByRole("tab", { name: /^all$/i });
      expect(allTab).toHaveAttribute("aria-selected", "true");

      // Press left arrow to go back to Paid tab
      fireEvent.keyDown(allTab, { key: "ArrowLeft" });
      expect(paidTab).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("Content Display", () => {
    it("should show loading state", () => {
      vi.mocked(useConvocations.useCompensations).mockReturnValue(
        createMockQueryResult(undefined, true),
      );

      render(<CompensationsPage />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it("should show error state with retry button", () => {
      vi.mocked(useConvocations.useCompensations).mockReturnValue(
        createMockQueryResult(undefined, false, new Error("Failed to load")),
      );

      render(<CompensationsPage />);

      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /retry/i }),
      ).toBeInTheDocument();
    });

    it("should show empty state when no compensations", () => {
      vi.mocked(useConvocations.useCompensations).mockReturnValue(
        createMockQueryResult([]),
      );

      render(<CompensationsPage />);

      // Default tab is now Pending, so the empty state is for pending compensations
      expect(
        screen.getByRole("heading", { name: /no pending compensations/i }),
      ).toBeInTheDocument();
    });

    it("should show compensations when data is available", () => {
      const compensation = createMockCompensation();
      vi.mocked(useConvocations.useCompensations).mockReturnValue(
        createMockQueryResult([compensation]),
      );

      render(<CompensationsPage />);

      expect(screen.getByText(/Team A vs Team B/i)).toBeInTheDocument();
    });
  });

  describe("Totals Summary", () => {
    it("should display pending and received totals", () => {
      vi.mocked(useConvocations.useCompensationTotals).mockReturnValue({
        paid: 250.5,
        unpaid: 150.0,
      });

      render(<CompensationsPage />);

      expect(screen.getByText("CHF 150.00")).toBeInTheDocument();
      expect(screen.getByText("CHF 250.50")).toBeInTheDocument();
    });
  });

  describe("Data Fetching", () => {
    it("should call useCompensations with false for Pending tab (default)", () => {
      render(<CompensationsPage />);

      expect(useConvocations.useCompensations).toHaveBeenCalledWith(false);
    });

    it("should call useCompensations with undefined for All tab", () => {
      render(<CompensationsPage />);

      fireEvent.click(screen.getByRole("tab", { name: /^all$/i }));

      expect(useConvocations.useCompensations).toHaveBeenCalledWith(undefined);
    });

    it("should call useCompensations with true for Paid tab", () => {
      render(<CompensationsPage />);

      fireEvent.click(screen.getByRole("tab", { name: /^paid$/i }));

      expect(useConvocations.useCompensations).toHaveBeenCalledWith(true);
    });
  });
});
