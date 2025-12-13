import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
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
      registrationError: null,
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

  it("calls updateApp when reload button is clicked", async () => {
    mockUpdateApp.mockResolvedValue(undefined);
    setupMock(false, true);
    render(<ReloadPromptPWA />);
    const reloadButton = screen.getByRole("button", {
      name: /reload application/i,
    });
    await act(async () => {
      fireEvent.click(reloadButton);
    });
    expect(mockUpdateApp).toHaveBeenCalled();
  });

  it("disables reload button and shows loading text while updating", async () => {
    let resolveUpdate: () => void;
    mockUpdateApp.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdate = resolve;
        }),
    );
    setupMock(false, true);
    render(<ReloadPromptPWA />);

    const reloadButton = screen.getByRole("button", {
      name: /reload application/i,
    });
    expect(reloadButton).not.toBeDisabled();
    expect(reloadButton).toHaveTextContent("Reload");

    // Start the update
    act(() => {
      fireEvent.click(reloadButton);
    });

    // Button should be disabled and show loading text
    await waitFor(() => {
      expect(reloadButton).toBeDisabled();
      expect(reloadButton).toHaveTextContent("Reloading...");
      expect(reloadButton).toHaveAttribute("aria-busy", "true");
    });

    // Resolve the update
    await act(async () => {
      resolveUpdate!();
    });

    // Button should return to normal
    await waitFor(() => {
      expect(reloadButton).not.toBeDisabled();
      expect(reloadButton).toHaveTextContent("Reload");
    });
  });

  it("prevents multiple clicks while updating", async () => {
    let resolveUpdate: () => void;
    mockUpdateApp.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdate = resolve;
        }),
    );
    setupMock(false, true);
    render(<ReloadPromptPWA />);

    const reloadButton = screen.getByRole("button", {
      name: /reload application/i,
    });

    // Start first update
    act(() => {
      fireEvent.click(reloadButton);
    });

    // Try to click again while updating
    act(() => {
      fireEvent.click(reloadButton);
    });

    // Should only be called once
    expect(mockUpdateApp).toHaveBeenCalledTimes(1);

    // Cleanup
    await act(async () => {
      resolveUpdate!();
    });
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
