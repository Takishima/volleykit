# PDF Sports Hall Report Field Mapping

Re-establish checkbox/radio field mappings and verify the signature layout for the sports hall report PDFs when SwissVolley updates the templates.

## Context

The sports hall report PDFs (NLA and NLB, each in de and fr) contain radio groups for each checklist item (conformant/non-conformant), name text fields and signature cells. When SwissVolley updates the PDFs, field names may change. This command systematically identifies every field mapping.

Signature boxes are **not** hardcoded: they are derived at fill time from the widget rectangle of the signer's name field (same table row). Step 3 only verifies that this derivation still holds for new templates.

## PDF Templates

- **NLA**: `packages/web/public/assets/pdf/sports-hall-report-nla-{de,fr}.pdf`
- **NLB**: `packages/web/public/assets/pdf/sports-hall-report-{de,fr}.pdf`
- **Field names / sections**: `packages/web/src/common/utils/pdf-field-mappings.ts`
- **Filling / signature embedding**: `packages/web/src/common/utils/pdf-form-filler.ts`

The de and fr templates share field names but differ in table geometry, so run every step on both languages.

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

## Step 3: Verify the Signature Row Derivation

`signatureBoxFor(form, nameField)` in `pdf-form-filler.ts` computes each signature box as:

- `x` = name field right edge + `SIGNATURE_GAP_PT` (clears the "Unterschrift:"/"Signature:" label at the top-left of the cell)
- `y`, `height` = the name field's widget rectangle (same table row)
- `width` = `SIGNATURE_WIDTH_PT` (stays clear of "Nur falls notwendig"/"Uniquement si nécessaire" in the team rows)

Both constants live in `pdf-field-mappings.ts`. The name fields are `Text19`–`Text22` (NLA) and `Text23`–`Text26` (NLB), declared in `NLA_SIGNATURE_NAME_FIELDS` / `NLB_SIGNATURE_NAME_FIELDS`.

For a new template, confirm three things:

1. The name field names are unchanged (Step 1 output), and each one sits in the row of the signer it is mapped to (first referee, second referee, home team, away team, top to bottom).
2. The signature cell is still to the right of the name field on the same row.
3. The gap and width still clear the labels. Render a filled copy with debug outlines:

```javascript
// scripts/pdf-signature-area.mjs
import { readFileSync, writeFileSync } from 'fs'
import { PDFDocument, rgb } from 'pdf-lib'

const GAP = 46 // SIGNATURE_GAP_PT
const WIDTH = 100 // SIGNATURE_WIDTH_PT
const NAME_FIELDS = {
  nla: ['Text19', 'Text20', 'Text21', 'Text22'],
  nlb: ['Text23', 'Text24', 'Text25', 'Text26'],
}

for (const variant of ['nla-de', 'nla-fr', 'de', 'fr']) {
  const doc = await PDFDocument.load(
    readFileSync(`packages/web/public/assets/pdf/sports-hall-report-${variant}.pdf`)
  )
  const form = doc.getForm()
  const page = doc.getPage(0)
  for (const name of NAME_FIELDS[variant.startsWith('nla') ? 'nla' : 'nlb']) {
    const r = form.getTextField(name).acroField.getWidgets()[0].getRectangle()
    page.drawRectangle({
      x: r.x + r.width + GAP,
      y: r.y,
      width: WIDTH,
      height: r.height,
      borderColor: rgb(1, 0, 0),
      borderWidth: 0.5,
    })
  }
  writeFileSync(`/tmp/sig-${variant}.pdf`, await doc.save())
}
```

```bash
node scripts/pdf-signature-area.mjs
for v in nla-de nla-fr de fr; do pdftoppm -png -r 110 /tmp/sig-$v.pdf /tmp/sig-$v; done
```

Read the PNGs. Each red box must sit inside its "Unterschrift"/"Signature" cell, right of the label and left of "Nur falls notwendig"/"Uniquement si nécessaire". If a box overlaps a label, adjust `SIGNATURE_GAP_PT` / `SIGNATURE_WIDTH_PT`; if a box is on the wrong row, fix the name field mapping.

The tests in `pdf-form-filler.test.ts` ("signature block layout") load all four templates and assert the row alignment, so they fail automatically if a template drops or renames a name field.

## Step 4: Update the Code

After establishing all mappings, update `packages/web/src/common/utils/pdf-field-mappings.ts`:

1. **`NLA_FIELD_MAPPING`** / **`NLB_FIELD_MAPPING`** — header field names (game number, teams, hall, date, referee names)
2. **`NLA_WIZARD_FIELDS`** / **`NLB_WIZARD_FIELDS`** — `allPointsInOrderCheckbox` and advertising radio names
3. **`NLA_CHECKLIST_SECTIONS`** / **`NLB_CHECKLIST_SECTIONS`** — every `radioField` value and the sub-item count per section
4. **`NLA_SIGNATURE_NAME_FIELDS`** / **`NLB_SIGNATURE_NAME_FIELDS`** — name fields per signer (drive the signature boxes)
5. **`SIGNATURE_GAP_PT`** / **`SIGNATURE_WIDTH_PT`** — only if Step 3 showed an overlap

Also update translations if sections/sub-items changed:

- `packages/web/src/i18n/locales/{de,en,fr,it}.ts` — section and subItem labels
- `packages/web/src/i18n/types.ts` — type definitions for new keys

## Step 5: Validate

```bash
scripts/validate.sh
```

## Important Notes

- PDF coordinate system: y=0 is at the BOTTOM of the page, higher y = higher on page
- Signature boxes must be read from the form **before** `form.flatten()` — flattening removes the fields
- Radio groups use `Auswahl3` (OK/conformant) and `Auswahl4` (not-OK/non-conformant)
- NLA radio fields use mixed naming: plain numbers (`'19'`, `'20'`) and `Gruppe` prefix (`'Gruppe424'`)
- NLB radio fields also use mixed naming: `Gruppe` prefix for early fields, plain numbers for later ones
- The "all points in order" checkbox is separate from radio groups (NLA: `Kontrollkästchen8`, NLB: `Kontrollkästchen17`)
- Always visually verify at least a sample of fields after updating — do not rely solely on field ordering assumptions
