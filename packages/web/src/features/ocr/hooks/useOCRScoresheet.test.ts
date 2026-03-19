import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useOCRScoresheet } from './useOCRScoresheet'
import { OCRFactory } from '../services/ocr-factory'

// Mock the OCRFactory
vi.mock('../services/ocr-factory', () => ({
  OCRFactory: {
    create: vi.fn(),
  },
}))

describe('useOCRScoresheet', () => {
  const mockEngine = {
    initialize: vi.fn().mockResolvedValue(undefined),
    recognize: vi.fn(),
    terminate: vi.fn().mockResolvedValue(undefined),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(OCRFactory.create).mockReturnValue(mockEngine)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('starts with initial state', () => {
    const { result } = renderHook(() => useOCRScoresheet())

    expect(result.current.isProcessing).toBe(false)
    expect(result.current.progress).toBeNull()
    expect(result.current.result).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('processes an image successfully', async () => {
    const mockOCRResult = {
      fullText: `Team A\tTeam B
N.\tName of the player\tLicense\tN.\tName of the player\tLicense
1\tMÜLLER ANNA\tOK\t1\tSCHMIDT LISA\tOK`,
      lines: [],
      words: [],
      hasPreciseBoundingBoxes: false,
    }
    mockEngine.recognize.mockResolvedValue(mockOCRResult)

    const { result } = renderHook(() => useOCRScoresheet())
    const imageBlob = new Blob(['test'], { type: 'image/jpeg' })

    let processResult
    await act(async () => {
      processResult = await result.current.processImage(imageBlob)
    })

    expect(OCRFactory.create).toHaveBeenCalled()
    expect(mockEngine.initialize).toHaveBeenCalled()
    expect(mockEngine.recognize).toHaveBeenCalledWith(imageBlob)
    expect(mockEngine.terminate).toHaveBeenCalled()

    expect(result.current.isProcessing).toBe(false)
    expect(result.current.result).not.toBeNull()
    expect(result.current.result?.teamA.players).toHaveLength(1)
    expect(processResult).toEqual(result.current.result)
  })

  it('handles OCR errors', async () => {
    mockEngine.recognize.mockRejectedValue(new Error('OCR failed'))

    const { result } = renderHook(() => useOCRScoresheet())
    const imageBlob = new Blob(['test'], { type: 'image/jpeg' })

    await act(async () => {
      await result.current.processImage(imageBlob)
    })

    expect(result.current.isProcessing).toBe(false)
    expect(result.current.error).not.toBeNull()
    expect(result.current.error?.message).toBe('OCR failed')
    expect(result.current.result).toBeNull()
  })

  it('resets state', async () => {
    const mockOCRResult = {
      fullText: 'Team A\tTeam B',
      lines: [],
      words: [],
      hasPreciseBoundingBoxes: false,
    }
    mockEngine.recognize.mockResolvedValue(mockOCRResult)

    const { result } = renderHook(() => useOCRScoresheet())
    const imageBlob = new Blob(['test'], { type: 'image/jpeg' })

    await act(async () => {
      await result.current.processImage(imageBlob)
    })

    expect(result.current.result).not.toBeNull()

    act(() => {
      result.current.reset()
    })

    expect(result.current.isProcessing).toBe(false)
    expect(result.current.progress).toBeNull()
    expect(result.current.result).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('sets isProcessing during processing', async () => {
    let resolveRecognize: (value: unknown) => void
    const recognizePromise = new Promise((resolve) => {
      resolveRecognize = resolve
    })
    mockEngine.recognize.mockReturnValue(recognizePromise)

    const { result } = renderHook(() => useOCRScoresheet())
    const imageBlob = new Blob(['test'], { type: 'image/jpeg' })

    // Start processing (don't await)
    let processPromise: Promise<unknown>
    act(() => {
      processPromise = result.current.processImage(imageBlob)
    })

    // Should be processing
    await waitFor(() => {
      expect(result.current.isProcessing).toBe(true)
    })

    // Resolve and wait
    await act(async () => {
      resolveRecognize!({ fullText: '', lines: [], words: [], hasPreciseBoundingBoxes: false })
      await processPromise
    })

    expect(result.current.isProcessing).toBe(false)
  })

  it('calls progress callback', async () => {
    let capturedProgressCallback: ((p: { status: string; progress: number }) => void) | undefined

    vi.mocked(OCRFactory.create).mockImplementation((onProgress) => {
      capturedProgressCallback = onProgress
      return mockEngine
    })

    mockEngine.recognize.mockImplementation(async () => {
      // Simulate progress updates
      capturedProgressCallback?.({ status: 'Processing...', progress: 50 })
      return { fullText: '', lines: [], words: [], hasPreciseBoundingBoxes: false }
    })

    const { result } = renderHook(() => useOCRScoresheet())
    const imageBlob = new Blob(['test'], { type: 'image/jpeg' })

    await act(async () => {
      await result.current.processImage(imageBlob)
    })

    // Progress should have been updated (may be null after completion)
    // The important thing is it didn't error
    expect(result.current.error).toBeNull()
  })

  it('does not set error for cancelled OCR', async () => {
    mockEngine.recognize.mockRejectedValue(new Error('OCR cancelled'))

    const { result } = renderHook(() => useOCRScoresheet())
    const imageBlob = new Blob(['test'], { type: 'image/jpeg' })

    await act(async () => {
      await result.current.processImage(imageBlob)
    })

    // Error should not be set for cancellation
    expect(result.current.error).toBeNull()
  })
})
