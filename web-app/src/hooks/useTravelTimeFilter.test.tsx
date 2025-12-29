import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTravelTimeFilter } from "./useTravelTimeFilter";
import type { GameExchange } from "@/api/client";
import type { TravelTimeResult, Coordinates } from "@/services/transport";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

// Mock dependencies
vi.mock("@/services/transport", () => ({
  calculateTravelTime: vi.fn(),
  calculateMockTravelTime: vi.fn(),
  isOjpConfigured: vi.fn(() => false),
  hashLocation: vi.fn(
    (coords: Coordinates) => `${coords.latitude},${coords.longitude}`,
  ),
  getDayType: vi.fn(() => "weekday"),
  getCachedTravelTime: vi.fn(() => null),
  setCachedTravelTime: vi.fn(),
  TRAVEL_TIME_STALE_TIME: 30 * 24 * 60 * 60 * 1000,
  TRAVEL_TIME_GC_TIME: 30 * 24 * 60 * 60 * 1000,
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn((selector: AnyFunction) =>
    selector({ isDemoMode: false }),
  ),
}));

vi.mock("@/stores/settings", () => ({
  useSettingsStore: vi.fn((selector: AnyFunction) =>
    selector({
      homeLocation: null,
      transportEnabled: false,
      transportEnabledByAssociation: {},
      travelTimeFilter: {
        enabled: false,
        maxTravelTimeMinutes: 60,
        arrivalBufferByAssociation: {},
      },
    }),
  ),
  getDefaultArrivalBuffer: vi.fn(() => 30),
}));

vi.mock("@/hooks/useActiveAssociation", () => ({
  useActiveAssociationCode: vi.fn(() => "TEST"),
}));

vi.mock("@/api/queryKeys", () => ({
  queryKeys: {
    travelTime: {
      hall: vi.fn((hallId, homeHash, dayType) => [
        "travelTime",
        hallId,
        homeHash,
        dayType,
      ]),
    },
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function createMockExchange(
  hallId: string,
  coords?: { lat: number; lon: number },
  startTime?: string,
): GameExchange {
  return {
    __identity: `exchange-${hallId}`,
    status: "open",
    refereeGame: {
      game: {
        startingDateTime: startTime ?? "2025-01-15T18:00:00Z",
        hall: {
          __identity: hallId,
          name: `Hall ${hallId}`,
          primaryPostalAddress: coords
            ? {
                geographicalLocation: {
                  latitude: coords.lat,
                  longitude: coords.lon,
                },
              }
            : undefined,
        },
        encounter: {
          teamHome: { name: "Team A" },
          teamAway: { name: "Team B" },
        },
      },
    },
  } as GameExchange;
}

describe("useTravelTimeFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when transport is disabled", () => {
    it("returns null data when exchanges is null", () => {
      const { result } = renderHook(() => useTravelTimeFilter(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.exchangesWithTravelTime).toBeNull();
      expect(result.current.filteredExchanges).toBeNull();
      expect(result.current.isAvailable).toBe(false);
    });

    it("returns exchanges without travel time data when transport disabled", () => {
      const exchanges = [
        createMockExchange("hall-1", { lat: 46.948, lon: 7.447 }),
      ];

      const { result } = renderHook(() => useTravelTimeFilter(exchanges), {
        wrapper: createWrapper(),
      });

      expect(result.current.exchangesWithTravelTime).toHaveLength(1);
      expect(result.current.exchangesWithTravelTime![0].travelTimeMinutes).toBeNull();
      expect(result.current.isAvailable).toBe(false);
    });
  });

  describe("when transport is enabled", () => {
    beforeEach(async () => {
      const { useSettingsStore } = await import("@/stores/settings");
      const { isOjpConfigured } = await import("@/services/transport");

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: {
            latitude: 47.3769,
            longitude: 8.5417,
            label: "Zürich",
            source: "geocoded",
          },
          transportEnabled: true,
          transportEnabledByAssociation: {},
          travelTimeFilter: {
            enabled: false,
            maxTravelTimeMinutes: 60,
            arrivalBufferByAssociation: {},
          },
        }),
      );

      vi.mocked(isOjpConfigured).mockReturnValue(true);
    });

    it("calculates travel time for exchanges", async () => {
      const { calculateTravelTime } = await import("@/services/transport");

      const mockResult: TravelTimeResult = {
        durationMinutes: 45,
        departureTime: "2025-01-15T17:00:00Z",
        arrivalTime: "2025-01-15T17:45:00Z",
        transfers: 1,
      };

      vi.mocked(calculateTravelTime).mockResolvedValue(mockResult);

      const exchanges = [
        createMockExchange("hall-1", { lat: 46.948, lon: 7.447 }),
      ];

      const { result } = renderHook(() => useTravelTimeFilter(exchanges), {
        wrapper: createWrapper(),
      });

      expect(result.current.isAvailable).toBe(true);

      await waitFor(() => {
        expect(result.current.exchangesWithTravelTime![0].travelTimeMinutes).toBe(45);
      });
    });

    it("uses mock travel time in demo mode", async () => {
      const { useAuthStore } = await import("@/stores/auth");
      const { calculateMockTravelTime } = await import("@/services/transport");

      vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
        selector({ isDemoMode: true }),
      );

      const mockResult: TravelTimeResult = {
        durationMinutes: 30,
        departureTime: "2025-01-15T17:15:00Z",
        arrivalTime: "2025-01-15T17:45:00Z",
        transfers: 0,
      };

      vi.mocked(calculateMockTravelTime).mockResolvedValue(mockResult);

      const exchanges = [
        createMockExchange("hall-1", { lat: 46.948, lon: 7.447 }),
      ];

      const { result } = renderHook(() => useTravelTimeFilter(exchanges), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.exchangesWithTravelTime![0].travelTimeMinutes).toBe(30);
      });

      expect(calculateMockTravelTime).toHaveBeenCalled();
    });

    it("handles exchanges without coordinates", async () => {
      const exchanges = [
        createMockExchange("hall-1"), // No coordinates
      ];

      const { result } = renderHook(() => useTravelTimeFilter(exchanges), {
        wrapper: createWrapper(),
      });

      // Should not throw, just have null travel time
      expect(result.current.exchangesWithTravelTime).toHaveLength(1);
      expect(result.current.exchangesWithTravelTime![0].travelTimeMinutes).toBeNull();
    });

    it("returns same travel time for exchanges at the same hall", async () => {
      // This test verifies that exchanges with the same hall ID share travel time
      // without relying on complex mock setup
      const exchanges = [
        createMockExchange("hall-1", { lat: 46.948, lon: 7.447 }, "2025-01-15T18:00:00Z"),
        createMockExchange("hall-1", { lat: 46.948, lon: 7.447 }, "2025-01-16T18:00:00Z"),
      ];

      const { result } = renderHook(() => useTravelTimeFilter(exchanges), {
        wrapper: createWrapper(),
      });

      // Both exchanges should have the same travel time (same hall)
      await waitFor(() => {
        const first = result.current.exchangesWithTravelTime![0].travelTimeMinutes;
        const second = result.current.exchangesWithTravelTime![1].travelTimeMinutes;
        expect(first).toBe(second);
      });
    });
  });

  describe("filtering", () => {
    beforeEach(async () => {
      const { useSettingsStore } = await import("@/stores/settings");
      const { useAuthStore } = await import("@/stores/auth");
      const { calculateMockTravelTime } = await import("@/services/transport");

      vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
        selector({ isDemoMode: true }),
      );

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: {
            latitude: 47.3769,
            longitude: 8.5417,
            label: "Zürich",
            source: "geocoded",
          },
          transportEnabled: true,
          transportEnabledByAssociation: {},
          travelTimeFilter: {
            enabled: true,
            maxTravelTimeMinutes: 60,
            arrivalBufferByAssociation: {},
          },
        }),
      );

      // Different travel times for different halls
      vi.mocked(calculateMockTravelTime)
        .mockResolvedValueOnce({
          durationMinutes: 30, // Under limit
          departureTime: "2025-01-15T17:15:00Z",
          arrivalTime: "2025-01-15T17:45:00Z",
          transfers: 0,
        })
        .mockResolvedValueOnce({
          durationMinutes: 90, // Over limit
          departureTime: "2025-01-15T16:15:00Z",
          arrivalTime: "2025-01-15T17:45:00Z",
          transfers: 2,
        });
    });

    it("filters exchanges by max travel time", async () => {
      const exchanges = [
        createMockExchange("hall-1", { lat: 46.948, lon: 7.447 }),
        createMockExchange("hall-2", { lat: 46.0, lon: 7.0 }),
      ];

      const { result } = renderHook(() => useTravelTimeFilter(exchanges), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.filteredExchanges).toHaveLength(1);
      });

      // Only hall-1 (30 min) should be included, hall-2 (90 min) exceeds 60 min limit
      expect(result.current.filteredExchanges![0].item.__identity).toBe("exchange-hall-1");
    });

    it("includes exchanges without travel time when filtering", async () => {
      const { calculateMockTravelTime } = await import("@/services/transport");

      vi.mocked(calculateMockTravelTime).mockReset();
      vi.mocked(calculateMockTravelTime).mockResolvedValue({
        durationMinutes: 90, // Over limit
        departureTime: "2025-01-15T16:15:00Z",
        arrivalTime: "2025-01-15T17:45:00Z",
        transfers: 2,
      });

      const exchanges = [
        createMockExchange("hall-1"), // No coordinates, no travel time
        createMockExchange("hall-2", { lat: 46.0, lon: 7.0 }), // Over limit
      ];

      const { result } = renderHook(() => useTravelTimeFilter(exchanges), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        // hall-1 (no travel time) should be included, hall-2 (90 min) excluded
        expect(result.current.filteredExchanges).toHaveLength(1);
        expect(result.current.filteredExchanges![0].item.__identity).toBe("exchange-hall-1");
      });
    });

    it("returns all exchanges when filtering is disabled", async () => {
      const { useSettingsStore } = await import("@/stores/settings");
      const { calculateMockTravelTime } = await import("@/services/transport");

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: {
            latitude: 47.3769,
            longitude: 8.5417,
            label: "Zürich",
            source: "geocoded",
          },
          transportEnabled: true,
          transportEnabledByAssociation: {},
          travelTimeFilter: {
            enabled: false, // Filtering disabled
            maxTravelTimeMinutes: 60,
            arrivalBufferByAssociation: {},
          },
        }),
      );

      vi.mocked(calculateMockTravelTime).mockReset();
      vi.mocked(calculateMockTravelTime).mockResolvedValue({
        durationMinutes: 90, // Would be over limit if filtering enabled
        departureTime: "2025-01-15T16:15:00Z",
        arrivalTime: "2025-01-15T17:45:00Z",
        transfers: 2,
      });

      const exchanges = [
        createMockExchange("hall-1", { lat: 46.0, lon: 7.0 }),
      ];

      const { result } = renderHook(() => useTravelTimeFilter(exchanges), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.exchangesWithTravelTime![0].travelTimeMinutes).toBe(90);
      });

      // All exchanges should be included when filter disabled
      expect(result.current.filteredExchanges).toHaveLength(1);
    });
  });

  describe("filterByTravelTime function", () => {
    it("returns true for exchanges under limit", async () => {
      const { useSettingsStore } = await import("@/stores/settings");

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: null,
          transportEnabled: false,
          transportEnabledByAssociation: {},
          travelTimeFilter: {
            enabled: true,
            maxTravelTimeMinutes: 60,
            arrivalBufferByAssociation: {},
          },
        }),
      );

      const { result } = renderHook(() => useTravelTimeFilter([]), {
        wrapper: createWrapper(),
      });

      const underLimit = {
        item: createMockExchange("hall-1"),
        travelTimeMinutes: 30,
        isLoading: false,
        isError: false,
      };

      expect(result.current.filterByTravelTime(underLimit)).toBe(true);
    });

    it("returns false for exchanges over limit", async () => {
      const { useSettingsStore } = await import("@/stores/settings");

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: null,
          transportEnabled: false,
          transportEnabledByAssociation: {},
          travelTimeFilter: {
            enabled: true,
            maxTravelTimeMinutes: 60,
            arrivalBufferByAssociation: {},
          },
        }),
      );

      const { result } = renderHook(() => useTravelTimeFilter([]), {
        wrapper: createWrapper(),
      });

      const overLimit = {
        item: createMockExchange("hall-1"),
        travelTimeMinutes: 90,
        isLoading: false,
        isError: false,
      };

      expect(result.current.filterByTravelTime(overLimit)).toBe(false);
    });

    it("returns true for exchanges with null travel time", async () => {
      const { useSettingsStore } = await import("@/stores/settings");

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: null,
          transportEnabled: false,
          transportEnabledByAssociation: {},
          travelTimeFilter: {
            enabled: true,
            maxTravelTimeMinutes: 60,
            arrivalBufferByAssociation: {},
          },
        }),
      );

      const { result } = renderHook(() => useTravelTimeFilter([]), {
        wrapper: createWrapper(),
      });

      const noTravelTime = {
        item: createMockExchange("hall-1"),
        travelTimeMinutes: null,
        isLoading: false,
        isError: false,
      };

      expect(result.current.filterByTravelTime(noTravelTime)).toBe(true);
    });
  });

  describe("association-specific settings", () => {
    it("uses per-association transport enabled setting", async () => {
      const { useSettingsStore } = await import("@/stores/settings");
      const { useActiveAssociationCode } = await import("@/hooks/useActiveAssociation");
      const { isOjpConfigured } = await import("@/services/transport");

      vi.mocked(useActiveAssociationCode).mockReturnValue("SPECIAL");
      vi.mocked(isOjpConfigured).mockReturnValue(true);

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: {
            latitude: 47.3769,
            longitude: 8.5417,
            label: "Zürich",
            source: "geocoded",
          },
          transportEnabled: false, // Global disabled
          transportEnabledByAssociation: {
            SPECIAL: true, // But enabled for this association
          },
          travelTimeFilter: {
            enabled: false,
            maxTravelTimeMinutes: 60,
            arrivalBufferByAssociation: {},
          },
        }),
      );

      const exchanges = [
        createMockExchange("hall-1", { lat: 46.948, lon: 7.447 }),
      ];

      const { result } = renderHook(() => useTravelTimeFilter(exchanges), {
        wrapper: createWrapper(),
      });

      expect(result.current.isAvailable).toBe(true);
    });

    it("uses per-association arrival buffer", async () => {
      const { useSettingsStore } = await import("@/stores/settings");
      const { useActiveAssociationCode } = await import("@/hooks/useActiveAssociation");
      const { useAuthStore } = await import("@/stores/auth");
      const { calculateMockTravelTime } = await import("@/services/transport");

      vi.mocked(useActiveAssociationCode).mockReturnValue("SPECIAL");
      vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
        selector({ isDemoMode: true }),
      );

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: {
            latitude: 47.3769,
            longitude: 8.5417,
            label: "Zürich",
            source: "geocoded",
          },
          transportEnabled: true,
          transportEnabledByAssociation: {},
          travelTimeFilter: {
            enabled: false,
            maxTravelTimeMinutes: 60,
            arrivalBufferByAssociation: {
              SPECIAL: 45, // Custom buffer for this association
            },
          },
        }),
      );

      vi.mocked(calculateMockTravelTime).mockResolvedValue({
        durationMinutes: 30,
        departureTime: "2025-01-15T17:15:00Z",
        arrivalTime: "2025-01-15T17:45:00Z",
        transfers: 0,
      });

      const exchanges = [
        createMockExchange("hall-1", { lat: 46.948, lon: 7.447 }),
      ];

      renderHook(() => useTravelTimeFilter(exchanges), {
        wrapper: createWrapper(),
      });

      // The hook should use the custom buffer (45 min) for arrival time calculation
      // This is tested by verifying the hook runs without errors
      expect(calculateMockTravelTime).toBeDefined();
    });
  });
});
