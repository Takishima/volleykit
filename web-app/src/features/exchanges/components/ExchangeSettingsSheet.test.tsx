import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExchangeSettingsSheet } from "./ExchangeSettingsSheet";

// Mock useSettingsStore - need to handle useShallow wrapper
const mockSettingsState = vi.fn();
vi.mock("@/shared/stores/settings", () => ({
  useSettingsStore: (selector: (state: unknown) => unknown) => {
    // Handle useShallow-wrapped selectors
    const state = mockSettingsState();
    const result = selector(state);
    return result;
  },
}));

// Mock useTranslation hook
vi.mock("@/shared/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "exchange.settings.title": "Exchange Settings",
        "exchange.settings.maxDistance": "Maximum Distance",
        "exchange.settings.maxTravelTime": "Maximum Travel Time",
        "exchange.settings.description":
          "Filter exchanges by distance or travel time from your home location.",
        "common.close": "Close",
        "common.distanceUnit": "km",
        "common.minutesUnit": "min",
        "common.hoursUnit": "h",
      };
      return translations[key] || key;
    },
  }),
}));

// Mock useTravelTimeAvailable hook
const mockUseTravelTimeAvailable = vi.fn();
vi.mock("@/shared/hooks/useTravelTime", () => ({
  useTravelTimeAvailable: () => mockUseTravelTimeAvailable(),
}));

// Mock useActiveAssociationCode hook
vi.mock("@/features/auth/hooks/useActiveAssociation", () => ({
  useActiveAssociationCode: () => "TEST",
}));

// Mock ResponsiveSheet component
vi.mock("@/shared/components/ResponsiveSheet", () => ({
  ResponsiveSheet: ({
    isOpen,
    children,
  }: {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
  }) =>
    isOpen ? <div data-testid="responsive-sheet">{children}</div> : null,
}));

describe("ExchangeSettingsSheet", () => {
  const defaultSettingsState = {
    homeLocation: { lat: 47.3769, lng: 8.5417, name: "Zurich" },
    distanceFilter: { maxDistanceKm: 50, enabled: true },
    setMaxDistanceKm: vi.fn(),
    isTransportEnabledForAssociation: () => true,
    travelTimeFilter: { maxTravelTimeMinutes: 60, enabled: true },
    setMaxTravelTimeMinutes: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSettingsState.mockReturnValue(defaultSettingsState);
    mockUseTravelTimeAvailable.mockReturnValue(true);
  });

  it("returns null when no home location is set", () => {
    mockSettingsState.mockReturnValue({
      ...defaultSettingsState,
      homeLocation: null,
    });

    const { container } = render(<ExchangeSettingsSheet />);

    expect(container.firstChild).toBeNull();
  });

  it("renders settings button when home location is available", () => {
    render(<ExchangeSettingsSheet />);

    expect(
      screen.getByRole("button", { name: "Exchange Settings" })
    ).toBeInTheDocument();
  });

  it("opens sheet when settings button is clicked", async () => {
    const user = userEvent.setup();

    render(<ExchangeSettingsSheet />);

    await user.click(
      screen.getByRole("button", { name: "Exchange Settings" })
    );

    expect(screen.getByTestId("responsive-sheet")).toBeInTheDocument();
  });

  it("displays sheet title when open", async () => {
    const user = userEvent.setup();

    render(<ExchangeSettingsSheet />);

    await user.click(
      screen.getByRole("button", { name: "Exchange Settings" })
    );

    expect(screen.getByText("Exchange Settings")).toBeInTheDocument();
  });

  it("shows distance slider when home location is set", async () => {
    const user = userEvent.setup();

    render(<ExchangeSettingsSheet />);

    await user.click(
      screen.getByRole("button", { name: "Exchange Settings" })
    );

    expect(screen.getByLabelText("Maximum Distance")).toBeInTheDocument();
  });

  it("shows travel time slider when transport is enabled and available", async () => {
    const user = userEvent.setup();

    render(<ExchangeSettingsSheet />);

    await user.click(
      screen.getByRole("button", { name: "Exchange Settings" })
    );

    expect(screen.getByLabelText("Maximum Travel Time")).toBeInTheDocument();
  });

  it("hides travel time slider when transport is disabled", async () => {
    mockSettingsState.mockReturnValue({
      ...defaultSettingsState,
      isTransportEnabledForAssociation: () => false,
    });
    const user = userEvent.setup();

    render(<ExchangeSettingsSheet />);

    await user.click(
      screen.getByRole("button", { name: "Exchange Settings" })
    );

    expect(
      screen.queryByLabelText("Maximum Travel Time")
    ).not.toBeInTheDocument();
  });

  it("hides travel time slider when travel time is not available", async () => {
    mockUseTravelTimeAvailable.mockReturnValue(false);
    const user = userEvent.setup();

    render(<ExchangeSettingsSheet />);

    await user.click(
      screen.getByRole("button", { name: "Exchange Settings" })
    );

    expect(
      screen.queryByLabelText("Maximum Travel Time")
    ).not.toBeInTheDocument();
  });

  it("displays current distance value from slider", async () => {
    const user = userEvent.setup();

    render(<ExchangeSettingsSheet />);

    await user.click(
      screen.getByRole("button", { name: "Exchange Settings" })
    );

    // Check that the distance slider exists and has a value displayed
    const slider = screen.getByLabelText("Maximum Distance");
    expect(slider).toHaveValue("50"); // default maxDistanceKm
    // "50 km" appears twice: once as current value, once as preset label
    expect(screen.getAllByText("50 km").length).toBeGreaterThanOrEqual(1);
  });

  it("calls setMaxDistanceKm when distance slider changes", async () => {
    const setMaxDistanceKm = vi.fn();
    mockSettingsState.mockReturnValue({
      ...defaultSettingsState,
      setMaxDistanceKm,
    });
    const user = userEvent.setup();

    render(<ExchangeSettingsSheet />);

    await user.click(
      screen.getByRole("button", { name: "Exchange Settings" })
    );

    const slider = screen.getByLabelText("Maximum Distance");
    fireEvent.change(slider, { target: { value: "75" } });

    expect(setMaxDistanceKm).toHaveBeenCalledWith(75);
  });

  it("calls setMaxTravelTimeMinutes when travel time slider changes", async () => {
    const setMaxTravelTimeMinutes = vi.fn();
    mockSettingsState.mockReturnValue({
      ...defaultSettingsState,
      setMaxTravelTimeMinutes,
    });
    const user = userEvent.setup();

    render(<ExchangeSettingsSheet />);

    await user.click(
      screen.getByRole("button", { name: "Exchange Settings" })
    );

    const slider = screen.getByLabelText("Maximum Travel Time");
    fireEvent.change(slider, { target: { value: "90" } });

    expect(setMaxTravelTimeMinutes).toHaveBeenCalledWith(90);
  });

  it("displays distance presets", async () => {
    const user = userEvent.setup();

    render(<ExchangeSettingsSheet />);

    await user.click(
      screen.getByRole("button", { name: "Exchange Settings" })
    );

    expect(screen.getByText("10 km")).toBeInTheDocument();
    expect(screen.getByText("25 km")).toBeInTheDocument();
    expect(screen.getByText("100 km")).toBeInTheDocument();
  });

  it("displays travel time presets", async () => {
    const user = userEvent.setup();

    render(<ExchangeSettingsSheet />);

    await user.click(
      screen.getByRole("button", { name: "Exchange Settings" })
    );

    expect(screen.getByText("30m")).toBeInTheDocument();
    expect(screen.getByText("45m")).toBeInTheDocument();
    // "1h" might appear in both the current value and preset labels
    expect(screen.getAllByText("1h").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("2h")).toBeInTheDocument();
  });

  it("displays description text", async () => {
    const user = userEvent.setup();

    render(<ExchangeSettingsSheet />);

    await user.click(
      screen.getByRole("button", { name: "Exchange Settings" })
    );

    expect(
      screen.getByText(/Filter exchanges by distance or travel time/i)
    ).toBeInTheDocument();
  });

  it("accepts dataTour prop", () => {
    render(<ExchangeSettingsSheet dataTour="exchange-settings" />);

    const button = screen.getByRole("button", { name: "Exchange Settings" });
    expect(button).toHaveAttribute("data-tour", "exchange-settings");
  });

  it("has close button with aria-label", async () => {
    const user = userEvent.setup();

    render(<ExchangeSettingsSheet />);

    await user.click(
      screen.getByRole("button", { name: "Exchange Settings" })
    );

    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });
});
