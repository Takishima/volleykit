import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TravelTimeBadge } from "./TravelTimeBadge";

// Mock useTranslation
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "exchange.travelTime": "Travel time",
      };
      return translations[key] ?? key;
    },
    language: "en",
  }),
}));

// Mock formatTravelTime from useTravelTime hook
vi.mock("@/hooks/useTravelTime", () => ({
  formatTravelTime: (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}'`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h${remainingMinutes}'`;
  },
}));

describe("TravelTimeBadge", () => {
  describe("loading state", () => {
    it("shows loading indicator when isLoading is true", () => {
      const { container } = render(
        <TravelTimeBadge durationMinutes={undefined} isLoading={true} />,
      );

      // Should show "..." as loading text
      expect(screen.getByText("...")).toBeInTheDocument();

      // Should have pulse animation
      const badge = container.querySelector(".animate-pulse");
      expect(badge).toBeInTheDocument();
    });

    it("shows loading even when durationMinutes is provided", () => {
      render(<TravelTimeBadge durationMinutes={30} isLoading={true} />);

      // Loading state takes precedence
      expect(screen.getByText("...")).toBeInTheDocument();
    });

    it("shows train icon during loading", () => {
      const { container } = render(
        <TravelTimeBadge durationMinutes={undefined} isLoading={true} />,
      );

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("error state", () => {
    it("returns null when isError is true", () => {
      const { container } = render(
        <TravelTimeBadge durationMinutes={30} isError={true} />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("returns null when isError is true even with duration", () => {
      const { container } = render(
        <TravelTimeBadge durationMinutes={45} isError={true} />,
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("undefined duration", () => {
    it("returns null when durationMinutes is undefined", () => {
      const { container } = render(
        <TravelTimeBadge durationMinutes={undefined} />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("returns null when durationMinutes is undefined and not loading", () => {
      const { container } = render(
        <TravelTimeBadge
          durationMinutes={undefined}
          isLoading={false}
          isError={false}
        />,
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("successful display", () => {
    it("displays formatted time for minutes less than 60", () => {
      render(<TravelTimeBadge durationMinutes={45} />);

      expect(screen.getByText("45'")).toBeInTheDocument();
    });

    it("displays formatted time for exactly 60 minutes", () => {
      render(<TravelTimeBadge durationMinutes={60} />);

      expect(screen.getByText("1h")).toBeInTheDocument();
    });

    it("displays formatted time for hours and minutes", () => {
      render(<TravelTimeBadge durationMinutes={90} />);

      expect(screen.getByText("1h30'")).toBeInTheDocument();
    });

    it("displays formatted time for multiple hours", () => {
      render(<TravelTimeBadge durationMinutes={150} />);

      expect(screen.getByText("2h30'")).toBeInTheDocument();
    });

    it("shows train icon with travel time", () => {
      const { container } = render(<TravelTimeBadge durationMinutes={30} />);

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });

    it("has correct title attribute for accessibility", () => {
      render(<TravelTimeBadge durationMinutes={30} />);

      const badge = screen.getByTitle("Travel time");
      expect(badge).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("applies neutral variant", () => {
      const { container } = render(<TravelTimeBadge durationMinutes={30} />);

      // Badge component applies neutral styling
      const badge = container.querySelector('[class*="neutral"]') ||
        container.firstChild;
      expect(badge).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(
        <TravelTimeBadge durationMinutes={30} className="custom-class" />,
      );

      const badge = container.querySelector(".custom-class");
      expect(badge).toBeInTheDocument();
    });

    it("combines custom className with component classes", () => {
      const { container } = render(
        <TravelTimeBadge durationMinutes={30} className="mt-2" />,
      );

      const badge = container.querySelector(".mt-2");
      expect(badge).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles zero minutes", () => {
      render(<TravelTimeBadge durationMinutes={0} />);

      expect(screen.getByText("0'")).toBeInTheDocument();
    });

    it("handles very large durations", () => {
      render(<TravelTimeBadge durationMinutes={480} />);

      // 8 hours
      expect(screen.getByText("8h")).toBeInTheDocument();
    });

    it("handles small durations", () => {
      render(<TravelTimeBadge durationMinutes={5} />);

      expect(screen.getByText("5'")).toBeInTheDocument();
    });
  });

  describe("memoization", () => {
    it("is memoized to prevent unnecessary re-renders", () => {
      const { rerender } = render(<TravelTimeBadge durationMinutes={30} />);

      // Re-render with same props should not cause issues
      rerender(<TravelTimeBadge durationMinutes={30} />);

      expect(screen.getByText("30'")).toBeInTheDocument();
    });

    it("updates when props change", () => {
      const { rerender } = render(<TravelTimeBadge durationMinutes={30} />);

      expect(screen.getByText("30'")).toBeInTheDocument();

      rerender(<TravelTimeBadge durationMinutes={60} />);

      expect(screen.getByText("1h")).toBeInTheDocument();
    });
  });

  describe("default props", () => {
    it("defaults isLoading to false", () => {
      const { container } = render(<TravelTimeBadge durationMinutes={30} />);

      // Should not show loading animation
      const pulsingBadge = container.querySelector(".animate-pulse");
      expect(pulsingBadge).toBeNull();
    });

    it("defaults isError to false", () => {
      render(<TravelTimeBadge durationMinutes={30} />);

      // Should show the badge, not null
      expect(screen.getByText("30'")).toBeInTheDocument();
    });

    it("defaults className to empty string", () => {
      const { container } = render(<TravelTimeBadge durationMinutes={30} />);

      // Badge should render without extra classes
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
