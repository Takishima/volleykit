import { ChevronDown, ChevronUp } from '@/common/components/icons'
import { useTranslation } from '@/common/hooks/useTranslation'
import type { ParsedGameSheet, OCRResult } from '@/features/ocr'

import { OCRImageOverlay } from './OCRImageOverlay'
import { RawTeamData } from '../../roster/components/RawTeamData'

interface RawOcrDataPanelProps {
  data: ParsedGameSheet
  ocrResult: OCRResult | null
  imageUrl: string | null
  expanded: boolean
  onToggle: () => void
}

/**
 * Raw OCR data panel for debugging/transparency - shows image overlay and raw team data.
 */
export function RawOcrDataPanel({
  data,
  ocrResult,
  imageUrl,
  expanded,
  onToggle,
}: RawOcrDataPanelProps) {
  const { t } = useTranslation()
  const Icon = expanded ? ChevronUp : ChevronDown

  return (
    <div className="mt-6 pt-4 border-t border-border-default dark:border-border-default-dark">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between py-2 px-3 bg-surface-subtle dark:bg-surface-card-dark rounded-lg hover:bg-surface-muted dark:hover:bg-surface-muted-dark transition-colors"
        aria-expanded={expanded}
        aria-controls="raw-ocr-data"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-text-muted dark:text-text-muted-dark" aria-hidden="true" />
          <span className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
            {t('validation.ocr.rawData.title')}
          </span>
        </div>
      </button>
      {expanded && (
        <div id="raw-ocr-data" className="mt-3 space-y-4">
          {/* Image with bounding box overlay */}
          {imageUrl && ocrResult && (
            <OCRImageOverlay imageUrl={imageUrl} ocrResult={ocrResult} parsedData={data} />
          )}
          {/* Team A */}
          <RawTeamData team={data.teamA} label={t('validation.ocr.rawData.teamA')} />
          {/* Team B */}
          <RawTeamData team={data.teamB} label={t('validation.ocr.rawData.teamB')} />
        </div>
      )}
    </div>
  )
}
