import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExchangeConfirmationModal } from "./ExchangeConfirmationModal";
import type { GameExchange } from "@/api/client";

const MOCK_ASYNC_DELAY_MS = 100;

function createMockExchange(
  overrides: Partial<GameExchange> = {},
): GameExchange {
  return {
    __identity: "exchange-1",
    refereePosition: "head-one",
    requiredRefereeLevel: "N2",
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
  } as GameExchange;
}

describe("ExchangeConfirmationModal", () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnConfirm.mockClear();
  });

  describe("rendering", () => {
    it("does not render when isOpen is false", () => {
      const { container } = render(
        <ExchangeConfirmationModal
          exchange={createMockExchange()}
          isOpen={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          variant="takeOver"
        />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders take over modal with correct title", () => {
      render(
        <ExchangeConfirmationModal
          exchange={createMockExchange()}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          variant="takeOver"
        />,
      );
      expect(screen.getByRole("dialog", { hidden: true })).toBeInTheDocument();
      expect(screen.getByText("Take Over Assignment")).toBeInTheDocument();
    });

    it("renders remove modal with correct title", () => {
      render(
        <ExchangeConfirmationModal
          exchange={createMockExchange()}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          variant="remove"
        />,
      );
      expect(
        screen.getByRole("heading", {
          name: "Remove from Exchange",
          hidden: true,
        }),
      ).toBeInTheDocument();
    });

    it("renders game details", () => {
      render(
        <ExchangeConfirmationModal
          exchange={createMockExchange()}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          variant="takeOver"
        />,
      );
      expect(screen.getByText(/VBC Zürich vs VBC Basel/)).toBeInTheDocument();
      expect(screen.getByText("Sporthalle Zürich")).toBeInTheDocument();
      expect(screen.getByText("head-one")).toBeInTheDocument();
      expect(screen.getByText("N2")).toBeInTheDocument();
    });

    it("handles missing optional data gracefully", () => {
      const exchange = createMockExchange({
        refereeGame: {
          game: {
            __identity: "game-1",
            encounter: {
              teamHome: { name: "Team A" },
              teamAway: { name: "Team B" },
            },
          },
        },
      });
      render(
        <ExchangeConfirmationModal
          exchange={exchange}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          variant="takeOver"
        />,
      );
      expect(screen.getByText(/Team A vs Team B/)).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("calls onClose when cancel button is clicked", () => {
      render(
        <ExchangeConfirmationModal
          exchange={createMockExchange()}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          variant="takeOver"
        />,
      );
      fireEvent.click(screen.getByText("Cancel"));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onConfirm and onClose when confirm button is clicked", async () => {
      mockOnConfirm.mockResolvedValue(undefined);
      render(
        <ExchangeConfirmationModal
          exchange={createMockExchange()}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          variant="takeOver"
        />,
      );
      fireEvent.click(screen.getByText("Confirm Take Over"));
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it("calls onClose when backdrop is clicked", () => {
      const { container } = render(
        <ExchangeConfirmationModal
          exchange={createMockExchange()}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          variant="takeOver"
        />,
      );
      const backdrop = container.firstChild as HTMLElement;
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("does not close when clicking inside modal", () => {
      render(
        <ExchangeConfirmationModal
          exchange={createMockExchange()}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          variant="takeOver"
        />,
      );
      fireEvent.click(screen.getByRole("dialog", { hidden: true }));
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("closes on Escape key press", () => {
      render(
        <ExchangeConfirmationModal
          exchange={createMockExchange()}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          variant="takeOver"
        />,
      );
      fireEvent.keyDown(document, { key: "Escape" });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("prevents duplicate submissions (race condition)", async () => {
      mockOnConfirm.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(resolve, MOCK_ASYNC_DELAY_MS)),
      );
      render(
        <ExchangeConfirmationModal
          exchange={createMockExchange()}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          variant="takeOver"
        />,
      );
      const confirmButton = screen.getByText("Confirm Take Over");

      // Rapidly click confirm button multiple times
      fireEvent.click(confirmButton);
      fireEvent.click(confirmButton);
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it("shows loading state during async operation", async () => {
      mockOnConfirm.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(resolve, MOCK_ASYNC_DELAY_MS)),
      );
      render(
        <ExchangeConfirmationModal
          exchange={createMockExchange()}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          variant="takeOver"
        />,
      );
      const confirmButton = screen.getByText("Confirm Take Over");
      fireEvent.click(confirmButton);

      // Check for loading state using button's text content
      await waitFor(() => {
        expect(confirmButton).toHaveTextContent(/loading/i);
        expect(confirmButton).toBeDisabled();
      });
    });

    it("does not close modal on error", async () => {
      mockOnConfirm.mockRejectedValue(new Error("Test error"));
      render(
        <ExchangeConfirmationModal
          exchange={createMockExchange()}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          variant="takeOver"
        />,
      );
      fireEvent.click(screen.getByText("Confirm Take Over"));

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });

      // Modal should not close on error
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog", { hidden: true })).toBeInTheDocument();
    });

    it("allows retry after error (isSubmittingRef is properly reset)", async () => {
      mockOnConfirm
        .mockRejectedValueOnce(new Error("First attempt failed"))
        .mockResolvedValueOnce(undefined);
      render(
        <ExchangeConfirmationModal
          exchange={createMockExchange()}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          variant="takeOver"
        />,
      );

      const confirmButton = screen.getByText("Confirm Take Over");

      // First attempt fails
      fireEvent.click(confirmButton);
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });
      expect(mockOnClose).not.toHaveBeenCalled();

      // Button should be enabled again for retry
      await waitFor(() => {
        expect(confirmButton).not.toBeDisabled();
      });

      // Second attempt succeeds
      fireEvent.click(confirmButton);
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(2);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it("handles unmount during async operation gracefully", async () => {
      let resolveConfirm: () => void;
      mockOnConfirm.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveConfirm = resolve;
          }),
      );

      const { unmount } = render(
        <ExchangeConfirmationModal
          exchange={createMockExchange()}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          variant="takeOver"
        />,
      );

      const confirmButton = screen.getByText("Confirm Take Over");
      fireEvent.click(confirmButton);

      // Unmount while async operation is in progress
      unmount();

      // Resolve the promise after unmount - should not cause errors
      resolveConfirm!();

      // onClose should not be called since component unmounted
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("handles unmount during async error gracefully", async () => {
      let rejectConfirm: (error: Error) => void;
      mockOnConfirm.mockImplementation(
        () =>
          new Promise<void>((_, reject) => {
            rejectConfirm = reject;
          }),
      );

      const { unmount } = render(
        <ExchangeConfirmationModal
          exchange={createMockExchange()}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          variant="takeOver"
        />,
      );

      const confirmButton = screen.getByText("Confirm Take Over");
      fireEvent.click(confirmButton);

      // Unmount while async operation is in progress
      unmount();

      // Reject the promise after unmount - should not cause errors
      rejectConfirm!(new Error("Test error after unmount"));

      // onClose should not be called since component unmounted
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("has proper ARIA attributes", () => {
      render(
        <ExchangeConfirmationModal
          exchange={createMockExchange()}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          variant="takeOver"
        />,
      );
      const dialog = screen.getByRole("dialog", { hidden: true });
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute(
        "aria-labelledby",
        "takeOver-exchange-title",
      );
    });

    it("sets aria-busy during async operation", async () => {
      mockOnConfirm.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(resolve, MOCK_ASYNC_DELAY_MS)),
      );
      render(
        <ExchangeConfirmationModal
          exchange={createMockExchange()}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          variant="takeOver"
        />,
      );
      const confirmButton = screen.getByText("Confirm Take Over");

      // Initially not busy
      expect(confirmButton).toHaveAttribute("aria-busy", "false");

      // Click and check aria-busy is true
      fireEvent.click(confirmButton);
      expect(confirmButton).toHaveAttribute("aria-busy", "true");
    });

    it("uses correct button colors for take over variant", () => {
      render(
        <ExchangeConfirmationModal
          exchange={createMockExchange()}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          variant="takeOver"
        />,
      );
      const confirmButton = screen.getByText("Confirm Take Over");
      expect(confirmButton).toHaveClass("bg-green-600");
    });

    it("uses correct button colors for remove variant", () => {
      render(
        <ExchangeConfirmationModal
          exchange={createMockExchange()}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          variant="remove"
        />,
      );
      const confirmButton = screen.getByRole("button", {
        name: "Remove from Exchange",
        hidden: true,
      });
      expect(confirmButton).toHaveClass("bg-red-600");
    });
  });
});
