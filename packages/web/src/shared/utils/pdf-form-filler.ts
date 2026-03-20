import { format } from 'date-fns'

import type { Assignment } from '@/api/client'
import { logger } from '@/shared/utils/logger'

export type LeagueCategory = 'NLA' | 'NLB'
export type Language = 'de' | 'fr'
export type Gender = 'm' | 'f'

export function mapAppLocaleToPdfLanguage(appLocale: string): Language {
  if (appLocale === 'fr' || appLocale === 'it') {
    return 'fr'
  }
  return 'de'
}

export interface SportsHallReportData {
  gameNumber: string
  homeTeam: string
  awayTeam: string
  gender: Gender
  hallName: string
  location: string
  date: string
  startingDateTime?: string
  firstRefereeName?: string
  secondRefereeName?: string
}

function formatDateForReport(isoString: string | undefined): string {
  if (!isoString) return ''
  try {
    return format(new Date(isoString), 'dd.MM.yy')
  } catch {
    // Invalid date format - return empty string so form field shows blank
    logger.warn('Failed to parse date for PDF report:', isoString)
    return ''
  }
}

function getRefereeName(
  convocation:
    | {
        indoorAssociationReferee?: {
          indoorReferee?: {
            person?: {
              firstName?: string
              lastName?: string
              displayName?: string
            }
          }
        }
      }
    | null
    | undefined
): string | undefined {
  const person = convocation?.indoorAssociationReferee?.indoorReferee?.person
  if (!person) return undefined
  return (
    person.displayName || `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() || undefined
  )
}

export function extractSportsHallReportData(assignment: Assignment): SportsHallReportData | null {
  const game = assignment.refereeGame?.game
  if (!game) return null

  const leagueCategoryName = game.group?.phase?.league?.leagueCategory?.name
  if (leagueCategoryName !== 'NLA' && leagueCategoryName !== 'NLB') {
    return null
  }

  const refereeGame = assignment.refereeGame
  const firstReferee = getRefereeName(refereeGame?.activeRefereeConvocationFirstHeadReferee)
  const secondReferee = getRefereeName(refereeGame?.activeRefereeConvocationSecondHeadReferee)

  const reportData: SportsHallReportData = {
    gameNumber: game.number?.toString() ?? '',
    homeTeam: game.encounter?.teamHome?.name ?? '',
    awayTeam: game.encounter?.teamAway?.name ?? '',
    gender: (game.group?.phase?.league?.gender ?? 'm') as Gender,
    hallName: game.hall?.name ?? '',
    location: game.hall?.primaryPostalAddress?.city ?? '',
    date: formatDateForReport(game.startingDateTime),
    startingDateTime: game.startingDateTime,
    firstRefereeName: firstReferee,
    secondRefereeName: secondReferee,
  }

  // Debug logging for troubleshooting PDF generation
  logger.debug('[pdf-form-filler] Extracted report data:', reportData)

  return reportData
}

export function getLeagueCategoryFromAssignment(assignment: Assignment): LeagueCategory | null {
  const name = assignment.refereeGame?.game?.group?.phase?.league?.leagueCategory?.name
  if (name === 'NLA' || name === 'NLB') {
    return name
  }
  return null
}

interface FieldMapping {
  gameNumber: string
  homeTeam: string
  awayTeam: string
  genderRadio: string
  hallName: string
  location: string
  date: string
  firstRefereeName: string
  secondRefereeName: string
}

const NLA_FIELD_MAPPING: FieldMapping = {
  gameNumber: 'SpielNr',
  homeTeam: 'Heimteam',
  awayTeam: 'Gastteam',
  genderRadio: 'Gruppe3',
  hallName: 'Hallenname',
  location: 'Ort',
  date: 'Datum',
  firstRefereeName: 'Text19',
  secondRefereeName: 'Text20',
}

const NLB_FIELD_MAPPING: FieldMapping = {
  gameNumber: 'Text9',
  homeTeam: 'Text10',
  awayTeam: 'Text12',
  genderRadio: 'Gruppe15',
  hallName: 'Text14',
  location: 'Text13',
  date: 'Text11',
  firstRefereeName: 'Text23',
  secondRefereeName: 'Text24',
}

function getFieldMapping(leagueCategory: LeagueCategory): FieldMapping {
  return leagueCategory === 'NLA' ? NLA_FIELD_MAPPING : NLB_FIELD_MAPPING
}

/**
 * Safely sets a text field in a PDF form, logging a warning on failure.
 * Uses `any` for form parameter because pdf-lib types are lazily imported.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function trySetTextField(form: any, fieldName: string, value: string | undefined): void {
  if (!value) return
  try {
    form.getTextField(fieldName).setText(value)
  } catch (error) {
    logger.warn(`Could not set text field "${fieldName}":`, error)
  }
}

/**
 * Fills the basic game info fields (teams, date, hall, referees, gender) in a PDF form.
 * Shared between the standard report and the wizard report.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fillBaseGameInfo(form: any, data: SportsHallReportData, mapping: FieldMapping): void {
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
        (opt: string) => opt.toUpperCase().startsWith(genderOption) || opt.includes(genderOption)
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

export async function fillSportsHallReportForm(
  data: SportsHallReportData,
  leagueCategory: LeagueCategory,
  language: Language
): Promise<Uint8Array> {
  // Dynamic import to keep pdf-lib out of the main bundle
  const { PDFDocument } = await import('pdf-lib')

  const pdfPath = getPdfPath(leagueCategory, language)
  const response = await fetch(pdfPath)
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF template: ${response.statusText}`)
  }
  const pdfBytes = await response.arrayBuffer()
  const pdfDoc = await PDFDocument.load(pdfBytes)

  const form = pdfDoc.getForm()
  const mapping = getFieldMapping(leagueCategory)

  fillBaseGameInfo(form, data, mapping)

  return pdfDoc.save()
}

export function downloadPdf(pdfBytes: Uint8Array, filename: string): void {
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const REPORT_NAME: Record<Language, string> = {
  de: 'hallenrapport',
  fr: 'rapport_salle',
}

export function buildReportFilename(
  leagueCategory: LeagueCategory,
  language: Language,
  startingDateTime?: string,
  gameNumber?: string
): string {
  const league = leagueCategory.toLowerCase()
  const reportName = REPORT_NAME[language]
  let datePart = 'unknown'
  if (startingDateTime) {
    try {
      datePart = format(new Date(startingDateTime), 'yyyyMMdd')
    } catch {
      logger.warn('Failed to parse date for report filename:', startingDateTime)
    }
  }
  const suffix = gameNumber ? `_${gameNumber}` : ''
  return `${league}_${reportName}_${datePart}${suffix}.pdf`
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

/**
 * Wizard-specific field mapping for checkbox/radio fields that the wizard fills
 * in addition to the base game info fields.
 */
interface WizardFieldMapping {
  /** Checkbox field name for "Tous les points sont en ordre" / "Alle Punkte in Ordnung" */
  allPointsInOrderCheckbox: string
}

const NLA_WIZARD_FIELDS: WizardFieldMapping = {
  allPointsInOrderCheckbox: 'Kontrollkästchen8',
}

const NLB_WIZARD_FIELDS: WizardFieldMapping = {
  allPointsInOrderCheckbox: 'Kontrollkästchen17',
}

/** OK option value used by all radio groups in the PDF templates */
const RADIO_OK_OPTION = 'Auswahl3'

function getWizardFieldMapping(leagueCategory: LeagueCategory): WizardFieldMapping {
  return leagueCategory === 'NLA' ? NLA_WIZARD_FIELDS : NLB_WIZARD_FIELDS
}

/**
 * Fills the sports hall report with all checkpoints marked as OK and the
 * "all points in order" checkbox checked. This is the "happy path" wizard flow
 * where everything is in order.
 */
export async function fillSportsHallReportWizard(
  data: SportsHallReportData,
  leagueCategory: LeagueCategory,
  language: Language
): Promise<Uint8Array> {
  const { PDFDocument } = await import('pdf-lib')

  const pdfPath = getPdfPath(leagueCategory, language)
  const response = await fetch(pdfPath)
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF template: ${response.statusText}`)
  }
  const pdfBytes = await response.arrayBuffer()
  const pdfDoc = await PDFDocument.load(pdfBytes)

  const form = pdfDoc.getForm()
  const mapping = getFieldMapping(leagueCategory)
  const wizardMapping = getWizardFieldMapping(leagueCategory)

  fillBaseGameInfo(form, data, mapping)

  // Set all checklist radio groups to OK (Auswahl3)
  // Iterate all form fields and select OK for every radio group that has the OK option
  const fields = form.getFields()
  for (const field of fields) {
    if (field.constructor.name !== 'PDFRadioGroup') continue
    const fieldName = field.getName()
    // Skip the gender radio group (it uses Auswahl1/Auswahl2)
    if (fieldName === mapping.genderRadio) continue
    try {
      const radioGroup = form.getRadioGroup(fieldName)
      const options = radioGroup.getOptions()
      if (options.includes(RADIO_OK_OPTION)) {
        radioGroup.select(RADIO_OK_OPTION)
      }
    } catch (error) {
      logger.warn(`Could not set radio group "${fieldName}" to OK:`, error)
    }
  }

  // Check the "all points in order" checkbox
  try {
    form.getCheckBox(wizardMapping.allPointsInOrderCheckbox).check()
  } catch (error) {
    logger.warn(
      `Could not check "${wizardMapping.allPointsInOrderCheckbox}":`,
      error
    )
  }

  return pdfDoc.save()
}

/**
 * Generates and downloads a sports hall report with all checkpoints marked as OK.
 * Used by the wizard modal for the "happy path" flow.
 */
export async function generateAndDownloadWizardReport(
  data: SportsHallReportData,
  leagueCategory: LeagueCategory,
  language: Language
): Promise<void> {
  const pdfBytes = await fillSportsHallReportWizard(data, leagueCategory, language)
  const filename = buildReportFilename(
    leagueCategory,
    language,
    data.startingDateTime,
    data.gameNumber
  )
  downloadPdf(pdfBytes, filename)
}
