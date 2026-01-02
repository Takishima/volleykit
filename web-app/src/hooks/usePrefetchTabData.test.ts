import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { prefetchAllTabData } from "./usePrefetchTabData";
import {
  ASSIGNMENTS_STALE_TIME_MS,
  COMPENSATIONS_STALE_TIME_MS,
  EXCHANGES_STALE_TIME_MS,
  SETTINGS_STALE_TIME_MS,
  SEASON_STALE_TIME_MS,
} from "./usePaginatedQuery";

// Mock dependencies
vi.mock("@/api/client", () => ({
  api: {
    searchAssignments: vi.fn(),
    searchCompensations: vi.fn(),
    searchExchanges: vi.fn(),
    getAssociationSettings: vi.fn(),
    getActiveSeason: vi.fn(),
  },
}));

vi.mock("@/utils/date-helpers", () => ({
  getSeasonDateRange: vi.fn(() => ({
    from: new Date("2024-09-01"),
    to: new Date("2025-05-31"),
  })),
}));

vi.mock("@/utils/logger", () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe("prefetchAllTabData", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("prefetches all tab data in parallel", async () => {
    const { api } = await import("@/api/client");

    vi.mocked(api.searchAssignments).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });
    vi.mocked(api.searchCompensations).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });
    vi.mocked(api.searchExchanges).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });
    vi.mocked(api.getAssociationSettings).mockResolvedValue({
      hoursAfterGameStartForRefereeToEditGameList: 6,
    });
    vi.mocked(api.getActiveSeason).mockResolvedValue({
      seasonStartDate: "2024-09-01",
      seasonEndDate: "2025-05-31",
    });

    await prefetchAllTabData(queryClient, "occupation-123");

    expect(api.searchAssignments).toHaveBeenCalledTimes(1);
    expect(api.searchCompensations).toHaveBeenCalledTimes(1);
    expect(api.searchExchanges).toHaveBeenCalledTimes(1);
    expect(api.getAssociationSettings).toHaveBeenCalledTimes(1);
    expect(api.getActiveSeason).toHaveBeenCalledTimes(1);
  });

  it("uses correct query keys with occupation ID", async () => {
    const { api } = await import("@/api/client");

    vi.mocked(api.searchAssignments).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });
    vi.mocked(api.searchCompensations).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });
    vi.mocked(api.searchExchanges).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });
    vi.mocked(api.getAssociationSettings).mockResolvedValue({});
    vi.mocked(api.getActiveSeason).mockResolvedValue({});

    const prefetchSpy = vi.spyOn(queryClient, "prefetchQuery");

    await prefetchAllTabData(queryClient, "occupation-456");

    // Verify prefetchQuery was called 5 times
    expect(prefetchSpy).toHaveBeenCalledTimes(5);

    // Check that occupation ID is included in query keys
    const calls = prefetchSpy.mock.calls;
    expect(calls[0]![0]).toMatchObject({
      queryKey: expect.arrayContaining(["occupation-456"]),
      staleTime: ASSIGNMENTS_STALE_TIME_MS,
    });
    expect(calls[1]![0]).toMatchObject({
      queryKey: expect.arrayContaining(["occupation-456"]),
      staleTime: COMPENSATIONS_STALE_TIME_MS,
    });
    expect(calls[2]![0]).toMatchObject({
      queryKey: expect.arrayContaining(["occupation-456"]),
      staleTime: EXCHANGES_STALE_TIME_MS,
    });
    expect(calls[3]![0]).toMatchObject({
      queryKey: expect.arrayContaining(["occupation-456"]),
      staleTime: SETTINGS_STALE_TIME_MS,
    });
    expect(calls[4]![0]).toMatchObject({
      queryKey: expect.arrayContaining(["occupation-456"]),
      staleTime: SEASON_STALE_TIME_MS,
    });
  });

  it("continues prefetching other queries when one fails", async () => {
    const { api } = await import("@/api/client");

    // First query fails
    vi.mocked(api.searchAssignments).mockRejectedValue(
      new Error("Network error"),
    );
    // Rest succeed
    vi.mocked(api.searchCompensations).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });
    vi.mocked(api.searchExchanges).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });
    vi.mocked(api.getAssociationSettings).mockResolvedValue({});
    vi.mocked(api.getActiveSeason).mockResolvedValue({});

    // Should not throw, failures are caught internally
    await expect(
      prefetchAllTabData(queryClient, "occupation-123"),
    ).resolves.toBeUndefined();

    // All APIs should have been called despite first failure
    expect(api.searchAssignments).toHaveBeenCalled();
    expect(api.searchCompensations).toHaveBeenCalled();
    expect(api.searchExchanges).toHaveBeenCalled();
    expect(api.getAssociationSettings).toHaveBeenCalled();
    expect(api.getActiveSeason).toHaveBeenCalled();
  });

  it("handles all queries failing gracefully", async () => {
    const { api } = await import("@/api/client");

    vi.mocked(api.searchAssignments).mockRejectedValue(new Error("Error 1"));
    vi.mocked(api.searchCompensations).mockRejectedValue(new Error("Error 2"));
    vi.mocked(api.searchExchanges).mockRejectedValue(new Error("Error 3"));
    vi.mocked(api.getAssociationSettings).mockRejectedValue(
      new Error("Error 4"),
    );
    vi.mocked(api.getActiveSeason).mockRejectedValue(new Error("Error 5"));

    // Should not throw
    await expect(
      prefetchAllTabData(queryClient, "occupation-123"),
    ).resolves.toBeUndefined();
  });

  it("uses correct search configurations for assignments", async () => {
    const { api } = await import("@/api/client");

    vi.mocked(api.searchAssignments).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });
    vi.mocked(api.searchCompensations).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });
    vi.mocked(api.searchExchanges).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });
    vi.mocked(api.getAssociationSettings).mockResolvedValue({});
    vi.mocked(api.getActiveSeason).mockResolvedValue({});

    await prefetchAllTabData(queryClient, "occupation-123");

    // Verify assignments config has correct structure
    expect(api.searchAssignments).toHaveBeenCalledWith(
      expect.objectContaining({
        offset: 0,
        limit: 100,
        propertyFilters: expect.arrayContaining([
          expect.objectContaining({
            propertyName: "refereeGame.game.startingDateTime",
            dateRange: expect.objectContaining({
              from: expect.any(String),
              to: expect.any(String),
            }),
          }),
        ]),
        propertyOrderings: expect.arrayContaining([
          expect.objectContaining({
            propertyName: "refereeGame.game.startingDateTime",
            descending: false,
          }),
        ]),
      }),
    );
  });

  it("uses correct search configurations for compensations", async () => {
    const { api } = await import("@/api/client");

    vi.mocked(api.searchAssignments).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });
    vi.mocked(api.searchCompensations).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });
    vi.mocked(api.searchExchanges).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });
    vi.mocked(api.getAssociationSettings).mockResolvedValue({});
    vi.mocked(api.getActiveSeason).mockResolvedValue({});

    await prefetchAllTabData(queryClient, "occupation-123");

    // Verify compensations config - no date filter, sorted descending
    expect(api.searchCompensations).toHaveBeenCalledWith(
      expect.objectContaining({
        offset: 0,
        limit: 100,
        propertyFilters: [],
        propertyOrderings: expect.arrayContaining([
          expect.objectContaining({
            propertyName: "refereeGame.game.startingDateTime",
            descending: true,
          }),
        ]),
      }),
    );
  });

  it("uses correct search configurations for exchanges", async () => {
    const { api } = await import("@/api/client");

    vi.mocked(api.searchAssignments).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });
    vi.mocked(api.searchCompensations).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });
    vi.mocked(api.searchExchanges).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });
    vi.mocked(api.getAssociationSettings).mockResolvedValue({});
    vi.mocked(api.getActiveSeason).mockResolvedValue({});

    await prefetchAllTabData(queryClient, "occupation-123");

    // Verify exchanges config has date filter and ascending order
    expect(api.searchExchanges).toHaveBeenCalledWith(
      expect.objectContaining({
        offset: 0,
        limit: 100,
        propertyFilters: expect.arrayContaining([
          expect.objectContaining({
            propertyName: "refereeGame.game.startingDateTime",
            dateRange: expect.objectContaining({
              from: expect.any(String),
              to: expect.any(String),
            }),
          }),
        ]),
        propertyOrderings: expect.arrayContaining([
          expect.objectContaining({
            propertyName: "refereeGame.game.startingDateTime",
            descending: false,
          }),
        ]),
      }),
    );
  });

  it("caches prefetched data in query client", async () => {
    const { api } = await import("@/api/client");

    vi.mocked(api.searchAssignments).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });
    vi.mocked(api.searchCompensations).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });
    vi.mocked(api.searchExchanges).mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });
    vi.mocked(api.getAssociationSettings).mockResolvedValue({
      hoursAfterGameStartForRefereeToEditGameList: 6,
    });
    vi.mocked(api.getActiveSeason).mockResolvedValue({
      seasonStartDate: "2024-09-01",
    });

    await prefetchAllTabData(queryClient, "occupation-123");

    // Verify data is cached - getQueriesData returns cached queries
    const cachedQueries = queryClient.getQueriesData({ queryKey: ["assignments"] });
    expect(cachedQueries.length).toBeGreaterThan(0);
  });
});

describe("stale time constants", () => {
  it("has correct values", () => {
    expect(ASSIGNMENTS_STALE_TIME_MS).toBe(5 * 60 * 1000);
    expect(COMPENSATIONS_STALE_TIME_MS).toBe(5 * 60 * 1000);
    expect(EXCHANGES_STALE_TIME_MS).toBe(2 * 60 * 1000);
    expect(SETTINGS_STALE_TIME_MS).toBe(30 * 60 * 1000);
    expect(SEASON_STALE_TIME_MS).toBe(60 * 60 * 1000);
  });
});
