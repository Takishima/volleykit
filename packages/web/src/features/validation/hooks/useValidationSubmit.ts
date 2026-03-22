import { useState, useCallback, useRef, useEffect } from 'react'

import { useTranslation } from '@/common/hooks/useTranslation'
import { logger } from '@/common/utils/logger'

/** Duration to show success toast before auto-dismissing */
const SUCCESS_TOAST_DURATION_MS = 3000

interface UseValidationSubmitOptions {
  /** Whether to use safe validation (save only, don't finalize) */
  useSafeValidation: boolean
  /** Whether the scorer was marked as "not found" — forces save-only mode */
  scorerNotFound: boolean
  /** Save progress without finalizing */
  saveProgress: () => Promise<void>
  /** Finalize the validation (close all forms) */
  finalizeValidation: () => Promise<void>
  /** Reset all validation state */
  reset: () => void
  /** Close the wizard modal */
  onClose: () => void
}

export interface UseValidationSubmitResult {
  // UI state
  showUnsavedDialog: boolean
  showSafeValidationComplete: boolean
  saveError: string | null
  successToast: string | null

  // Handlers
  /** Run the finalization/save flow */
  performFinalization: () => Promise<void>
  /** Save current progress and close the modal */
  handleSaveAndClose: () => Promise<void>
  /** Discard changes and close the modal */
  handleDiscardAndClose: () => void
  /** Cancel the unsaved-changes dialog */
  handleCancelClose: () => void
  /** Close the safe-validation-complete dialog and the modal */
  handleSafeValidationCompleteClose: () => void
  /** Show the unsaved-changes prompt dialog */
  showUnsavedPrompt: () => void
  /** Reset all UI state (dialogs, errors, toasts) */
  resetUIState: () => void
}

/**
 * Hook that encapsulates all submission logic for the validation wizard:
 *   - finalize vs. safe-save decision
 *   - unsaved-changes dialog flow
 *   - safe-validation-complete dialog flow
 *   - success toast with auto-dismiss
 *   - error handling
 */
export function useValidationSubmit({
  useSafeValidation,
  scorerNotFound,
  saveProgress,
  finalizeValidation,
  reset,
  onClose,
}: UseValidationSubmitOptions): UseValidationSubmitResult {
  const { t } = useTranslation()

  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [showSafeValidationComplete, setShowSafeValidationComplete] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  const isSubmittingRef = useRef(false)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Reset transient UI state (called when the wizard reopens). */
  const resetUIState = useCallback(() => {
    setSaveError(null)
    setSuccessToast(null)
    setShowUnsavedDialog(false)
    setShowSafeValidationComplete(false)
  }, [])

  // Clean up toast timeout on unmount to avoid setState on unmounted component
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [])

  const performFinalization = useCallback(async () => {
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setSaveError(null)

    try {
      if (useSafeValidation || scorerNotFound) {
        await saveProgress()
        setShowSafeValidationComplete(true)
      } else {
        await finalizeValidation()
        setSuccessToast(t('validation.state.saveSuccess'))
        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current)
        }
        toastTimeoutRef.current = setTimeout(() => {
          setSuccessToast(null)
        }, SUCCESS_TOAST_DURATION_MS)
        onClose()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('validation.state.saveError')
      setSaveError(message)
    } finally {
      isSubmittingRef.current = false
    }
  }, [useSafeValidation, scorerNotFound, saveProgress, finalizeValidation, t, onClose])

  const handleSaveAndClose = useCallback(async () => {
    try {
      await saveProgress()
      setShowUnsavedDialog(false)
      onClose()
    } catch (error) {
      logger.error('[ValidateGameModal] Save failed during close:', error)
      setSaveError(t('validation.state.saveError'))
      setShowUnsavedDialog(false)
    }
  }, [saveProgress, onClose, t])

  const handleDiscardAndClose = useCallback(() => {
    setShowUnsavedDialog(false)
    reset()
    onClose()
  }, [reset, onClose])

  const handleCancelClose = useCallback(() => {
    setShowUnsavedDialog(false)
  }, [])

  const handleSafeValidationCompleteClose = useCallback(() => {
    setShowSafeValidationComplete(false)
    onClose()
  }, [onClose])

  const showUnsavedPrompt = useCallback(() => {
    setShowUnsavedDialog(true)
  }, [])

  return {
    showUnsavedDialog,
    showSafeValidationComplete,
    saveError,
    successToast,
    performFinalization,
    handleSaveAndClose,
    handleDiscardAndClose,
    handleCancelClose,
    handleSafeValidationCompleteClose,
    showUnsavedPrompt,
    resetUIState,
  }
}
