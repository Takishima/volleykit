import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extractCalendarCode, validateCalendarCode } from "./calendar-helpers";

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
});

describe("validateCalendarCode", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubEnv("VITE_API_PROXY_URL", "https://api.example.com");
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  describe("format validation", () => {
    it("returns invalid for codes with wrong format before API call", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

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
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      const result = await validateCalendarCode("ABC123");

      expect(result).toEqual({ valid: true });
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.example.com/sportmanager.volleyball/calendar/ical/ABC123",
        { method: "HEAD", signal: undefined },
      );
    });

    it("returns calendarNotFound when API responds with 404", async () => {
      global.fetch = vi.fn().mockResolvedValue({
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
      global.fetch = vi.fn().mockResolvedValue({
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
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

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
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      await validateCalendarCode("ABC123", controller.signal);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it("re-throws AbortError when request is aborted", async () => {
      // Create an error that matches AbortError criteria (instanceof Error + name)
      const abortError = Object.assign(new Error("Aborted"), {
        name: "AbortError",
      });
      global.fetch = vi.fn().mockRejectedValue(abortError);

      await expect(validateCalendarCode("ABC123")).rejects.toThrow("Aborted");
    });
  });
});
