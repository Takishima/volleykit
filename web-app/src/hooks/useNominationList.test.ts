import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useNominationList } from "./useNominationList";
import * as authStore from "@/stores/auth";
import * as demoStore from "@/stores/demo";
import * as apiClient from "@/api/client";
import type { NominationList } from "@/api/client";

vi.mock("@/stores/auth");
vi.mock("@/stores/demo");
vi.mock("@/api/client", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/api/client")>();
  return {
    ...original,
    getApiClient: vi.fn(),
  };
});

const mockNominationList: NominationList = {
  __identity: "test-nomlist-1",
  game: { __identity: "test-game-1" },
  team: { __identity: "test-team-1", displayName: "Test Team" },
  closed: false,
  isClosedForTeam: false,
  indoorPlayerNominations: [
    {
      __identity: "test-nom-1",
      shirtNumber: 1,
      isCaptain: true,
      isLibero: false,
      indoorPlayer: {
        __identity: "test-player-1",
        person: {
          __identity: "test-person-1",
          firstName: "John",
          lastName: "Doe",
          displayName: "John Doe",
          birthday: "1995-03-15",
        },
      },
      indoorPlayerLicenseCategory: {
        __identity: "lic-1",
        shortName: "SEN",
      },
    },
    {
      __identity: "test-nom-2",
      shirtNumber: 7,
      isCaptain: false,
      isLibero: true,
      indoorPlayer: {
        __identity: "test-player-2",
        person: {
          __identity: "test-person-2",
          firstName: "Jane",
          lastName: "Smith",
          displayName: "Jane Smith",
          birthday: "2002-07-22",
        },
      },
      indoorPlayerLicenseCategory: {
        __identity: "lic-2",
        shortName: "JUN",
      },
    },
  ],
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

describe("useNominationList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("demo mode", () => {
    beforeEach(() => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: true } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );
    });

    it("returns demo data when in demo mode with matching game", () => {
      vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
        selector({
          nominationLists: {
            "test-game-1": {
              home: mockNominationList,
              away: mockNominationList,
            },
          },
        } as unknown as ReturnType<typeof demoStore.useDemoStore.getState>),
      );

      const { result } = renderHook(
        () => useNominationList({ gameId: "test-game-1", team: "home" }),
        { wrapper: createWrapper() },
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.nominationList).toBe(mockNominationList);
      expect(result.current.players).toHaveLength(2);
    });

    it("transforms nominations to players correctly", () => {
      vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
        selector({
          nominationLists: {
            "test-game-1": {
              home: mockNominationList,
              away: mockNominationList,
            },
          },
        } as unknown as ReturnType<typeof demoStore.useDemoStore.getState>),
      );

      const { result } = renderHook(
        () => useNominationList({ gameId: "test-game-1", team: "home" }),
        { wrapper: createWrapper() },
      );

      const players = result.current.players;

      // Players should be sorted by shirt number
      expect(players[0]).toEqual({
        id: "test-nom-1",
        shirtNumber: 1,
        displayName: "John Doe",
        firstName: "John",
        lastName: "Doe",
        birthday: "1995-03-15",
        licenseCategory: "SEN",
        isCaptain: true,
        isLibero: false,
        isNewlyAdded: false,
      });

      expect(players[1]).toEqual({
        id: "test-nom-2",
        shirtNumber: 7,
        displayName: "Jane Smith",
        firstName: "Jane",
        lastName: "Smith",
        birthday: "2002-07-22",
        licenseCategory: "JUN",
        isCaptain: false,
        isLibero: true,
        isNewlyAdded: false,
      });
    });

    it("returns empty data when game not found in demo mode", () => {
      vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
        selector({
          nominationLists: {},
        } as unknown as ReturnType<typeof demoStore.useDemoStore.getState>),
      );

      const { result } = renderHook(
        () => useNominationList({ gameId: "nonexistent-game", team: "home" }),
        { wrapper: createWrapper() },
      );

      expect(result.current.nominationList).toBeNull();
      expect(result.current.players).toHaveLength(0);
    });

    it("returns correct team data based on team prop", () => {
      const homeList: NominationList = {
        ...mockNominationList,
        __identity: "home-list",
        team: { __identity: "home-team", displayName: "Home Team" },
      };

      const awayList: NominationList = {
        ...mockNominationList,
        __identity: "away-list",
        team: { __identity: "away-team", displayName: "Away Team" },
      };

      vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
        selector({
          nominationLists: {
            "test-game-1": {
              home: homeList,
              away: awayList,
            },
          },
        } as unknown as ReturnType<typeof demoStore.useDemoStore.getState>),
      );

      const { result: homeResult } = renderHook(
        () => useNominationList({ gameId: "test-game-1", team: "home" }),
        { wrapper: createWrapper() },
      );

      const { result: awayResult } = renderHook(
        () => useNominationList({ gameId: "test-game-1", team: "away" }),
        { wrapper: createWrapper() },
      );

      expect(homeResult.current.nominationList?.__identity).toBe("home-list");
      expect(awayResult.current.nominationList?.__identity).toBe("away-list");
    });
  });

  describe("production mode", () => {
    const mockGetNominationList = vi.fn();

    beforeEach(() => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ isDemoMode: false } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      vi.mocked(demoStore.useDemoStore).mockImplementation((selector) =>
        selector({
          nominationLists: {},
        } as unknown as ReturnType<typeof demoStore.useDemoStore.getState>),
      );

      // Mock the API client
      vi.mocked(apiClient.getApiClient).mockReturnValue({
        getNominationList: mockGetNominationList,
      } as unknown as ReturnType<typeof apiClient.getApiClient>);
    });

    it("fetches nomination list from API in production mode", async () => {
      mockGetNominationList.mockResolvedValue(mockNominationList);

      const { result } = renderHook(
        () => useNominationList({ gameId: "test-game-1", team: "home" }),
        { wrapper: createWrapper() },
      );

      // Should start loading
      expect(result.current.isLoading).toBe(true);

      // Wait for the query to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have called the API with correct params
      expect(mockGetNominationList).toHaveBeenCalledWith("test-game-1", "home");
      expect(result.current.nominationList).toEqual(mockNominationList);
      expect(result.current.players).toHaveLength(2);
    });

    it("fetches away team nomination list correctly", async () => {
      mockGetNominationList.mockResolvedValue(mockNominationList);

      const { result } = renderHook(
        () => useNominationList({ gameId: "test-game-1", team: "away" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetNominationList).toHaveBeenCalledWith("test-game-1", "away");
    });

    it("handles API returning null", async () => {
      mockGetNominationList.mockResolvedValue(null);

      const { result } = renderHook(
        () => useNominationList({ gameId: "test-game-1", team: "home" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.nominationList).toBeNull();
      expect(result.current.players).toHaveLength(0);
    });

    it("handles API errors", async () => {
      mockGetNominationList.mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(
        () => useNominationList({ gameId: "test-game-1", team: "home" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("API Error");
    });

    it("respects enabled option", () => {
      const { result } = renderHook(
        () =>
          useNominationList({
            gameId: "test-game-1",
            team: "home",
            enabled: false,
          }),
        { wrapper: createWrapper() },
      );

      // Query should be idle when disabled
      expect(result.current.isLoading).toBe(false);
      expect(result.current.nominationList).toBeNull();
      expect(mockGetNominationList).not.toHaveBeenCalled();
    });

    it("does not fetch when gameId is empty", () => {
      const { result } = renderHook(
        () => useNominationList({ gameId: "", team: "home" }),
        { wrapper: createWrapper() },
      );

      expect(result.current.isLoading).toBe(false);
      expect(mockGetNominationList).not.toHaveBeenCalled();
    });
  });
});
