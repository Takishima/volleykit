import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SafeModeWarningModal } from "./SafeModeWarningModal";

describe("SafeModeWarningModal", () => {
  it("should not render when closed", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <SafeModeWarningModal
        isOpen={false}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(
      screen.queryByRole("dialog", { name: /disable safe mode/i, hidden: true }),
    ).not.toBeInTheDocument();
  });

  it("should render when open", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <SafeModeWarningModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: /disable safe mode/i, hidden: true }),
    ).toBeInTheDocument();
  });

  it("should call onClose when cancel button is clicked", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <SafeModeWarningModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel/i, hidden: true }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("should call onConfirm and onClose when confirm button is clicked", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <SafeModeWarningModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /i understand, disable/i, hidden: true }),
    );

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("should call onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <SafeModeWarningModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("should call onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    const { container } = render(
      <SafeModeWarningModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    const backdrop = container.querySelector(
      ".fixed.inset-0.bg-black",
    ) as HTMLElement;
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledOnce();
    }
  });
});
