import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorFallbackUI } from "./ErrorFallbackUI";

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, "location", {
  value: { reload: mockReload },
  writable: true,
});

describe("ErrorFallbackUI", () => {
  const mockOnReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("network error state", () => {
    it("renders network error title", () => {
      render(
        <ErrorFallbackUI
          error={null}
          errorType="network"
          onReset={mockOnReset}
        />,
      );

      expect(screen.getByText("Connection Problem")).toBeInTheDocument();
    });

    it("renders network error description", () => {
      render(
        <ErrorFallbackUI
          error={null}
          errorType="network"
          onReset={mockOnReset}
        />,
      );

      expect(
        screen.getByText(
          "Unable to connect to the server. Please check your internet connection and try again.",
        ),
      ).toBeInTheDocument();
    });

    it("renders network icon with aria-hidden", () => {
      const { container } = render(
        <ErrorFallbackUI
          error={null}
          errorType="network"
          onReset={mockOnReset}
        />,
      );

      const iconContainer = container.querySelector('[aria-hidden="true"]');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer?.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("application error state", () => {
    it("renders application error title", () => {
      render(
        <ErrorFallbackUI
          error={null}
          errorType="application"
          onReset={mockOnReset}
        />,
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("renders application error description", () => {
      render(
        <ErrorFallbackUI
          error={null}
          errorType="application"
          onReset={mockOnReset}
        />,
      );

      expect(
        screen.getByText(
          "An unexpected error occurred. Please try refreshing the page.",
        ),
      ).toBeInTheDocument();
    });

    it("renders warning icon with aria-hidden", () => {
      const { container } = render(
        <ErrorFallbackUI
          error={null}
          errorType="application"
          onReset={mockOnReset}
        />,
      );

      const iconContainer = container.querySelector('[aria-hidden="true"]');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer?.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("error details", () => {
    it("does not render error details when error is null", () => {
      render(
        <ErrorFallbackUI
          error={null}
          errorType="application"
          onReset={mockOnReset}
        />,
      );

      expect(screen.queryByText("Error details")).not.toBeInTheDocument();
    });

    it("renders error details when error is provided", () => {
      const testError = new Error("Test error message");

      render(
        <ErrorFallbackUI
          error={testError}
          errorType="application"
          onReset={mockOnReset}
        />,
      );

      expect(screen.getByText("Error details")).toBeInTheDocument();
      expect(screen.getByText("Test error message")).toBeInTheDocument();
    });

    it("renders error details in a collapsible details element", () => {
      const testError = new Error("Test error message");

      render(
        <ErrorFallbackUI
          error={testError}
          errorType="application"
          onReset={mockOnReset}
        />,
      );

      const details = screen.getByText("Error details").closest("details");
      expect(details).toBeInTheDocument();
    });
  });

  describe("action buttons", () => {
    it("renders Try Again button", () => {
      render(
        <ErrorFallbackUI
          error={null}
          errorType="application"
          onReset={mockOnReset}
        />,
      );

      expect(
        screen.getByRole("button", { name: "Try Again" }),
      ).toBeInTheDocument();
    });

    it("renders Refresh Page button", () => {
      render(
        <ErrorFallbackUI
          error={null}
          errorType="application"
          onReset={mockOnReset}
        />,
      );

      expect(
        screen.getByRole("button", { name: "Refresh Page" }),
      ).toBeInTheDocument();
    });

    it("calls onReset when Try Again is clicked", () => {
      render(
        <ErrorFallbackUI
          error={null}
          errorType="application"
          onReset={mockOnReset}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Try Again" }));

      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });

    it("calls window.location.reload when Refresh Page is clicked", () => {
      render(
        <ErrorFallbackUI
          error={null}
          errorType="application"
          onReset={mockOnReset}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Refresh Page" }));

      expect(mockReload).toHaveBeenCalledTimes(1);
    });
  });

  describe("styling", () => {
    it("has full screen centered layout", () => {
      const { container } = render(
        <ErrorFallbackUI
          error={null}
          errorType="application"
          onReset={mockOnReset}
        />,
      );

      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv).toHaveClass("min-h-screen");
      expect(outerDiv).toHaveClass("flex");
      expect(outerDiv).toHaveClass("items-center");
      expect(outerDiv).toHaveClass("justify-center");
    });

    it("has card container with shadow", () => {
      const { container } = render(
        <ErrorFallbackUI
          error={null}
          errorType="application"
          onReset={mockOnReset}
        />,
      );

      const card = container.querySelector(".shadow-lg");
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass("rounded-xl");
    });
  });
});
