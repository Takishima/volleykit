/**
 * ImageCropEditor Component
 *
 * Pan/zoom image editor for cropping scoresheet images to the correct aspect ratio.
 * The user can drag and pinch-zoom the image to position it within a fixed-aspect-ratio frame.
 *
 * Based on the OCR POC ImageEditor pattern with React implementation.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { X, Check } from "@/shared/components/icons";
import type { ScoresheetType } from "@/features/ocr/utils/scoresheet-detector";

/** Aspect ratio for electronic scoresheet (4:5 portrait) */
const ELECTRONIC_WIDTH = 4;
const ELECTRONIC_HEIGHT = 5;
const ELECTRONIC_ASPECT_RATIO = ELECTRONIC_WIDTH / ELECTRONIC_HEIGHT;

/** Aspect ratio for manuscript scoresheet (7:5 landscape) */
const MANUSCRIPT_WIDTH = 7;
const MANUSCRIPT_HEIGHT = 5;
const MANUSCRIPT_ASPECT_RATIO = MANUSCRIPT_WIDTH / MANUSCRIPT_HEIGHT;

/** Frame padding from viewport edge */
const FRAME_PADDING_PX = 24;

/** Frame height as ratio of available space */
const FRAME_HEIGHT_RATIO = 0.7;

/** Frame width as ratio of available space */
const FRAME_WIDTH_RATIO = 0.85;

/** Minimum zoom level */
const MIN_ZOOM = 0.1;

/** Maximum zoom level */
const MAX_ZOOM = 3;

/** Zoom out multiplier for wheel scroll */
const ZOOM_OUT_DELTA = 0.9;

/** Zoom in multiplier for wheel scroll */
const ZOOM_IN_DELTA = 1.1;

/** JPEG quality for output */
const JPEG_QUALITY = 0.92;

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

interface Position {
  x: number;
  y: number;
}

/**
 * Image crop editor with pan/zoom functionality.
 * Shows a fixed-aspect-ratio frame and lets the user position the image within it.
 */
export function ImageCropEditor({
  imageBlob,
  scoresheetType,
  onConfirm,
  onCancel,
}: ImageCropEditorProps) {
  const { t } = useTranslation();
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Image state - use useMemo for URL to avoid setState in effect
  const imageUrl = useMemo(() => URL.createObjectURL(imageBlob), [imageBlob]);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // Cleanup object URL on unmount or when imageBlob changes
  useEffect(() => {
    return () => URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  // Interaction state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<Position>({ x: 0, y: 0 });
  const positionStartRef = useRef<Position>({ x: 0, y: 0 });

  // Pinch zoom state
  const pinchStartDistanceRef = useRef<number>(0);
  const pinchStartZoomRef = useRef<number>(1);

  // Frame dimensions
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });

  const aspectRatio =
    scoresheetType === "electronic"
      ? ELECTRONIC_ASPECT_RATIO
      : MANUSCRIPT_ASPECT_RATIO;

  // Compute initial zoom based on image and frame sizes
  const initialZoom = useMemo(() => {
    if (imageSize.width === 0 || frameSize.width === 0) return 1;
    const scaleX = frameSize.width / imageSize.width;
    const scaleY = frameSize.height / imageSize.height;
    const computed = Math.max(scaleX, scaleY);
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, computed));
  }, [imageSize, frameSize]);

  // Transform state - initialize with computed values
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // Track if we've initialized zoom for the current image
  const initializedRef = useRef(false);

  // Load image dimensions and reset initialization flag when image changes
  useEffect(() => {
    initializedRef.current = false;

    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Calculate frame size based on viewport
  useEffect(() => {
    const updateFrameSize = () => {
      if (!viewportRef.current) return;

      const viewport = viewportRef.current.getBoundingClientRect();
      const availableWidth = viewport.width - FRAME_PADDING_PX * 2;
      const availableHeight = viewport.height - FRAME_PADDING_PX * 2;

      let frameWidth: number;
      let frameHeight: number;

      if (availableWidth / availableHeight > aspectRatio) {
        // Viewport is wider - constrain by height
        frameHeight = availableHeight * FRAME_HEIGHT_RATIO;
        frameWidth = frameHeight * aspectRatio;
      } else {
        // Viewport is taller - constrain by width
        frameWidth = availableWidth * FRAME_WIDTH_RATIO;
        frameHeight = frameWidth / aspectRatio;
      }

      setFrameSize({ width: frameWidth, height: frameHeight });
    };

    updateFrameSize();
    window.addEventListener("resize", updateFrameSize);
    return () => window.removeEventListener("resize", updateFrameSize);
  }, [aspectRatio]);

  // Initialize zoom when image loads (only once per image)
  // This is intentional one-time initialization guarded by ref, not cascading renders
  useEffect(() => {
    if (imageSize.width > 0 && frameSize.width > 0 && !initializedRef.current) {
      initializedRef.current = true;
      setZoom(initialZoom); // eslint-disable-line react-hooks/set-state-in-effect
      setPosition({ x: 0, y: 0 });
    }
  }, [imageSize, frameSize, initialZoom]);

  // Mouse/touch handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      positionStartRef.current = position;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [position],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;

      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      setPosition({
        x: positionStartRef.current.x + dx,
        y: positionStartRef.current.y + dy,
      });
    },
    [isDragging],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? ZOOM_OUT_DELTA : ZOOM_IN_DELTA;
    setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * delta)));
  }, []);

  // Calculate distance between two touch points (called only when length >= 2)
  const getTouchDistance = useCallback((touches: React.TouchList): number => {
    const touch0 = touches[0];
    const touch1 = touches[1];
    if (!touch0 || !touch1) return 0;
    const dx = touch0.clientX - touch1.clientX;
    const dy = touch0.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Pinch zoom handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        pinchStartDistanceRef.current = getTouchDistance(e.touches);
        pinchStartZoomRef.current = zoom;
      }
    },
    [zoom, getTouchDistance],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDistanceRef.current > 0) {
        e.preventDefault();
        const currentDistance = getTouchDistance(e.touches);
        const scale = currentDistance / pinchStartDistanceRef.current;
        const newZoom = pinchStartZoomRef.current * scale;
        setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom)));
      }
    },
    [getTouchDistance],
  );

  const handleTouchEnd = useCallback(() => {
    pinchStartDistanceRef.current = 0;
  }, []);

  // Crop and export
  const handleConfirm = useCallback(() => {
    if (!imageRef.current || !viewportRef.current) return;

    const viewport = viewportRef.current.getBoundingClientRect();
    const img = imageRef.current;

    // Calculate crop area in image coordinates
    const viewportCenterX = viewport.width / 2;
    const viewportCenterY = viewport.height / 2;

    // Frame center is at viewport center
    const frameCenterX = viewportCenterX;
    const frameCenterY = viewportCenterY;

    // Image center is at viewport center + position offset
    const imageCenterX = viewportCenterX + position.x;
    const imageCenterY = viewportCenterY + position.y;

    // Frame top-left relative to image
    const frameLeftOnImage = (frameCenterX - imageCenterX) / zoom;
    const frameTopOnImage = (frameCenterY - imageCenterY) / zoom;

    // Convert to image coordinates
    const cropX = imageSize.width / 2 + frameLeftOnImage - frameSize.width / 2 / zoom;
    const cropY = imageSize.height / 2 + frameTopOnImage - frameSize.height / 2 / zoom;
    const cropWidth = frameSize.width / zoom;
    const cropHeight = frameSize.height / zoom;

    // Create canvas and crop
    const canvas = document.createElement("canvas");
    canvas.width = frameSize.width;
    canvas.height = frameSize.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      img,
      Math.max(0, cropX),
      Math.max(0, cropY),
      cropWidth,
      cropHeight,
      0,
      0,
      frameSize.width,
      frameSize.height,
    );

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onConfirm(blob);
        }
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  }, [imageSize, frameSize, position, zoom, onConfirm]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
      {/* Viewport */}
      <div
        ref={viewportRef}
        className="relative flex-1 overflow-hidden cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Image */}
        <img
          ref={imageRef}
          src={imageUrl}
          alt=""
          className="absolute pointer-events-none select-none"
          style={{
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            maxWidth: "none",
          }}
          draggable={false}
        />

        {/* Frame overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Dark overlay with cutout using box-shadow */}
          <div
            className="relative border-2 border-white/90 rounded-sm"
            style={{
              width: frameSize.width,
              height: frameSize.height,
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
            }}
          >
            {/* Corner markers */}
            <div className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-4 border-l-4 border-white rounded-tl" />
            <div className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-4 border-r-4 border-white rounded-tr" />
            <div className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-4 border-l-4 border-white rounded-bl" />
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-4 border-r-4 border-white rounded-br" />
          </div>
        </div>
      </div>

      {/* Hint */}
      <div className="flex-shrink-0 py-2 text-center">
        <span className="inline-block px-3 py-1 text-sm text-gray-300 bg-white/10 rounded">
          {t("validation.ocr.photoGuide.alignScoresheet")}
        </span>
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 flex gap-4 p-4 bg-white dark:bg-gray-800">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-2 min-h-12 px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
        >
          <X className="w-5 h-5" aria-hidden="true" />
          {t("validation.ocr.cancel")}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 flex items-center justify-center gap-2 min-h-12 px-4 py-3 text-white bg-primary-500 hover:bg-primary-600 rounded-lg font-medium transition-colors"
        >
          <Check className="w-5 h-5" aria-hidden="true" />
          {t("common.confirm")}
        </button>
      </div>
    </div>
  );
}
