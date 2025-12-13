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
import * as apiModule from "@/api/client";
import * as authStore from "@/stores/auth";
import * as demoStore from "@/stores/demo";
import { addDays, subDays } from "date-fns";

vi.mock("@/api/client", () => ({
  api: {
    searchAssignments: vi.fn(),
    getAssignmentDetails: vi.fn(),
    searchCompensations: vi.fn(),
    searchExchanges: vi.fn(),
    applyForExchange: vi.fn(),
    withdrawFromExchange: vi.fn(),
  },
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

describe("useConvocations - Demo Mode Guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default demo store mock with empty arrays
    vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
      selector({
        assignments: [],
        compensations: [],
        exchanges: [],
      } as unknown as ReturnType<typeof demoStore.useDemoStore.getState>),
    );
  });

  describe("useAssignments", () => {
    it("should not call API when isDemoMode is true", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      // Wait for hook to settle
      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(apiModule.api.searchAssignments).not.toHaveBeenCalled();
    });

    it("should call API when isDemoMode is false", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: false } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      vi.mocked(apiModule.api.searchAssignments).mockResolvedValue({
        items: [],
        totalItemsCount: 0,
      } as Awaited<ReturnType<typeof apiModule.api.searchAssignments>>);

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(apiModule.api.searchAssignments).toHaveBeenCalled();
    });
  });

  describe("useAssignmentDetails", () => {
    it("should not call API when isDemoMode is true", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      const { result } = renderHook(
        () => useAssignmentDetails("test-assignment-id"),
        {
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(apiModule.api.getAssignmentDetails).not.toHaveBeenCalled();
    });

    it("should call API when isDemoMode is false and assignmentId is provided", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: false } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      vi.mocked(apiModule.api.getAssignmentDetails).mockResolvedValue({
        __identity: "test-assignment-id",
      } as Awaited<ReturnType<typeof apiModule.api.getAssignmentDetails>>);

      const { result } = renderHook(
        () => useAssignmentDetails("test-assignment-id"),
        {
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(apiModule.api.getAssignmentDetails).toHaveBeenCalledWith(
        "test-assignment-id",
        expect.any(Array),
      );
    });
  });

  describe("useCompensations", () => {
    it("should not call API when isDemoMode is true", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      const { result } = renderHook(() => useCompensations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(apiModule.api.searchCompensations).not.toHaveBeenCalled();
    });

    it("should call API when isDemoMode is false", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: false } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      vi.mocked(apiModule.api.searchCompensations).mockResolvedValue({
        items: [],
        totalItemsCount: 0,
      } as Awaited<ReturnType<typeof apiModule.api.searchCompensations>>);

      const { result } = renderHook(() => useCompensations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(apiModule.api.searchCompensations).toHaveBeenCalled();
    });
  });

  describe("useGameExchanges", () => {
    it("should not call API when isDemoMode is true", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      const { result } = renderHook(() => useGameExchanges(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(apiModule.api.searchExchanges).not.toHaveBeenCalled();
    });

    it("should call API when isDemoMode is false", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: false } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      vi.mocked(apiModule.api.searchExchanges).mockResolvedValue({
        items: [],
        totalItemsCount: 0,
      } as Awaited<ReturnType<typeof apiModule.api.searchExchanges>>);

      const { result } = renderHook(() => useGameExchanges(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(apiModule.api.searchExchanges).toHaveBeenCalled();
    });
  });

  describe("useApplyForExchange", () => {
    it("should not call API when isDemoMode is true", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      const { result } = renderHook(() => useApplyForExchange(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync("test-exchange-id");

      expect(apiModule.api.applyForExchange).not.toHaveBeenCalled();
    });

    it("should call API when isDemoMode is false", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: false } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      vi.mocked(apiModule.api.applyForExchange).mockResolvedValue(undefined);

      const { result } = renderHook(() => useApplyForExchange(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync("test-exchange-id");

      expect(apiModule.api.applyForExchange).toHaveBeenCalledWith(
        "test-exchange-id",
      );
    });
  });

  describe("useWithdrawFromExchange", () => {
    it("should not call API when isDemoMode is true", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      const { result } = renderHook(() => useWithdrawFromExchange(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync("test-exchange-id");

      expect(apiModule.api.withdrawFromExchange).not.toHaveBeenCalled();
    });

    it("should call API when isDemoMode is false", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: false } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      vi.mocked(apiModule.api.withdrawFromExchange).mockResolvedValue(
        undefined,
      );

      const { result } = renderHook(() => useWithdrawFromExchange(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync("test-exchange-id");

      expect(apiModule.api.withdrawFromExchange).toHaveBeenCalledWith(
        "test-exchange-id",
      );
    });
  });
});

describe("useConvocations - Demo Mode Data Filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useAssignments", () => {
    it("should filter demo assignments by date range for upcoming period", async () => {
      const now = new Date();
      const futureDate = addDays(now, 5).toISOString();
      const pastDate = subDays(now, 5).toISOString();

      const mockDemoAssignments = [
        {
          __identity: "future-1",
          refereeGame: { game: { startingDateTime: futureDate } },
        },
        {
          __identity: "past-1",
          refereeGame: { game: { startingDateTime: pastDate } },
        },
      ];

      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
        selector({
          assignments: mockDemoAssignments,
          compensations: [],
          exchanges: [],
        } as unknown as ReturnType<typeof demoStore.useDemoStore.getState>),
      );

      const { result } = renderHook(() => useAssignments("upcoming"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0]?.__identity).toBe("future-1");
    });

    it("should filter demo assignments by date range for past period", async () => {
      const now = new Date();
      const futureDate = addDays(now, 5).toISOString();
      const pastDate = subDays(now, 5).toISOString();

      const mockDemoAssignments = [
        {
          __identity: "future-1",
          refereeGame: { game: { startingDateTime: futureDate } },
        },
        {
          __identity: "past-1",
          refereeGame: { game: { startingDateTime: pastDate } },
        },
      ];

      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
        selector({
          assignments: mockDemoAssignments,
          compensations: [],
          exchanges: [],
        } as unknown as ReturnType<typeof demoStore.useDemoStore.getState>),
      );

      const { result } = renderHook(() => useAssignments("past"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0]?.__identity).toBe("past-1");
    });

    it("should sort upcoming demo assignments in ascending order", async () => {
      const now = new Date();
      const laterDate = addDays(now, 10).toISOString();
      const soonerDate = addDays(now, 2).toISOString();

      const mockDemoAssignments = [
        {
          __identity: "later",
          refereeGame: { game: { startingDateTime: laterDate } },
        },
        {
          __identity: "sooner",
          refereeGame: { game: { startingDateTime: soonerDate } },
        },
      ];

      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
        selector({
          assignments: mockDemoAssignments,
          compensations: [],
          exchanges: [],
        } as unknown as ReturnType<typeof demoStore.useDemoStore.getState>),
      );

      const { result } = renderHook(() => useAssignments("upcoming"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.[0]?.__identity).toBe("sooner");
      expect(result.current.data?.[1]?.__identity).toBe("later");
    });
  });

  describe("useAssignmentDetails", () => {
    it("should return demo assignment by ID when found", async () => {
      const mockDemoAssignments = [
        { __identity: "assignment-1", refereePosition: "head-one" },
        { __identity: "assignment-2", refereePosition: "linesman-one" },
      ];

      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
        selector({
          assignments: mockDemoAssignments,
          compensations: [],
          exchanges: [],
        } as unknown as ReturnType<typeof demoStore.useDemoStore.getState>),
      );

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

    it("should return error when demo assignment not found", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
        selector({
          assignments: [],
          compensations: [],
          exchanges: [],
        } as unknown as ReturnType<typeof demoStore.useDemoStore.getState>),
      );

      const { result } = renderHook(
        () => useAssignmentDetails("non-existent"),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Assignment not found");
    });
  });

  describe("useCompensations", () => {
    it("should filter demo compensations by paid status", async () => {
      const mockDemoCompensations = [
        {
          __identity: "comp-paid",
          convocationCompensation: { paymentDone: true },
          refereeGame: { game: { startingDateTime: "2025-01-01T10:00:00Z" } },
        },
        {
          __identity: "comp-unpaid",
          convocationCompensation: { paymentDone: false },
          refereeGame: { game: { startingDateTime: "2025-01-02T10:00:00Z" } },
        },
      ];

      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
        selector({
          assignments: [],
          compensations: mockDemoCompensations,
          exchanges: [],
        } as unknown as ReturnType<typeof demoStore.useDemoStore.getState>),
      );

      const { result } = renderHook(() => useCompensations(true), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0]?.__identity).toBe("comp-paid");
    });

    it("should return all demo compensations when no filter", async () => {
      const mockDemoCompensations = [
        {
          __identity: "comp-paid",
          convocationCompensation: { paymentDone: true },
          refereeGame: { game: { startingDateTime: "2025-01-01T10:00:00Z" } },
        },
        {
          __identity: "comp-unpaid",
          convocationCompensation: { paymentDone: false },
          refereeGame: { game: { startingDateTime: "2025-01-02T10:00:00Z" } },
        },
      ];

      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
        selector({
          assignments: [],
          compensations: mockDemoCompensations,
          exchanges: [],
        } as unknown as ReturnType<typeof demoStore.useDemoStore.getState>),
      );

      const { result } = renderHook(() => useCompensations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
    });

    it("should sort demo compensations in descending date order", async () => {
      const mockDemoCompensations = [
        {
          __identity: "comp-older",
          convocationCompensation: { paymentDone: true },
          refereeGame: { game: { startingDateTime: "2025-01-01T10:00:00Z" } },
        },
        {
          __identity: "comp-newer",
          convocationCompensation: { paymentDone: true },
          refereeGame: { game: { startingDateTime: "2025-01-15T10:00:00Z" } },
        },
      ];

      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
        selector({
          assignments: [],
          compensations: mockDemoCompensations,
          exchanges: [],
        } as unknown as ReturnType<typeof demoStore.useDemoStore.getState>),
      );

      const { result } = renderHook(() => useCompensations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.[0]?.__identity).toBe("comp-newer");
      expect(result.current.data?.[1]?.__identity).toBe("comp-older");
    });
  });

  describe("useGameExchanges", () => {
    it("should filter demo exchanges by status", async () => {
      const mockDemoExchanges = [
        {
          __identity: "exchange-open",
          status: "open",
          refereeGame: { game: { startingDateTime: "2025-01-01T10:00:00Z" } },
        },
        {
          __identity: "exchange-applied",
          status: "applied",
          refereeGame: { game: { startingDateTime: "2025-01-02T10:00:00Z" } },
        },
      ];

      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
        selector({
          assignments: [],
          compensations: [],
          exchanges: mockDemoExchanges,
        } as unknown as ReturnType<typeof demoStore.useDemoStore.getState>),
      );

      const { result } = renderHook(() => useGameExchanges("open"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0]?.__identity).toBe("exchange-open");
    });

    it("should return all demo exchanges when status is all", async () => {
      const mockDemoExchanges = [
        {
          __identity: "exchange-open",
          status: "open",
          refereeGame: { game: { startingDateTime: "2025-01-01T10:00:00Z" } },
        },
        {
          __identity: "exchange-applied",
          status: "applied",
          refereeGame: { game: { startingDateTime: "2025-01-02T10:00:00Z" } },
        },
      ];

      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
        selector({
          assignments: [],
          compensations: [],
          exchanges: mockDemoExchanges,
        } as unknown as ReturnType<typeof demoStore.useDemoStore.getState>),
      );

      const { result } = renderHook(() => useGameExchanges("all"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
    });

    it("should sort demo exchanges in ascending date order", async () => {
      const mockDemoExchanges = [
        {
          __identity: "exchange-later",
          status: "open",
          refereeGame: { game: { startingDateTime: "2025-01-15T10:00:00Z" } },
        },
        {
          __identity: "exchange-sooner",
          status: "open",
          refereeGame: { game: { startingDateTime: "2025-01-01T10:00:00Z" } },
        },
      ];

      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
        selector({
          assignments: [],
          compensations: [],
          exchanges: mockDemoExchanges,
        } as unknown as ReturnType<typeof demoStore.useDemoStore.getState>),
      );

      const { result } = renderHook(() => useGameExchanges("open"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.[0]?.__identity).toBe("exchange-sooner");
      expect(result.current.data?.[1]?.__identity).toBe("exchange-later");
    });
  });
});

describe("useConvocations - Null/Undefined Date Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should filter out assignments with missing dates and sort remaining items", async () => {
    const now = new Date();
    const futureDate1 = addDays(now, 5).toISOString();
    const futureDate2 = addDays(now, 10).toISOString();

    const mockDemoAssignments = [
      {
        __identity: "valid-later",
        refereeGame: { game: { startingDateTime: futureDate2 } },
      },
      {
        __identity: "missing-date",
        refereeGame: { game: {} },
      },
      {
        __identity: "valid-sooner",
        refereeGame: { game: { startingDateTime: futureDate1 } },
      },
      {
        __identity: "null-refereeGame",
        refereeGame: null,
      },
      {
        __identity: "undefined-game",
        refereeGame: { game: undefined },
      },
    ];

    vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
      selector({ isDemoMode: true } as ReturnType<
        typeof authStore.useAuthStore.getState
      >),
    );

    vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
      selector({
        assignments: mockDemoAssignments,
        compensations: [],
        exchanges: [],
      } as unknown as ReturnType<typeof demoStore.useDemoStore.getState>),
    );

    const { result } = renderHook(() => useAssignments("upcoming"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0]?.__identity).toBe("valid-sooner");
    expect(result.current.data?.[1]?.__identity).toBe("valid-later");
  });

  it("should handle items with undefined dates during sorting by treating them as epoch", async () => {
    const mockDemoCompensations = [
      {
        __identity: "comp-with-date",
        convocationCompensation: { paymentDone: true },
        refereeGame: { game: { startingDateTime: "2025-01-15T10:00:00Z" } },
      },
      {
        __identity: "comp-missing-date",
        convocationCompensation: { paymentDone: true },
        refereeGame: { game: {} },
      },
    ];

    vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
      selector({ isDemoMode: true } as ReturnType<
        typeof authStore.useAuthStore.getState
      >),
    );

    vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
      selector({
        assignments: [],
        compensations: mockDemoCompensations,
        exchanges: [],
      } as unknown as ReturnType<typeof demoStore.useDemoStore.getState>),
    );

    const { result } = renderHook(() => useCompensations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0]?.__identity).toBe("comp-with-date");
    expect(result.current.data?.[1]?.__identity).toBe("comp-missing-date");
  });
});
