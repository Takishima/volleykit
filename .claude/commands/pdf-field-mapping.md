# PDF Sports Hall Report Field Mapping

Re-establish checkbox/radio field mappings and signature field positions for the sports hall report PDFs when SwissVolley updates the templates.

## Context

The sports hall report PDFs (NLA and NLB) contain radio groups for each checklist item (conformant/non-conformant) and signature areas. When SwissVolley updates the PDFs, field names or positions may change. This command systematically identifies every field mapping.

## PDF Templates

- **NLA**: `packages/web/public/assets/pdf/sports-hall-report-nla-de.pdf`
- **NLB**: `packages/web/public/assets/pdf/sports-hall-report-de.pdf`
- **Code**: `packages/web/src/shared/utils/pdf-form-filler.ts`

## Prerequisites

Ensure `poppler-utils` is installed for PDF rendering:

```bash
which pdftoppm || apt-get update && apt-get install -y poppler-utils
```

## Step 1: List All Form Fields

Write and run a Node.js script to enumerate every form field in both PDFs:

```javascript
// scripts/pdf-list-fields.mjs
import { readFileSync } from 'fs'
import { PDFDocument } from 'pdf-lib'

async function listFields(pdfPath, label) {
  const bytes = readFileSync(pdfPath)
  const doc = await PDFDocument.load(bytes)
  const form = doc.getForm()
  const fields = form.getFields()
  console.log(`\n=== ${label} (${fields.length} fields) ===`)
  for (const field of fields) {
    const type = field.constructor.name
    const name = field.getName()
    if (type === 'PDFRadioGroup') {
      const options = field.getOptions()
      console.log(`  [Radio] ${name} — options: ${options.join(', ')}`)
    } else if (type === 'PDFCheckBox') {
      console.log(`  [Checkbox] ${name}`)
    } else if (type === 'PDFTextField') {
      console.log(`  [Text] ${name}`)
    } else {
      console.log(`  [${type}] ${name}`)
    }
  }
}

await listFields('packages/web/public/assets/pdf/sports-hall-report-nla-de.pdf', 'NLA')
await listFields('packages/web/public/assets/pdf/sports-hall-report-de.pdf', 'NLB')
```

Run with: `node scripts/pdf-list-fields.mjs`

Record all radio group field names. These are the fields that map to checklist items.

## Step 2: Identify Radio Field Order (Visual Verification)

For each radio group, mark it as "not-OK" (Auswahl4), render to PNG, and visually identify which row on the PDF it corresponds to.

Write a script that processes one field at a time:

```javascript
// scripts/pdf-mark-field.mjs
import { readFileSync, writeFileSync } from 'fs'
import { PDFDocument } from 'pdf-lib'

const [, , pdfPath, fieldName, outputPath] = process.argv
const bytes = readFileSync(pdfPath)
const doc = await PDFDocument.load(bytes)
const form = doc.getForm()

// Mark the target field as not-OK
const radio = form.getRadioGroup(fieldName)
radio.select('Auswahl4') // not-OK option

const out = await doc.save()
writeFileSync(outputPath, out)
console.log(`Marked ${fieldName} as not-OK → ${outputPath}`)
```

Then render and crop:

```bash
# Render the marked PDF to PNG
pdftoppm -png -r 300 /tmp/marked.pdf /tmp/marked

# View the result — the marked radio will show a filled circle
# Use image viewer or read the PNG with Claude to identify the row
```

### Systematic approach

For each PDF (NLA then NLB), iterate through ALL radio fields in order:

1. Run the mark script for one field
2. Render to PNG with pdftoppm
3. Read the PNG to identify which checklist row has the filled radio
4. Record the mapping: field name → section letter + sub-item description
5. Repeat for the next field

### Gap analysis technique

You can also extract y-coordinates of radio field widgets to identify section boundaries:

```javascript
// scripts/pdf-radio-positions.mjs
import { readFileSync } from 'fs'
import { PDFDocument } from 'pdf-lib'

async function getRadioPositions(pdfPath, label) {
  const bytes = readFileSync(pdfPath)
  const doc = await PDFDocument.load(bytes)
  const form = doc.getForm()
  const fields = form.getFields()

  console.log(`\n=== ${label} Radio Field Positions ===`)
  const positions = []
  for (const field of fields) {
    if (field.constructor.name === 'PDFRadioGroup') {
      const name = field.getName()
      const widgets = field.acroField.getWidgets()
      if (widgets.length > 0) {
        const rect = widgets[0].getRectangle()
        positions.push({ name, y: rect.y, height: rect.height })
      }
    }
  }

  // Sort by y descending (top of page first)
  positions.sort((a, b) => b.y - a.y)

  let prevY = null
  for (const { name, y, height } of positions) {
    const gap = prevY !== null ? (prevY - y).toFixed(1) : '-'
    const marker = prevY !== null && prevY - y > 17 ? ' ← SECTION BREAK' : ''
    console.log(
      `  ${name.padEnd(15)} y=${y.toFixed(1).padStart(6)}  h=${height.toFixed(1)}  gap=${String(gap).padStart(5)}${marker}`
    )
    prevY = y
  }
}

await getRadioPositions('packages/web/public/assets/pdf/sports-hall-report-nla-de.pdf', 'NLA')
await getRadioPositions('packages/web/public/assets/pdf/sports-hall-report-de.pdf', 'NLB')
```

**Key insight**: Gaps of ~15-16 units between consecutive fields = same section. Gaps of ~18-19+ units = section break. Use this to confirm section boundaries.

## Step 3: Determine Signature Field Positions and Sizes

Signatures are embedded as PNG images at specific coordinates. To find the correct positions:

```javascript
// scripts/pdf-signature-area.mjs
import { readFileSync, writeFileSync } from 'fs'
import { PDFDocument, rgb } from 'pdf-lib'

async function markSignatureArea(pdfPath, outputPath, label) {
  const bytes = readFileSync(pdfPath)
  const doc = await PDFDocument.load(bytes)
  const page = doc.getPage(0)
  const { height: pageHeight } = page.getSize()

  console.log(`\n=== ${label} ===`)
  console.log(`Page size: ${page.getSize().width} x ${pageHeight}`)

  // Draw colored rectangles at candidate signature positions
  // Adjust these based on where signatures should appear
  const candidates = [
    { label: '1st ref', x: 340, y: 100, w: 130, h: 24, color: rgb(1, 0, 0) },
    { label: '2nd ref', x: 340, y: 76, w: 130, h: 18, color: rgb(0, 1, 0) },
    { label: 'home', x: 340, y: 55, w: 130, h: 18, color: rgb(0, 0, 1) },
    { label: 'away', x: 340, y: 34, w: 130, h: 18, color: rgb(1, 0, 1) },
  ]

  for (const c of candidates) {
    page.drawRectangle({
      x: c.x,
      y: c.y,
      width: c.w,
      height: c.h,
      borderColor: c.color,
      borderWidth: 2,
      opacity: 0.3,
      color: c.color,
    })
    console.log(`  ${c.label}: x=${c.x} y=${c.y} w=${c.w} h=${c.h}`)
  }

  const out = await doc.save()
  writeFileSync(outputPath, out)
  console.log(`→ ${outputPath}`)
}

await markSignatureArea(
  'packages/web/public/assets/pdf/sports-hall-report-nla-de.pdf',
  '/tmp/sig-nla.pdf',
  'NLA'
)
await markSignatureArea(
  'packages/web/public/assets/pdf/sports-hall-report-de.pdf',
  '/tmp/sig-nlb.pdf',
  'NLB'
)
```

Render and visually verify the signature rectangles align with the expected signature area at the bottom of the PDF:

```bash
pdftoppm -png -r 300 /tmp/sig-nla.pdf /tmp/sig-nla
pdftoppm -png -r 300 /tmp/sig-nlb.pdf /tmp/sig-nlb
```

Adjust coordinates until the colored rectangles align perfectly with the signature area on the PDF. The signature boxes should:

- Not overlap each other
- Fit within the designated signature area at the bottom of the page
- The 1st referee box should be the topmost and tallest (height: 24)
- Subsequent boxes (2nd ref, home, away) should be smaller (height: 18)

## Step 4: Update the Code

After establishing all mappings, update `packages/web/src/shared/utils/pdf-form-filler.ts`:

1. **`NLA_WIZARD_FIELDS`** / **`NLB_WIZARD_FIELDS`** — Update `allPointsInOrderCheckbox` and advertising field names
2. **`NLA_CHECKLIST_SECTIONS`** / **`NLB_CHECKLIST_SECTIONS`** — Update every `radioField` value and ensure correct sub-item count per section
3. **`SIGNATURE_POSITIONS`** — Happy path (1st referee only) positions for NLA/NLB
4. **`ALL_SIGNATURE_POSITIONS`** — Non-conformant (4 signers) positions, where 1st ref y must match happy path

Also update translations if sections/sub-items changed:

- `packages/web/src/i18n/locales/{de,en,fr,it}.ts` — section and subItem labels
- `packages/web/src/i18n/types.ts` — type definitions for new keys

## Step 5: Validate

Run lint, knip, and build to verify:

```bash
cd packages/web
pnpm run lint
pnpm run knip
pnpm run build
```

## Important Notes

- PDF coordinate system: y=0 is at the BOTTOM of the page, higher y = higher on page
- Radio groups use `Auswahl3` (OK/conformant) and `Auswahl4` (not-OK/non-conformant)
- NLA radio fields use mixed naming: plain numbers (`'19'`, `'20'`) and `Gruppe` prefix (`'Gruppe424'`)
- NLB radio fields also use mixed naming: `Gruppe` prefix for early fields, plain numbers for later ones
- The "all points in order" checkbox is separate from radio groups (NLA: `Kontrollkästchen8`, NLB: `Kontrollkästchen17`)
- Always visually verify at least a sample of fields after updating — do not rely solely on field ordering assumptions
