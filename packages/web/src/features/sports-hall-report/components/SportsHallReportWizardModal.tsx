import { useState, useCallback, useEffect } from 'react'

import type { Assignment } from '@/api/client'
import { Button } from '@/shared/components/Button'
import { FileText, CheckCircle, XCircle } from '@/shared/components/icons'
import { Modal } from '@/shared/components/Modal'
import { ModalFooter } from '@/shared/components/ModalFooter'
import { ModalHeader } from '@/shared/components/ModalHeader'
import { ToggleSwitch } from '@/shared/components/ToggleSwitch'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { toast } from '@/shared/stores/toast'
import { createLogger } from '@/shared/utils/logger'
import type {
  JerseyAdvertisingOptions,
  Language,
  LeagueCategory,
  SportsHallReportData,
} from '@/shared/utils/pdf-form-filler'

import { SignatureCanvas } from './SignatureCanvas'

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

/**
 * Extract report data and league category from an assignment.
 * Returns null if the assignment doesn't have the required data.
 */
async function extractReportInfo(assignment: Assignment): Promise<{
  reportData: SportsHallReportData
  leagueCategory: LeagueCategory
} | null> {
  const { extractSportsHallReportData, getLeagueCategoryFromAssignment } =
    await import('@/shared/utils/pdf-form-filler')

  const reportData = extractSportsHallReportData(assignment)
  const leagueCategory = getLeagueCategoryFromAssignment(assignment)

  if (!reportData || !leagueCategory) return null
  return { reportData, leagueCategory }
}

export function SportsHallReportWizardModal({
  assignment,
  isOpen,
  onClose,
  defaultLanguage,
}: SportsHallReportWizardModalProps) {
  const { t, tInterpolate } = useTranslation()
  const [language, setLanguage] = useState<Language>(defaultLanguage)
  const [confirmed, setConfirmed] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showSignature, setShowSignature] = useState(false)
  const [jerseyAdvertising, setJerseyAdvertising] = useState<JerseyAdvertisingOptions>({
    homeTeam: true,
    awayTeam: true,
  })

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLanguage(defaultLanguage)
      setConfirmed(false)
      setIsGenerating(false)
      setShowSignature(false)
      setJerseyAdvertising({ homeTeam: true, awayTeam: true })
    }
  }, [isOpen, defaultLanguage])

  // "Generate" now opens the signature canvas instead of generating immediately
  const handleGenerate = useCallback(() => {
    if (!confirmed) return
    setShowSignature(true)
  }, [confirmed])

  const handleSignatureComplete = useCallback(
    async (signatureDataUrl: string) => {
      setShowSignature(false)
      setIsGenerating(true)
      try {
        const info = await extractReportInfo(assignment)
        if (!info) {
          log.error('Failed to extract report data for:', assignment.__identity)
          toast.error(t('pdf.exportError'))
          return
        }

        const { generateWizardReportBytes } = await import('@/shared/utils/pdf-form-filler')

        const { pdfBytes, filename } = await generateWizardReportBytes({
          data: info.reportData,
          leagueCategory: info.leagueCategory,
          language,
          signatureDataUrl,
          jerseyAdvertising,
        })

        const { downloadPdf } = await import('@/shared/utils/pdf-form-filler')
        downloadPdf(pdfBytes, filename)

        log.debug('Generated signed PDF report for:', assignment.__identity)
        toast.success(t('pdf.wizard.reportGenerated'))
        onClose()
      } catch (error) {
        log.error('PDF generation failed:', error)
        toast.error(t('pdf.exportError'))
      } finally {
        setIsGenerating(false)
      }
    },
    [assignment, language, jerseyAdvertising, onClose, t]
  )

  const handleSignatureCancel = useCallback(() => {
    setShowSignature(false)
  }, [])

  const handleDownloadPreFilled = useCallback(async () => {
    if (isGenerating) return
    setIsGenerating(true)
    try {
      const info = await extractReportInfo(assignment)
      if (!info) {
        log.error('Failed to extract report data for:', assignment.__identity)
        toast.error(t('pdf.exportError'))
        return
      }

      const { generateAndDownloadSportsHallReport } = await import('@/shared/utils/pdf-form-filler')
      await generateAndDownloadSportsHallReport(info.reportData, info.leagueCategory, language)
      log.debug('Generated PDF report for:', assignment.__identity)
      toast.success(t('assignments.reportGenerated'))
      onClose()
    } catch (error) {
      log.error('PDF generation failed:', error)
      toast.error(t('pdf.exportError'))
    } finally {
      setIsGenerating(false)
    }
  }, [isGenerating, assignment, language, onClose, t])

  const homeTeam = assignment.refereeGame?.game?.encounter?.teamHome?.name ?? ''
  const awayTeam = assignment.refereeGame?.game?.encounter?.teamAway?.name ?? ''
  const subtitle = homeTeam && awayTeam ? `${homeTeam} vs ${awayTeam}` : undefined

  const pdfIcon = (
    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
    </div>
  )

  return (
    <>
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
                  <div className="mt-3 space-y-2.5">
                    <div className="space-y-1.5">
                      <JerseyAdToggle
                        label={tInterpolate('pdf.wizard.advertisingTeam', { team: homeTeam || '–' })}
                        checked={jerseyAdvertising.homeTeam}
                        onChange={() =>
                          setJerseyAdvertising((prev) => ({ ...prev, homeTeam: !prev.homeTeam }))
                        }
                        disabled={isGenerating}
                      />
                      <JerseyAdToggle
                        label={tInterpolate('pdf.wizard.advertisingTeam', { team: awayTeam || '–' })}
                        checked={jerseyAdvertising.awayTeam}
                        onChange={() =>
                          setJerseyAdvertising((prev) => ({ ...prev, awayTeam: !prev.awayTeam }))
                        }
                        disabled={isGenerating}
                      />
                    </div>
                  </div>
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
      </Modal>

      {showSignature && (
        <SignatureCanvas onComplete={handleSignatureComplete} onCancel={handleSignatureCancel} />
      )}
    </>
  )
}

function JerseyAdToggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string
  checked: boolean
  onChange: () => void
  disabled: boolean
}) {
  const Icon = checked ? CheckCircle : XCircle
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      title={label}
      className={`flex items-center gap-2 min-w-0 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        checked
          ? 'text-success-700 dark:text-success-400'
          : 'text-red-600 dark:text-red-400'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </button>
  )
}
