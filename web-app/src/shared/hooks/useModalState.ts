import { useState, useCallback, useRef, useEffect } from 'react'

import { MODAL_CLEANUP_DELAY } from '@/features/assignments/utils/assignment-helpers'

export interface ModalState<T> {
  /** Whether the modal is currently open */
  isOpen: boolean
  /** The data associated with the modal (null when no data is set) */
  data: T | null
  /** Opens the modal with the provided data */
  open: (data: T) => void
  /** Closes the modal and schedules delayed data cleanup */
  close: () => void
}

interface UseModalStateOptions {
  /** Custom cleanup delay in milliseconds (default: MODAL_CLEANUP_DELAY) */
  cleanupDelay?: number
}

/**
 * Hook for managing modal state with automatic cleanup.
 *
 * Handles the common pattern of:
 * - Boolean state for modal visibility
 * - Generic data state (nullable)
 * - Delayed data cleanup after close (for animation purposes)
 * - Proper timeout cleanup on unmount
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const modal = useModalState<Assignment>();
 *
 *   return (
 *     <>
 *       <button onClick={() => modal.open(assignment)}>Edit</button>
 *       {modal.isOpen && (
 *         <Modal onClose={modal.close}>
 *           <EditForm data={modal.data} />
 *         </Modal>
 *       )}
 *     </>
 *   );
 * }
 * ```
 */
export function useModalState<T>(options: UseModalStateOptions = {}): ModalState<T> {
  const { cleanupDelay = MODAL_CLEANUP_DELAY } = options

  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<T | null>(null)
  const cleanupTimeoutRef = useRef<number | null>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current)
      }
    }
  }, [])

  const open = useCallback((newData: T) => {
    // Cancel any pending cleanup from a previous close
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current)
      cleanupTimeoutRef.current = null
    }
    setData(newData)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    // Clear any existing timeout before setting a new one
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current)
    }
    // Delay data cleanup to allow for close animations
    cleanupTimeoutRef.current = setTimeout(() => {
      setData(null)
    }, cleanupDelay)
  }, [cleanupDelay])

  return {
    isOpen,
    data,
    open,
    close,
  }
}
