import { Modal } from "@/components/ui/Modal";
import { ModalHeader } from "@/components/ui/ModalHeader";
import { ModalFooter } from "@/components/ui/ModalFooter";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "@/components/ui/icons";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Type of calendar error to display appropriate message.
 */
export type CalendarErrorType = "network" | "invalidCode" | "parse";

interface CalendarErrorModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Type of error that occurred */
  errorType: CalendarErrorType;
  /** Callback when the user acknowledges the error */
  onAcknowledge: () => void;
}

/**
 * Modal displayed when a calendar error occurs.
 *
 * Shows an appropriate error message based on the error type and provides
 * an OK button that triggers logout for critical errors (network, invalidCode)
 * or dismisses for non-critical errors (parse).
 *
 * @example
 * ```tsx
 * <CalendarErrorModal
 *   isOpen={hasError}
 *   errorType="network"
 *   onAcknowledge={handleLogout}
 * />
 * ```
 */
export function CalendarErrorModal({
  isOpen,
  errorType,
  onAcknowledge,
}: CalendarErrorModalProps) {
  const { t } = useTranslation();

  const getMessage = (): string => {
    switch (errorType) {
      case "network":
        return t("calendarError.networkMessage");
      case "invalidCode":
        return t("calendarError.invalidCodeMessage");
      case "parse":
        return t("calendarError.parseErrorMessage");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onAcknowledge}
      titleId="calendar-error-modal-title"
      size="sm"
      closeOnEscape={true}
      closeOnBackdrop={false}
    >
      <ModalHeader
        title={t("calendarError.title")}
        titleId="calendar-error-modal-title"
        icon={
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
            <AlertTriangle
              className="w-5 h-5 text-red-600 dark:text-red-400"
              aria-hidden="true"
            />
          </div>
        }
      />
      <p className="text-sm text-text-secondary dark:text-text-secondary-dark mb-6">
        {getMessage()}
      </p>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={onAcknowledge}
          className="flex-1"
        >
          {t("calendarError.ok")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
