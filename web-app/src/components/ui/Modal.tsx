import { useEffect, useRef, type ReactNode } from "react";
import { useModalDismissal } from "@/hooks/useModalDismissal";

export type ModalSize = "sm" | "md" | "lg" | "xl";

/** Default z-index for modal overlays */
const DEFAULT_Z_INDEX = 50;

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

interface ModalProps {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Content to render inside the modal */
  children: ReactNode;
  /** ID for the modal title element (used for aria-labelledby) */
  titleId: string;
  /** Modal width size variant */
  size?: ModalSize;
  /** Whether pressing Escape should close the modal */
  closeOnEscape?: boolean;
  /** Whether clicking the backdrop should close the modal */
  closeOnBackdrop?: boolean;
  /** When true, dismissal is disabled (e.g., during loading/submission) */
  isLoading?: boolean;
  /** Custom z-index for the modal (default: 50) */
  zIndex?: number;
}

/**
 * Reusable modal component with accessibility features.
 *
 * Features:
 * - Focus trapping within the modal
 * - Escape key and backdrop click to close
 * - ARIA attributes for screen readers
 *
 * @example
 * ```tsx
 * <Modal
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   titleId="my-modal-title"
 *   size="md"
 * >
 *   <ModalHeader title="My Modal" titleId="my-modal-title" />
 *   <div className="mb-6">Modal content here</div>
 *   <ModalFooter>
 *     <Button variant="secondary" className="flex-1" onClick={handleClose}>Cancel</Button>
 *     <Button variant="primary" className="flex-1" onClick={handleConfirm}>Confirm</Button>
 *   </ModalFooter>
 * </Modal>
 * ```
 */
export function Modal({
  isOpen,
  onClose,
  children,
  titleId,
  size = "md",
  closeOnEscape = true,
  closeOnBackdrop = true,
  isLoading = false,
  zIndex = DEFAULT_Z_INDEX,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const { handleBackdropClick } = useModalDismissal({
    isOpen,
    onClose,
    isLoading,
    closeOnEscape,
    closeOnBackdropClick: closeOnBackdrop,
  });

  // Focus management: save previous focus and restore on close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Focus the dialog container for screen reader announcement
      dialogRef.current?.focus();
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Focus trap: keep focus within the modal
  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusableElements = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: if on first element, wrap to last
        if (document.activeElement === firstElement && lastElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === lastElement && firstElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  // Backdrop pattern: aria-hidden="true" hides the backdrop from screen readers since it's
  // purely decorative. Click-to-close is a convenience feature; keyboard users close via Escape.
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      style={{ zIndex }}
      onClick={handleBackdropClick}
      aria-hidden="true"
    >
      {/* Dialog container */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`bg-surface-card dark:bg-surface-card-dark rounded-lg shadow-xl w-full ${sizeClasses[size]} p-6 focus:outline-none`}
      >
        {children}
      </div>
    </div>
  );
}
