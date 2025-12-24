import { useCallback, useRef } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useModalDismissal } from "@/hooks/useModalDismissal";

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
  const isConfirmingRef = useRef(false);

  const { handleBackdropClick } = useModalDismissal({
    isOpen,
    onClose,
  });

  const handleConfirm = useCallback(() => {
    if (isConfirmingRef.current) return;
    isConfirmingRef.current = true;
    try {
      onConfirm();
      onClose();
    } finally {
      isConfirmingRef.current = false;
    }
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
        className="bg-surface-card dark:bg-surface-card-dark rounded-lg shadow-xl max-w-md w-full p-6"
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
            className="text-xl font-semibold text-text-primary dark:text-text-primary-dark"
          >
            {t("settings.safeModeWarningTitle")}
          </h2>
        </div>

        <div className="mb-6 space-y-3">
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
            {t("settings.safeModeWarningMessage")}
          </p>

          <ul className="space-y-2 text-sm text-text-secondary dark:text-text-secondary-dark">
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

        <div className="border-t border-border-default dark:border-border-default-dark pt-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-text-secondary dark:text-text-secondary-dark bg-surface-subtle dark:bg-surface-subtle-dark rounded-md hover:bg-surface-muted dark:hover:bg-surface-muted-dark focus:outline-none focus:ring-2 focus:ring-border-strong"
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
