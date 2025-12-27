import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExchangeFilters } from "./ExchangeFilters";

describe("ExchangeFilters", () => {
  describe("rendering", () => {
    it("renders nothing when no filters are provided", () => {
      const { container } = render(<ExchangeFilters filters={{}} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders filters button when at least one filter is available", () => {
      render(
        <ExchangeFilters
          filters={{
            level: { enabled: false, userLevel: "N2", onToggle: vi.fn() },
          }}
        />,
      );

      expect(
        screen.getByRole("button", { name: /filters/i }),
      ).toBeInTheDocument();
    });

    it("shows active count badge when filters are enabled", () => {
      render(
        <ExchangeFilters
          filters={{
            level: { enabled: true, userLevel: "N2", onToggle: vi.fn() },
            distance: { enabled: true, maxDistanceKm: 50, onToggle: vi.fn() },
          }}
        />,
      );

      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("does not show badge when no filters are enabled", () => {
      render(
        <ExchangeFilters
          filters={{
            level: { enabled: false, userLevel: "N2", onToggle: vi.fn() },
          }}
        />,
      );

      expect(screen.queryByText("0")).not.toBeInTheDocument();
    });
  });

  describe("filter sheet", () => {
    it("opens sheet when button is clicked", () => {
      render(
        <ExchangeFilters
          filters={{
            level: { enabled: false, userLevel: "N2", onToggle: vi.fn() },
          }}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /filters/i }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Filters")).toBeInTheDocument();
    });

    it("shows level filter in sheet when available", () => {
      render(
        <ExchangeFilters
          filters={{
            level: { enabled: false, userLevel: "N2", onToggle: vi.fn() },
          }}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /filters/i }));

      expect(
        screen.getByRole("switch", { name: /level/i }),
      ).toBeInTheDocument();
    });

    it("shows distance filter in sheet when available", () => {
      render(
        <ExchangeFilters
          filters={{
            distance: { enabled: false, maxDistanceKm: 50, onToggle: vi.fn() },
          }}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /filters/i }));

      expect(
        screen.getByRole("switch", { name: /distance/i }),
      ).toBeInTheDocument();
    });

    it("shows travel time filter in sheet when available", () => {
      render(
        <ExchangeFilters
          filters={{
            travelTime: {
              enabled: false,
              maxTravelTimeMinutes: 60,
              onToggle: vi.fn(),
            },
          }}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /filters/i }));

      expect(
        screen.getByRole("switch", { name: /travel/i }),
      ).toBeInTheDocument();
    });

    it("closes sheet when close button is clicked", () => {
      render(
        <ExchangeFilters
          filters={{
            level: { enabled: false, userLevel: "N2", onToggle: vi.fn() },
          }}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /filters/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /close/i }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("filter interactions", () => {
    it("calls onToggle when level filter is clicked", () => {
      const onToggle = vi.fn();
      render(
        <ExchangeFilters
          filters={{
            level: { enabled: false, userLevel: "N2", onToggle },
          }}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /filters/i }));
      fireEvent.click(screen.getByRole("switch", { name: /level/i }));

      expect(onToggle).toHaveBeenCalledOnce();
    });

    it("shows active value for enabled level filter", () => {
      render(
        <ExchangeFilters
          filters={{
            level: { enabled: true, userLevel: "N2", onToggle: vi.fn() },
          }}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /filters/i }));

      expect(screen.getByText("N2+")).toBeInTheDocument();
    });

    it("shows active value for enabled distance filter", () => {
      render(
        <ExchangeFilters
          filters={{
            distance: { enabled: true, maxDistanceKm: 50, onToggle: vi.fn() },
          }}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /filters/i }));

      expect(screen.getByText(/≤50/)).toBeInTheDocument();
    });

    it("shows formatted travel time for enabled filter", () => {
      render(
        <ExchangeFilters
          filters={{
            travelTime: {
              enabled: true,
              maxTravelTimeMinutes: 90,
              onToggle: vi.fn(),
            },
          }}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /filters/i }));

      // Should show ≤1h 30min
      expect(screen.getByText(/≤1.*30/)).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has accessible filter button", () => {
      render(
        <ExchangeFilters
          filters={{
            level: { enabled: false, userLevel: "N2", onToggle: vi.fn() },
          }}
        />,
      );

      const button = screen.getByRole("button", { name: /filters/i });
      expect(button).toHaveAttribute("aria-label");
    });

    it("has accessible close button", () => {
      render(
        <ExchangeFilters
          filters={{
            level: { enabled: false, userLevel: "N2", onToggle: vi.fn() },
          }}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /filters/i }));

      const closeButton = screen.getByRole("button", { name: /close/i });
      expect(closeButton).toHaveAttribute("aria-label");
    });

    it("supports data-tour attribute", () => {
      render(
        <ExchangeFilters
          dataTour="test-tour"
          filters={{
            level: { enabled: false, userLevel: "N2", onToggle: vi.fn() },
          }}
        />,
      );

      expect(screen.getByRole("button", { name: /filters/i })).toHaveAttribute(
        "data-tour",
        "test-tour",
      );
    });
  });
});
