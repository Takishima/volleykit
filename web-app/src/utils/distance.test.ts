import { describe, it, expect } from "vitest";
import {
  METRES_PER_KILOMETRE,
  DISTANCE_DISPLAY_PRECISION,
  DECIMAL_INPUT_PATTERN,
  metresToKilometres,
  kilometresToMetres,
  formatDistanceKm,
  parseLocalizedNumber,
} from "./distance";

describe("distance utilities", () => {
  describe("constants", () => {
    it("METRES_PER_KILOMETRE is 1000", () => {
      expect(METRES_PER_KILOMETRE).toBe(1000);
    });

    it("DISTANCE_DISPLAY_PRECISION is 1", () => {
      expect(DISTANCE_DISPLAY_PRECISION).toBe(1);
    });

    it("DECIMAL_INPUT_PATTERN accepts period or comma as decimal separator", () => {
      expect(DECIMAL_INPUT_PATTERN).toBe("[0-9]*[.,]?[0-9]*");
    });
  });

  describe("metresToKilometres", () => {
    it("converts metres to kilometres", () => {
      expect(metresToKilometres(1000)).toBe(1);
      expect(metresToKilometres(48000)).toBe(48);
      expect(metresToKilometres(500)).toBe(0.5);
    });

    it("handles zero", () => {
      expect(metresToKilometres(0)).toBe(0);
    });

    it("handles decimal values", () => {
      expect(metresToKilometres(1500)).toBe(1.5);
      expect(metresToKilometres(48317)).toBe(48.317);
    });
  });

  describe("kilometresToMetres", () => {
    it("converts kilometres to metres", () => {
      expect(kilometresToMetres(1)).toBe(1000);
      expect(kilometresToMetres(48)).toBe(48000);
      expect(kilometresToMetres(0.5)).toBe(500);
    });

    it("handles zero", () => {
      expect(kilometresToMetres(0)).toBe(0);
    });

    it("handles decimal values", () => {
      expect(kilometresToMetres(1.5)).toBe(1500);
      expect(kilometresToMetres(48.3)).toBe(48300);
    });
  });

  describe("formatDistanceKm", () => {
    it("formats distance with one decimal place", () => {
      expect(formatDistanceKm(48000)).toBe("48.0");
      expect(formatDistanceKm(48500)).toBe("48.5");
      expect(formatDistanceKm(48317)).toBe("48.3");
    });

    it("rounds to one decimal place", () => {
      expect(formatDistanceKm(48350)).toBe("48.4"); // rounds up
      expect(formatDistanceKm(48340)).toBe("48.3"); // rounds down
    });

    it("handles zero", () => {
      expect(formatDistanceKm(0)).toBe("0.0");
    });

    it("handles small distances", () => {
      expect(formatDistanceKm(100)).toBe("0.1");
      expect(formatDistanceKm(50)).toBe("0.1"); // rounds up
    });
  });

  describe("parseLocalizedNumber", () => {
    it("parses numbers with period as decimal separator", () => {
      expect(parseLocalizedNumber("48.5")).toBe(48.5);
      expect(parseLocalizedNumber("1.0")).toBe(1);
      expect(parseLocalizedNumber("123.456")).toBe(123.456);
    });

    it("parses numbers with comma as decimal separator", () => {
      expect(parseLocalizedNumber("48,5")).toBe(48.5);
      expect(parseLocalizedNumber("1,0")).toBe(1);
      expect(parseLocalizedNumber("123,456")).toBe(123.456);
    });

    it("parses integers without decimal separator", () => {
      expect(parseLocalizedNumber("48")).toBe(48);
      expect(parseLocalizedNumber("0")).toBe(0);
      expect(parseLocalizedNumber("123")).toBe(123);
    });

    it("returns NaN for invalid input", () => {
      expect(parseLocalizedNumber("")).toBeNaN();
      expect(parseLocalizedNumber("abc")).toBeNaN();
    });

    it("parseFloat stops at invalid characters", () => {
      // parseFloat stops at the second period, returning 12.34
      expect(parseLocalizedNumber("12.34.56")).toBe(12.34);
    });
  });
});
