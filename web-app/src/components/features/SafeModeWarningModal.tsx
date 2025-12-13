import { useCallback, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";

interface SafeModeWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function SafeModeWarningModal({
  isOpen,
  onClose,
  onConfirm,
}: SafeModeWarningModalProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const handleConfirm = useCallback(() => {
    onConfirm();
    onClose();
  }, [onConfirm, onClose]);

  if (!isOpen) return null;

  // Backdrop pattern: aria-hidden="true" hides the backdrop from screen readers since it's
  // purely decorative. Click-to-close is a convenience feature; keyboard users close via Escape.
  // See CLAUDE.md Accessibility section for the canonical modal pattern.
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      aria-hidden="true"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="safe-mode-warning-title"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2
            id="safe-mode-warning-title"
            className="text-xl font-semibold text-gray-900 dark:text-white"
          >
            {t("settings.safeModeWarningTitle")}
          </h2>
        </div>

        <div className="mb-6 space-y-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {t("settings.safeModeWarningMessage")}
          </p>

          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start">
              <span className="text-yellow-600 dark:text-yellow-400 mr-2">
                •
              </span>
              <span>{t("settings.safeModeWarningPoint1")}</span>
            </li>
            <li className="flex items-start">
              <span className="text-yellow-600 dark:text-yellow-400 mr-2">
                •
              </span>
              <span>{t("settings.safeModeWarningPoint2")}</span>
            </li>
            <li className="flex items-start">
              <span className="text-yellow-600 dark:text-yellow-400 mr-2">
                •
              </span>
              <span>{t("settings.safeModeWarningPoint3")}</span>
            </li>
          </ul>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {t("settings.safeModeConfirmButton")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
