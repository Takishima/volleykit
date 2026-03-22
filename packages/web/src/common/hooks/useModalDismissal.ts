import { useCallback, useEffect } from 'react'

interface UseModalDismissalOptions {
  /** Whether the modal is currently open */
  isOpen: boolean
  /** Callback to close the modal */
  onClose: () => void
  /** When true, dismissal is disabled (e.g., during loading) */
  isLoading?: boolean
  /** Whether pressing Escape should close the modal (default: true) */
  closeOnEscape?: boolean
  /** Whether clicking the backdrop should close the modal (default: true) */
  closeOnBackdropClick?: boolean
}

interface UseModalDismissalResult {
  /** Click handler for the backdrop element */
  handleBackdropClick: (e: React.MouseEvent<HTMLDivElement>) => void
}

/**
 * Hook for managing modal dismissal behavior.
 * Handles both Escape key and backdrop click dismissals in a consistent way.
 *
 * @example
 * ```tsx
 * function Modal({ isOpen, onClose, isLoading }) {
 *   const { handleBackdropClick } = useModalDismissal({
 *     isOpen,
 *     onClose,
 *     isLoading,
 *   });
 *
 *   if (!isOpen) return null;
 *
 *   return (
 *     <div onClick={handleBackdropClick} aria-hidden="true">
 *       <div role="dialog" aria-modal="true">
 *         {content}
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useModalDismissal(options: UseModalDismissalOptions): UseModalDismissalResult {
  const {
    isOpen,
    onClose,
    isLoading = false,
    closeOnEscape = true,
    closeOnBackdropClick = true,
  } = options

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isLoading, closeOnEscape, onClose])

  // Handle backdrop click to close modal
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && closeOnBackdropClick && !isLoading) {
        onClose()
      }
    },
    [onClose, isLoading, closeOnBackdropClick]
  )

  return { handleBackdropClick }
}
