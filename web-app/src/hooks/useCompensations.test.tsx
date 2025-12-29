import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useCompensations,
  usePaidCompensations,
  useUnpaidCompensations,
  useCompensationTotals,
  useUpdateCompensation,
  useUpdateAssignmentCompensation,
  COMPENSATION_ERROR_KEYS,
} from "./useCompensations";
import type { CompensationRecord } from "@/api/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

// Mock dependencies
vi.mock("@/api/client", () => ({
  getApiClient: vi.fn(() => ({
    searchCompensations: vi.fn(),
    updateCompensation: vi.fn(),
  })),
  api: {
    searchCompensations: vi.fn(),
    updateCompensation: vi.fn(),
  },
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn((selector: AnyFunction) =>
    selector({ isDemoMode: false }),
  ),
}));

vi.mock("@/stores/demo", () => ({
  useDemoStore: vi.fn((selector: AnyFunction) =>
    selector({
      activeAssociationCode: "TEST",
      updateAssignmentCompensation: vi.fn(),
    }),
  ),
}));

vi.mock("@/api/queryKeys", () => ({
  queryKeys: {
    compensations: {
      list: vi.fn((config, code) => ["compensations", "list", config, code]),
      lists: vi.fn(() => ["compensations", "list"]),
      all: ["compensations"],
    },
    assignments: {
      detail: vi.fn((id) => ["assignments", "detail", id]),
      lists: vi.fn(() => ["assignments", "list"]),
      all: ["assignments"],
    },
  },
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function createWrapper(queryClient?: QueryClient) {
  const client = queryClient ?? createQueryClient();

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

function createMockCompensation(
  overrides: Partial<CompensationRecord> = {},
): CompensationRecord {
  return {
    __identity: "comp-1",
    refereeGame: {
      game: {
        number: 12345,
        startingDateTime: "2025-01-15T18:00:00Z",
        encounter: {
          teamHome: { name: "Team A" },
          teamAway: { name: "Team B" },
        },
      },
    },
    convocationCompensation: {
      __identity: "convocation-comp-1",
      gameCompensation: 50,
      travelExpenses: 25,
      paymentDone: false,
    },
    ...overrides,
  } as CompensationRecord;
}

describe("useCompensations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches all compensations when no filter is provided", async () => {
    const mockSearchCompensations = vi.fn().mockResolvedValue({
      items: [createMockCompensation()],
      totalItemsCount: 1,
    });

    const { getApiClient } = await import("@/api/client");
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>);

    const { result } = renderHook(() => useCompensations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockSearchCompensations).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyFilters: [],
      }),
    );
  });

  it("filters by paid status when paidFilter is true", async () => {
    const mockSearchCompensations = vi.fn().mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });

    const { getApiClient } = await import("@/api/client");
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>);

    renderHook(() => useCompensations(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockSearchCompensations).toHaveBeenCalled();
    });

    expect(mockSearchCompensations).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyFilters: [
          {
            propertyName: "convocationCompensation.paymentDone",
            values: ["true"],
          },
        ],
      }),
    );
  });

  it("filters by unpaid status when paidFilter is false", async () => {
    const mockSearchCompensations = vi.fn().mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });

    const { getApiClient } = await import("@/api/client");
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>);

    renderHook(() => useCompensations(false), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockSearchCompensations).toHaveBeenCalled();
    });

    expect(mockSearchCompensations).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyFilters: [
          {
            propertyName: "convocationCompensation.paymentDone",
            values: ["false"],
          },
        ],
      }),
    );
  });

  it("returns empty array when items is null", async () => {
    const mockSearchCompensations = vi.fn().mockResolvedValue({
      items: null,
      totalItemsCount: 0,
    });

    const { getApiClient } = await import("@/api/client");
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>);

    const { result } = renderHook(() => useCompensations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it("orders by game starting date descending", async () => {
    const mockSearchCompensations = vi.fn().mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });

    const { getApiClient } = await import("@/api/client");
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>);

    renderHook(() => useCompensations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockSearchCompensations).toHaveBeenCalled();
    });

    expect(mockSearchCompensations).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyOrderings: [
          {
            propertyName: "refereeGame.game.startingDateTime",
            descending: true,
            isSetByUser: true,
          },
        ],
      }),
    );
  });
});

describe("usePaidCompensations", () => {
  it("is a convenience wrapper for useCompensations with true filter", async () => {
    const mockSearchCompensations = vi.fn().mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });

    const { getApiClient } = await import("@/api/client");
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>);

    renderHook(() => usePaidCompensations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockSearchCompensations).toHaveBeenCalled();
    });

    expect(mockSearchCompensations).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyFilters: [
          {
            propertyName: "convocationCompensation.paymentDone",
            values: ["true"],
          },
        ],
      }),
    );
  });
});

describe("useUnpaidCompensations", () => {
  it("is a convenience wrapper for useCompensations with false filter", async () => {
    const mockSearchCompensations = vi.fn().mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });

    const { getApiClient } = await import("@/api/client");
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>);

    renderHook(() => useUnpaidCompensations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockSearchCompensations).toHaveBeenCalled();
    });

    expect(mockSearchCompensations).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyFilters: [
          {
            propertyName: "convocationCompensation.paymentDone",
            values: ["false"],
          },
        ],
      }),
    );
  });
});

describe("useCompensationTotals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates correct totals for mixed compensations", async () => {
    const compensations = [
      createMockCompensation({
        convocationCompensation: {
          __identity: "c1",
          gameCompensation: 100,
          travelExpenses: 50,
          paymentDone: true,
        },
      }),
      createMockCompensation({
        convocationCompensation: {
          __identity: "c2",
          gameCompensation: 75,
          travelExpenses: 25,
          paymentDone: false,
        },
      }),
      createMockCompensation({
        convocationCompensation: {
          __identity: "c3",
          gameCompensation: 50,
          travelExpenses: 0,
          paymentDone: true,
        },
      }),
    ];

    const mockSearchCompensations = vi.fn().mockResolvedValue({
      items: compensations,
      totalItemsCount: 3,
    });

    const { getApiClient } = await import("@/api/client");
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>);

    const { result } = renderHook(() => useCompensationTotals(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.paid).toBe(200); // (100+50) + (50+0)
      expect(result.current.unpaid).toBe(100); // 75+25
    });
  });

  it("handles empty compensation list", async () => {
    const mockSearchCompensations = vi.fn().mockResolvedValue({
      items: [],
      totalItemsCount: 0,
    });

    const { getApiClient } = await import("@/api/client");
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>);

    const { result } = renderHook(() => useCompensationTotals(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.paid).toBe(0);
      expect(result.current.unpaid).toBe(0);
    });
  });

  it("handles compensations with missing convocationCompensation", async () => {
    const compensations = [
      createMockCompensation({
        convocationCompensation: undefined,
      }),
      createMockCompensation({
        convocationCompensation: {
          __identity: "c1",
          gameCompensation: 100,
          travelExpenses: 0,
          paymentDone: true,
        },
      }),
    ];

    const mockSearchCompensations = vi.fn().mockResolvedValue({
      items: compensations,
      totalItemsCount: 2,
    });

    const { getApiClient } = await import("@/api/client");
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>);

    const { result } = renderHook(() => useCompensationTotals(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.paid).toBe(100);
      expect(result.current.unpaid).toBe(0);
    });
  });

  it("handles null values for compensation amounts", async () => {
    const compensations = [
      createMockCompensation({
        convocationCompensation: {
          __identity: "c1",
          gameCompensation: null as unknown as number,
          travelExpenses: null as unknown as number,
          paymentDone: true,
        },
      }),
    ];

    const mockSearchCompensations = vi.fn().mockResolvedValue({
      items: compensations,
      totalItemsCount: 1,
    });

    const { getApiClient } = await import("@/api/client");
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: mockSearchCompensations,
      updateCompensation: vi.fn(),
    } as unknown as ReturnType<typeof getApiClient>);

    const { result } = renderHook(() => useCompensationTotals(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.paid).toBe(0);
      expect(result.current.unpaid).toBe(0);
    });
  });
});

describe("useUpdateCompensation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls API to update compensation", async () => {
    const mockUpdateCompensation = vi.fn().mockResolvedValue(undefined);

    const { getApiClient } = await import("@/api/client");
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: vi.fn(),
      updateCompensation: mockUpdateCompensation,
    } as unknown as ReturnType<typeof getApiClient>);

    const queryClient = createQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateCompensation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        compensationId: "comp-1",
        data: { distanceInMetres: 5000 },
      });
    });

    expect(mockUpdateCompensation).toHaveBeenCalledWith("comp-1", {
      distanceInMetres: 5000,
    });
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it("invalidates compensation queries on success", async () => {
    const mockUpdateCompensation = vi.fn().mockResolvedValue(undefined);

    const { getApiClient } = await import("@/api/client");
    vi.mocked(getApiClient).mockReturnValue({
      searchCompensations: vi.fn(),
      updateCompensation: mockUpdateCompensation,
    } as unknown as ReturnType<typeof getApiClient>);

    const queryClient = createQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateCompensation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        compensationId: "comp-1",
        data: { correctionReason: "Updated distance" },
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["compensations", "list"],
    });
  });
});

describe("useUpdateAssignmentCompensation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses demo store update in demo mode", async () => {
    const mockDemoUpdate = vi.fn();
    const { useAuthStore } = await import("@/stores/auth");
    const { useDemoStore } = await import("@/stores/demo");

    vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
      selector({ isDemoMode: true }),
    );

    vi.mocked(useDemoStore).mockImplementation((selector: AnyFunction) =>
      selector({
        activeAssociationCode: "DEMO",
        updateAssignmentCompensation: mockDemoUpdate,
      }),
    );

    const { result } = renderHook(() => useUpdateAssignmentCompensation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        assignmentId: "assignment-1",
        data: { distanceInMetres: 10000 },
      });
    });

    expect(mockDemoUpdate).toHaveBeenCalledWith("assignment-1", {
      distanceInMetres: 10000,
    });
  });

  it("invalidates both assignment and compensation queries on success", async () => {
    const mockDemoUpdate = vi.fn();
    const { useAuthStore } = await import("@/stores/auth");
    const { useDemoStore } = await import("@/stores/demo");

    vi.mocked(useAuthStore).mockImplementation((selector: AnyFunction) =>
      selector({ isDemoMode: true }),
    );

    vi.mocked(useDemoStore).mockImplementation((selector: AnyFunction) =>
      selector({
        activeAssociationCode: "DEMO",
        updateAssignmentCompensation: mockDemoUpdate,
      }),
    );

    const queryClient = createQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateAssignmentCompensation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        assignmentId: "assignment-1",
        data: { distanceInMetres: 5000 },
      });
    });

    // Should invalidate assignment detail, assignment lists, and compensation lists
    expect(invalidateSpy).toHaveBeenCalledTimes(3);
  });
});

describe("COMPENSATION_ERROR_KEYS", () => {
  it("has correct error key values", () => {
    expect(COMPENSATION_ERROR_KEYS.ASSIGNMENT_NOT_FOUND).toBe(
      "compensations.assignmentNotFoundInCache",
    );
    expect(COMPENSATION_ERROR_KEYS.COMPENSATION_NOT_FOUND).toBe(
      "compensations.compensationNotFound",
    );
    expect(COMPENSATION_ERROR_KEYS.COMPENSATION_MISSING_ID).toBe(
      "compensations.compensationMissingId",
    );
  });
});
