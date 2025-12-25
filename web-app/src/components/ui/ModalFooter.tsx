import type { ReactNode } from "react";

interface ModalFooterProps {
  /** Footer content (typically ModalButton components) */
  children: ReactNode;
  /** Whether to show a divider line above the footer */
  divider?: boolean;
}

/**
 * Footer component for modals with consistent styling and optional divider.
 *
 * @example
 * ```tsx
 * <ModalFooter divider>
 *   <ModalButton variant="secondary" fullWidth onClick={onClose}>
 *     Cancel
 *   </ModalButton>
 *   <ModalButton variant="primary" fullWidth onClick={onConfirm}>
 *     Confirm
 *   </ModalButton>
 * </ModalFooter>
 * ```
 */
export function ModalFooter({ children, divider = false }: ModalFooterProps) {
  return (
    <div
      className={
        divider
          ? "border-t border-border-default dark:border-border-default-dark pt-4"
          : undefined
      }
    >
      <div className="flex gap-3">{children}</div>
    </div>
  );
}
