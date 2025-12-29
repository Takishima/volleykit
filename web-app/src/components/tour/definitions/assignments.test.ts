import { describe, it, expect } from "vitest";
import { TOUR_DUMMY_ASSIGNMENT } from "./assignments";
import type { Assignment } from "@/api/client";
import {
  isGameReportEligible,
  isValidationEligible,
} from "@/utils/assignment-helpers";
import { isAssignmentCompensationEditable } from "@/utils/compensation-actions";

describe("TOUR_DUMMY_ASSIGNMENT", () => {
  // Cast for eligibility checks which expect Assignment type
  const assignment = TOUR_DUMMY_ASSIGNMENT as unknown as Assignment;

  describe("eligibility checks", () => {
    it("passes validation eligibility (head-one position)", () => {
      expect(isValidationEligible(assignment)).toBe(true);
    });

    it("passes game report eligibility (NLA league + head-one)", () => {
      expect(isGameReportEligible(assignment)).toBe(true);
    });

    it("passes compensation editable check", () => {
      expect(isAssignmentCompensationEditable(assignment)).toBe(true);
    });

    it("has future game date for exchange eligibility", () => {
      expect(TOUR_DUMMY_ASSIGNMENT.refereeGame.isGameInFuture).toBe("1");
    });
  });

  describe("required fields for display", () => {
    it("has team names via encounter", () => {
      const game = TOUR_DUMMY_ASSIGNMENT.refereeGame.game;
      expect(game.encounter.teamHome.name).toBe("VBC Beispiel");
      expect(game.encounter.teamAway.name).toBe("SC Muster");
    });

    it("has hall location", () => {
      const game = TOUR_DUMMY_ASSIGNMENT.refereeGame.game;
      expect(game.hall.name).toBe("Musterhalle");
      expect(game.hall.primaryPostalAddress.city).toBe("Zürich");
    });

    it("has compensation distance", () => {
      expect(TOUR_DUMMY_ASSIGNMENT.convocationCompensation?.distanceFormatted).toBe(
        "25 km",
      );
    });

    it("has unique identity for tour mode detection", () => {
      expect(TOUR_DUMMY_ASSIGNMENT.__identity).toBe("tour-dummy-assignment");
    });
  });
});
