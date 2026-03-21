import type { TranslationKey } from '@/i18n'

import type { LeagueCategory } from './pdf-report-data'

// ---------------------------------------------------------------------------
// Base game info field mappings
// ---------------------------------------------------------------------------

export interface FieldMapping {
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

export function getFieldMapping(leagueCategory: LeagueCategory): FieldMapping {
  return leagueCategory === 'NLA' ? NLA_FIELD_MAPPING : NLB_FIELD_MAPPING
}

// ---------------------------------------------------------------------------
// Wizard-specific field mappings
// ---------------------------------------------------------------------------

export interface WizardFieldMapping {
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

export function getWizardFieldMapping(leagueCategory: LeagueCategory): WizardFieldMapping {
  return leagueCategory === 'NLA' ? NLA_WIZARD_FIELDS : NLB_WIZARD_FIELDS
}

/** OK option value used by all radio groups in the PDF templates */
export const RADIO_OK_OPTION = 'Auswahl3'

/** Not-OK option value used by all radio groups in the PDF templates */
export const RADIO_NOT_OK_OPTION = 'Auswahl4'

// ---------------------------------------------------------------------------
// Signature name field mappings
// ---------------------------------------------------------------------------

export interface SignatureNameFields {
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

export function getSignatureNameFields(leagueCategory: LeagueCategory): SignatureNameFields {
  return leagueCategory === 'NLA' ? NLA_SIGNATURE_NAME_FIELDS : NLB_SIGNATURE_NAME_FIELDS
}

// ---------------------------------------------------------------------------
// Signature position coordinates
// ---------------------------------------------------------------------------

export interface SignaturePosition {
  x: number
  y: number
  width: number
  height: number
}

export interface AllSignaturePositions {
  firstReferee: SignaturePosition
  secondReferee: SignaturePosition
  homeTeam: SignaturePosition
  awayTeam: SignaturePosition
}

export const SIGNATURE_POSITIONS: Record<LeagueCategory, SignaturePosition> = {
  NLA: { x: 340, y: 104, width: 130, height: 24 },
  NLB: { x: 340, y: 157, width: 130, height: 24 },
}

export const ALL_SIGNATURE_POSITIONS: Record<LeagueCategory, AllSignaturePositions> = {
  NLA: {
    firstReferee: { x: 340, y: 104, width: 130, height: 24 },
    secondReferee: { x: 340, y: 83, width: 130, height: 18 },
    homeTeam: { x: 340, y: 62, width: 130, height: 18 },
    awayTeam: { x: 340, y: 41, width: 130, height: 18 },
  },
  NLB: {
    firstReferee: { x: 340, y: 157, width: 130, height: 24 },
    secondReferee: { x: 340, y: 129, width: 130, height: 18 },
    homeTeam: { x: 340, y: 101, width: 130, height: 18 },
    awayTeam: { x: 340, y: 73, width: 130, height: 18 },
  },
}

// ---------------------------------------------------------------------------
// Checklist UI model (section/sub-item structure without PDF field names)
// ---------------------------------------------------------------------------

export interface ChecklistSubItem {
  /** Unique key within the section (e.g. 'lines', 'attackLine') */
  id: string
  /** i18n key for the sub-item label */
  labelKey: TranslationKey
}

export interface ChecklistSection {
  /** Section letter matching the PDF form (A, B, C, …) */
  id: string
  /** i18n key for the section label */
  labelKey: TranslationKey
  /** Sub-items within this section */
  subItems: readonly ChecklistSubItem[]
}

// ---------------------------------------------------------------------------
// PDF radio field mapping — keyed by section + sub-item ID
// ---------------------------------------------------------------------------

export interface PdfChecklistSubItem {
  /** Unique key within the section */
  id: string
  /** i18n key for the sub-item label */
  labelKey: TranslationKey
  /** PDF radio group field name */
  radioField: string
}

export interface PdfChecklistSection {
  /** Section letter matching the PDF form (A, B, C, …) */
  id: string
  /** i18n key for the section label */
  labelKey: TranslationKey
  /** Sub-items with their PDF radio field references */
  subItems: readonly PdfChecklistSubItem[]
  /** PDF text field name(s) for the remarks column */
  commentFields: readonly string[]
}

// ---------------------------------------------------------------------------
// NLA checklist sections (full PDF mapping)
// ---------------------------------------------------------------------------

const NLA_CHECKLIST_SECTIONS: readonly PdfChecklistSection[] = [
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
    ],
    commentFields: ['Text7.2'],
  },
  {
    id: 'K',
    labelKey: 'pdf.wizard.sections.scoreboard',
    subItems: [
      { id: 'scoreboard', labelKey: 'pdf.wizard.subItems.scoreboard', radioField: '21' },
      {
        id: 'scoreboardFunction',
        labelKey: 'pdf.wizard.subItems.scoreboardFunction',
        radioField: '22',
      },
    ],
    commentFields: ['Text7.3'],
  },
  {
    id: 'L',
    labelKey: 'pdf.wizard.sections.balls',
    subItems: [
      { id: 'ballCount', labelKey: 'pdf.wizard.subItems.ballCount', radioField: '23' },
      {
        id: 'ballCondition',
        labelKey: 'pdf.wizard.subItems.ballCondition',
        radioField: 'Gruppe424',
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
        radioField: 'Gruppe425',
      },
    ],
    commentFields: ['Text7.5'],
  },
  {
    id: 'N',
    labelKey: 'pdf.wizard.sections.quickMoppers',
    subItems: [
      { id: 'quickMoppers', labelKey: 'pdf.wizard.subItems.quickMoppers', radioField: 'Gruppe426' },
    ],
    commentFields: ['Text7.6'],
  },
  {
    id: 'O',
    labelKey: 'pdf.wizard.sections.hallSpeaker',
    subItems: [
      { id: 'hallSpeaker', labelKey: 'pdf.wizard.subItems.hallSpeaker', radioField: 'Gruppe427' },
    ],
    commentFields: ['Text7.7'],
  },
  {
    id: 'P',
    labelKey: 'pdf.wizard.sections.dressHome',
    subItems: [
      { id: 'dressHomeColor', labelKey: 'pdf.wizard.subItems.dressColor', radioField: 'Gruppe428' },
      {
        id: 'dressHomeLibero',
        labelKey: 'pdf.wizard.subItems.liberoDress',
        radioField: 'Gruppe429',
      },
      {
        id: 'dressHomeAd',
        labelKey: 'pdf.wizard.subItems.advertisingOnUniform',
        radioField: 'Gruppe430',
      },
    ],
    commentFields: ['Text7.8'],
  },
  {
    id: 'Q',
    labelKey: 'pdf.wizard.sections.dressAway',
    subItems: [
      { id: 'dressAwayColor', labelKey: 'pdf.wizard.subItems.dressColor', radioField: 'Gruppe431' },
      {
        id: 'dressAwayLibero',
        labelKey: 'pdf.wizard.subItems.liberoDress',
        radioField: 'Gruppe432',
      },
      {
        id: 'dressAwayMatchkit',
        labelKey: 'pdf.wizard.subItems.matchKit',
        radioField: 'Gruppe433',
      },
      {
        id: 'dressAwayAd',
        labelKey: 'pdf.wizard.subItems.advertisingOnUniform',
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

// ---------------------------------------------------------------------------
// NLB checklist sections (full PDF mapping)
// ---------------------------------------------------------------------------

const NLB_CHECKLIST_SECTIONS: readonly PdfChecklistSection[] = [
  {
    id: 'A',
    labelKey: 'pdf.wizard.sections.fieldAndLines',
    subItems: [
      { id: 'lines', labelKey: 'pdf.wizard.subItems.boundaryLines', radioField: 'Gruppe16' },
      { id: 'attackLine', labelKey: 'pdf.wizard.subItems.attackLine', radioField: 'Gruppe17' },
    ],
    commentFields: ['Text16.0.0'],
  },
  {
    id: 'B',
    labelKey: 'pdf.wizard.sections.netEquipment',
    subItems: [
      { id: 'antennas', labelKey: 'pdf.wizard.subItems.antennas', radioField: 'Gruppe18' },
      { id: 'netBand', labelKey: 'pdf.wizard.subItems.netTopBand', radioField: 'Gruppe19' },
      {
        id: 'netBottomBand',
        labelKey: 'pdf.wizard.subItems.netBottomBand',
        radioField: 'Gruppe20',
      },
    ],
    commentFields: ['Text16.0.1'],
  },
  {
    id: 'C',
    labelKey: 'pdf.wizard.sections.numberPlates',
    subItems: [
      {
        id: 'numberPlates',
        labelKey: 'pdf.wizard.subItems.numberPlates',
        radioField: 'Gruppe21',
      },
    ],
    commentFields: ['Text16.1'],
  },
  {
    id: 'D',
    labelKey: 'pdf.wizard.sections.manometer',
    subItems: [{ id: 'manometer', labelKey: 'pdf.wizard.subItems.manometer', radioField: '22' }],
    commentFields: ['Text16.2'],
  },
  {
    id: 'E',
    labelKey: 'pdf.wizard.sections.measuringRod',
    subItems: [{ id: 'rod', labelKey: 'pdf.wizard.subItems.measuringRod', radioField: '23' }],
    commentFields: ['Text16.3'],
  },
  {
    id: 'F',
    labelKey: 'pdf.wizard.sections.balls',
    subItems: [
      {
        id: 'practiseBalls',
        labelKey: 'pdf.wizard.subItems.practiseBalls',
        radioField: '24',
      },
      { id: 'matchBalls', labelKey: 'pdf.wizard.subItems.matchBalls', radioField: '25' },
      {
        id: 'matchBallsException',
        labelKey: 'pdf.wizard.subItems.matchBallsException',
        radioField: '26',
      },
    ],
    commentFields: ['Text16.4'],
  },
  {
    id: 'G',
    labelKey: 'pdf.wizard.sections.ballRetrievers',
    subItems: [
      { id: 'ballRetrievers', labelKey: 'pdf.wizard.subItems.ballRetrievers', radioField: '27' },
      {
        id: 'ballRetrieversException',
        labelKey: 'pdf.wizard.subItems.ballRetrieversException',
        radioField: '28',
      },
    ],
    commentFields: ['Text16.5'],
  },
  {
    id: 'H',
    labelKey: 'pdf.wizard.sections.dressHome',
    subItems: [
      { id: 'dressHomeColor', labelKey: 'pdf.wizard.subItems.dressColor', radioField: '29' },
      { id: 'dressHomeLibero', labelKey: 'pdf.wizard.subItems.liberoDress', radioField: '30' },
      {
        id: 'dressHomeAd',
        labelKey: 'pdf.wizard.subItems.advertisingOnUniform',
        radioField: '31',
      },
    ],
    commentFields: ['Text16.6'],
  },
  {
    id: 'I',
    labelKey: 'pdf.wizard.sections.dressAway',
    subItems: [
      { id: 'dressAwayColor', labelKey: 'pdf.wizard.subItems.dressColor', radioField: '32' },
      { id: 'dressAwayLibero', labelKey: 'pdf.wizard.subItems.liberoDress', radioField: '33' },
      {
        id: 'dressAwayAd',
        labelKey: 'pdf.wizard.subItems.advertisingOnUniform',
        radioField: '34',
      },
    ],
    commentFields: ['Text16.7'],
  },
  {
    id: 'J',
    labelKey: 'pdf.wizard.sections.eScoresheet',
    subItems: [
      { id: 'eScorerOnTime', labelKey: 'pdf.wizard.subItems.eScorerOnTime', radioField: '35' },
      { id: 'reserveLaptop', labelKey: 'pdf.wizard.subItems.reserveLaptop', radioField: '36' },
      { id: 'usbStick', labelKey: 'pdf.wizard.subItems.usbStick', radioField: '37' },
      {
        id: 'reserveMatchSheet',
        labelKey: 'pdf.wizard.subItems.reserveMatchSheet',
        radioField: '38',
      },
    ],
    commentFields: ['Text16.8'],
  },
  {
    id: 'K',
    labelKey: 'pdf.wizard.sections.tablets',
    subItems: [
      { id: 'refereeTablets', labelKey: 'pdf.wizard.subItems.refereeTablets', radioField: '39' },
    ],
    commentFields: ['Text16.9'],
  },
  {
    id: 'L',
    labelKey: 'pdf.wizard.sections.miscellaneous',
    subItems: [
      { id: 'misc1', labelKey: 'pdf.wizard.subItems.miscItem1', radioField: '40' },
      { id: 'misc2', labelKey: 'pdf.wizard.subItems.miscItem2', radioField: '41' },
    ],
    commentFields: ['Text16.10', 'Text16.11'],
  },
] as const

export function getPdfChecklistSections(
  leagueCategory: LeagueCategory
): readonly PdfChecklistSection[] {
  return leagueCategory === 'NLA' ? NLA_CHECKLIST_SECTIONS : NLB_CHECKLIST_SECTIONS
}

/**
 * Returns the UI-only checklist sections (without PDF radio field names).
 * Use this in components that only need section/sub-item structure for display.
 */
export function getChecklistSections(leagueCategory: LeagueCategory): readonly ChecklistSection[] {
  return getPdfChecklistSections(leagueCategory)
}

/** Font size for comment fields so longer text fits in the narrow PDF cells */
export const COMMENT_FIELD_FONT_SIZE = 6
