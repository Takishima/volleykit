import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { parseSearchInput, useScorerSearch } from "./useScorerSearch";
import type { PersonSearchResponse } from "@/api/client";

// Mock the API client
vi.mock("@/api/client", () => ({
  getApiClient: vi.fn(() => ({
    searchPersons: vi.fn(),
  })),
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn((selector) => selector({ isDemoMode: false })),
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

describe("parseSearchInput", () => {
  it("returns empty object for empty input", () => {
    expect(parseSearchInput("")).toEqual({});
    expect(parseSearchInput("   ")).toEqual({});
  });

  it("parses single word as lastName", () => {
    expect(parseSearchInput("müller")).toEqual({ lastName: "müller" });
    expect(parseSearchInput("Schmidt")).toEqual({ lastName: "Schmidt" });
  });

  it("parses two words as firstName and lastName", () => {
    expect(parseSearchInput("hans müller")).toEqual({
      firstName: "hans",
      lastName: "müller",
    });
    expect(parseSearchInput("Anna Schmidt")).toEqual({
      firstName: "Anna",
      lastName: "Schmidt",
    });
  });

  it("handles extra whitespace correctly", () => {
    expect(parseSearchInput("  hans   müller  ")).toEqual({
      firstName: "hans",
      lastName: "müller",
    });
  });

  it("parses year at end correctly", () => {
    expect(parseSearchInput("müller 1985")).toEqual({
      lastName: "müller",
      yearOfBirth: "1985",
    });
  });

  it("parses full name with year", () => {
    expect(parseSearchInput("hans müller 1985")).toEqual({
      firstName: "hans",
      lastName: "müller",
      yearOfBirth: "1985",
    });
  });

  it("does not parse non-4-digit numbers as year", () => {
    expect(parseSearchInput("müller 85")).toEqual({
      firstName: "müller",
      lastName: "85",
    });
    expect(parseSearchInput("müller 19850")).toEqual({
      firstName: "müller",
      lastName: "19850",
    });
  });

  it("handles three or more name parts", () => {
    expect(parseSearchInput("Hans Peter Müller")).toEqual({
      firstName: "Hans",
      lastName: "Peter Müller",
    });
    expect(parseSearchInput("Hans Peter Müller 1985")).toEqual({
      firstName: "Hans",
      lastName: "Peter Müller",
      yearOfBirth: "1985",
    });
  });
});

describe("useScorerSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not fetch when no filters are provided", async () => {
    const { getApiClient } = await import("@/api/client");
    const mockSearchPersons = vi.fn();
    vi.mocked(getApiClient).mockReturnValue({
      searchPersons: mockSearchPersons,
    } as unknown as ReturnType<typeof getApiClient>);

    const { result } = renderHook(() => useScorerSearch({}), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockSearchPersons).not.toHaveBeenCalled();
  });

  it("fetches when lastName filter is provided", async () => {
    const { getApiClient } = await import("@/api/client");
    const mockResponse: PersonSearchResponse = {
      items: [
        {
          __identity: "scorer-1",
          firstName: "Hans",
          lastName: "Müller",
          displayName: "Hans Müller",
          associationId: 12345,
          birthday: "1985-03-15T00:00:00+00:00",
        },
      ],
      totalItemsCount: 1,
    };
    const mockSearchPersons = vi.fn().mockResolvedValue(mockResponse);
    vi.mocked(getApiClient).mockReturnValue({
      searchPersons: mockSearchPersons,
    } as unknown as ReturnType<typeof getApiClient>);

    const { result } = renderHook(
      () => useScorerSearch({ lastName: "müller" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
    });

    expect(mockSearchPersons).toHaveBeenCalledWith({ lastName: "müller" });
    expect(result.current.data?.[0]?.displayName).toBe("Hans Müller");
  });

  it("does not fetch when enabled is false", async () => {
    const { getApiClient } = await import("@/api/client");
    const mockSearchPersons = vi.fn();
    vi.mocked(getApiClient).mockReturnValue({
      searchPersons: mockSearchPersons,
    } as unknown as ReturnType<typeof getApiClient>);

    const { result } = renderHook(
      () => useScorerSearch({ lastName: "müller" }, { enabled: false }),
      { wrapper: createWrapper() },
    );

    expect(result.current.isLoading).toBe(false);
    expect(mockSearchPersons).not.toHaveBeenCalled();
  });

  it("handles API errors", async () => {
    const { getApiClient } = await import("@/api/client");
    const mockSearchPersons = vi
      .fn()
      .mockRejectedValue(new Error("API Error"));
    vi.mocked(getApiClient).mockReturnValue({
      searchPersons: mockSearchPersons,
    } as unknown as ReturnType<typeof getApiClient>);

    const { result } = renderHook(
      () => useScorerSearch({ lastName: "müller" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe("API Error");
  });
});
