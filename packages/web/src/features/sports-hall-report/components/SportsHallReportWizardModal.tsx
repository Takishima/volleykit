import { useState, useCallback, useEffect } from 'react'

import type { Assignment } from '@/api/client'
import { Button } from '@/shared/components/Button'
import { FileText, CheckCircle } from '@/shared/components/icons'
import { Modal } from '@/shared/components/Modal'
import { ModalFooter } from '@/shared/components/ModalFooter'
import { ModalHeader } from '@/shared/components/ModalHeader'
import { ToggleSwitch } from '@/shared/components/ToggleSwitch'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { toast } from '@/shared/stores/toast'
import { createLogger } from '@/shared/utils/logger'
import type { Language } from '@/shared/utils/pdf-form-filler'

const log = createLogger('SportsHallReportWizardModal')

const MODAL_TITLE_ID = 'sports-hall-report-wizard-title'

const LANGUAGES: ReadonlyArray<{ code: Language; name: string }> = [
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
]

interface SportsHallReportWizardModalProps {
  assignment: Assignment
  isOpen: boolean
  onClose: () => void
  defaultLanguage: Language
}

export function SportsHallReportWizardModal({
  assignment,
  isOpen,
  onClose,
  defaultLanguage,
}: SportsHallReportWizardModalProps) {
  const { t } = useTranslation()
  const [language, setLanguage] = useState<Language>(defaultLanguage)
  const [confirmed, setConfirmed] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLanguage(defaultLanguage)
      setConfirmed(false)
      setIsGenerating(false)
    }
  }, [isOpen, defaultLanguage])

  const generateReport = useCallback(
    async (
      downloadFn: typeof import('@/shared/utils/pdf-form-filler')['generateAndDownloadWizardReport'],
      successMessage: string
    ) => {
      if (isGenerating) return
      setIsGenerating(true)
      try {
        const { extractSportsHallReportData, getLeagueCategoryFromAssignment } = await import(
          '@/shared/utils/pdf-form-filler'
        )

        const reportData = extractSportsHallReportData(assignment)
        const leagueCategory = getLeagueCategoryFromAssignment(assignment)

        if (!reportData || !leagueCategory) {
          log.error('Failed to extract report data for:', assignment.__identity)
          toast.error(t('pdf.exportError'))
          return
        }

        await downloadFn(reportData, leagueCategory, language)
        log.debug('Generated PDF report for:', assignment.__identity)
        toast.success(successMessage)
        onClose()
      } catch (error) {
        log.error('PDF generation failed:', error)
        toast.error(t('pdf.exportError'))
      } finally {
        setIsGenerating(false)
      }
    },
    [isGenerating, assignment, language, onClose, t]
  )

  const handleGenerate = useCallback(async () => {
    if (!confirmed) return
    const { generateAndDownloadWizardReport } = await import('@/shared/utils/pdf-form-filler')
    await generateReport(generateAndDownloadWizardReport, t('pdf.wizard.reportGenerated'))
  }, [confirmed, generateReport, t])

  const handleDownloadPreFilled = useCallback(async () => {
    const { generateAndDownloadSportsHallReport } = await import('@/shared/utils/pdf-form-filler')
    await generateReport(generateAndDownloadSportsHallReport, t('assignments.reportGenerated'))
  }, [generateReport, t])

  const homeTeam = assignment.refereeGame?.game?.encounter?.teamHome?.name ?? ''
  const awayTeam = assignment.refereeGame?.game?.encounter?.teamAway?.name ?? ''
  const subtitle = homeTeam && awayTeam ? `${homeTeam} vs ${awayTeam}` : undefined

  const pdfIcon = (
    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      titleId={MODAL_TITLE_ID}
      size="sm"
      isLoading={isGenerating}
    >
      <ModalHeader
        title={t('pdf.wizard.title')}
        titleId={MODAL_TITLE_ID}
        titleSize="lg"
        icon={pdfIcon}
        subtitle={subtitle}
        onClose={onClose}
      />

      {/* Language selection */}
      <fieldset className="mb-5">
        <legend className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2">
          {t('pdf.selectLanguage')}
        </legend>
        <div className="flex gap-2">
          {LANGUAGES.map(({ code, name }) => (
            <label
              key={code}
              className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                language === code
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-text-primary dark:text-text-primary-dark'
                  : 'border-border-default dark:border-border-default-dark text-text-secondary dark:text-text-secondary-dark hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark'
              }`}
            >
              <input
                type="radio"
                name="report-lang"
                value={code}
                checked={language === code}
                onChange={() => setLanguage(code)}
                className="sr-only"
                disabled={isGenerating}
              />
              {name}
            </label>
          ))}
        </div>
      </fieldset>

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
                <ul className="mt-3 space-y-1.5">
                  <ConfirmItem label={t('pdf.wizard.allCheckpointsOk')} />
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Download pre-filled fallback (game data only, no checkpoints) */}
      <div className="mb-5">
        <button
          type="button"
          onClick={handleDownloadPreFilled}
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
          onClick={handleGenerate}
          disabled={!confirmed || isGenerating}
        >
          {isGenerating ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              {t('pdf.generating')}
            </>
          ) : (
            t('pdf.wizard.generate')
          )}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

function ConfirmItem({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm text-success-700 dark:text-success-400">
      <CheckCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </li>
  )
}
