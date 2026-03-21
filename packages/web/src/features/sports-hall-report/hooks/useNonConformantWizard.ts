import { useState, useCallback, useMemo } from 'react'

import type { Assignment } from '@/api/client'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { createLogger } from '@/shared/utils/logger'
import type { ChecklistSection } from '@/shared/utils/pdf-field-mappings'
import type {
  JerseyAdvertisingOptions,
  Language,
  NonConformantSelections,
  NonConformantSignatures,
} from '@/shared/utils/pdf-form-filler'

import { usePdfGeneration } from './usePdfGeneration'
import { extractReportInfo } from '../utils/extractReportInfo'

const log = createLogger('useNonConformantWizard')

function getPdfErrorKey(error: unknown): 'pdf.exportError' | 'pdf.exportErrorNetwork' {
  if (
    error instanceof TypeError &&
    'message' in error &&
    /fetch|network|load/i.test(error.message)
  ) {
    return 'pdf.exportErrorNetwork'
  }
  return 'pdf.exportError'
}

type NonConformantStep = 'sections' | 'subItems' | 'comment' | 'preview' | 'signatures'

const NC_STEPS: NonConformantStep[] = ['sections', 'subItems', 'comment', 'preview', 'signatures']

export function useNonConformantWizard(
  assignment: Assignment,
  language: Language,
  jerseyAdvertising: JerseyAdvertisingOptions,
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
  const [homeCoachName, setHomeCoachName] = useState('')
  const [awayCoachName, setAwayCoachName] = useState('')
  const [showAwayCoach, setShowAwayCoach] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)


  const pdf = usePdfGeneration(assignment, language, jerseyAdvertising, onClose)

  const reset = useCallback(() => {
    setNcStep('sections')
    setFlaggedSections(new Set())
    setNonConformantSubItems({})
    setSectionComments({})
    setPreviewPdfBytes(null)
    setSignatures({})
    setHomeCoachName('')
    setAwayCoachName('')
    setShowAwayCoach(false)
    setIsGenerating(false)
  }, [])

  const loadSections = useCallback(async () => {
    const info = await extractReportInfo(assignment)
    if (!info) return
    const { getChecklistSections } = await import('@/shared/utils/pdf-field-mappings')
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
    () => checklistSections.filter((s) => flaggedSections.has(s.id) && s.subItems.length > 1),
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
          if (
            section.subItems.length === 1 ||
            !updated[sectionId] ||
            updated[sectionId].size === 0
          ) {
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
        const pdfBytes = await pdf.generateNonConformantPreview({
          nonConformantSubItems,
          sectionComments,
          jerseyAdvertising,
        })
        if (!pdfBytes) return
        setPreviewPdfBytes(pdfBytes)
      } catch (error) {
        log.error('Preview generation failed:', error)
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
    nonConformantSubItems,
    sectionComments,
    jerseyAdvertising,
    pdf,
  ])

  const handleNcDownload = useCallback(async () => {
    if (isGenerating) return
    setIsGenerating(true)
    try {
      // Bake coach names into signatures at download time
      const finalSignatures: NonConformantSignatures = { ...signatures }
      if (finalSignatures.homeTeamCoach) {
        finalSignatures.homeTeamCoach = {
          ...finalSignatures.homeTeamCoach,
          name: homeCoachName,
        }
      }
      if (finalSignatures.awayTeamCoach) {
        finalSignatures.awayTeamCoach = {
          ...finalSignatures.awayTeamCoach,
          name: awayCoachName,
        }
      }

      await pdf.generateNonConformantFinal({
        nonConformantSubItems,
        sectionComments,
        jerseyAdvertising,
        signatures: finalSignatures,
      })
    } catch (error) {
      log.error('Non-conformant PDF generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [
    isGenerating,
    nonConformantSubItems,
    sectionComments,
    jerseyAdvertising,
    signatures,
    homeCoachName,
    awayCoachName,
    pdf,
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

  const showSubItemsStep = multiItemFlaggedSections.length > 0

  const ncSteps = useMemo(() => {
    const steps = [
      { label: t('pdf.wizard.nonConformant.stepSections') },
      ...(showSubItemsStep ? [{ label: t('pdf.wizard.nonConformant.selectSubItems') }] : []),
      { label: t('pdf.wizard.nonConformant.stepComment') },
      { label: t('pdf.wizard.nonConformant.stepPreview') },
      { label: t('pdf.wizard.nonConformant.stepSign') },
    ]
    return steps
  }, [t, showSubItemsStep])

  // Map the raw step index to the visible step index (accounting for hidden subItems step)
  const ncStepIndex = useMemo(() => {
    const visibleSteps = showSubItemsStep ? NC_STEPS : NC_STEPS.filter((s) => s !== 'subItems')
    return visibleSteps.indexOf(ncStep)
  }, [ncStep, showSubItemsStep])

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
    homeCoachName,
    setHomeCoachName,
    awayCoachName,
    setAwayCoachName,
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
