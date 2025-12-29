import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TourTooltip } from "./TourTooltip";

// Mock useTranslation hook
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "tour.test.title": "Test Title",
        "tour.test.description": "Test Description",
        "tour.actions.skip": "Skip",
        "tour.actions.next": "Next",
        "tour.actions.previous": "Previous",
        "tour.actions.finish": "Finish",
      };
      return translations[key] || key;
    },
    tInterpolate: (_key: string, values: Record<string, unknown>) =>
      `Step ${values.step} of ${values.total}`,
  }),
}));

describe("TourTooltip", () => {
  const defaultProps = {
    titleKey: "tour.test.title",
    descriptionKey: "tour.test.description",
    currentStep: 0,
    totalSteps: 3,
    onSkip: vi.fn(),
    onNext: vi.fn(),
    onPrevious: vi.fn(),
    isLastStep: false,
    isFirstStep: true,
  };

  it("renders title and description", () => {
    render(<TourTooltip {...defaultProps} />);

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
  });

  it("displays step indicator with correct count", () => {
    render(<TourTooltip {...defaultProps} currentStep={1} totalSteps={4} />);

    expect(screen.getByText("2/4")).toBeInTheDocument();
    // Should have 4 step dots
    const dots = screen.getAllByRole("generic").filter((el) =>
      el.className.includes("rounded-full")
    );
    expect(dots).toHaveLength(4);
  });

  it("calls onSkip when skip button is clicked", async () => {
    const onSkip = vi.fn();
    const user = userEvent.setup();

    render(<TourTooltip {...defaultProps} onSkip={onSkip} />);

    const skipButton = screen.getByRole("button", { name: "Skip" });
    await user.click(skipButton);

    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("calls onNext when next button is clicked", async () => {
    const onNext = vi.fn();
    const user = userEvent.setup();

    render(<TourTooltip {...defaultProps} onNext={onNext} />);

    const nextButton = screen.getByRole("button", { name: "Next" });
    await user.click(nextButton);

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("calls onPrevious when previous button is clicked", async () => {
    const onPrevious = vi.fn();
    const user = userEvent.setup();

    render(
      <TourTooltip
        {...defaultProps}
        isFirstStep={false}
        onPrevious={onPrevious}
      />
    );

    const prevButton = screen.getByRole("button", { name: "Previous" });
    await user.click(prevButton);

    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it("hides previous button on first step", () => {
    render(<TourTooltip {...defaultProps} isFirstStep={true} />);

    expect(
      screen.queryByRole("button", { name: "Previous" })
    ).not.toBeInTheDocument();
  });

  it("shows previous button on non-first steps", () => {
    render(
      <TourTooltip {...defaultProps} isFirstStep={false} currentStep={1} />
    );

    expect(
      screen.getByRole("button", { name: "Previous" })
    ).toBeInTheDocument();
  });

  it("shows 'Finish' button on last step instead of 'Next'", () => {
    render(<TourTooltip {...defaultProps} isLastStep={true} />);

    expect(screen.getByRole("button", { name: "Finish" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Next" })
    ).not.toBeInTheDocument();
  });

  it("highlights current step dot", () => {
    render(<TourTooltip {...defaultProps} currentStep={1} totalSteps={3} />);

    const dots = screen.getAllByRole("generic").filter((el) =>
      el.className.includes("rounded-full") && el.className.includes("w-2")
    );

    // Second dot (index 1) should be highlighted with primary color
    expect(dots[1]).toHaveClass("bg-primary-500");
    // First dot (completed) should have different style
    expect(dots[0]).toHaveClass("bg-primary-300");
    // Third dot (future) should have muted style
    expect(dots[2]).toHaveClass("bg-surface-muted");
  });

  it("does not render next button when onNext is undefined", () => {
    render(<TourTooltip {...defaultProps} onNext={undefined} />);

    expect(
      screen.queryByRole("button", { name: "Next" })
    ).not.toBeInTheDocument();
  });

  it("does not render previous button when onPrevious is undefined", () => {
    render(
      <TourTooltip
        {...defaultProps}
        isFirstStep={false}
        onPrevious={undefined}
      />
    );

    expect(
      screen.queryByRole("button", { name: "Previous" })
    ).not.toBeInTheDocument();
  });
});
