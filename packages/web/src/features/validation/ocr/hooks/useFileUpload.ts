import { useState, useRef, useCallback, useEffect, type RefObject } from 'react'

import { MAX_FILE_SIZE_BYTES, ALLOWED_FILE_TYPES } from '@/api/constants'
import { useTranslation } from '@/common/hooks/useTranslation'

const SIMULATED_UPLOAD_DURATION_MS = 1500
const PROGRESS_INCREMENT_PERCENT = 10
const PROGRESS_STOP_THRESHOLD = 90
const PROGRESS_COMPLETE = 100
const PROGRESS_STEPS = 10

type UploadState = 'idle' | 'uploading' | 'complete'

export interface SelectedFile {
  file: File
  previewUrl: string | null
}

interface UseFileUploadOptions {
  onScoresheetChange?: (file: File | null, uploaded: boolean) => void
}

interface UseFileUploadResult {
  selectedFile: SelectedFile | null
  uploadState: UploadState
  errorMessage: string | null
  uploadProgress: number
  fileInputRef: RefObject<HTMLInputElement | null>
  cameraInputRef: RefObject<HTMLInputElement | null>
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleReplace: () => void
  resetState: () => void
}

export function useFileUpload({ onScoresheetChange }: UseFileUploadOptions): UseFileUploadResult {
  const { t } = useTranslation()
  const onScoresheetChangeRef = useRef(onScoresheetChange)

  useEffect(() => {
    onScoresheetChangeRef.current = onScoresheetChange
  }, [onScoresheetChange])

  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadTimersRef = useRef<{
    interval?: ReturnType<typeof setInterval>
    timeout?: ReturnType<typeof setTimeout>
  }>({})
  const previewUrlRef = useRef<string | null>(null)
  const isUploadingRef = useRef(false)

  // Cleanup preview URL and upload timers on unmount
  useEffect(() => {
    const timers = uploadTimersRef.current
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
      if (timers.interval) {
        clearInterval(timers.interval)
      }
      if (timers.timeout) {
        clearTimeout(timers.timeout)
      }
    }
  }, [])

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return t('validation.scoresheetUpload.invalidFileType')
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return t('validation.scoresheetUpload.fileTooLarge')
      }
      return null
    },
    [t]
  )

  const simulateUpload = useCallback((file: File) => {
    if (uploadTimersRef.current.interval) {
      clearInterval(uploadTimersRef.current.interval)
    }
    if (uploadTimersRef.current.timeout) {
      clearTimeout(uploadTimersRef.current.timeout)
    }

    isUploadingRef.current = true
    setUploadState('uploading')
    setUploadProgress(0)
    onScoresheetChangeRef.current?.(file, false)

    uploadTimersRef.current.interval = setInterval(() => {
      setUploadProgress((p) => {
        if (p >= PROGRESS_STOP_THRESHOLD) {
          if (uploadTimersRef.current.interval) {
            clearInterval(uploadTimersRef.current.interval)
          }
          return p
        }
        return p + PROGRESS_INCREMENT_PERCENT
      })
    }, SIMULATED_UPLOAD_DURATION_MS / PROGRESS_STEPS)

    uploadTimersRef.current.timeout = setTimeout(() => {
      if (uploadTimersRef.current.interval) {
        clearInterval(uploadTimersRef.current.interval)
      }
      setUploadProgress(PROGRESS_COMPLETE)
      setUploadState('complete')
      isUploadingRef.current = false
      onScoresheetChangeRef.current?.(file, true)
    }, SIMULATED_UPLOAD_DURATION_MS)
  }, [])

  const handleFileSelect = useCallback(
    (file: File) => {
      if (isUploadingRef.current) return

      const error = validateFile(file)
      if (error) {
        setErrorMessage(error)
        return
      }

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }

      setErrorMessage(null)
      const newPreviewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      previewUrlRef.current = newPreviewUrl
      setSelectedFile({
        file,
        previewUrl: newPreviewUrl,
      })
      simulateUpload(file)
    },
    [validateFile, simulateUpload]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileSelect(file)
      e.target.value = ''
    },
    [handleFileSelect]
  )

  const resetState = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    if (uploadTimersRef.current.interval) {
      clearInterval(uploadTimersRef.current.interval)
    }
    if (uploadTimersRef.current.timeout) {
      clearTimeout(uploadTimersRef.current.timeout)
    }
    isUploadingRef.current = false
    setSelectedFile(null)
    setUploadState('idle')
    setUploadProgress(0)
    setErrorMessage(null)
    onScoresheetChangeRef.current?.(null, false)
  }, [])

  const handleReplace = useCallback(() => {
    resetState()
    fileInputRef.current?.click()
  }, [resetState])

  return {
    selectedFile,
    uploadState,
    errorMessage,
    uploadProgress,
    fileInputRef,
    cameraInputRef,
    handleInputChange,
    handleReplace,
    resetState,
  }
}
