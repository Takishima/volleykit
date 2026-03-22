import { Button } from '@/common/components/Button'
import { AlertTriangle } from '@/common/components/icons'
import { ModalFooter } from '@/common/components/ModalFooter'
import { ToggleSwitch } from '@/common/components/ToggleSwitch'
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
  confirmed: boolean
  setConfirmed: (fn: (prev: boolean) => boolean) => void
  isGenerating: boolean
  jerseyAd: JerseyAdProps
  onGenerate: () => void
  onDownloadPreFilled: () => void
  onReportIssue?: () => void
  onClose: () => void
}

export function HappyPathContent({
  language,
  setLanguage,
  confirmed,
  setConfirmed,
  isGenerating,
  jerseyAd,
  onGenerate,
  onDownloadPreFilled,
  onReportIssue,
  onClose,
}: HappyPathContentProps) {
  const { t } = useTranslation()

  return (
    <>
      <LanguageSelector language={language} setLanguage={setLanguage} disabled={isGenerating} />

      {/* Confirmation */}
      <div className="mb-5">
        <div
          className={`rounded-lg border p-4 transition-colors ${
            confirmed
              ? 'border-success-500 bg-success-50 dark:bg-success-900/20'
              : 'border-border-default dark:border-border-default-dark'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                  {t('pdf.wizard.confirmLabel')}
                </span>
                <ToggleSwitch
                  checked={confirmed}
                  onChange={() => setConfirmed((prev) => !prev)}
                  label={t('pdf.wizard.confirmLabel')}
                  variant="success"
                  disabled={isGenerating}
                />
              </div>
              {confirmed && (
                <div className="mt-3">
                  <JerseyAdvertisingSection
                    jerseyAdvertising={jerseyAd.jerseyAdvertising}
                    onToggleHome={jerseyAd.onToggleHome}
                    onToggleAway={jerseyAd.onToggleAway}
                    homeTeam={jerseyAd.homeTeam}
                    awayTeam={jerseyAd.awayTeam}
                    disabled={isGenerating}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Report issue link (only when non-conformant workflow is enabled) */}
      {onReportIssue && (
        <div className="mb-3">
          <button
            type="button"
            onClick={onReportIssue}
            disabled={isGenerating}
            className="flex items-center gap-1.5 text-sm text-warning-600 dark:text-warning-400 hover:text-warning-700 dark:hover:text-warning-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            {t('pdf.wizard.nonConformant.reportIssue')}
          </button>
        </div>
      )}

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
        <Button variant="secondary" className="flex-1" onClick={onClose} disabled={isGenerating}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="blue"
          className="flex-1"
          onClick={onGenerate}
          disabled={!confirmed || isGenerating}
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
            t('pdf.wizard.generate')
          )}
        </Button>
      </ModalFooter>
    </>
  )
}
