import { describe, it, expect } from "vitest";
import {
  degreesToRadians,
  getRotatedBoundingBox,
  calculateGuideCropArea,
} from "./image-crop";

// Test constants matching the implementation values
const ELECTRONIC_WIDTH_PERCENT = 0.7;
const MANUSCRIPT_WIDTH_PERCENT = 0.9;
const GUIDE_ASPECT_RATIO = 0.8; // 4:5 portrait

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

  describe("calculateGuideCropArea", () => {
    describe("electronic scoresheet (70% width, 4:5 aspect)", () => {
      it("calculates correct crop area when video matches container aspect", () => {
        // Video and container have same 16:9 aspect ratio
        // No object-cover cropping needed
        const videoWidth = 1920;
        const videoHeight = 1080;
        const result = calculateGuideCropArea(
          videoWidth,
          videoHeight,
          videoWidth, // container width (same aspect)
          videoHeight, // container height
          "electronic",
        );

        // Guide is centered in visible area
        const expectedWidth = Math.round(videoWidth * ELECTRONIC_WIDTH_PERCENT);
        const expectedHeight = Math.round(expectedWidth / GUIDE_ASPECT_RATIO);
        const expectedX = Math.round((videoWidth - expectedWidth) / 2);

        expect(result.width).toBe(expectedWidth);
        expect(result.height).toBe(expectedHeight);
        expect(result.x).toBe(expectedX);
      });

      it("calculates correct crop area when video is wider than container", () => {
        // Video is 16:9, container is taller (9:16 portrait)
        // Video width will be cropped by object-cover
        const videoWidth = 1920;
        const videoHeight = 1080;
        const containerWidth = 360;
        const containerHeight = 640;

        const result = calculateGuideCropArea(
          videoWidth,
          videoHeight,
          containerWidth,
          containerHeight,
          "electronic",
        );

        // Calculate expected values
        const containerAspect = containerWidth / containerHeight;
        const visibleWidth = videoHeight * containerAspect;
        const offsetX = (videoWidth - visibleWidth) / 2;
        const guideWidth = visibleWidth * ELECTRONIC_WIDTH_PERCENT;
        const guideHeight = guideWidth / GUIDE_ASPECT_RATIO;
        const guideXInVisible = (visibleWidth - guideWidth) / 2;
        const guideYInVisible = (videoHeight - guideHeight) / 2;

        expect(result.x).toBe(Math.round(offsetX + guideXInVisible));
        expect(result.y).toBe(Math.round(guideYInVisible));
        expect(result.width).toBe(Math.round(guideWidth));
        expect(result.height).toBe(Math.round(guideHeight));
      });

      it("calculates correct crop area when video is taller than container", () => {
        // Video is 9:16 portrait, container is 16:9 landscape
        // Video height will be cropped by object-cover
        const videoWidth = 1080;
        const videoHeight = 1920;
        const containerWidth = 1600;
        const containerHeight = 900;

        const result = calculateGuideCropArea(
          videoWidth,
          videoHeight,
          containerWidth,
          containerHeight,
          "electronic",
        );

        // Calculate expected values
        const containerAspect = containerWidth / containerHeight;
        const visibleHeight = videoWidth / containerAspect;
        const offsetY = (videoHeight - visibleHeight) / 2;
        const guideWidth = videoWidth * ELECTRONIC_WIDTH_PERCENT;
        const guideHeight = guideWidth / GUIDE_ASPECT_RATIO;
        const guideXInVisible = (videoWidth - guideWidth) / 2;
        const guideYInVisible = (visibleHeight - guideHeight) / 2;

        expect(result.x).toBe(Math.round(guideXInVisible));
        expect(result.y).toBe(Math.round(offsetY + guideYInVisible));
        expect(result.width).toBe(Math.round(guideWidth));
        expect(result.height).toBe(Math.round(guideHeight));
      });
    });

    describe("manuscript scoresheet (90% width, 4:5 aspect)", () => {
      it("calculates correct crop area for manuscript type", () => {
        // Same video/container setup but manuscript uses 90% width
        const videoWidth = 1920;
        const videoHeight = 1080;

        const result = calculateGuideCropArea(
          videoWidth,
          videoHeight,
          videoWidth,
          videoHeight,
          "manuscript",
        );

        const expectedWidth = Math.round(videoWidth * MANUSCRIPT_WIDTH_PERCENT);
        const expectedHeight = Math.round(expectedWidth / GUIDE_ASPECT_RATIO);
        const expectedX = Math.round((videoWidth - expectedWidth) / 2);

        expect(result.width).toBe(expectedWidth);
        expect(result.height).toBe(expectedHeight);
        expect(result.x).toBe(expectedX);
      });

      it("uses larger crop area than electronic for same input", () => {
        const electronic = calculateGuideCropArea(
          1920,
          1080,
          800,
          600,
          "electronic",
        );
        const manuscript = calculateGuideCropArea(
          1920,
          1080,
          800,
          600,
          "manuscript",
        );

        // Manuscript uses 90% vs electronic's 70%, so it should be larger
        expect(manuscript.width).toBeGreaterThan(electronic.width);
        expect(manuscript.height).toBeGreaterThan(electronic.height);
      });
    });

    describe("edge cases", () => {
      it("handles square video and container", () => {
        const size = 1000;
        const result = calculateGuideCropArea(
          size,
          size,
          500,
          500,
          "electronic",
        );

        // No object-cover cropping needed (same aspect ratio)
        const expectedWidth = Math.round(size * ELECTRONIC_WIDTH_PERCENT);
        const expectedHeight = Math.round(expectedWidth / GUIDE_ASPECT_RATIO);

        expect(result.width).toBe(expectedWidth);
        expect(result.height).toBe(expectedHeight);
        expect(result.x).toBe(Math.round((size - expectedWidth) / 2));
        expect(result.y).toBe(Math.round((size - expectedHeight) / 2));
      });

      it("returns integer pixel values", () => {
        const result = calculateGuideCropArea(
          1920,
          1080,
          375, // iPhone dimensions often lead to fractional values
          667,
          "electronic",
        );

        expect(Number.isInteger(result.x)).toBe(true);
        expect(Number.isInteger(result.y)).toBe(true);
        expect(Number.isInteger(result.width)).toBe(true);
        expect(Number.isInteger(result.height)).toBe(true);
      });

      it("maintains 4:5 aspect ratio in output", () => {
        const result = calculateGuideCropArea(
          1920,
          1080,
          800,
          600,
          "electronic",
        );

        // Allow small rounding error due to Math.round
        const actualRatio = result.width / result.height;
        expect(actualRatio).toBeCloseTo(GUIDE_ASPECT_RATIO, 1);
      });
    });
  });
});
