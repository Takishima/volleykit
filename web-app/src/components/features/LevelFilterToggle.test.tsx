import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LevelFilterToggle } from "./LevelFilterToggle";

describe("LevelFilterToggle", () => {
  it("should render with unchecked state", () => {
    const onChange = vi.fn();

    render(<LevelFilterToggle checked={false} onChange={onChange} />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(toggle).toHaveAttribute("aria-label", "Level");
  });

  it("should render with checked state", () => {
    const onChange = vi.fn();

    render(<LevelFilterToggle checked={true} onChange={onChange} />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("should call onChange with true when clicking unchecked toggle", () => {
    const onChange = vi.fn();

    render(<LevelFilterToggle checked={false} onChange={onChange} />);

    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("should call onChange with false when clicking checked toggle", () => {
    const onChange = vi.fn();

    render(<LevelFilterToggle checked={true} onChange={onChange} />);

    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("should display user level when provided and checked", () => {
    const onChange = vi.fn();

    render(
      <LevelFilterToggle checked={true} onChange={onChange} userLevel="N2" />,
    );

    expect(screen.getByText("N2+")).toBeInTheDocument();
  });

  it("should not display user level when unchecked", () => {
    const onChange = vi.fn();

    render(
      <LevelFilterToggle checked={false} onChange={onChange} userLevel="N2" />,
    );

    // When unchecked, shows label instead of the level value
    expect(screen.queryByText("N2+")).not.toBeInTheDocument();
    expect(screen.getByText("Level")).toBeInTheDocument();
  });

  it("should not display user level when not provided", () => {
    const onChange = vi.fn();

    render(<LevelFilterToggle checked={true} onChange={onChange} />);

    // Shows label when no userLevel is provided
    expect(screen.getByText("Level")).toBeInTheDocument();
  });

  it("should have correct visual styling when checked", () => {
    const onChange = vi.fn();

    const { container } = render(
      <LevelFilterToggle checked={true} onChange={onChange} />,
    );

    const toggle = container.querySelector(".bg-primary-100");
    expect(toggle).toBeInTheDocument();
  });

  it("should have correct visual styling when unchecked", () => {
    const onChange = vi.fn();

    const { container } = render(
      <LevelFilterToggle checked={false} onChange={onChange} />,
    );

    const toggle = container.querySelector(".bg-gray-100");
    expect(toggle).toBeInTheDocument();
  });
});
