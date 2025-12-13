import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ReloadPromptPWA from "./ReloadPromptPWA";
import * as PWAContext from "@/contexts/PWAContext";

describe("ReloadPromptPWA", () => {
  const mockUpdateApp = vi.fn();
  const mockDismissPrompt = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMock = (offlineReady: boolean, needRefresh: boolean) => {
    vi.spyOn(PWAContext, "usePWA").mockReturnValue({
      offlineReady,
      needRefresh,
      isChecking: false,
      lastChecked: null,
      checkError: null,
      checkForUpdate: vi.fn(),
      updateApp: mockUpdateApp,
      dismissPrompt: mockDismissPrompt,
    });
  };

  it("renders nothing when offline is not ready and refresh is not needed", () => {
    setupMock(false, false);
    const { container } = render(<ReloadPromptPWA />);
    expect(container.firstChild).toBeNull();
  });

  it("renders offline ready message when offline is ready", () => {
    setupMock(true, false);
    render(<ReloadPromptPWA />);
    expect(screen.getByText("App ready for offline use")).toBeInTheDocument();
    expect(
      screen.getByText("Content has been cached for offline access."),
    ).toBeInTheDocument();
  });

  it("renders update available message when refresh is needed", () => {
    setupMock(false, true);
    render(<ReloadPromptPWA />);
    expect(screen.getByText("New version available")).toBeInTheDocument();
    expect(
      screen.getByText("Click reload to update to the latest version."),
    ).toBeInTheDocument();
  });

  it("has proper accessibility attributes", () => {
    setupMock(false, true);
    render(<ReloadPromptPWA />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "polite");
  });

  it("shows reload button when refresh is needed", () => {
    setupMock(false, true);
    render(<ReloadPromptPWA />);
    const reloadButton = screen.getByRole("button", {
      name: /reload application/i,
    });
    expect(reloadButton).toBeInTheDocument();
  });

  it("does not show reload button when only offline ready", () => {
    setupMock(true, false);
    render(<ReloadPromptPWA />);
    expect(
      screen.queryByRole("button", { name: /reload application/i }),
    ).not.toBeInTheDocument();
  });

  it("calls updateApp when reload button is clicked", () => {
    setupMock(false, true);
    render(<ReloadPromptPWA />);
    const reloadButton = screen.getByRole("button", {
      name: /reload application/i,
    });
    fireEvent.click(reloadButton);
    expect(mockUpdateApp).toHaveBeenCalled();
  });

  it("calls dismissPrompt when close button is clicked", () => {
    setupMock(false, true);
    render(<ReloadPromptPWA />);
    const dismissButton = screen.getByRole("button", {
      name: /dismiss update notification/i,
    });
    fireEvent.click(dismissButton);
    expect(mockDismissPrompt).toHaveBeenCalled();
  });

  it('shows "Dismiss" text when refresh is needed', () => {
    setupMock(false, true);
    render(<ReloadPromptPWA />);
    expect(screen.getByText("Dismiss")).toBeInTheDocument();
  });

  it('shows "Close" text when only offline ready', () => {
    setupMock(true, false);
    render(<ReloadPromptPWA />);
    expect(screen.getByText("Close")).toBeInTheDocument();
  });
});
