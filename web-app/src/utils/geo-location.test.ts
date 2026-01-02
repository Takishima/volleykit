import { describe, expect, it } from "vitest";
import { extractCoordinates } from "./geo-location";

describe("extractCoordinates", () => {
  describe("with direct coordinates", () => {
    it("returns coordinates when both latitude and longitude are present", () => {
      const result = extractCoordinates({
        latitude: 47.3769,
        longitude: 8.5417,
      });

      expect(result).toEqual({
        latitude: 47.3769,
        longitude: 8.5417,
      });
    });

    it("prioritizes direct coordinates over plus code", () => {
      const result = extractCoordinates({
        latitude: 47.3769,
        longitude: 8.5417,
        plusCode: "8FV9HMQ5+F5", // Would decode to different coordinates
      });

      expect(result).toEqual({
        latitude: 47.3769,
        longitude: 8.5417,
      });
    });

    it("handles zero coordinates correctly", () => {
      const result = extractCoordinates({
        latitude: 0,
        longitude: 0,
      });

      expect(result).toEqual({
        latitude: 0,
        longitude: 0,
      });
    });
  });

  describe("with plus code fallback", () => {
    it("decodes plus code when lat/lon are missing", () => {
      // Plus code for Riehen, Switzerland: 8FV9HMQ5+F5
      const result = extractCoordinates({
        plusCode: "8FV9HMQ5+F5",
      });

      expect(result).not.toBeNull();
      // Verify coordinates are in the expected area (Riehen is near Basel)
      expect(result?.latitude).toBeCloseTo(47.571, 1);
      expect(result?.longitude).toBeCloseTo(7.664, 1);
    });

    it("decodes plus code when latitude is missing", () => {
      const result = extractCoordinates({
        longitude: 8.5417,
        plusCode: "8FV9HMQ5+F5",
      });

      // Should use plus code since lat is missing
      expect(result?.latitude).toBeCloseTo(47.571, 1);
    });

    it("decodes plus code when longitude is missing", () => {
      const result = extractCoordinates({
        latitude: 47.3769,
        plusCode: "8FV9HMQ5+F5",
      });

      // Should use plus code since lon is missing
      expect(result?.longitude).toBeCloseTo(7.664, 1);
    });

    it("returns null for invalid plus code", () => {
      const result = extractCoordinates({
        plusCode: "invalid-code",
      });

      expect(result).toBeNull();
    });
  });

  describe("with no location data", () => {
    it("returns null for null input", () => {
      expect(extractCoordinates(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(extractCoordinates(undefined)).toBeNull();
    });

    it("returns null for empty object", () => {
      expect(extractCoordinates({})).toBeNull();
    });

    it("returns null when only identity is present", () => {
      const result = extractCoordinates({
        // No lat, lon, or plusCode
      } as { latitude?: number; longitude?: number; plusCode?: string });

      expect(result).toBeNull();
    });
  });

  describe("real-world API examples", () => {
    it("handles Turnhalle Hinter Gärten (Riehen) from API", () => {
      // Real example from the API where only plusCode is available
      const result = extractCoordinates({
        plusCode: "8FV9HMQ5+F5",
      });

      expect(result).not.toBeNull();
      // Verify we get reasonable Swiss coordinates
      expect(result?.latitude).toBeGreaterThan(45);
      expect(result?.latitude).toBeLessThan(48);
      expect(result?.longitude).toBeGreaterThan(5);
      expect(result?.longitude).toBeLessThan(11);
    });

    it("handles hall with full coordinates from API", () => {
      // Example with both lat/lon and plusCode
      const result = extractCoordinates({
        latitude: 47.462187,
        longitude: 8.577813,
        plusCode: "8FVCFH6H+V4",
      });

      // Should use direct coordinates
      expect(result).toEqual({
        latitude: 47.462187,
        longitude: 8.577813,
      });
    });
  });
});
