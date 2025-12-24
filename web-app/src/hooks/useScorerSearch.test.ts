import { describe, it, expect } from "vitest";
import { parseSearchInput } from "./useScorerSearch";

describe("parseSearchInput", () => {
  describe("empty and whitespace input", () => {
    it("returns empty object for empty string", () => {
      expect(parseSearchInput("")).toEqual({});
    });

    it("returns empty object for whitespace-only input", () => {
      expect(parseSearchInput("   ")).toEqual({});
      expect(parseSearchInput("\t\n")).toEqual({});
    });
  });

  describe("single name token", () => {
    it("treats single word as lastName", () => {
      expect(parseSearchInput("müller")).toEqual({ lastName: "müller" });
    });

    it("handles single word with leading/trailing spaces", () => {
      expect(parseSearchInput("  müller  ")).toEqual({ lastName: "müller" });
    });
  });

  describe("two name tokens", () => {
    it("treats first word as firstName and second as lastName", () => {
      expect(parseSearchInput("hans müller")).toEqual({
        firstName: "hans",
        lastName: "müller",
      });
    });

    it("handles extra whitespace between tokens", () => {
      expect(parseSearchInput("hans   müller")).toEqual({
        firstName: "hans",
        lastName: "müller",
      });
    });
  });

  describe("three or more name tokens", () => {
    it("joins remaining tokens as lastName", () => {
      expect(parseSearchInput("hans von müller")).toEqual({
        firstName: "hans",
        lastName: "von müller",
      });
    });

    it("handles multiple lastName parts", () => {
      expect(parseSearchInput("maria de la cruz")).toEqual({
        firstName: "maria",
        lastName: "de la cruz",
      });
    });
  });

  describe("year of birth extraction", () => {
    it("extracts 4-digit year from end with single name", () => {
      expect(parseSearchInput("müller 1985")).toEqual({
        lastName: "müller",
        yearOfBirth: "1985",
      });
    });

    it("extracts year from end with two names", () => {
      expect(parseSearchInput("hans müller 1985")).toEqual({
        firstName: "hans",
        lastName: "müller",
        yearOfBirth: "1985",
      });
    });

    it("extracts year from end with multiple name parts", () => {
      expect(parseSearchInput("maria de la cruz 1990")).toEqual({
        firstName: "maria",
        lastName: "de la cruz",
        yearOfBirth: "1990",
      });
    });

    it("only extracts year if it is exactly 4 digits", () => {
      // 3 digits - should be treated as lastName
      expect(parseSearchInput("müller 198")).toEqual({
        firstName: "müller",
        lastName: "198",
      });

      // 5 digits - should be treated as lastName
      expect(parseSearchInput("müller 19850")).toEqual({
        firstName: "müller",
        lastName: "19850",
      });
    });

    it("only extracts year from the end position", () => {
      // Year in middle should be part of lastName
      expect(parseSearchInput("1985 müller")).toEqual({
        firstName: "1985",
        lastName: "müller",
      });
    });

    it("returns only yearOfBirth when input is just a year", () => {
      expect(parseSearchInput("1985")).toEqual({
        yearOfBirth: "1985",
      });
    });
  });

  describe("special characters and Unicode", () => {
    it("preserves accented characters", () => {
      expect(parseSearchInput("josé garcía")).toEqual({
        firstName: "josé",
        lastName: "garcía",
      });
    });

    it("preserves umlauts", () => {
      expect(parseSearchInput("björn müller")).toEqual({
        firstName: "björn",
        lastName: "müller",
      });
    });

    it("handles hyphenated names", () => {
      expect(parseSearchInput("marie-claire")).toEqual({
        lastName: "marie-claire",
      });

      expect(parseSearchInput("jean-pierre dupont")).toEqual({
        firstName: "jean-pierre",
        lastName: "dupont",
      });
    });
  });
});
