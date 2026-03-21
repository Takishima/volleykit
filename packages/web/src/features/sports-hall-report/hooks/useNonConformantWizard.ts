import { useState, useCallback, useMemo } from 'react'

import type { Assignment } from '@/api/client'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { toast } from '@/shared/stores/toast'
import { createLogger } from '@/shared/utils/logger'
import type {
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

  const handleNcBack = useCallback((): 'exit' | void => {
    const idx = NC_STEPS.indexOf(ncStep)
    if (idx <= 0) {
      return 'exit'
    }
    setNcStep(NC_STEPS[idx - 1]!)
  }, [ncStep])

  const handleNcNext = useCallback(async () => {
    if (isGenerating) return
    const idx = NC_STEPS.indexOf(ncStep)

    if (ncStep === 'sections') {
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
        for (const key of Object.keys(updated)) {
          if (!flaggedSections.has(key)) {
            delete updated[key]
          }
        }
        return updated
      })
    }

    if (NC_STEPS[idx + 1] === 'preview') {
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

    if (idx < NC_STEPS.length - 1) {
      setNcStep(NC_STEPS[idx + 1]!)
    }
  }, [
    isGenerating,
    ncStep,
    flaggedSections,
    checklistSections,
    assignment,
    language,
    nonConformantSubItems,
    sectionComments,
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
        return [...flaggedSections].every((id) => sectionComments[id]?.trim())
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
  }, [ncStep, flaggedSections, nonConformantSubItems, sectionComments, previewPdfBytes, signatures])

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
