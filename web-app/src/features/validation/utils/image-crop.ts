/**
 * Image cropping utilities for the scoresheet OCR feature.
 * Handles rotation, cropping, and canvas operations.
 */

import type { ScoresheetType } from "@/features/ocr/utils/scoresheet-detector";

/** Degrees in half a circle (for radians conversion) */
const DEGREES_PER_HALF_CIRCLE = 180;

/** Guide width percentage for electronic scoresheets (70%) */
const ELECTRONIC_GUIDE_WIDTH_PERCENT = 0.7;

/** Guide width percentage for manuscript scoresheets (90%) */
const MANUSCRIPT_GUIDE_WIDTH_PERCENT = 0.9;

/** Guide aspect ratio (4:5 portrait) */
const GUIDE_ASPECT_RATIO = 0.8;

/**
 * Guide overlay dimensions for different scoresheet types.
 * These must match the values in ScoresheetGuide.tsx
 */
const GUIDE_CONFIG = {
  /** Electronic scoresheet: tighter focus on player list */
  electronic: {
    widthPercent: ELECTRONIC_GUIDE_WIDTH_PERCENT,
    aspectRatio: GUIDE_ASPECT_RATIO,
  },
  /** Manuscript scoresheet: broader roster capture */
  manuscript: {
    widthPercent: MANUSCRIPT_GUIDE_WIDTH_PERCENT,
    aspectRatio: GUIDE_ASPECT_RATIO,
  },
} as const;

/** Default JPEG quality for output */
const DEFAULT_JPEG_QUALITY = 0.92;

/**
 * Represents a crop area with position and dimensions.
 */
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculates the crop area corresponding to the guide overlay.
 *
 * When capturing video with CSS `object-cover`, the video is scaled to cover
 * the container while maintaining aspect ratio. This function calculates
 * which portion of the native video corresponds to the guide overlay area.
 *
 * @param videoWidth - Native video width in pixels
 * @param videoHeight - Native video height in pixels
 * @param containerWidth - Displayed container width in pixels
 * @param containerHeight - Displayed container height in pixels
 * @param scoresheetType - Type of scoresheet (affects guide dimensions)
 * @returns Crop area in native video coordinates
 */
export function calculateGuideCropArea(
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number,
  scoresheetType: ScoresheetType,
): CropArea {
  const config = GUIDE_CONFIG[scoresheetType];

  // Calculate object-cover scaling
  // object-cover scales to cover the entire container while maintaining aspect ratio
  const videoAspect = videoWidth / videoHeight;
  const containerAspect = containerWidth / containerHeight;

  let visibleWidth: number;
  let visibleHeight: number;
  let offsetX: number;
  let offsetY: number;

  if (videoAspect > containerAspect) {
    // Video is wider than container - height fits fully, width is cropped
    visibleHeight = videoHeight;
    visibleWidth = videoHeight * containerAspect;
    offsetX = (videoWidth - visibleWidth) / 2;
    offsetY = 0;
  } else {
    // Video is taller than container - width fits fully, height is cropped
    visibleWidth = videoWidth;
    visibleHeight = videoWidth / containerAspect;
    offsetX = 0;
    offsetY = (videoHeight - visibleHeight) / 2;
  }

  // Calculate guide rectangle in visible area coordinates
  // Guide is centered horizontally and vertically in the visible area
  const guideWidthInVisible = visibleWidth * config.widthPercent;
  const guideHeightInVisible = guideWidthInVisible / config.aspectRatio;

  // Guide is centered in the visible area
  const guideXInVisible = (visibleWidth - guideWidthInVisible) / 2;
  const guideYInVisible = (visibleHeight - guideHeightInVisible) / 2;

  // Convert to native video coordinates by adding the offset
  return {
    x: Math.round(offsetX + guideXInVisible),
    y: Math.round(offsetY + guideYInVisible),
    width: Math.round(guideWidthInVisible),
    height: Math.round(guideHeightInVisible),
  };
}

/**
 * Crops a canvas to the specified area.
 *
 * @param sourceCanvas - Source canvas to crop from
 * @param cropArea - Area to crop in source canvas coordinates
 * @param quality - JPEG quality (0-1), defaults to 0.92
 * @returns Promise resolving to the cropped image as a Blob
 */
export function cropCanvasToArea(
  sourceCanvas: HTMLCanvasElement,
  cropArea: CropArea,
  quality: number = DEFAULT_JPEG_QUALITY,
): Promise<Blob> {
  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = cropArea.width;
  croppedCanvas.height = cropArea.height;

  const ctx = croppedCanvas.getContext("2d");
  if (!ctx) {
    return Promise.reject(new Error("Could not get canvas context"));
  }

  ctx.drawImage(
    sourceCanvas,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    cropArea.width,
    cropArea.height,
  );

  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob from canvas"));
        }
      },
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Converts degrees to radians.
 */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / DEGREES_PER_HALF_CIRCLE;
}

/**
 * Calculates the bounding box dimensions of a rotated rectangle.
 * When a rectangle is rotated, it needs a larger bounding box to contain it.
 *
 * @param width - Original width of the rectangle
 * @param height - Original height of the rectangle
 * @param rotation - Rotation angle in degrees
 * @returns The width and height of the bounding box
 */
export function getRotatedBoundingBox(
  width: number,
  height: number,
  rotation: number,
): { width: number; height: number } {
  const rotRad = degreesToRadians(rotation);
  const sinRot = Math.abs(Math.sin(rotRad));
  const cosRot = Math.abs(Math.cos(rotRad));

  return {
    width: width * cosRot + height * sinRot,
    height: width * sinRot + height * cosRot,
  };
}

/**
 * Creates an Image element from a source URL.
 * Returns a promise that resolves when the image is loaded.
 *
 * @param url - The image URL (can be a blob URL or regular URL)
 * @returns Promise resolving to the loaded HTMLImageElement
 */
export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });
}

/**
 * Creates a cropped image from the source image and crop area.
 * Handles rotation by first drawing the rotated image onto a canvas,
 * then extracting the crop area from that canvas.
 *
 * @param imageSrc - Source image URL
 * @param pixelCrop - Crop area in pixels (relative to rotated image)
 * @param rotation - Rotation angle in degrees
 * @param quality - JPEG quality (0-1), defaults to 0.92
 * @returns Promise resolving to the cropped image as a Blob
 */
export async function getCroppedImage(
  imageSrc: string,
  pixelCrop: CropArea,
  rotation: number,
  quality: number = DEFAULT_JPEG_QUALITY,
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  // Calculate bounding box of the rotated image
  const rotRad = degreesToRadians(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = getRotatedBoundingBox(
    image.width,
    image.height,
    rotation,
  );

  // Set canvas size to the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // Translate to center, rotate, then translate back
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);

  // Draw the rotated image
  ctx.drawImage(image, 0, 0);

  // Extract the cropped area
  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d");

  if (!croppedCtx) {
    throw new Error("Could not get cropped canvas context");
  }

  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob from canvas"));
        }
      },
      "image/jpeg",
      quality,
    );
  });
}
