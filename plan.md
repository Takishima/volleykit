# Sports Hall Report — Non-Conformant Workflow Plan

## Context

The current wizard only supports the **happy path**: confirm everything is OK → sign → download PDF. This is the most common case and must remain the fastest flow (1 toggle + signature).

The new **non-conformant path** covers cases where the first referee finds issues. This requires:
- Selecting which section(s) have problems
- Writing a comment
- Collecting signatures from the 2nd referee + 1–2 coaches
- Generating a PDF with conformant items marked OK, non-conformant items marked "Ungenügend", and the comment filled in

## PDF Form Field Mapping (discovered from templates)

### NLA (37 checklist radio groups, all have `Auswahl3`=OK / `Auswahl4`=not OK)

| Section | Label (DE) | Radio Fields | Comment Field |
|---------|-----------|--------------|---------------|
| A | Spielfeld und Feldlinien | Gruppe4, Gruppe41, Gruppe42 | Text7.0.0 |
| B | Aufwärmfläche | Gruppe43, Gruppe44 | Text7.0.1 |
| C | Netzanlage mit Antennen | Gruppe45–Gruppe49, 10–13 | Text7.0.2 |
| D | Schiedsrichterstuhl | 10 | Text7.0.3 |
| E | Manometer | 11 | Text7.0.4 |
| F | Messlatte | 12 | Text7.0.5 |
| G | Linienrichterfahnen | 13 | Text7.0.6 |
| H | Summer (Buzzer) | 14 | Text7.0.7 |
| I | eScoresheet | 15, 16, 17, 18 | Text7.1 |
| J | Tablets | 19, 20, 21 | Text7.2 |
| K | Elektronische Anzeigetafel | 22, 23 | Text7.3 |
| L | Bälle | Gruppe424, Gruppe425 | Text7.4 |
| M | Ballholer | Gruppe426 | Text7.5 |
| N | Quickmoppers | Gruppe427 | Text7.6 |
| O | Hallensprecher | Gruppe428 | Text7.7 |
| P | Dress Heimmannschaft | Gruppe429, Gruppe430, Gruppe431 | Text7.8 |
| Q | Dress Besuchermannschaft | Gruppe432, Gruppe433, Gruppe434 | Text7.9 |
| R | Verschiedenes | Gruppe435, Gruppe440 | Text7.10, Text7.11 |

**Signature fields (NLA):** Text19 (1st referee name), Text20 (2nd referee name), Text21 (home team), Text22 (away team)

### NLB (26 checklist radio groups)

| Section | Label (DE) | Radio Fields | Comment Field |
|---------|-----------|--------------|---------------|
| A | Spielfeld und Feldlinien | Gruppe16, Gruppe17, Gruppe18 | Text16.0.0 |
| B | Netzanlage mit Antennen | Gruppe19, Gruppe20, Gruppe21, 22, 23, 24 | Text16.0.1 |
| C | Nummerntafeln | 25, 26 | Text16.1 |
| D | Manometer | 27 | Text16.2 |
| E | Messlatte | 28 | Text16.3 |
| F | Bälle | 29, 30 | Text16.4 |
| G | Ballholer | 31 | Text16.5 |
| H | Dress Heimmannschaft | 32, 33, 34 | Text16.6 |
| I | Dress Besuchermannschaft | 35, 36, 37 | Text16.7 |
| J | eScoresheet | 38, 39 | Text16.8 |
| K | Tablets | 40, 41 | Text16.9 |
| L | Verschiedenes | — | Text16.10, Text16.11 |

**Signature fields (NLB):** Text23, Text24, Text25, Text26

---

## UX Flow

### Happy Path (unchanged, stays the fastest — no comment, everything OK)

1. Language selection (de/fr)
2. Toggle "I confirm everything is in order" → shows green checkmarks
3. **Generate** → signature canvas (1st referee only) → PDF downloaded

Total: 2 taps + signature. No change. This is the most common case.

### Non-Conformant Path (new)

Instead of toggling "everything OK", the referee taps a new **"Report an issue"** link/button below the toggle:

1. **Language selection** (de/fr) — same as happy path
2. **Section selection** — grouped checklist (A–R for NLA, A–L for NLB). Each section is a collapsible card showing the section label. Referee toggles sections that have issues (not OK). Sections default to OK.
3. **Comment** — text area for the referee to describe the issue(s). Required when any section is marked non-conformant.
4. **PDF Preview** — generate a preview PDF (without signatures) showing all conformant sections marked OK, non-conformant marked not OK, comment filled, "Alle Punkte in Ordnung" unchecked. Rendered inline using `<iframe>` or `<object>` with a blob URL. All parties review before signing.
5. **Signatures** — sequential signature collection after preview approval:
   - Step 5a: 1st referee signs (same SignatureCanvas)
   - Step 5b: 2nd referee signs (pass device)
   - Step 5c: Coach 1 signs (name input + signature)
   - Step 5d: *(optional)* Coach 2 signs
6. **Download PDF** — final PDF with all signatures embedded.

### UI Components

The wizard modal gets a **step indicator** at the top (dots or numbered steps) so the referee knows where they are in the flow. Steps for non-conformant:

```
[1. Sections] → [2. Comment] → [3. Preview] → [4. Signatures] → Done
```

For the happy path, there are no steps (stays as-is: toggle + generate).

---

## Mockups

### Happy Path (unchanged)

```
┌─────────────────────────────────────────┐
│  📄 Sports Hall Report                  │
│     VBC Zürich vs Volley Luzern     [×] │
├─────────────────────────────────────────┤
│                                         │
│  Language                               │
│  ┌──────────────┐ ┌──────────────┐      │
│  │   Deutsch    │ │   Français   │      │
│  └──────────────┘ └──────────────┘      │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ✅ I confirm everything is      │    │
│  │    in order                [ON] │    │
│  │                                 │    │
│  │  ✓ All points in order          │    │
│  │  ✓ Advertising declared for     │    │
│  │    both teams                   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ⚠️ Report an issue instead             │
│                                         │
│  ┌──────────┐ ┌────────────────────┐    │
│  │  Cancel   │ │  Generate & Sign   │    │
│  └──────────┘ └────────────────────┘    │
└─────────────────────────────────────────┘
```

> Tapping "Generate & Sign" opens the signature canvas (1st referee only), then downloads the PDF. Same as today.

### Non-Conformant Path — Step 1: Sections

```
┌─────────────────────────────────────────┐
│  ⚠️ Report Issue                        │
│     VBC Zürich vs Volley Luzern     [×] │
├─────────────────────────────────────────┤
│  ● Sections  ○ Comment  ○ Preview  ○ Sign│
│                                         │
│  Language                               │
│  ┌──────────────┐ ┌──────────────┐      │
│  │   Deutsch    │ │   Français   │      │
│  └──────────────┘ └──────────────┘      │
│                                         │
│  Select sections with issues:           │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ A  Spielfeld und Feldlinien  ✓OK│    │
│  ├─────────────────────────────────┤    │
│  │ B  Aufwärmfläche             ✓OK│    │
│  ├─────────────────────────────────┤    │
│  │ C  Netzanlage mit Antennen   ⚠️ │    │
│  │    ← toggled to "not OK"        │    │
│  ├─────────────────────────────────┤    │
│  │ D  Schiedsrichterstuhl       ✓OK│    │
│  ├─────────────────────────────────┤    │
│  │ E  Manometer                 ✓OK│    │
│  ├─────────────────────────────────┤    │
│  │ ...                             │    │
│  ├─────────────────────────────────┤    │
│  │ R  Verschiedenes             ✓OK│    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌──────────┐ ┌────────────────────┐    │
│  │   Back   │ │       Next →       │    │
│  └──────────┘ └────────────────────┘    │
└─────────────────────────────────────────┘
```

> Sections default to OK (green check). Tapping a section toggles it to "not OK" (warning style). At least one section must be non-conformant to proceed.

### Non-Conformant Path — Step 2: Comment

```
┌─────────────────────────────────────────┐
│  ⚠️ Report Issue                        │
│     VBC Zürich vs Volley Luzern     [×] │
├─────────────────────────────────────────┤
│  ✓ Sections  ● Comment  ○ Preview  ○ Sign│
│                                         │
│  Issues found in:                       │
│  ┌─────────────────────────────────┐    │
│  │ ⚠️ C — Netzanlage mit Antennen  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Describe the issue(s): *               │
│  ┌─────────────────────────────────┐    │
│  │ Antenne rechts fehlte bei       │    │
│  │ Spielbeginn. Wurde nach dem     │    │
│  │ 1. Satz ersetzt.               │    │
│  │                                 │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌──────────┐ ┌────────────────────┐    │
│  │  ← Back  │ │       Next →       │    │
│  └──────────┘ └────────────────────┘    │
└─────────────────────────────────────────┘
```

> Shows a summary of which sections are flagged, then a required comment text area.

### Non-Conformant Path — Step 3: PDF Preview

```
┌─────────────────────────────────────────┐
│  ⚠️ Report Issue                        │
│     VBC Zürich vs Volley Luzern     [×] │
├─────────────────────────────────────────┤
│  ✓ Sections  ✓ Comment  ● Preview  ○ Sign│
│                                         │
│  Review the report before signing:      │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │   ┌───────────────────────┐     │    │
│  │   │                       │     │    │
│  │   │   [PDF rendered in    │     │    │
│  │   │    iframe / embed]    │     │    │
│  │   │                       │     │    │
│  │   │   Shows filled form   │     │    │
│  │   │   with OK/not-OK      │     │    │
│  │   │   markings and        │     │    │
│  │   │   comment text.       │     │    │
│  │   │   No signatures yet.  │     │    │
│  │   │                       │     │    │
│  │   └───────────────────────┘     │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌──────────┐ ┌────────────────────┐    │
│  │  ← Back  │ │  Confirm & Sign →  │    │
│  └──────────┘ └────────────────────┘    │
└─────────────────────────────────────────┘
```

> Inline PDF preview so all parties can verify the report content is correct before committing signatures.

### Non-Conformant Path — Step 4: Signatures

```
┌─────────────────────────────────────────┐
│  ⚠️ Report Issue                        │
│     VBC Zürich vs Volley Luzern     [×] │
├─────────────────────────────────────────┤
│  ✓ Sections  ✓ Comment  ✓ Preview  ● Sign│
│                                         │
│  Signatures (2 of 3):                   │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ✅ 1st Referee: Max Mustermann  │    │
│  │    [signature thumbnail]        │    │
│  ├─────────────────────────────────┤    │
│  │ ✅ 2nd Referee: Anna Schmidt    │    │
│  │    [signature thumbnail]        │    │
│  ├─────────────────────────────────┤    │
│  │ 🖊️ Coach (Home Team)            │    │
│  │    Name: [________________]     │    │
│  │    [ Tap to sign ]              │    │
│  ├─────────────────────────────────┤    │
│  │ + Add Coach (Away Team)         │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌──────────┐ ┌────────────────────┐    │
│  │  ← Back  │ │   Download PDF ↓   │    │
│  └──────────┘ └────────────────────┘    │
└─────────────────────────────────────────┘
```

> Each signer gets a card. Referee names are pre-filled from the assignment. Coaches enter their name + sign. "Download PDF" is enabled only when all required signatures are collected (1st referee + 2nd referee + at least 1 coach).

---

## Implementation Steps

### Step 1: PDF field mapping constants (`pdf-form-filler.ts`)

Add the section-to-field mappings for both NLA and NLB:

```typescript
interface ChecklistSection {
  id: string           // 'A', 'B', etc.
  labelKey: string     // i18n key for section label
  radioFields: string[] // PDF radio group field names
  commentFields: string[] // PDF text field names for remarks
}

interface NonConformantWizardFields {
  sections: ChecklistSection[]
  signatureNameFields: {
    firstReferee: string
    secondReferee: string
    homeTeam: string
    awayTeam: string
  }
}
```

Add a new `fillNonConformantReport()` function that:
- Calls `fillBaseGameInfo()` for game data (same as happy path)
- For each section: sets all radio fields to `Auswahl3` (OK) or `Auswahl4` (not OK) based on user selection
- Fills comment text fields for non-conformant sections
- Does NOT check the "Alle Punkte in Ordnung" checkbox
- Embeds up to 4 signatures at the 4 signature positions

### Step 2: Signature positions for all 4 signers (`pdf-form-filler.ts`)

Extend `SIGNATURE_POSITIONS` to cover all 4 positions:

```typescript
interface AllSignaturePositions {
  firstReferee: SignaturePosition
  secondReferee: SignaturePosition
  homeTeam: SignaturePosition
  awayTeam: SignaturePosition
}
```

Measure exact positions from the PDF (Text19–22 for NLA, Text23–26 for NLB — these are to the right of the name fields).

### Step 3: Section selection component (`SectionSelector.tsx`)

New component showing sections as a scrollable list of toggle items:
- Each section: label + toggle (default: OK)
- When toggled to "not OK", the section highlights in a warning color
- Grouped by the section letters matching the PDF

### Step 4: Comment step component (`CommentStep.tsx`)

Simple text area with:
- Label: "Describe the issue(s)"
- Min height for comfortable typing
- Required validation (can't proceed without text)

### Step 5: PDF Preview component (`PdfPreview.tsx`)

New component that:
- Takes `pdfBytes: Uint8Array` and renders the PDF inline
- Uses `URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }))` + `<iframe>`
- Shows a "Confirm & proceed to signatures" button
- Cleans up the blob URL on unmount
- Fallback: if inline preview isn't supported (some mobile browsers), offer a "Download preview" button instead

### Step 6: Multi-signature flow (`SignatureCollectionStep.tsx`)

A component that manages sequential signature collection:
- Shows who needs to sign next (role label + name if known)
- For coaches: includes a name text input before the signature canvas
- Shows completed signatures as thumbnails
- "Add another coach" toggle for optional 4th signature
- Each signature uses the existing `SignatureCanvas` component

### Step 7: Wizard modal refactor (`SportsHallReportWizardModal.tsx`)

Add a `mode` state: `'happy'` (default) | `'non-conformant'`

- **Happy path**: unchanged. Toggle → generate → sign → done.
- **Non-conformant path**: triggered by "Report an issue" button. Shows step indicator and navigates through: Sections → Comment → Signatures → Generate.

The modal size changes to `"md"` for the non-conformant path (more space for the section list and comment).

### Step 8: i18n keys (all 4 languages: de/en/fr/it)

Add translation keys under `pdf.wizard.nonConformant.*`:
- Section labels (A through R for NLA, A through L for NLB)
- Step labels, button labels
- Signature role labels ("2nd Referee", "Coach Home Team", etc.)
- Comment placeholder text

### Step 9: Tests

- Unit tests for `fillNonConformantReport()` — verify correct radio selections and comment text
- Unit tests for section mapping (NLA vs NLB field counts)
- Component tests for the section selector and comment step
- Integration test for the full non-conformant wizard flow

---

## Key Decisions

1. **Happy path untouched** — the toggle + generate flow stays exactly as-is. The non-conformant path is opt-in via a separate entry point.
2. **Section-level granularity** — the referee selects which *sections* (A–R) are non-conformant, not individual sub-items within sections. This keeps the UI manageable (≤18 toggles for NLA) while still providing enough detail. All radio fields within a non-conformant section get set to `Auswahl4`.
3. **Sequential signatures** — device is passed between signers. Each step clearly shows whose turn it is.
4. **Coach name input** — since coach names aren't in the assignment data, the signing coach must enter their name. This is filled into the PDF's team signature name field.
5. **Comment is per-report, not per-section** — a single comment text area (filled into the first available comment field). Simpler UX and matches how referees typically write one combined remark.

## Files to Create/Modify

| File | Action |
|------|--------|
| `packages/web/src/shared/utils/pdf-form-filler.ts` | Add section mappings, `fillNonConformantReport()`, multi-signature embedding |
| `packages/web/src/features/sports-hall-report/components/SportsHallReportWizardModal.tsx` | Add non-conformant mode, step navigation |
| `packages/web/src/features/sports-hall-report/components/SectionSelector.tsx` | **New** — section toggle list |
| `packages/web/src/features/sports-hall-report/components/CommentStep.tsx` | **New** — comment text area |
| `packages/web/src/features/sports-hall-report/components/PdfPreview.tsx` | **New** — inline PDF preview before signing |
| `packages/web/src/features/sports-hall-report/components/SignatureCollectionStep.tsx` | **New** — multi-signer flow |
| `packages/web/src/features/sports-hall-report/components/WizardStepIndicator.tsx` | **New** — step dots/progress |
| `packages/web/src/i18n/types.ts` | Add non-conformant wizard keys |
| `packages/web/src/i18n/locales/de.ts` | German translations |
| `packages/web/src/i18n/locales/fr.ts` | French translations |
| `packages/web/src/i18n/locales/en.ts` | English translations |
| `packages/web/src/i18n/locales/it.ts` | Italian translations |
| `packages/web/src/shared/utils/pdf-form-filler.test.ts` | Tests for new fill function |
| `packages/web/src/features/sports-hall-report/components/SectionSelector.test.tsx` | **New** |
| `.changeset/non-conformant-report.md` | Changeset for the feature |
