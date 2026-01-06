import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ValidatedModeButtons, EditModeButtons } from "./WizardButtons";

// Mock useTranslation hook
vi.mock("@/shared/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "validation.wizard.previous": "Previous",
        "validation.wizard.next": "Next",
        "validation.wizard.validate": "Validate",
        "validation.wizard.finish": "Finish",
        "validation.state.markAllStepsTooltip": "Complete all required steps first",
        "common.close": "Close",
        "common.cancel": "Cancel",
        "common.loading": "Loading...",
      };
      return translations[key] || key;
    },
  }),
}));

describe("ValidatedModeButtons", () => {
  const defaultProps = {
    navigation: { isFirstStep: false, isLastStep: false },
    onBack: vi.fn(),
    onNext: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Previous and Next buttons on middle step", () => {
    render(<ValidatedModeButtons {...defaultProps} />);

    expect(screen.getByRole("button", { name: "Previous" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  it("hides Previous button on first step", () => {
    render(
      <ValidatedModeButtons
        {...defaultProps}
        navigation={{ isFirstStep: true, isLastStep: false }}
      />
    );

    expect(screen.queryByRole("button", { name: "Previous" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  it("shows Close button instead of Next on last step", () => {
    render(
      <ValidatedModeButtons
        {...defaultProps}
        navigation={{ isFirstStep: false, isLastStep: true }}
      />
    );

    expect(screen.getByRole("button", { name: "Previous" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });

  it("calls onBack when Previous button is clicked", async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();

    render(<ValidatedModeButtons {...defaultProps} onBack={onBack} />);

    await user.click(screen.getByRole("button", { name: "Previous" }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("calls onNext when Next button is clicked", async () => {
    const onNext = vi.fn();
    const user = userEvent.setup();

    render(<ValidatedModeButtons {...defaultProps} onNext={onNext} />);

    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Close button is clicked on last step", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <ValidatedModeButtons
        {...defaultProps}
        navigation={{ isFirstStep: false, isLastStep: true }}
        onClose={onClose}
      />
    );

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("EditModeButtons", () => {
  const defaultState = {
    isFinalizing: false,
    isLoadingGameDetails: false,
    hasGameDetailsError: false,
    canMarkCurrentStepDone: true,
    allPreviousRequiredStepsDone: true,
    currentStepIsOptional: false,
  };

  const defaultProps = {
    navigation: { isFirstStep: false, isLastStep: false },
    state: defaultState,
    onAttemptClose: vi.fn(),
    onBack: vi.fn(),
    onValidateAndNext: vi.fn(),
    onFinish: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows Cancel button on first step", () => {
    render(
      <EditModeButtons
        {...defaultProps}
        navigation={{ isFirstStep: true, isLastStep: false }}
      />
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Previous" })).not.toBeInTheDocument();
  });

  it("shows Previous button on non-first step", () => {
    render(<EditModeButtons {...defaultProps} />);

    expect(screen.getByRole("button", { name: "Previous" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("shows Validate button on non-last step", () => {
    render(<EditModeButtons {...defaultProps} />);

    expect(screen.getByRole("button", { name: "Validate" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Finish" })).not.toBeInTheDocument();
  });

  it("shows Finish button on last step", () => {
    render(
      <EditModeButtons
        {...defaultProps}
        navigation={{ isFirstStep: false, isLastStep: true }}
      />
    );

    expect(screen.getByRole("button", { name: "Finish" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Validate" })).not.toBeInTheDocument();
  });

  it("calls onAttemptClose when Cancel button is clicked", async () => {
    const onAttemptClose = vi.fn();
    const user = userEvent.setup();

    render(
      <EditModeButtons
        {...defaultProps}
        navigation={{ isFirstStep: true, isLastStep: false }}
        onAttemptClose={onAttemptClose}
      />
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onAttemptClose).toHaveBeenCalledTimes(1);
  });

  it("calls onBack when Previous button is clicked", async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();

    render(<EditModeButtons {...defaultProps} onBack={onBack} />);

    await user.click(screen.getByRole("button", { name: "Previous" }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("calls onValidateAndNext when Validate button is clicked", async () => {
    const onValidateAndNext = vi.fn();
    const user = userEvent.setup();

    render(
      <EditModeButtons {...defaultProps} onValidateAndNext={onValidateAndNext} />
    );

    await user.click(screen.getByRole("button", { name: "Validate" }));

    expect(onValidateAndNext).toHaveBeenCalledTimes(1);
  });

  it("calls onFinish when Finish button is clicked", async () => {
    const onFinish = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <EditModeButtons
        {...defaultProps}
        navigation={{ isFirstStep: false, isLastStep: true }}
        onFinish={onFinish}
      />
    );

    await user.click(screen.getByRole("button", { name: "Finish" }));

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("disables buttons when isFinalizing is true", () => {
    render(
      <EditModeButtons
        {...defaultProps}
        state={{ ...defaultState, isFinalizing: true }}
        navigation={{ isFirstStep: true, isLastStep: true }}
      />
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Loading..." })).toBeDisabled();
  });

  it("disables buttons when isLoadingGameDetails is true", () => {
    render(
      <EditModeButtons
        {...defaultProps}
        state={{ ...defaultState, isLoadingGameDetails: true }}
      />
    );

    expect(screen.getByRole("button", { name: "Validate" })).toBeDisabled();
  });

  it("disables buttons when hasGameDetailsError is true", () => {
    render(
      <EditModeButtons
        {...defaultProps}
        state={{ ...defaultState, hasGameDetailsError: true }}
      />
    );

    expect(screen.getByRole("button", { name: "Validate" })).toBeDisabled();
  });

  it("disables Validate when canMarkCurrentStepDone is false", () => {
    render(
      <EditModeButtons
        {...defaultProps}
        state={{ ...defaultState, canMarkCurrentStepDone: false }}
      />
    );

    expect(screen.getByRole("button", { name: "Validate" })).toBeDisabled();
  });

  it("disables Finish when allPreviousRequiredStepsDone is false", () => {
    render(
      <EditModeButtons
        {...defaultProps}
        navigation={{ isFirstStep: false, isLastStep: true }}
        state={{ ...defaultState, allPreviousRequiredStepsDone: false }}
      />
    );

    const finishButton = screen.getByRole("button", { name: "Finish" });
    expect(finishButton).toBeDisabled();
    expect(finishButton).toHaveAttribute("title", "Complete all required steps first");
  });

  it("enables Finish when currentStepIsOptional even if canMarkCurrentStepDone is false", () => {
    render(
      <EditModeButtons
        {...defaultProps}
        navigation={{ isFirstStep: false, isLastStep: true }}
        state={{
          ...defaultState,
          canMarkCurrentStepDone: false,
          currentStepIsOptional: true,
        }}
      />
    );

    expect(screen.getByRole("button", { name: "Finish" })).not.toBeDisabled();
  });

  it("shows Loading... text when finalizing", () => {
    render(
      <EditModeButtons
        {...defaultProps}
        navigation={{ isFirstStep: false, isLastStep: true }}
        state={{ ...defaultState, isFinalizing: true }}
      />
    );

    expect(screen.getByRole("button", { name: "Loading..." })).toBeInTheDocument();
  });
});
