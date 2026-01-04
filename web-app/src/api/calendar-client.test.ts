import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calendarApi,
  CalendarModeNotSupportedError,
  DEFAULT_REFEREE_EDIT_HOURS,
} from "./calendar-client";
import * as calendarApiModule from "./calendar-api";
import { useAuthStore } from "@/stores/auth";
import type { CalendarAssignment } from "./calendar-api";

// Mock the calendar-api module
vi.mock("./calendar-api", () => ({
  fetchCalendarAssignments: vi.fn(),
}));

// Mock the auth store
vi.mock("@/stores/auth", () => ({
  useAuthStore: {
    getState: vi.fn(),
  },
}));

describe("calendar-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("CalendarModeNotSupportedError", () => {
    it("creates error with correct message", () => {
      const error = new CalendarModeNotSupportedError("Test Operation");
      expect(error.message).toBe(
        "Test Operation is not available in Calendar Mode. Please log in with your VolleyManager credentials to access this feature.",
      );
      expect(error.name).toBe("CalendarModeNotSupportedError");
    });

    it("is instance of Error", () => {
      const error = new CalendarModeNotSupportedError("Test");
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("mapRoleToPosition (via calendarAssignmentToAssignment)", () => {
    const createMockCalendarAssignment = (
      role: CalendarAssignment["role"],
    ): CalendarAssignment => ({
      gameId: "123456",
      startTime: "2025-01-15T19:30:00+01:00",
      endTime: "2025-01-15T22:30:00+01:00",
      league: "NLA Men",
      homeTeam: "Home Team",
      awayTeam: "Away Team",
      role,
      roleRaw: role,
      gender: "men",
      address: null,
      coordinates: null,
      hallName: null,
      mapsUrl: null,
    });

    beforeEach(() => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        calendarCode: "ABC123",
      } as ReturnType<typeof useAuthStore.getState>);
    });

    it("maps referee1 to head-one", async () => {
      vi.mocked(calendarApiModule.fetchCalendarAssignments).mockResolvedValue([
        createMockCalendarAssignment("referee1"),
      ]);

      const result = await calendarApi.searchAssignments();
      expect(result.items[0]?.refereePosition).toBe("head-one");
    });

    it("maps referee2 to head-two", async () => {
      vi.mocked(calendarApiModule.fetchCalendarAssignments).mockResolvedValue([
        createMockCalendarAssignment("referee2"),
      ]);

      const result = await calendarApi.searchAssignments();
      expect(result.items[0]?.refereePosition).toBe("head-two");
    });

    it("maps lineReferee to linesman-one", async () => {
      vi.mocked(calendarApiModule.fetchCalendarAssignments).mockResolvedValue([
        createMockCalendarAssignment("lineReferee"),
      ]);

      const result = await calendarApi.searchAssignments();
      expect(result.items[0]?.refereePosition).toBe("linesman-one");
    });

    it("maps scorer to head-one as fallback", async () => {
      vi.mocked(calendarApiModule.fetchCalendarAssignments).mockResolvedValue([
        createMockCalendarAssignment("scorer"),
      ]);

      const result = await calendarApi.searchAssignments();
      expect(result.items[0]?.refereePosition).toBe("head-one");
    });

    it("maps unknown to head-one as fallback", async () => {
      vi.mocked(calendarApiModule.fetchCalendarAssignments).mockResolvedValue([
        createMockCalendarAssignment("unknown"),
      ]);

      const result = await calendarApi.searchAssignments();
      expect(result.items[0]?.refereePosition).toBe("head-one");
    });
  });

  describe("calendarAssignmentToAssignment", () => {
    beforeEach(() => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        calendarCode: "ABC123",
      } as ReturnType<typeof useAuthStore.getState>);
    });

    it("converts calendar assignment to API assignment format", async () => {
      const calendarAssignment: CalendarAssignment = {
        gameId: "123456",
        startTime: "2025-01-15T19:30:00+01:00",
        endTime: "2025-01-15T22:30:00+01:00",
        league: "NLA Men",
        homeTeam: "VBC Zürich",
        awayTeam: "Volley Luzern",
        role: "referee1",
        roleRaw: "1SR",
        gender: "men",
        hallName: "Sporthalle Hardau",
        address: "Hardaustrasse 10, 8005 Zürich",
        coordinates: { latitude: 47.3769, longitude: 8.5417 },
        mapsUrl: null,
      };

      vi.mocked(calendarApiModule.fetchCalendarAssignments).mockResolvedValue([
        calendarAssignment,
      ]);

      const result = await calendarApi.searchAssignments();
      const assignment = result.items[0]!;

      expect(assignment.__identity).toBe("calendar-123456");
      expect(assignment.refereeConvocationStatus).toBe("active");
      expect(assignment.refereePosition).toBe("head-one");
      expect(assignment.refereeGame?.__identity).toBe("calendar-game-123456");
      expect(assignment.refereeGame?.game?.__identity).toBe("123456");
      expect(assignment.refereeGame?.game?.number).toBe(123456);
      expect(assignment.refereeGame?.game?.startingDateTime).toBe(
        "2025-01-15T19:30:00+01:00",
      );
      expect(assignment.refereeGame?.game?.encounter?.teamHome?.name).toBe(
        "VBC Zürich",
      );
      expect(assignment.refereeGame?.game?.encounter?.teamAway?.name).toBe(
        "Volley Luzern",
      );
      expect(assignment.refereeGame?.game?.group?.displayName).toBe("NLA Men");
      expect(assignment.refereeGame?.game?.hall?.name).toBe("Sporthalle Hardau");
      expect(
        assignment.refereeGame?.game?.hall?.primaryPostalAddress?.combinedAddress,
      ).toBe("Hardaustrasse 10, 8005 Zürich");
      expect(
        assignment.refereeGame?.game?.hall?.primaryPostalAddress
          ?.geographicalLocation?.latitude,
      ).toBe(47.3769);
    });

    it("maps men gender to m", async () => {
      const calendarAssignment: CalendarAssignment = {
        gameId: "123",
        startTime: "2025-01-15T19:30:00+01:00",
        endTime: "2025-01-15T22:30:00+01:00",
        league: "NLA",
        homeTeam: "Home",
        awayTeam: "Away",
        role: "referee1",
        roleRaw: "1SR",
        gender: "men",
        address: null,
        coordinates: null,
        hallName: null,
        mapsUrl: null,
      };

      vi.mocked(calendarApiModule.fetchCalendarAssignments).mockResolvedValue([
        calendarAssignment,
      ]);

      const result = await calendarApi.searchAssignments();
      expect(result.items[0]?.refereeGame?.game?.encounter?.teamHome?.gender).toBe(
        "m",
      );
    });

    it("maps women gender to f", async () => {
      const calendarAssignment: CalendarAssignment = {
        gameId: "123",
        startTime: "2025-01-15T19:30:00+01:00",
        endTime: "2025-01-15T22:30:00+01:00",
        league: "NLA",
        homeTeam: "Home",
        awayTeam: "Away",
        role: "referee1",
        roleRaw: "1SR",
        gender: "women",
        address: null,
        coordinates: null,
        hallName: null,
        mapsUrl: null,
      };

      vi.mocked(calendarApiModule.fetchCalendarAssignments).mockResolvedValue([
        calendarAssignment,
      ]);

      const result = await calendarApi.searchAssignments();
      expect(result.items[0]?.refereeGame?.game?.encounter?.teamHome?.gender).toBe(
        "f",
      );
    });

    it("maps mixed gender to undefined", async () => {
      const calendarAssignment: CalendarAssignment = {
        gameId: "123",
        startTime: "2025-01-15T19:30:00+01:00",
        endTime: "2025-01-15T22:30:00+01:00",
        league: "NLA",
        homeTeam: "Home",
        awayTeam: "Away",
        role: "referee1",
        roleRaw: "1SR",
        gender: "mixed",
        address: null,
        coordinates: null,
        hallName: null,
        mapsUrl: null,
      };

      vi.mocked(calendarApiModule.fetchCalendarAssignments).mockResolvedValue([
        calendarAssignment,
      ]);

      const result = await calendarApi.searchAssignments();
      expect(
        result.items[0]?.refereeGame?.game?.encounter?.teamHome?.gender,
      ).toBeUndefined();
    });

    it("handles assignment without hall", async () => {
      const calendarAssignment: CalendarAssignment = {
        gameId: "123",
        startTime: "2025-01-15T19:30:00+01:00",
        endTime: "2025-01-15T22:30:00+01:00",
        league: "NLA",
        homeTeam: "Home",
        awayTeam: "Away",
        role: "referee1",
        roleRaw: "1SR",
        gender: "men",
        address: null,
        coordinates: null,
        hallName: null,
        mapsUrl: null,
      };

      vi.mocked(calendarApiModule.fetchCalendarAssignments).mockResolvedValue([
        calendarAssignment,
      ]);

      const result = await calendarApi.searchAssignments();
      expect(result.items[0]?.refereeGame?.game?.hall).toBeUndefined();
    });

    it("handles hall without coordinates", async () => {
      const calendarAssignment: CalendarAssignment = {
        gameId: "123",
        startTime: "2025-01-15T19:30:00+01:00",
        endTime: "2025-01-15T22:30:00+01:00",
        league: "NLA",
        homeTeam: "Home",
        awayTeam: "Away",
        role: "referee1",
        roleRaw: "1SR",
        gender: "men",
        hallName: "Test Hall",
        address: "Test Address",
        coordinates: null,
        mapsUrl: null,
      };

      vi.mocked(calendarApiModule.fetchCalendarAssignments).mockResolvedValue([
        calendarAssignment,
      ]);

      const result = await calendarApi.searchAssignments();
      expect(result.items[0]?.refereeGame?.game?.hall?.name).toBe("Test Hall");
      expect(
        result.items[0]?.refereeGame?.game?.hall?.primaryPostalAddress
          ?.geographicalLocation,
      ).toBeUndefined();
    });
  });

  describe("searchAssignments", () => {
    it("returns empty array when no calendar code", async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        calendarCode: null,
      } as unknown as ReturnType<typeof useAuthStore.getState>);

      const result = await calendarApi.searchAssignments();
      expect(result.items).toEqual([]);
      expect(result.totalItemsCount).toBe(0);
    });

    it("fetches and converts calendar assignments", async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        calendarCode: "ABC123",
      } as ReturnType<typeof useAuthStore.getState>);

      vi.mocked(calendarApiModule.fetchCalendarAssignments).mockResolvedValue([
        {
          gameId: "1",
          startTime: "2025-01-15T19:30:00+01:00",
          endTime: "2025-01-15T22:30:00+01:00",
          league: "NLA",
          homeTeam: "Home",
          awayTeam: "Away",
          role: "referee1",
          roleRaw: "1SR",
          gender: "men",
          address: null,
          coordinates: null,
          hallName: null,
          mapsUrl: null,
        },
      ]);

      const result = await calendarApi.searchAssignments();
      expect(result.items).toHaveLength(1);
      expect(result.totalItemsCount).toBe(1);
      expect(calendarApiModule.fetchCalendarAssignments).toHaveBeenCalledWith(
        "ABC123",
      );
    });
  });

  describe("getAssignmentDetails", () => {
    it("throws error when no calendar code", async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        calendarCode: null,
      } as unknown as ReturnType<typeof useAuthStore.getState>);

      await expect(
        calendarApi.getAssignmentDetails("calendar-123", []),
      ).rejects.toThrow("Calendar code not available");
    });

    it("finds assignment by ID", async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        calendarCode: "ABC123",
      } as ReturnType<typeof useAuthStore.getState>);

      vi.mocked(calendarApiModule.fetchCalendarAssignments).mockResolvedValue([
        {
          gameId: "12345",
          startTime: "2025-01-15T19:30:00+01:00",
          endTime: "2025-01-15T22:30:00+01:00",
          league: "NLA",
          homeTeam: "Home",
          awayTeam: "Away",
          role: "referee1",
          roleRaw: "1SR",
          gender: "men",
          address: null,
          coordinates: null,
          hallName: null,
          mapsUrl: null,
        },
      ]);

      const result = await calendarApi.getAssignmentDetails("calendar-12345", []);
      expect(result.__identity).toBe("calendar-12345");
    });

    it("throws error when assignment not found", async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        calendarCode: "ABC123",
      } as ReturnType<typeof useAuthStore.getState>);

      vi.mocked(calendarApiModule.fetchCalendarAssignments).mockResolvedValue([]);

      await expect(
        calendarApi.getAssignmentDetails("calendar-99999", []),
      ).rejects.toThrow("Assignment not found: calendar-99999");
    });
  });

  describe("getAssociationSettings", () => {
    it("returns default settings with referee edit hours", async () => {
      const settings = await calendarApi.getAssociationSettings();
      expect(settings.hoursAfterGameStartForRefereeToEditGameList).toBe(
        DEFAULT_REFEREE_EDIT_HOURS,
      );
    });
  });

  describe("getActiveSeason", () => {
    it("returns season spanning September to June", async () => {
      const season = await calendarApi.getActiveSeason();
      const startDate = new Date(season.seasonStartDate!);
      const endDate = new Date(season.seasonEndDate!);

      expect(startDate.getMonth()).toBe(8); // September (0-indexed)
      expect(startDate.getDate()).toBe(1);
      expect(endDate.getMonth()).toBe(5); // June (0-indexed)
      expect(endDate.getDate()).toBe(30);
    });

    it("returns previous year season when before September", async () => {
      // Mock a date in January 2025
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 0, 15)); // January 15, 2025

      const season = await calendarApi.getActiveSeason();
      const startDate = new Date(season.seasonStartDate!);

      // Should return 2024-2025 season (start in September 2024)
      expect(startDate.getFullYear()).toBe(2024);

      vi.useRealTimers();
    });

    it("returns current year season when in September or later", async () => {
      // Mock a date in October 2025
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 9, 15)); // October 15, 2025

      const season = await calendarApi.getActiveSeason();
      const startDate = new Date(season.seasonStartDate!);

      // Should return 2025-2026 season (start in September 2025)
      expect(startDate.getFullYear()).toBe(2025);

      vi.useRealTimers();
    });

    it("handles edge case at August/September boundary", async () => {
      // August 31 - should be previous season
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 7, 31)); // August 31, 2025

      let season = await calendarApi.getActiveSeason();
      expect(new Date(season.seasonStartDate!).getFullYear()).toBe(2024);

      // September 1 - should be current season
      vi.setSystemTime(new Date(2025, 8, 1)); // September 1, 2025

      season = await calendarApi.getActiveSeason();
      expect(new Date(season.seasonStartDate!).getFullYear()).toBe(2025);

      vi.useRealTimers();
    });
  });

  describe("unsupported operations", () => {
    it("searchCompensations throws CalendarModeNotSupportedError", async () => {
      await expect(calendarApi.searchCompensations()).rejects.toThrow(
        CalendarModeNotSupportedError,
      );
    });

    it("getCompensationDetails throws CalendarModeNotSupportedError", async () => {
      await expect(calendarApi.getCompensationDetails()).rejects.toThrow(
        CalendarModeNotSupportedError,
      );
    });

    it("updateCompensation throws CalendarModeNotSupportedError", async () => {
      await expect(calendarApi.updateCompensation()).rejects.toThrow(
        CalendarModeNotSupportedError,
      );
    });

    it("searchExchanges throws CalendarModeNotSupportedError", async () => {
      await expect(calendarApi.searchExchanges()).rejects.toThrow(
        CalendarModeNotSupportedError,
      );
    });

    it("applyForExchange throws CalendarModeNotSupportedError", async () => {
      await expect(calendarApi.applyForExchange()).rejects.toThrow(
        CalendarModeNotSupportedError,
      );
    });

    it("withdrawFromExchange throws CalendarModeNotSupportedError", async () => {
      await expect(calendarApi.withdrawFromExchange()).rejects.toThrow(
        CalendarModeNotSupportedError,
      );
    });

    it("getPossiblePlayerNominations throws CalendarModeNotSupportedError", async () => {
      await expect(calendarApi.getPossiblePlayerNominations()).rejects.toThrow(
        CalendarModeNotSupportedError,
      );
    });

    it("searchPersons throws CalendarModeNotSupportedError", async () => {
      await expect(calendarApi.searchPersons()).rejects.toThrow(
        CalendarModeNotSupportedError,
      );
    });

    it("getGameWithScoresheet throws CalendarModeNotSupportedError", async () => {
      await expect(calendarApi.getGameWithScoresheet()).rejects.toThrow(
        CalendarModeNotSupportedError,
      );
    });

    it("updateNominationList throws CalendarModeNotSupportedError", async () => {
      await expect(calendarApi.updateNominationList()).rejects.toThrow(
        CalendarModeNotSupportedError,
      );
    });

    it("finalizeNominationList throws CalendarModeNotSupportedError", async () => {
      await expect(calendarApi.finalizeNominationList()).rejects.toThrow(
        CalendarModeNotSupportedError,
      );
    });

    it("submitScorer throws CalendarModeNotSupportedError", async () => {
      await expect(calendarApi.submitScorer()).rejects.toThrow(
        CalendarModeNotSupportedError,
      );
    });

    it("updateScoresheet throws CalendarModeNotSupportedError", async () => {
      await expect(calendarApi.updateScoresheet()).rejects.toThrow(
        CalendarModeNotSupportedError,
      );
    });

    it("finalizeScoresheet throws CalendarModeNotSupportedError", async () => {
      await expect(calendarApi.finalizeScoresheet()).rejects.toThrow(
        CalendarModeNotSupportedError,
      );
    });

    it("uploadResource throws CalendarModeNotSupportedError", async () => {
      await expect(calendarApi.uploadResource()).rejects.toThrow(
        CalendarModeNotSupportedError,
      );
    });

    it("switchRoleAndAttribute throws CalendarModeNotSupportedError", async () => {
      await expect(calendarApi.switchRoleAndAttribute()).rejects.toThrow(
        CalendarModeNotSupportedError,
      );
    });
  });
});
