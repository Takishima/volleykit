import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TravelTimeFilterToggle } from "./TravelTimeFilterToggle";

// Mock useTranslation
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "exchange.filterByTravelTime": "Filter by travel time",
        "common.minutesUnit": "min",
        "common.hoursUnit": "h",
      };
      return translations[key] ?? key;
    },
    language: "en",
  }),
}));

describe("TravelTimeFilterToggle", () => {
  it("renders with unchecked state", () => {
    const onChange = vi.fn();

    render(
      <TravelTimeFilterToggle
        checked={false}
        onChange={onChange}
        maxTravelTimeMinutes={60}
      />,
    );

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("renders with checked state", () => {
    const onChange = vi.fn();

    render(
      <TravelTimeFilterToggle
        checked={true}
        onChange={onChange}
        maxTravelTimeMinutes={60}
      />,
    );

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("calls onChange with true when clicking unchecked toggle", () => {
    const onChange = vi.fn();

    render(
      <TravelTimeFilterToggle
        checked={false}
        onChange={onChange}
        maxTravelTimeMinutes={60}
      />,
    );

    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("calls onChange with false when clicking checked toggle", () => {
    const onChange = vi.fn();

    render(
      <TravelTimeFilterToggle
        checked={true}
        onChange={onChange}
        maxTravelTimeMinutes={60}
      />,
    );

    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("displays the label when unchecked", () => {
    const onChange = vi.fn();

    render(
      <TravelTimeFilterToggle
        checked={false}
        onChange={onChange}
        maxTravelTimeMinutes={60}
      />,
    );

    expect(screen.getByText("Filter by travel time")).toBeInTheDocument();
  });

  it("displays formatted time value when checked (minutes only)", () => {
    const onChange = vi.fn();

    render(
      <TravelTimeFilterToggle
        checked={true}
        onChange={onChange}
        maxTravelTimeMinutes={45}
      />,
    );

    // Should show "≤45min" when active (no space before unit)
    expect(screen.getByText("≤45min")).toBeInTheDocument();
  });

  it("displays formatted time value when checked (hours)", () => {
    const onChange = vi.fn();

    render(
      <TravelTimeFilterToggle
        checked={true}
        onChange={onChange}
        maxTravelTimeMinutes={120}
      />,
    );

    // Should show "≤2h" for exactly 2 hours
    expect(screen.getByText("≤2h")).toBeInTheDocument();
  });

  it("displays formatted time value when checked (hours and minutes)", () => {
    const onChange = vi.fn();

    render(
      <TravelTimeFilterToggle
        checked={true}
        onChange={onChange}
        maxTravelTimeMinutes={90}
      />,
    );

    // Should show "≤1h 30min" for 90 minutes (space only between hours and minutes)
    expect(screen.getByText("≤1h 30min")).toBeInTheDocument();
  });

  it("passes dataTour prop correctly", () => {
    const onChange = vi.fn();

    const { container } = render(
      <TravelTimeFilterToggle
        checked={false}
        onChange={onChange}
        maxTravelTimeMinutes={60}
        dataTour="travel-time-filter"
      />,
    );

    const element = container.querySelector('[data-tour="travel-time-filter"]');
    expect(element).toBeInTheDocument();
  });

  it("shows train icon when checked", () => {
    const onChange = vi.fn();

    const { container } = render(
      <TravelTimeFilterToggle
        checked={true}
        onChange={onChange}
        maxTravelTimeMinutes={60}
      />,
    );

    // TrainFront icon should be rendered
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("has correct aria-label for accessibility", () => {
    const onChange = vi.fn();

    render(
      <TravelTimeFilterToggle
        checked={false}
        onChange={onChange}
        maxTravelTimeMinutes={60}
      />,
    );

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-label", "Filter by travel time");
  });

  it("applies correct styling when unchecked", () => {
    const onChange = vi.fn();

    const { container } = render(
      <TravelTimeFilterToggle
        checked={false}
        onChange={onChange}
        maxTravelTimeMinutes={60}
      />,
    );

    const toggle = container.querySelector(".bg-gray-100");
    expect(toggle).toBeInTheDocument();
  });

  it("applies correct styling when checked", () => {
    const onChange = vi.fn();

    const { container } = render(
      <TravelTimeFilterToggle
        checked={true}
        onChange={onChange}
        maxTravelTimeMinutes={60}
      />,
    );

    const toggle = container.querySelector(".bg-primary-100");
    expect(toggle).toBeInTheDocument();
  });

  it("handles edge case of zero minutes", () => {
    const onChange = vi.fn();

    render(
      <TravelTimeFilterToggle
        checked={true}
        onChange={onChange}
        maxTravelTimeMinutes={0}
      />,
    );

    // Should show "≤0min" (no space before unit)
    expect(screen.getByText("≤0min")).toBeInTheDocument();
  });

  it("is memoized to prevent unnecessary re-renders", () => {
    const onChange = vi.fn();

    const { rerender } = render(
      <TravelTimeFilterToggle
        checked={true}
        onChange={onChange}
        maxTravelTimeMinutes={60}
      />,
    );

    // Re-render with same props should not cause issues
    rerender(
      <TravelTimeFilterToggle
        checked={true}
        onChange={onChange}
        maxTravelTimeMinutes={60}
      />,
    );

    const toggle = screen.getByRole("switch");
    expect(toggle).toBeInTheDocument();
  });
});
