import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getTeamNames,
  MODAL_CLEANUP_DELAY,
  DEFAULT_VALIDATION_DEADLINE_HOURS,
  isValidationClosed,
  isGamePast,
} from "./assignment-helpers";
import type { Assignment } from "@/api/client";

describe("assignment-helpers", () => {
  describe("MODAL_CLEANUP_DELAY", () => {
    it("should be defined as 300ms", () => {
      expect(MODAL_CLEANUP_DELAY).toBe(300);
    });
  });

  describe("getTeamNames", () => {
    it("should extract team names from assignment", () => {
      const assignment: Partial<Assignment> = {
        refereeGame: {
          game: {
            encounter: {
              teamHome: { name: "Team A" },
              teamAway: { name: "Team B" },
            },
          },
        },
      } as Assignment;

      const result = getTeamNames(assignment as Assignment);
      expect(result).toEqual({ homeTeam: "Team A", awayTeam: "Team B" });
    });

    it("should return TBD for missing team names", () => {
      const assignment: Partial<Assignment> = {
        refereeGame: {
          game: {
            encounter: {},
          },
        },
      } as Assignment;

      const result = getTeamNames(assignment as Assignment);
      expect(result).toEqual({ homeTeam: "TBD", awayTeam: "TBD" });
    });

    it("should return TBD for missing game data", () => {
      const assignment: Partial<Assignment> = {
        refereeGame: {},
      } as Assignment;

      const result = getTeamNames(assignment as Assignment);
      expect(result).toEqual({ homeTeam: "TBD", awayTeam: "TBD" });
    });

    it("should return TBD for missing refereeGame", () => {
      const assignment: Partial<Assignment> = {} as Assignment;

      const result = getTeamNames(assignment as Assignment);
      expect(result).toEqual({ homeTeam: "TBD", awayTeam: "TBD" });
    });
  });

  describe("DEFAULT_VALIDATION_DEADLINE_HOURS", () => {
    it("should be defined as 6 hours", () => {
      expect(DEFAULT_VALIDATION_DEADLINE_HOURS).toBe(6);
    });
  });

  describe("isValidationClosed", () => {
    const FIXED_NOW = new Date("2025-01-15T12:00:00Z");

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(FIXED_NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return true when validation deadline has passed", () => {
      // Game started 10 hours ago, deadline is 6 hours
      const gameStart = new Date("2025-01-15T02:00:00Z").toISOString();
      expect(isValidationClosed(gameStart, 6)).toBe(true);
    });

    it("should return false when within validation window", () => {
      // Game started 3 hours ago, deadline is 6 hours
      const gameStart = new Date("2025-01-15T09:00:00Z").toISOString();
      expect(isValidationClosed(gameStart, 6)).toBe(false);
    });

    it("should return false for future games", () => {
      // Game starts in 2 hours
      const gameStart = new Date("2025-01-15T14:00:00Z").toISOString();
      expect(isValidationClosed(gameStart, 6)).toBe(false);
    });

    it("should return false exactly at the deadline boundary", () => {
      // Game started exactly 6 hours ago - validation just closed
      const gameStart = new Date("2025-01-15T06:00:00Z").toISOString();
      // At exactly 6 hours, now > deadline is false (deadline = 12:00, now = 12:00)
      expect(isValidationClosed(gameStart, 6)).toBe(false);
    });

    it("should return true just after the deadline", () => {
      // Game started 6 hours and 1 second ago
      const gameStart = new Date("2025-01-15T05:59:59Z").toISOString();
      expect(isValidationClosed(gameStart, 6)).toBe(true);
    });

    it("should use default deadline when not specified", () => {
      // Game started 10 hours ago, default deadline is 6 hours
      const gameStart = new Date("2025-01-15T02:00:00Z").toISOString();
      expect(isValidationClosed(gameStart)).toBe(true);
    });

    it("should return false for undefined gameStartTime", () => {
      expect(isValidationClosed(undefined, 6)).toBe(false);
    });

    it("should return false for null gameStartTime", () => {
      expect(isValidationClosed(null, 6)).toBe(false);
    });

    it("should return false for invalid date string", () => {
      expect(isValidationClosed("not-a-date", 6)).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidationClosed("", 6)).toBe(false);
    });

    it("should handle custom deadline hours", () => {
      // Game started 25 hours ago, deadline is 24 hours
      const gameStart = new Date("2025-01-14T11:00:00Z").toISOString();
      expect(isValidationClosed(gameStart, 24)).toBe(true);

      // Game started 23 hours ago, deadline is 24 hours
      const recentGame = new Date("2025-01-14T13:00:00Z").toISOString();
      expect(isValidationClosed(recentGame, 24)).toBe(false);
    });
  });

  describe("isGamePast", () => {
    const FIXED_NOW = new Date("2025-01-15T12:00:00Z");

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(FIXED_NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return true for games that have started", () => {
      const gameStart = new Date("2025-01-15T10:00:00Z").toISOString();
      expect(isGamePast(gameStart)).toBe(true);
    });

    it("should return false for future games", () => {
      const gameStart = new Date("2025-01-15T14:00:00Z").toISOString();
      expect(isGamePast(gameStart)).toBe(false);
    });

    it("should return false for games starting exactly now", () => {
      const gameStart = new Date("2025-01-15T12:00:00Z").toISOString();
      // now > gameStart is false when they are equal
      expect(isGamePast(gameStart)).toBe(false);
    });

    it("should return true for games that started just 1 second ago", () => {
      const gameStart = new Date("2025-01-15T11:59:59Z").toISOString();
      expect(isGamePast(gameStart)).toBe(true);
    });

    it("should return false for undefined gameStartTime", () => {
      expect(isGamePast(undefined)).toBe(false);
    });

    it("should return false for null gameStartTime", () => {
      expect(isGamePast(null)).toBe(false);
    });

    it("should return false for invalid date string", () => {
      expect(isGamePast("invalid-date")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isGamePast("")).toBe(false);
    });

    it("should return true for games from yesterday", () => {
      const gameStart = new Date("2025-01-14T18:00:00Z").toISOString();
      expect(isGamePast(gameStart)).toBe(true);
    });
  });
});
