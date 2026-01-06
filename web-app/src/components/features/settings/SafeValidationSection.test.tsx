import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SafeValidationSection } from "./SafeValidationSection";

// Mock useTranslation hook
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "settings.safeValidation": "Safe Validation Mode",
        "settings.safeValidationDescription":
          "When enabled, validation saves your changes but does not finalize the game.",
        "settings.safeValidationEnabled": "Safe validation is enabled",
        "settings.safeValidationDisabled":
          "Safe validation is disabled - games will be finalized directly",
      };
      return translations[key] || key;
    },
  }),
}));

describe("SafeValidationSection", () => {
  const defaultProps = {
    isSafeValidationEnabled: true,
    onSetSafeValidation: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders section heading", () => {
    render(<SafeValidationSection {...defaultProps} />);

    expect(screen.getByText("Safe Validation Mode")).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(<SafeValidationSection {...defaultProps} />);

    expect(
      screen.getByText(/When enabled, validation saves your changes/i)
    ).toBeInTheDocument();
  });

  it("shows enabled status when safe validation is on", () => {
    render(
      <SafeValidationSection {...defaultProps} isSafeValidationEnabled={true} />
    );

    expect(screen.getByText("Safe validation is enabled")).toBeInTheDocument();
  });

  it("shows disabled status when safe validation is off", () => {
    render(
      <SafeValidationSection
        {...defaultProps}
        isSafeValidationEnabled={false}
      />
    );

    expect(
      screen.getByText("Safe validation is disabled - games will be finalized directly")
    ).toBeInTheDocument();
  });

  it("has toggle switch with correct aria attributes when enabled", () => {
    render(
      <SafeValidationSection {...defaultProps} isSafeValidationEnabled={true} />
    );

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(toggle).toHaveAttribute("aria-label", "Safe Validation Mode");
  });

  it("has toggle switch with correct aria attributes when disabled", () => {
    render(
      <SafeValidationSection
        {...defaultProps}
        isSafeValidationEnabled={false}
      />
    );

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("toggles safe validation when clicked", async () => {
    const onSetSafeValidation = vi.fn();
    const user = userEvent.setup();

    render(
      <SafeValidationSection
        isSafeValidationEnabled={true}
        onSetSafeValidation={onSetSafeValidation}
      />
    );

    await user.click(screen.getByRole("switch"));

    expect(onSetSafeValidation).toHaveBeenCalledWith(false);
  });

  it("enables safe validation when toggling from off to on", async () => {
    const onSetSafeValidation = vi.fn();
    const user = userEvent.setup();

    render(
      <SafeValidationSection
        isSafeValidationEnabled={false}
        onSetSafeValidation={onSetSafeValidation}
      />
    );

    await user.click(screen.getByRole("switch"));

    expect(onSetSafeValidation).toHaveBeenCalledWith(true);
  });

  it("applies correct styling to toggle when enabled", () => {
    render(
      <SafeValidationSection {...defaultProps} isSafeValidationEnabled={true} />
    );

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveClass("bg-success-600");
  });

  it("applies correct styling to toggle when disabled", () => {
    render(
      <SafeValidationSection
        {...defaultProps}
        isSafeValidationEnabled={false}
      />
    );

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveClass("bg-surface-muted");
  });
});
