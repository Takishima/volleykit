import { describe, it, expect } from "vitest";
import type { Assignment } from "@/api/client";
import { detectSingleBallHall, getSingleBallHallsPdfPath } from "./single-ball-halls";

function createMockAssignment(
  city: string | undefined,
  hallName: string | undefined,
  leagueCategory: string | undefined
): Assignment {
  return {
    __identity: "test-assignment",
    refereeGame: {
      game: {
        hall: city
          ? {
              __identity: "hall-id",
              name: hallName,
              primaryPostalAddress: {
                __identity: "address-id",
                city,
              },
            }
          : undefined,
        group: leagueCategory
          ? {
              phase: {
                league: {
                  leagueCategory: {
                    __identity: "cat-id",
                    name: leagueCategory,
                  },
                },
              },
            }
          : undefined,
      },
    },
  } as Assignment;
}

describe("detectSingleBallHall", () => {
  describe("matching behavior", () => {
    it("detects unconditional single-ball hall (Ruswil Dorfhalle)", () => {
      const assignment = createMockAssignment("Ruswil", "Dorfhalle neu", "NLB");
      const result = detectSingleBallHall(assignment);

      expect(result).not.toBeNull();
      expect(result?.hall.city).toBe("Ruswil");
      expect(result?.isConditional).toBe(false);
    });

    it("detects conditional single-ball hall (Luzern Bahnhofhalle)", () => {
      const assignment = createMockAssignment(
        "Luzern",
        "Bahnhofhalle",
        "NLA"
      );
      const result = detectSingleBallHall(assignment);

      expect(result).not.toBeNull();
      expect(result?.hall.city).toBe("Luzern");
      expect(result?.isConditional).toBe(true);
    });

    it("detects Guntershausen Turnhalle (unconditional)", () => {
      const assignment = createMockAssignment(
        "Guntershausen",
        "Turnhalle",
        "NLB"
      );
      const result = detectSingleBallHall(assignment);

      expect(result).not.toBeNull();
      expect(result?.hall.city).toBe("Guntershausen");
      expect(result?.isConditional).toBe(false);
    });

    it("detects Liesberg MZH Seemättli (unconditional)", () => {
      const assignment = createMockAssignment(
        "Liesberg",
        "MZH Seemättli",
        "NLB"
      );
      const result = detectSingleBallHall(assignment);

      expect(result).not.toBeNull();
      expect(result?.isConditional).toBe(false);
    });

    it("detects Olten Giroud-Olma (conditional)", () => {
      const assignment = createMockAssignment(
        "Olten",
        "Giroud-Olma Halle 2",
        "NLB"
      );
      const result = detectSingleBallHall(assignment);

      expect(result).not.toBeNull();
      expect(result?.hall.city).toBe("Olten");
      expect(result?.isConditional).toBe(true);
    });

    it("detects Thônex CS Sous-Moulin (conditional)", () => {
      const assignment = createMockAssignment(
        "Thônex",
        "CS Sous-Moulin",
        "NLA"
      );
      const result = detectSingleBallHall(assignment);

      expect(result).not.toBeNull();
      expect(result?.hall.city).toBe("Thônex");
      expect(result?.isConditional).toBe(true);
    });

    it("matches with case-insensitive city name", () => {
      const assignment = createMockAssignment("RUSWIL", "Dorfhalle neu", "NLB");
      const result = detectSingleBallHall(assignment);

      expect(result).not.toBeNull();
      expect(result?.hall.city).toBe("Ruswil");
    });

    it("matches with accented characters normalized", () => {
      // Thônex without accent should still match
      const assignment = createMockAssignment("Thonex", "CS Sous-Moulin", "NLB");
      const result = detectSingleBallHall(assignment);

      expect(result).not.toBeNull();
      expect(result?.hall.city).toBe("Thônex");
    });
  });

  describe("non-matching behavior", () => {
    it("returns null for non-NLA/NLB leagues", () => {
      const assignment = createMockAssignment("Ruswil", "Dorfhalle neu", "2L");
      const result = detectSingleBallHall(assignment);

      expect(result).toBeNull();
    });

    it("returns null for 3L league", () => {
      const assignment = createMockAssignment("Ruswil", "Dorfhalle neu", "3L");
      const result = detectSingleBallHall(assignment);

      expect(result).toBeNull();
    });

    it("returns null when city matches but hall name does not contain keywords", () => {
      // Generic hall in Ruswil that is not the Dorfhalle
      const assignment = createMockAssignment(
        "Ruswil",
        "Sportzentrum Ruswil",
        "NLB"
      );
      const result = detectSingleBallHall(assignment);

      expect(result).toBeNull();
    });

    it("returns null for unknown city", () => {
      const assignment = createMockAssignment("Zürich", "Saalsporthalle", "NLA");
      const result = detectSingleBallHall(assignment);

      expect(result).toBeNull();
    });

    it("returns null when city is undefined", () => {
      const assignment = createMockAssignment(undefined, "Dorfhalle neu", "NLB");
      const result = detectSingleBallHall(assignment);

      expect(result).toBeNull();
    });

    it("returns null when hall name is undefined", () => {
      const assignment = createMockAssignment("Ruswil", undefined, "NLB");
      const result = detectSingleBallHall(assignment);

      expect(result).toBeNull();
    });

    it("returns null when league category is undefined", () => {
      const assignment = createMockAssignment("Ruswil", "Dorfhalle neu", undefined);
      const result = detectSingleBallHall(assignment);

      expect(result).toBeNull();
    });

    it("returns null when game data is missing", () => {
      const assignment = {
        __identity: "test",
        refereeConvocationStatus: "active",
        refereePosition: "head-one",
        refereeGame: undefined,
      } as unknown as Assignment;
      const result = detectSingleBallHall(assignment);

      expect(result).toBeNull();
    });

    it("avoids false positive for generic Turnhalle in wrong city", () => {
      // Turnhalle is common, but only Guntershausen Turnhalle is a single-ball hall
      const assignment = createMockAssignment("Bern", "Turnhalle Wankdorf", "NLB");
      const result = detectSingleBallHall(assignment);

      expect(result).toBeNull();
    });

    it("avoids false positive for generic Gymnasium in wrong city", () => {
      // Gymnasium is common, but only Laufen Gymnasium is a single-ball hall
      const assignment = createMockAssignment("Basel", "Gymnasium", "NLA");
      const result = detectSingleBallHall(assignment);

      expect(result).toBeNull();
    });
  });
});

describe("getSingleBallHallsPdfPath", () => {
  it("returns German PDF path for German locale", () => {
    expect(getSingleBallHallsPdfPath("de")).toBe(
      "/documents/single-ball-halls-de.pdf"
    );
  });

  it("returns French PDF path for French locale", () => {
    expect(getSingleBallHallsPdfPath("fr")).toBe(
      "/documents/single-ball-halls-fr.pdf"
    );
  });

  it("returns German PDF path for English locale (fallback)", () => {
    expect(getSingleBallHallsPdfPath("en")).toBe(
      "/documents/single-ball-halls-de.pdf"
    );
  });

  it("returns German PDF path for Italian locale (fallback)", () => {
    expect(getSingleBallHallsPdfPath("it")).toBe(
      "/documents/single-ball-halls-de.pdf"
    );
  });
});
