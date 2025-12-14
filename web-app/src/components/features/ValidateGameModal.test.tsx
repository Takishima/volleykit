import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ValidateGameModal } from "./ValidateGameModal";
import type { Assignment } from "@/api/client";
import * as useNominationListModule from "@/hooks/useNominationList";

vi.mock("@/hooks/useNominationList");

vi.mock("@/hooks/useScorerSearch", () => ({
  useScorerSearch: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
  })),
  parseSearchInput: vi.fn((input: string) => {
    if (!input.trim()) return {};
    return { lastName: input };
  }),
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn((selector) => selector({ isDemoMode: false })),
}));

function createMockAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    __identity: "assignment-1",
    refereePosition: "head-one",
    refereeGame: {
      game: {
        __identity: "game-1",
        startingDateTime: "2025-12-15T14:00:00Z",
        encounter: {
          teamHome: { name: "VBC Zürich" },
          teamAway: { name: "VBC Basel" },
        },
        hall: {
          name: "Sporthalle Zürich",
          primaryPostalAddress: {
            city: "Zürich",
          },
        },
      },
    },
    ...overrides,
  } as Assignment;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("ValidateGameModal", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  describe("rendering", () => {
    it("does not render when isOpen is false", () => {
      const { container } = render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={false}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() },
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders modal with correct title when open", () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() },
      );
      expect(screen.getByRole("dialog", { hidden: true })).toBeInTheDocument();
      expect(screen.getByText("Validate Game Details")).toBeInTheDocument();
    });

    it("displays team names", () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() },
      );
      expect(screen.getByText("VBC Zürich vs VBC Basel")).toBeInTheDocument();
    });

    it("renders all 4 tabs", () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() },
      );
      expect(
        screen.getByRole("tab", { name: /Home Roster/i, hidden: true }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /Away Roster/i, hidden: true }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /Scorer/i, hidden: true }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /Scoresheet/i, hidden: true }),
      ).toBeInTheDocument();
    });

    it("shows Optional badge only on Scoresheet tab", () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() },
      );
      const optionalBadges = screen.getAllByText("Optional");
      expect(optionalBadges).toHaveLength(1);

      const scoresheetTab = screen.getByRole("tab", {
        name: /Scoresheet/i,
        hidden: true,
      });
      expect(scoresheetTab).toContainElement(optionalBadges[0]!);
    });
  });

  describe("tab navigation", () => {
    it("shows Home Roster panel by default", () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() },
      );
      // Home Roster panel shows team name and empty roster message
      expect(screen.getByText("VBC Zürich")).toBeInTheDocument();
      expect(screen.getByText("No players in roster")).toBeInTheDocument();
    });

    it("switches to Away Roster panel when tab is clicked", () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() },
      );

      fireEvent.click(
        screen.getByRole("tab", { name: /Away Roster/i, hidden: true }),
      );

      // Away Roster panel shows team name
      expect(screen.getByText("VBC Basel")).toBeInTheDocument();
    });

    it("switches to Scorer panel when tab is clicked", () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() },
      );

      fireEvent.click(
        screen.getByRole("tab", { name: /Scorer/i, hidden: true }),
      );

      // ScorerPanel now shows search input and no-selection message
      expect(
        screen.getByPlaceholderText("Search scorer by name..."),
      ).toBeInTheDocument();
      expect(screen.getByText(/No scorer selected/)).toBeInTheDocument();
    });

    it("switches to Scoresheet panel when tab is clicked", () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() },
      );

      fireEvent.click(
        screen.getByRole("tab", { name: /Scoresheet/i, hidden: true }),
      );

      expect(screen.getByText("Upload Scoresheet")).toBeInTheDocument();
    });

    it("navigates tabs with arrow keys", () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() },
      );

      const homeRosterTab = screen.getByRole("tab", {
        name: /Home Roster/i,
        hidden: true,
      });
      fireEvent.keyDown(homeRosterTab, { key: "ArrowRight" });

      // Away Roster panel shows team name
      expect(screen.getByText("VBC Basel")).toBeInTheDocument();
    });
  });

  describe("modal interactions", () => {
    it("calls onClose when Cancel button is clicked (no unsaved changes)", () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() },
      );

      fireEvent.click(
        screen.getByRole("button", { name: /Cancel/i, hidden: true }),
      );
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when Escape key is pressed (no unsaved changes)", () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() },
      );

      fireEvent.keyDown(document, { key: "Escape" });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("closes when clicking backdrop (no unsaved changes)", () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() },
      );

      // Click on backdrop (parent of dialog)
      const backdrop = screen.getByRole("dialog", {
        hidden: true,
      }).parentElement;
      fireEvent.click(backdrop!);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("does not close when clicking inside the modal", () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() },
      );

      const dialog = screen.getByRole("dialog", { hidden: true });
      fireEvent.click(dialog);
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("resets to first tab when modal is reopened with new key", () => {
      const assignment = createMockAssignment();
      const Wrapper = createWrapper();
      const { rerender } = render(
        <Wrapper>
          <ValidateGameModal
            key={assignment.__identity}
            assignment={assignment}
            isOpen={true}
            onClose={mockOnClose}
          />
        </Wrapper>,
      );

      // Switch to Scoresheet tab
      fireEvent.click(
        screen.getByRole("tab", { name: /Scoresheet/i, hidden: true }),
      );
      expect(screen.getByText("Upload Scoresheet")).toBeInTheDocument();

      // Reopen modal with new key (simulates opening for different assignment)
      const newAssignment = createMockAssignment({ __identity: "new-id" });
      rerender(
        <Wrapper>
          <ValidateGameModal
            key={newAssignment.__identity}
            assignment={newAssignment}
            isOpen={true}
            onClose={mockOnClose}
          />
        </Wrapper>,
      );

      // Should be back to Home Roster (component remounted due to key change)
      expect(screen.getByText("VBC Zürich")).toBeInTheDocument();
      expect(screen.getByText("No players in roster")).toBeInTheDocument();
    });
  });
});
