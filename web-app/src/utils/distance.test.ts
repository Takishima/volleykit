import { describe, it, expect } from "vitest";
import {
  METRES_PER_KILOMETRE,
  DISTANCE_DISPLAY_PRECISION,
  metresToKilometres,
  kilometresToMetres,
  formatDistanceKm,
} from "./distance";

describe("distance utilities", () => {
  describe("constants", () => {
    it("METRES_PER_KILOMETRE is 1000", () => {
      expect(METRES_PER_KILOMETRE).toBe(1000);
    });

    it("DISTANCE_DISPLAY_PRECISION is 1", () => {
      expect(DISTANCE_DISPLAY_PRECISION).toBe(1);
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
});
