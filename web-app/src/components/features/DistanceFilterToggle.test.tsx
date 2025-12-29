import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DistanceFilterToggle } from "./DistanceFilterToggle";

// Mock useTranslation
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "exchange.filterByDistance": "Filter by distance",
        "common.distanceUnit": "km",
      };
      return translations[key] ?? key;
    },
    language: "en",
  }),
}));

describe("DistanceFilterToggle", () => {
  it("renders with unchecked state", () => {
    const onChange = vi.fn();

    render(
      <DistanceFilterToggle
        checked={false}
        onChange={onChange}
        maxDistanceKm={50}
      />,
    );

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("renders with checked state", () => {
    const onChange = vi.fn();

    render(
      <DistanceFilterToggle
        checked={true}
        onChange={onChange}
        maxDistanceKm={50}
      />,
    );

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("calls onChange with true when clicking unchecked toggle", () => {
    const onChange = vi.fn();

    render(
      <DistanceFilterToggle
        checked={false}
        onChange={onChange}
        maxDistanceKm={50}
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
      <DistanceFilterToggle
        checked={true}
        onChange={onChange}
        maxDistanceKm={50}
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
      <DistanceFilterToggle
        checked={false}
        onChange={onChange}
        maxDistanceKm={50}
      />,
    );

    expect(screen.getByText("Filter by distance")).toBeInTheDocument();
  });

  it("displays distance value when checked", () => {
    const onChange = vi.fn();

    render(
      <DistanceFilterToggle
        checked={true}
        onChange={onChange}
        maxDistanceKm={50}
      />,
    );

    // Should show "≤50 km" when active
    expect(screen.getByText("≤50 km")).toBeInTheDocument();
  });

  it("displays different distance values", () => {
    const onChange = vi.fn();

    const { rerender } = render(
      <DistanceFilterToggle
        checked={true}
        onChange={onChange}
        maxDistanceKm={25}
      />,
    );

    expect(screen.getByText("≤25 km")).toBeInTheDocument();

    rerender(
      <DistanceFilterToggle
        checked={true}
        onChange={onChange}
        maxDistanceKm={100}
      />,
    );

    expect(screen.getByText("≤100 km")).toBeInTheDocument();
  });

  it("passes dataTour prop correctly", () => {
    const onChange = vi.fn();

    const { container } = render(
      <DistanceFilterToggle
        checked={false}
        onChange={onChange}
        maxDistanceKm={50}
        dataTour="distance-filter"
      />,
    );

    const element = container.querySelector('[data-tour="distance-filter"]');
    expect(element).toBeInTheDocument();
  });

  it("shows icon when checked", () => {
    const onChange = vi.fn();

    const { container } = render(
      <DistanceFilterToggle
        checked={true}
        onChange={onChange}
        maxDistanceKm={50}
      />,
    );

    // MapPin icon should be rendered
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("has correct aria-label for accessibility", () => {
    const onChange = vi.fn();

    render(
      <DistanceFilterToggle
        checked={false}
        onChange={onChange}
        maxDistanceKm={50}
      />,
    );

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-label", "Filter by distance");
  });

  it("applies correct styling when unchecked", () => {
    const onChange = vi.fn();

    const { container } = render(
      <DistanceFilterToggle
        checked={false}
        onChange={onChange}
        maxDistanceKm={50}
      />,
    );

    const toggle = container.querySelector(".bg-gray-100");
    expect(toggle).toBeInTheDocument();
  });

  it("applies correct styling when checked", () => {
    const onChange = vi.fn();

    const { container } = render(
      <DistanceFilterToggle
        checked={true}
        onChange={onChange}
        maxDistanceKm={50}
      />,
    );

    const toggle = container.querySelector(".bg-primary-100");
    expect(toggle).toBeInTheDocument();
  });
});
