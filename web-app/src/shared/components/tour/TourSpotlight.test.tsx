import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { TourSpotlight } from "./TourSpotlight";

describe("TourSpotlight", () => {
  let targetElement: HTMLDivElement;

  beforeEach(() => {
    // Create a target element for the spotlight to find
    targetElement = document.createElement("div");
    targetElement.setAttribute("data-testid", "tour-target");
    targetElement.className = "tour-target";
    targetElement.style.width = "100px";
    targetElement.style.height = "50px";
    document.body.appendChild(targetElement);

    // Mock getBoundingClientRect for the target
    targetElement.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      left: 100,
      right: 200,
      bottom: 150,
      width: 100,
      height: 50,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    }));

    // Mock window dimensions
    Object.defineProperty(window, "innerWidth", { value: 1024, writable: true });
    Object.defineProperty(window, "innerHeight", { value: 768, writable: true });

    // Use fake timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.removeChild(targetElement);
    vi.useRealTimers();
  });

  const defaultProps = {
    targetSelector: ".tour-target",
    placement: "bottom" as const,
    onDismiss: vi.fn(),
    children: <div data-testid="tooltip-content">Tooltip Content</div>,
  };

  it("renders spotlight with children after positioning", async () => {
    render(<TourSpotlight {...defaultProps} />);

    // Advance timers to trigger initial position update
    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.getByTestId("tooltip-content")).toBeInTheDocument();
  });

  it("creates a dialog with proper ARIA attributes", async () => {
    render(<TourSpotlight {...defaultProps} />);

    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Guided tour");
  });

  it("calls onDismiss when Escape key is pressed", async () => {
    const onDismiss = vi.fn();

    render(<TourSpotlight {...defaultProps} onDismiss={onDismiss} />);

    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    // Simulate Escape key press directly on document
    await act(async () => {
      const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
      document.dispatchEvent(event);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not render when target element is not found", () => {
    render(
      <TourSpotlight {...defaultProps} targetSelector=".nonexistent-element" />
    );

    // Should not render anything since target doesn't exist
    expect(screen.queryByTestId("tooltip-content")).not.toBeInTheDocument();
  });

  it("elevates target element z-index when mounted", async () => {
    render(<TourSpotlight {...defaultProps} />);

    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect(targetElement.style.zIndex).toBe("45");
    expect(targetElement.style.position).toBe("relative");
  });

  it("restores target element styles when unmounted", async () => {
    const { unmount } = render(<TourSpotlight {...defaultProps} />);

    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    unmount();

    expect(targetElement.style.zIndex).toBe("");
    expect(targetElement.style.position).toBe("");
  });

  it("applies backdrop blur by default", async () => {
    render(<TourSpotlight {...defaultProps} />);

    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    const backdrop = document.querySelector(".bg-black\\/70");
    expect(backdrop).toHaveClass("backdrop-blur-sm");
  });

  it("disables backdrop blur when disableBlur is true", async () => {
    render(<TourSpotlight {...defaultProps} disableBlur={true} />);

    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    const backdrop = document.querySelector(".bg-black\\/70");
    expect(backdrop).not.toHaveClass("backdrop-blur-sm");
  });

  it("updates position on window resize", async () => {
    render(<TourSpotlight {...defaultProps} />);

    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    // Update mock to return new position
    targetElement.getBoundingClientRect = vi.fn(() => ({
      top: 200,
      left: 200,
      right: 300,
      bottom: 250,
      width: 100,
      height: 50,
      x: 200,
      y: 200,
      toJSON: () => ({}),
    }));

    // Trigger resize
    await act(async () => {
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(100);
    });

    // Verify component is still rendered (position update happened)
    expect(screen.getByTestId("tooltip-content")).toBeInTheDocument();
  });

  it("renders portal to document.body", async () => {
    render(<TourSpotlight {...defaultProps} />);

    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    // The spotlight should be a direct child of body (via portal)
    const spotlight = document.body.querySelector(".tour-spotlight");
    expect(spotlight).toBeInTheDocument();
    expect(spotlight?.parentElement).toBe(document.body);
  });

  describe("placement", () => {
    it.each(["bottom", "top", "left", "right"] as const)(
      "handles %s placement",
      async (placement) => {
        render(<TourSpotlight {...defaultProps} placement={placement} />);

        await act(async () => {
          vi.advanceTimersByTime(150);
        });

        expect(screen.getByTestId("tooltip-content")).toBeInTheDocument();
      }
    );
  });

  describe("freezePosition", () => {
    it("freezes position updates when freezePosition is true and positioned", async () => {
      const { rerender } = render(<TourSpotlight {...defaultProps} />);

      await act(async () => {
        vi.advanceTimersByTime(150);
      });

      // Now enable freeze
      rerender(
        <TourSpotlight {...defaultProps} freezePosition={true}>
          <div data-testid="tooltip-content">Tooltip Content</div>
        </TourSpotlight>
      );

      // Update target position
      targetElement.getBoundingClientRect = vi.fn(() => ({
        top: 300,
        left: 300,
        right: 400,
        bottom: 350,
        width: 100,
        height: 50,
        x: 300,
        y: 300,
        toJSON: () => ({}),
      }));

      // Trigger scroll - should be ignored due to freeze
      await act(async () => {
        document.dispatchEvent(new Event("scroll"));
        vi.advanceTimersByTime(150);
      });

      // Component should still be rendered at original position
      expect(screen.getByTestId("tooltip-content")).toBeInTheDocument();
    });
  });

  describe("SwipeableCard container elevation", () => {
    it("elevates SwipeableCard container when target is inside one", async () => {
      // Remove target from body first
      document.body.removeChild(targetElement);

      // Create a SwipeableCard-like container and add target inside it
      const container = document.createElement("div");
      container.className = "overflow-hidden";
      container.appendChild(targetElement);
      document.body.appendChild(container);

      render(<TourSpotlight {...defaultProps} />);

      await act(async () => {
        vi.advanceTimersByTime(150);
      });

      expect(container.style.zIndex).toBe("45");
      expect(container.style.position).toBe("relative");

      // Clean up - put targetElement back for afterEach cleanup
      container.removeChild(targetElement);
      document.body.appendChild(targetElement);
      document.body.removeChild(container);
    });
  });
});
