import { useCallback, useEffect } from 'react'

import { createPortal } from 'react-dom'

import { Button } from '@/shared/components/Button'
import { ModalHeader } from '@/shared/components/ModalHeader'
import { useBodyScrollLock } from '@/shared/hooks/useBodyScrollLock'
import { useOverlayTouchGuard } from '@/shared/hooks/useOverlayTouchGuard'
import { useTranslation } from '@/shared/hooks/useTranslation'
import type { JerseyAdvertisingOptions } from '@/shared/utils/pdf-form-filler'
import type { Language } from '@/shared/utils/pdf-report-data'

import { CommentStep } from './CommentStep'
import { JerseyAdvertisingSection } from './JerseyAdvertisingSection'
import { LanguageSelector } from './LanguageSelector'
import { PdfPreview } from './PdfPreview'
import { SectionSelector } from './SectionSelector'
import { SignatureCollectionStep } from './SignatureCollectionStep'
import { SubItemSelector } from './SubItemSelector'
import { WizardStepIndicator } from './WizardStepIndicator'

import type { useNonConformantWizard } from '../hooks/useNonConformantWizard'

const MODAL_TITLE_ID = 'sports-hall-report-wizard-title'
const DISCARD_DIALOG_TITLE_ID = 'discard-confirm-title'

interface NonConformantOverlayProps {
  nc: ReturnType<typeof useNonConformantWizard>
  language: Language
  setLanguage: (lang: Language) => void
  jerseyAdvertising: JerseyAdvertisingOptions
  onToggleHomeAd: () => void
  onToggleAwayAd: () => void
  homeTeam: string
  awayTeam: string
  firstRefereeName?: string
  secondRefereeName?: string
  subtitle?: string
  icon: React.ReactNode
  onClose: () => void
  onBack: () => void
  showCloseConfirm: boolean
  onDismissCloseConfirm: () => void
  onConfirmDiscard: () => void
}

export function NonConformantOverlay({
  nc,
  language,
  setLanguage,
  jerseyAdvertising,
  onToggleHomeAd,
  onToggleAwayAd,
  homeTeam,
  awayTeam,
  firstRefereeName,
  secondRefereeName,
  subtitle,
  icon,
  onClose,
  onBack,
  showCloseConfirm,
  onDismissCloseConfirm,
  onConfirmDiscard,
}: NonConformantOverlayProps) {
  const { t } = useTranslation()
  const touchGuard = useOverlayTouchGuard()
  useBodyScrollLock(true)

  // Dismiss discard dialog on Escape key
  useEffect(() => {
    if (!showCloseConfirm) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismissCloseConfirm()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showCloseConfirm, onDismissCloseConfirm])

  const { setSectionComments } = nc

  const handleSectionCommentChange = useCallback(
    (sectionId: string, value: string) => {
      setSectionComments((prev) => ({ ...prev, [sectionId]: value }))
    },
    [setSectionComments]
  )

  return createPortal(
    <div
      className="fixed inset-0 z-60 bg-surface-card dark:bg-surface-card-dark flex flex-col touch-none overscroll-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby={MODAL_TITLE_ID}
      {...touchGuard}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 safe-area-inset-top">
        <ModalHeader
          title={t('pdf.wizard.nonConformant.title')}
          titleId={MODAL_TITLE_ID}
          titleSize="lg"
          icon={icon}
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
      <div className="flex-1 overflow-y-auto px-4 py-2 touch-auto" data-scrollable>
        {nc.ncStep === 'sections' && (
          <>
            <SectionSelector
              sections={nc.checklistSections}
              flaggedSections={nc.flaggedSections}
              onToggleSection={nc.handleToggleSection}
            />

            {/* Advertising question */}
            <div className="mt-4">
              <p className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1.5">
                {t('pdf.wizard.advertisingLabel')}
              </p>
              <JerseyAdvertisingSection
                jerseyAdvertising={jerseyAdvertising}
                onToggleHome={onToggleHomeAd}
                onToggleAway={onToggleAwayAd}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                disabled={nc.isGenerating}
              />
            </div>
          </>
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
            homeCoachName={nc.homeCoachName}
            onHomeCoachNameChange={nc.setHomeCoachName}
            awayCoachName={nc.awayCoachName}
            onAwayCoachNameChange={nc.setAwayCoachName}
            showAwayCoach={nc.showAwayCoach}
            onToggleAwayCoach={nc.setShowAwayCoach}
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-border-default dark:border-border-default-dark safe-area-inset-bottom">
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onBack}
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

      {/* Discard confirmation dialog */}
      {showCloseConfirm && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby={DISCARD_DIALOG_TITLE_ID}
        >
          <div className="mx-4 max-w-sm w-full rounded-xl bg-surface-card dark:bg-surface-card-dark p-5 shadow-lg">
            <h3
              id={DISCARD_DIALOG_TITLE_ID}
              className="text-base font-semibold text-text-primary dark:text-text-primary-dark mb-2"
            >
              {t('pdf.wizard.nonConformant.discardTitle')}
            </h3>
            <p className="text-sm text-text-secondary dark:text-text-secondary-dark mb-4">
              {t('pdf.wizard.nonConformant.discardMessage')}
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={onDismissCloseConfirm}>
                {t('common.cancel')}
              </Button>
              <Button variant="danger" className="flex-1" onClick={onConfirmDiscard}>
                {t('pdf.wizard.nonConformant.discard')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}
