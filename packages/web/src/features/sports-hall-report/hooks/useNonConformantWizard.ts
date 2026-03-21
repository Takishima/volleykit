import { useState, useCallback, useMemo } from 'react'

import type { Assignment } from '@/api/client'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { toast } from '@/shared/stores/toast'
import { createLogger } from '@/shared/utils/logger'
import type {
  JerseyAdvertisingOptions,
  Language,
  NonConformantSelections,
  NonConformantSignatures,
  ChecklistSection,
} from '@/shared/utils/pdf-form-filler'

import { extractReportInfo } from '../utils/extractReportInfo'

const log = createLogger('useNonConformantWizard')

type NonConformantStep = 'sections' | 'subItems' | 'comment' | 'preview' | 'signatures'

const NC_STEPS: NonConformantStep[] = ['sections', 'subItems', 'comment', 'preview', 'signatures']

export function useNonConformantWizard(
  assignment: Assignment,
  language: Language,
  onClose: () => void
) {
  const { t } = useTranslation()

  const [ncStep, setNcStep] = useState<NonConformantStep>('sections')
  const [checklistSections, setChecklistSections] = useState<readonly ChecklistSection[]>([])
  const [flaggedSections, setFlaggedSections] = useState<Set<string>>(new Set())
  const [nonConformantSubItems, setNonConformantSubItems] = useState<NonConformantSelections>({})
  const [sectionComments, setSectionComments] = useState<Record<string, string>>({})
  const [previewPdfBytes, setPreviewPdfBytes] = useState<Uint8Array | null>(null)
  const [signatures, setSignatures] = useState<NonConformantSignatures>({})
  const [jerseyAdvertising, setJerseyAdvertising] = useState<JerseyAdvertisingOptions>({
    homeTeam: true,
    awayTeam: true,
  })
  const [showAwayCoach, setShowAwayCoach] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const ncStepIndex = NC_STEPS.indexOf(ncStep)

  const reset = useCallback(() => {
    setNcStep('sections')
    setFlaggedSections(new Set())
    setNonConformantSubItems({})
    setSectionComments({})
    setPreviewPdfBytes(null)
    setSignatures({})
    setJerseyAdvertising({ homeTeam: true, awayTeam: true })
    setShowAwayCoach(false)
    setIsGenerating(false)
  }, [])

  const loadSections = useCallback(async () => {
    const info = await extractReportInfo(assignment)
    if (!info) return
    const { getChecklistSections } = await import('@/shared/utils/pdf-form-filler')
    setChecklistSections(getChecklistSections(info.leagueCategory))
  }, [assignment])

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

  // Sections that have multiple sub-items and need manual selection
  const multiItemFlaggedSections = useMemo(
    () =>
      checklistSections.filter(
        (s) => flaggedSections.has(s.id) && s.subItems.length > 1
      ),
    [checklistSections, flaggedSections]
  )

  const handleNcBack = useCallback((): 'exit' | void => {
    const idx = NC_STEPS.indexOf(ncStep)
    if (idx <= 0) {
      return 'exit'
    }
    // Skip subItems step when going back if all flagged sections are single-item
    if (ncStep === 'comment' && multiItemFlaggedSections.length === 0) {
      setNcStep('sections')
      return
    }
    setNcStep(NC_STEPS[idx - 1]!)
  }, [ncStep, multiItemFlaggedSections])

  const handleNcNext = useCallback(async () => {
    if (isGenerating) return
    let nextIdx = NC_STEPS.indexOf(ncStep) + 1

    if (ncStep === 'sections') {
      // Auto-select sub-items for single-item sections, preserve manual selections for multi-item
      setNonConformantSubItems((prev) => {
        const updated = { ...prev }
        for (const sectionId of flaggedSections) {
          const section = checklistSections.find((s) => s.id === sectionId)
          if (!section) continue
          // Auto-select all sub-items for single-item sections or when no manual selection exists
          if (section.subItems.length === 1 || !updated[sectionId] || updated[sectionId].size === 0) {
            updated[sectionId] = new Set(section.subItems.map((si) => si.id))
          }
        }
        for (const key of Object.keys(updated)) {
          if (!flaggedSections.has(key)) {
            delete updated[key]
          }
        }
        return updated
      })

      // Skip subItems step if all flagged sections are single-item
      if (multiItemFlaggedSections.length === 0) {
        nextIdx = NC_STEPS.indexOf('comment')
      }
    }

    if (NC_STEPS[nextIdx] === 'preview') {
      setIsGenerating(true)
      try {
        const info = await extractReportInfo(assignment)
        if (!info) {
          toast.error(t('pdf.exportError'))
          return
        }
        const { generateNonConformantPreviewBytes } = await import('@/shared/utils/pdf-form-filler')
        const { pdfBytes } = await generateNonConformantPreviewBytes({
          data: info.reportData,
          leagueCategory: info.leagueCategory,
          language,
          nonConformantSubItems,
          sectionComments,
          jerseyAdvertising,
        })
        setPreviewPdfBytes(pdfBytes)
      } catch (error) {
        log.error('Preview generation failed:', error)
        toast.error(t('pdf.exportError'))
        return
      } finally {
        setIsGenerating(false)
      }
    }

    if (nextIdx < NC_STEPS.length) {
      setNcStep(NC_STEPS[nextIdx]!)
    }
  }, [
    isGenerating,
    ncStep,
    flaggedSections,
    checklistSections,
    multiItemFlaggedSections,
    assignment,
    language,
    nonConformantSubItems,
    sectionComments,
    jerseyAdvertising,
    t,
  ])

  const handleNcDownload = useCallback(async () => {
    if (isGenerating) return
    setIsGenerating(true)
    try {
      const info = await extractReportInfo(assignment)
      if (!info) {
        toast.error(t('pdf.exportError'))
        return
      }
      const { generateNonConformantReportBytes, downloadPdf } =
        await import('@/shared/utils/pdf-form-filler')
      const { pdfBytes, filename } = await generateNonConformantReportBytes({
        data: info.reportData,
        leagueCategory: info.leagueCategory,
        language,
        nonConformantSubItems,
        sectionComments,
        jerseyAdvertising,
        signatures,
      })
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
  }, [
    isGenerating,
    assignment,
    language,
    nonConformantSubItems,
    sectionComments,
    jerseyAdvertising,
    signatures,
    onClose,
    t,
  ])

  const canProceed = useMemo(() => {
    switch (ncStep) {
      case 'sections':
        return flaggedSections.size > 0
      case 'subItems':
        return Object.values(nonConformantSubItems).some((set) => set.size > 0)
      case 'comment':
        return true
      case 'preview':
        return !!previewPdfBytes
      case 'signatures': {
        const hasFirstRef = !!signatures.firstReferee
        const hasSecondRef = !!signatures.secondReferee
        const hasCoach =
          !!signatures.homeTeamCoach?.signature || !!signatures.awayTeamCoach?.signature
        return hasFirstRef && hasSecondRef && hasCoach
      }
      default:
        return false
    }
  }, [ncStep, flaggedSections, nonConformantSubItems, previewPdfBytes, signatures])

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

  return {
    ncStep,
    ncStepIndex,
    ncSteps,
    checklistSections,
    flaggedSections,
    nonConformantSubItems,
    sectionComments,
    setSectionComments,
    jerseyAdvertising,
    setJerseyAdvertising,
    previewPdfBytes,
    signatures,
    setSignatures,
    showAwayCoach,
    setShowAwayCoach,
    isGenerating,
    canProceed,
    reset,
    loadSections,
    handleToggleSection,
    handleToggleSubItem,
    handleNcBack,
    handleNcNext,
    handleNcDownload,
  }
}
