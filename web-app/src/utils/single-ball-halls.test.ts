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
  // Note: In Vitest, import.meta.env.BASE_URL defaults to "/"
  // The function prepends BASE_URL to ensure correct paths on GitHub Pages

  it("prepends BASE_URL to German PDF path", () => {
    const path = getSingleBallHallsPdfPath("de");
    // With default BASE_URL="/", result is "/documents/..."
    expect(path).toBe("/documents/single-ball-halls-de.pdf");
    // Verify it starts with BASE_URL (which is "/" in tests)
    expect(path.startsWith(import.meta.env.BASE_URL)).toBe(true);
  });

  it("prepends BASE_URL to French PDF path", () => {
    const path = getSingleBallHallsPdfPath("fr");
    expect(path).toBe("/documents/single-ball-halls-fr.pdf");
    expect(path.startsWith(import.meta.env.BASE_URL)).toBe(true);
  });

  it("uses German PDF for English locale (fallback)", () => {
    const path = getSingleBallHallsPdfPath("en");
    expect(path).toBe("/documents/single-ball-halls-de.pdf");
    expect(path).toContain("single-ball-halls-de.pdf");
  });

  it("uses German PDF for Italian locale (fallback)", () => {
    const path = getSingleBallHallsPdfPath("it");
    expect(path).toBe("/documents/single-ball-halls-de.pdf");
    expect(path).toContain("single-ball-halls-de.pdf");
  });

  it("constructs path correctly with BASE_URL", () => {
    // This test documents the expected behavior:
    // With BASE_URL="/volleykit/", the path should be "/volleykit/documents/..."
    // In tests, BASE_URL is "/", so we verify the construction logic
    const baseUrl = import.meta.env.BASE_URL;
    const path = getSingleBallHallsPdfPath("fr");

    // Path should start with BASE_URL
    expect(path.startsWith(baseUrl)).toBe(true);
    // Path should not have double slashes (except in protocol)
    expect(path).not.toMatch(/(?<!:)\/\//);
    // Path should end with the correct PDF filename
    expect(path.endsWith("single-ball-halls-fr.pdf")).toBe(true);
  });
});
