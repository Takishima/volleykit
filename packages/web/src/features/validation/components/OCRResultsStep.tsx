import type { ParsedGameSheet, OCRResult, PlayerComparisonResult } from '@/features/ocr'
import { CheckCircle } from '@/shared/components/icons'
import { useTranslation } from '@/shared/hooks/useTranslation'

import { CollapsibleSection } from './CollapsibleSection'
import { PlayerComparisonList } from './PlayerComparisonList'
import { RawOcrDataPanel } from './RawOcrDataPanel'

/** Comparison result for a single team */
export interface TeamComparison {
  teamName: string
  ocrTeamName: string
  playerResults: PlayerComparisonResult[]
  coachResults: PlayerComparisonResult[]
}

interface OCRResultsStepProps {
  homeComparison: TeamComparison | null
  awayComparison: TeamComparison | null
  rawOcrData: ParsedGameSheet | null
  storedOcrResult: OCRResult | null
  capturedImageUrl: string | null
  expandedSections: Set<string>
  onToggleSection: (sectionId: string) => void
}

/** Count discrepancies in comparison results */
function countDiscrepancies(results: PlayerComparisonResult[]) {
  const ocrOnly = results.filter((r) => r.status === 'ocr-only').length
  const rosterOnly = results.filter((r) => r.status === 'roster-only').length
  return ocrOnly + rosterOnly
}

/**
 * Results step for the OCR entry modal - shows comparison results for both teams.
 */
export function OCRResultsStep({
  homeComparison,
  awayComparison,
  rawOcrData,
  storedOcrResult,
  capturedImageUrl,
  expandedSections,
  onToggleSection,
}: OCRResultsStepProps) {
  const { t, tInterpolate } = useTranslation()

  const totalDiscrepancies =
    (homeComparison
      ? countDiscrepancies(homeComparison.playerResults) +
        countDiscrepancies(homeComparison.coachResults)
      : 0) +
    (awayComparison
      ? countDiscrepancies(awayComparison.playerResults) +
        countDiscrepancies(awayComparison.coachResults)
      : 0)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 text-success-600 dark:text-success-400 mb-4">
        <CheckCircle className="w-6 h-6" aria-hidden="true" />
        <span className="text-lg font-medium">{t('validation.ocr.scanComplete')}</span>
      </div>

      {totalDiscrepancies > 0 && (
        <div className="mb-4 p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
          <p className="text-sm text-warning-700 dark:text-warning-400">
            {tInterpolate('validation.ocr.discrepanciesFound', { count: totalDiscrepancies })}
          </p>
        </div>
      )}

      {/* Home Team Section */}
      {homeComparison && (
        <div className="mb-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
            {homeComparison.teamName}
            {homeComparison.ocrTeamName &&
              homeComparison.ocrTeamName !== homeComparison.teamName && (
                <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                  {tInterpolate('validation.ocr.ocrTeamLabel', {
                    name: homeComparison.ocrTeamName,
                  })}
                </span>
              )}
          </h3>

          {/* Home Players */}
          <CollapsibleSection
            title={t('validation.ocr.players')}
            count={homeComparison.playerResults.length}
            discrepancies={countDiscrepancies(homeComparison.playerResults)}
            expanded={expandedSections.has('home-players')}
            onToggle={() => onToggleSection('home-players')}
            sectionId="home-players"
          >
            <PlayerComparisonList
              results={homeComparison.playerResults}
              selectedPlayerIds={new Set()}
              onTogglePlayer={() => {}}
              readOnly
            />
          </CollapsibleSection>

          {/* Home Coaches */}
          {homeComparison.coachResults.length > 0 && (
            <CollapsibleSection
              title={t('validation.ocr.coaches')}
              count={homeComparison.coachResults.length}
              discrepancies={countDiscrepancies(homeComparison.coachResults)}
              expanded={expandedSections.has('home-coaches')}
              onToggle={() => onToggleSection('home-coaches')}
              sectionId="home-coaches"
            >
              <PlayerComparisonList
                results={homeComparison.coachResults}
                selectedPlayerIds={new Set()}
                onTogglePlayer={() => {}}
                readOnly
              />
            </CollapsibleSection>
          )}
        </div>
      )}

      {/* Away Team Section */}
      {awayComparison && (
        <div className="mb-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
            {awayComparison.teamName}
            {awayComparison.ocrTeamName &&
              awayComparison.ocrTeamName !== awayComparison.teamName && (
                <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                  {tInterpolate('validation.ocr.ocrTeamLabel', {
                    name: awayComparison.ocrTeamName,
                  })}
                </span>
              )}
          </h3>

          {/* Away Players */}
          <CollapsibleSection
            title={t('validation.ocr.players')}
            count={awayComparison.playerResults.length}
            discrepancies={countDiscrepancies(awayComparison.playerResults)}
            expanded={expandedSections.has('away-players')}
            onToggle={() => onToggleSection('away-players')}
            sectionId="away-players"
          >
            <PlayerComparisonList
              results={awayComparison.playerResults}
              selectedPlayerIds={new Set()}
              onTogglePlayer={() => {}}
              readOnly
            />
          </CollapsibleSection>

          {/* Away Coaches */}
          {awayComparison.coachResults.length > 0 && (
            <CollapsibleSection
              title={t('validation.ocr.coaches')}
              count={awayComparison.coachResults.length}
              discrepancies={countDiscrepancies(awayComparison.coachResults)}
              expanded={expandedSections.has('away-coaches')}
              onToggle={() => onToggleSection('away-coaches')}
              sectionId="away-coaches"
            >
              <PlayerComparisonList
                results={awayComparison.coachResults}
                selectedPlayerIds={new Set()}
                onTogglePlayer={() => {}}
                readOnly
              />
            </CollapsibleSection>
          )}
        </div>
      )}

      {/* Raw OCR Data Panel */}
      {rawOcrData && (
        <RawOcrDataPanel
          data={rawOcrData}
          ocrResult={storedOcrResult}
          imageUrl={capturedImageUrl}
          expanded={expandedSections.has('raw-ocr-data')}
          onToggle={() => onToggleSection('raw-ocr-data')}
        />
      )}
    </div>
  )
}
