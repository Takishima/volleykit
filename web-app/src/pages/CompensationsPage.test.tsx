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

    // Default mocks
    vi.mocked(useConvocations.useCompensations).mockReturnValue(
      createMockQueryResult([]),
    );
    vi.mocked(useConvocations.usePaidCompensations).mockReturnValue(
      createMockQueryResult([]),
    );
    vi.mocked(useConvocations.useUnpaidCompensations).mockReturnValue(
      createMockQueryResult([]),
    );
    vi.mocked(useConvocations.useCompensationTotals).mockReturnValue({
      paid: 0,
      unpaid: 0,
    });
  });

  describe("Tab Navigation", () => {
    it("should default to All tab", () => {
      render(<CompensationsPage />);

      const allTab = screen.getByRole("tab", { name: /^all$/i });
      expect(allTab).toHaveClass("border-orange-500");
      expect(allTab).toHaveAttribute("aria-selected", "true");
    });

    it("should switch to Pending tab when clicked", () => {
      render(<CompensationsPage />);

      fireEvent.click(screen.getByRole("tab", { name: /pending/i }));

      const pendingTab = screen.getByRole("tab", { name: /pending/i });
      expect(pendingTab).toHaveClass("border-orange-500");
      expect(pendingTab).toHaveAttribute("aria-selected", "true");
    });

    it("should switch to Paid tab when clicked", () => {
      render(<CompensationsPage />);

      fireEvent.click(screen.getByRole("tab", { name: /^paid$/i }));

      const paidTab = screen.getByRole("tab", { name: /^paid$/i });
      expect(paidTab).toHaveClass("border-orange-500");
      expect(paidTab).toHaveAttribute("aria-selected", "true");
    });

    it("should have proper ARIA attributes on tablist", () => {
      render(<CompensationsPage />);

      const tablist = screen.getByRole("tablist");
      expect(tablist).toHaveAttribute("aria-label");
    });

    it("should support keyboard navigation with arrow keys", () => {
      render(<CompensationsPage />);

      const allTab = screen.getByRole("tab", { name: /^all$/i });
      allTab.focus();

      // Press right arrow to go to Pending tab
      fireEvent.keyDown(allTab, { key: "ArrowRight" });

      const pendingTab = screen.getByRole("tab", { name: /pending/i });
      expect(pendingTab).toHaveAttribute("aria-selected", "true");

      // Press right arrow to go to Paid tab
      fireEvent.keyDown(pendingTab, { key: "ArrowRight" });

      const paidTab = screen.getByRole("tab", { name: /^paid$/i });
      expect(paidTab).toHaveAttribute("aria-selected", "true");

      // Press left arrow to go back to Pending tab
      fireEvent.keyDown(paidTab, { key: "ArrowLeft" });
      expect(pendingTab).toHaveAttribute("aria-selected", "true");
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
        screen.getByRole("button", { name: /try again/i }),
      ).toBeInTheDocument();
    });

    it("should show empty state when no compensations", () => {
      vi.mocked(useConvocations.useCompensations).mockReturnValue(
        createMockQueryResult([]),
      );

      render(<CompensationsPage />);

      expect(screen.getByText(/no compensations/i)).toBeInTheDocument();
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
});
