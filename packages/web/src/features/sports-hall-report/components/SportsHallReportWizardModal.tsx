import { useState, useCallback, useEffect, useMemo } from 'react'

import type { Assignment } from '@/api/client'
import { Button } from '@/shared/components/Button'
import { AlertTriangle, FileText, CheckCircle, XCircle } from '@/shared/components/icons'
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
  NonConformantSelections,
  NonConformantSignatures,
  ChecklistSection,
} from '@/shared/utils/pdf-form-filler'

import { CommentStep } from './CommentStep'
import { PdfPreview } from './PdfPreview'
import { SectionSelector } from './SectionSelector'
import { SignatureCanvas } from './SignatureCanvas'
import { SignatureCollectionStep } from './SignatureCollectionStep'
import { SubItemSelector } from './SubItemSelector'
import { WizardStepIndicator } from './WizardStepIndicator'

const log = createLogger('SportsHallReportWizardModal')

const MODAL_TITLE_ID = 'sports-hall-report-wizard-title'

const LANGUAGES: ReadonlyArray<{ code: Language; name: string }> = [
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
]

type WizardMode = 'happy' | 'non-conformant'
type NonConformantStep = 'sections' | 'subItems' | 'comment' | 'preview' | 'signatures'

const NC_STEPS: NonConformantStep[] = ['sections', 'subItems', 'comment', 'preview', 'signatures']

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
  const { t, tInterpolate } = useTranslation()

  // Shared state
  const [language, setLanguage] = useState<Language>(defaultLanguage)
  const [isGenerating, setIsGenerating] = useState(false)
  const [mode, setMode] = useState<WizardMode>('happy')

  // Happy path state
  const [confirmed, setConfirmed] = useState(false)
  const [showSignature, setShowSignature] = useState(false)
  const [jerseyAdvertising, setJerseyAdvertising] = useState<JerseyAdvertisingOptions>({
    homeTeam: true,
    awayTeam: true,
  })

  // Non-conformant state
  const [ncStep, setNcStep] = useState<NonConformantStep>('sections')
  const [checklistSections, setChecklistSections] = useState<readonly ChecklistSection[]>([])
  const [flaggedSections, setFlaggedSections] = useState<Set<string>>(new Set())
  const [nonConformantSubItems, setNonConformantSubItems] = useState<NonConformantSelections>({})
  const [comment, setComment] = useState('')
  const [previewPdfBytes, setPreviewPdfBytes] = useState<Uint8Array | null>(null)
  const [signatures, setSignatures] = useState<NonConformantSignatures>({})
  const [showAwayCoach, setShowAwayCoach] = useState(false)

  // Load checklist sections when modal opens
  useEffect(() => {
    if (!isOpen) return

    async function loadSections() {
      const info = await extractReportInfo(assignment)
      if (!info) return
      const { getChecklistSections } = await import('@/shared/utils/pdf-form-filler')
      setChecklistSections(getChecklistSections(info.leagueCategory))
    }

    void loadSections()
  }, [isOpen, assignment])

  // Reset all state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLanguage(defaultLanguage)
      setConfirmed(false)
      setIsGenerating(false)
      setShowSignature(false)
      setJerseyAdvertising({ homeTeam: true, awayTeam: true })
      setMode('happy')
      setNcStep('sections')
      setFlaggedSections(new Set())
      setNonConformantSubItems({})
      setComment('')
      setPreviewPdfBytes(null)
      setSignatures({})
      setShowAwayCoach(false)
    }
  }, [isOpen, defaultLanguage])

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

  // ─── Happy path handlers ───────────────────────────────────────────

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
      setIsGenerating(false)
    }
  }, [isGenerating, assignment, language, onClose, t])

  // ─── Non-conformant handlers ───────────────────────────────────────

  const handleToggleSection = useCallback((sectionId: string) => {
    setFlaggedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }, [])

  const handleToggleSubItem = useCallback((sectionId: string, subItemId: string) => {
    setNonConformantSubItems((prev) => {
      const sectionSet = new Set(prev[sectionId])
      if (sectionSet.has(subItemId)) {
        sectionSet.delete(subItemId)
      } else {
        sectionSet.add(subItemId)
      }
      return { ...prev, [sectionId]: sectionSet }
    })
  }, [])

  const handleEnterNonConformant = useCallback(() => {
    setMode('non-conformant')
    setNcStep('sections')
  }, [])

  const handleNcBack = useCallback(() => {
    const idx = NC_STEPS.indexOf(ncStep)
    if (idx <= 0) {
      setMode('happy')
    } else {
      setNcStep(NC_STEPS[idx - 1]!)
    }
  }, [ncStep])

  const handleNcNext = useCallback(async () => {
    const idx = NC_STEPS.indexOf(ncStep)

    // When moving from sections to subItems, auto-flag all sub-items in flagged sections
    if (ncStep === 'sections') {
      // Pre-populate: for each flagged section, if no sub-items are explicitly selected yet,
      // flag all of them (user can then un-flag the ones that are OK)
      setNonConformantSubItems((prev) => {
        const updated = { ...prev }
        for (const sectionId of flaggedSections) {
          if (!updated[sectionId] || updated[sectionId].size === 0) {
            const section = checklistSections.find((s) => s.id === sectionId)
            if (section) {
              updated[sectionId] = new Set(section.subItems.map((si) => si.id))
            }
          }
        }
        // Remove sub-items for sections that are no longer flagged
        for (const key of Object.keys(updated)) {
          if (!flaggedSections.has(key)) {
            delete updated[key]
          }
        }
        return updated
      })
    }

    // When entering preview step, generate the preview PDF
    if (NC_STEPS[idx + 1] === 'preview') {
      setIsGenerating(true)
      try {
        const info = await extractReportInfo(assignment)
        if (!info) {
          toast.error(t('pdf.exportError'))
          return
        }
        const { generateNonConformantPreviewBytes } = await import('@/shared/utils/pdf-form-filler')
        const { pdfBytes } = await generateNonConformantPreviewBytes(
          info.reportData,
          info.leagueCategory,
          language,
          nonConformantSubItems,
          comment
        )
        setPreviewPdfBytes(pdfBytes)
      } catch (error) {
        log.error('Preview generation failed:', error)
        toast.error(t('pdf.exportError'))
      } finally {
        setIsGenerating(false)
      }
    }

    if (idx < NC_STEPS.length - 1) {
      setNcStep(NC_STEPS[idx + 1]!)
    }
  }, [
    ncStep,
    flaggedSections,
    checklistSections,
    assignment,
    language,
    nonConformantSubItems,
    comment,
    t,
  ])

  const handleNcDownload = useCallback(async () => {
    setIsGenerating(true)
    try {
      const info = await extractReportInfo(assignment)
      if (!info) {
        toast.error(t('pdf.exportError'))
        return
      }
      const { generateNonConformantReportBytes, downloadPdf } =
        await import('@/shared/utils/pdf-form-filler')
      const { pdfBytes, filename } = await generateNonConformantReportBytes(
        info.reportData,
        info.leagueCategory,
        language,
        nonConformantSubItems,
        comment,
        signatures
      )
      downloadPdf(pdfBytes, filename)
      log.debug('Generated non-conformant PDF report for:', assignment.__identity)
      toast.success(t('pdf.wizard.reportGenerated'))
      onClose()
    } catch (error) {
      log.error('Non-conformant PDF generation failed:', error)
      toast.error(t('pdf.exportError'))
    } finally {
      setIsGenerating(false)
    }
  }, [assignment, language, nonConformantSubItems, comment, signatures, onClose, t])

  // ─── Non-conformant step validation ────────────────────────────────

  const ncStepIndex = NC_STEPS.indexOf(ncStep)

  const canProceed = useMemo(() => {
    switch (ncStep) {
      case 'sections':
        return flaggedSections.size > 0
      case 'subItems': {
        // At least one sub-item must be flagged across all flagged sections
        return Object.values(nonConformantSubItems).some((set) => set.size > 0)
      }
      case 'comment':
        return comment.trim().length > 0
      case 'preview':
        return !!previewPdfBytes
      case 'signatures': {
        // Need at least 1st referee + 2nd referee + 1 coach
        const hasFirstRef = !!signatures.firstReferee
        const hasSecondRef = !!signatures.secondReferee
        const hasCoach =
          !!signatures.homeTeamCoach?.signature || !!signatures.awayTeamCoach?.signature
        return hasFirstRef && hasSecondRef && hasCoach
      }
      default:
        return false
    }
  }, [ncStep, flaggedSections, nonConformantSubItems, comment, previewPdfBytes, signatures])

  const ncSteps = useMemo(
    () => [
      { label: t('pdf.wizard.nonConformant.stepSections') },
      { label: t('pdf.wizard.nonConformant.selectSubItems') },
      { label: t('pdf.wizard.nonConformant.stepComment') },
      { label: t('pdf.wizard.nonConformant.stepPreview') },
      { label: t('pdf.wizard.nonConformant.stepSign') },
    ],
    [t]
  )

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

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        titleId={MODAL_TITLE_ID}
        size={mode === 'non-conformant' ? 'md' : 'sm'}
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

        {mode === 'happy' ? (
          <HappyPathContent
            language={language}
            setLanguage={setLanguage}
            confirmed={confirmed}
            setConfirmed={setConfirmed}
            isGenerating={isGenerating}
            jerseyAdvertising={jerseyAdvertising}
            setJerseyAdvertising={setJerseyAdvertising}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            onGenerate={handleGenerate}
            onDownloadPreFilled={handleDownloadPreFilled}
            onReportIssue={handleEnterNonConformant}
            onClose={onClose}
          />
        ) : (
          <>
            <WizardStepIndicator steps={ncSteps} currentStep={ncStepIndex} />

            {/* Language selection (always visible in NC mode) */}
            {ncStep === 'sections' && (
              <LanguageSelector
                language={language}
                setLanguage={setLanguage}
                disabled={isGenerating}
              />
            )}

            {/* Step content */}
            <div className="mb-4 min-h-[200px]">
              {ncStep === 'sections' && (
                <SectionSelector
                  sections={checklistSections}
                  flaggedSections={flaggedSections}
                  onToggleSection={handleToggleSection}
                />
              )}
              {ncStep === 'subItems' && (
                <SubItemSelector
                  sections={checklistSections}
                  flaggedSections={flaggedSections}
                  nonConformantSubItems={nonConformantSubItems}
                  onToggleSubItem={handleToggleSubItem}
                />
              )}
              {ncStep === 'comment' && (
                <CommentStep
                  sections={checklistSections}
                  flaggedSections={flaggedSections}
                  comment={comment}
                  onCommentChange={setComment}
                />
              )}
              {ncStep === 'preview' && (
                <PdfPreview pdfBytes={previewPdfBytes} isLoading={isGenerating} />
              )}
              {ncStep === 'signatures' && (
                <SignatureCollectionStep
                  firstRefereeName={firstRefereeName}
                  secondRefereeName={secondRefereeName}
                  signatures={signatures}
                  onSignaturesChange={setSignatures}
                  showAwayCoach={showAwayCoach}
                  onToggleAwayCoach={() => setShowAwayCoach(true)}
                />
              )}
            </div>

            <ModalFooter>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={handleNcBack}
                disabled={isGenerating}
              >
                {t('pdf.wizard.nonConformant.back')}
              </Button>
              {ncStep === 'signatures' ? (
                <Button
                  variant="blue"
                  className="flex-1"
                  onClick={handleNcDownload}
                  disabled={!canProceed || isGenerating}
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
                    t('pdf.wizard.nonConformant.downloadFinal')
                  )}
                </Button>
              ) : (
                <Button
                  variant="blue"
                  className="flex-1"
                  onClick={handleNcNext}
                  disabled={!canProceed || isGenerating}
                >
                  {ncStep === 'preview'
                    ? t('pdf.wizard.nonConformant.confirmAndSign')
                    : t('pdf.wizard.nonConformant.next')}
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </Modal>

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
  onReportIssue: () => void
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

      {/* Report issue link */}
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

