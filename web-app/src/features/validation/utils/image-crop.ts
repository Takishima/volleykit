/**
 * Image cropping utilities for the scoresheet OCR feature.
 * Handles rotation, cropping, and canvas operations.
 */

/** Degrees in half a circle (for radians conversion) */
const DEGREES_PER_HALF_CIRCLE = 180;

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
