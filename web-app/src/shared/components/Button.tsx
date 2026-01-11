import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'blue' | 'ghost'

export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant
  /** Button size */
  size?: ButtonSize
  /** Show loading spinner and disable interactions */
  loading?: boolean
  /** Icon to display before the button text */
  iconLeft?: ReactNode
  /** Icon to display after the button text */
  iconRight?: ReactNode
  /** Whether the button should expand to fill available width */
  fullWidth?: boolean
  /** Button content */
  children: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'text-primary-950 bg-primary-500 hover:bg-primary-600 focus:ring-primary-500',
  secondary:
    'text-text-secondary dark:text-text-secondary-dark bg-surface-subtle dark:bg-surface-subtle-dark hover:bg-surface-muted dark:hover:bg-surface-muted-dark focus:ring-border-strong',
  success: 'text-white bg-green-600 hover:bg-green-700 focus:ring-green-500',
  danger: 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500',
  blue: 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  ghost:
    'text-text-secondary dark:text-text-secondary-dark bg-transparent hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark focus:ring-border-strong',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}

function LoadingSpinner({ size }: { size: ButtonSize }) {
  const sizeClass = iconSizeClasses[size]
  return (
    <span
      className={`${sizeClass} border-2 border-current border-t-transparent rounded-full animate-spin`}
      aria-hidden="true"
    />
  )
}

/**
 * Unified button component for consistent styling across the application.
 * Supports multiple variants, sizes, loading states, and icon placement.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Button variant="primary" onClick={handleClick}>
 *   Save
 * </Button>
 *
 * // With loading state
 * <Button variant="primary" loading={isLoading}>
 *   {isLoading ? "Saving..." : "Save"}
 * </Button>
 *
 * // With icons
 * <Button variant="secondary" iconLeft={<ArrowLeftIcon />}>
 *   Back
 * </Button>
 * ```
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  iconLeft,
  iconRight,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  const baseClasses =
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  const variantClass = variantClasses[variant]
  const sizeClass = sizeClasses[size]
  const widthClass = fullWidth ? 'w-full' : ''

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`${baseClasses} ${variantClass} ${sizeClass} ${widthClass} ${className}`.trim()}
      {...props}
    >
      {loading ? <LoadingSpinner size={size} /> : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  )
}
