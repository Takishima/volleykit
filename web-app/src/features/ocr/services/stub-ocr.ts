/**
 * Stub OCR Service
 *
 * Placeholder OCR service for development and testing when the
 * Mistral OCR proxy is unavailable. Returns mock scoresheet data
 * to allow the UI flow to be tested.
 */

import type { OCREngine, OCRResult, OCRLine, OnProgressCallback } from '../types';

// =============================================================================
// Configuration
// =============================================================================

/** Simulated processing delay in milliseconds */
const SIMULATED_DELAY_MS = 1500;
/** Short delay for UI feedback */
const SHORT_DELAY_MS = 200;
/** Brief delay for state transitions */
const BRIEF_DELAY_MS = 300;

/** Default confidence score for mock OCR results */
const MOCK_CONFIDENCE_SCORE = 95;
/** Approximate word spacing for estimated bounding boxes */
const ESTIMATED_WORD_SPACING_PX = 50;
/** Approximate character width for estimated bounding boxes */
const ESTIMATED_CHAR_WIDTH_PX = 8;
/** Approximate line height for estimated bounding boxes */
const ESTIMATED_LINE_HEIGHT_PX = 20;

/** Progress percentage values */
const PROGRESS_INIT_READY = 50;
const PROGRESS_PROCESSING = 60;
const PROGRESS_EXTRACTING = 90;
const PROGRESS_COMPLETE = 100;

// =============================================================================
// Mock Data
// =============================================================================

/**
 * Mock OCR result simulating a Swiss volleyball scoresheet format.
 * This format matches what the PlayerListParser expects.
 */
const MOCK_SCORESHEET_TEXT = `VBC Heimteam	VBC Gastteam
N.	Name of the player	License	N.	Name of the player	License
1	MÜLLER ANNA	OK	3	SCHMIDT LISA	OK
4	WEBER MARIE	OK	7	FISCHER JULIA	OK
6	SCHNEIDER LAURA	OK	9	MEYER SARAH	OK
8	ZIMMERMANN NINA	OK	11	WAGNER EMMA	OK
10	HUBER LENA	OK	13	BECKER MILA	OK
12	KELLER SOPHIE	OK	15	HOFFMANN PAULA	OK
LIBERO
L1	2 BRUNNER LEA	OK	L1	5 KOCH CLARA	OK
OFFICIAL MEMBERS ADMITTED ON THE BENCH
C	Hans Trainer	C	Peter Coach
AC	Maria Assistentin	AC	Sandra Helper`;

/**
 * Generate mock OCR result from text
 */
function generateMockResult(text: string): OCRResult {
  const rawLines = text.split('\n');

  const lines: OCRLine[] = rawLines.map((lineText, lineIdx) => {
    const wordTexts = lineText.split(/\s+/).filter((w) => w.length > 0);

    return {
      text: lineText,
      confidence: MOCK_CONFIDENCE_SCORE,
      words: wordTexts.map((word, idx) => ({
        text: word,
        confidence: MOCK_CONFIDENCE_SCORE,
        bbox: {
          x0: idx * ESTIMATED_WORD_SPACING_PX,
          y0: lineIdx * ESTIMATED_LINE_HEIGHT_PX,
          x1: idx * ESTIMATED_WORD_SPACING_PX + word.length * ESTIMATED_CHAR_WIDTH_PX,
          y1: (lineIdx + 1) * ESTIMATED_LINE_HEIGHT_PX,
        },
      })),
    };
  });

  return {
    fullText: text,
    lines,
    words: lines.flatMap((line) => line.words),
    hasPreciseBoundingBoxes: false,
  };
}

const MOCK_RESULT = generateMockResult(MOCK_SCORESHEET_TEXT);

// =============================================================================
// StubOCR Class
// =============================================================================

/**
 * Stub OCR engine for development and testing
 */
export class StubOCR implements OCREngine {
  #onProgress: OnProgressCallback | undefined;
  #initialized = false;

  constructor(onProgress?: OnProgressCallback) {
    this.#onProgress = onProgress;
  }

  #reportProgress(status: string, progress: number): void {
    this.#onProgress?.({ status, progress });
  }

  async initialize(): Promise<void> {
    if (this.#initialized) {
      return;
    }

    this.#reportProgress('Initializing stub OCR...', 0);

    // Simulate initialization delay
    await new Promise((resolve) => setTimeout(resolve, SHORT_DELAY_MS));

    this.#reportProgress('Stub OCR ready', PROGRESS_INIT_READY);
    this.#initialized = true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async recognize(_imageBlob: Blob): Promise<OCRResult> {
    if (!this.#initialized) {
      throw new Error('StubOCR not initialized. Call initialize() first.');
    }

    this.#reportProgress('Processing image...', PROGRESS_PROCESSING);

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, SIMULATED_DELAY_MS));

    this.#reportProgress('Extracting text...', PROGRESS_EXTRACTING);

    await new Promise((resolve) => setTimeout(resolve, BRIEF_DELAY_MS));

    this.#reportProgress('Complete', PROGRESS_COMPLETE);

    return MOCK_RESULT;
  }

  async terminate(): Promise<void> {
    this.#initialized = false;
  }
}
