import { useState, useCallback, useEffect } from 'react'

import type { Assignment } from '@/api/client'
import { AlertTriangle, FileText } from '@/shared/components/icons'
import { Modal } from '@/shared/components/Modal'
import { ModalHeader } from '@/shared/components/ModalHeader'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { useSettingsStore } from '@/shared/stores/settings'
import { createLogger } from '@/shared/utils/logger'
import type { JerseyAdvertisingOptions } from '@/shared/utils/pdf-form-filler'
import type { Language } from '@/shared/utils/pdf-report-data'

import { HappyPathContent } from './HappyPathContent'
import { NonConformantOverlay } from './NonConformantOverlay'
import { SignatureCanvas } from './SignatureCanvas'
import { useNonConformantWizard } from '../hooks/useNonConformantWizard'
import { usePdfGeneration } from '../hooks/usePdfGeneration'

const log = createLogger('SportsHallReportWizardModal')

const MODAL_TITLE_ID = 'sports-hall-report-wizard-title'

type WizardMode = 'happy' | 'non-conformant'

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
  const isNonConformantEnabled = useSettingsStore((s) => s.isNonConformantEnabled)

  // Shared state
  const [language, setLanguage] = useState<Language>(defaultLanguage)
  const [mode, setMode] = useState<WizardMode>('happy')
  const [jerseyAdvertising, setJerseyAdvertising] = useState<JerseyAdvertisingOptions>({
    homeTeam: true,
    awayTeam: true,
  })

  // Happy path state
  const [confirmed, setConfirmed] = useState(false)
  const [showSignature, setShowSignature] = useState(false)
  const [isGeneratingHappy, setIsGeneratingHappy] = useState(false)

  // Derived from assignment — single source of truth
  const homeTeam = assignment.refereeGame?.game?.encounter?.teamHome?.name ?? ''
  const awayTeam = assignment.refereeGame?.game?.encounter?.teamAway?.name ?? ''
  const subtitle = homeTeam && awayTeam ? `${homeTeam} vs ${awayTeam}` : undefined
  const firstRefereeName =
    assignment.refereeGame?.activeRefereeConvocationFirstHeadReferee?.indoorAssociationReferee
      ?.indoorReferee?.person?.displayName
  const secondRefereeName =
    assignment.refereeGame?.activeRefereeConvocationSecondHeadReferee?.indoorAssociationReferee
      ?.indoorReferee?.person?.displayName

  // Non-conformant hook (shares jerseyAdvertising from modal level)
  const nc = useNonConformantWizard(assignment, language, jerseyAdvertising, onClose)
  const { loadSections, reset: resetNc, handleNcBack: ncBack } = nc

  // Happy path PDF generation
  const pdf = usePdfGeneration(assignment, language, jerseyAdvertising, onClose)

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

  const isGenerating = mode === 'happy' ? isGeneratingHappy : nc.isGenerating

  // Jersey advertising toggle handlers (shared across modes)
  const handleToggleHomeAd = useCallback(() => {
    setJerseyAdvertising((prev) => ({ ...prev, homeTeam: !prev.homeTeam }))
  }, [])

  const handleToggleAwayAd = useCallback(() => {
    setJerseyAdvertising((prev) => ({ ...prev, awayTeam: !prev.awayTeam }))
  }, [])

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
        await pdf.generateHappyPath(signatureDataUrl)
      } catch (error) {
        log.error('PDF generation failed:', error)
      } finally {
        setIsGeneratingHappy(false)
      }
    },
    [pdf]
  )

  const handleSignatureCancel = useCallback(() => {
    setShowSignature(false)
  }, [])

  const handleDownloadPreFilled = useCallback(async () => {
    if (isGeneratingHappy) return
    setIsGeneratingHappy(true)
    try {
      await pdf.downloadPreFilled()
    } catch (error) {
      log.error('PDF generation failed:', error)
    } finally {
      setIsGeneratingHappy(false)
    }
  }, [isGeneratingHappy, pdf])

  // ─── Mode handlers ─────────────────────────────────────────────────

  const handleEnterNonConformant = useCallback(() => {
    setMode('non-conformant')
    resetNc()
  }, [resetNc])

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
          onToggleHomeAd={handleToggleHomeAd}
          onToggleAwayAd={handleToggleAwayAd}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          onGenerate={handleGenerate}
          onDownloadPreFilled={handleDownloadPreFilled}
          onReportIssue={isNonConformantEnabled ? handleEnterNonConformant : undefined}
          onClose={onClose}
        />
      </Modal>

      {isOpen && mode === 'non-conformant' && (
        <NonConformantOverlay
          nc={nc}
          language={language}
          setLanguage={setLanguage}
          jerseyAdvertising={jerseyAdvertising}
          onToggleHomeAd={handleToggleHomeAd}
          onToggleAwayAd={handleToggleAwayAd}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          firstRefereeName={firstRefereeName}
          secondRefereeName={secondRefereeName}
          subtitle={subtitle}
          icon={pdfIcon}
          onClose={onClose}
          onBack={handleNcBack}
        />
      )}

      {showSignature && (
        <SignatureCanvas onComplete={handleSignatureComplete} onCancel={handleSignatureCancel} />
      )}
    </>
  )
}
