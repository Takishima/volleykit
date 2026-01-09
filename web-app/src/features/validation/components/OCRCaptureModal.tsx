import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Camera, Image, X, AlertCircle } from "@/shared/components/icons";
import type { ScoresheetType } from "@/features/ocr/utils/scoresheet-detector";
import { ScoresheetGuide } from "./ScoresheetGuide";
import { ImageCropEditor } from "./ImageCropEditor";

const MAX_FILE_SIZE_MB = 10;
const BYTES_PER_KB = 1024;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * BYTES_PER_KB * BYTES_PER_KB;
const ACCEPTED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** File extensions for accept attribute - prevents camera app from appearing in file picker */
const ACCEPTED_IMAGE_EXTENSIONS = ".jpg,.jpeg,.png,.webp";

/** Video constraints for camera preview */
const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: "environment",
  width: { ideal: 1920 },
  height: { ideal: 1080 },
};

/** JPEG quality for captured photos */
const JPEG_QUALITY = 0.92;

type CaptureStep = "select" | "camera" | "crop";

interface OCRCaptureModalProps {
  isOpen: boolean;
  /** Type of scoresheet being captured (affects guide aspect ratio) */
  scoresheetType: ScoresheetType;
  onClose: () => void;
  onImageSelected: (blob: Blob) => void;
}

/**
 * Modal for capturing or selecting an image for OCR processing.
 * Supports live camera preview with guides and file selection with cropping.
 */
export function OCRCaptureModal({
  isOpen,
  scoresheetType,
  onClose,
  onImageSelected,
}: OCRCaptureModalProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<CaptureStep>("select");
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<Blob | null>(null);
  const [cameraError, setCameraError] = useState(false);

  // Clean up camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Connect stream to video element when camera step is active
  useEffect(() => {
    if (step === "camera" && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [step]);

  // Handle Escape key to close modal or go back
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (step === "camera") {
          stopCamera();
          setStep("select");
        } else if (step === "crop") {
          setSelectedImage(null);
          setStep("select");
        } else {
          onClose();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, step, onClose, stopCamera]);

  // Start camera preview
  const startCamera = useCallback(async () => {
    setError(null);
    setCameraError(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: VIDEO_CONSTRAINTS,
        audio: false,
      });

      streamRef.current = stream;
      // Step change triggers useEffect to connect stream to video element
      setStep("camera");
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError(true);
      setError(t("validation.ocr.errors.cameraNotAvailable"));
    }
  }, [t]);

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          stopCamera();
          setSelectedImage(blob);
          setStep("crop");
        }
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  }, [stopCamera]);

  // Handle file selection
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Reset file input to allow re-selecting the same file
      event.target.value = "";
      setError(null);

      // Validate file type
      if (!ACCEPTED_IMAGE_MIME_TYPES.includes(file.type)) {
        setError(t("validation.scoresheetUpload.invalidFileType"));
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(t("validation.ocr.errors.imageTooLarge"));
        return;
      }

      setSelectedImage(file);
      setStep("crop");
    },
    [t],
  );

  const handleSelectImage = useCallback(() => {
    setError(null);
    fileInputRef.current?.click();
  }, []);

  // Handle crop confirmation
  // Note: We only call onImageSelected, not onClose. The parent component
  // (OCREntryModal/OCRPanel) is responsible for closing this modal by setting
  // showCaptureModal to false in their handleImageSelected callback.
  // Calling onClose here would race with the parent's state updates and could
  // reset the step to "intro" before the processing step is shown.
  const handleCropConfirm = useCallback(
    (croppedBlob: Blob) => {
      onImageSelected(croppedBlob);
    },
    [onImageSelected],
  );

  // Handle crop cancel
  const handleCropCancel = useCallback(() => {
    setSelectedImage(null);
    setStep("select");
  }, []);

  // Handle camera cancel
  const handleCameraCancel = useCallback(() => {
    stopCamera();
    setStep("select");
  }, [stopCamera]);

  if (!isOpen) return null;

  // Show crop editor
  if (step === "crop" && selectedImage) {
    return (
      <ImageCropEditor
        imageBlob={selectedImage}
        scoresheetType={scoresheetType}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    );
  }

  // Show camera preview
  if (step === "camera") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
        {/* Video preview with guide overlay */}
        <div className="relative flex-1 min-h-0 overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover bg-gray-800"
            autoPlay
            playsInline
            muted
          />
          {/* Guide overlay */}
          <ScoresheetGuide scoresheetType={scoresheetType} />
        </div>

        {/* Camera controls */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-gray-900 safe-area-bottom">
          <button
            type="button"
            onClick={handleCameraCancel}
            className="px-4 py-2 text-white bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            {t("validation.ocr.cancel")}
          </button>

          {/* Capture button */}
          <button
            type="button"
            onClick={capturePhoto}
            className="w-16 h-16 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center transition-colors"
            aria-label={t("validation.ocr.takePhoto")}
          >
            <div className="w-12 h-12 rounded-full bg-danger-500" />
          </button>

          {/* Spacer for centering */}
          <div className="w-20" />
        </div>
      </div>
    );
  }

  // Show selection UI
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ocr-capture-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="ocr-capture-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            {t("validation.ocr.scanScoresheet")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t("common.close")}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t("validation.ocr.scanScoresheetDescription")}
          </p>

          {/* Error message */}
          {error && (
            <div
              className="flex items-center gap-2 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg"
              role="alert"
            >
              <AlertCircle
                className="w-5 h-5 text-danger-500 flex-shrink-0"
                aria-hidden="true"
              />
              <p className="text-sm text-danger-700 dark:text-danger-400">
                {error}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            {/* Take Photo button - use live camera if available */}
            <button
              type="button"
              onClick={cameraError ? handleSelectImage : startCamera}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors font-medium"
            >
              <Camera className="w-5 h-5" aria-hidden="true" />
              {t("validation.ocr.takePhoto")}
            </button>

            {/* Select Image button */}
            <button
              type="button"
              onClick={handleSelectImage}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 border border-primary-200 dark:border-primary-800 rounded-lg transition-colors font-medium"
            >
              <Image className="w-5 h-5" aria-hidden="true" />
              {t("validation.ocr.selectImage")}
            </button>

            {/* Cancel button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
            >
              {t("validation.ocr.cancel")}
            </button>
          </div>

          {/* Hidden file input - uses extensions to prevent camera option */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_EXTENSIONS}
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
