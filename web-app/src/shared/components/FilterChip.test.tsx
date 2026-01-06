import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FilterChip } from "./FilterChip";

describe("FilterChip", () => {
  describe("rendering", () => {
    it("renders as a button with switch role", () => {
      render(<FilterChip label="Distance" active={false} onToggle={() => {}} />);
      expect(screen.getByRole("switch")).toBeInTheDocument();
    });

    it("renders label when inactive", () => {
      render(<FilterChip label="Distance" active={false} onToggle={() => {}} />);
      expect(screen.getByText("Distance")).toBeInTheDocument();
    });

    it("renders activeValue when active", () => {
      render(
        <FilterChip
          label="Distance"
          activeValue="≤50 km"
          active={true}
          onToggle={() => {}}
        />
      );
      expect(screen.getByText("≤50 km")).toBeInTheDocument();
      expect(screen.queryByText("Distance")).not.toBeInTheDocument();
    });

    it("renders label when active but no activeValue provided", () => {
      render(<FilterChip label="Filter" active={true} onToggle={() => {}} />);
      expect(screen.getByText("Filter")).toBeInTheDocument();
    });
  });

  describe("icon behavior", () => {
    it("renders icon when inactive", () => {
      render(
        <FilterChip
          label="Distance"
          icon={<span data-testid="icon">📍</span>}
          active={false}
          onToggle={() => {}}
        />
      );
      expect(screen.getByTestId("icon")).toBeInTheDocument();
    });

    it("hides icon when active by default", () => {
      render(
        <FilterChip
          label="Distance"
          activeValue="≤50 km"
          icon={<span data-testid="icon">📍</span>}
          active={true}
          onToggle={() => {}}
        />
      );
      expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
    });

    it("shows icon when active if showIconWhenActive is true", () => {
      render(
        <FilterChip
          label="Distance"
          activeValue="≤50 km"
          icon={<span data-testid="icon">📍</span>}
          active={true}
          showIconWhenActive={true}
          onToggle={() => {}}
        />
      );
      expect(screen.getByTestId("icon")).toBeInTheDocument();
    });

    it("does not render icon container when icon is not provided", () => {
      const { container } = render(
        <FilterChip label="Distance" active={false} onToggle={() => {}} />
      );
      expect(container.querySelector(".w-3\\.5")).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has aria-checked false when inactive", () => {
      render(<FilterChip label="Distance" active={false} onToggle={() => {}} />);
      expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    });

    it("has aria-checked true when active", () => {
      render(<FilterChip label="Distance" active={true} onToggle={() => {}} />);
      expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    });

    it("has aria-label set to label prop", () => {
      render(<FilterChip label="Distance" active={false} onToggle={() => {}} />);
      expect(screen.getByRole("switch")).toHaveAttribute(
        "aria-label",
        "Distance"
      );
    });

    it("has type button", () => {
      render(<FilterChip label="Distance" active={false} onToggle={() => {}} />);
      expect(screen.getByRole("switch")).toHaveAttribute("type", "button");
    });
  });

  describe("interactions", () => {
    it("calls onToggle when clicked", () => {
      const handleToggle = vi.fn();
      render(
        <FilterChip label="Distance" active={false} onToggle={handleToggle} />
      );

      fireEvent.click(screen.getByRole("switch"));
      expect(handleToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe("data-tour attribute", () => {
    it("applies data-tour when provided", () => {
      render(
        <FilterChip
          label="Distance"
          active={false}
          onToggle={() => {}}
          dataTour="distance-filter"
        />
      );
      expect(screen.getByRole("switch")).toHaveAttribute(
        "data-tour",
        "distance-filter"
      );
    });

    it("does not apply data-tour when not provided", () => {
      render(<FilterChip label="Distance" active={false} onToggle={() => {}} />);
      expect(screen.getByRole("switch")).not.toHaveAttribute("data-tour");
    });
  });

  describe("styling", () => {
    it("applies active styles when active", () => {
      render(<FilterChip label="Distance" active={true} onToggle={() => {}} />);
      const chip = screen.getByRole("switch");
      expect(chip).toHaveClass("bg-primary-100");
      expect(chip).toHaveClass("text-primary-700");
    });

    it("applies inactive styles when not active", () => {
      render(<FilterChip label="Distance" active={false} onToggle={() => {}} />);
      const chip = screen.getByRole("switch");
      expect(chip).toHaveClass("bg-gray-100");
      expect(chip).toHaveClass("text-gray-600");
    });

    it("applies base chip styles", () => {
      render(<FilterChip label="Distance" active={false} onToggle={() => {}} />);
      const chip = screen.getByRole("switch");
      expect(chip).toHaveClass("rounded-full");
      expect(chip).toHaveClass("text-xs");
      expect(chip).toHaveClass("font-medium");
      expect(chip).toHaveClass("cursor-pointer");
    });

    it("applies focus ring styles", () => {
      render(<FilterChip label="Distance" active={false} onToggle={() => {}} />);
      const chip = screen.getByRole("switch");
      expect(chip).toHaveClass("focus:outline-none");
      expect(chip).toHaveClass("focus:ring-2");
      expect(chip).toHaveClass("focus:ring-primary-500");
    });
  });
});
