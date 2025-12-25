import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ModalButton } from "./ModalButton";

describe("ModalButton", () => {
  describe("rendering", () => {
    it("renders children correctly", () => {
      render(<ModalButton variant="primary">Click me</ModalButton>);
      expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
    });

    it("renders as a button element", () => {
      render(<ModalButton variant="primary">Test</ModalButton>);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("has type='button' by default", () => {
      render(<ModalButton variant="primary">Test</ModalButton>);
      expect(screen.getByRole("button")).toHaveAttribute("type", "button");
    });

    it("applies custom className", () => {
      render(
        <ModalButton variant="primary" className="custom-class">
          Test
        </ModalButton>
      );
      expect(screen.getByRole("button")).toHaveClass("custom-class");
    });

    it("passes through additional button attributes", () => {
      render(
        <ModalButton variant="primary" aria-busy="true" data-testid="modal-btn">
          Test
        </ModalButton>
      );
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-busy", "true");
      expect(button).toHaveAttribute("data-testid", "modal-btn");
    });
  });

  describe("variants", () => {
    it("applies secondary variant styles", () => {
      render(<ModalButton variant="secondary">Cancel</ModalButton>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-surface-subtle");
      expect(button).toHaveClass("text-text-secondary");
    });

    it("applies primary variant styles", () => {
      render(<ModalButton variant="primary">Save</ModalButton>);
      const button = screen.getByRole("button");
      // Uses unified Button styling: primary-500 with dark text
      expect(button).toHaveClass("bg-primary-500");
      expect(button).toHaveClass("text-primary-950");
    });

    it("applies success variant styles", () => {
      render(<ModalButton variant="success">Confirm</ModalButton>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-green-600");
      expect(button).toHaveClass("text-white");
    });

    it("applies danger variant styles", () => {
      render(<ModalButton variant="danger">Delete</ModalButton>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-red-600");
      expect(button).toHaveClass("text-white");
    });

    it("applies blue variant styles", () => {
      render(<ModalButton variant="blue">Export</ModalButton>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-blue-600");
      expect(button).toHaveClass("text-white");
    });
  });

  describe("base styles", () => {
    it("applies base padding and text styles", () => {
      render(<ModalButton variant="primary">Test</ModalButton>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("px-4");
      expect(button).toHaveClass("py-2");
      expect(button).toHaveClass("text-sm");
      expect(button).toHaveClass("font-medium");
      expect(button).toHaveClass("rounded-md");
    });

    it("applies focus ring styles", () => {
      render(<ModalButton variant="primary">Test</ModalButton>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("focus:outline-none");
      expect(button).toHaveClass("focus:ring-2");
    });
  });

  describe("fullWidth prop", () => {
    it("does not apply flex-1 by default", () => {
      render(<ModalButton variant="primary">Test</ModalButton>);
      expect(screen.getByRole("button")).not.toHaveClass("flex-1");
    });

    it("applies flex-1 when fullWidth is true", () => {
      render(
        <ModalButton variant="primary" fullWidth>
          Test
        </ModalButton>
      );
      expect(screen.getByRole("button")).toHaveClass("flex-1");
    });
  });

  describe("disabled state", () => {
    it("applies disabled attribute when disabled", () => {
      render(
        <ModalButton variant="primary" disabled>
          Test
        </ModalButton>
      );
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("applies disabled styles", () => {
      render(
        <ModalButton variant="primary" disabled>
          Test
        </ModalButton>
      );
      const button = screen.getByRole("button");
      expect(button).toHaveClass("disabled:opacity-50");
      expect(button).toHaveClass("disabled:cursor-not-allowed");
    });

    it("does not call onClick when disabled", () => {
      const handleClick = vi.fn();
      render(
        <ModalButton variant="primary" disabled onClick={handleClick}>
          Test
        </ModalButton>
      );

      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("interactions", () => {
    it("calls onClick handler when clicked", () => {
      const handleClick = vi.fn();
      render(
        <ModalButton variant="primary" onClick={handleClick}>
          Test
        </ModalButton>
      );

      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});
