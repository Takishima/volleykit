import { useState, useRef, useCallback } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/stores/auth";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.pdf";
const SIMULATED_UPLOAD_DURATION_MS = 1500;

type UploadState = "idle" | "uploading" | "complete" | "error";

interface SelectedFile {
  file: File;
  previewUrl: string | null;
}

interface IconProps {
  className?: string;
}

const Icon = {
  Upload: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17,8 12,3 7,8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  Camera: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  Check: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22,4 12,14.01 9,11.01" />
    </svg>
  ),
  File: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
    </svg>
  ),
  Alert: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ScoresheetPanel() {
  const { t } = useTranslation();
  const isDemoMode = useAuthStore((state) => state.isDemoMode);

  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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

  const simulateUpload = useCallback(() => {
    setUploadState("uploading");
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((p) => (p >= 90 ? (clearInterval(interval), p) : p + 10));
    }, SIMULATED_UPLOAD_DURATION_MS / 10);
    setTimeout(() => {
      clearInterval(interval);
      setUploadProgress(100);
      setUploadState("complete");
    }, SIMULATED_UPLOAD_DURATION_MS);
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        setErrorMessage(error);
        return;
      }
      setErrorMessage(null);
      setSelectedFile({
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      });
      simulateUpload();
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
    if (selectedFile?.previewUrl) URL.revokeObjectURL(selectedFile.previewUrl);
    setSelectedFile(null);
    setUploadState("idle");
    setUploadProgress(0);
    setErrorMessage(null);
  }, [selectedFile]);

  const handleReplace = useCallback(() => {
    resetState();
    fileInputRef.current?.click();
  }, [resetState]);

  const tKey = (key: string) => t(`validation.scoresheetUpload.${key}` as Parameters<typeof t>[0]);

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
          <Icon.Upload className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">{tKey("title")}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{tKey("description")}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            {tKey("acceptedFormats")} • {tKey("maxFileSize")}
          </p>

          {errorMessage && (
            <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
              <Icon.Alert className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700 dark:text-red-400">{errorMessage}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              <Icon.Upload className="w-4 h-4" />
              {tKey("selectFile")}
            </button>
            <button type="button" onClick={() => cameraInputRef.current?.click()} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
              <Icon.Camera className="w-4 h-4" />
              {tKey("takePhoto")}
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {selectedFile.previewUrl ? (
            <div className="relative bg-gray-100 dark:bg-gray-800">
              <img src={selectedFile.previewUrl} alt={selectedFile.file.name} className="w-full max-h-64 object-contain" />
            </div>
          ) : (
            <div className="bg-gray-100 dark:bg-gray-800 p-8 flex flex-col items-center justify-center">
              <Icon.File className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-2" />
              <span className="text-sm text-gray-500 dark:text-gray-400">PDF</span>
            </div>
          )}

          <div className="p-4 bg-white dark:bg-gray-800">
            {uploadState === "uploading" && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{tKey("uploading")}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {uploadState === "complete" && (
              <div className="mb-3 flex items-center gap-2 text-green-600 dark:text-green-400">
                <Icon.Check className="w-5 h-5" />
                <span className="text-sm font-medium">{tKey("uploadComplete")}</span>
              </div>
            )}

            {uploadState === "error" && (
              <div role="alert" className="mb-3 flex items-center gap-2 text-red-600 dark:text-red-400">
                <Icon.Alert className="w-5 h-5" />
                <span className="text-sm font-medium">{tKey("uploadError")}</span>
              </div>
            )}

            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{selectedFile.file.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(selectedFile.file.size)}</p>

            <div className="mt-4 flex gap-3">
              <button type="button" onClick={handleReplace} disabled={uploadState === "uploading"} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {tKey("replace")}
              </button>
              <button type="button" onClick={resetState} disabled={uploadState === "uploading"} className="flex-1 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {tKey("remove")}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDemoMode && <p className="mt-3 text-xs text-center text-gray-400 dark:text-gray-500">Demo mode: uploads are simulated</p>}
    </div>
  );
}
