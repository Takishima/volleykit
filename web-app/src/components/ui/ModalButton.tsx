import type { ButtonHTMLAttributes, ReactNode } from "react";

type ModalButtonVariant = "secondary" | "primary" | "success" | "danger" | "blue";

interface ModalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant: ModalButtonVariant;
  /** Whether the button should expand to fill available width (flex-1) */
  fullWidth?: boolean;
  /** Button content */
  children: ReactNode;
}

const variantClasses: Record<ModalButtonVariant, string> = {
  secondary:
    "text-text-secondary dark:text-text-secondary-dark bg-surface-subtle dark:bg-surface-subtle-dark hover:bg-surface-muted dark:hover:bg-surface-muted-dark focus:ring-border-strong",
  primary:
    "text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500",
  success: "text-white bg-green-600 hover:bg-green-700 focus:ring-green-500",
  danger: "text-white bg-red-600 hover:bg-red-700 focus:ring-red-500",
  blue: "text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
};

/**
 * Standardized button component for use in modals and dialogs.
 * Provides consistent styling, accessibility, and dark mode support.
 *
 * @example
 * ```tsx
 * <ModalButton variant="secondary" onClick={onClose}>
 *   Cancel
 * </ModalButton>
 * <ModalButton variant="success" onClick={onConfirm} disabled={isLoading}>
 *   {isLoading ? "Saving..." : "Save"}
 * </ModalButton>
 * ```
 */
export function ModalButton({
  variant,
  fullWidth = false,
  children,
  className = "",
  disabled,
  ...props
}: ModalButtonProps) {
  const baseClasses =
    "px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const widthClass = fullWidth ? "flex-1" : "";
  const variantClass = variantClasses[variant];

  return (
    <button
      type="button"
      disabled={disabled}
      className={`${baseClasses} ${variantClass} ${widthClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
