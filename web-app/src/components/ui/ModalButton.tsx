import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button, type ButtonVariant } from "./Button";

type ModalButtonVariant = "secondary" | "primary" | "success" | "danger" | "blue";

interface ModalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant: ModalButtonVariant;
  /** Whether the button should expand to fill available width (flex-1) */
  fullWidth?: boolean;
  /** Button content */
  children: ReactNode;
}

/**
 * @deprecated Use `Button` component instead. ModalButton will be removed in a future version.
 *
 * Standardized button component for use in modals and dialogs.
 * This is now a thin wrapper around the unified Button component.
 *
 * @example
 * ```tsx
 * // Preferred: Use Button directly
 * <Button variant="secondary" onClick={onClose}>
 *   Cancel
 * </Button>
 *
 * // Legacy: Still supported but deprecated
 * <ModalButton variant="secondary" onClick={onClose}>
 *   Cancel
 * </ModalButton>
 * ```
 */
export function ModalButton({
  variant,
  fullWidth = false,
  children,
  className = "",
  ...props
}: ModalButtonProps) {
  // Modal-specific styling: smaller border radius and flex-1 for fullWidth
  const modalClasses = `rounded-md ${fullWidth ? "flex-1" : ""} ${className}`.trim();

  return (
    <Button
      variant={variant as ButtonVariant}
      className={modalClasses}
      {...props}
    >
      {children}
    </Button>
  );
}
