import type { ReactNode } from 'react'

interface ModalFooterProps {
  /** Footer content (typically Button components) */
  children: ReactNode
  /** Whether to show a divider line above the footer */
  divider?: boolean
}

/**
 * Footer component for modals with consistent styling and optional divider.
 *
 * @example
 * ```tsx
 * <ModalFooter divider>
 *   <Button variant="secondary" className="flex-1 rounded-md" onClick={onClose}>
 *     Cancel
 *   </Button>
 *   <Button variant="primary" className="flex-1 rounded-md" onClick={onConfirm}>
 *     Confirm
 *   </Button>
 * </ModalFooter>
 * ```
 */
export function ModalFooter({ children, divider = false }: ModalFooterProps) {
  return (
    <div
      className={
        divider ? 'border-t border-border-default dark:border-border-default-dark pt-4' : undefined
      }
    >
      <div className="flex gap-3">{children}</div>
    </div>
  )
}
