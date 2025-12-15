import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/stores/auth";
import {
  UploadIcon,
  CameraIcon,
  CheckIcon,
  FileIcon,
  AlertIcon,
} from "@/components/ui/icons";

interface ScoresheetPanelProps {
  /** Callback when scoresheet state changes */
  onScoresheetChange?: (file: File | null, uploaded: boolean) => void;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.pdf";
const SIMULATED_UPLOAD_DURATION_MS = 1500;
const PROGRESS_INCREMENT_PERCENT = 10;
const PROGRESS_STOP_THRESHOLD = 90;
const PROGRESS_COMPLETE = 100;
const PROGRESS_STEPS = 10;

type UploadState = "idle" | "uploading" | "complete";

interface SelectedFile {
  file: File;
  previewUrl: string | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ScoresheetPanel({ onScoresheetChange }: ScoresheetPanelProps) {
  const { t } = useTranslation();
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const onScoresheetChangeRef = useRef(onScoresheetChange);

  // Keep ref in sync with prop
  useEffect(() => {
    onScoresheetChangeRef.current = onScoresheetChange;
  }, [onScoresheetChange]);

  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadTimersRef = useRef<{
    interval?: ReturnType<typeof setInterval>;
    timeout?: ReturnType<typeof setTimeout>;
  }>({});
  const previewUrlRef = useRef<string | null>(null);
  // Prevent concurrent uploads (race condition prevention - not for unmount tracking)
  const isUploadingRef = useRef(false);

  // Cleanup preview URL and upload timers on unmount
  useEffect(() => {
    const timers = uploadTimersRef.current;
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      if (timers.interval) {
        clearInterval(timers.interval);
      }
      if (timers.timeout) {
        clearTimeout(timers.timeout);
      }
    };
  }, []);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        return t("validation.scoresheetUpload.invalidFileType");
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return t("validation.scoresheetUpload.fileTooLarge");
      }
      return null;
    },
    [t],
  );

  const simulateUpload = useCallback((file: File) => {
    // Clear any existing timers
    if (uploadTimersRef.current.interval) {
      clearInterval(uploadTimersRef.current.interval);
    }
    if (uploadTimersRef.current.timeout) {
      clearTimeout(uploadTimersRef.current.timeout);
    }

    isUploadingRef.current = true;
    setUploadState("uploading");
    setUploadProgress(0);
    // Notify that file is selected but not yet uploaded
    onScoresheetChangeRef.current?.(file, false);

    uploadTimersRef.current.interval = setInterval(() => {
      setUploadProgress((p) => {
        if (p >= PROGRESS_STOP_THRESHOLD) {
          if (uploadTimersRef.current.interval) {
            clearInterval(uploadTimersRef.current.interval);
          }
          return p;
        }
        return p + PROGRESS_INCREMENT_PERCENT;
      });
    }, SIMULATED_UPLOAD_DURATION_MS / PROGRESS_STEPS);

    uploadTimersRef.current.timeout = setTimeout(() => {
      if (uploadTimersRef.current.interval) {
        clearInterval(uploadTimersRef.current.interval);
      }
      setUploadProgress(PROGRESS_COMPLETE);
      setUploadState("complete");
      isUploadingRef.current = false;
      // Notify that upload is complete
      onScoresheetChangeRef.current?.(file, true);
    }, SIMULATED_UPLOAD_DURATION_MS);
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      // Prevent concurrent uploads
      if (isUploadingRef.current) return;

      const error = validateFile(file);
      if (error) {
        setErrorMessage(error);
        return;
      }

      // Revoke previous preview URL if exists
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      setErrorMessage(null);
      const newPreviewUrl = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null;
      previewUrlRef.current = newPreviewUrl;
      setSelectedFile({
        file,
        previewUrl: newPreviewUrl,
      });
      simulateUpload(file);
    },
    [validateFile, simulateUpload],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
      e.target.value = "";
    },
    [handleFileSelect],
  );

  const resetState = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (uploadTimersRef.current.interval) {
      clearInterval(uploadTimersRef.current.interval);
    }
    if (uploadTimersRef.current.timeout) {
      clearTimeout(uploadTimersRef.current.timeout);
    }
    isUploadingRef.current = false;
    setSelectedFile(null);
    setUploadState("idle");
    setUploadProgress(0);
    setErrorMessage(null);
    // Notify that scoresheet was removed
    onScoresheetChangeRef.current?.(null, false);
  }, []);

  const handleReplace = useCallback(() => {
    resetState();
    fileInputRef.current?.click();
  }, [resetState]);

  const tKey = (key: string) =>
    t(`validation.scoresheetUpload.${key}` as Parameters<typeof t>[0]);

  return (
    <div className="py-4">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleInputChange}
        className="hidden"
        aria-label={tKey("selectFile")}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        onChange={handleInputChange}
        className="hidden"
        aria-label={tKey("takePhoto")}
      />

      {!selectedFile ? (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
          <UploadIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {tKey("title")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {tKey("description")}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            {tKey("acceptedFormats")} • {tKey("maxFileSize")}
          </p>

          {errorMessage && (
            <div
              role="alert"
              className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2"
            >
              <AlertIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700 dark:text-red-400">
                {errorMessage}
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <UploadIcon className="w-4 h-4" />
              {tKey("selectFile")}
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              <CameraIcon className="w-4 h-4" />
              {tKey("takePhoto")}
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {selectedFile.previewUrl ? (
            <div className="relative bg-gray-100 dark:bg-gray-800">
              <img
                src={selectedFile.previewUrl}
                alt={tKey("previewAlt")}
                className="w-full max-h-64 object-contain"
              />
            </div>
          ) : (
            <div className="bg-gray-100 dark:bg-gray-800 p-8 flex flex-col items-center justify-center">
              <FileIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-2" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                PDF
              </span>
            </div>
          )}

          <div className="p-4 bg-white dark:bg-gray-800">
            {uploadState === "uploading" && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{tKey("uploading")}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div
                  className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={tKey("uploading")}
                >
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {uploadState === "complete" && (
              <div
                className="mb-3 flex items-center gap-2 text-green-600 dark:text-green-400"
                role="status"
                aria-live="polite"
              >
                <CheckIcon className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {tKey("uploadComplete")}
                </span>
              </div>
            )}

            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {selectedFile.file.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatFileSize(selectedFile.file.size)}
            </p>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={handleReplace}
                disabled={uploadState === "uploading"}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {tKey("replace")}
              </button>
              <button
                type="button"
                onClick={resetState}
                disabled={uploadState === "uploading"}
                className="flex-1 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {tKey("remove")}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDemoMode && (
        <p className="mt-3 text-xs text-center text-gray-400 dark:text-gray-500">
          {tKey("demoModeNote")}
        </p>
      )}
    </div>
  );
}
