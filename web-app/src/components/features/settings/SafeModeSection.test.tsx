import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SafeModeSection } from "./SafeModeSection";

// Mock useTranslation hook
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "settings.safeMode": "Safe Mode",
        "settings.safeModeDescription":
          "When enabled, you must confirm before taking or withdrawing from exchanges.",
        "settings.safeModeEnabled": "Safe mode is enabled",
        "settings.safeModeDisabled": "Safe mode is disabled",
        "settings.safeModeDangerous": "Actions will be performed immediately!",
      };
      return translations[key] || key;
    },
  }),
}));

// Mock SafeModeWarningModal - use lazy loading mock
vi.mock("@/components/features/SafeModeWarningModal", () => ({
  SafeModeWarningModal: ({
    isOpen,
    onClose,
    onConfirm,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
  }) =>
    isOpen ? (
      <div data-testid="safe-mode-warning-modal">
        <button onClick={onClose} data-testid="modal-close">
          Close
        </button>
        <button onClick={onConfirm} data-testid="modal-confirm">
          Confirm
        </button>
      </div>
    ) : null,
}));

describe("SafeModeSection", () => {
  const defaultProps = {
    isSafeModeEnabled: true,
    onSetSafeMode: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders section heading", () => {
    render(<SafeModeSection {...defaultProps} />);

    expect(screen.getByText("Safe Mode")).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(<SafeModeSection {...defaultProps} />);

    expect(
      screen.getByText(/When enabled, you must confirm before/i)
    ).toBeInTheDocument();
  });

  it("shows enabled status when safe mode is on", () => {
    render(<SafeModeSection {...defaultProps} isSafeModeEnabled={true} />);

    expect(screen.getByText("Safe mode is enabled")).toBeInTheDocument();
  });

  it("shows disabled status when safe mode is off", () => {
    render(<SafeModeSection {...defaultProps} isSafeModeEnabled={false} />);

    expect(screen.getByText("Safe mode is disabled")).toBeInTheDocument();
  });

  it("shows warning message when safe mode is disabled", () => {
    render(<SafeModeSection {...defaultProps} isSafeModeEnabled={false} />);

    expect(
      screen.getByText("Actions will be performed immediately!")
    ).toBeInTheDocument();
  });

  it("does not show warning message when safe mode is enabled", () => {
    render(<SafeModeSection {...defaultProps} isSafeModeEnabled={true} />);

    expect(
      screen.queryByText("Actions will be performed immediately!")
    ).not.toBeInTheDocument();
  });

  it("shows warning icon when safe mode is disabled", () => {
    render(<SafeModeSection {...defaultProps} isSafeModeEnabled={false} />);

    // SVG element with aria-hidden
    const svg = document.querySelector("svg[aria-hidden='true']");
    expect(svg).toBeInTheDocument();
  });

  it("has toggle switch with correct aria attributes when enabled", () => {
    render(<SafeModeSection {...defaultProps} isSafeModeEnabled={true} />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(toggle).toHaveAttribute("aria-label", "Safe Mode");
  });

  it("has toggle switch with correct aria attributes when disabled", () => {
    render(<SafeModeSection {...defaultProps} isSafeModeEnabled={false} />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("enables safe mode directly when toggling from off to on", async () => {
    const onSetSafeMode = vi.fn();
    const user = userEvent.setup();

    render(
      <SafeModeSection
        isSafeModeEnabled={false}
        onSetSafeMode={onSetSafeMode}
      />
    );

    await user.click(screen.getByRole("switch"));

    expect(onSetSafeMode).toHaveBeenCalledWith(true);
  });

  it("shows warning modal when trying to disable safe mode", async () => {
    const user = userEvent.setup();

    render(<SafeModeSection {...defaultProps} isSafeModeEnabled={true} />);

    await user.click(screen.getByRole("switch"));

    await waitFor(() => {
      expect(screen.getByTestId("safe-mode-warning-modal")).toBeInTheDocument();
    });
  });

  it("closes warning modal without disabling when close is clicked", async () => {
    const onSetSafeMode = vi.fn();
    const user = userEvent.setup();

    render(
      <SafeModeSection isSafeModeEnabled={true} onSetSafeMode={onSetSafeMode} />
    );

    await user.click(screen.getByRole("switch"));

    await waitFor(() => {
      expect(screen.getByTestId("safe-mode-warning-modal")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("modal-close"));

    await waitFor(() => {
      expect(
        screen.queryByTestId("safe-mode-warning-modal")
      ).not.toBeInTheDocument();
    });

    expect(onSetSafeMode).not.toHaveBeenCalled();
  });

  it("disables safe mode when confirm is clicked in warning modal", async () => {
    const onSetSafeMode = vi.fn();
    const user = userEvent.setup();

    render(
      <SafeModeSection isSafeModeEnabled={true} onSetSafeMode={onSetSafeMode} />
    );

    await user.click(screen.getByRole("switch"));

    await waitFor(() => {
      expect(screen.getByTestId("safe-mode-warning-modal")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("modal-confirm"));

    expect(onSetSafeMode).toHaveBeenCalledWith(false);
  });

  it("applies correct styling to toggle when enabled", () => {
    render(<SafeModeSection {...defaultProps} isSafeModeEnabled={true} />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveClass("bg-success-600");
  });

  it("applies correct styling to toggle when disabled", () => {
    render(<SafeModeSection {...defaultProps} isSafeModeEnabled={false} />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveClass("bg-surface-muted");
  });
});
