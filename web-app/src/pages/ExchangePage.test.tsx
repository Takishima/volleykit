import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExchangePage } from "./ExchangePage";
import type { GameExchange } from "@/api/client";
import type { UseQueryResult } from "@tanstack/react-query";
import * as useConvocations from "@/hooks/useConvocations";
import * as authStore from "@/stores/auth";
import * as demoStore from "@/stores/demo";
import * as settingsStore from "@/stores/settings";

vi.mock("@/hooks/useConvocations");
vi.mock("@/stores/auth");
vi.mock("@/stores/demo");
vi.mock("@/stores/settings");
vi.mock("@/hooks/useTravelTimeFilter", () => ({
  useTravelTimeFilter: () => ({
    exchangesWithTravelTime: null,
    filteredExchanges: null,
    isLoading: false,
    filterByTravelTime: () => true,
    isAvailable: false,
  }),
}));
vi.mock("@/hooks/useExchangeActions", () => ({
  useExchangeActions: () => ({
    takeOverModal: {
      isOpen: false,
      exchange: null,
      open: vi.fn(),
      close: vi.fn(),
    },
    removeFromExchangeModal: {
      isOpen: false,
      exchange: null,
      open: vi.fn(),
      close: vi.fn(),
    },
    handleTakeOver: vi.fn(),
    handleRemoveFromExchange: vi.fn(),
  }),
}));

function createMockExchange(
  overrides: Partial<GameExchange> = {},
): GameExchange {
  return {
    __identity: `exchange-${Math.random()}`,
    status: "open",
    requiredRefereeLevel: "N2",
    requiredRefereeLevelGradationValue: "2",
    refereeGame: {
      game: {
        startingDateTime: "2025-12-15T18:00:00Z",
        encounter: {
          teamHome: { name: "Team A" },
          teamAway: { name: "Team B" },
        },
        hall: { name: "Main Arena" },
      },
    },
    ...overrides,
  } as GameExchange;
}

function createMockQueryResult(
  data: GameExchange[] | undefined,
  isLoading = false,
  error: Error | null = null,
): UseQueryResult<GameExchange[], Error> {
  return {
    data,
    isLoading,
    isFetching: false,
    isError: !!error,
    error,
    isSuccess: !isLoading && !error && !!data,
    status: isLoading ? "pending" : error ? "error" : "success",
    refetch: vi.fn(),
  } as unknown as UseQueryResult<GameExchange[], Error>;
}

// Helper to open the filters dropdown and find a filter switch
function openFiltersAndGetSwitch(name: RegExp) {
  const filtersButton = screen.getByRole("button", { name: /filters/i });
  fireEvent.click(filtersButton);
  return screen.getByRole("switch", { name });
}

describe("ExchangePage", () => {
  const mockSetLevelFilterEnabled = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: not in demo mode
    vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
      selector({ isDemoMode: false } as ReturnType<
        typeof authStore.useAuthStore.getState
      >),
    );

    vi.mocked(demoStore.useDemoStore).mockReturnValue({
      userRefereeLevel: null,
      userRefereeLevelGradationValue: null,
    });

    // Default settings store mock
    vi.mocked(settingsStore.useSettingsStore).mockReturnValue({
      homeLocation: null,
      distanceFilter: { enabled: false, maxDistanceKm: 50 },
      setDistanceFilterEnabled: vi.fn(),
      transportEnabled: false,
      travelTimeFilter: {
        enabled: false,
        maxTravelTimeMinutes: 120,
        arrivalBufferMinutes: 30,
        cacheInvalidatedAt: null,
      },
      setTravelTimeFilterEnabled: vi.fn(),
      levelFilterEnabled: false,
      setLevelFilterEnabled: mockSetLevelFilterEnabled,
    });

    vi.mocked(useConvocations.useGameExchanges).mockReturnValue(
      createMockQueryResult([]),
    );
  });

  describe("Level Filter Toggle", () => {
    it("should not show level filter in dropdown when not in demo mode", () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: false } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      render(<ExchangePage />);

      // Filters button should still be visible but level filter won't be inside
      const filtersButton = screen.queryByRole("button", { name: /filters/i });
      // When no filters available, button should not be shown
      expect(filtersButton).not.toBeInTheDocument();
    });

    it("should show level filter in dropdown when in demo mode with user level", () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      vi.mocked(demoStore.useDemoStore).mockReturnValue({
        userRefereeLevel: "N2",
        userRefereeLevelGradationValue: 2,
      });

      render(<ExchangePage />);

      // Open filters dropdown
      const filtersButton = screen.getByRole("button", { name: /filters/i });
      fireEvent.click(filtersButton);

      // Level filter should be visible inside the dropdown
      expect(
        screen.getByRole("switch", { name: /level/i }),
      ).toBeInTheDocument();
    });

    it("should not show filters button on My Applications tab", () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      vi.mocked(demoStore.useDemoStore).mockReturnValue({
        userRefereeLevel: "N2",
        userRefereeLevelGradationValue: 2,
      });

      render(<ExchangePage />);

      // Click on "My Applications" tab
      fireEvent.click(screen.getByText(/my applications/i));

      // Filters button should not be visible on this tab
      expect(
        screen.queryByRole("button", { name: /filters/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Level Filtering", () => {
    const exchangeN1 = createMockExchange({
      __identity: "exchange-n1",
      requiredRefereeLevel: "N1",
      requiredRefereeLevelGradationValue: "1",
    });

    const exchangeN2 = createMockExchange({
      __identity: "exchange-n2",
      requiredRefereeLevel: "N2",
      requiredRefereeLevelGradationValue: "2",
    });

    const exchangeN3 = createMockExchange({
      __identity: "exchange-n3",
      requiredRefereeLevel: "N3",
      requiredRefereeLevelGradationValue: "3",
    });

    beforeEach(() => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      // User is N2 level (gradation value 2)
      vi.mocked(demoStore.useDemoStore).mockReturnValue({
        userRefereeLevel: "N2",
        userRefereeLevelGradationValue: 2,
      });

      vi.mocked(useConvocations.useGameExchanges).mockReturnValue(
        createMockQueryResult([exchangeN1, exchangeN2, exchangeN3]),
      );
    });

    it("should show all exchanges when filter is off", () => {
      render(<ExchangePage />);

      // All three exchanges should be visible (use getAllByText since they share team names)
      const exchanges = screen.getAllByText(/Team A vs Team B/i);
      expect(exchanges).toHaveLength(3);
    });

    it("should toggle level filter when clicked", () => {
      render(<ExchangePage />);

      // Open dropdown and click the level filter
      const toggle = openFiltersAndGetSwitch(/level/i);
      fireEvent.click(toggle);

      // Should call the setter to enable the filter
      expect(mockSetLevelFilterEnabled).toHaveBeenCalledWith(true);
    });

    it("should show user level indicator when filter is enabled", () => {
      // Mock filter as already enabled
      vi.mocked(settingsStore.useSettingsStore).mockReturnValue({
        homeLocation: null,
        distanceFilter: { enabled: false, maxDistanceKm: 50 },
        setDistanceFilterEnabled: vi.fn(),
        transportEnabled: false,
        travelTimeFilter: {
          enabled: false,
          maxTravelTimeMinutes: 120,
          arrivalBufferMinutes: 30,
          cacheInvalidatedAt: null,
        },
        setTravelTimeFilterEnabled: vi.fn(),
        levelFilterEnabled: true,
        setLevelFilterEnabled: mockSetLevelFilterEnabled,
      });

      render(<ExchangePage />);

      // Open filters dropdown
      const filtersButton = screen.getByRole("button", { name: /filters/i });
      fireEvent.click(filtersButton);

      // Should show N2+ indicator in the chip
      expect(screen.getByText("N2+")).toBeInTheDocument();
    });

    it("should show filtered empty state message when no exchanges match level", () => {
      // Only return exchanges requiring higher level than user has
      vi.mocked(useConvocations.useGameExchanges).mockReturnValue(
        createMockQueryResult([exchangeN1]),
      );

      // Mock filter as enabled
      vi.mocked(settingsStore.useSettingsStore).mockReturnValue({
        homeLocation: null,
        distanceFilter: { enabled: false, maxDistanceKm: 50 },
        setDistanceFilterEnabled: vi.fn(),
        transportEnabled: false,
        travelTimeFilter: {
          enabled: false,
          maxTravelTimeMinutes: 120,
          arrivalBufferMinutes: 30,
          cacheInvalidatedAt: null,
        },
        setTravelTimeFilterEnabled: vi.fn(),
        levelFilterEnabled: true,
        setLevelFilterEnabled: mockSetLevelFilterEnabled,
      });

      render(<ExchangePage />);

      // Should show filtered empty state message
      expect(
        screen.getByText(/no exchanges match your filters/i),
      ).toBeInTheDocument();
    });
  });

  describe("Tab Navigation", () => {
    it("should default to Open tab", () => {
      render(<ExchangePage />);

      const openTab = screen.getByRole("tab", { name: /^open$/i });
      expect(openTab).toHaveClass("border-primary-500");
      expect(openTab).toHaveAttribute("aria-selected", "true");
    });

    it("should switch to My Applications tab when clicked", () => {
      vi.mocked(useConvocations.useGameExchanges).mockReturnValue(
        createMockQueryResult([]),
      );

      render(<ExchangePage />);

      fireEvent.click(screen.getByText(/my applications/i));

      const myAppsTab = screen.getByRole("tab", { name: /my applications/i });
      expect(myAppsTab).toHaveClass("border-primary-500");
      expect(myAppsTab).toHaveAttribute("aria-selected", "true");
    });
  });
});
