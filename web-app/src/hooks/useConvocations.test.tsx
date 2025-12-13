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
