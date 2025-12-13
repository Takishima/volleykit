import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ReloadPromptPWA from "./ReloadPromptPWA";

// Mock the virtual:pwa-register/react module
vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: vi.fn(),
}));

import { useRegisterSW } from "virtual:pwa-register/react";

describe("ReloadPromptPWA", () => {
  const mockUpdateServiceWorker = vi.fn();
  const mockSetOfflineReady = vi.fn();
  const mockSetNeedRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const setupMock = (offlineReady: boolean, needRefresh: boolean) => {
    vi.mocked(useRegisterSW).mockReturnValue({
      offlineReady: [offlineReady, mockSetOfflineReady],
      needRefresh: [needRefresh, mockSetNeedRefresh],
      updateServiceWorker: mockUpdateServiceWorker,
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

  it("calls updateServiceWorker when reload button is clicked", () => {
    setupMock(false, true);
    render(<ReloadPromptPWA />);
    const reloadButton = screen.getByRole("button", {
      name: /reload application/i,
    });
    fireEvent.click(reloadButton);
    expect(mockUpdateServiceWorker).toHaveBeenCalledWith(true);
  });

  it("closes notification when close button is clicked", () => {
    setupMock(false, true);
    render(<ReloadPromptPWA />);
    const dismissButton = screen.getByRole("button", {
      name: /dismiss update notification/i,
    });
    fireEvent.click(dismissButton);
    expect(mockSetOfflineReady).toHaveBeenCalledWith(false);
    expect(mockSetNeedRefresh).toHaveBeenCalledWith(false);
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

  it("sets up interval to check for updates on registration", () => {
    const mockRegistration = {
      update: vi.fn(),
    };

    let onRegisteredCallback:
      | ((registration: ServiceWorkerRegistration) => void)
      | undefined;

    vi.mocked(useRegisterSW).mockImplementation((options) => {
      onRegisteredCallback = options?.onRegistered;
      return {
        offlineReady: [false, mockSetOfflineReady],
        needRefresh: [false, mockSetNeedRefresh],
        updateServiceWorker: mockUpdateServiceWorker,
      };
    });

    render(<ReloadPromptPWA />);

    // Simulate service worker registration
    if (onRegisteredCallback) {
      onRegisteredCallback(
        mockRegistration as unknown as ServiceWorkerRegistration,
      );
    }

    // Fast-forward time by 1 hour
    vi.advanceTimersByTime(60 * 60 * 1000);

    expect(mockRegistration.update).toHaveBeenCalledTimes(1);

    // Fast-forward another hour
    vi.advanceTimersByTime(60 * 60 * 1000);

    expect(mockRegistration.update).toHaveBeenCalledTimes(2);
  });

  it("cleans up interval on unmount", () => {
    const mockRegistration = {
      update: vi.fn(),
    };

    let onRegisteredCallback:
      | ((registration: ServiceWorkerRegistration) => void)
      | undefined;

    vi.mocked(useRegisterSW).mockImplementation((options) => {
      onRegisteredCallback = options?.onRegistered;
      return {
        offlineReady: [false, mockSetOfflineReady],
        needRefresh: [false, mockSetNeedRefresh],
        updateServiceWorker: mockUpdateServiceWorker,
      };
    });

    const { unmount } = render(<ReloadPromptPWA />);

    // Simulate service worker registration
    if (onRegisteredCallback) {
      onRegisteredCallback(
        mockRegistration as unknown as ServiceWorkerRegistration,
      );
    }

    // Unmount the component
    unmount();

    // Fast-forward time by 1 hour - update should NOT be called since interval was cleaned up
    vi.advanceTimersByTime(60 * 60 * 1000);

    expect(mockRegistration.update).not.toHaveBeenCalled();
  });

  it("logs error when service worker registration fails", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const mockError = new Error("Registration failed");

    let onRegisterErrorCallback: ((error: Error) => void) | undefined;

    vi.mocked(useRegisterSW).mockImplementation((options) => {
      onRegisterErrorCallback = options?.onRegisterError;
      return {
        offlineReady: [false, mockSetOfflineReady],
        needRefresh: [false, mockSetNeedRefresh],
        updateServiceWorker: mockUpdateServiceWorker,
      };
    });

    render(<ReloadPromptPWA />);

    // Simulate registration error
    if (onRegisterErrorCallback) {
      onRegisterErrorCallback(mockError);
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Service worker registration error:",
      mockError,
    );

    consoleErrorSpy.mockRestore();
  });
});
