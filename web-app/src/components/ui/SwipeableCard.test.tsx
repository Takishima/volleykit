import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SwipeableCard } from "./SwipeableCard";
import { type SwipeConfig } from "../../types/swipe";

describe("SwipeableCard", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      value: 400,
    });
  });
  describe("rendering", () => {
    it("renders children", () => {
      render(
        <SwipeableCard>
          <div data-testid="child">Child Content</div>
        </SwipeableCard>,
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(
        <SwipeableCard className="custom-class">
          <div>Content</div>
        </SwipeableCard>,
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });

    it("is focusable when has actions", () => {
      const { container } = render(
        <SwipeableCard onSwipeLeft={() => {}}>
          <div>Content</div>
        </SwipeableCard>,
      );

      expect(container.firstChild).toHaveAttribute("tabindex", "0");
    });

    it("is not focusable when no actions", () => {
      const { container } = render(
        <SwipeableCard>
          <div>Content</div>
        </SwipeableCard>,
      );

      expect(container.firstChild).not.toHaveAttribute("tabindex");
    });
  });

  describe("keyboard navigation", () => {
    it("shows action buttons on Enter key", () => {
      const onSwipeLeft = vi.fn();
      const { container } = render(
        <SwipeableCard onSwipeLeft={onSwipeLeft} leftActionLabel="Decline">
          <div>Content</div>
        </SwipeableCard>,
      );

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.keyDown(wrapper, { key: "Enter" });

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Decline")).toBeInTheDocument();
    });

    it("shows action buttons on Space key", () => {
      const onSwipeRight = vi.fn();
      const { container } = render(
        <SwipeableCard onSwipeRight={onSwipeRight} rightActionLabel="Confirm">
          <div>Content</div>
        </SwipeableCard>,
      );

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.keyDown(wrapper, { key: " " });

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Confirm")).toBeInTheDocument();
    });

    it("hides action buttons on Escape key", () => {
      const { container } = render(
        <SwipeableCard onSwipeLeft={() => {}}>
          <div>Content</div>
        </SwipeableCard>,
      );

      const wrapper = container.firstChild as HTMLElement;

      // Show actions
      fireEvent.keyDown(wrapper, { key: "Enter" });
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Hide actions
      fireEvent.keyDown(wrapper, { key: "Escape" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("hides action buttons on Escape key when focus is on action button", () => {
      const { container } = render(
        <SwipeableCard
          onSwipeLeft={() => {}}
          onSwipeRight={() => {}}
          leftActionLabel="Left"
          rightActionLabel="Right"
        >
          <div>Content</div>
        </SwipeableCard>,
      );

      const wrapper = container.firstChild as HTMLElement;

      // Show actions
      fireEvent.keyDown(wrapper, { key: "Enter" });
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Get the action button and verify it has focus
      const rightButton = screen.getByText("Right");
      expect(rightButton).toHaveFocus();

      // Press Escape while button has focus
      fireEvent.keyDown(document, { key: "Escape" });

      // Dialog should be dismissed
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("calls onSwipeLeft when left action button is clicked", () => {
      const onSwipeLeft = vi.fn();
      const { container } = render(
        <SwipeableCard onSwipeLeft={onSwipeLeft} leftActionLabel="Decline">
          <div>Content</div>
        </SwipeableCard>,
      );

      // Show actions
      const wrapper = container.firstChild as HTMLElement;
      fireEvent.keyDown(wrapper, { key: "Enter" });

      // Click left action
      fireEvent.click(screen.getByText("Decline"));

      expect(onSwipeLeft).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("calls onSwipeRight when right action button is clicked", () => {
      const onSwipeRight = vi.fn();
      const { container } = render(
        <SwipeableCard onSwipeRight={onSwipeRight} rightActionLabel="Confirm">
          <div>Content</div>
        </SwipeableCard>,
      );

      // Show actions
      const wrapper = container.firstChild as HTMLElement;
      fireEvent.keyDown(wrapper, { key: "Enter" });

      // Click right action
      fireEvent.click(screen.getByText("Confirm"));

      expect(onSwipeRight).toHaveBeenCalledTimes(1);
    });

    it("shows both action buttons when both actions are provided", () => {
      const { container } = render(
        <SwipeableCard
          onSwipeLeft={() => {}}
          onSwipeRight={() => {}}
          leftActionLabel="Left"
          rightActionLabel="Right"
        >
          <div>Content</div>
        </SwipeableCard>,
      );

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.keyDown(wrapper, { key: "Enter" });

      expect(screen.getByText("Left")).toBeInTheDocument();
      expect(screen.getByText("Right")).toBeInTheDocument();
    });
  });

  describe("touch interactions", () => {
    function createTouchEvent(clientX: number, clientY: number) {
      return {
        touches: [{ clientX, clientY }],
        preventDefault: vi.fn(),
      };
    }

    it("calls onSwipeRight when swiping right past threshold", () => {
      const onSwipeRight = vi.fn();
      render(
        <SwipeableCard onSwipeRight={onSwipeRight}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      // Start touch
      fireEvent.touchStart(content, createTouchEvent(0, 0));

      // Move past threshold (270px * 2 for resistance = 540px movement needed)
      fireEvent.touchMove(content, createTouchEvent(600, 0));

      // End touch
      fireEvent.touchEnd(content);

      expect(onSwipeRight).toHaveBeenCalledTimes(1);
    });

    it("calls onSwipeLeft when swiping left past threshold", () => {
      const onSwipeLeft = vi.fn();
      render(
        <SwipeableCard onSwipeLeft={onSwipeLeft}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      fireEvent.touchStart(content, createTouchEvent(600, 0));
      fireEvent.touchMove(content, createTouchEvent(0, 0));
      fireEvent.touchEnd(content);

      expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    });

    it("does not call action when swipe does not reach threshold", () => {
      const onSwipeRight = vi.fn();
      render(
        <SwipeableCard onSwipeRight={onSwipeRight}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      fireEvent.touchStart(content, createTouchEvent(0, 0));
      fireEvent.touchMove(content, createTouchEvent(50, 0)); // Less than threshold
      fireEvent.touchEnd(content);

      expect(onSwipeRight).not.toHaveBeenCalled();
    });

    it("ignores vertical swipes (allows native scroll)", () => {
      const onSwipeRight = vi.fn();
      render(
        <SwipeableCard onSwipeRight={onSwipeRight}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      // Start with vertical movement
      fireEvent.touchStart(content, createTouchEvent(0, 0));
      fireEvent.touchMove(content, createTouchEvent(5, 20)); // Vertical first
      fireEvent.touchMove(content, createTouchEvent(200, 100)); // Then horizontal
      fireEvent.touchEnd(content);

      // Should not trigger horizontal action because direction was locked to vertical
      expect(onSwipeRight).not.toHaveBeenCalled();
    });

    it("locks direction to horizontal when moving horizontally first", () => {
      const onSwipeRight = vi.fn();
      render(
        <SwipeableCard onSwipeRight={onSwipeRight}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      fireEvent.touchStart(content, createTouchEvent(0, 0));
      // First move is horizontal
      fireEvent.touchMove(content, createTouchEvent(20, 5));
      // Continue horizontal past threshold
      fireEvent.touchMove(content, createTouchEvent(600, 10));
      fireEvent.touchEnd(content);

      expect(onSwipeRight).toHaveBeenCalled();
    });
  });

  describe("mouse interactions", () => {
    it("calls onSwipeRight when dragging right past threshold with mouse", () => {
      const onSwipeRight = vi.fn();
      render(
        <SwipeableCard onSwipeRight={onSwipeRight}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      // Start mouse drag
      fireEvent.mouseDown(content, { clientX: 0, clientY: 0 });

      // Move past threshold (270px * 2 for resistance = 540px movement needed)
      fireEvent.mouseMove(content, { clientX: 600, clientY: 0 });

      // Release mouse
      fireEvent.mouseUp(content);

      expect(onSwipeRight).toHaveBeenCalledTimes(1);
    });

    it("calls onSwipeLeft when dragging left past threshold with mouse", () => {
      const onSwipeLeft = vi.fn();
      render(
        <SwipeableCard onSwipeLeft={onSwipeLeft}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      fireEvent.mouseDown(content, { clientX: 600, clientY: 0 });
      fireEvent.mouseMove(content, { clientX: 0, clientY: 0 });
      fireEvent.mouseUp(content);

      expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    });

    it("does not call action when mouse drag does not reach threshold", () => {
      const onSwipeRight = vi.fn();
      render(
        <SwipeableCard onSwipeRight={onSwipeRight}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      fireEvent.mouseDown(content, { clientX: 0, clientY: 0 });
      fireEvent.mouseMove(content, { clientX: 50, clientY: 0 });
      fireEvent.mouseUp(content);

      expect(onSwipeRight).not.toHaveBeenCalled();
    });

    it("handles mouse leave during drag", () => {
      const onSwipeRight = vi.fn();
      render(
        <SwipeableCard onSwipeRight={onSwipeRight}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      fireEvent.mouseDown(content, { clientX: 0, clientY: 0 });
      fireEvent.mouseMove(content, { clientX: 600, clientY: 0 });
      fireEvent.mouseLeave(content);

      expect(onSwipeRight).toHaveBeenCalledTimes(1);
    });

    it("ignores vertical mouse movements", () => {
      const onSwipeRight = vi.fn();
      render(
        <SwipeableCard onSwipeRight={onSwipeRight}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      fireEvent.mouseDown(content, { clientX: 0, clientY: 0 });
      fireEvent.mouseMove(content, { clientX: 5, clientY: 20 });
      fireEvent.mouseMove(content, { clientX: 200, clientY: 100 });
      fireEvent.mouseUp(content);

      expect(onSwipeRight).not.toHaveBeenCalled();
    });

    it("locks direction to horizontal when moving horizontally first with mouse", () => {
      const onSwipeRight = vi.fn();
      render(
        <SwipeableCard onSwipeRight={onSwipeRight}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      fireEvent.mouseDown(content, { clientX: 0, clientY: 0 });
      fireEvent.mouseMove(content, { clientX: 20, clientY: 5 });
      fireEvent.mouseMove(content, { clientX: 600, clientY: 10 });
      fireEvent.mouseUp(content);

      expect(onSwipeRight).toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("has correct ARIA attributes when has actions", () => {
      const { container } = render(
        <SwipeableCard onSwipeLeft={() => {}}>
          <div>Content</div>
        </SwipeableCard>,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveAttribute("role", "group");
      expect(wrapper).toHaveAttribute(
        "aria-label",
        "Swipeable card with actions. Press Enter to show actions.",
      );
    });

    it("action dialog has correct role", () => {
      const { container } = render(
        <SwipeableCard onSwipeLeft={() => {}}>
          <div>Content</div>
        </SwipeableCard>,
      );

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.keyDown(wrapper, { key: "Enter" });

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-label", "Card actions");
    });
  });

  describe("SwipeConfig API", () => {
    it("accepts single action via swipeConfig", () => {
      const onAction = vi.fn();
      const swipeConfig: SwipeConfig = {
        left: {
          id: "delete",
          label: "Delete",
          color: "bg-red-500",
          onAction,
        },
      };

      render(
        <SwipeableCard swipeConfig={swipeConfig}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      fireEvent.touchStart(content, {
        touches: [{ clientX: 600, clientY: 0 }],
        preventDefault: vi.fn(),
      });
      fireEvent.touchMove(content, {
        touches: [{ clientX: 0, clientY: 0 }],
        preventDefault: vi.fn(),
      });
      fireEvent.touchEnd(content);

      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it("accepts multiple actions via swipeConfig", () => {
      const onEdit = vi.fn();
      const onArchive = vi.fn();
      const swipeConfig: SwipeConfig = {
        left: [
          {
            id: "edit",
            label: "Edit",
            color: "bg-blue-500",
            onAction: onEdit,
          },
          {
            id: "archive",
            label: "Archive",
            color: "bg-gray-500",
            onAction: onArchive,
          },
        ],
      };

      render(
        <SwipeableCard swipeConfig={swipeConfig}>
          <div>Content</div>
        </SwipeableCard>,
      );

      expect(screen.getByText("Content")).toBeInTheDocument();
    });

    it("executes primary action on full swipe with multiple actions", () => {
      const onEdit = vi.fn();
      const onArchive = vi.fn();
      const swipeConfig: SwipeConfig = {
        left: [
          {
            id: "edit",
            label: "Edit",
            color: "bg-blue-500",
            onAction: onEdit,
          },
          {
            id: "archive",
            label: "Archive",
            color: "bg-gray-500",
            onAction: onArchive,
          },
        ],
      };

      render(
        <SwipeableCard swipeConfig={swipeConfig}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      fireEvent.touchStart(content, {
        touches: [{ clientX: 600, clientY: 0 }],
        preventDefault: vi.fn(),
      });
      fireEvent.touchMove(content, {
        touches: [{ clientX: 0, clientY: 0 }],
        preventDefault: vi.fn(),
      });
      fireEvent.touchEnd(content);

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onArchive).not.toHaveBeenCalled();
    });

    it("does not allow swipe when no action defined for direction", () => {
      const onRight = vi.fn();
      const swipeConfig: SwipeConfig = {
        right: {
          id: "confirm",
          label: "Confirm",
          color: "bg-green-500",
          onAction: onRight,
        },
      };

      render(
        <SwipeableCard swipeConfig={swipeConfig}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      fireEvent.touchStart(content, {
        touches: [{ clientX: 200, clientY: 0 }],
        preventDefault: vi.fn(),
      });
      fireEvent.touchMove(content, {
        touches: [{ clientX: 0, clientY: 0 }],
        preventDefault: vi.fn(),
      });
      fireEvent.touchEnd(content);

      expect(onRight).not.toHaveBeenCalled();
    });

    it("is not swipeable when no actions defined", () => {
      const swipeConfig: SwipeConfig = {};
      const { container } = render(
        <SwipeableCard swipeConfig={swipeConfig}>
          <div>Content</div>
        </SwipeableCard>,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).not.toHaveAttribute("tabindex");
      expect(wrapper).not.toHaveAttribute("role");
    });

    it("maintains backward compatibility with old API", () => {
      const onSwipeLeft = vi.fn();
      const onSwipeRight = vi.fn();

      render(
        <SwipeableCard
          onSwipeLeft={onSwipeLeft}
          onSwipeRight={onSwipeRight}
          leftActionLabel="Decline"
          rightActionLabel="Accept"
        >
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      fireEvent.touchStart(content, {
        touches: [{ clientX: 600, clientY: 0 }],
        preventDefault: vi.fn(),
      });
      fireEvent.touchMove(content, {
        touches: [{ clientX: 0, clientY: 0 }],
        preventDefault: vi.fn(),
      });
      fireEvent.touchEnd(content);

      expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    });
  });

  describe("click blocking after drag", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("blocks clicks immediately after a drag gesture with mouse", () => {
      const onSwipeRight = vi.fn();
      render(
        <SwipeableCard onSwipeRight={onSwipeRight}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      // Perform a drag that doesn't trigger action (below threshold)
      fireEvent.mouseDown(content, { clientX: 0, clientY: 0 });
      fireEvent.mouseMove(content, { clientX: 50, clientY: 0 });
      fireEvent.mouseUp(content);

      // Verify pointer-events is set to 'none'
      expect(content).toHaveStyle({ pointerEvents: "none" });
    });

    it("unblocks clicks after delay", () => {
      const onSwipeRight = vi.fn();
      render(
        <SwipeableCard onSwipeRight={onSwipeRight}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      fireEvent.mouseDown(content, { clientX: 0, clientY: 0 });
      fireEvent.mouseMove(content, { clientX: 50, clientY: 0 });
      fireEvent.mouseUp(content);

      // Blocked immediately
      expect(content).toHaveStyle({ pointerEvents: "none" });

      // Advance timers past the delay (150ms)
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Should be unblocked
      expect(content).toHaveStyle({ pointerEvents: "auto" });
    });

    it("does not block clicks when no drag occurred", () => {
      const onSwipeRight = vi.fn();
      render(
        <SwipeableCard onSwipeRight={onSwipeRight}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      // Click without dragging (no move event)
      fireEvent.mouseDown(content, { clientX: 0, clientY: 0 });
      fireEvent.mouseUp(content);

      // Should not be blocked
      expect(content).toHaveStyle({ pointerEvents: "auto" });
    });

    it("does not block clicks for vertical swipes", () => {
      const onSwipeRight = vi.fn();
      render(
        <SwipeableCard onSwipeRight={onSwipeRight}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      // Vertical swipe (should be ignored)
      fireEvent.mouseDown(content, { clientX: 0, clientY: 0 });
      fireEvent.mouseMove(content, { clientX: 5, clientY: 50 });
      fireEvent.mouseUp(content);

      // Should not be blocked because no horizontal drag occurred
      expect(content).toHaveStyle({ pointerEvents: "auto" });
    });

    it("resets timeout when dragging multiple times rapidly", () => {
      const onSwipeRight = vi.fn();
      render(
        <SwipeableCard onSwipeRight={onSwipeRight}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      // First drag
      fireEvent.mouseDown(content, { clientX: 0, clientY: 0 });
      fireEvent.mouseMove(content, { clientX: 50, clientY: 0 });
      fireEvent.mouseUp(content);

      expect(content).toHaveStyle({ pointerEvents: "none" });

      // Advance time partially
      act(() => {
        vi.advanceTimersByTime(50);
      });

      // Still blocked
      expect(content).toHaveStyle({ pointerEvents: "none" });

      // Second drag before first timeout completes
      fireEvent.mouseDown(content, { clientX: 0, clientY: 0 });
      fireEvent.mouseMove(content, { clientX: 50, clientY: 0 });
      fireEvent.mouseUp(content);

      // Still blocked
      expect(content).toHaveStyle({ pointerEvents: "none" });

      // Advance 150ms from second drag
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Now should be unblocked
      expect(content).toHaveStyle({ pointerEvents: "auto" });
    });

    it("blocks clicks after touch drag gesture", () => {
      const onSwipeRight = vi.fn();
      render(
        <SwipeableCard onSwipeRight={onSwipeRight}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      // Perform a touch drag below threshold
      fireEvent.touchStart(content, {
        touches: [{ clientX: 0, clientY: 0 }],
        preventDefault: vi.fn(),
      });
      fireEvent.touchMove(content, {
        touches: [{ clientX: 50, clientY: 0 }],
        preventDefault: vi.fn(),
      });
      fireEvent.touchEnd(content);

      // Should be blocked
      expect(content).toHaveStyle({ pointerEvents: "none" });

      // Advance timers (150ms)
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Should be unblocked
      expect(content).toHaveStyle({ pointerEvents: "auto" });
    });

    it("blocks clicks when drawer is open via onClickCapture", () => {
      const onSwipeRight = vi.fn();
      const childClickHandler = vi.fn();

      render(
        <SwipeableCard onSwipeRight={onSwipeRight}>
          <button data-testid="child-button" onClick={childClickHandler}>
            Click me
          </button>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("child-button")
        .parentElement as HTMLElement;

      // Open the drawer by swiping past drawer threshold but not full swipe
      fireEvent.mouseDown(content, { clientX: 0, clientY: 0 });
      fireEvent.mouseMove(content, { clientX: 150, clientY: 0 });
      fireEvent.mouseUp(content);

      // Wait for click block to clear
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // The drawer should be open now, try clicking the child button
      const childButton = screen.getByTestId("child-button");
      fireEvent.click(childButton);

      // Child click should be blocked because drawer is open
      expect(childClickHandler).not.toHaveBeenCalled();
    });
  });

  describe("responsive behavior", () => {
    it("adjusts thresholds based on container width", async () => {
      const onSwipeRight = vi.fn();

      Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
        configurable: true,
        value: 300,
      });

      render(
        <SwipeableCard onSwipeRight={onSwipeRight}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      fireEvent.touchStart(content, {
        touches: [{ clientX: 0, clientY: 0 }],
        preventDefault: vi.fn(),
      });
      fireEvent.touchMove(content, {
        touches: [{ clientX: 450, clientY: 0 }],
        preventDefault: vi.fn(),
      });
      fireEvent.touchEnd(content);

      expect(onSwipeRight).toHaveBeenCalledTimes(1);
    });

    it("handles narrow containers correctly", async () => {
      const onSwipeRight = vi.fn();

      Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
        configurable: true,
        value: 200,
      });

      render(
        <SwipeableCard onSwipeRight={onSwipeRight}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      fireEvent.touchStart(content, {
        touches: [{ clientX: 0, clientY: 0 }],
        preventDefault: vi.fn(),
      });
      fireEvent.touchMove(content, {
        touches: [{ clientX: 300, clientY: 0 }],
        preventDefault: vi.fn(),
      });
      fireEvent.touchEnd(content);

      expect(onSwipeRight).toHaveBeenCalledTimes(1);
    });

    it("handles wide containers correctly", async () => {
      const onSwipeRight = vi.fn();

      Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
        configurable: true,
        value: 600,
      });

      render(
        <SwipeableCard onSwipeRight={onSwipeRight}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      fireEvent.touchStart(content, {
        touches: [{ clientX: 0, clientY: 0 }],
        preventDefault: vi.fn(),
      });
      fireEvent.touchMove(content, {
        touches: [{ clientX: 900, clientY: 0 }],
        preventDefault: vi.fn(),
      });
      fireEvent.touchEnd(content);

      expect(onSwipeRight).toHaveBeenCalledTimes(1);
    });

    it("does not trigger swipe with zero width container", async () => {
      const onSwipeRight = vi.fn();

      Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
        configurable: true,
        value: 0,
      });

      render(
        <SwipeableCard onSwipeRight={onSwipeRight}>
          <div data-testid="content">Content</div>
        </SwipeableCard>,
      );

      const content = screen.getByTestId("content")
        .parentElement as HTMLElement;

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      fireEvent.touchStart(content, {
        touches: [{ clientX: 0, clientY: 0 }],
        preventDefault: vi.fn(),
      });
      fireEvent.touchMove(content, {
        touches: [{ clientX: 600, clientY: 0 }],
        preventDefault: vi.fn(),
      });
      fireEvent.touchEnd(content);

      expect(onSwipeRight).not.toHaveBeenCalled();
    });
  });
});
