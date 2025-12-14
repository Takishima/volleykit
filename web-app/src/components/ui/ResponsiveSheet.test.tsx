import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResponsiveSheet } from "./ResponsiveSheet";

describe("ResponsiveSheet", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    titleId: "test-title",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders when isOpen is true", () => {
    render(
      <ResponsiveSheet {...defaultProps}>
        <h2 id="test-title">Test Title</h2>
        <p>Content</p>
      </ResponsiveSheet>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(
      <ResponsiveSheet {...defaultProps} isOpen={false}>
        <p>Content</p>
      </ResponsiveSheet>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <ResponsiveSheet {...defaultProps} onClose={onClose}>
        <p>Content</p>
      </ResponsiveSheet>,
    );

    const backdrop = document.querySelector('[aria-hidden="true"]');
    fireEvent.click(backdrop!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when dialog content is clicked", () => {
    const onClose = vi.fn();
    render(
      <ResponsiveSheet {...defaultProps} onClose={onClose}>
        <p>Content</p>
      </ResponsiveSheet>,
    );

    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(
      <ResponsiveSheet {...defaultProps} onClose={onClose}>
        <p>Content</p>
      </ResponsiveSheet>,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose for other keys", () => {
    const onClose = vi.fn();
    render(
      <ResponsiveSheet {...defaultProps} onClose={onClose}>
        <p>Content</p>
      </ResponsiveSheet>,
    );

    fireEvent.keyDown(document, { key: "Enter" });
    fireEvent.keyDown(document, { key: "Tab" });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("has proper accessibility attributes", () => {
    render(
      <ResponsiveSheet {...defaultProps}>
        <h2 id="test-title">Test Title</h2>
      </ResponsiveSheet>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "test-title");
  });

  it("has aria-hidden backdrop", () => {
    render(
      <ResponsiveSheet {...defaultProps}>
        <p>Content</p>
      </ResponsiveSheet>,
    );

    const backdrop = document.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeInTheDocument();
    expect(backdrop).toHaveClass("bg-black/50");
  });

  it("removes escape listener when closed", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <ResponsiveSheet {...defaultProps} onClose={onClose}>
        <p>Content</p>
      </ResponsiveSheet>,
    );

    rerender(
      <ResponsiveSheet {...defaultProps} isOpen={false} onClose={onClose}>
        <p>Content</p>
      </ResponsiveSheet>,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
