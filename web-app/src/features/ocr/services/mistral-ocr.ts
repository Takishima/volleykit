/**
 * Mistral OCR Service
 *
 * OCR service using Mistral's OCR API via Cloudflare Worker proxy.
 * Provides high-quality text extraction from images and documents.
 *
 * @see https://docs.mistral.ai/capabilities/document_ai/basic_ocr
 */

import type {
  OCREngine,
  OCRResult,
  OCRLine,
  OCRWord,
  OnProgressCallback,
} from '../types';

// =============================================================================
// Configuration
// =============================================================================

/** Default OCR proxy endpoint - used if endpoint not provided */
const DEFAULT_OCR_ENDPOINT = 'https://volleykit-proxy.takishima.workers.dev/ocr';

/**
 * Mistral OCR doesn't provide per-word confidence scores,
 * so we use a high default since the model is generally very accurate
 */
const DEFAULT_CONFIDENCE_SCORE = 95;

/** Approximate word spacing for estimated bounding boxes */
const ESTIMATED_WORD_SPACING_PX = 50;
/** Approximate character width for estimated bounding boxes */
const ESTIMATED_CHAR_WIDTH_PX = 8;
/** Approximate line height for estimated bounding boxes */
const ESTIMATED_LINE_HEIGHT_PX = 20;

/** Progress percentage: OCR ready after initialization */
const PROGRESS_INIT_READY = 10;
/** Progress percentage: uploading image */
const PROGRESS_UPLOADING = 20;
/** Progress percentage: processing with OCR */
const PROGRESS_PROCESSING = 40;
/** Progress percentage: receiving results */
const PROGRESS_RECEIVING = 80;
/** Progress percentage: complete */
const PROGRESS_COMPLETE = 100;

// =============================================================================
// Mistral API Response Types
// =============================================================================

interface MistralTable {
  id: string;
  content: string;
  format: 'html' | 'markdown';
}

interface MistralOCRPage {
  index: number;
  markdown: string;
  images?: string[];
  tables?: (string | MistralTable)[];
  dimensions: {
    width: number;
    height: number;
  };
}

interface MistralOCRResponse {
  pages: MistralOCRPage[];
  model: string;
  usage_info: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// =============================================================================
// MistralOCR Class
// =============================================================================

/**
 * OCR engine implementation using Mistral's API via Cloudflare Worker proxy
 */
export class MistralOCR implements OCREngine {
  #onProgress: OnProgressCallback | undefined;
  #initialized = false;
  #endpoint: string;
  #abortController: AbortController | null = null;

  constructor(onProgress?: OnProgressCallback, endpoint?: string) {
    this.#onProgress = onProgress;
    // Endpoint resolution is centralized in OCRFactory - use default if not provided
    this.#endpoint = endpoint ?? DEFAULT_OCR_ENDPOINT;
  }

  /**
   * Report progress to callback
   */
  #reportProgress(status: string, progress: number): void {
    this.#onProgress?.({ status, progress });
  }

  /**
   * Initialize the OCR service
   */
  async initialize(): Promise<void> {
    if (this.#initialized) {
      return;
    }

    this.#reportProgress('Initializing Mistral OCR...', 0);

    // Verify the OCR endpoint is reachable via health check
    try {
      const healthUrl = this.#endpoint.replace('/ocr', '/health');
      // Create abort controller for health check (can be cancelled via terminate())
      this.#abortController = new AbortController();
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: this.#abortController.signal,
      });
      this.#abortController = null;

      if (!response.ok) {
        throw new Error('OCR service health check failed');
      }

      this.#reportProgress('Mistral OCR ready', PROGRESS_INIT_READY);
      this.#initialized = true;
    } catch (error) {
      this.#abortController = null;
      // Handle cancellation
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('OCR cancelled');
      }
      // Health check failed but we'll try OCR anyway
      console.warn(
        'OCR service health check failed, will attempt OCR anyway:',
        error,
      );
      this.#reportProgress('Mistral OCR ready (health check skipped)', PROGRESS_INIT_READY);
      this.#initialized = true;
    }
  }

  /**
   * Extract text content from HTML table
   */
  #parseHtmlTable(html: string): string[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');

    if (!table) {
      return [html]; // Return raw content if no table found
    }

    const lines: string[] = [];
    const rows = table.querySelectorAll('tr');

    for (const row of rows) {
      const cells = row.querySelectorAll('th, td');
      const cellTexts = Array.from(cells)
        .map((cell) => cell.textContent?.trim() ?? '')
        .filter((text) => text.length > 0);

      if (cellTexts.length > 0) {
        // Join cells with tab separator for structured output
        lines.push(cellTexts.join('\t'));
      }
    }

    return lines;
  }

  /**
   * Extract HTML content from a table entry
   */
  #getTableHtml(table: string | MistralTable): string {
    if (typeof table === 'string') {
      return table;
    }

    if (
      typeof table === 'object' &&
      table !== null &&
      typeof table.content === 'string'
    ) {
      return table.content;
    }

    console.warn('Unexpected table format:', table);
    return '';
  }

  /**
   * Replace table placeholders in markdown with actual table content
   */
  #inlineTables(
    markdown: string,
    tables: (string | MistralTable)[],
  ): string {
    if (!tables || tables.length === 0) {
      return markdown;
    }

    let result = markdown;

    // Replace each table placeholder with parsed table content
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      if (!table) continue;
      const placeholder = `[tbl-${i}.html](tbl-${i}.html)`;
      const tableHtml = this.#getTableHtml(table);
      const tableLines = this.#parseHtmlTable(tableHtml);
      const tableText = tableLines.join('\n');

      result = result.replace(placeholder, tableText);
    }

    return result;
  }

  /**
   * Convert Mistral OCR response to our internal format
   */
  #convertResponse(mistralResponse: MistralOCRResponse): OCRResult {
    // Combine all pages' markdown into full text
    const fullText = mistralResponse.pages
      .map((page) => this.#inlineTables(page.markdown, page.tables ?? []))
      .join('\n\n--- Page Break ---\n\n')
      .trim();

    // Parse markdown into lines
    const rawLines = fullText.split('\n');

    const lines: OCRLine[] = rawLines.map((lineText, lineIdx) => {
      const wordTexts = lineText.split(/\s+/).filter((w) => w.length > 0);

      const words: OCRWord[] = wordTexts.map((text, idx) => ({
        text,
        confidence: DEFAULT_CONFIDENCE_SCORE,
        bbox: {
          x0: idx * ESTIMATED_WORD_SPACING_PX,
          y0: lineIdx * ESTIMATED_LINE_HEIGHT_PX,
          x1:
            idx * ESTIMATED_WORD_SPACING_PX + text.length * ESTIMATED_CHAR_WIDTH_PX,
          y1: (lineIdx + 1) * ESTIMATED_LINE_HEIGHT_PX,
        },
      }));

      return {
        text: lineText,
        confidence: DEFAULT_CONFIDENCE_SCORE,
        words,
      };
    });

    // Flatten all words
    const words = lines.flatMap((line) => line.words);

    return {
      fullText,
      lines,
      words,
    };
  }

  /**
   * Perform OCR on an image
   */
  async recognize(imageBlob: Blob): Promise<OCRResult> {
    if (!this.#initialized) {
      throw new Error('MistralOCR not initialized. Call initialize() first.');
    }

    this.#reportProgress('Uploading image...', PROGRESS_UPLOADING);

    // Create abort controller for cancellation
    this.#abortController = new AbortController();

    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('image', imageBlob, 'scoresheet.jpg');

      this.#reportProgress('Processing with Mistral OCR...', PROGRESS_PROCESSING);

      // Send to OCR proxy
      const response = await fetch(this.#endpoint, {
        method: 'POST',
        body: formData,
        signal: this.#abortController.signal,
      });

      this.#reportProgress('Receiving results...', PROGRESS_RECEIVING);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(
          errorData.error ?? `OCR request failed: ${response.status}`,
        );
      }

      const mistralResponse = (await response.json()) as MistralOCRResponse;

      this.#reportProgress('Processing complete', PROGRESS_COMPLETE);

      return this.#convertResponse(mistralResponse);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('OCR cancelled');
      }
      throw error;
    } finally {
      this.#abortController = null;
    }
  }

  /**
   * Terminate the OCR service and cancel any pending requests
   */
  async terminate(): Promise<void> {
    if (this.#abortController) {
      this.#abortController.abort();
      this.#abortController = null;
    }
    this.#initialized = false;
  }
}
