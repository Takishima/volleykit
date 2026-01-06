import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccessibilitySection } from "./AccessibilitySection";

// Mock useTranslation hook
vi.mock("@/shared/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "settings.accessibility.title": "Accessibility",
        "settings.accessibility.description":
          "Adjust accessibility settings to customize your experience.",
        "settings.accessibility.preventZoom": "Prevent browser zoom",
        "settings.accessibility.preventZoomDescription":
          "Disable pinch-to-zoom and double-tap zoom on touch devices.",
        "settings.accessibility.preventZoomEnabled":
          "Zoom prevention is enabled",
        "settings.accessibility.preventZoomDisabled":
          "Zoom prevention is disabled",
      };
      return translations[key] || key;
    },
  }),
}));

describe("AccessibilitySection", () => {
  const defaultProps = {
    preventZoom: false,
    onSetPreventZoom: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders section heading", () => {
    render(<AccessibilitySection {...defaultProps} />);

    expect(screen.getByText("Accessibility")).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(<AccessibilitySection {...defaultProps} />);

    expect(
      screen.getByText(/Adjust accessibility settings/i)
    ).toBeInTheDocument();
  });

  it("renders prevent zoom setting label", () => {
    render(<AccessibilitySection {...defaultProps} />);

    expect(screen.getByText("Prevent browser zoom")).toBeInTheDocument();
  });

  it("renders prevent zoom description", () => {
    render(<AccessibilitySection {...defaultProps} />);

    expect(
      screen.getByText(/Disable pinch-to-zoom and double-tap zoom/i)
    ).toBeInTheDocument();
  });

  it("shows disabled status when prevent zoom is off", () => {
    render(<AccessibilitySection {...defaultProps} preventZoom={false} />);

    expect(screen.getByText("Zoom prevention is disabled")).toBeInTheDocument();
  });

  it("shows enabled status when prevent zoom is on", () => {
    render(<AccessibilitySection {...defaultProps} preventZoom={true} />);

    expect(screen.getByText("Zoom prevention is enabled")).toBeInTheDocument();
  });

  it("has toggle switch with correct aria attributes when disabled", () => {
    render(<AccessibilitySection {...defaultProps} preventZoom={false} />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(toggle).toHaveAttribute("aria-label", "Prevent browser zoom");
  });

  it("has toggle switch with correct aria attributes when enabled", () => {
    render(<AccessibilitySection {...defaultProps} preventZoom={true} />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("calls onSetPreventZoom with true when toggling from off to on", async () => {
    const onSetPreventZoom = vi.fn();
    const user = userEvent.setup();

    render(
      <AccessibilitySection
        preventZoom={false}
        onSetPreventZoom={onSetPreventZoom}
      />
    );

    await user.click(screen.getByRole("switch"));

    expect(onSetPreventZoom).toHaveBeenCalledWith(true);
  });

  it("calls onSetPreventZoom with false when toggling from on to off", async () => {
    const onSetPreventZoom = vi.fn();
    const user = userEvent.setup();

    render(
      <AccessibilitySection
        preventZoom={true}
        onSetPreventZoom={onSetPreventZoom}
      />
    );

    await user.click(screen.getByRole("switch"));

    expect(onSetPreventZoom).toHaveBeenCalledWith(false);
  });

  it("applies correct styling to toggle when enabled", () => {
    render(<AccessibilitySection {...defaultProps} preventZoom={true} />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveClass("bg-primary-600");
  });

  it("applies correct styling to toggle when disabled", () => {
    render(<AccessibilitySection {...defaultProps} preventZoom={false} />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveClass("bg-surface-muted");
  });
});
