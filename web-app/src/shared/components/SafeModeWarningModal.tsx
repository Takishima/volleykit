import { useCallback, useRef } from "react";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Modal } from "@/shared/components/Modal";
import { ModalHeader } from "@/shared/components/ModalHeader";
import { ModalFooter } from "@/shared/components/ModalFooter";
import { Button } from "@/shared/components/Button";

const MODAL_TITLE_ID = "safe-mode-warning-title";

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

  const warningIcon = (
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
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} titleId={MODAL_TITLE_ID} size="md">
      <ModalHeader
        title={t("settings.safeModeWarningTitle")}
        titleId={MODAL_TITLE_ID}
        icon={warningIcon}
      />

      <div className="mb-6 space-y-3">
        <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
          {t("settings.safeModeWarningMessage")}
        </p>

        <ul className="space-y-2 text-sm text-text-secondary dark:text-text-secondary-dark">
          <li className="flex items-start">
            <span className="text-yellow-600 dark:text-yellow-400 mr-2">•</span>
            <span>{t("settings.safeModeWarningPoint1")}</span>
          </li>
          <li className="flex items-start">
            <span className="text-yellow-600 dark:text-yellow-400 mr-2">•</span>
            <span>{t("settings.safeModeWarningPoint2")}</span>
          </li>
          <li className="flex items-start">
            <span className="text-yellow-600 dark:text-yellow-400 mr-2">•</span>
            <span>{t("settings.safeModeWarningPoint3")}</span>
          </li>
        </ul>
      </div>

      <ModalFooter divider>
        <Button variant="secondary" className="flex-1 rounded-md" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button variant="danger" className="flex-1 rounded-md" onClick={handleConfirm}>
          {t("settings.safeModeConfirmButton")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
