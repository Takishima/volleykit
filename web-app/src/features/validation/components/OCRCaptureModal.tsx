import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Camera, Image, X, AlertCircle } from "@/shared/components/icons";

const MAX_FILE_SIZE_MB = 10;
const BYTES_PER_KB = 1024;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * BYTES_PER_KB * BYTES_PER_KB;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface OCRCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelected: (blob: Blob) => void;
}

/**
 * Modal for capturing or selecting an image for OCR processing.
 * Supports camera capture and file selection.
 */
export function OCRCaptureModal({
  isOpen,
  onClose,
  onImageSelected,
}: OCRCaptureModalProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Reset file input to allow re-selecting the same file
      event.target.value = "";

      setError(null);

      // Validate file type
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setError(t("validation.scoresheetUpload.invalidFileType"));
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(t("validation.ocr.errors.imageTooLarge"));
        return;
      }

      onImageSelected(file);
      onClose();
    },
    [onImageSelected, onClose, t],
  );

  const handleSelectImage = useCallback(() => {
    setError(null);
    fileInputRef.current?.click();
  }, []);

  const handleTakePhoto = useCallback(() => {
    setError(null);
    cameraInputRef.current?.click();
  }, []);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
            {/* Take Photo button */}
            <button
              type="button"
              onClick={handleTakePhoto}
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

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
