import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ValidateGameModal } from "./ValidateGameModal";
import type { Assignment } from "@/api/client";

function createMockAssignment(
  overrides: Partial<Assignment> = {},
): Assignment {
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

describe("ValidateGameModal", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  describe("rendering", () => {
    it("does not render when isOpen is false", () => {
      const { container } = render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={false}
          onClose={mockOnClose}
        />,
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
      );
      expect(
        screen.getByText("Home team roster verification will be available here."),
      ).toBeInTheDocument();
    });

    it("switches to Away Roster panel when tab is clicked", () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      fireEvent.click(
        screen.getByRole("tab", { name: /Away Roster/i, hidden: true }),
      );

      expect(
        screen.getByText("Away team roster verification will be available here."),
      ).toBeInTheDocument();
    });

    it("switches to Scorer panel when tab is clicked", () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      fireEvent.click(
        screen.getByRole("tab", { name: /Scorer/i, hidden: true }),
      );

      expect(
        screen.getByText("Scorer identification will be available here."),
      ).toBeInTheDocument();
    });

    it("switches to Scoresheet panel when tab is clicked", () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      fireEvent.click(
        screen.getByRole("tab", { name: /Scoresheet/i, hidden: true }),
      );

      expect(
        screen.getByText("Scoresheet upload will be available here."),
      ).toBeInTheDocument();
    });

    it("navigates tabs with arrow keys", () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      const homeRosterTab = screen.getByRole("tab", {
        name: /Home Roster/i,
        hidden: true,
      });
      fireEvent.keyDown(homeRosterTab, { key: "ArrowRight" });

      expect(
        screen.getByText("Away team roster verification will be available here."),
      ).toBeInTheDocument();
    });
  });

  describe("modal interactions", () => {
    it("calls onClose when Close button is clicked", () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: /Close/i, hidden: true }),
      );
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when Escape key is pressed", () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      fireEvent.keyDown(document, { key: "Escape" });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when backdrop is clicked", () => {
      render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      const backdrop = screen.getByRole("dialog", { hidden: true }).parentElement;
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
      );

      const dialog = screen.getByRole("dialog", { hidden: true });
      fireEvent.click(dialog);
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("resets to first tab when modal is reopened", () => {
      const { rerender } = render(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      // Switch to Scoresheet tab
      fireEvent.click(
        screen.getByRole("tab", { name: /Scoresheet/i, hidden: true }),
      );
      expect(
        screen.getByText("Scoresheet upload will be available here."),
      ).toBeInTheDocument();

      // Close modal
      rerender(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={false}
          onClose={mockOnClose}
        />,
      );

      // Reopen modal
      rerender(
        <ValidateGameModal
          assignment={createMockAssignment()}
          isOpen={true}
          onClose={mockOnClose}
        />,
      );

      // Should be back to Home Roster
      expect(
        screen.getByText("Home team roster verification will be available here."),
      ).toBeInTheDocument();
    });
  });
});
