/**
 * ImageCropEditor Component
 *
 * Pan/zoom/rotate image editor for cropping scoresheet images to the correct aspect ratio.
 * Uses react-easy-crop for reliable touch gestures and coordinate calculations.
 */

import { useState, useCallback, useMemo } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { X, Check, RotateCcw, RotateCw } from "@/shared/components/icons";
import type { ScoresheetType } from "@/features/ocr/utils/scoresheet-detector";

/** Aspect ratio for electronic scoresheet (4:5 portrait) */
const ELECTRONIC_WIDTH = 4;
const ELECTRONIC_HEIGHT = 5;
const ELECTRONIC_ASPECT_RATIO = ELECTRONIC_WIDTH / ELECTRONIC_HEIGHT;

/** Aspect ratio for manuscript scoresheet (7:5 landscape) */
const MANUSCRIPT_WIDTH = 7;
const MANUSCRIPT_HEIGHT = 5;
const MANUSCRIPT_ASPECT_RATIO = MANUSCRIPT_WIDTH / MANUSCRIPT_HEIGHT;

/** Minimum zoom level */
const MIN_ZOOM = 0.5;

/** Maximum zoom level */
const MAX_ZOOM = 3;

/** Rotation step in degrees */
const ROTATION_STEP = 90;

/** JPEG quality for output */
const JPEG_QUALITY = 0.92;

/** Degrees in half a circle (for radians conversion) */
const DEGREES_PER_HALF_CIRCLE = 180;

interface ImageCropEditorProps {
  /** Image blob to crop */
  imageBlob: Blob;
  /** Type of scoresheet (affects aspect ratio) */
  scoresheetType: ScoresheetType;
  /** Called when user confirms the crop */
  onConfirm: (croppedBlob: Blob) => void;
  /** Called when user cancels */
  onCancel: () => void;
}

/**
 * Creates a cropped image from the source image and crop area.
 * Handles rotation by drawing onto a rotated canvas.
 */
async function getCroppedImage(
  imageSrc: string,
  pixelCrop: Area,
  rotation: number,
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  // Calculate bounding box of the rotated image
  const rotRad = (rotation * Math.PI) / DEGREES_PER_HALF_CIRCLE;
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
      JPEG_QUALITY,
    );
  });
}

/**
 * Creates an Image element from a source URL.
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });
}

/**
 * Calculates the bounding box dimensions of a rotated rectangle.
 */
function getRotatedBoundingBox(
  width: number,
  height: number,
  rotation: number,
): { width: number; height: number } {
  const rotRad = (rotation * Math.PI) / DEGREES_PER_HALF_CIRCLE;
  const sinRot = Math.abs(Math.sin(rotRad));
  const cosRot = Math.abs(Math.cos(rotRad));

  return {
    width: width * cosRot + height * sinRot,
    height: width * sinRot + height * cosRot,
  };
}

/**
 * Image crop editor with pan/zoom/rotate functionality.
 * Shows a fixed-aspect-ratio frame and lets the user position the image within it.
 */
export function ImageCropEditor({
  imageBlob,
  scoresheetType,
  onConfirm,
  onCancel,
}: ImageCropEditorProps) {
  const { t } = useTranslation();

  // Create object URL for the image
  const imageUrl = useMemo(() => URL.createObjectURL(imageBlob), [imageBlob]);

  // Crop state
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const aspectRatio =
    scoresheetType === "electronic"
      ? ELECTRONIC_ASPECT_RATIO
      : MANUSCRIPT_ASPECT_RATIO;

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  const handleRotateLeft = useCallback(() => {
    setRotation((r) => r - ROTATION_STEP);
  }, []);

  const handleRotateRight = useCallback(() => {
    setRotation((r) => r + ROTATION_STEP);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImage(
        imageUrl,
        croppedAreaPixels,
        rotation,
      );
      onConfirm(croppedBlob);
    } catch (error) {
      console.error("Failed to crop image:", error);
      // Still allow user to try again
      setIsProcessing(false);
    }
  }, [croppedAreaPixels, imageUrl, rotation, onConfirm]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
      {/* Cropper viewport */}
      <div className="relative flex-1">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspectRatio}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
          showGrid={true}
          classes={{
            containerClassName: "!absolute !inset-0",
            cropAreaClassName: "!border-2 !border-white/90",
          }}
        />
      </div>

      {/* Hint and rotation controls */}
      <div className="flex-shrink-0 py-2 px-4">
        <div className="flex items-center justify-between">
          {/* Rotate left */}
          <button
            type="button"
            onClick={handleRotateLeft}
            className="p-2 text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            aria-label={t("validation.ocr.rotateLeft")}
          >
            <RotateCcw className="w-6 h-6" aria-hidden="true" />
          </button>

          {/* Hint text */}
          <span className="px-3 py-1 text-sm text-gray-300 bg-white/10 rounded">
            {t("validation.ocr.photoGuide.alignScoresheet")}
          </span>

          {/* Rotate right */}
          <button
            type="button"
            onClick={handleRotateRight}
            className="p-2 text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            aria-label={t("validation.ocr.rotateRight")}
          >
            <RotateCw className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 flex gap-4 p-4 bg-white dark:bg-gray-800">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 flex items-center justify-center gap-2 min-h-12 px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" aria-hidden="true" />
          {t("validation.ocr.cancel")}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isProcessing || !croppedAreaPixels}
          className="flex-1 flex items-center justify-center gap-2 min-h-12 px-4 py-3 text-white bg-primary-500 hover:bg-primary-600 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <Check className="w-5 h-5" aria-hidden="true" />
          {isProcessing ? t("validation.ocr.processing") : t("common.confirm")}
        </button>
      </div>
    </div>
  );
}
