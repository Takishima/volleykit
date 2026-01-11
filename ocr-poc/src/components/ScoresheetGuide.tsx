/**
 * ScoresheetGuide Component
 *
 * Provides a visual overlay guide for framing scoresheets when capturing images.
 * Adapted from web-app version with hardcoded English text.
 */

import type { SheetType, ManuscriptCaptureMode } from '@/stores/appStore'

interface ScoresheetGuideProps {
  sheetType: SheetType
  captureMode: ManuscriptCaptureMode | null
}

const PERCENT_MULTIPLIER = 100

/**
 * Guide overlay dimensions for different scoresheet types.
 */
const GUIDE_CONFIG: Record<
  SheetType,
  Record<ManuscriptCaptureMode | 'default', { widthPercent: number; aspectRatio: number }>
> = {
  electronic: {
    default: { widthPercent: 0.7, aspectRatio: 4 / 5 },
    full: { widthPercent: 0.7, aspectRatio: 4 / 5 },
    'roster-only': { widthPercent: 0.7, aspectRatio: 4 / 5 },
  },
  manuscript: {
    default: { widthPercent: 0.9, aspectRatio: 4 / 5 },
    full: { widthPercent: 0.85, aspectRatio: 7 / 5 },
    'roster-only': { widthPercent: 0.9, aspectRatio: 4 / 5 },
  },
}

export function ScoresheetGuide({ sheetType, captureMode }: ScoresheetGuideProps) {
  const mode = captureMode ?? 'default'
  const config = GUIDE_CONFIG[sheetType][mode]

  const frameStyle = {
    width: `${config.widthPercent * PERCENT_MULTIPLIER}%`,
    aspectRatio: `${config.aspectRatio}`,
  }

  const hintText =
    sheetType === 'electronic'
      ? 'Align player list table within the frame'
      : 'Align roster section within the frame'

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Guide frame */}
      <div
        className="relative border-2 border-white/80 rounded-lg bg-transparent z-10"
        style={frameStyle}
      >
        {/* Corner markers */}
        <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
        <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
        <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
        <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />

        {/* Center crosshair */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-0.5 bg-white/50" />
          <div className="absolute w-0.5 h-8 bg-white/50" />
        </div>

        {/* Hint text at bottom */}
        <div className="absolute -bottom-10 left-0 right-0 text-center">
          <span className="text-sm text-white/90 bg-black/50 px-3 py-1 rounded-full">
            {hintText}
          </span>
        </div>
      </div>

      {/* Alignment instruction at top */}
      <div className="absolute top-4 left-0 right-0 text-center z-10">
        <span className="text-sm font-medium text-white/90 bg-black/50 px-4 py-2 rounded-lg">
          Align scoresheet within the frame
        </span>
      </div>
    </div>
  )
}
