import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useNominationList } from "./useNominationList";
import * as authStore from "@/stores/auth";
import * as demoStore from "@/stores/demo";
import type { NominationList } from "@/api/client";

vi.mock("@/stores/auth");
vi.mock("@/stores/demo");

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

      const { result } = renderHook(() =>
        useNominationList({ gameId: "test-game-1", team: "home" }),
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

      const { result } = renderHook(() =>
        useNominationList({ gameId: "test-game-1", team: "home" }),
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

      const { result } = renderHook(() =>
        useNominationList({ gameId: "nonexistent-game", team: "home" }),
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

      const { result: homeResult } = renderHook(() =>
        useNominationList({ gameId: "test-game-1", team: "home" }),
      );

      const { result: awayResult } = renderHook(() =>
        useNominationList({ gameId: "test-game-1", team: "away" }),
      );

      expect(homeResult.current.nominationList?.__identity).toBe("home-list");
      expect(awayResult.current.nominationList?.__identity).toBe("away-list");
    });

    it("prefers prefetched data over demo data", () => {
      const prefetchedList: NominationList = {
        ...mockNominationList,
        __identity: "prefetched-list",
      };

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

      const { result } = renderHook(() =>
        useNominationList({
          gameId: "test-game-1",
          team: "home",
          prefetchedData: prefetchedList,
        }),
      );

      expect(result.current.nominationList?.__identity).toBe("prefetched-list");
    });
  });

  describe("prefetched data", () => {
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
    });

    it("returns prefetched data when provided", () => {
      const { result } = renderHook(() =>
        useNominationList({
          gameId: "test-game-1",
          team: "home",
          prefetchedData: mockNominationList,
        }),
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.nominationList).toBe(mockNominationList);
      expect(result.current.players).toHaveLength(2);
    });

    it("handles null prefetched data", () => {
      const { result } = renderHook(() =>
        useNominationList({
          gameId: "test-game-1",
          team: "home",
          prefetchedData: null,
        }),
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.nominationList).toBeNull();
      expect(result.current.players).toHaveLength(0);
    });

    it("transforms prefetched nominations to players correctly", () => {
      const { result } = renderHook(() =>
        useNominationList({
          gameId: "test-game-1",
          team: "home",
          prefetchedData: mockNominationList,
        }),
      );

      const players = result.current.players;
      expect(players).toHaveLength(2);
      expect(players[0]!.displayName).toBe("John Doe");
      expect(players[1]!.displayName).toBe("Jane Smith");
    });
  });

  describe("no data available", () => {
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
    });

    it("returns error state when no prefetched data and not in demo mode", () => {
      const { result } = renderHook(() =>
        useNominationList({ gameId: "test-game-1", team: "home" }),
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain(
        "Nomination list data not available",
      );
      expect(result.current.nominationList).toBeNull();
      expect(result.current.players).toHaveLength(0);
    });
  });
});
