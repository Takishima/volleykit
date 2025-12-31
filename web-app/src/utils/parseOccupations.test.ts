import { describe, it, expect } from "vitest";
import {
  parseOccupation,
  parseOccupations,
  filterRefereeOccupations,
  parseOccupationFromActiveParty,
  parseOccupationsFromActiveParty,
  deriveAssociationCodeFromName,
} from "./parseOccupations";
import type { AttributeValue } from "./active-party-parser";

describe("parseOccupations", () => {
  describe("parseOccupation", () => {
    it("should parse referee role", () => {
      const attr = {
        __identity: "ref-123",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
      };

      const result = parseOccupation(attr);

      expect(result).toEqual({
        id: "ref-123",
        type: "referee",
      });
    });

    it("should filter out player role by default", () => {
      const attr = {
        __identity: "player-123",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Player",
      };

      const result = parseOccupation(attr);

      expect(result).toBeNull();
    });

    it("should filter out clubAdmin role by default", () => {
      const attr = {
        __identity: "club-123",
        roleIdentifier: "Indoorvolleyball.RefAdmin:ClubAdmin",
      };

      const result = parseOccupation(attr);

      expect(result).toBeNull();
    });

    it("should filter out associationAdmin role by default", () => {
      const attr = {
        __identity: "assoc-123",
        roleIdentifier: "Indoorvolleyball.RefAdmin:AssociationAdmin",
      };

      const result = parseOccupation(attr);

      expect(result).toBeNull();
    });

    it("should include player role when refereeOnly is false", () => {
      const attr = {
        __identity: "player-123",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Player",
      };

      const result = parseOccupation(attr, false);

      expect(result).toEqual({
        id: "player-123",
        type: "player",
      });
    });

    it("should return null for missing roleIdentifier", () => {
      const attr = {
        __identity: "ref-123",
      };

      const result = parseOccupation(attr);

      expect(result).toBeNull();
    });

    it("should return null for missing __identity", () => {
      const attr = {
        roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
      };

      const result = parseOccupation(attr);

      expect(result).toBeNull();
    });

    it("should return null for unrecognized role", () => {
      const attr = {
        __identity: "unknown-123",
        roleIdentifier: "Indoorvolleyball.RefAdmin:UnknownRole",
      };

      const result = parseOccupation(attr);

      expect(result).toBeNull();
    });
  });

  describe("parseOccupations", () => {
    it("should parse multiple referee occupations", () => {
      const attrs = [
        {
          __identity: "ref-1",
          roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
        },
        {
          __identity: "ref-2",
          roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
        },
      ];

      const result = parseOccupations(attrs);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: "ref-1", type: "referee" });
      expect(result[1]).toEqual({ id: "ref-2", type: "referee" });
    });

    it("should filter out non-referee roles from mixed list", () => {
      const attrs = [
        {
          __identity: "ref-1",
          roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
        },
        {
          __identity: "player-1",
          roleIdentifier: "Indoorvolleyball.RefAdmin:Player",
        },
        {
          __identity: "club-1",
          roleIdentifier: "Indoorvolleyball.RefAdmin:ClubAdmin",
        },
      ];

      const result = parseOccupations(attrs);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: "ref-1", type: "referee" });
    });

    it("should return empty array for undefined input", () => {
      const result = parseOccupations(undefined);

      expect(result).toEqual([]);
    });

    it("should return empty array for empty array input", () => {
      const result = parseOccupations([]);

      expect(result).toEqual([]);
    });

    it("should include all roles when refereeOnly is false", () => {
      const attrs = [
        {
          __identity: "ref-1",
          roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
        },
        {
          __identity: "player-1",
          roleIdentifier: "Indoorvolleyball.RefAdmin:Player",
        },
      ];

      const result = parseOccupations(attrs, false);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: "ref-1", type: "referee" });
      expect(result[1]).toEqual({ id: "player-1", type: "player" });
    });
  });

  describe("filterRefereeOccupations", () => {
    it("should keep only referee occupations", () => {
      const occupations = [
        { id: "ref-1", type: "referee" as const, associationCode: "SV" },
        { id: "player-1", type: "player" as const, clubName: "VBC Demo" },
        { id: "ref-2", type: "referee" as const, associationCode: "SVRBA" },
      ];

      const result = filterRefereeOccupations(occupations);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: "ref-1", type: "referee", associationCode: "SV" });
      expect(result[1]).toEqual({ id: "ref-2", type: "referee", associationCode: "SVRBA" });
    });

    it("should filter out all non-referee roles", () => {
      const occupations = [
        { id: "ref-1", type: "referee" as const, associationCode: "SV" },
        { id: "player-1", type: "player" as const, clubName: "VBC Demo" },
        { id: "club-1", type: "clubAdmin" as const, clubName: "VBC Admin" },
        { id: "assoc-1", type: "associationAdmin" as const, associationCode: "SV" },
      ];

      const result = filterRefereeOccupations(occupations);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: "ref-1", type: "referee", associationCode: "SV" });
    });

    it("should return empty array when no referee occupations", () => {
      const occupations = [
        { id: "player-1", type: "player" as const, clubName: "VBC Demo" },
      ];

      const result = filterRefereeOccupations(occupations);

      expect(result).toEqual([]);
    });

    it("should return empty array for empty input", () => {
      const result = filterRefereeOccupations([]);

      expect(result).toEqual([]);
    });

    it("should preserve all occupation properties", () => {
      const occupations = [
        { id: "ref-1", type: "referee" as const, associationCode: "SV", clubName: undefined },
      ];

      const result = filterRefereeOccupations(occupations);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: "ref-1", type: "referee", associationCode: "SV", clubName: undefined });
    });
  });

  describe("parseOccupationFromActiveParty", () => {
    it("should parse referee role with association code from inflatedValue", () => {
      const attr: AttributeValue = {
        __identity: "attr-123",
        attributeIdentifier: "memberOfAssociation",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
        type: "SportManager\\Volleyball\\Domain\\Model\\AbstractAssociation",
        value: "assoc-uuid-123",
        inflatedValue: {
          __identity: "assoc-uuid-123",
          name: "Schiedsrichterverband Zentralschweiz",
          shortName: "SVRZ",
          identifier: "912000",
          originId: 12,
        },
      };

      const result = parseOccupationFromActiveParty(attr);

      expect(result).toEqual({
        id: "attr-123",
        type: "referee",
        associationCode: "SVRZ",
      });
    });

    it("should parse referee role without inflatedValue", () => {
      const attr: AttributeValue = {
        __identity: "attr-123",
        attributeIdentifier: "memberOfAssociation",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
      };

      const result = parseOccupationFromActiveParty(attr);

      expect(result).toEqual({
        id: "attr-123",
        type: "referee",
        associationCode: undefined,
      });
    });

    it("should filter out player role", () => {
      const attr: AttributeValue = {
        __identity: "attr-123",
        attributeIdentifier: "isPlayer",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Player",
        type: "boolean",
      };

      const result = parseOccupationFromActiveParty(attr);

      expect(result).toBeNull();
    });

    it("should return null for missing roleIdentifier", () => {
      const attr = {
        __identity: "attr-123",
        attributeIdentifier: "memberOfAssociation",
      } as AttributeValue;

      const result = parseOccupationFromActiveParty(attr);

      expect(result).toBeNull();
    });

    it("should return null for missing __identity", () => {
      const attr = {
        attributeIdentifier: "memberOfAssociation",
        roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
      } as AttributeValue;

      const result = parseOccupationFromActiveParty(attr);

      expect(result).toBeNull();
    });
  });

  describe("parseOccupationsFromActiveParty", () => {
    it("should parse multiple referee occupations with association codes", () => {
      const attrs: AttributeValue[] = [
        {
          __identity: "attr-1",
          attributeIdentifier: "memberOfAssociation",
          roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
          inflatedValue: {
            __identity: "assoc-1",
            shortName: "SVRZ",
          },
        },
        {
          __identity: "attr-2",
          attributeIdentifier: "memberOfAssociation",
          roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
          inflatedValue: {
            __identity: "assoc-2",
            shortName: "SV",
          },
        },
      ];

      const result = parseOccupationsFromActiveParty(attrs);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: "attr-1", type: "referee", associationCode: "SVRZ" });
      expect(result[1]).toEqual({ id: "attr-2", type: "referee", associationCode: "SV" });
    });

    it("should filter out non-referee roles", () => {
      const attrs: AttributeValue[] = [
        {
          __identity: "attr-1",
          attributeIdentifier: "memberOfAssociation",
          roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
          inflatedValue: { __identity: "assoc-1", shortName: "SV" },
        },
        {
          __identity: "attr-2",
          attributeIdentifier: "isPlayer",
          roleIdentifier: "Indoorvolleyball.RefAdmin:Player",
          type: "boolean",
        },
      ];

      const result = parseOccupationsFromActiveParty(attrs);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: "attr-1", type: "referee", associationCode: "SV" });
    });

    it("should return empty array for null input", () => {
      const result = parseOccupationsFromActiveParty(null);

      expect(result).toEqual([]);
    });

    it("should return empty array for undefined input", () => {
      const result = parseOccupationsFromActiveParty(undefined);

      expect(result).toEqual([]);
    });

    it("should return empty array for empty array input", () => {
      const result = parseOccupationsFromActiveParty([]);

      expect(result).toEqual([]);
    });

    it("should derive association code from name when shortName is missing", () => {
      const attrs: AttributeValue[] = [
        {
          __identity: "attr-1",
          attributeIdentifier: "memberOfAssociation",
          roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
          inflatedValue: {
            __identity: "assoc-1",
            name: "Swiss Volley Région Zurich",
            // shortName is missing
          },
        },
      ];

      const result = parseOccupationsFromActiveParty(attrs);

      expect(result).toHaveLength(1);
      expect(result[0]?.associationCode).toBe("SVRZ");
    });

    it("should prefer shortName over derived name", () => {
      const attrs: AttributeValue[] = [
        {
          __identity: "attr-1",
          attributeIdentifier: "memberOfAssociation",
          roleIdentifier: "Indoorvolleyball.RefAdmin:Referee",
          inflatedValue: {
            __identity: "assoc-1",
            name: "Swiss Volley Région Zurich",
            shortName: "CUSTOM",
          },
        },
      ];

      const result = parseOccupationsFromActiveParty(attrs);

      expect(result).toHaveLength(1);
      expect(result[0]?.associationCode).toBe("CUSTOM");
    });
  });

  describe("deriveAssociationCodeFromName", () => {
    it("should extract initials from Swiss Volley", () => {
      expect(deriveAssociationCodeFromName("Swiss Volley")).toBe("SV");
    });

    it("should extract initials from Swiss Volley Région Zurich", () => {
      expect(deriveAssociationCodeFromName("Swiss Volley Région Zurich")).toBe("SVRZ");
    });

    it("should exclude common prepositions", () => {
      expect(deriveAssociationCodeFromName("Association Vaudoise de Volleyball")).toBe("AVV");
    });

    it("should exclude French articles", () => {
      expect(deriveAssociationCodeFromName("Fédération de la Région")).toBe("FR");
    });

    it("should exclude German articles", () => {
      expect(deriveAssociationCodeFromName("Verband und Region")).toBe("VR");
    });

    it("should return undefined for empty string", () => {
      expect(deriveAssociationCodeFromName("")).toBeUndefined();
    });

    it("should return undefined for undefined input", () => {
      expect(deriveAssociationCodeFromName(undefined)).toBeUndefined();
    });

    it("should return undefined if all words are excluded", () => {
      expect(deriveAssociationCodeFromName("de la le")).toBeUndefined();
    });

    it("should handle single word", () => {
      expect(deriveAssociationCodeFromName("Volleyball")).toBe("V");
    });
  });
});
