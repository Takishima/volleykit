import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAssociationSettings, useActiveSeason } from "./useSettings";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

/** Delay to allow React Query to process disabled queries before assertions */
const QUERY_SETTLE_DELAY_MS = 10;

// Mock dependencies
vi.mock("@/api/client", () => ({
  api: {
    getAssociationSettings: vi.fn(),
    getActiveSeason: vi.fn(),
  },
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn((selector: AnyFunction) =>
    selector({ dataSource: "api", activeOccupationId: "occupation-123" }),
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

/** Configure auth store mock with specified data source and occupation */
async function setupAuthStore(config: {
  dataSource: "api" | "demo" | "calendar";
  activeOccupationId: string | null;
}) {
  const { useAuthStore } = await import("@/stores/auth");
  vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
    selector(config),
  );
}

/** Get mocked API client */
async function getApi() {
  const { api } = await import("@/api/client");
  return api;
}

describe("useAssociationSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches association settings when not in demo mode", async () => {
    const mockSettings = {
      hoursAfterGameStartForRefereeToEditGameList: 6,
    };

    const api = await getApi();
    vi.mocked(api.getAssociationSettings).mockResolvedValue(mockSettings);

    const { result } = renderHook(() => useAssociationSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.getAssociationSettings).toHaveBeenCalled();
    expect(result.current.data).toEqual(mockSettings);
  });

  it("is disabled in demo mode", async () => {
    await setupAuthStore({ dataSource: "demo", activeOccupationId: null });
    const api = await getApi();

    const { result } = renderHook(() => useAssociationSettings(), {
      wrapper: createWrapper(),
    });

    // Wait for query to settle before checking disabled state
    await new Promise((r) => setTimeout(r, QUERY_SETTLE_DELAY_MS));

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.isPending).toBe(true);
    expect(api.getAssociationSettings).not.toHaveBeenCalled();
  });

  it("includes activeOccupationId in query key for cache invalidation on association switch", async () => {
    const api = await getApi();
    const mockSettings = {
      hoursAfterGameStartForRefereeToEditGameList: 6,
    };
    vi.mocked(api.getAssociationSettings).mockResolvedValue(mockSettings);

    // First render with one occupation
    await setupAuthStore({
      dataSource: "api",
      activeOccupationId: "occupation-1",
    });

    const wrapper1 = createWrapper();
    const { result: result1 } = renderHook(() => useAssociationSettings(), {
      wrapper: wrapper1,
    });

    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true);
    });

    expect(api.getAssociationSettings).toHaveBeenCalledTimes(1);

    // Second render with different occupation - should trigger new fetch
    await setupAuthStore({
      dataSource: "api",
      activeOccupationId: "occupation-2",
    });

    const wrapper2 = createWrapper();
    const { result: result2 } = renderHook(() => useAssociationSettings(), {
      wrapper: wrapper2,
    });

    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true);
    });

    // API should be called again because the occupation changed
    expect(api.getAssociationSettings).toHaveBeenCalledTimes(2);
  });

  it("handles API errors gracefully", async () => {
    await setupAuthStore({
      dataSource: "api",
      activeOccupationId: "occupation-123",
    });

    const api = await getApi();
    vi.mocked(api.getAssociationSettings).mockRejectedValue(
      new Error("Network error"),
    );

    const { result } = renderHook(() => useAssociationSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe("Network error");
  });
});

describe("useActiveSeason", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches active season when not in demo mode", async () => {
    await setupAuthStore({
      dataSource: "api",
      activeOccupationId: "occupation-123",
    });

    const mockSeason = {
      __identity: "season-1",
      seasonStartDate: "2024-09-01",
      seasonEndDate: "2025-06-30",
    };

    const api = await getApi();
    vi.mocked(api.getActiveSeason).mockResolvedValue(mockSeason);

    const { result } = renderHook(() => useActiveSeason(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.getActiveSeason).toHaveBeenCalled();
    expect(result.current.data).toEqual(mockSeason);
  });

  it("is disabled in demo mode", async () => {
    await setupAuthStore({ dataSource: "demo", activeOccupationId: null });
    const api = await getApi();

    const { result } = renderHook(() => useActiveSeason(), {
      wrapper: createWrapper(),
    });

    // Wait for query to settle before checking disabled state
    await new Promise((r) => setTimeout(r, QUERY_SETTLE_DELAY_MS));

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.isPending).toBe(true);
    expect(api.getActiveSeason).not.toHaveBeenCalled();
  });

  it("includes activeOccupationId in query key for cache invalidation on association switch", async () => {
    const api = await getApi();
    const mockSeason = {
      __identity: "season-1",
      seasonStartDate: "2024-09-01",
      seasonEndDate: "2025-06-30",
    };
    vi.mocked(api.getActiveSeason).mockResolvedValue(mockSeason);

    // First render with one occupation
    await setupAuthStore({
      dataSource: "api",
      activeOccupationId: "occupation-1",
    });

    const wrapper1 = createWrapper();
    const { result: result1 } = renderHook(() => useActiveSeason(), {
      wrapper: wrapper1,
    });

    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true);
    });

    expect(api.getActiveSeason).toHaveBeenCalledTimes(1);

    // Second render with different occupation - should trigger new fetch
    await setupAuthStore({
      dataSource: "api",
      activeOccupationId: "occupation-2",
    });

    const wrapper2 = createWrapper();
    const { result: result2 } = renderHook(() => useActiveSeason(), {
      wrapper: wrapper2,
    });

    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true);
    });

    // API should be called again because the occupation changed
    expect(api.getActiveSeason).toHaveBeenCalledTimes(2);
  });

  it("handles API errors gracefully", async () => {
    await setupAuthStore({
      dataSource: "api",
      activeOccupationId: "occupation-123",
    });

    const api = await getApi();
    vi.mocked(api.getActiveSeason).mockRejectedValue(
      new Error("API unavailable"),
    );

    const { result } = renderHook(() => useActiveSeason(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe("API unavailable");
  });
});
