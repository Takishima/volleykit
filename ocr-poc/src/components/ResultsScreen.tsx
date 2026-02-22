/**
 * ResultsScreen Component
 *
 * Displays the OCR processing results including extracted text,
 * detected player lists, and raw Mistral JSON response.
 */

import { useMemo, useState, useEffect } from 'react'

import {
  CheckCircle,
  RotateCcw,
  Copy,
  Check,
  Users,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Code,
} from 'lucide-react'

import { parseGameSheetWithOCR } from '@/features/ocr/utils/player-list-parser'
import { useAppStore } from '@/stores/appStore'

import type { ParsedTeam } from '@/features/ocr/types'

/** Duration to show "Copied!" feedback in milliseconds */
const COPY_FEEDBACK_DURATION_MS = 2000

/**
 * Collapsible section wrapper for result panels
 */
function CollapsibleSection({
  title,
  icon: Icon,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 hover:bg-slate-100 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
        )}
        <Icon className="w-4 h-4 text-slate-600 flex-shrink-0" />
        <h3 className="font-medium text-slate-700 flex-1 text-left">{title}</h3>
        {badge && (
          <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </button>
      {isOpen && children}
    </div>
  )
}

/**
 * Displays a single team's player list
 */
function TeamPlayerList({ team, label }: { team: ParsedTeam; label: string }) {
  return (
    <div>
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
        <span className="text-sm font-medium text-slate-600">
          {label}: {team.name || 'Unknown'}
        </span>
        <span className="text-xs text-slate-400 ml-2">
          ({team.players.length} players, {team.officials.length} officials)
        </span>
      </div>

      {/* Players */}
      {team.players.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {team.players.map((player) => (
            <div
              key={`${player.shirtNumber ?? 'x'}-${player.rawName}`}
              className="px-4 py-1.5 flex items-center gap-3"
            >
              <span className="text-xs font-mono text-slate-400 w-6 text-right flex-shrink-0">
                {player.shirtNumber ?? '-'}
              </span>
              <span className="text-sm text-slate-700 flex-1">{player.displayName}</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  player.licenseStatus === 'OK'
                    ? 'bg-green-100 text-green-700'
                    : player.licenseStatus === 'NOT'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                }`}
              >
                {player.licenseStatus || '?'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-2 text-sm text-slate-400 italic">No players detected</div>
      )}

      {/* Officials */}
      {team.officials.length > 0 && (
        <>
          <div className="px-4 py-1 bg-slate-50 border-t border-slate-100">
            <span className="text-xs font-medium text-slate-500 uppercase">Officials</span>
          </div>
          <div className="divide-y divide-slate-100">
            {team.officials.map((official) => (
              <div
                key={`${official.role}-${official.rawName}`}
                className="px-4 py-1.5 flex items-center gap-3"
              >
                <span className="text-xs font-mono text-slate-400 w-6 text-right flex-shrink-0">
                  {official.role}
                </span>
                <span className="text-sm text-slate-700 flex-1">{official.displayName}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function ResultsScreen() {
  const ocrResult = useAppStore((s) => s.ocrResult)
  const croppedImage = useAppStore((s) => s.croppedImage)
  const capturedImage = useAppStore((s) => s.capturedImage)
  const sheetType = useAppStore((s) => s.sheetType)
  const reset = useAppStore((s) => s.reset)

  const [copied, setCopied] = useState(false)
  const [copiedJson, setCopiedJson] = useState(false)

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

  // Parse the OCR result into structured player data
  const parsedGameSheet = useMemo(() => {
    if (!ocrResult) {
      return null
    }
    try {
      return parseGameSheetWithOCR(ocrResult, {
        type: sheetType === 'manuscript' ? 'manuscript' : 'electronic',
      })
    } catch (err) {
      console.error('Failed to parse game sheet:', err)
      return null
    }
  }, [ocrResult, sheetType])

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

  const handleCopyJson = async () => {
    if (!ocrResult?.rawResponse) {
      return
    }

    try {
      await navigator.clipboard.writeText(ocrResult.rawResponse)
      setCopiedJson(true)
      setTimeout(() => setCopiedJson(false), COPY_FEEDBACK_DURATION_MS)
    } catch (err) {
      console.error('Failed to copy JSON:', err)
    }
  }

  if (!ocrResult) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-slate-600">No results available</p>
      </div>
    )
  }

  const totalPlayers =
    (parsedGameSheet?.teamA.players.length ?? 0) + (parsedGameSheet?.teamB.players.length ?? 0)

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

        {/* Detected Players */}
        {parsedGameSheet && (
          <CollapsibleSection
            title="Detected Players"
            icon={Users}
            badge={`${totalPlayers} players`}
            defaultOpen
          >
            <div className="divide-y divide-slate-200">
              <TeamPlayerList team={parsedGameSheet.teamA} label="Team A" />
              <TeamPlayerList team={parsedGameSheet.teamB} label="Team B" />
            </div>

            {/* Warnings */}
            {parsedGameSheet.warnings.length > 0 && (
              <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
                {parsedGameSheet.warnings.map((warning) => (
                  <div key={warning} className="flex items-start gap-2 text-xs text-amber-700">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>
        )}

        {/* OCR Text */}
        <CollapsibleSection title="Extracted Text" icon={Copy} defaultOpen={false}>
          <div className="px-4 py-2 flex justify-end border-b border-slate-100">
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
        </CollapsibleSection>

        {/* Raw JSON Response */}
        {ocrResult.rawResponse && (
          <CollapsibleSection title="Raw Mistral JSON" icon={Code} defaultOpen={false}>
            <div className="px-4 py-2 flex justify-end border-b border-slate-100">
              <button
                type="button"
                onClick={handleCopyJson}
                className="flex items-center gap-1 px-2 py-1 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
              >
                {copiedJson ? (
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
              <pre className="whitespace-pre-wrap text-xs text-slate-600 font-mono bg-slate-50 p-3 rounded border border-slate-200 max-h-96 overflow-auto">
                {ocrResult.rawResponse}
              </pre>
            </div>
          </CollapsibleSection>
        )}

        {/* Line-by-line results */}
        {ocrResult.lines.length > 0 && (
          <CollapsibleSection
            title="Lines"
            icon={Copy}
            badge={`${ocrResult.lines.length}`}
            defaultOpen={false}
          >
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
          </CollapsibleSection>
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
