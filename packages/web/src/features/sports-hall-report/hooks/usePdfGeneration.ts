import { useCallback } from 'react'

import type { Assignment } from '@/api/client'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { toast } from '@/shared/stores/toast'
import { createLogger } from '@/shared/utils/logger'
import type { JerseyAdvertisingOptions, Language, NonConformantReportOptions } from '@/shared/utils/pdf-form-filler'

import { extractReportInfo } from '../utils/extractReportInfo'

const log = createLogger('usePdfGeneration')

interface PdfGenerationActions {
  generateHappyPath: (signatureDataUrl: string) => Promise<void>
  downloadPreFilled: () => Promise<void>
  generateNonConformantPreview: (
    options: Pick<NonConformantReportOptions, 'nonConformantSubItems' | 'sectionComments' | 'jerseyAdvertising'>
  ) => Promise<Uint8Array | null>
  generateNonConformantFinal: (
    options: Pick<
      NonConformantReportOptions,
      'nonConformantSubItems' | 'sectionComments' | 'jerseyAdvertising' | 'signatures'
    >
  ) => Promise<void>
}

export function usePdfGeneration(
  assignment: Assignment,
  language: Language,
  jerseyAdvertising: JerseyAdvertisingOptions,
  onSuccess: () => void
): PdfGenerationActions {
  const { t } = useTranslation()

  const generateHappyPath = useCallback(
    async (signatureDataUrl: string) => {
      const info = await extractReportInfo(assignment)
      if (!info) {
        toast.error(t('pdf.exportError'))
        return
      }
      const { generateWizardReportBytes } = await import('@/shared/utils/pdf-form-filler')
      const { downloadPdf } = await import('@/shared/utils/pdf-download')

      const { pdfBytes, filename } = await generateWizardReportBytes({
        data: info.reportData,
        leagueCategory: info.leagueCategory,
        language,
        signatureDataUrl,
        jerseyAdvertising,
      })
      downloadPdf(pdfBytes, filename)
      log.debug('Generated signed PDF report for:', assignment.__identity)
      toast.success(t('pdf.wizard.reportGenerated'))
      onSuccess()
    },
    [assignment, language, jerseyAdvertising, onSuccess, t]
  )

  const downloadPreFilled = useCallback(async () => {
    const info = await extractReportInfo(assignment)
    if (!info) {
      toast.error(t('pdf.exportError'))
      return
    }
    const { generateAndDownloadSportsHallReport } = await import('@/shared/utils/pdf-form-filler')
    await generateAndDownloadSportsHallReport(info.reportData, info.leagueCategory, language)
    toast.success(t('assignments.reportGenerated'))
    onSuccess()
  }, [assignment, language, onSuccess, t])

  const generateNonConformantPreview = useCallback(
    async (
      options: Pick<NonConformantReportOptions, 'nonConformantSubItems' | 'sectionComments' | 'jerseyAdvertising'>
    ): Promise<Uint8Array | null> => {
      const info = await extractReportInfo(assignment)
      if (!info) {
        toast.error(t('pdf.exportError'))
        return null
      }
      const { generateNonConformantPreviewBytes } = await import('@/shared/utils/pdf-form-filler')
      const { pdfBytes } = await generateNonConformantPreviewBytes({
        data: info.reportData,
        leagueCategory: info.leagueCategory,
        language,
        ...options,
      })
      return pdfBytes
    },
    [assignment, language, t]
  )

  const generateNonConformantFinal = useCallback(
    async (
      options: Pick<
        NonConformantReportOptions,
        'nonConformantSubItems' | 'sectionComments' | 'jerseyAdvertising' | 'signatures'
      >
    ) => {
      const info = await extractReportInfo(assignment)
      if (!info) {
        toast.error(t('pdf.exportError'))
        return
      }
      const { generateNonConformantReportBytes } = await import('@/shared/utils/pdf-form-filler')
      const { downloadPdf } = await import('@/shared/utils/pdf-download')
      const { pdfBytes, filename } = await generateNonConformantReportBytes({
        data: info.reportData,
        leagueCategory: info.leagueCategory,
        language,
        ...options,
        signatures: options.signatures!,
      })
      downloadPdf(pdfBytes, filename)
      log.debug('Generated non-conformant PDF report for:', assignment.__identity)
      toast.success(t('pdf.wizard.reportGenerated'))
      onSuccess()
    },
    [assignment, language, onSuccess, t]
  )

  return { generateHappyPath, downloadPreFilled, generateNonConformantPreview, generateNonConformantFinal }
}
