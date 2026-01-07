import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTransportSettings } from "./useTransportSettings";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

// Mock dependencies
vi.mock("@/shared/stores/settings", () => ({
  useSettingsStore: vi.fn(),
  getDefaultArrivalBuffer: vi.fn(() => 30),
  MIN_ARRIVAL_BUFFER_MINUTES: 15,
  MAX_ARRIVAL_BUFFER_MINUTES: 120,
}));

vi.mock("@/features/auth/hooks/useActiveAssociation", () => ({
  useActiveAssociationCode: vi.fn(),
}));

vi.mock("@/shared/hooks/useTravelTime", () => ({
  useTravelTimeAvailable: vi.fn(),
}));

vi.mock("@/shared/services/transport", () => ({
  clearTravelTimeCache: vi.fn(),
  getTravelTimeCacheStats: vi.fn(() => ({ entryCount: 5, oldestEntryAge: null })),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

async function getSettingsStore() {
  const { useSettingsStore } = await import("@/shared/stores/settings");
  return useSettingsStore;
}

async function getActiveAssociation() {
  const { useActiveAssociationCode } = await import(
    "@/features/auth/hooks/useActiveAssociation"
  );
  return useActiveAssociationCode;
}

async function getTravelTimeAvailable() {
  const { useTravelTimeAvailable } = await import("@/shared/hooks/useTravelTime");
  return useTravelTimeAvailable;
}

async function getTransportService() {
  return await import("@/shared/services/transport");
}

describe("useTransportSettings", () => {
  const mockSetTransportEnabledForAssociation = vi.fn();
  const mockSetArrivalBufferForAssociation = vi.fn();
  const mockSetDistanceFilterForAssociation = vi.fn();
  const mockSetMaxTravelTimeForAssociation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  async function setupMocks(options: {
    homeLocation?: { latitude: number; longitude: number } | null;
    transportEnabled?: boolean;
    transportEnabledByAssociation?: Record<string, boolean>;
    arrivalBufferByAssociation?: Record<string, number>;
    distanceFilter?: { enabled: boolean; maxDistanceKm: number };
    distanceFilterByAssociation?: Record<string, { enabled: boolean; maxDistanceKm: number }>;
    maxTravelTimeByAssociation?: Record<string, number>;
    associationCode?: string | null;
    isTransportAvailable?: boolean;
    cacheEntryCount?: number;
  } = {}) {
    const useSettingsStore = await getSettingsStore();
    const useActiveAssociationCode = await getActiveAssociation();
    const useTravelTimeAvailable = await getTravelTimeAvailable();
    const transportService = await getTransportService();

    vi.mocked(useSettingsStore).mockImplementation((selector: AnyFunction) =>
      selector({
        homeLocation: options.homeLocation ?? null,
        transportEnabled: options.transportEnabled ?? false,
        transportEnabledByAssociation: options.transportEnabledByAssociation ?? {},
        setTransportEnabledForAssociation: mockSetTransportEnabledForAssociation,
        distanceFilter: options.distanceFilter ?? { enabled: false, maxDistanceKm: 50 },
        distanceFilterByAssociation: options.distanceFilterByAssociation ?? {},
        setDistanceFilterForAssociation: mockSetDistanceFilterForAssociation,
        travelTimeFilter: {
          maxTravelTimeMinutes: 120,
          maxTravelTimeByAssociation: options.maxTravelTimeByAssociation ?? {},
          arrivalBufferByAssociation: options.arrivalBufferByAssociation ?? {},
        },
        setMaxTravelTimeForAssociation: mockSetMaxTravelTimeForAssociation,
        setArrivalBufferForAssociation: mockSetArrivalBufferForAssociation,
      }),
    );

    vi.mocked(useActiveAssociationCode).mockReturnValue(
      "associationCode" in options ? (options.associationCode ?? undefined) : "FVRZ",
    );

    vi.mocked(useTravelTimeAvailable).mockReturnValue(
      options.isTransportAvailable ?? true,
    );

    vi.mocked(transportService.getTravelTimeCacheStats).mockReturnValue({
      entryCount: options.cacheEntryCount ?? 5,
      oldestEntryAge: null,
    });
  }

  it("returns transport enabled state for current association", async () => {
    await setupMocks({
      transportEnabledByAssociation: { FVRZ: true },
      associationCode: "FVRZ",
    });

    const { result } = renderHook(() => useTransportSettings(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isTransportEnabled).toBe(true);
  });

  it("returns fallback transport enabled state when no association override", async () => {
    await setupMocks({
      transportEnabled: true,
      transportEnabledByAssociation: {},
      associationCode: "FVRZ",
    });

    const { result } = renderHook(() => useTransportSettings(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isTransportEnabled).toBe(true);
  });

  it("returns transport disabled when globally disabled and no override", async () => {
    await setupMocks({
      transportEnabled: false,
      transportEnabledByAssociation: {},
    });

    const { result } = renderHook(() => useTransportSettings(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isTransportEnabled).toBe(false);
  });

  it("toggles transport for current association", async () => {
    await setupMocks({
      transportEnabledByAssociation: { FVRZ: false },
      associationCode: "FVRZ",
    });

    const { result } = renderHook(() => useTransportSettings(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.handleToggleTransport();
    });

    expect(mockSetTransportEnabledForAssociation).toHaveBeenCalledWith(
      "FVRZ",
      true,
    );
  });

  it("does not toggle when no association code", async () => {
    await setupMocks({
      associationCode: null,
    });

    const { result } = renderHook(() => useTransportSettings(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.handleToggleTransport();
    });

    expect(mockSetTransportEnabledForAssociation).not.toHaveBeenCalled();
  });

  it("provides cache entry count when transport enabled", async () => {
    await setupMocks({
      transportEnabledByAssociation: { FVRZ: true },
      associationCode: "FVRZ",
      cacheEntryCount: 10,
    });

    const { result } = renderHook(() => useTransportSettings(), {
      wrapper: createWrapper(),
    });

    expect(result.current.cacheEntryCount).toBe(10);
  });

  it("returns zero cache entries when transport disabled", async () => {
    await setupMocks({
      transportEnabledByAssociation: { FVRZ: false },
      associationCode: "FVRZ",
      cacheEntryCount: 10,
    });

    const { result } = renderHook(() => useTransportSettings(), {
      wrapper: createWrapper(),
    });

    expect(result.current.cacheEntryCount).toBe(0);
  });

  it("clears travel time cache", async () => {
    await setupMocks({
      transportEnabledByAssociation: { FVRZ: true },
      associationCode: "FVRZ",
    });
    const transportService = await getTransportService();

    const { result } = renderHook(() => useTransportSettings(), {
      wrapper: createWrapper(),
    });

    // First show confirm dialog
    act(() => {
      result.current.setShowClearConfirm(true);
    });

    expect(result.current.showClearConfirm).toBe(true);

    // Then clear cache
    act(() => {
      result.current.handleClearCache();
    });

    expect(transportService.clearTravelTimeCache).toHaveBeenCalled();
    expect(result.current.showClearConfirm).toBe(false);
  });

  it("debounces arrival buffer changes", async () => {
    await setupMocks({
      arrivalBufferByAssociation: { FVRZ: 30 },
      associationCode: "FVRZ",
    });

    const { result } = renderHook(() => useTransportSettings(), {
      wrapper: createWrapper(),
    });

    // Initial value
    expect(result.current.localArrivalBuffer).toBe(30);

    // Change value
    act(() => {
      result.current.handleArrivalBufferChange({
        target: { value: "45" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    // Local state updates immediately
    expect(result.current.localArrivalBuffer).toBe(45);

    // Store not yet updated (debounced)
    expect(mockSetArrivalBufferForAssociation).not.toHaveBeenCalled();

    // Fast-forward debounce timer (300ms)
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Now store should be updated
    expect(mockSetArrivalBufferForAssociation).toHaveBeenCalledWith("FVRZ", 45);
  });

  it("ignores invalid arrival buffer values", async () => {
    await setupMocks({
      arrivalBufferByAssociation: { FVRZ: 30 },
      associationCode: "FVRZ",
    });

    const { result } = renderHook(() => useTransportSettings(), {
      wrapper: createWrapper(),
    });

    // Try to set invalid value
    act(() => {
      result.current.handleArrivalBufferChange({
        target: { value: "invalid" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    // Value should remain unchanged
    expect(result.current.localArrivalBuffer).toBe(30);
    expect(mockSetArrivalBufferForAssociation).not.toHaveBeenCalled();
  });

  it("ignores arrival buffer below minimum", async () => {
    await setupMocks({
      arrivalBufferByAssociation: { FVRZ: 30 },
      associationCode: "FVRZ",
    });

    const { result } = renderHook(() => useTransportSettings(), {
      wrapper: createWrapper(),
    });

    // Try to set value below minimum (15)
    act(() => {
      result.current.handleArrivalBufferChange({
        target: { value: "5" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    // Value should remain unchanged
    expect(result.current.localArrivalBuffer).toBe(30);
    expect(mockSetArrivalBufferForAssociation).not.toHaveBeenCalled();
  });

  it("does not update arrival buffer without association code", async () => {
    await setupMocks({
      associationCode: null,
    });

    const { result } = renderHook(() => useTransportSettings(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.handleArrivalBufferChange({
        target: { value: "45" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockSetArrivalBufferForAssociation).not.toHaveBeenCalled();
  });

  it("provides transport availability state", async () => {
    await setupMocks({
      isTransportAvailable: true,
    });

    const { result } = renderHook(() => useTransportSettings(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isTransportAvailable).toBe(true);
  });

  it("provides home location state", async () => {
    await setupMocks({
      homeLocation: { latitude: 47.38, longitude: 8.54 },
    });

    const { result } = renderHook(() => useTransportSettings(), {
      wrapper: createWrapper(),
    });

    expect(result.current.hasHomeLocation).toBe(true);
  });

  it("determines if transport can be enabled", async () => {
    await setupMocks({
      homeLocation: { latitude: 47.38, longitude: 8.54 },
      isTransportAvailable: true,
      associationCode: "FVRZ",
    });

    const { result } = renderHook(() => useTransportSettings(), {
      wrapper: createWrapper(),
    });

    expect(result.current.canEnableTransport).toBe(true);
  });

  it("cannot enable transport without home location", async () => {
    await setupMocks({
      homeLocation: null,
      isTransportAvailable: true,
      associationCode: "FVRZ",
    });

    const { result } = renderHook(() => useTransportSettings(), {
      wrapper: createWrapper(),
    });

    expect(result.current.canEnableTransport).toBe(false);
  });

  it("cannot enable transport when not available", async () => {
    await setupMocks({
      homeLocation: { latitude: 47.38, longitude: 8.54 },
      isTransportAvailable: false,
      associationCode: "FVRZ",
    });

    const { result } = renderHook(() => useTransportSettings(), {
      wrapper: createWrapper(),
    });

    expect(result.current.canEnableTransport).toBe(false);
  });

  it("cannot enable transport without association", async () => {
    await setupMocks({
      homeLocation: { latitude: 47.38, longitude: 8.54 },
      isTransportAvailable: true,
      associationCode: null,
    });

    const { result } = renderHook(() => useTransportSettings(), {
      wrapper: createWrapper(),
    });

    expect(result.current.canEnableTransport).toBe(false);
  });

  it("provides arrival buffer constraints", async () => {
    await setupMocks();

    const { result } = renderHook(() => useTransportSettings(), {
      wrapper: createWrapper(),
    });

    expect(result.current.minArrivalBuffer).toBe(15);
    expect(result.current.maxArrivalBuffer).toBe(120);
  });

  it("provides association code", async () => {
    await setupMocks({ associationCode: "SVBF" });

    const { result } = renderHook(() => useTransportSettings(), {
      wrapper: createWrapper(),
    });

    expect(result.current.associationCode).toBe("SVBF");
  });

  it("uses store arrival buffer as initial local value", async () => {
    await setupMocks({
      arrivalBufferByAssociation: { FVRZ: 45 },
      associationCode: "FVRZ",
    });

    const { result } = renderHook(() => useTransportSettings(), {
      wrapper: createWrapper(),
    });

    // Local state should be initialized from store
    expect(result.current.localArrivalBuffer).toBe(45);
  });
});
