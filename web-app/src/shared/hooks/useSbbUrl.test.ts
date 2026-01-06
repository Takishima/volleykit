import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSbbUrl } from "./useSbbUrl";

// Mock stores - simple mocks that return fixed values
vi.mock("@/shared/stores/auth", () => ({
  useAuthStore: vi.fn((selector: (state: { dataSource: string }) => unknown) =>
    selector({ dataSource: "demo" })
  ),
}));

vi.mock("@/shared/stores/settings", () => ({
  useSettingsStore: vi.fn((selector: (state: unknown) => unknown) =>
    selector({
      homeLocation: {
        latitude: 47.3769,
        longitude: 8.5417,
        label: "Zurich, Switzerland",
        source: "geocoded",
      },
      getArrivalBufferForAssociation: () => 30,
    })
  ),
}));

vi.mock("@/features/auth/hooks/useActiveAssociation", () => ({
  useActiveAssociationCode: () => "test-assoc",
}));

// Mock transport services
const mockCalculateMockTravelTime = vi.fn();
const mockGetCachedTravelTime = vi.fn();
const mockSetCachedTravelTime = vi.fn();

vi.mock("@/shared/services/transport", () => ({
  calculateTravelTime: vi.fn(),
  calculateMockTravelTime: (...args: unknown[]) => mockCalculateMockTravelTime(...args),
  isOjpConfigured: () => false, // Always use mock transport
  hashLocation: () => "location-hash",
  getDayType: () => "weekday",
  getCachedTravelTime: (...args: unknown[]) => mockGetCachedTravelTime(...args),
  setCachedTravelTime: (...args: unknown[]) => mockSetCachedTravelTime(...args),
}));

// Mock SBB URL utils
const mockGenerateSbbUrl = vi.fn();
const mockOpenSbbUrl = vi.fn();

vi.mock("@/shared/utils/sbb-url", () => ({
  generateSbbUrl: (...args: unknown[]) => mockGenerateSbbUrl(...args),
  calculateArrivalTime: (date: Date, buffer: number) => {
    const arrival = new Date(date);
    arrival.setMinutes(arrival.getMinutes() - buffer);
    return arrival;
  },
  openSbbUrl: (...args: unknown[]) => mockOpenSbbUrl(...args),
}));

describe("useSbbUrl", () => {
  const defaultOptions = {
    hallCoords: { latitude: 47.38, longitude: 8.54 },
    hallId: "hall-123",
    city: "Zurich",
    gameStartTime: "2024-03-15T14:00:00",
    language: "de" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateSbbUrl.mockReturnValue("https://sbb.ch/test");
    mockGetCachedTravelTime.mockReturnValue(null);
  });

  it("returns initial state", () => {
    const { result } = renderHook(() => useSbbUrl(defaultOptions));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.originStation).toBeUndefined();
    expect(result.current.destinationStation).toBeUndefined();
    expect(typeof result.current.openSbbConnection).toBe("function");
  });

  it("does nothing when city is missing", async () => {
    const { result } = renderHook(() =>
      useSbbUrl({ ...defaultOptions, city: undefined })
    );

    await act(async () => {
      await result.current.openSbbConnection();
    });

    expect(mockOpenSbbUrl).not.toHaveBeenCalled();
  });

  it("does nothing when gameStartTime is missing", async () => {
    const { result } = renderHook(() =>
      useSbbUrl({ ...defaultOptions, gameStartTime: undefined })
    );

    await act(async () => {
      await result.current.openSbbConnection();
    });

    expect(mockOpenSbbUrl).not.toHaveBeenCalled();
  });

  it("uses cached trip result when available", async () => {
    const cachedResult = {
      travelTimeMinutes: 45,
      originStation: { id: "origin-123", name: "Zurich HB" },
      destinationStation: { id: "dest-456", name: "Basel SBB" },
    };
    mockGetCachedTravelTime.mockReturnValue(cachedResult);

    const { result } = renderHook(() => useSbbUrl(defaultOptions));

    await act(async () => {
      await result.current.openSbbConnection();
    });

    // Should use cache, not call API
    expect(mockCalculateMockTravelTime).not.toHaveBeenCalled();
    expect(mockOpenSbbUrl).toHaveBeenCalled();
  });

  it("fetches trip data when not cached", async () => {
    mockCalculateMockTravelTime.mockResolvedValue({
      travelTimeMinutes: 30,
      originStation: { id: "mock-origin", name: "Mock Origin" },
      destinationStation: { id: "mock-dest", name: "Mock Dest" },
    });

    const { result } = renderHook(() => useSbbUrl(defaultOptions));

    await act(async () => {
      await result.current.openSbbConnection();
    });

    expect(mockCalculateMockTravelTime).toHaveBeenCalled();
    expect(mockOpenSbbUrl).toHaveBeenCalled();
  });

  it("stores station info after successful fetch", async () => {
    const tripResult = {
      travelTimeMinutes: 30,
      originStation: { id: "origin-id", name: "Origin Station" },
      destinationStation: { id: "dest-id", name: "Dest Station" },
    };
    mockCalculateMockTravelTime.mockResolvedValue(tripResult);

    const { result } = renderHook(() => useSbbUrl(defaultOptions));

    await act(async () => {
      await result.current.openSbbConnection();
    });

    expect(result.current.originStation).toEqual(tripResult.originStation);
    expect(result.current.destinationStation).toEqual(tripResult.destinationStation);
  });

  it("caches trip result after fetch", async () => {
    const tripResult = {
      travelTimeMinutes: 30,
      originStation: { id: "s1", name: "S1" },
      destinationStation: { id: "s2", name: "S2" },
    };
    mockCalculateMockTravelTime.mockResolvedValue(tripResult);

    const { result } = renderHook(() => useSbbUrl(defaultOptions));

    await act(async () => {
      await result.current.openSbbConnection();
    });

    expect(mockSetCachedTravelTime).toHaveBeenCalledWith(
      defaultOptions.hallId,
      expect.any(String),
      expect.any(String),
      tripResult
    );
  });

  it("handles fetch error gracefully and opens URL with fallback", async () => {
    mockCalculateMockTravelTime.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useSbbUrl(defaultOptions));

    await act(async () => {
      await result.current.openSbbConnection();
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.isLoading).toBe(false);
    // Should still open URL with fallback
    expect(mockOpenSbbUrl).toHaveBeenCalled();
  });

  it("converts non-Error exceptions to Error", async () => {
    mockCalculateMockTravelTime.mockRejectedValue("string error");

    const { result } = renderHook(() => useSbbUrl(defaultOptions));

    await act(async () => {
      await result.current.openSbbConnection();
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Failed to fetch trip data");
  });

  it("generates URL with station info", async () => {
    const tripResult = {
      travelTimeMinutes: 30,
      originStation: { id: "origin-id", name: "Origin Station" },
      destinationStation: { id: "dest-id", name: "Dest Station" },
    };
    mockCalculateMockTravelTime.mockResolvedValue(tripResult);

    const { result } = renderHook(() => useSbbUrl(defaultOptions));

    await act(async () => {
      await result.current.openSbbConnection();
    });

    expect(mockGenerateSbbUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: "Zurich",
        language: "de",
        originStation: tripResult.originStation,
        destinationStation: tripResult.destinationStation,
      })
    );
  });
});
