import { useState, useCallback, useEffect } from 'react'

import { createPortal } from 'react-dom'

import type { Assignment } from '@/api/client'
import { Button } from '@/shared/components/Button'
import { AlertTriangle, FileText, CheckCircle, XCircle } from '@/shared/components/icons'
import { Modal } from '@/shared/components/Modal'
import { ModalFooter } from '@/shared/components/ModalFooter'
import { ModalHeader } from '@/shared/components/ModalHeader'
import { ToggleSwitch } from '@/shared/components/ToggleSwitch'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { useSettingsStore } from '@/shared/stores/settings'
import { toast } from '@/shared/stores/toast'
import { createLogger } from '@/shared/utils/logger'
import type {
  JerseyAdvertisingOptions,
  Language,
  LeagueCategory,
  SportsHallReportData,
} from '@/shared/utils/pdf-form-filler'

import { CommentStep } from './CommentStep'
import { PdfPreview } from './PdfPreview'
import { SectionSelector } from './SectionSelector'
import { SignatureCanvas } from './SignatureCanvas'
import { SignatureCollectionStep } from './SignatureCollectionStep'
import { SubItemSelector } from './SubItemSelector'
import { WizardStepIndicator } from './WizardStepIndicator'
import { useNonConformantWizard } from '../hooks/useNonConformantWizard'

const log = createLogger('SportsHallReportWizardModal')

const MODAL_TITLE_ID = 'sports-hall-report-wizard-title'

const LANGUAGES: ReadonlyArray<{ code: Language; name: string }> = [
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
]

type WizardMode = 'happy' | 'non-conformant'

interface SportsHallReportWizardModalProps {
  assignment: Assignment
  isOpen: boolean
  onClose: () => void
  defaultLanguage: Language
}

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
  const { t } = useTranslation()
  const isNonConformantEnabled = useSettingsStore((s) => s.isNonConformantEnabled)

  // Shared state
  const [language, setLanguage] = useState<Language>(defaultLanguage)
  const [mode, setMode] = useState<WizardMode>('happy')

  // Happy path state
  const [confirmed, setConfirmed] = useState(false)
  const [showSignature, setShowSignature] = useState(false)
  const [isGeneratingHappy, setIsGeneratingHappy] = useState(false)
  const [jerseyAdvertising, setJerseyAdvertising] = useState<JerseyAdvertisingOptions>({
    homeTeam: true,
    awayTeam: true,
  })

  // Non-conformant state (extracted hook)
  const nc = useNonConformantWizard(assignment, language, onClose)
  const { loadSections, reset: resetNc, setSectionComments } = nc

  // Load checklist sections when modal opens
  useEffect(() => {
    if (!isOpen) return
    loadSections().catch((error: unknown) => {
      log.error('Failed to load checklist sections:', error)
    })
  }, [isOpen, loadSections])

  // Reset all state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLanguage(defaultLanguage)
      setConfirmed(false)
      setIsGeneratingHappy(false)
      setShowSignature(false)
      setJerseyAdvertising({ homeTeam: true, awayTeam: true })
      setMode('happy')
      resetNc()
    }
  }, [isOpen, defaultLanguage, resetNc])

  // Derived
  const homeTeam = assignment.refereeGame?.game?.encounter?.teamHome?.name ?? ''
  const awayTeam = assignment.refereeGame?.game?.encounter?.teamAway?.name ?? ''
  const subtitle = homeTeam && awayTeam ? `${homeTeam} vs ${awayTeam}` : undefined
  const firstRefereeName =
    assignment.refereeGame?.activeRefereeConvocationFirstHeadReferee?.indoorAssociationReferee
      ?.indoorReferee?.person?.displayName
  const secondRefereeName =
    assignment.refereeGame?.activeRefereeConvocationSecondHeadReferee?.indoorAssociationReferee
      ?.indoorReferee?.person?.displayName

  const isGenerating = mode === 'happy' ? isGeneratingHappy : nc.isGenerating

  // Lock body scroll when non-conformant overlay is open
  useEffect(() => {
    if (!isOpen || mode !== 'non-conformant') return
    const prev = document.body.style.overflow
    const prevOverscroll = document.body.style.overscrollBehavior
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    return () => {
      document.body.style.overflow = prev
      document.body.style.overscrollBehavior = prevOverscroll
    }
  }, [isOpen, mode])

  // Stop all touch events from propagating through the React tree (same as SignatureCanvas)
  const stopPropagation = useCallback((e: React.TouchEvent) => {
    e.stopPropagation()
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation()
    // Allow touch on interactive elements (inputs, textareas, buttons, scrollable content)
    const target = e.target as HTMLElement
    if (
      target instanceof HTMLCanvasElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLInputElement
    )
      return
    // Allow scrolling within scrollable containers
    if (target.closest('[data-scrollable]')) return
    e.preventDefault()
  }, [])

  const handleSectionCommentChange = useCallback(
    (sectionId: string, value: string) => {
      setSectionComments((prev) => ({ ...prev, [sectionId]: value }))
    },
    [setSectionComments]
  )

  // ─── Happy path handlers ───────────────────────────────────────────

  const handleGenerate = useCallback(() => {
    if (!confirmed) return
    setShowSignature(true)
  }, [confirmed])

  const handleSignatureComplete = useCallback(
    async (signatureDataUrl: string) => {
      setShowSignature(false)
      setIsGeneratingHappy(true)
      try {
        const info = await extractReportInfo(assignment)
        if (!info) {
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
        setIsGeneratingHappy(false)
      }
    },
    [assignment, language, jerseyAdvertising, onClose, t]
  )

  const handleSignatureCancel = useCallback(() => {
    setShowSignature(false)
  }, [])

  const handleDownloadPreFilled = useCallback(async () => {
    if (isGeneratingHappy) return
    setIsGeneratingHappy(true)
    try {
      const info = await extractReportInfo(assignment)
      if (!info) {
        toast.error(t('pdf.exportError'))
        return
      }
      const { generateAndDownloadSportsHallReport } = await import('@/shared/utils/pdf-form-filler')
      await generateAndDownloadSportsHallReport(info.reportData, info.leagueCategory, language)
      toast.success(t('assignments.reportGenerated'))
      onClose()
    } catch (error) {
      log.error('PDF generation failed:', error)
      toast.error(t('pdf.exportError'))
    } finally {
      setIsGeneratingHappy(false)
    }
  }, [isGeneratingHappy, assignment, language, onClose, t])

  // ─── Mode handlers ─────────────────────────────────────────────────

  const handleEnterNonConformant = useCallback(() => {
    setMode('non-conformant')
    resetNc()
  }, [resetNc])

  const { handleNcBack: ncBack } = nc
  const handleNcBack = useCallback(() => {
    const result = ncBack()
    if (result === 'exit') {
      setMode('happy')
    }
  }, [ncBack])

  // ─── Render ────────────────────────────────────────────────────────

  const pdfIcon = (
    <div
      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
        mode === 'non-conformant'
          ? 'bg-warning-100 dark:bg-warning-900'
          : 'bg-blue-100 dark:bg-blue-900'
      }`}
    >
      {mode === 'non-conformant' ? (
        <AlertTriangle
          className="w-5 h-5 text-warning-600 dark:text-warning-400"
          aria-hidden="true"
        />
      ) : (
        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
      )}
    </div>
  )

  const modalTitle =
    mode === 'non-conformant' ? t('pdf.wizard.nonConformant.title') : t('pdf.wizard.title')

  // Non-conformant mode renders as a fullscreen portal overlay
  const nonConformantOverlay =
    isOpen && mode === 'non-conformant'
      ? createPortal(
          <div
            className="fixed inset-0 bg-surface-card dark:bg-surface-card-dark flex flex-col touch-none overscroll-none"
            style={{ zIndex: 60 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={MODAL_TITLE_ID}
            onTouchStart={stopPropagation}
            onTouchMove={handleTouchMove}
            onTouchEnd={stopPropagation}
          >
            {/* Header */}
            <div className="flex-shrink-0 px-4 pt-4 pb-2 safe-area-inset-top">
              <ModalHeader
                title={t('pdf.wizard.nonConformant.title')}
                titleId={MODAL_TITLE_ID}
                titleSize="lg"
                icon={pdfIcon}
                subtitle={subtitle}
                onClose={onClose}
              />
              <WizardStepIndicator steps={nc.ncSteps} currentStep={nc.ncStepIndex} />

              {nc.ncStep === 'sections' && (
                <LanguageSelector
                  language={language}
                  setLanguage={setLanguage}
                  disabled={nc.isGenerating}
                />
              )}
            </div>

            {/* Scrollable step content */}
            <div
              className="flex-1 overflow-y-auto px-4 py-2 touch-auto"
              data-scrollable
            >
              {nc.ncStep === 'sections' && (
                <SectionSelector
                  sections={nc.checklistSections}
                  flaggedSections={nc.flaggedSections}
                  onToggleSection={nc.handleToggleSection}
                />
              )}
              {nc.ncStep === 'subItems' && (
                <SubItemSelector
                  sections={nc.checklistSections}
                  flaggedSections={nc.flaggedSections}
                  nonConformantSubItems={nc.nonConformantSubItems}
                  onToggleSubItem={nc.handleToggleSubItem}
                />
              )}
              {nc.ncStep === 'comment' && (
                <CommentStep
                  sections={nc.checklistSections}
                  flaggedSections={nc.flaggedSections}
                  sectionComments={nc.sectionComments}
                  onSectionCommentChange={handleSectionCommentChange}
                />
              )}
              {nc.ncStep === 'preview' && (
                <PdfPreview pdfBytes={nc.previewPdfBytes} isLoading={nc.isGenerating} />
              )}
              {nc.ncStep === 'signatures' && (
                <SignatureCollectionStep
                  firstRefereeName={firstRefereeName}
                  secondRefereeName={secondRefereeName}
                  signatures={nc.signatures}
                  onSignaturesChange={nc.setSignatures}
                  showAwayCoach={nc.showAwayCoach}
                  onToggleAwayCoach={() => nc.setShowAwayCoach(true)}
                />
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-border-default dark:border-border-default-dark safe-area-inset-bottom">
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={handleNcBack}
                  disabled={nc.isGenerating}
                >
                  {t('pdf.wizard.nonConformant.back')}
                </Button>
                {nc.ncStep === 'signatures' ? (
                  <Button
                    variant="blue"
                    className="flex-1"
                    onClick={nc.handleNcDownload}
                    disabled={!nc.canProceed || nc.isGenerating}
                  >
                    {nc.isGenerating ? (
                      <>
                        <span
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                          aria-hidden="true"
                        />
                        {t('pdf.generating')}
                      </>
                    ) : (
                      t('pdf.wizard.nonConformant.downloadFinal')
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="blue"
                    className="flex-1"
                    onClick={nc.handleNcNext}
                    disabled={!nc.canProceed || nc.isGenerating}
                  >
                    {nc.ncStep === 'preview'
                      ? t('pdf.wizard.nonConformant.confirmAndSign')
                      : t('pdf.wizard.nonConformant.next')}
                  </Button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <>
      <Modal
        isOpen={isOpen && mode === 'happy'}
        onClose={onClose}
        titleId={MODAL_TITLE_ID}
        size="sm"
        isLoading={isGenerating}
      >
        <ModalHeader
          title={modalTitle}
          titleId={MODAL_TITLE_ID}
          titleSize="lg"
          icon={pdfIcon}
          subtitle={subtitle}
          onClose={onClose}
        />

        <HappyPathContent
          language={language}
          setLanguage={setLanguage}
          confirmed={confirmed}
          setConfirmed={setConfirmed}
          isGenerating={isGeneratingHappy}
          jerseyAdvertising={jerseyAdvertising}
          setJerseyAdvertising={setJerseyAdvertising}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          onGenerate={handleGenerate}
          onDownloadPreFilled={handleDownloadPreFilled}
          onReportIssue={isNonConformantEnabled ? handleEnterNonConformant : undefined}
          onClose={onClose}
        />
      </Modal>

      {nonConformantOverlay}

      {showSignature && (
        <SignatureCanvas onComplete={handleSignatureComplete} onCancel={handleSignatureCancel} />
      )}
    </>
  )
}

// ─── Sub-components ────────────────────────────────────────────────

function LanguageSelector({
  language,
  setLanguage,
  disabled,
}: {
  language: Language
  setLanguage: (lang: Language) => void
  disabled: boolean
}) {
  const { t } = useTranslation()

  return (
    <fieldset className="mb-4">
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
              disabled={disabled}
            />
            {name}
          </label>
        ))}
      </div>
    </fieldset>
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
      className={`flex w-full items-center gap-2 min-w-0 rounded-lg border py-2 px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked
          ? 'border-success-200 bg-success-50 text-success-700 hover:bg-success-100 dark:border-success-800 dark:bg-success-900/20 dark:text-success-400 dark:hover:bg-success-900/30'
          : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </button>
  )
}

interface HappyPathContentProps {
  language: Language
  setLanguage: (lang: Language) => void
  confirmed: boolean
  setConfirmed: (fn: (prev: boolean) => boolean) => void
  isGenerating: boolean
  jerseyAdvertising: JerseyAdvertisingOptions
  setJerseyAdvertising: React.Dispatch<React.SetStateAction<JerseyAdvertisingOptions>>
  homeTeam: string
  awayTeam: string
  onGenerate: () => void
  onDownloadPreFilled: () => void
  onReportIssue?: () => void
  onClose: () => void
}

function HappyPathContent({
  language,
  setLanguage,
  confirmed,
  setConfirmed,
  isGenerating,
  jerseyAdvertising,
  setJerseyAdvertising,
  homeTeam,
  awayTeam,
  onGenerate,
  onDownloadPreFilled,
  onReportIssue,
  onClose,
}: HappyPathContentProps) {
  const { t, tInterpolate } = useTranslation()

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
