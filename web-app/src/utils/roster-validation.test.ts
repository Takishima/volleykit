import { describe, it, expect } from "vitest";
import {
  validateRoster,
  validateBothRosters,
  MIN_PLAYERS_REQUIRED,
} from "./roster-validation";
import type { NominationList } from "@/api/client";
import type { RosterModifications, CoachModifications, CoachRole } from "@/hooks/useNominationList";

/**
 * Creates a mock NominationList with the specified number of players and coach.
 */
function createMockNominationList(
  playerCount: number,
  hasHeadCoach: boolean,
): NominationList {
  const nominations = Array.from({ length: playerCount }, (_, i) => ({
    __identity: `player-${i}`,
    indoorPlayer: {
      person: {
        displayName: `Player ${i}`,
      },
    },
  }));

  return {
    __identity: "nomination-list-1",
    indoorPlayerNominations: nominations,
    coachPerson: hasHeadCoach ? { displayName: "Head Coach" } : undefined,
  } as NominationList;
}

/**
 * Creates empty roster modifications.
 */
function createEmptyModifications(): RosterModifications {
  return {
    added: [],
    removed: [],
  };
}

/**
 * Creates empty coach modifications.
 */
function createEmptyCoachModifications(): CoachModifications {
  return {
    added: new Map(),
    removed: new Set(),
  };
}

describe("roster-validation", () => {
  describe("MIN_PLAYERS_REQUIRED", () => {
    it("should be 6", () => {
      expect(MIN_PLAYERS_REQUIRED).toBe(6);
    });
  });

  describe("validateRoster", () => {
    describe("when nomination list is null", () => {
      it("returns valid result (loading state)", () => {
        const result = validateRoster(
          null,
          createEmptyModifications(),
          createEmptyCoachModifications(),
        );

        expect(result.isValid).toBe(true);
        expect(result.playerCount).toBe(0);
        expect(result.hasHeadCoach).toBe(true);
        expect(result.hasMinPlayers).toBe(true);
      });
    });

    describe("player count validation", () => {
      it("returns valid when exactly 6 players", () => {
        const nominationList = createMockNominationList(6, true);
        const result = validateRoster(
          nominationList,
          createEmptyModifications(),
          createEmptyCoachModifications(),
        );

        expect(result.isValid).toBe(true);
        expect(result.playerCount).toBe(6);
        expect(result.hasMinPlayers).toBe(true);
      });

      it("returns valid when more than 6 players", () => {
        const nominationList = createMockNominationList(10, true);
        const result = validateRoster(
          nominationList,
          createEmptyModifications(),
          createEmptyCoachModifications(),
        );

        expect(result.isValid).toBe(true);
        expect(result.playerCount).toBe(10);
        expect(result.hasMinPlayers).toBe(true);
      });

      it("returns invalid when fewer than 6 players", () => {
        const nominationList = createMockNominationList(5, true);
        const result = validateRoster(
          nominationList,
          createEmptyModifications(),
          createEmptyCoachModifications(),
        );

        expect(result.isValid).toBe(false);
        expect(result.playerCount).toBe(5);
        expect(result.hasMinPlayers).toBe(false);
      });

      it("returns invalid when zero players", () => {
        const nominationList = createMockNominationList(0, true);
        const result = validateRoster(
          nominationList,
          createEmptyModifications(),
          createEmptyCoachModifications(),
        );

        expect(result.isValid).toBe(false);
        expect(result.playerCount).toBe(0);
        expect(result.hasMinPlayers).toBe(false);
      });
    });

    describe("player modifications", () => {
      it("includes added players in count", () => {
        const nominationList = createMockNominationList(4, true);
        const modifications: RosterModifications = {
          added: [
            { id: "new-1", displayName: "New Player 1" },
            { id: "new-2", displayName: "New Player 2" },
          ],
          removed: [],
        };

        const result = validateRoster(
          nominationList,
          modifications,
          createEmptyCoachModifications(),
        );

        expect(result.playerCount).toBe(6);
        expect(result.hasMinPlayers).toBe(true);
        expect(result.isValid).toBe(true);
      });

      it("excludes removed players from count", () => {
        const nominationList = createMockNominationList(7, true);
        const modifications: RosterModifications = {
          added: [],
          removed: ["player-0", "player-1"],
        };

        const result = validateRoster(
          nominationList,
          modifications,
          createEmptyCoachModifications(),
        );

        expect(result.playerCount).toBe(5);
        expect(result.hasMinPlayers).toBe(false);
        expect(result.isValid).toBe(false);
      });

      it("handles both additions and removals", () => {
        const nominationList = createMockNominationList(5, true);
        const modifications: RosterModifications = {
          added: [
            { id: "new-1", displayName: "New Player 1" },
            { id: "new-2", displayName: "New Player 2" },
          ],
          removed: ["player-0"],
        };

        const result = validateRoster(
          nominationList,
          modifications,
          createEmptyCoachModifications(),
        );

        // 5 base + 2 added - 1 removed = 6
        expect(result.playerCount).toBe(6);
        expect(result.hasMinPlayers).toBe(true);
        expect(result.isValid).toBe(true);
      });
    });

    describe("head coach validation", () => {
      it("returns valid when head coach exists", () => {
        const nominationList = createMockNominationList(6, true);
        const result = validateRoster(
          nominationList,
          createEmptyModifications(),
          createEmptyCoachModifications(),
        );

        expect(result.hasHeadCoach).toBe(true);
        expect(result.isValid).toBe(true);
      });

      it("returns invalid when no head coach", () => {
        const nominationList = createMockNominationList(6, false);
        const result = validateRoster(
          nominationList,
          createEmptyModifications(),
          createEmptyCoachModifications(),
        );

        expect(result.hasHeadCoach).toBe(false);
        expect(result.isValid).toBe(false);
      });
    });

    describe("coach modifications", () => {
      it("head coach addition makes roster valid", () => {
        const nominationList = createMockNominationList(6, false);
        const coachMods: CoachModifications = {
          added: new Map([["head" as CoachRole, { id: "coach-1", displayName: "New Coach" }]]),
          removed: new Set(),
        };

        const result = validateRoster(
          nominationList,
          createEmptyModifications(),
          coachMods,
        );

        expect(result.hasHeadCoach).toBe(true);
        expect(result.isValid).toBe(true);
      });

      it("head coach removal makes roster invalid", () => {
        const nominationList = createMockNominationList(6, true);
        const coachMods: CoachModifications = {
          added: new Map(),
          removed: new Set(["head" as CoachRole]),
        };

        const result = validateRoster(
          nominationList,
          createEmptyModifications(),
          coachMods,
        );

        expect(result.hasHeadCoach).toBe(false);
        expect(result.isValid).toBe(false);
      });

      it("adding head coach after removal makes roster valid", () => {
        const nominationList = createMockNominationList(6, true);
        const coachMods: CoachModifications = {
          added: new Map([["head" as CoachRole, { id: "new-coach", displayName: "New Coach" }]]),
          removed: new Set(["head" as CoachRole]),
        };

        const result = validateRoster(
          nominationList,
          createEmptyModifications(),
          coachMods,
        );

        // Addition takes precedence
        expect(result.hasHeadCoach).toBe(true);
        expect(result.isValid).toBe(true);
      });

      it("assistant coach changes do not affect validation", () => {
        const nominationList = createMockNominationList(6, true);
        const coachMods: CoachModifications = {
          added: new Map([
            ["firstAssistant" as CoachRole, { id: "asst-1", displayName: "Assistant 1" }],
          ]),
          removed: new Set(["secondAssistant" as CoachRole]),
        };

        const result = validateRoster(
          nominationList,
          createEmptyModifications(),
          coachMods,
        );

        expect(result.hasHeadCoach).toBe(true);
        expect(result.isValid).toBe(true);
      });
    });

    describe("combined validation", () => {
      it("returns invalid when both coach and players are insufficient", () => {
        const nominationList = createMockNominationList(3, false);
        const result = validateRoster(
          nominationList,
          createEmptyModifications(),
          createEmptyCoachModifications(),
        );

        expect(result.isValid).toBe(false);
        expect(result.hasHeadCoach).toBe(false);
        expect(result.hasMinPlayers).toBe(false);
        expect(result.playerCount).toBe(3);
      });

      it("requires both coach and minimum players for validity", () => {
        // Has coach but not enough players
        const list1 = createMockNominationList(5, true);
        const result1 = validateRoster(
          list1,
          createEmptyModifications(),
          createEmptyCoachModifications(),
        );
        expect(result1.isValid).toBe(false);

        // Has enough players but no coach
        const list2 = createMockNominationList(6, false);
        const result2 = validateRoster(
          list2,
          createEmptyModifications(),
          createEmptyCoachModifications(),
        );
        expect(result2.isValid).toBe(false);

        // Has both
        const list3 = createMockNominationList(6, true);
        const result3 = validateRoster(
          list3,
          createEmptyModifications(),
          createEmptyCoachModifications(),
        );
        expect(result3.isValid).toBe(true);
      });
    });

    describe("edge cases", () => {
      it("handles empty indoorPlayerNominations array", () => {
        const nominationList = {
          __identity: "nl-1",
          indoorPlayerNominations: [],
          coachPerson: { displayName: "Coach" },
        } as NominationList;

        const result = validateRoster(
          nominationList,
          createEmptyModifications(),
          createEmptyCoachModifications(),
        );

        expect(result.playerCount).toBe(0);
        expect(result.hasMinPlayers).toBe(false);
      });

      it("handles undefined indoorPlayerNominations", () => {
        const nominationList = {
          __identity: "nl-1",
          coachPerson: { displayName: "Coach" },
        } as NominationList;

        const result = validateRoster(
          nominationList,
          createEmptyModifications(),
          createEmptyCoachModifications(),
        );

        expect(result.playerCount).toBe(0);
        expect(result.hasMinPlayers).toBe(false);
      });
    });
  });

  describe("validateBothRosters", () => {
    it("returns allValid true when both rosters are valid", () => {
      const homeList = createMockNominationList(6, true);
      const awayList = createMockNominationList(8, true);

      const result = validateBothRosters(
        homeList,
        createEmptyModifications(),
        createEmptyCoachModifications(),
        awayList,
        createEmptyModifications(),
        createEmptyCoachModifications(),
      );

      expect(result.allValid).toBe(true);
      expect(result.home.isValid).toBe(true);
      expect(result.away.isValid).toBe(true);
    });

    it("returns allValid false when home roster is invalid", () => {
      const homeList = createMockNominationList(5, true); // Not enough players
      const awayList = createMockNominationList(6, true);

      const result = validateBothRosters(
        homeList,
        createEmptyModifications(),
        createEmptyCoachModifications(),
        awayList,
        createEmptyModifications(),
        createEmptyCoachModifications(),
      );

      expect(result.allValid).toBe(false);
      expect(result.home.isValid).toBe(false);
      expect(result.away.isValid).toBe(true);
    });

    it("returns allValid false when away roster is invalid", () => {
      const homeList = createMockNominationList(6, true);
      const awayList = createMockNominationList(6, false); // No head coach

      const result = validateBothRosters(
        homeList,
        createEmptyModifications(),
        createEmptyCoachModifications(),
        awayList,
        createEmptyModifications(),
        createEmptyCoachModifications(),
      );

      expect(result.allValid).toBe(false);
      expect(result.home.isValid).toBe(true);
      expect(result.away.isValid).toBe(false);
    });

    it("returns allValid false when both rosters are invalid", () => {
      const homeList = createMockNominationList(3, false);
      const awayList = createMockNominationList(4, false);

      const result = validateBothRosters(
        homeList,
        createEmptyModifications(),
        createEmptyCoachModifications(),
        awayList,
        createEmptyModifications(),
        createEmptyCoachModifications(),
      );

      expect(result.allValid).toBe(false);
      expect(result.home.isValid).toBe(false);
      expect(result.away.isValid).toBe(false);
    });

    it("handles null nomination lists (loading state)", () => {
      const result = validateBothRosters(
        null,
        createEmptyModifications(),
        createEmptyCoachModifications(),
        null,
        createEmptyModifications(),
        createEmptyCoachModifications(),
      );

      expect(result.allValid).toBe(true);
      expect(result.home.isValid).toBe(true);
      expect(result.away.isValid).toBe(true);
    });

    it("handles mixed null and valid nomination lists", () => {
      const awayList = createMockNominationList(6, true);

      const result = validateBothRosters(
        null, // Home loading
        createEmptyModifications(),
        createEmptyCoachModifications(),
        awayList,
        createEmptyModifications(),
        createEmptyCoachModifications(),
      );

      expect(result.allValid).toBe(true);
      expect(result.home.isValid).toBe(true); // Loading = valid
      expect(result.away.isValid).toBe(true);
    });

    it("applies modifications independently to each team", () => {
      const homeList = createMockNominationList(5, true);
      const awayList = createMockNominationList(7, true);

      const homePlayerMods: RosterModifications = {
        added: [{ id: "new-1", displayName: "New" }],
        removed: [],
      };
      const awayPlayerMods: RosterModifications = {
        added: [],
        removed: ["player-0", "player-1"],
      };

      const result = validateBothRosters(
        homeList,
        homePlayerMods,
        createEmptyCoachModifications(),
        awayList,
        awayPlayerMods,
        createEmptyCoachModifications(),
      );

      // Home: 5 + 1 = 6 (valid)
      expect(result.home.playerCount).toBe(6);
      expect(result.home.isValid).toBe(true);

      // Away: 7 - 2 = 5 (invalid)
      expect(result.away.playerCount).toBe(5);
      expect(result.away.isValid).toBe(false);

      expect(result.allValid).toBe(false);
    });
  });
});
