import { Button } from '@/common/components/Button'
import { ModalFooter } from '@/common/components/ModalFooter'
import { useTranslation } from '@/common/hooks/useTranslation'
import type { JerseyAdvertisingOptions } from '@/common/utils/pdf-form-filler'
import type { Language } from '@/common/utils/pdf-report-data'

import { JerseyAdvertisingSection } from './JerseyAdvertisingSection'
import { LanguageSelector } from './LanguageSelector'

export interface JerseyAdProps {
  jerseyAdvertising: JerseyAdvertisingOptions
  onToggleHome: () => void
  onToggleAway: () => void
  homeTeam: string
  awayTeam: string
}

interface HappyPathContentProps {
  language: Language
  setLanguage: (lang: Language) => void
  isGenerating: boolean
  jerseyAd: JerseyAdProps
  onGenerate: () => void
  onDownloadPreFilled: () => void
  onReportIssue?: () => void
}

export function HappyPathContent({
  language,
  setLanguage,
  isGenerating,
  jerseyAd,
  onGenerate,
  onDownloadPreFilled,
  onReportIssue,
}: HappyPathContentProps) {
  const { t } = useTranslation()

  return (
    <>
      <LanguageSelector language={language} setLanguage={setLanguage} disabled={isGenerating} />

      {/* Jersey advertising — always visible */}
      <div className="mb-4">
        <p className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1.5">
          {t('pdf.wizard.advertisingLabel')}
        </p>
        <JerseyAdvertisingSection
          jerseyAdvertising={jerseyAd.jerseyAdvertising}
          onToggleHome={jerseyAd.onToggleHome}
          onToggleAway={jerseyAd.onToggleAway}
          homeTeam={jerseyAd.homeTeam}
          awayTeam={jerseyAd.awayTeam}
          disabled={isGenerating}
        />
      </div>

      {/* Download pre-filled fallback */}
      <div className="mb-5">
        <button
          type="button"
          onClick={onDownloadPreFilled}
          disabled={isGenerating}
          className="text-sm text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark underline underline-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('pdf.wizard.downloadPreFilled')}
        </button>
      </div>

      <ModalFooter>
        {onReportIssue && (
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onReportIssue}
            disabled={isGenerating}
            data-testid="report-issue-btn"
          >
            {t('pdf.wizard.nonConformant.reportIssue')}
          </Button>
        )}
        <Button
          variant="success"
          className="flex-1"
          onClick={onGenerate}
          disabled={isGenerating}
          data-testid="report-everything-ok"
        >
          {isGenerating ? (
            <>
              <span
                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
              {t('pdf.generating')}
            </>
          ) : (
            t('pdf.wizard.everythingOk')
          )}
        </Button>
      </ModalFooter>
    </>
  )
}
