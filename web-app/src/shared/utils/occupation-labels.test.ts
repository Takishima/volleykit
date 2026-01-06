import { describe, it, expect } from "vitest";
import { getOccupationLabelKey } from "./occupation-labels";

describe("occupation-labels", () => {
  describe("getOccupationLabelKey", () => {
    it("should return correct key for referee", () => {
      expect(getOccupationLabelKey("referee")).toBe("occupations.referee");
    });

    it("should return correct key for player", () => {
      expect(getOccupationLabelKey("player")).toBe("occupations.player");
    });

    it("should return correct key for clubAdmin", () => {
      expect(getOccupationLabelKey("clubAdmin")).toBe("occupations.clubAdmin");
    });

    it("should return correct key for associationAdmin", () => {
      expect(getOccupationLabelKey("associationAdmin")).toBe(
        "occupations.associationAdmin",
      );
    });
  });
});
