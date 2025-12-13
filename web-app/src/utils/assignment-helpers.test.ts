import { describe, it, expect } from "vitest";
import { getTeamNames, MODAL_CLEANUP_DELAY } from "./assignment-helpers";
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
});
