import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  extractCalendarCode,
  validateCalendarCode,
  mapCalendarAssignmentToAssignment,
  extractCityFromAddress,
} from "./calendar-helpers";
import type { CalendarAssignment } from "@/features/assignments/api/ical/types";

describe("extractCalendarCode", () => {
  describe("valid 6-character codes", () => {
    it("returns the code when given a valid 6-character alphanumeric code", () => {
      expect(extractCalendarCode("ABC123")).toBe("ABC123");
      expect(extractCalendarCode("abcdef")).toBe("abcdef");
      expect(extractCalendarCode("123456")).toBe("123456");
      expect(extractCalendarCode("aB3xY9")).toBe("aB3xY9");
    });

    it("trims whitespace from input", () => {
      expect(extractCalendarCode("  ABC123  ")).toBe("ABC123");
      expect(extractCalendarCode("\tABC123\n")).toBe("ABC123");
    });
  });

  describe("invalid codes", () => {
    it("returns null for empty input", () => {
      expect(extractCalendarCode("")).toBeNull();
      expect(extractCalendarCode("   ")).toBeNull();
    });

    it("returns null for codes with wrong length", () => {
      expect(extractCalendarCode("ABC12")).toBeNull(); // 5 chars
      expect(extractCalendarCode("ABC1234")).toBeNull(); // 7 chars
      expect(extractCalendarCode("AB")).toBeNull();
    });

    it("returns null for codes with invalid characters", () => {
      expect(extractCalendarCode("ABC-12")).toBeNull();
      expect(extractCalendarCode("ABC_12")).toBeNull();
      expect(extractCalendarCode("ABC 12")).toBeNull();
      expect(extractCalendarCode("ABC!@#")).toBeNull();
    });
  });

  describe("URL extraction - https://volleymanager.volleyball.ch/calendar/", () => {
    it("extracts code from https URL", () => {
      expect(
        extractCalendarCode(
          "https://volleymanager.volleyball.ch/calendar/ABC123",
        ),
      ).toBe("ABC123");
    });

    it("extracts code from URL regardless of case", () => {
      expect(
        extractCalendarCode(
          "HTTPS://volleymanager.volleyball.ch/calendar/abc123",
        ),
      ).toBe("abc123");
    });

    it("extracts code from URL with www prefix", () => {
      expect(
        extractCalendarCode(
          "https://www.volleymanager.volleyball.ch/calendar/ABC123",
        ),
      ).toBe("ABC123");
    });

    it("extracts code from URL with trailing slash", () => {
      expect(
        extractCalendarCode(
          "https://volleymanager.volleyball.ch/calendar/ABC123/",
        ),
      ).toBe("ABC123");
    });
  });

  describe("URL extraction - webcal://", () => {
    it("extracts code from webcal URL", () => {
      expect(
        extractCalendarCode(
          "webcal://volleymanager.volleyball.ch/calendar/ABC123",
        ),
      ).toBe("ABC123");
    });

    it("extracts code from webcal URL with www prefix", () => {
      expect(
        extractCalendarCode(
          "webcal://www.volleymanager.volleyball.ch/calendar/ABC123",
        ),
      ).toBe("ABC123");
    });
  });

  describe("URL extraction - sportmanager.volleyball/calendar/ical/", () => {
    it("extracts code from ical path", () => {
      expect(
        extractCalendarCode(
          "https://volleymanager.volleyball.ch/sportmanager.volleyball/calendar/ical/ABC123",
        ),
      ).toBe("ABC123");
    });

    it("extracts code from webcal ical path", () => {
      expect(
        extractCalendarCode(
          "webcal://volleymanager.volleyball.ch/sportmanager.volleyball/calendar/ical/ABC123",
        ),
      ).toBe("ABC123");
    });
  });

  describe("URL extraction - indoor/iCal/referee/", () => {
    it("extracts code from indoor iCal referee path", () => {
      expect(
        extractCalendarCode(
          "https://volleymanager.volleyball.ch/indoor/iCal/referee/ABC123",
        ),
      ).toBe("ABC123");
    });

    it("extracts code from indoor iCal referee path with trailing slash", () => {
      expect(
        extractCalendarCode(
          "https://volleymanager.volleyball.ch/indoor/iCal/referee/ABC123/",
        ),
      ).toBe("ABC123");
    });

    it("extracts code from webcal indoor iCal referee path", () => {
      expect(
        extractCalendarCode(
          "webcal://volleymanager.volleyball.ch/indoor/iCal/referee/ABC123",
        ),
      ).toBe("ABC123");
    });

    it("extracts code regardless of case in path", () => {
      expect(
        extractCalendarCode(
          "https://volleymanager.volleyball.ch/indoor/iCal/referee/BLYMVF",
        ),
      ).toBe("BLYMVF");
    });
  });

  describe("invalid URLs", () => {
    it("returns null for URLs from other domains", () => {
      expect(
        extractCalendarCode("https://example.com/calendar/ABC123"),
      ).toBeNull();
      expect(
        extractCalendarCode("https://volleyball.ch/calendar/ABC123"),
      ).toBeNull();
    });

    it("returns null for URLs with invalid paths", () => {
      expect(
        extractCalendarCode("https://volleymanager.volleyball.ch/other/ABC123"),
      ).toBeNull();
    });

    it("returns null for URLs with invalid code in path", () => {
      expect(
        extractCalendarCode(
          "https://volleymanager.volleyball.ch/calendar/TOOLONG",
        ),
      ).toBeNull();
      expect(
        extractCalendarCode(
          "https://volleymanager.volleyball.ch/calendar/SHORT",
        ),
      ).toBeNull();
    });
  });

  describe("iOS/Safari edge cases", () => {
    it("handles zero-width characters from iOS copy-paste", () => {
      // Zero-width space (U+200B) that iOS sometimes adds
      expect(extractCalendarCode("\u200BABC123")).toBe("ABC123");
      expect(extractCalendarCode("ABC123\u200B")).toBe("ABC123");
      expect(extractCalendarCode("\u200BABC123\u200B")).toBe("ABC123");
    });

    it("handles non-breaking spaces", () => {
      // Non-breaking space (U+00A0) that can appear on iOS
      expect(extractCalendarCode("\u00A0ABC123")).toBe("ABC123");
      expect(extractCalendarCode("ABC123\u00A0")).toBe("ABC123");
    });

    it("handles URLs with query strings via fallback", () => {
      expect(
        extractCalendarCode(
          "https://volleymanager.volleyball.ch/indoor/iCal/referee/ABC123?source=share",
        ),
      ).toBe("ABC123");
    });

    it("handles URLs with fragments via fallback", () => {
      expect(
        extractCalendarCode(
          "https://volleymanager.volleyball.ch/indoor/iCal/referee/ABC123#top",
        ),
      ).toBe("ABC123");
    });

    it("handles URLs with query strings and fragments", () => {
      expect(
        extractCalendarCode(
          "https://volleymanager.volleyball.ch/calendar/XYZ789?utm_source=app#section",
        ),
      ).toBe("XYZ789");
    });

    it("handles invisible characters in URLs", () => {
      expect(
        extractCalendarCode(
          "https://volleymanager.volleyball.ch/indoor/iCal/referee/BLYMVF\u200B",
        ),
      ).toBe("BLYMVF");
    });
  });
});

describe("validateCalendarCode", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    vi.stubEnv("VITE_API_PROXY_URL", "https://api.example.com");
  });

  afterEach(() => {
    mockFetch.mockReset();
    vi.unstubAllEnvs();
  });

  describe("format validation", () => {
    it("returns invalid for codes with wrong format before API call", async () => {
      const result = await validateCalendarCode("INVALID");

      expect(result).toEqual({
        valid: false,
        error: "auth.invalidCalendarCode",
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("API validation", () => {
    it("returns valid when API responds with 200", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      const result = await validateCalendarCode("ABC123");

      expect(result).toEqual({ valid: true });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/iCal/referee/ABC123",
        { method: "HEAD", signal: undefined },
      );
    });

    it("returns calendarNotFound when API responds with 404", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await validateCalendarCode("ABC123");

      expect(result).toEqual({
        valid: false,
        error: "auth.calendarNotFound",
      });
    });

    it("returns calendarValidationFailed for other error status codes", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await validateCalendarCode("ABC123");

      expect(result).toEqual({
        valid: false,
        error: "auth.calendarValidationFailed",
      });
    });

    it("returns calendarValidationFailed on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await validateCalendarCode("ABC123");

      expect(result).toEqual({
        valid: false,
        error: "auth.calendarValidationFailed",
      });
    });
  });

  describe("abort signal handling", () => {
    it("passes signal to fetch", async () => {
      const controller = new AbortController();
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      await validateCalendarCode("ABC123", controller.signal);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it("re-throws AbortError when request is aborted", async () => {
      // Create an error that matches AbortError criteria (instanceof Error + name)
      const abortError = Object.assign(new Error("Aborted"), {
        name: "AbortError",
      });
      mockFetch.mockRejectedValue(abortError);

      await expect(validateCalendarCode("ABC123")).rejects.toThrow("Aborted");
    });
  });
});

describe("mapCalendarAssignmentToAssignment", () => {
  function createMockCalendarAssignment(
    overrides: Partial<CalendarAssignment> = {},
  ): CalendarAssignment {
    return {
      gameId: "123456",
      gameNumber: 123456,
      startTime: "2025-02-15T19:30:00+01:00",
      endTime: "2025-02-15T22:30:00+01:00",
      league: "NLA Men",
      leagueCategory: "NLA",
      homeTeam: "VBC Zürich",
      awayTeam: "Volley Luzern",
      role: "referee1",
      roleRaw: "ARB 1",
      gender: "men",
      hallName: "Sporthalle Hardau",
      hallId: "3661",
      address: "Hardaustrasse 10, 8005 Zürich",
      coordinates: { latitude: 47.3769, longitude: 8.5417 },
      mapsUrl: "https://maps.google.com/?q=47.3769,8.5417",
      plusCode: null,
      referees: {
        referee1: "Max Mustermann",
        referee2: "Anna Schmidt",
      },
      association: null,
      ...overrides,
    };
  }

  describe("basic mapping", () => {
    it("maps gameId to __identity", () => {
      const calendarAssignment = createMockCalendarAssignment();
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(result.__identity).toBe("123456");
    });

    it("maps startTime to game startingDateTime", () => {
      const calendarAssignment = createMockCalendarAssignment();
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(result.refereeGame?.game?.startingDateTime).toBe(
        "2025-02-15T19:30:00+01:00",
      );
    });

    it("maps gameNumber to game number", () => {
      const calendarAssignment = createMockCalendarAssignment({
        gameNumber: 382360,
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(result.refereeGame?.game?.number).toBe(382360);
    });

    it("handles null gameNumber", () => {
      const calendarAssignment = createMockCalendarAssignment({
        gameNumber: null,
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(result.refereeGame?.game?.number).toBeUndefined();
    });
  });

  describe("role to position mapping", () => {
    it("maps referee1 to head-one", () => {
      const calendarAssignment = createMockCalendarAssignment({
        role: "referee1",
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(result.refereePosition).toBe("head-one");
    });

    it("maps referee2 to head-two", () => {
      const calendarAssignment = createMockCalendarAssignment({
        role: "referee2",
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(result.refereePosition).toBe("head-two");
    });

    it("maps lineReferee to linesman-one", () => {
      const calendarAssignment = createMockCalendarAssignment({
        role: "lineReferee",
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(result.refereePosition).toBe("linesman-one");
    });

    it("maps scorer to linesman-one", () => {
      const calendarAssignment = createMockCalendarAssignment({
        role: "scorer",
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(result.refereePosition).toBe("linesman-one");
    });

    it("maps unknown to head-one as fallback", () => {
      const calendarAssignment = createMockCalendarAssignment({
        role: "unknown",
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(result.refereePosition).toBe("head-one");
    });
  });

  describe("team mapping", () => {
    it("maps homeTeam to encounter teamHome name", () => {
      const calendarAssignment = createMockCalendarAssignment({
        homeTeam: "VBC Zürich",
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(result.refereeGame?.game?.encounter?.teamHome?.name).toBe(
        "VBC Zürich",
      );
    });

    it("maps awayTeam to encounter teamAway name", () => {
      const calendarAssignment = createMockCalendarAssignment({
        awayTeam: "Volley Luzern",
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(result.refereeGame?.game?.encounter?.teamAway?.name).toBe(
        "Volley Luzern",
      );
    });
  });

  describe("gender mapping", () => {
    it("maps men gender to m", () => {
      const calendarAssignment = createMockCalendarAssignment({
        gender: "men",
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(result.refereeGame?.game?.group?.phase?.league?.gender).toBe("m");
    });

    it("maps women gender to f", () => {
      const calendarAssignment = createMockCalendarAssignment({
        gender: "women",
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(result.refereeGame?.game?.group?.phase?.league?.gender).toBe("f");
    });

    it("maps mixed gender to undefined", () => {
      const calendarAssignment = createMockCalendarAssignment({
        gender: "mixed",
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(
        result.refereeGame?.game?.group?.phase?.league?.gender,
      ).toBeUndefined();
    });

    it("maps unknown gender to undefined", () => {
      const calendarAssignment = createMockCalendarAssignment({
        gender: "unknown",
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(
        result.refereeGame?.game?.group?.phase?.league?.gender,
      ).toBeUndefined();
    });
  });

  describe("league category mapping", () => {
    it("maps leagueCategory to league leagueCategory name", () => {
      const calendarAssignment = createMockCalendarAssignment({
        leagueCategory: "NLA",
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(
        result.refereeGame?.game?.group?.phase?.league?.leagueCategory?.name,
      ).toBe("NLA");
    });

    it("handles null leagueCategory", () => {
      const calendarAssignment = createMockCalendarAssignment({
        leagueCategory: null,
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(
        result.refereeGame?.game?.group?.phase?.league?.leagueCategory,
      ).toBeUndefined();
    });
  });

  describe("hall mapping", () => {
    it("maps hallId to hall __identity", () => {
      const calendarAssignment = createMockCalendarAssignment({
        hallId: "3661",
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(result.refereeGame?.game?.hall?.__identity).toBe("3661");
    });

    it("uses gameId as hall __identity when hallId is null", () => {
      const calendarAssignment = createMockCalendarAssignment({
        hallId: null,
        gameId: "999999",
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(result.refereeGame?.game?.hall?.__identity).toBe("999999");
    });

    it("maps hallName to hall name", () => {
      const calendarAssignment = createMockCalendarAssignment({
        hallName: "Sporthalle Hardau",
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(result.refereeGame?.game?.hall?.name).toBe("Sporthalle Hardau");
    });

    it("handles null hallName", () => {
      const calendarAssignment = createMockCalendarAssignment({
        hallName: null,
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(result.refereeGame?.game?.hall?.name).toBeUndefined();
    });

    it("maps address to hall postal address", () => {
      const calendarAssignment = createMockCalendarAssignment({
        address: "Hardaustrasse 10, 8005 Zürich",
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(
        result.refereeGame?.game?.hall?.primaryPostalAddress?.streetAndHouseNumber,
      ).toBe("Hardaustrasse 10, 8005 Zürich");
      expect(
        result.refereeGame?.game?.hall?.primaryPostalAddress?.city,
      ).toBe("Zürich");
    });

    it("maps coordinates to geographical location", () => {
      const calendarAssignment = createMockCalendarAssignment({
        coordinates: { latitude: 47.3769, longitude: 8.5417 },
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      const geo =
        result.refereeGame?.game?.hall?.primaryPostalAddress
          ?.geographicalLocation;
      expect(geo?.latitude).toBe(47.3769);
      expect(geo?.longitude).toBe(8.5417);
    });
  });

  describe("referee convocation mapping", () => {
    it("maps referee1 to first head referee convocation", () => {
      const calendarAssignment = createMockCalendarAssignment({
        referees: { referee1: "Max Mustermann" },
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(
        result.refereeGame?.activeRefereeConvocationFirstHeadReferee
          ?.indoorAssociationReferee?.indoorReferee?.person?.displayName,
      ).toBe("Max Mustermann");
    });

    it("maps referee2 to second head referee convocation", () => {
      const calendarAssignment = createMockCalendarAssignment({
        referees: { referee2: "Anna Schmidt" },
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(
        result.refereeGame?.activeRefereeConvocationSecondHeadReferee
          ?.indoorAssociationReferee?.indoorReferee?.person?.displayName,
      ).toBe("Anna Schmidt");
    });

    it("maps lineReferee1 to first linesman convocation", () => {
      const calendarAssignment = createMockCalendarAssignment({
        referees: { lineReferee1: "Line Ref One" },
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(
        result.refereeGame?.activeRefereeConvocationFirstLinesman
          ?.indoorAssociationReferee?.indoorReferee?.person?.displayName,
      ).toBe("Line Ref One");
    });

    it("maps lineReferee2 to second linesman convocation", () => {
      const calendarAssignment = createMockCalendarAssignment({
        referees: { lineReferee2: "Line Ref Two" },
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(
        result.refereeGame?.activeRefereeConvocationSecondLinesman
          ?.indoorAssociationReferee?.indoorReferee?.person?.displayName,
      ).toBe("Line Ref Two");
    });

    it("handles empty referees object", () => {
      const calendarAssignment = createMockCalendarAssignment({
        referees: {},
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(
        result.refereeGame?.activeRefereeConvocationFirstHeadReferee,
      ).toBeUndefined();
      expect(
        result.refereeGame?.activeRefereeConvocationSecondHeadReferee,
      ).toBeUndefined();
    });
  });

  describe("isGameInFuture", () => {
    it("returns 1 for future games", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const calendarAssignment = createMockCalendarAssignment({
        startTime: futureDate.toISOString(),
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(result.refereeGame?.isGameInFuture).toBe("1");
    });

    it("returns 0 for past games", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const calendarAssignment = createMockCalendarAssignment({
        startTime: pastDate.toISOString(),
      });
      const result = mapCalendarAssignmentToAssignment(calendarAssignment);

      expect(result.refereeGame?.isGameInFuture).toBe("0");
    });
  });
});

describe("extractCityFromAddress", () => {
  it("extracts city from Swiss address with postal code and city", () => {
    expect(extractCityFromAddress("Bergstrasse 2, 8800 Thalwil")).toBe(
      "Thalwil",
    );
  });

  it("extracts city from address with street, postal code and city", () => {
    expect(
      extractCityFromAddress("Sternenfeldstrasse 50, 4127 Birsfelden"),
    ).toBe("Birsfelden");
  });

  it("extracts city from address with multi-word city name", () => {
    expect(extractCityFromAddress("Route de Valavran 10, 1293 Bellevue")).toBe(
      "Bellevue",
    );
  });

  it("handles address with just postal code and city", () => {
    expect(extractCityFromAddress("8005 Zürich")).toBe("Zürich");
  });

  it("returns last part when no postal code pattern found", () => {
    expect(extractCityFromAddress("Some Hall, Some Address, SomeCity")).toBe(
      "SomeCity",
    );
  });

  it("returns undefined for address without comma", () => {
    expect(extractCityFromAddress("Just a single line")).toBeUndefined();
  });

  it("returns undefined for empty address", () => {
    expect(extractCityFromAddress("")).toBeUndefined();
  });

  it("handles address with multiple commas", () => {
    expect(
      extractCityFromAddress(
        "Sporthalle, Hauptstrasse 1, 3000 Bern",
      ),
    ).toBe("Bern");
  });
});
