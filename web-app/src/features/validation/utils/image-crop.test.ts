import { describe, it, expect } from "vitest";
import {
  degreesToRadians,
  getRotatedBoundingBox,
} from "./image-crop";

describe("image-crop utilities", () => {
  describe("degreesToRadians", () => {
    it("converts 0 degrees to 0 radians", () => {
      expect(degreesToRadians(0)).toBe(0);
    });

    it("converts 90 degrees to π/2 radians", () => {
      expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2);
    });

    it("converts 180 degrees to π radians", () => {
      expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
    });

    it("converts 360 degrees to 2π radians", () => {
      expect(degreesToRadians(360)).toBeCloseTo(2 * Math.PI);
    });

    it("converts negative degrees correctly", () => {
      expect(degreesToRadians(-90)).toBeCloseTo(-Math.PI / 2);
    });

    it("converts 45 degrees to π/4 radians", () => {
      expect(degreesToRadians(45)).toBeCloseTo(Math.PI / 4);
    });
  });

  describe("getRotatedBoundingBox", () => {
    it("returns same dimensions for 0 degree rotation", () => {
      const result = getRotatedBoundingBox(100, 50, 0);
      expect(result.width).toBeCloseTo(100);
      expect(result.height).toBeCloseTo(50);
    });

    it("returns same dimensions for 360 degree rotation", () => {
      const result = getRotatedBoundingBox(100, 50, 360);
      expect(result.width).toBeCloseTo(100);
      expect(result.height).toBeCloseTo(50);
    });

    it("swaps dimensions for 90 degree rotation", () => {
      const result = getRotatedBoundingBox(100, 50, 90);
      expect(result.width).toBeCloseTo(50);
      expect(result.height).toBeCloseTo(100);
    });

    it("swaps dimensions for -90 degree rotation", () => {
      const result = getRotatedBoundingBox(100, 50, -90);
      expect(result.width).toBeCloseTo(50);
      expect(result.height).toBeCloseTo(100);
    });

    it("swaps dimensions for 270 degree rotation", () => {
      const result = getRotatedBoundingBox(100, 50, 270);
      expect(result.width).toBeCloseTo(50);
      expect(result.height).toBeCloseTo(100);
    });

    it("returns same dimensions for 180 degree rotation", () => {
      const result = getRotatedBoundingBox(100, 50, 180);
      expect(result.width).toBeCloseTo(100);
      expect(result.height).toBeCloseTo(50);
    });

    it("calculates larger bounding box for 45 degree rotation", () => {
      // For 45 degrees, bounding box should be larger than both dimensions
      const result = getRotatedBoundingBox(100, 100, 45);
      // For a 100x100 square rotated 45°, the bounding box is ~141.4 x 141.4
      const expected = 100 * Math.sqrt(2);
      expect(result.width).toBeCloseTo(expected);
      expect(result.height).toBeCloseTo(expected);
    });

    it("handles non-square rectangles at 45 degrees", () => {
      const result = getRotatedBoundingBox(100, 50, 45);
      // At 45°: sin(45) = cos(45) ≈ 0.707
      // width = 100 * 0.707 + 50 * 0.707 ≈ 106.1
      // height = 100 * 0.707 + 50 * 0.707 ≈ 106.1
      const sin45 = Math.sin(Math.PI / 4);
      const expectedWidth = 100 * sin45 + 50 * sin45;
      const expectedHeight = 100 * sin45 + 50 * sin45;
      expect(result.width).toBeCloseTo(expectedWidth);
      expect(result.height).toBeCloseTo(expectedHeight);
    });

    it("handles zero width", () => {
      const result = getRotatedBoundingBox(0, 100, 45);
      expect(result.width).toBeCloseTo(100 * Math.sin(Math.PI / 4));
      expect(result.height).toBeCloseTo(100 * Math.cos(Math.PI / 4));
    });

    it("handles zero height", () => {
      const result = getRotatedBoundingBox(100, 0, 45);
      expect(result.width).toBeCloseTo(100 * Math.cos(Math.PI / 4));
      expect(result.height).toBeCloseTo(100 * Math.sin(Math.PI / 4));
    });

    it("handles large rotation values (720 degrees)", () => {
      // 720 degrees = 2 full rotations = 0 degrees effective
      const result = getRotatedBoundingBox(100, 50, 720);
      expect(result.width).toBeCloseTo(100);
      expect(result.height).toBeCloseTo(50);
    });
  });
});
