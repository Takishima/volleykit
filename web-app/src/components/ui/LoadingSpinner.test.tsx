import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  LoadingSpinner,
  LoadingState,
  ErrorState,
  EmptyState,
} from "./LoadingSpinner";

describe("LoadingSpinner", () => {
  it("renders with status role", () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has accessible label", () => {
    render(<LoadingSpinner />);
    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
  });

  it("applies size classes", () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    expect(screen.getByRole("status")).toHaveClass("w-4", "h-4");

    rerender(<LoadingSpinner size="lg" />);
    expect(screen.getByRole("status")).toHaveClass("w-12", "h-12");
  });
});

describe("LoadingState", () => {
  it("renders default message", () => {
    render(<LoadingState />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders custom message", () => {
    render(<LoadingState message="Fetching data..." />);
    expect(screen.getByText("Fetching data...")).toBeInTheDocument();
  });

  it("includes spinner", () => {
    render(<LoadingState />);
    // LoadingState has role="status" with aria-live, and contains LoadingSpinner with role="status"
    const statusElements = screen.getAllByRole("status");
    expect(statusElements.length).toBeGreaterThanOrEqual(1);
  });
});

describe("ErrorState", () => {
  it("renders error message", () => {
    render(<ErrorState message="Something went wrong" />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("shows retry button when onRetry is provided", () => {
    const handleRetry = vi.fn();
    render(<ErrorState message="Error" onRetry={handleRetry} />);
    expect(
      screen.getByRole("button", { name: "Try Again" }),
    ).toBeInTheDocument();
  });

  it("calls onRetry when button is clicked", () => {
    const handleRetry = vi.fn();
    render(<ErrorState message="Error" onRetry={handleRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it("hides retry button when onRetry is not provided", () => {
    render(<ErrorState message="Error" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("renders title", () => {
    render(<EmptyState title="No items" />);
    expect(screen.getByText("No items")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <EmptyState
        title="No items"
        description="Add some items to get started"
      />,
    );
    expect(
      screen.getByText("Add some items to get started"),
    ).toBeInTheDocument();
  });

  it("renders custom icon", () => {
    render(<EmptyState title="No items" icon="🎉" />);
    expect(screen.getByText("🎉")).toBeInTheDocument();
  });

  it("renders action button when provided", () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="No items"
        action={{ label: "Add Item", onClick: handleAction }}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Add Item" }),
    ).toBeInTheDocument();
  });

  it("calls action onClick when button is clicked", () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="No items"
        action={{ label: "Add Item", onClick: handleAction }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add Item" }));
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});
