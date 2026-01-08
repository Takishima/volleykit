# OCR Integration Plan - Phase 1: Services Layer

## Goal
Port OCR services from vanilla JS to TypeScript, designed for integration into the validation modal's ScoresheetPanel.

## Integration Context

The validation modal flow:
```
Home Roster → Away Roster → Scorer → Scoresheet
```

OCR will enhance the **Scoresheet step** by:
1. Extracting player names from captured/uploaded scoresheet images
2. Comparing against the known roster data (`RosterPlayer[]`)
3. Helping verify that the scoresheet matches the expected lineup

## File Structure

```
web-app/src/features/validation/
├── api/
│   └── ocr/                          # NEW: OCR services
│       ├── index.ts                  # Public exports
│       ├── types.ts                  # OCR types
│       ├── ocr-factory.ts            # Factory for creating OCR instances
│       ├── mistral-ocr.ts            # Mistral OCR implementation
│       ├── stub-ocr.ts               # Stub for dev/testing
│       └── player-list-parser.ts     # Parse OCR text → structured data
├── hooks/
│   └── useOCRScoresheet.ts           # NEW: Hook for OCR in components
└── utils/
    └── roster-comparison.ts          # NEW: Compare OCR results vs roster
```

## Phase 1 Tasks

### Task 1: Define TypeScript Types (`types.ts`)

```typescript
// OCR result types (from MistralOCR)
export interface OCRWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface OCRLine {
  text: string;
  confidence: number;
  words: OCRWord[];
}

export interface OCRResult {
  fullText: string;
  lines: OCRLine[];
  words: OCRWord[];
}

export interface OCRProgress {
  status: string;
  progress: number; // 0-100
}

// Parsed player data (from PlayerListParser)
export interface ParsedPlayer {
  shirtNumber: number | null;
  lastName: string;
  firstName: string;
  displayName: string;
  rawName: string;
  licenseStatus: string;
}

export interface ParsedOfficial {
  role: 'C' | 'AC' | 'AC2' | 'AC3' | 'AC4';
  lastName: string;
  firstName: string;
  displayName: string;
  rawName: string;
}

export interface ParsedTeam {
  name: string;
  players: ParsedPlayer[];
  officials: ParsedOfficial[];
}

export interface ParsedGameSheet {
  teamA: ParsedTeam;
  teamB: ParsedTeam;
  warnings: string[];
}

// OCR engine interface
export interface OCREngine {
  initialize(): Promise<void>;
  recognize(imageBlob: Blob): Promise<OCRResult>;
  terminate(): Promise<void>;
}

export type OnProgressCallback = (progress: OCRProgress) => void;
```

### Task 2: Port MistralOCR (`mistral-ocr.ts`)

Key changes from JS version:
- Add proper TypeScript types
- Use class with private fields (already uses `#private`)
- Export as named export
- Make endpoint configurable via environment variable

### Task 3: Port StubOCR (`stub-ocr.ts`)

- Same interface as MistralOCR
- Returns mock data for development/testing
- Useful when OCR proxy is unavailable

### Task 4: Port OCRFactory (`ocr-factory.ts`)

```typescript
export const OCRFactory = {
  create(onProgress?: OnProgressCallback): OCREngine,
  createWithFallback(onProgress?: OnProgressCallback): Promise<OCREngine>,
};
```

### Task 5: Port PlayerListParser (`player-list-parser.ts`)

Key functions:
- `parseGameSheet(ocrText: string): ParsedGameSheet`
- `normalizeName(name: string): string`
- `parsePlayerName(rawName: string): { lastName, firstName, displayName }`

### Task 6: Add Roster Comparison Utility (`roster-comparison.ts`)

New utility to compare OCR results against validation roster:

```typescript
import type { RosterPlayer } from '../types';
import type { ParsedPlayer } from './api/ocr/types';

export interface ComparisonResult {
  status: 'match' | 'ocr-only' | 'roster-only';
  ocrPlayer: ParsedPlayer | null;
  rosterPlayer: RosterPlayer | null;
  confidence: number;
}

export function compareRosters(
  ocrPlayers: ParsedPlayer[],
  rosterPlayers: RosterPlayer[]
): ComparisonResult[];

export function calculateNameSimilarity(
  name1: string,
  name2: string
): number;
```

### Task 7: Create useOCRScoresheet Hook (`useOCRScoresheet.ts`)

```typescript
export function useOCRScoresheet() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OCRProgress | null>(null);
  const [result, setResult] = useState<ParsedGameSheet | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const processImage = useCallback(async (imageBlob: Blob) => {
    // Create OCR engine, process, parse results
  }, []);

  const reset = useCallback(() => {
    // Clear state
  }, []);

  return {
    processImage,
    reset,
    isProcessing,
    progress,
    result,
    error,
  };
}
```

### Task 8: Add Tests

- `mistral-ocr.test.ts` - Test API calls, error handling, abort
- `player-list-parser.test.ts` - Test parsing various OCR formats
- `roster-comparison.test.ts` - Test name matching algorithm
- `useOCRScoresheet.test.ts` - Test hook behavior

## Environment Configuration

Add to `.env.example`:
```
# OCR API endpoint (optional, has default)
VITE_OCR_ENDPOINT=https://volleykit-proxy.takishima.workers.dev/ocr
```

## Dependencies

No new dependencies needed - uses native `fetch` and `FormData`.

## Success Criteria

- [ ] All services compile with strict TypeScript
- [ ] Unit tests pass with >70% coverage
- [ ] `useOCRScoresheet` hook can process an image and return parsed players
- [ ] Comparison utility can match OCR players against RosterPlayer[]
- [ ] Lint passes with 0 warnings

## Out of Scope (Future Phases)

- UI components for OCR results display
- Integration into ScoresheetPanel
- Translations
- Camera capture enhancements
- Confidence threshold configuration UI

## Estimated Tasks

| Task | Effort |
|------|--------|
| 1. Types | Small |
| 2. MistralOCR | Medium |
| 3. StubOCR | Small |
| 4. OCRFactory | Small |
| 5. PlayerListParser | Medium |
| 6. Roster comparison | Medium |
| 7. useOCRScoresheet hook | Medium |
| 8. Tests | Medium |

## Questions for Review

1. Should we put OCR services under `features/validation/api/ocr/` or create a new `features/ocr/` feature module?
   - Recommendation: Start under validation since that's the primary use case

2. Should the hook use TanStack Query for caching OCR results?
   - Recommendation: No, OCR results are ephemeral (per-session, per-image)

3. Should we add a "confidence threshold" setting?
   - Recommendation: Hardcode 50% for now, make configurable later
