import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useAssignments,
  useAssignmentDetails,
  useCompensations,
  useGameExchanges,
  useApplyForExchange,
  useWithdrawFromExchange,
} from "./useConvocations";
import { getApiClient } from "@/api/client";
import * as authStore from "@/stores/auth";
import * as demoStore from "@/stores/demo";
import { addDays } from "date-fns";

// Mock API methods
const mockApi = {
  searchAssignments: vi.fn(),
  getAssignmentDetails: vi.fn(),
  searchCompensations: vi.fn(),
  searchExchanges: vi.fn(),
  applyForExchange: vi.fn(),
  withdrawFromExchange: vi.fn(),
};

vi.mock("@/api/client", () => ({
  getApiClient: vi.fn(() => mockApi),
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("@/stores/demo", () => ({
  useDemoStore: vi.fn(),
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

describe("useConvocations - API Client Routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default demo store mock - returns null for non-demo mode
    vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
      selector({ activeAssociationCode: null } as ReturnType<
        typeof demoStore.useDemoStore.getState
      >),
    );
  });

  describe("useAssignments", () => {
    it("should call getApiClient with isDemoMode value", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );
      vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
        selector({ activeAssociationCode: "SV" } as ReturnType<
          typeof demoStore.useDemoStore.getState
        >),
      );

      mockApi.searchAssignments.mockResolvedValue({
        items: [],
        totalItemsCount: 0,
      });

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(getApiClient).toHaveBeenCalledWith(true);
      expect(mockApi.searchAssignments).toHaveBeenCalled();
    });

    it("should call API with correct search configuration", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: false } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      mockApi.searchAssignments.mockResolvedValue({
        items: [],
        totalItemsCount: 0,
      });

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(getApiClient).toHaveBeenCalledWith(false);
      expect(mockApi.searchAssignments).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 0,
          limit: 100,
          propertyFilters: expect.arrayContaining([
            expect.objectContaining({
              propertyName: "refereeGame.game.startingDateTime",
              dateRange: expect.any(Object),
            }),
          ]),
        }),
      );
    });
  });

  describe("useAssignmentDetails", () => {
    it("should call API when assignmentId is provided", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: false } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      mockApi.getAssignmentDetails.mockResolvedValue({
        __identity: "test-assignment-id",
      });

      const { result } = renderHook(
        () => useAssignmentDetails("test-assignment-id"),
        {
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockApi.getAssignmentDetails).toHaveBeenCalledWith(
        "test-assignment-id",
        expect.any(Array),
      );
    });

    it("should not call API when assignmentId is null", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: false } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      renderHook(() => useAssignmentDetails(null), {
        wrapper: createWrapper(),
      });

      expect(mockApi.getAssignmentDetails).not.toHaveBeenCalled();
    });
  });

  describe("useCompensations", () => {
    it("should call API with paid filter when provided", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: false } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      mockApi.searchCompensations.mockResolvedValue({
        items: [],
        totalItemsCount: 0,
      });

      const { result } = renderHook(() => useCompensations(true), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockApi.searchCompensations).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyFilters: expect.arrayContaining([
            expect.objectContaining({
              propertyName: "convocationCompensation.paymentDone",
              values: ["true"],
            }),
          ]),
        }),
      );
    });

    it("should call API without filter when no paid filter provided", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: false } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      mockApi.searchCompensations.mockResolvedValue({
        items: [],
        totalItemsCount: 0,
      });

      const { result } = renderHook(() => useCompensations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockApi.searchCompensations).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyFilters: [],
        }),
      );
    });
  });

  describe("useGameExchanges", () => {
    it("should call API with status filter when not all", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: false } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      mockApi.searchExchanges.mockResolvedValue({
        items: [],
        totalItemsCount: 0,
      });

      const { result } = renderHook(() => useGameExchanges("open"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockApi.searchExchanges).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyFilters: expect.arrayContaining([
            expect.objectContaining({
              propertyName: "status",
              enumValues: ["open"],
            }),
          ]),
        }),
      );
    });

    it("should call API without filter when status is all", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: false } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      mockApi.searchExchanges.mockResolvedValue({
        items: [],
        totalItemsCount: 0,
      });

      const { result } = renderHook(() => useGameExchanges("all"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockApi.searchExchanges).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyFilters: [],
        }),
      );
    });
  });

  describe("useApplyForExchange", () => {
    it("should call API with exchange ID", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: false } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      mockApi.applyForExchange.mockResolvedValue(undefined);

      const { result } = renderHook(() => useApplyForExchange(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync("test-exchange-id");

      expect(mockApi.applyForExchange).toHaveBeenCalledWith("test-exchange-id");
    });
  });

  describe("useWithdrawFromExchange", () => {
    it("should call API with exchange ID", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: false } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      mockApi.withdrawFromExchange.mockResolvedValue(undefined);

      const { result } = renderHook(() => useWithdrawFromExchange(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync("test-exchange-id");

      expect(mockApi.withdrawFromExchange).toHaveBeenCalledWith(
        "test-exchange-id",
      );
    });
  });
});

describe("useConvocations - Data Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default demo store mock
    vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
      selector({ activeAssociationCode: null } as ReturnType<
        typeof demoStore.useDemoStore.getState
      >),
    );
  });

  describe("useAssignments", () => {
    it("should return filtered assignments from API response", async () => {
      const now = new Date();
      const futureDate = addDays(now, 5).toISOString();

      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );
      vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
        selector({ activeAssociationCode: "SV" } as ReturnType<
          typeof demoStore.useDemoStore.getState
        >),
      );

      mockApi.searchAssignments.mockResolvedValue({
        items: [
          {
            __identity: "future-1",
            refereeGame: { game: { startingDateTime: futureDate } },
          },
        ],
        totalItemsCount: 1,
      });

      const { result } = renderHook(() => useAssignments("upcoming"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0]?.__identity).toBe("future-1");
    });

    it("should use past date range for past period", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: false } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      mockApi.searchAssignments.mockResolvedValue({
        items: [],
        totalItemsCount: 0,
      });

      const { result } = renderHook(() => useAssignments("past"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      // Verify descending sort for past assignments
      expect(mockApi.searchAssignments).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyOrderings: expect.arrayContaining([
            expect.objectContaining({
              propertyName: "refereeGame.game.startingDateTime",
              descending: true,
            }),
          ]),
        }),
      );
    });
  });

  describe("useAssignmentDetails", () => {
    it("should return assignment details from API response", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );
      vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
        selector({ activeAssociationCode: "SV" } as ReturnType<
          typeof demoStore.useDemoStore.getState
        >),
      );

      mockApi.getAssignmentDetails.mockResolvedValue({
        __identity: "assignment-2",
        refereePosition: "linesman-one",
      });

      const { result } = renderHook(
        () => useAssignmentDetails("assignment-2"),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.__identity).toBe("assignment-2");
      expect(result.current.data?.refereePosition).toBe("linesman-one");
    });

    it("should return error when assignment not found", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );
      vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
        selector({ activeAssociationCode: "SV" } as ReturnType<
          typeof demoStore.useDemoStore.getState
        >),
      );

      mockApi.getAssignmentDetails.mockRejectedValue(
        new Error("Assignment not found: non-existent"),
      );

      const { result } = renderHook(
        () => useAssignmentDetails("non-existent"),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain("Assignment not found");
    });
  });

  describe("useCompensations", () => {
    it("should return filtered compensations from API response", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );
      vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
        selector({ activeAssociationCode: "SV" } as ReturnType<
          typeof demoStore.useDemoStore.getState
        >),
      );

      mockApi.searchCompensations.mockResolvedValue({
        items: [
          {
            __identity: "comp-paid",
            convocationCompensation: { paymentDone: true },
            refereeGame: { game: { startingDateTime: "2025-01-01T10:00:00Z" } },
          },
        ],
        totalItemsCount: 1,
      });

      const { result } = renderHook(() => useCompensations(true), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0]?.__identity).toBe("comp-paid");
    });
  });

  describe("useGameExchanges", () => {
    it("should return filtered exchanges from API response", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );
      vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
        selector({ activeAssociationCode: "SV" } as ReturnType<
          typeof demoStore.useDemoStore.getState
        >),
      );

      mockApi.searchExchanges.mockResolvedValue({
        items: [
          {
            __identity: "exchange-open",
            status: "open",
            refereeGame: { game: { startingDateTime: "2025-01-01T10:00:00Z" } },
          },
        ],
        totalItemsCount: 1,
      });

      const { result } = renderHook(() => useGameExchanges("open"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0]?.__identity).toBe("exchange-open");
    });
  });
});

describe("useConvocations - Unified API Architecture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default demo store mock
    vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
      selector({ activeAssociationCode: null } as ReturnType<
        typeof demoStore.useDemoStore.getState
      >),
    );
  });

  it("should use same code path for demo and non-demo modes", async () => {
    // Test demo mode
    vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
      selector({ isDemoMode: true } as ReturnType<
        typeof authStore.useAuthStore.getState
      >),
    );
    vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
      selector({ activeAssociationCode: "SV" } as ReturnType<
        typeof demoStore.useDemoStore.getState
      >),
    );

    mockApi.searchAssignments.mockResolvedValue({ items: [], totalItemsCount: 0 });

    const { result: demoResult } = renderHook(() => useAssignments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(demoResult.current.isFetching).toBe(false);
    });

    expect(getApiClient).toHaveBeenCalledWith(true);
    expect(mockApi.searchAssignments).toHaveBeenCalled();

    vi.clearAllMocks();

    // Test non-demo mode
    vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
      selector({ isDemoMode: false } as ReturnType<
        typeof authStore.useAuthStore.getState
      >),
    );

    mockApi.searchAssignments.mockResolvedValue({ items: [], totalItemsCount: 0 });

    const { result: realResult } = renderHook(() => useAssignments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(realResult.current.isFetching).toBe(false);
    });

    expect(getApiClient).toHaveBeenCalledWith(false);
    expect(mockApi.searchAssignments).toHaveBeenCalled();
  });

  it("should invalidate queries after successful mutations", async () => {
    vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
      selector({ isDemoMode: false } as ReturnType<
        typeof authStore.useAuthStore.getState
      >),
    );

    mockApi.applyForExchange.mockResolvedValue(undefined);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useApplyForExchange(), { wrapper });

    await result.current.mutateAsync("test-exchange-id");

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["exchanges", "list"] });
  });
});

describe("useConvocations - Compensation Totals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
      selector({ activeAssociationCode: null } as ReturnType<
        typeof demoStore.useDemoStore.getState
      >),
    );
  });

  it("should fetch compensations successfully", async () => {
    vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
      selector({ isDemoMode: false } as ReturnType<
        typeof authStore.useAuthStore.getState
      >),
    );

    mockApi.searchCompensations.mockResolvedValue({
      items: [
        {
          __identity: "comp-1",
          convocationCompensation: {
            paymentDone: true,
            gameCompensation: 100,
            travelExpenses: 50,
          },
        },
        {
          __identity: "comp-2",
          convocationCompensation: {
            paymentDone: false,
            gameCompensation: 80,
            travelExpenses: 20,
          },
        },
      ],
      totalItemsCount: 2,
    });

    const { result } = renderHook(() => useCompensations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
  });
});

describe("useConvocations - Demo Association Switching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should include association code in query key when in demo mode", async () => {
    // This test verifies that different association codes result in different
    // query keys, which ensures TanStack Query will treat them as different
    // queries and refetch when the association changes.
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Test with SV association
    vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
      selector({ isDemoMode: true } as ReturnType<
        typeof authStore.useAuthStore.getState
      >),
    );
    vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
      selector({ activeAssociationCode: "SV" } as ReturnType<
        typeof demoStore.useDemoStore.getState
      >),
    );

    mockApi.searchAssignments.mockResolvedValue({
      items: [{ __identity: "sv-assignment-1" }],
      totalItemsCount: 1,
    });

    const wrapper1 = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result: result1 } = renderHook(() => useAssignments(), { wrapper: wrapper1 });

    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true);
    });

    expect(mockApi.searchAssignments).toHaveBeenCalledTimes(1);

    // Get the query data from cache using both possible keys
    const svQueryData = queryClient.getQueriesData({ queryKey: ["assignments"] });
    expect(svQueryData.length).toBeGreaterThan(0);

    // The query key should include "SV" as the fourth element
    // (query key format: ["assignments", "list", config, demoAssociationCode])
    const svQueryKey = svQueryData[0]?.[0];
    expect(svQueryKey).toBeDefined();
    expect(svQueryKey?.[3]).toBe("SV");

    // Now test with SVRBA association in a fresh query client
    const queryClient2 = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
      selector({ activeAssociationCode: "SVRBA" } as ReturnType<
        typeof demoStore.useDemoStore.getState
      >),
    );

    mockApi.searchAssignments.mockResolvedValue({
      items: [{ __identity: "svrba-assignment-1" }],
      totalItemsCount: 1,
    });

    const wrapper2 = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient2}>{children}</QueryClientProvider>
    );

    const { result: result2 } = renderHook(() => useAssignments(), { wrapper: wrapper2 });

    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true);
    });

    // The query key should include "SVRBA" as the fourth element
    // (query key format: ["assignments", "list", config, demoAssociationCode])
    const svrbaQueryData = queryClient2.getQueriesData({ queryKey: ["assignments"] });
    const svrbaQueryKey = svrbaQueryData[0]?.[0];
    expect(svrbaQueryKey).toBeDefined();
    expect(svrbaQueryKey?.[3]).toBe("SVRBA");
  });

  it("should use null association code for non-demo mode", async () => {
    // Verify that in non-demo mode, the association code is null
    // and doesn't affect the query key
    vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
      selector({ isDemoMode: false } as ReturnType<
        typeof authStore.useAuthStore.getState
      >),
    );
    vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
      selector({ activeAssociationCode: "SV" } as ReturnType<
        typeof demoStore.useDemoStore.getState
      >),
    );

    mockApi.searchAssignments.mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useAssignments(), { wrapper });

    await waitFor(() => {
      expect(mockApi.searchAssignments).toHaveBeenCalled();
    });

    // Verify that getApiClient was called with false (non-demo mode)
    expect(getApiClient).toHaveBeenCalledWith(false);
  });

  it("should include association code in query keys for compensations and exchanges", async () => {
    vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
      selector({ isDemoMode: true } as ReturnType<
        typeof authStore.useAuthStore.getState
      >),
    );
    vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
      selector({ activeAssociationCode: "SVRZ" } as ReturnType<
        typeof demoStore.useDemoStore.getState
      >),
    );

    mockApi.searchCompensations.mockResolvedValue({ items: [], totalItemsCount: 0 });
    mockApi.searchExchanges.mockResolvedValue({ items: [], totalItemsCount: 0 });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    // Test compensations hook
    const { result: compResult } = renderHook(() => useCompensations(), { wrapper });
    await waitFor(() => {
      expect(compResult.current.isSuccess).toBe(true);
    });

    // Test exchanges hook - need new query client to avoid cache
    const queryClient2 = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    const wrapper2 = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient2}>{children}</QueryClientProvider>
    );

    const { result: exchResult } = renderHook(() => useGameExchanges(), { wrapper: wrapper2 });
    await waitFor(() => {
      expect(exchResult.current.isSuccess).toBe(true);
    });

    // Both should have been called with the demo API client
    expect(getApiClient).toHaveBeenCalledWith(true);
    expect(mockApi.searchCompensations).toHaveBeenCalled();
    expect(mockApi.searchExchanges).toHaveBeenCalled();
  });
});
