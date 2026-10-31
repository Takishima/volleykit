/**
 * PDF form filler — core PDF manipulation logic.
 *
 * Re-exports types and functions from split modules for backward compatibility.
 * New code should import directly from the specific module:
 *   - pdf-report-data.ts  — Assignment data extraction, filename building
 *   - pdf-field-mappings.ts — PDF field names, checklist sections, positions
 *   - pdf-signature-block.ts — Signature image embedding and signer name sizing
 *   - pdf-download.ts — Browser download trigger
 */

import { logger } from '@/common/utils/logger'

import { downloadPdf } from './pdf-download'
import {
  COMMENT_FIELD_FONT_SIZE,
  RADIO_NOT_OK_OPTION,
  RADIO_OK_OPTION,
  type FieldMapping,
  getFieldMapping,
  getPdfChecklistSections,
  getSignatureNameFields,
  getWizardFieldMapping,
  type PdfChecklistSection,
} from './pdf-field-mappings'
import {
  buildReportFilename,
  type Language,
  type LeagueCategory,
  type SportsHallReportData,
} from './pdf-report-data'
import {
  embedAllSignatures,
  embedSignature,
  fitSignatureNameFonts,
  type NonConformantSignatures,
} from './pdf-signature-block'

import type { PDFDocument, PDFForm } from 'pdf-lib'

// ---------------------------------------------------------------------------
// Re-exports for backward compatibility
// ---------------------------------------------------------------------------

export { downloadPdf } from './pdf-download'
export { getChecklistSections } from './pdf-field-mappings'
export type { NonConformantSignatures } from './pdf-signature-block'
export {
  buildReportFilename,
  extractSportsHallReportData,
  getLeagueCategoryFromAssignment,
  mapAppLocaleToPdfLanguage,
  type Language,
  type LeagueCategory,
  type SportsHallReportData,
} from './pdf-report-data'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface JerseyAdvertisingOptions {
  homeTeam: boolean
  awayTeam: boolean
}

/** Which sub-items are flagged as not-OK, keyed by section ID then sub-item ID. */
export type NonConformantSelections = Record<string, Set<string>>

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Safely sets a text field in a PDF form, logging a warning on failure.
 * pdf-lib is imported lazily at runtime; only its types are referenced here.
 */
function trySetTextField(form: PDFForm, fieldName: string, value: string | undefined): void {
  if (!value) return
  try {
    form.getTextField(fieldName).setText(value)
  } catch (error) {
    logger.warn(`Could not set text field "${fieldName}":`, error)
  }
}

/**
 * Auto-sizes header text fields so that flattened output matches the browser's
 * native form-field rendering.  `setFontSize(0)` tells pdf-lib to scale each
 * field's text to fit its bounding box — the same behaviour browsers use for
 * un-flattened form fields.
 *
 * The signature-block name fields are deliberately excluded: they are much
 * taller than the header cells, so auto-sizing would inflate the names to
 * ~20pt. They are handled by `fitSignatureNameFonts` instead.
 */
function autoSizeHeaderFields(form: PDFForm, mapping: FieldMapping): void {
  const headerFields = [
    mapping.gameNumber,
    mapping.homeTeam,
    mapping.awayTeam,
    mapping.hallName,
    mapping.location,
    mapping.date,
  ]
  for (const fieldName of headerFields) {
    try {
      form.getTextField(fieldName).setFontSize(0)
    } catch {
      // Field may not exist in every template variant — skip silently
    }
  }
}

/**
 * Fills the basic game info fields (teams, date, hall, referees, gender) in a PDF form.
 */
function fillBaseGameInfo(
  form: PDFForm,
  data: SportsHallReportData,
  mapping: ReturnType<typeof getFieldMapping>
): void {
  trySetTextField(form, mapping.gameNumber, data.gameNumber)
  trySetTextField(form, mapping.homeTeam, data.homeTeam)
  trySetTextField(form, mapping.awayTeam, data.awayTeam)
  trySetTextField(form, mapping.hallName, data.hallName)
  trySetTextField(form, mapping.location, data.location)
  trySetTextField(form, mapping.date, data.date)
  trySetTextField(form, mapping.firstRefereeName, data.firstRefereeName)
  trySetTextField(form, mapping.secondRefereeName, data.secondRefereeName)

  // Select gender radio button
  // PDF radio options are 'Auswahl1' (M/Male) and 'Auswahl2' (F/Female)
  const genderOption = data.gender === 'm' ? 'Auswahl1' : 'Auswahl2'
  try {
    const radioGroup = form.getRadioGroup(mapping.genderRadio)
    try {
      radioGroup.select(genderOption)
    } catch {
      const options = radioGroup.getOptions()
      const matchingOption = options.find(
        (opt) => opt.toUpperCase().startsWith(genderOption) || opt.includes(genderOption)
      )
      if (matchingOption) {
        radioGroup.select(matchingOption)
      } else {
        logger.warn(
          `Could not find option "${genderOption}" in radio group "${mapping.genderRadio}". Available: ${options.join(', ')}`
        )
      }
    }
  } catch (error) {
    logger.warn(`Could not access radio group "${mapping.genderRadio}":`, error)
  }
}

function getPdfPath(leagueCategory: LeagueCategory, language: Language): string {
  const categoryPath = leagueCategory === 'NLA' ? 'nla-' : ''
  // Use import.meta.env.BASE_URL to handle deployment to subdirectories (e.g., /volleykit/)
  const basePath = import.meta.env.BASE_URL || '/'
  return `${basePath}assets/pdf/sports-hall-report-${categoryPath}${language}.pdf`
}

async function loadPdfForm(
  leagueCategory: LeagueCategory,
  language: Language
): Promise<{ pdfDoc: PDFDocument; form: PDFForm }> {
  const { PDFDocument } = await import('pdf-lib')

  const pdfPath = getPdfPath(leagueCategory, language)
  const response = await fetch(pdfPath)
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF template: ${response.statusText}`)
  }
  const pdfBytes = await response.arrayBuffer()
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const form = pdfDoc.getForm()
  return { pdfDoc, form }
}

// ---------------------------------------------------------------------------
// Checklist radio / comment filling
// ---------------------------------------------------------------------------

function fillChecklistRadios(
  form: PDFForm,
  sections: readonly PdfChecklistSection[],
  nonConformantSubItems: NonConformantSelections
): void {
  for (const section of sections) {
    const flaggedItems = nonConformantSubItems[section.id]
    for (const subItem of section.subItems) {
      const isNotOk = flaggedItems?.has(subItem.id) ?? false
      const option = isNotOk ? RADIO_NOT_OK_OPTION : RADIO_OK_OPTION
      try {
        form.getRadioGroup(subItem.radioField).select(option)
      } catch (error) {
        logger.warn(`Could not set radio "${subItem.radioField}" to ${option}:`, error)
      }
    }
  }
}

function fillNonConformantComments(
  form: PDFForm,
  sections: readonly PdfChecklistSection[],
  nonConformantSubItems: NonConformantSelections,
  sectionComments: Record<string, string>
): void {
  for (const section of sections) {
    if (!nonConformantSubItems[section.id]?.size) continue
    const comment = sectionComments[section.id]?.trim()
    if (!comment) continue
    const commentField = section.commentFields[0]
    if (!commentField) continue
    try {
      const field = form.getTextField(commentField)
      field.setFontSize(COMMENT_FIELD_FONT_SIZE)
      field.setText(comment)
    } catch (error) {
      logger.warn(`Could not set comment field "${commentField}":`, error)
    }
  }
}

// ---------------------------------------------------------------------------
// Advertising radio helper
// ---------------------------------------------------------------------------

function fillAdvertisingRadios(
  form: PDFForm,
  wizardMapping: ReturnType<typeof getWizardFieldMapping>,
  jerseyAdvertising: JerseyAdvertisingOptions
): void {
  const adEntries: Array<{ field: string; hasAd: boolean }> = [
    { field: wizardMapping.advertisingHomeTeam, hasAd: jerseyAdvertising.homeTeam },
    { field: wizardMapping.advertisingAwayTeam, hasAd: jerseyAdvertising.awayTeam },
  ]
  for (const { field, hasAd } of adEntries) {
    try {
      form.getRadioGroup(field).select(hasAd ? RADIO_OK_OPTION : RADIO_NOT_OK_OPTION)
    } catch (error) {
      logger.warn(`Could not set advertising "${field}":`, error)
    }
  }
}

// ---------------------------------------------------------------------------
// Public API — Happy path
// ---------------------------------------------------------------------------

export async function fillSportsHallReportForm(
  data: SportsHallReportData,
  leagueCategory: LeagueCategory,
  language: Language
): Promise<Uint8Array> {
  const { pdfDoc, form } = await loadPdfForm(leagueCategory, language)
  const mapping = getFieldMapping(leagueCategory)

  fillBaseGameInfo(form, data, mapping)

  // Do not flatten: referees download this form to fill remaining fields themselves
  return pdfDoc.save()
}

export async function generateAndDownloadSportsHallReport(
  data: SportsHallReportData,
  leagueCategory: LeagueCategory,
  language: Language
): Promise<void> {
  const pdfBytes = await fillSportsHallReportForm(data, leagueCategory, language)
  const filename = buildReportFilename(
    leagueCategory,
    language,
    data.startingDateTime,
    data.gameNumber
  )
  downloadPdf(pdfBytes, filename)
}

export interface WizardReportOptions {
  data: SportsHallReportData
  leagueCategory: LeagueCategory
  language: Language
  signatureDataUrl?: string
  jerseyAdvertising?: JerseyAdvertisingOptions
}

export async function fillSportsHallReportWizard(
  options: WizardReportOptions
): Promise<Uint8Array> {
  const {
    data,
    leagueCategory,
    language,
    signatureDataUrl,
    jerseyAdvertising = { homeTeam: true, awayTeam: true },
  } = options
  const { pdfDoc, form } = await loadPdfForm(leagueCategory, language)
  const mapping = getFieldMapping(leagueCategory)
  const wizardMapping = getWizardFieldMapping(leagueCategory)
  const signatureNameFields = getSignatureNameFields(leagueCategory)

  fillBaseGameInfo(form, data, mapping)

  // Check the "all points in order" checkbox
  try {
    form.getCheckBox(wizardMapping.allPointsInOrderCheckbox).check()
  } catch (error) {
    logger.warn(`Could not check "${wizardMapping.allPointsInOrderCheckbox}":`, error)
  }

  fillAdvertisingRadios(form, wizardMapping, jerseyAdvertising)

  // Embed first referee signature if provided
  if (signatureDataUrl) {
    try {
      await embedSignature(pdfDoc, form, signatureDataUrl, signatureNameFields)
    } catch (error) {
      logger.warn('Could not embed signature in PDF:', error)
    }
  }

  autoSizeHeaderFields(form, mapping)
  fitSignatureNameFonts(form, signatureNameFields)
  form.flatten()
  return pdfDoc.save()
}

export async function generateWizardReportBytes(
  options: WizardReportOptions & { signatureDataUrl: string }
): Promise<{ pdfBytes: Uint8Array; filename: string }> {
  const pdfBytes = await fillSportsHallReportWizard(options)
  const filename = buildReportFilename(
    options.leagueCategory,
    options.language,
    options.data.startingDateTime,
    options.data.gameNumber
  )
  return { pdfBytes, filename }
}

// ---------------------------------------------------------------------------
// Public API — Non-conformant report
// ---------------------------------------------------------------------------

export interface NonConformantReportOptions {
  data: SportsHallReportData
  leagueCategory: LeagueCategory
  language: Language
  nonConformantSubItems: NonConformantSelections
  sectionComments: Record<string, string>
  jerseyAdvertising?: JerseyAdvertisingOptions
  signatures?: NonConformantSignatures
}

export async function fillNonConformantReport(
  options: NonConformantReportOptions & { flatten?: boolean }
): Promise<Uint8Array> {
  const {
    data,
    leagueCategory,
    language,
    nonConformantSubItems,
    sectionComments,
    jerseyAdvertising = { homeTeam: true, awayTeam: true },
    signatures,
  } = options
  const { pdfDoc, form } = await loadPdfForm(leagueCategory, language)
  const mapping = getFieldMapping(leagueCategory)
  const wizardMapping = getWizardFieldMapping(leagueCategory)
  const sections = getPdfChecklistSections(leagueCategory)
  const signatureNameFields = getSignatureNameFields(leagueCategory)

  fillBaseGameInfo(form, data, mapping)
  fillChecklistRadios(form, sections, nonConformantSubItems)
  fillNonConformantComments(form, sections, nonConformantSubItems, sectionComments)
  fillAdvertisingRadios(form, wizardMapping, jerseyAdvertising)

  if (signatures?.homeTeamCoach?.name) {
    trySetTextField(form, signatureNameFields.homeTeam, signatures.homeTeamCoach.name)
  }
  if (signatures?.awayTeamCoach?.name) {
    trySetTextField(form, signatureNameFields.awayTeam, signatures.awayTeamCoach.name)
  }

  if (signatures) {
    await embedAllSignatures(pdfDoc, form, signatureNameFields, signatures)
  }

  // Runs regardless of `flatten` so the unflattened preview shows the names at
  // the size the final PDF will use. Header auto-sizing is left to the viewer
  // in the preview (see autoSizeHeaderFields) and only forced when flattening.
  fitSignatureNameFonts(form, signatureNameFields)
  if (options.flatten !== false) {
    autoSizeHeaderFields(form, mapping)
    form.flatten()
  }
  return pdfDoc.save()
}

export async function generateNonConformantPreviewBytes(
  options: Omit<NonConformantReportOptions, 'signatures'>
): Promise<{ pdfBytes: Uint8Array; filename: string }> {
  const pdfBytes = await fillNonConformantReport({ ...options, flatten: false })
  const filename = buildReportFilename(
    options.leagueCategory,
    options.language,
    options.data.startingDateTime,
    options.data.gameNumber
  )
  return { pdfBytes, filename }
}

export async function generateNonConformantReportBytes(
  options: NonConformantReportOptions & { signatures: NonConformantSignatures }
): Promise<{ pdfBytes: Uint8Array; filename: string }> {
  const pdfBytes = await fillNonConformantReport({ ...options, flatten: true })
  const filename = buildReportFilename(
    options.leagueCategory,
    options.language,
    options.data.startingDateTime,
    options.data.gameNumber
  )
  return { pdfBytes, filename }
}
