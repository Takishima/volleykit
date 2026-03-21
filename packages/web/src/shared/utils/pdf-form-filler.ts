import { format } from 'date-fns'

import type { Assignment } from '@/api/client'
import type { TranslationKey } from '@/i18n'
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

async function loadPdfForm(
  leagueCategory: LeagueCategory,
  language: Language
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ pdfDoc: any; form: any }> {
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

export async function fillSportsHallReportForm(
  data: SportsHallReportData,
  leagueCategory: LeagueCategory,
  language: Language
): Promise<Uint8Array> {
  const { pdfDoc, form } = await loadPdfForm(leagueCategory, language)
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
  /** Radio group field name for home team "Werbung auf Spielerkleidung" (Ja/Nein) */
  advertisingHomeTeam: string
  /** Radio group field name for away team "Werbung auf Spielerkleidung" (Ja/Nein) */
  advertisingAwayTeam: string
}

const NLA_WIZARD_FIELDS: WizardFieldMapping = {
  allPointsInOrderCheckbox: 'Kontrollkästchen8',
  advertisingHomeTeam: 'Gruppe430',
  advertisingAwayTeam: 'Gruppe434',
}

const NLB_WIZARD_FIELDS: WizardFieldMapping = {
  allPointsInOrderCheckbox: 'Kontrollkästchen17',
  advertisingHomeTeam: '31',
  advertisingAwayTeam: '34',
}

/** OK option value used by all radio groups in the PDF templates */
const RADIO_OK_OPTION = 'Auswahl3'

/** Not-OK option value used by all radio groups in the PDF templates */
const RADIO_NOT_OK_OPTION = 'Auswahl4'

export interface JerseyAdvertisingOptions {
  homeTeam: boolean
  awayTeam: boolean
}

// ---------------------------------------------------------------------------
// Checklist section / sub-item mappings for the non-conformant workflow
// ---------------------------------------------------------------------------

export interface ChecklistSubItem {
  /** Unique key within the section (e.g. 'lines', 'attackLine') */
  id: string
  /** i18n key for the sub-item label */
  labelKey: TranslationKey
  /** PDF radio group field name(s) — one per sub-item row on the form */
  radioField: string
}

export interface ChecklistSection {
  /** Section letter matching the PDF form (A, B, C, …) */
  id: string
  /** i18n key for the section label */
  labelKey: TranslationKey
  /** Sub-items within this section */
  subItems: readonly ChecklistSubItem[]
  /** PDF text field name(s) for the remarks column */
  commentFields: readonly string[]
}

const NLA_CHECKLIST_SECTIONS: readonly ChecklistSection[] = [
  {
    id: 'A',
    labelKey: 'pdf.wizard.sections.fieldAndLines',
    subItems: [
      { id: 'lines', labelKey: 'pdf.wizard.subItems.boundaryLines', radioField: 'Gruppe4' },
      { id: 'attackLine', labelKey: 'pdf.wizard.subItems.attackLine', radioField: 'Gruppe41' },
    ],
    commentFields: ['Text7.0.0'],
  },
  {
    id: 'B',
    labelKey: 'pdf.wizard.sections.warmUpArea',
    subItems: [
      { id: 'warmUp', labelKey: 'pdf.wizard.subItems.warmUpArea', radioField: 'Gruppe42' },
    ],
    commentFields: ['Text7.0.1'],
  },
  {
    id: 'C',
    labelKey: 'pdf.wizard.sections.netEquipment',
    subItems: [
      { id: 'antennas', labelKey: 'pdf.wizard.subItems.antennas', radioField: 'Gruppe43' },
      { id: 'netBand', labelKey: 'pdf.wizard.subItems.netTopBand', radioField: 'Gruppe44' },
      { id: 'reserveNet', labelKey: 'pdf.wizard.subItems.reserveNet', radioField: 'Gruppe45' },
      { id: 'postsNoWire', labelKey: 'pdf.wizard.subItems.postsNoWire', radioField: 'Gruppe46' },
      { id: 'postsPadding', labelKey: 'pdf.wizard.subItems.postsPadding', radioField: 'Gruppe47' },
      { id: 'tabletMount', labelKey: 'pdf.wizard.subItems.tabletMount', radioField: 'Gruppe48' },
      { id: 'netHeight', labelKey: 'pdf.wizard.subItems.netHeight', radioField: 'Gruppe49' },
    ],
    commentFields: ['Text7.0.2'],
  },
  {
    id: 'D',
    labelKey: 'pdf.wizard.sections.refereeChair',
    subItems: [{ id: 'chair', labelKey: 'pdf.wizard.subItems.refereeChair', radioField: '10' }],
    commentFields: ['Text7.0.3'],
  },
  {
    id: 'E',
    labelKey: 'pdf.wizard.sections.manometer',
    subItems: [{ id: 'manometer', labelKey: 'pdf.wizard.subItems.manometer', radioField: '11' }],
    commentFields: ['Text7.0.4'],
  },
  {
    id: 'F',
    labelKey: 'pdf.wizard.sections.measuringRod',
    subItems: [{ id: 'rod', labelKey: 'pdf.wizard.subItems.measuringRod', radioField: '12' }],
    commentFields: ['Text7.0.5'],
  },
  {
    id: 'G',
    labelKey: 'pdf.wizard.sections.lineFlags',
    subItems: [{ id: 'flags', labelKey: 'pdf.wizard.subItems.lineFlags', radioField: '13' }],
    commentFields: ['Text7.0.6'],
  },
  {
    id: 'H',
    labelKey: 'pdf.wizard.sections.buzzer',
    subItems: [{ id: 'buzzer', labelKey: 'pdf.wizard.subItems.buzzer', radioField: '14' }],
    commentFields: ['Text7.0.7'],
  },
  {
    id: 'I',
    labelKey: 'pdf.wizard.sections.eScoresheet',
    subItems: [
      { id: 'eScorerOnTime', labelKey: 'pdf.wizard.subItems.eScorerOnTime', radioField: '15' },
      { id: 'reserveLaptop', labelKey: 'pdf.wizard.subItems.reserveLaptop', radioField: '16' },
      { id: 'usbStick', labelKey: 'pdf.wizard.subItems.usbStick', radioField: '17' },
      {
        id: 'reserveMatchSheet',
        labelKey: 'pdf.wizard.subItems.reserveMatchSheet',
        radioField: '18',
      },
    ],
    commentFields: ['Text7.1'],
  },
  {
    id: 'J',
    labelKey: 'pdf.wizard.sections.tablets',
    subItems: [
      { id: 'refereeTablets', labelKey: 'pdf.wizard.subItems.refereeTablets', radioField: '19' },
      { id: 'benchTablets', labelKey: 'pdf.wizard.subItems.benchTablets', radioField: '20' },
      { id: 'tabletCharging', labelKey: 'pdf.wizard.subItems.tabletCharging', radioField: '21' },
    ],
    commentFields: ['Text7.2'],
  },
  {
    id: 'K',
    labelKey: 'pdf.wizard.sections.scoreboard',
    subItems: [
      { id: 'scoreboard', labelKey: 'pdf.wizard.subItems.scoreboard', radioField: '22' },
      {
        id: 'scoreboardFunction',
        labelKey: 'pdf.wizard.subItems.scoreboardFunction',
        radioField: '23',
      },
    ],
    commentFields: ['Text7.3'],
  },
  {
    id: 'L',
    labelKey: 'pdf.wizard.sections.balls',
    subItems: [
      { id: 'ballCount', labelKey: 'pdf.wizard.subItems.ballCount', radioField: 'Gruppe424' },
      {
        id: 'ballCondition',
        labelKey: 'pdf.wizard.subItems.ballCondition',
        radioField: 'Gruppe425',
      },
    ],
    commentFields: ['Text7.4'],
  },
  {
    id: 'M',
    labelKey: 'pdf.wizard.sections.ballRetrievers',
    subItems: [
      {
        id: 'ballRetrievers',
        labelKey: 'pdf.wizard.subItems.ballRetrievers',
        radioField: 'Gruppe426',
      },
    ],
    commentFields: ['Text7.5'],
  },
  {
    id: 'N',
    labelKey: 'pdf.wizard.sections.quickMoppers',
    subItems: [
      { id: 'quickMoppers', labelKey: 'pdf.wizard.subItems.quickMoppers', radioField: 'Gruppe427' },
    ],
    commentFields: ['Text7.6'],
  },
  {
    id: 'O',
    labelKey: 'pdf.wizard.sections.hallSpeaker',
    subItems: [
      { id: 'hallSpeaker', labelKey: 'pdf.wizard.subItems.hallSpeaker', radioField: 'Gruppe428' },
    ],
    commentFields: ['Text7.7'],
  },
  {
    id: 'P',
    labelKey: 'pdf.wizard.sections.dressHome',
    subItems: [
      { id: 'dressHomeColor', labelKey: 'pdf.wizard.subItems.dressColor', radioField: 'Gruppe429' },
      {
        id: 'dressHomeAd',
        labelKey: 'pdf.wizard.subItems.advertisingOnUniform',
        radioField: 'Gruppe430',
      },
      {
        id: 'dressHomeLibero',
        labelKey: 'pdf.wizard.subItems.liberoDress',
        radioField: 'Gruppe431',
      },
    ],
    commentFields: ['Text7.8'],
  },
  {
    id: 'Q',
    labelKey: 'pdf.wizard.sections.dressAway',
    subItems: [
      { id: 'dressAwayColor', labelKey: 'pdf.wizard.subItems.dressColor', radioField: 'Gruppe432' },
      {
        id: 'dressAwayAd',
        labelKey: 'pdf.wizard.subItems.advertisingOnUniform',
        radioField: 'Gruppe433',
      },
      {
        id: 'dressAwayLibero',
        labelKey: 'pdf.wizard.subItems.liberoDress',
        radioField: 'Gruppe434',
      },
    ],
    commentFields: ['Text7.9'],
  },
  {
    id: 'R',
    labelKey: 'pdf.wizard.sections.miscellaneous',
    subItems: [
      { id: 'misc1', labelKey: 'pdf.wizard.subItems.miscItem1', radioField: 'Gruppe435' },
      { id: 'misc2', labelKey: 'pdf.wizard.subItems.miscItem2', radioField: 'Gruppe440' },
    ],
    commentFields: ['Text7.10', 'Text7.11'],
  },
] as const

const NLB_CHECKLIST_SECTIONS: readonly ChecklistSection[] = [
  {
    id: 'A',
    labelKey: 'pdf.wizard.sections.fieldAndLines',
    subItems: [
      { id: 'lines', labelKey: 'pdf.wizard.subItems.boundaryLines', radioField: 'Gruppe16' },
      { id: 'attackLine', labelKey: 'pdf.wizard.subItems.attackLine', radioField: 'Gruppe17' },
      { id: 'freeZone', labelKey: 'pdf.wizard.subItems.freeZone', radioField: 'Gruppe18' },
    ],
    commentFields: ['Text16.0.0'],
  },
  {
    id: 'B',
    labelKey: 'pdf.wizard.sections.netEquipment',
    subItems: [
      { id: 'antennas', labelKey: 'pdf.wizard.subItems.antennas', radioField: 'Gruppe19' },
      { id: 'netBand', labelKey: 'pdf.wizard.subItems.netTopBand', radioField: 'Gruppe20' },
      { id: 'postsNoWire', labelKey: 'pdf.wizard.subItems.postsNoWire', radioField: 'Gruppe21' },
      { id: 'postsPadding', labelKey: 'pdf.wizard.subItems.postsPadding', radioField: '22' },
      { id: 'reserveNet', labelKey: 'pdf.wizard.subItems.reserveNet', radioField: '23' },
      { id: 'netHeight', labelKey: 'pdf.wizard.subItems.netHeight', radioField: '24' },
    ],
    commentFields: ['Text16.0.1'],
  },
  {
    id: 'C',
    labelKey: 'pdf.wizard.sections.numberPlates',
    subItems: [
      {
        id: 'numberPlatesHome',
        labelKey: 'pdf.wizard.subItems.numberPlatesHome',
        radioField: '25',
      },
      {
        id: 'numberPlatesAway',
        labelKey: 'pdf.wizard.subItems.numberPlatesAway',
        radioField: '26',
      },
    ],
    commentFields: ['Text16.1'],
  },
  {
    id: 'D',
    labelKey: 'pdf.wizard.sections.manometer',
    subItems: [{ id: 'manometer', labelKey: 'pdf.wizard.subItems.manometer', radioField: '27' }],
    commentFields: ['Text16.2'],
  },
  {
    id: 'E',
    labelKey: 'pdf.wizard.sections.measuringRod',
    subItems: [{ id: 'rod', labelKey: 'pdf.wizard.subItems.measuringRod', radioField: '28' }],
    commentFields: ['Text16.3'],
  },
  {
    id: 'F',
    labelKey: 'pdf.wizard.sections.balls',
    subItems: [
      { id: 'ballCount', labelKey: 'pdf.wizard.subItems.ballCount', radioField: '29' },
      { id: 'ballCondition', labelKey: 'pdf.wizard.subItems.ballCondition', radioField: '30' },
    ],
    commentFields: ['Text16.4'],
  },
  {
    id: 'G',
    labelKey: 'pdf.wizard.sections.ballRetrievers',
    subItems: [
      { id: 'ballRetrievers', labelKey: 'pdf.wizard.subItems.ballRetrievers', radioField: '31' },
    ],
    commentFields: ['Text16.5'],
  },
  {
    id: 'H',
    labelKey: 'pdf.wizard.sections.dressHome',
    subItems: [
      { id: 'dressHomeColor', labelKey: 'pdf.wizard.subItems.dressColor', radioField: '32' },
      { id: 'dressHomeAd', labelKey: 'pdf.wizard.subItems.advertisingOnUniform', radioField: '33' },
      { id: 'dressHomeLibero', labelKey: 'pdf.wizard.subItems.liberoDress', radioField: '34' },
    ],
    commentFields: ['Text16.6'],
  },
  {
    id: 'I',
    labelKey: 'pdf.wizard.sections.dressAway',
    subItems: [
      { id: 'dressAwayColor', labelKey: 'pdf.wizard.subItems.dressColor', radioField: '35' },
      { id: 'dressAwayAd', labelKey: 'pdf.wizard.subItems.advertisingOnUniform', radioField: '36' },
      { id: 'dressAwayLibero', labelKey: 'pdf.wizard.subItems.liberoDress', radioField: '37' },
    ],
    commentFields: ['Text16.7'],
  },
  {
    id: 'J',
    labelKey: 'pdf.wizard.sections.eScoresheet',
    subItems: [
      { id: 'eScorerOnTime', labelKey: 'pdf.wizard.subItems.eScorerOnTime', radioField: '38' },
      { id: 'reserveLaptop', labelKey: 'pdf.wizard.subItems.reserveLaptop', radioField: '39' },
    ],
    commentFields: ['Text16.8'],
  },
  {
    id: 'K',
    labelKey: 'pdf.wizard.sections.tablets',
    subItems: [
      { id: 'refereeTablets', labelKey: 'pdf.wizard.subItems.refereeTablets', radioField: '40' },
      { id: 'benchTablets', labelKey: 'pdf.wizard.subItems.benchTablets', radioField: '41' },
    ],
    commentFields: ['Text16.9'],
  },
  {
    id: 'L',
    labelKey: 'pdf.wizard.sections.miscellaneous',
    subItems: [],
    commentFields: ['Text16.10', 'Text16.11'],
  },
] as const

export function getChecklistSections(leagueCategory: LeagueCategory): readonly ChecklistSection[] {
  return leagueCategory === 'NLA' ? NLA_CHECKLIST_SECTIONS : NLB_CHECKLIST_SECTIONS
}

/**
 * All four signature name text fields at the bottom of the report form.
 */
interface SignatureNameFields {
  firstReferee: string
  secondReferee: string
  homeTeam: string
  awayTeam: string
}

const NLA_SIGNATURE_NAME_FIELDS: SignatureNameFields = {
  firstReferee: 'Text19',
  secondReferee: 'Text20',
  homeTeam: 'Text21',
  awayTeam: 'Text22',
}

const NLB_SIGNATURE_NAME_FIELDS: SignatureNameFields = {
  firstReferee: 'Text23',
  secondReferee: 'Text24',
  homeTeam: 'Text25',
  awayTeam: 'Text26',
}

function getWizardFieldMapping(leagueCategory: LeagueCategory): WizardFieldMapping {
  return leagueCategory === 'NLA' ? NLA_WIZARD_FIELDS : NLB_WIZARD_FIELDS
}

/**
 * Signature placement coordinates per league category.
 * Positioned to the right of the referee name text fields at the bottom of the page.
 */
interface SignaturePosition {
  x: number
  y: number
  width: number
  height: number
}

const SIGNATURE_POSITIONS: Record<LeagueCategory, SignaturePosition> = {
  NLA: { x: 340, y: 104, width: 130, height: 24 },
  NLB: { x: 340, y: 157, width: 130, height: 24 },
}

/** Signature positions for all four signers (non-conformant workflow). */
interface AllSignaturePositions {
  firstReferee: SignaturePosition
  secondReferee: SignaturePosition
  homeTeam: SignaturePosition
  awayTeam: SignaturePosition
}

const ALL_SIGNATURE_POSITIONS: Record<LeagueCategory, AllSignaturePositions> = {
  NLA: {
    firstReferee: { x: 340, y: 124, width: 130, height: 18 },
    secondReferee: { x: 340, y: 104, width: 130, height: 18 },
    homeTeam: { x: 340, y: 83, width: 130, height: 18 },
    awayTeam: { x: 340, y: 62, width: 130, height: 18 },
  },
  NLB: {
    firstReferee: { x: 340, y: 199, width: 130, height: 18 },
    secondReferee: { x: 340, y: 171, width: 130, height: 18 },
    homeTeam: { x: 340, y: 143, width: 130, height: 18 },
    awayTeam: { x: 340, y: 115, width: 130, height: 18 },
  },
}

/**
 * Decode a data URL (e.g. from canvas.toDataURL) to raw bytes.
 */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1]
  if (!base64) throw new Error('Invalid data URL')
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

const SIGNATURE_CROP_PADDING = 10
const RGBA_CHANNELS = 4
const ALPHA_CHANNEL_OFFSET = 3

/**
 * Crop a signature PNG data URL to its bounding box, removing transparent
 * whitespace around the actual strokes. Returns the cropped data URL.
 */
async function cropSignatureDataUrl(dataUrl: string): Promise<string> {
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load signature image'))
    img.src = dataUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl

  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const { data, width, height } = imageData

  // Find bounding box of non-transparent pixels
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * RGBA_CHANNELS + ALPHA_CHANNEL_OFFSET] ?? 0
      if (alpha > 0) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  // No visible pixels found — return original
  if (maxX < minX || maxY < minY) return dataUrl

  // Add padding, clamped to canvas bounds
  const cropX = Math.max(0, minX - SIGNATURE_CROP_PADDING)
  const cropY = Math.max(0, minY - SIGNATURE_CROP_PADDING)
  const cropW = Math.min(width - cropX, maxX - minX + 1 + SIGNATURE_CROP_PADDING * 2)
  const cropH = Math.min(height - cropY, maxY - minY + 1 + SIGNATURE_CROP_PADDING * 2)

  const croppedCanvas = document.createElement('canvas')
  croppedCanvas.width = cropW
  croppedCanvas.height = cropH
  const croppedCtx = croppedCanvas.getContext('2d')
  if (!croppedCtx) return dataUrl

  croppedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
  return croppedCanvas.toDataURL('image/png')
}

/**
 * Embed a PNG signature image into a PDF page at the given position.
 */
async function embedSignatureAtPosition(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc: any,
  signatureDataUrl: string,
  pos: SignaturePosition
): Promise<void> {
  const croppedDataUrl = await cropSignatureDataUrl(signatureDataUrl)
  const signatureBytes = dataUrlToBytes(croppedDataUrl)
  const signatureImage = await pdfDoc.embedPng(signatureBytes)

  const page = pdfDoc.getPage(0)

  // Scale the signature to fit within the field with padding
  const padding = 3
  const maxWidth = pos.width - padding * 2
  const maxHeight = pos.height - padding * 2
  const aspectRatio = signatureImage.width / signatureImage.height
  let drawWidth = maxWidth
  let drawHeight = drawWidth / aspectRatio
  if (drawHeight > maxHeight) {
    drawHeight = maxHeight
    drawWidth = drawHeight * aspectRatio
  }

  // Center the signature within the field
  const xOffset = pos.x + padding + (maxWidth - drawWidth) / 2
  const yOffset = pos.y + padding + (maxHeight - drawHeight) / 2

  page.drawImage(signatureImage, {
    x: xOffset,
    y: yOffset,
    width: drawWidth,
    height: drawHeight,
  })
}

/**
 * Embed a PNG signature image into a PDF document at the first referee's
 * signature position.
 */
async function embedSignature(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc: any,
  signatureDataUrl: string,
  leagueCategory: LeagueCategory
): Promise<void> {
  await embedSignatureAtPosition(pdfDoc, signatureDataUrl, SIGNATURE_POSITIONS[leagueCategory])
}

/**
 * Fills the sports hall report with "all points in order" checked and
 * advertising declared as "Ja" for both teams. Individual checklist items
 * are left unchecked — the referee only needs to fill these if something
 * is not in order. This is the "happy path" wizard flow.
 *
 * When a signatureDataUrl is provided, the first referee's signature is
 * embedded at the designated position on the PDF.
 */
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

  fillBaseGameInfo(form, data, mapping)

  // Check the "all points in order" checkbox
  try {
    form.getCheckBox(wizardMapping.allPointsInOrderCheckbox).check()
  } catch (error) {
    logger.warn(`Could not check "${wizardMapping.allPointsInOrderCheckbox}":`, error)
  }

  // Set advertising "Werbung auf Spielerkleidung" per team
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

  // Embed first referee signature if provided
  if (signatureDataUrl) {
    try {
      await embedSignature(pdfDoc, signatureDataUrl, leagueCategory)
    } catch (error) {
      logger.warn('Could not embed signature in PDF:', error)
    }
  }

  return pdfDoc.save()
}

/**
 * Generates a sports hall report with all checkpoints marked as OK and
 * the first referee's signature embedded. Returns the PDF bytes and filename
 * for use with the Web Share API or print dialog.
 */
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
// Non-conformant report types and fill function
// ---------------------------------------------------------------------------

/** Which sub-items are flagged as not-OK, keyed by section ID then sub-item ID. */
export type NonConformantSelections = Record<string, Set<string>>

/** Signature data for the non-conformant workflow (up to 4 signers). */
export interface NonConformantSignatures {
  firstReferee?: string
  secondReferee?: string
  homeTeamCoach?: { name: string; signature: string }
  awayTeamCoach?: { name: string; signature: string }
}

/**
 * Set all checklist radio groups: OK or not-OK per sub-item.
 */
function fillChecklistRadios(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any,
  sections: readonly ChecklistSection[],
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

/**
 * Fill per-section comments into their respective PDF comment fields.
 */
function fillNonConformantComments(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any,
  sections: readonly ChecklistSection[],
  nonConformantSubItems: NonConformantSelections,
  sectionComments: Record<string, string>
): void {
  for (const section of sections) {
    if (!nonConformantSubItems[section.id]?.size) continue
    const comment = sectionComments[section.id]?.trim()
    if (!comment) continue
    const commentField = section.commentFields[0]
    if (commentField) trySetTextField(form, commentField, comment)
  }
}

/**
 * Embed up to 4 signatures at their designated positions.
 */
async function embedAllSignatures(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc: any,
  positions: AllSignaturePositions,
  signatures: NonConformantSignatures
): Promise<void> {
  const entries: Array<[string | undefined, SignaturePosition]> = [
    [signatures.firstReferee, positions.firstReferee],
    [signatures.secondReferee, positions.secondReferee],
    [signatures.homeTeamCoach?.signature, positions.homeTeam],
    [signatures.awayTeamCoach?.signature, positions.awayTeam],
  ]

  for (const [dataUrl, position] of entries) {
    if (!dataUrl) continue
    try {
      await embedSignatureAtPosition(pdfDoc, dataUrl, position)
    } catch (error) {
      logger.warn('Could not embed signature:', error)
    }
  }
}

export interface NonConformantReportOptions {
  data: SportsHallReportData
  leagueCategory: LeagueCategory
  language: Language
  nonConformantSubItems: NonConformantSelections
  sectionComments: Record<string, string>
  signatures?: NonConformantSignatures
}

/**
 * Fill the sports hall report for the non-conformant workflow.
 */
export async function fillNonConformantReport(
  options: NonConformantReportOptions
): Promise<Uint8Array> {
  const { data, leagueCategory, language, nonConformantSubItems, sectionComments, signatures } = options
  const { pdfDoc, form } = await loadPdfForm(leagueCategory, language)
  const mapping = getFieldMapping(leagueCategory)
  const sections = getChecklistSections(leagueCategory)
  const signatureNameFields =
    leagueCategory === 'NLA' ? NLA_SIGNATURE_NAME_FIELDS : NLB_SIGNATURE_NAME_FIELDS

  fillBaseGameInfo(form, data, mapping)
  fillChecklistRadios(form, sections, nonConformantSubItems)
  fillNonConformantComments(form, sections, nonConformantSubItems, sectionComments)

  if (signatures?.homeTeamCoach?.name) {
    trySetTextField(form, signatureNameFields.homeTeam, signatures.homeTeamCoach.name)
  }
  if (signatures?.awayTeamCoach?.name) {
    trySetTextField(form, signatureNameFields.awayTeam, signatures.awayTeamCoach.name)
  }

  if (signatures) {
    await embedAllSignatures(pdfDoc, ALL_SIGNATURE_POSITIONS[leagueCategory], signatures)
  }

  return pdfDoc.save()
}

/**
 * Generate a non-conformant report preview (no signatures) for review.
 */
export async function generateNonConformantPreviewBytes(
  options: Omit<NonConformantReportOptions, 'signatures'>
): Promise<{ pdfBytes: Uint8Array; filename: string }> {
  const pdfBytes = await fillNonConformantReport(options)
  const filename = buildReportFilename(
    options.leagueCategory,
    options.language,
    options.data.startingDateTime,
    options.data.gameNumber
  )
  return { pdfBytes, filename }
}

/**
 * Generate the final non-conformant report with all signatures embedded.
 */
export async function generateNonConformantReportBytes(
  options: NonConformantReportOptions & { signatures: NonConformantSignatures }
): Promise<{ pdfBytes: Uint8Array; filename: string }> {
  return generateNonConformantPreviewBytes(options)
}
