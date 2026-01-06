import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  describe("rendering", () => {
    it("renders children correctly", () => {
      render(<Button>Click me</Button>);
      expect(
        screen.getByRole("button", { name: "Click me" })
      ).toBeInTheDocument();
    });

    it("renders as a button element", () => {
      render(<Button>Test</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("has type='button' by default", () => {
      render(<Button>Test</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("type", "button");
    });

    it("allows type to be overridden", () => {
      render(<Button type="submit">Submit</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
    });

    it("applies custom className", () => {
      render(<Button className="custom-class">Test</Button>);
      expect(screen.getByRole("button")).toHaveClass("custom-class");
    });

    it("passes through additional button attributes", () => {
      render(
        <Button aria-label="Test label" data-testid="test-btn">
          Test
        </Button>
      );
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", "Test label");
      expect(button).toHaveAttribute("data-testid", "test-btn");
    });
  });

  describe("variants", () => {
    it("applies primary variant by default", () => {
      render(<Button>Primary</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-primary-500");
      expect(button).toHaveClass("text-primary-950");
    });

    it("applies secondary variant styles", () => {
      render(<Button variant="secondary">Cancel</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-surface-subtle");
      expect(button).toHaveClass("text-text-secondary");
    });

    it("applies success variant styles", () => {
      render(<Button variant="success">Confirm</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-green-600");
      expect(button).toHaveClass("text-white");
    });

    it("applies danger variant styles", () => {
      render(<Button variant="danger">Delete</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-red-600");
      expect(button).toHaveClass("text-white");
    });

    it("applies blue variant styles", () => {
      render(<Button variant="blue">Export</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-blue-600");
      expect(button).toHaveClass("text-white");
    });

    it("applies ghost variant styles", () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-transparent");
      expect(button).toHaveClass("text-text-secondary");
    });
  });

  describe("sizes", () => {
    it("applies medium size by default", () => {
      render(<Button>Test</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("px-4");
      expect(button).toHaveClass("py-2");
      expect(button).toHaveClass("text-sm");
    });

    it("applies small size styles", () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("px-3");
      expect(button).toHaveClass("py-1.5");
      expect(button).toHaveClass("text-xs");
    });

    it("applies large size styles", () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("px-6");
      expect(button).toHaveClass("py-3");
      expect(button).toHaveClass("text-base");
    });
  });

  describe("base styles", () => {
    it("applies base flexbox and transition styles", () => {
      render(<Button>Test</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("inline-flex");
      expect(button).toHaveClass("items-center");
      expect(button).toHaveClass("justify-center");
      expect(button).toHaveClass("gap-2");
      expect(button).toHaveClass("transition-colors");
    });

    it("applies focus ring styles", () => {
      render(<Button>Test</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("focus:outline-none");
      expect(button).toHaveClass("focus:ring-2");
      expect(button).toHaveClass("focus:ring-offset-2");
    });

    it("applies rounded corners", () => {
      render(<Button>Test</Button>);
      expect(screen.getByRole("button")).toHaveClass("rounded-lg");
    });
  });

  describe("fullWidth prop", () => {
    it("does not apply w-full by default", () => {
      render(<Button>Test</Button>);
      expect(screen.getByRole("button")).not.toHaveClass("w-full");
    });

    it("applies w-full when fullWidth is true", () => {
      render(<Button fullWidth>Test</Button>);
      expect(screen.getByRole("button")).toHaveClass("w-full");
    });
  });

  describe("disabled state", () => {
    it("applies disabled attribute when disabled", () => {
      render(<Button disabled>Test</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("applies disabled styles", () => {
      render(<Button disabled>Test</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("disabled:opacity-50");
      expect(button).toHaveClass("disabled:cursor-not-allowed");
    });

    it("does not call onClick when disabled", () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Test
        </Button>
      );

      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("loading state", () => {
    it("shows loading spinner when loading", () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole("button");
      const spinner = button.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("is disabled when loading", () => {
      render(<Button loading>Loading</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("has aria-busy when loading", () => {
      render(<Button loading>Loading</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
    });

    it("does not have aria-busy when not loading", () => {
      render(<Button>Not Loading</Button>);
      expect(screen.getByRole("button")).not.toHaveAttribute("aria-busy");
    });

    it("does not call onClick when loading", () => {
      const handleClick = vi.fn();
      render(
        <Button loading onClick={handleClick}>
          Test
        </Button>
      );

      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it("hides iconLeft when loading", () => {
      render(
        <Button loading iconLeft={<span data-testid="left-icon">L</span>}>
          Test
        </Button>
      );
      expect(screen.queryByTestId("left-icon")).not.toBeInTheDocument();
    });

    it("hides iconRight when loading", () => {
      render(
        <Button loading iconRight={<span data-testid="right-icon">R</span>}>
          Test
        </Button>
      );
      expect(screen.queryByTestId("right-icon")).not.toBeInTheDocument();
    });
  });

  describe("icon support", () => {
    it("renders iconLeft before children", () => {
      render(
        <Button iconLeft={<span data-testid="left-icon">←</span>}>Back</Button>
      );
      const button = screen.getByRole("button");
      expect(screen.getByTestId("left-icon")).toBeInTheDocument();
      expect(button.textContent).toBe("←Back");
    });

    it("renders iconRight after children", () => {
      render(
        <Button iconRight={<span data-testid="right-icon">→</span>}>
          Next
        </Button>
      );
      const button = screen.getByRole("button");
      expect(screen.getByTestId("right-icon")).toBeInTheDocument();
      expect(button.textContent).toBe("Next→");
    });

    it("renders both icons correctly", () => {
      render(
        <Button
          iconLeft={<span data-testid="left-icon">←</span>}
          iconRight={<span data-testid="right-icon">→</span>}
        >
          Middle
        </Button>
      );
      expect(screen.getByTestId("left-icon")).toBeInTheDocument();
      expect(screen.getByTestId("right-icon")).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("calls onClick handler when clicked", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Test</Button>);

      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});
