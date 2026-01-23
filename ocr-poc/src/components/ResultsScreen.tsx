/**
 * ResultsScreen Component
 *
 * Displays the OCR processing results.
 */

import { useMemo, useState, useEffect } from 'react'

import { CheckCircle, RotateCcw, Copy, Check } from 'lucide-react'

import { useAppStore } from '@/stores/appStore'

/** Duration to show "Copied!" feedback in milliseconds */
const COPY_FEEDBACK_DURATION_MS = 2000

export function ResultsScreen() {
  const ocrResult = useAppStore((s) => s.ocrResult)
  const croppedImage = useAppStore((s) => s.croppedImage)
  const capturedImage = useAppStore((s) => s.capturedImage)
  const reset = useAppStore((s) => s.reset)

  const [copied, setCopied] = useState(false)

  // Create preview URL for the processed image
  const imageUrl = useMemo(() => {
    const image = croppedImage ?? capturedImage
    if (!image) {
      return null
    }
    return URL.createObjectURL(image)
  }, [croppedImage, capturedImage])

  // Cleanup object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [imageUrl])

  const handleCopy = async () => {
    if (!ocrResult?.fullText) {
      return
    }

    try {
      await navigator.clipboard.writeText(ocrResult.fullText)
      setCopied(true)
      setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (!ocrResult) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-slate-600">No results available</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Success header */}
      <div className="flex-shrink-0 bg-green-50 border-b border-green-100 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <h2 className="font-semibold text-green-900">OCR Complete</h2>
            <p className="text-sm text-green-700">
              Confidence: {Math.round(ocrResult.confidence ?? 0)}% •{' '}
              {ocrResult.processingTime ? `${(ocrResult.processingTime / 1000).toFixed(1)}s` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Image preview */}
        {imageUrl && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
              <h3 className="font-medium text-slate-700">Captured Image</h3>
            </div>
            <div className="p-4">
              <img
                src={imageUrl}
                alt="Processed scoresheet"
                className="max-w-full max-h-48 mx-auto rounded border border-slate-200"
              />
            </div>
          </div>
        )}

        {/* OCR Text */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-medium text-slate-700">Extracted Text</h3>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="p-4">
            <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono bg-slate-50 p-3 rounded border border-slate-200 max-h-64 overflow-auto">
              {ocrResult.fullText}
            </pre>
          </div>
        </div>

        {/* Line-by-line results */}
        {ocrResult.lines.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
              <h3 className="font-medium text-slate-700">Lines ({ocrResult.lines.length})</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {ocrResult.lines.map((line, index) => (
                <div
                  key={`${index}-${line.text.slice(0, 20)}`}
                  className="px-4 py-2 flex items-start gap-3"
                >
                  <span className="text-xs text-slate-400 font-mono w-6 text-right flex-shrink-0 pt-0.5">
                    {index + 1}
                  </span>
                  <span className="text-sm text-slate-700 flex-1">{line.text}</span>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {Math.round(line.confidence)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 p-4 bg-white border-t border-slate-200">
        <button
          type="button"
          onClick={reset}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Scan Another Scoresheet
        </button>
      </div>
    </div>
  )
}
