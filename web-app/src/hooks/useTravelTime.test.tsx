import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTravelTime, formatTravelTime, useTravelTimeAvailable } from "./useTravelTime";
import type { TravelTimeResult, Coordinates } from "@/services/transport";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

// Mock the transport service
vi.mock("@/services/transport", () => ({
  calculateTravelTime: vi.fn(),
  calculateMockTravelTime: vi.fn(),
  isOjpConfigured: vi.fn(() => false),
  hashLocation: vi.fn((coords: Coordinates) => `${coords.latitude},${coords.longitude}`),
  TRAVEL_TIME_STALE_TIME: 7 * 24 * 60 * 60 * 1000,
  TRAVEL_TIME_GC_TIME: 7 * 24 * 60 * 60 * 1000,
}));

// Mock the stores - using AnyFunction to avoid strict type checking in tests
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
    }),
  ),
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

describe("useTravelTime", () => {
  const mockHallCoords: Coordinates = { latitude: 46.9480, longitude: 7.4474 };
  const mockHomeLocation = {
    latitude: 47.3769,
    longitude: 8.5417,
    label: "Zürich HB",
    source: "geocoded" as const,
  };

  const mockTravelTimeResult: TravelTimeResult = {
    durationMinutes: 75,
    departureTime: "2024-01-15T09:00:00Z",
    arrivalTime: "2024-01-15T10:15:00Z",
    transfers: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("query enabling conditions", () => {
    it("does not fetch when transport is disabled", async () => {
      const { calculateMockTravelTime } = await import("@/services/transport");
      const { useSettingsStore } = await import("@/stores/settings");

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: mockHomeLocation,
          transportEnabled: false,
        }),
      );

      const { result } = renderHook(
        () => useTravelTime("hall-1", mockHallCoords),
        { wrapper: createWrapper() },
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(calculateMockTravelTime).not.toHaveBeenCalled();
    });

    it("does not fetch when home location is not set", async () => {
      const { calculateMockTravelTime } = await import("@/services/transport");
      const { useSettingsStore } = await import("@/stores/settings");

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: null,
          transportEnabled: true,
        }),
      );

      const { result } = renderHook(
        () => useTravelTime("hall-1", mockHallCoords),
        { wrapper: createWrapper() },
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(calculateMockTravelTime).not.toHaveBeenCalled();
    });

    it("does not fetch when hall coordinates are null", async () => {
      const { calculateMockTravelTime } = await import("@/services/transport");
      const { useSettingsStore } = await import("@/stores/settings");

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: mockHomeLocation,
          transportEnabled: true,
        }),
      );

      const { result } = renderHook(
        () => useTravelTime("hall-1", null),
        { wrapper: createWrapper() },
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(calculateMockTravelTime).not.toHaveBeenCalled();
    });

    it("does not fetch when hall ID is undefined", async () => {
      const { calculateMockTravelTime } = await import("@/services/transport");
      const { useSettingsStore } = await import("@/stores/settings");

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: mockHomeLocation,
          transportEnabled: true,
        }),
      );

      const { result } = renderHook(
        () => useTravelTime(undefined, mockHallCoords),
        { wrapper: createWrapper() },
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(calculateMockTravelTime).not.toHaveBeenCalled();
    });
  });

  describe("demo mode", () => {
    it("uses mock transport in demo mode", async () => {
      const { calculateMockTravelTime } = await import("@/services/transport");
      const { useAuthStore } = await import("@/stores/auth");
      const { useSettingsStore } = await import("@/stores/settings");

      vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
        selector({ isDemoMode: true }),
      );

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: mockHomeLocation,
          transportEnabled: true,
        }),
      );

      vi.mocked(calculateMockTravelTime).mockResolvedValue(mockTravelTimeResult);

      const { result } = renderHook(
        () => useTravelTime("hall-1", mockHallCoords),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(calculateMockTravelTime).toHaveBeenCalledWith(
        { latitude: mockHomeLocation.latitude, longitude: mockHomeLocation.longitude },
        mockHallCoords,
      );
      expect(result.current.data?.durationMinutes).toBe(75);
    });
  });

  describe("production mode with OJP API", () => {
    it("uses real transport API when OJP is configured", async () => {
      const { calculateTravelTime, isOjpConfigured } = await import("@/services/transport");
      const { useAuthStore } = await import("@/stores/auth");
      const { useSettingsStore } = await import("@/stores/settings");

      vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
        selector({ isDemoMode: false }),
      );

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: mockHomeLocation,
          transportEnabled: true,
        }),
      );

      vi.mocked(isOjpConfigured).mockReturnValue(true);
      vi.mocked(calculateTravelTime).mockResolvedValue(mockTravelTimeResult);

      const { result } = renderHook(
        () => useTravelTime("hall-1", mockHallCoords),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(calculateTravelTime).toHaveBeenCalledWith(
        { latitude: mockHomeLocation.latitude, longitude: mockHomeLocation.longitude },
        mockHallCoords,
      );
      expect(result.current.data?.durationMinutes).toBe(75);
    });

    it("does not fetch when OJP API is not configured and not in demo mode", async () => {
      const { calculateTravelTime, isOjpConfigured } = await import("@/services/transport");
      const { useAuthStore } = await import("@/stores/auth");
      const { useSettingsStore } = await import("@/stores/settings");

      vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
        selector({ isDemoMode: false }),
      );

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: mockHomeLocation,
          transportEnabled: true,
        }),
      );

      vi.mocked(isOjpConfigured).mockReturnValue(false);

      const { result } = renderHook(
        () => useTravelTime("hall-1", mockHallCoords),
        { wrapper: createWrapper() },
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(calculateTravelTime).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("handles API errors gracefully", async () => {
      const { calculateMockTravelTime } = await import("@/services/transport");
      const { useAuthStore } = await import("@/stores/auth");
      const { useSettingsStore } = await import("@/stores/settings");

      vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
        selector({ isDemoMode: true }),
      );

      vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
        selector({
          homeLocation: mockHomeLocation,
          transportEnabled: true,
        }),
      );

      vi.mocked(calculateMockTravelTime).mockRejectedValue(new Error("API error"));

      const { result } = renderHook(
        () => useTravelTime("hall-1", mockHallCoords),
        { wrapper: createWrapper() },
      );

      // QueryClient is configured with retry: false, so error surfaces immediately
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("API error");
    });
  });
});

describe("formatTravelTime", () => {
  it("formats minutes less than 60", () => {
    expect(formatTravelTime(15)).toBe("15m");
    expect(formatTravelTime(45)).toBe("45m");
    expect(formatTravelTime(59)).toBe("59m");
  });

  it("formats exact hours", () => {
    expect(formatTravelTime(60)).toBe("1h");
    expect(formatTravelTime(120)).toBe("2h");
    expect(formatTravelTime(180)).toBe("3h");
  });

  it("formats hours and minutes", () => {
    expect(formatTravelTime(75)).toBe("1h 15m");
    expect(formatTravelTime(90)).toBe("1h 30m");
    expect(formatTravelTime(145)).toBe("2h 25m");
  });

  it("handles edge cases", () => {
    expect(formatTravelTime(0)).toBe("0m");
    expect(formatTravelTime(1)).toBe("1m");
    expect(formatTravelTime(61)).toBe("1h 1m");
  });
});

describe("useTravelTimeAvailable", () => {
  it("returns true in demo mode", async () => {
    const { useAuthStore } = await import("@/stores/auth");
    const { isOjpConfigured } = await import("@/services/transport");

    vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
      selector({ isDemoMode: true }),
    );
    vi.mocked(isOjpConfigured).mockReturnValue(false);

    const { result } = renderHook(() => useTravelTimeAvailable());

    expect(result.current).toBe(true);
  });

  it("returns true when OJP is configured", async () => {
    const { useAuthStore } = await import("@/stores/auth");
    const { isOjpConfigured } = await import("@/services/transport");

    vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
      selector({ isDemoMode: false }),
    );
    vi.mocked(isOjpConfigured).mockReturnValue(true);

    const { result } = renderHook(() => useTravelTimeAvailable());

    expect(result.current).toBe(true);
  });

  it("returns false when not in demo mode and OJP not configured", async () => {
    const { useAuthStore } = await import("@/stores/auth");
    const { isOjpConfigured } = await import("@/services/transport");

    vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
      selector({ isDemoMode: false }),
    );
    vi.mocked(isOjpConfigured).mockReturnValue(false);

    const { result } = renderHook(() => useTravelTimeAvailable());

    expect(result.current).toBe(false);
  });
});
