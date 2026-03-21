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

/** Not-OK option value used by advertising radio groups in the PDF templates */
const RADIO_NOT_OK_OPTION = 'Auswahl4'

export interface JerseyAdvertisingOptions {
  homeTeam: boolean
  awayTeam: boolean
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
 * Embed a PNG signature image into a PDF document at the first referee's
 * signature position.
 */
async function embedSignature(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc: any,
  signatureDataUrl: string,
  leagueCategory: LeagueCategory
): Promise<void> {
  const croppedDataUrl = await cropSignatureDataUrl(signatureDataUrl)
  const signatureBytes = dataUrlToBytes(croppedDataUrl)
  const signatureImage = await pdfDoc.embedPng(signatureBytes)

  const page = pdfDoc.getPage(0)
  const pos = SIGNATURE_POSITIONS[leagueCategory]

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
