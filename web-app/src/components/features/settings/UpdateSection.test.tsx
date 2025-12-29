import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UpdateSection } from "./UpdateSection";

// Mock usePWA hook
const mockUsePWA = vi.fn();
vi.mock("@/contexts/PWAContext", () => ({
  usePWA: () => mockUsePWA(),
}));

// Mock useTranslation hook
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "settings.updates": "Updates",
        "settings.updateAvailable": "Update available",
        "settings.upToDate": "App is up to date",
        "settings.lastChecked": "Last checked",
        "settings.updateCheckFailed": "Failed to check for updates",
        "settings.updateNow": "Update now",
        "settings.checkForUpdates": "Check for updates",
        "settings.checking": "Checking...",
      };
      return translations[key] || key;
    },
    locale: "en",
  }),
}));

describe("UpdateSection", () => {
  const defaultPWAState = {
    needRefresh: false,
    isChecking: false,
    lastChecked: null,
    checkError: null,
    checkForUpdate: vi.fn(),
    updateApp: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePWA.mockReturnValue(defaultPWAState);
  });

  it("renders updates heading", () => {
    render(<UpdateSection />);

    expect(screen.getByText("Updates")).toBeInTheDocument();
  });

  it("shows up to date message when no update available", () => {
    render(<UpdateSection />);

    expect(screen.getByText("App is up to date")).toBeInTheDocument();
  });

  it("shows update available message when needRefresh is true", () => {
    mockUsePWA.mockReturnValue({
      ...defaultPWAState,
      needRefresh: true,
    });

    render(<UpdateSection />);

    expect(screen.getByText("Update available")).toBeInTheDocument();
  });

  it("shows check for updates button when no update available", () => {
    render(<UpdateSection />);

    expect(
      screen.getByRole("button", { name: "Check for updates" })
    ).toBeInTheDocument();
  });

  it("shows update now button when update is available", () => {
    mockUsePWA.mockReturnValue({
      ...defaultPWAState,
      needRefresh: true,
    });

    render(<UpdateSection />);

    expect(
      screen.getByRole("button", { name: "Update now" })
    ).toBeInTheDocument();
  });

  it("calls checkForUpdate when check button is clicked", async () => {
    const checkForUpdate = vi.fn();
    mockUsePWA.mockReturnValue({
      ...defaultPWAState,
      checkForUpdate,
    });
    const user = userEvent.setup();

    render(<UpdateSection />);

    await user.click(screen.getByRole("button", { name: "Check for updates" }));

    expect(checkForUpdate).toHaveBeenCalledTimes(1);
  });

  it("calls updateApp when update button is clicked", async () => {
    const updateApp = vi.fn();
    mockUsePWA.mockReturnValue({
      ...defaultPWAState,
      needRefresh: true,
      updateApp,
    });
    const user = userEvent.setup();

    render(<UpdateSection />);

    await user.click(screen.getByRole("button", { name: "Update now" }));

    expect(updateApp).toHaveBeenCalledTimes(1);
  });

  it("shows checking state on button", () => {
    mockUsePWA.mockReturnValue({
      ...defaultPWAState,
      isChecking: true,
    });

    render(<UpdateSection />);

    expect(screen.getByText("Checking...")).toBeInTheDocument();
  });

  it("displays last checked time for today", () => {
    const now = new Date();
    now.setHours(14, 30);

    mockUsePWA.mockReturnValue({
      ...defaultPWAState,
      lastChecked: now,
    });

    render(<UpdateSection />);

    expect(screen.getByText(/Last checked:/)).toBeInTheDocument();
  });

  it("displays last checked date for previous days", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    mockUsePWA.mockReturnValue({
      ...defaultPWAState,
      lastChecked: yesterday,
    });

    render(<UpdateSection />);

    expect(screen.getByText(/Last checked:/)).toBeInTheDocument();
  });

  it("shows error message when check fails", () => {
    mockUsePWA.mockReturnValue({
      ...defaultPWAState,
      checkError: new Error("Network error"),
    });

    render(<UpdateSection />);

    const errorAlert = screen.getByRole("alert");
    expect(errorAlert).toHaveTextContent("Failed to check for updates");
  });

  it("has aria-live on status message", () => {
    render(<UpdateSection />);

    const statusElement = screen.getByText("App is up to date");
    expect(statusElement).toHaveAttribute("aria-live", "polite");
  });
});
