import { describe, it, expect } from "vitest";
import { parseOccupation, parseOccupations } from "./parseOccupations";

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
});
