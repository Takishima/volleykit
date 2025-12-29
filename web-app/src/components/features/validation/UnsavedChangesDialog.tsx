import { useRef, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/Button";

/** Z-index for confirmation dialog (above main modal) */
const Z_INDEX_CONFIRMATION_DIALOG = 60;

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onSaveAndClose: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

/**
 * Dialog for confirming close with unsaved changes.
 * Provides options to save, discard, or continue editing.
 */
export function UnsavedChangesDialog({
  isOpen,
  onSaveAndClose,
  onDiscard,
  onCancel,
  isSaving,
}: UnsavedChangesDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus first button when dialog opens for accessibility
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      const firstButton = dialogRef.current.querySelector("button");
      firstButton?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      style={{ zIndex: Z_INDEX_CONFIRMATION_DIALOG }}
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        className="bg-surface-card dark:bg-surface-card-dark rounded-lg shadow-xl max-w-sm w-full p-6"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-changes-title"
        aria-describedby="unsaved-changes-description"
      >
        <h3
          id="unsaved-changes-title"
          className="text-lg font-semibold text-text-primary dark:text-text-primary-dark mb-2"
        >
          {t("validation.state.unsavedChangesTitle")}
        </h3>
        <p
          id="unsaved-changes-description"
          className="text-sm text-text-muted dark:text-text-muted-dark mb-4"
        >
          {t("validation.state.unsavedChangesMessage")}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
            {t("validation.state.continueEditing")}
          </Button>
          <Button variant="danger" onClick={onDiscard} disabled={isSaving}>
            {t("validation.state.discardChanges")}
          </Button>
          <Button variant="primary" onClick={onSaveAndClose} disabled={isSaving}>
            {isSaving ? t("common.loading") : t("validation.state.saveAndClose")}
          </Button>
        </div>
      </div>
    </div>
  );
}
