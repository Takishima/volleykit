import { useState, useCallback, useRef, useMemo } from 'react'

import { Image } from '@/common/components/icons'
import { useTranslation } from '@/common/hooks/useTranslation'
import type { OCRResult, ParsedGameSheet } from '@/features/ocr'

interface OCRImageOverlayProps {
  imageUrl: string
  ocrResult: OCRResult
  parsedData: ParsedGameSheet
}

/**
 * OCR Image overlay component showing bounding boxes on the captured scoresheet image.
 */
export function OCRImageOverlay({ imageUrl, ocrResult, parsedData }: OCRImageOverlayProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [imageSize, setImageSize] = useState<{
    width: number
    height: number
  } | null>(null)
  const [containerWidth, setContainerWidth] = useState<number>(0)
  const [showOverlay, setShowOverlay] = useState(true)

  // Get all parsed names for highlighting
  const parsedNames = useMemo(() => {
    const names = new Set<string>()
    ;[...parsedData.teamA.players, ...parsedData.teamB.players].forEach((p) => {
      if (p.rawName) names.add(p.rawName.toLowerCase())
      if (p.displayName) names.add(p.displayName.toLowerCase())
      if (p.lastName) names.add(p.lastName.toLowerCase())
    })
    ;[...parsedData.teamA.officials, ...parsedData.teamB.officials].forEach((o) => {
      if (o.rawName) names.add(o.rawName.toLowerCase())
      if (o.displayName) names.add(o.displayName.toLowerCase())
      if (o.lastName) names.add(o.lastName.toLowerCase())
    })
    return names
  }, [parsedData])

  // Check if a word matches any parsed name
  const isMatchedWord = useCallback(
    (word: string) => {
      const lower = word.toLowerCase()
      return parsedNames.has(lower)
    },
    [parsedNames]
  )

  // Handle image load to get dimensions and container width
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
    // Get container width after image loads
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth)
    }
  }, [])

  // Calculate scale factor based on container width
  const scale = useMemo(() => {
    if (!imageSize || containerWidth === 0) return 1
    return containerWidth / imageSize.width
  }, [imageSize, containerWidth])

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Image className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t('validation.ocr.rawData.imageOverlay')}
          </span>
        </div>
        {ocrResult.hasPreciseBoundingBoxes && (
          <button
            type="button"
            onClick={() => setShowOverlay(!showOverlay)}
            className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {showOverlay
              ? t('validation.ocr.rawData.hideOverlay')
              : t('validation.ocr.rawData.showOverlay')}
          </button>
        )}
      </div>

      {/* Legend - only show when we have precise bounding boxes */}
      {ocrResult.hasPreciseBoundingBoxes && (
        <div className="flex items-center gap-4 mb-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border-2 border-success-500 bg-success-500/20" />
            <span className="text-gray-600 dark:text-gray-400">
              {t('validation.ocr.rawData.matchedWords')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border-2 border-gray-400 bg-gray-400/20" />
            <span className="text-gray-600 dark:text-gray-400">
              {t('validation.ocr.rawData.otherWords')}
            </span>
          </div>
        </div>
      )}

      {/* Image container */}
      <div
        ref={containerRef}
        className="relative overflow-auto max-h-96 rounded border border-gray-200 dark:border-gray-700"
      >
        <img
          src={imageUrl}
          alt={t('validation.ocr.rawData.capturedImage')}
          onLoad={handleImageLoad}
          className="w-full h-auto"
        />

        {/* Bounding box overlay - only show when we have precise bounding boxes */}
        {ocrResult.hasPreciseBoundingBoxes && showOverlay && imageSize && (
          <svg
            className="absolute top-0 left-0 pointer-events-none"
            style={{
              width: imageSize.width * scale,
              height: imageSize.height * scale,
            }}
            viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
            preserveAspectRatio="none"
          >
            {ocrResult.words.map((word) => {
              const isMatched = isMatchedWord(word.text)
              return (
                <g key={`${word.bbox.x0}-${word.bbox.y0}-${word.bbox.x1}-${word.bbox.y1}`}>
                  <rect
                    x={word.bbox.x0}
                    y={word.bbox.y0}
                    width={word.bbox.x1 - word.bbox.x0}
                    height={word.bbox.y1 - word.bbox.y0}
                    fill={isMatched ? 'rgba(34, 197, 94, 0.2)' : 'rgba(156, 163, 175, 0.15)'}
                    stroke={isMatched ? '#22c55e' : '#9ca3af'}
                    strokeWidth={isMatched ? 2 : 1}
                    rx={2}
                  />
                </g>
              )
            })}
          </svg>
        )}
      </div>

      {/* Word count info */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {ocrResult.words.length} {t('validation.ocr.rawData.wordsDetected')}
        {' • '}
        {ocrResult.words.filter((w) => isMatchedWord(w.text)).length}{' '}
        {t('validation.ocr.rawData.wordsMatched')}
      </div>

      {/* Raw OCR text - shown when bounding boxes are not precise */}
      {!ocrResult.hasPreciseBoundingBoxes && ocrResult.fullText && (
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {t('validation.ocr.rawData.rawText')}
            </span>
          </div>
          <pre className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-auto max-h-64 whitespace-pre-wrap break-words">
            {ocrResult.fullText}
          </pre>
        </div>
      )}
    </div>
  )
}
