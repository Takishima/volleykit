/**
 * Signature block of the sports hall report PDF: embeds the signers' drawn
 * signatures and sizes the signer name fields.
 *
 * All helpers must run before `form.flatten()`, which removes the fields the
 * box geometry is read from.
 */

import { logger } from '@/common/utils/logger'

import {
  SIGNATURE_GAP_PT,
  SIGNATURE_WIDTH_PT,
  type SignatureNameFields,
  type SignaturePosition,
} from './pdf-field-mappings'

import type { PDFDocument, PDFForm } from 'pdf-lib'

/** Signature data for the non-conformant workflow (up to 4 signers). */
export interface NonConformantSignatures {
  firstReferee?: string
  secondReferee?: string
  homeTeamCoach?: { name: string; signature: string }
  awayTeamCoach?: { name: string; signature: string }
}

// ---------------------------------------------------------------------------
// Signer name sizing
// ---------------------------------------------------------------------------

/** Matches the templates' default appearance (`/Helv 12 Tf`). */
const SIGNATURE_NAME_FONT_SIZE = 12
/** pdf-lib draws text field content inset from the widget border. */
const TEXT_FIELD_INNER_PADDING_PT = 4

/**
 * Keeps the signature-block names at the template's 12pt and only shrinks a
 * name when it would not fit the field's width on a single line.
 */
export function fitSignatureNameFonts(form: PDFForm, nameFields: SignatureNameFields): void {
  // Same font pdf-lib uses when it renders the field appearances on flatten
  const helvetica = form.getDefaultFont()
  const fieldNames = [
    nameFields.firstReferee,
    nameFields.secondReferee,
    nameFields.homeTeam,
    nameFields.awayTeam,
  ]
  for (const fieldName of fieldNames) {
    try {
      const field = form.getTextField(fieldName)
      const text = field.getText()
      const widget = field.acroField.getWidgets()[0]
      if (!text || !widget) continue
      const available = widget.getRectangle().width - TEXT_FIELD_INNER_PADDING_PT
      const natural = helvetica.widthOfTextAtSize(text, SIGNATURE_NAME_FONT_SIZE)
      const scale = natural > available ? available / natural : 1
      // Never 0: pdf-lib treats font size 0 as "auto-size to the field box"
      field.setFontSize(Math.max(1, Math.floor(SIGNATURE_NAME_FONT_SIZE * scale)))
    } catch (error) {
      logger.warn(`Could not size name field "${fieldName}":`, error)
    }
  }
}

// ---------------------------------------------------------------------------
// Signature embedding
// ---------------------------------------------------------------------------

const SIGNATURE_CROP_PADDING = 10
const SIGNATURE_EMBED_PADDING_PT = 3
const RGBA_CHANNELS = 4
const ALPHA_CHANNEL_OFFSET = 3

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

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img), { once: true })
    img.addEventListener('error', () => reject(new Error('Failed to load signature image')), {
      once: true,
    })
    img.src = dataUrl
  })
}

interface InkBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Bounding box of all non-transparent pixels, or `undefined` for a blank image. */
function findInkBounds(imageData: ImageData): InkBounds | undefined {
  const { data, width, height } = imageData
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

  if (maxX < minX || maxY < minY) return undefined
  return { minX, minY, maxX, maxY }
}

/** Trims transparent margins around the drawn signature, keeping a small padding. */
async function cropSignatureDataUrl(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl)

  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl

  ctx.drawImage(img, 0, 0)
  const bounds = findInkBounds(ctx.getImageData(0, 0, canvas.width, canvas.height))
  if (!bounds) return dataUrl

  const cropX = Math.max(0, bounds.minX - SIGNATURE_CROP_PADDING)
  const cropY = Math.max(0, bounds.minY - SIGNATURE_CROP_PADDING)
  const cropW = Math.min(
    canvas.width - cropX,
    bounds.maxX - bounds.minX + 1 + SIGNATURE_CROP_PADDING * 2
  )
  const cropH = Math.min(
    canvas.height - cropY,
    bounds.maxY - bounds.minY + 1 + SIGNATURE_CROP_PADDING * 2
  )

  const croppedCanvas = document.createElement('canvas')
  croppedCanvas.width = cropW
  croppedCanvas.height = cropH
  const croppedCtx = croppedCanvas.getContext('2d')
  if (!croppedCtx) return dataUrl

  croppedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
  return croppedCanvas.toDataURL('image/png')
}

async function embedSignatureAtPosition(
  pdfDoc: PDFDocument,
  signatureDataUrl: string,
  pos: SignaturePosition
): Promise<void> {
  const croppedDataUrl = await cropSignatureDataUrl(signatureDataUrl)
  const signatureBytes = dataUrlToBytes(croppedDataUrl)
  const signatureImage = await pdfDoc.embedPng(signatureBytes)

  const page = pdfDoc.getPage(0)

  const padding = SIGNATURE_EMBED_PADDING_PT
  const maxWidth = pos.width - padding * 2
  const maxHeight = pos.height - padding * 2
  const aspectRatio = signatureImage.width / signatureImage.height
  let drawWidth = maxWidth
  let drawHeight = drawWidth / aspectRatio
  if (drawHeight > maxHeight) {
    drawHeight = maxHeight
    drawWidth = drawHeight * aspectRatio
  }

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
 * The signature cell sits in the same table row as the signer's name field, so
 * its vertical extent is read from that field's widget rectangle. This keeps
 * the boxes aligned across the NLA/NLB and de/fr templates, whose rows differ
 * in both height and vertical offset.
 *
 * Must be called before `form.flatten()`, which removes the fields.
 */
export function signatureBoxFor(form: PDFForm, nameField: string): SignaturePosition {
  const widget = form.getTextField(nameField).acroField.getWidgets()[0]
  if (!widget) throw new Error(`Name field "${nameField}" has no widget`)
  const rect = widget.getRectangle()
  return {
    x: rect.x + rect.width + SIGNATURE_GAP_PT,
    y: rect.y,
    width: SIGNATURE_WIDTH_PT,
    height: rect.height,
  }
}

export async function embedSignature(
  pdfDoc: PDFDocument,
  form: PDFForm,
  signatureDataUrl: string,
  nameFields: SignatureNameFields
): Promise<void> {
  const position = signatureBoxFor(form, nameFields.firstReferee)
  await embedSignatureAtPosition(pdfDoc, signatureDataUrl, position)
}

export async function embedAllSignatures(
  pdfDoc: PDFDocument,
  form: PDFForm,
  nameFields: SignatureNameFields,
  signatures: NonConformantSignatures
): Promise<void> {
  const entries: Array<[string | undefined, string]> = [
    [signatures.firstReferee, nameFields.firstReferee],
    [signatures.secondReferee, nameFields.secondReferee],
    [signatures.homeTeamCoach?.signature, nameFields.homeTeam],
    [signatures.awayTeamCoach?.signature, nameFields.awayTeam],
  ]

  for (const [dataUrl, nameField] of entries) {
    if (!dataUrl) continue
    try {
      await embedSignatureAtPosition(pdfDoc, dataUrl, signatureBoxFor(form, nameField))
    } catch (error) {
      logger.warn('Could not embed signature:', error)
    }
  }
}
