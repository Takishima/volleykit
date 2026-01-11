import { create } from 'zustand'

import type { OCRResult } from '@/services/ocr/types'

/** Scoresheet types supported by the OCR */
export type SheetType = 'electronic' | 'manuscript'

/** Capture mode for manuscript sheets */
export type ManuscriptCaptureMode = 'full' | 'roster-only'

/** App states (screens) */
export type AppState =
  | 'select-type'
  | 'manuscript-options'
  | 'capture'
  | 'crop'
  | 'roster-crop'
  | 'processing'
  | 'results'
  | 'roster-display'

interface AppStoreState {
  // Current app state
  state: AppState

  // Selected sheet type
  sheetType: SheetType | null

  // Capture mode for manuscript sheets
  captureMode: ManuscriptCaptureMode | null

  // Captured image blob
  capturedImage: Blob | null

  // Cropped image blob (after user adjustment)
  croppedImage: Blob | null

  // OCR result
  ocrResult: OCRResult | null

  // Processing error
  error: string | null

  // Progress percentage (0-100)
  progress: number

  // Progress status message
  progressStatus: string
}

interface AppStoreActions {
  // State transitions
  selectSheetType: (type: SheetType) => void
  selectManuscriptMode: (mode: ManuscriptCaptureMode) => void
  setCapturedImage: (blob: Blob) => void
  setCroppedImage: (blob: Blob) => void
  setOcrResult: (result: OCRResult) => void
  setError: (error: string | null) => void
  setProgress: (progress: number, status?: string) => void

  // Navigation
  goToCapture: () => void
  goToCrop: () => void
  goToRosterCrop: () => void
  goToProcessing: () => void
  goToResults: () => void
  goToRosterDisplay: () => void
  goBack: () => void
  reset: () => void
}

const initialState: AppStoreState = {
  state: 'select-type',
  sheetType: null,
  captureMode: null,
  capturedImage: null,
  croppedImage: null,
  ocrResult: null,
  error: null,
  progress: 0,
  progressStatus: '',
}

export const useAppStore = create<AppStoreState & AppStoreActions>((set, get) => ({
  ...initialState,

  selectSheetType: (type) => {
    if (type === 'manuscript') {
      set({ sheetType: type, state: 'manuscript-options' })
    } else {
      set({ sheetType: type, state: 'capture' })
    }
  },

  selectManuscriptMode: (mode) => {
    set({ captureMode: mode, state: 'capture' })
  },

  setCapturedImage: (blob) => {
    set({ capturedImage: blob })
  },

  setCroppedImage: (blob) => {
    set({ croppedImage: blob })
  },

  setOcrResult: (result) => {
    set({ ocrResult: result })
  },

  setError: (error) => {
    set({ error })
  },

  setProgress: (progress, status) => {
    set({ progress, progressStatus: status ?? get().progressStatus })
  },

  goToCapture: () => {
    set({ state: 'capture' })
  },

  goToCrop: () => {
    set({ state: 'crop' })
  },

  goToRosterCrop: () => {
    set({ state: 'roster-crop' })
  },

  goToProcessing: () => {
    set({ state: 'processing', error: null, progress: 0, progressStatus: '' })
  },

  goToResults: () => {
    set({ state: 'results' })
  },

  goToRosterDisplay: () => {
    set({ state: 'roster-display' })
  },

  goBack: () => {
    const { state, sheetType } = get()

    switch (state) {
      case 'manuscript-options':
        set({ state: 'select-type', sheetType: null })
        break
      case 'capture':
        if (sheetType === 'manuscript') {
          set({ state: 'manuscript-options' })
        } else {
          set({ state: 'select-type', sheetType: null })
        }
        break
      case 'crop':
        set({ state: 'capture', capturedImage: null })
        break
      case 'roster-crop':
        set({ state: 'capture', capturedImage: null })
        break
      case 'processing':
        set({ state: 'crop', error: null })
        break
      case 'results':
        set({ state: 'select-type' })
        break
      case 'roster-display':
        set({ state: 'results' })
        break
      default:
        break
    }
  },

  reset: () => {
    // Revoke any object URLs to prevent memory leaks
    const { capturedImage, croppedImage } = get()
    if (capturedImage) {
      URL.revokeObjectURL(URL.createObjectURL(capturedImage))
    }
    if (croppedImage) {
      URL.revokeObjectURL(URL.createObjectURL(croppedImage))
    }

    set(initialState)
  },
}))
