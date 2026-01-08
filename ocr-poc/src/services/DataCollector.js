/**
 * Data Collector Service
 *
 * Collects and exports OCR data samples for parser improvement.
 * Exports include raw OCR output, sheet type, and parsed results.
 */

import { parseGameSheet } from './PlayerListParser.js';

/**
 * @typedef {import('./ocr/StubOCR.js').OCRResult} OCRResult
 * @typedef {import('./PlayerListParser.js').ParsedGameSheet} ParsedGameSheet
 */

/**
 * @typedef {Object} DataSample
 * @property {string} id - Unique sample ID
 * @property {string} timestamp - ISO timestamp
 * @property {'electronic' | 'manuscript'} sheetType - Sheet type
 * @property {OCRResult} ocrResult - Raw OCR result
 * @property {ParsedGameSheet | null} parsedResult - Parsed game sheet (if successful)
 * @property {string | null} parseError - Parse error message (if failed)
 * @property {Object} stats - Statistics about the OCR result
 */

/**
 * Generate a unique ID for a sample
 * @returns {string}
 */
function generateId() {
  return `sample-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Calculate statistics from OCR result
 * @param {OCRResult} ocrResult
 * @returns {Object}
 */
function calculateStats(ocrResult) {
  const lines = ocrResult.fullText.split('\n').filter((l) => l.trim().length > 0);
  const tabLines = lines.filter((l) => l.includes('\t'));
  const avgConfidence =
    ocrResult.words.length > 0
      ? Math.round(ocrResult.words.reduce((sum, w) => sum + w.confidence, 0) / ocrResult.words.length)
      : 0;

  // Count lines matching player pattern (number followed by name)
  const playerPatternRegex = /^\d{1,2}[\s\t.:_-]+[A-Za-zÀ-ÿ]/;
  const playerLikeLines = lines.filter((l) => playerPatternRegex.test(l.trim()));

  // Check for common section markers
  const hasOfficialMarker = lines.some((l) => l.toUpperCase().includes('OFFICIAL'));
  const hasLiberoMarker = lines.some((l) => l.toUpperCase().includes('LIBERO'));
  const hasSignatureMarker = lines.some((l) => l.toUpperCase().includes('SIGNATURE'));

  return {
    totalLines: lines.length,
    tabSeparatedLines: tabLines.length,
    tabLineRatio: lines.length > 0 ? (tabLines.length / lines.length).toFixed(2) : 0,
    totalWords: ocrResult.words.length,
    avgConfidence,
    playerLikeLines: playerLikeLines.length,
    hasOfficialMarker,
    hasLiberoMarker,
    hasSignatureMarker,
    charCount: ocrResult.fullText.length,
  };
}

/**
 * Collect a data sample from OCR result
 * @param {OCRResult} ocrResult - The OCR result
 * @param {'electronic' | 'manuscript'} sheetType - The sheet type
 * @returns {DataSample}
 */
export function collectSample(ocrResult, sheetType) {
  let parsedResult = null;
  let parseError = null;

  try {
    parsedResult = parseGameSheet(ocrResult.fullText);
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error);
  }

  return {
    id: generateId(),
    timestamp: new Date().toISOString(),
    sheetType,
    ocrResult,
    parsedResult,
    parseError,
    stats: calculateStats(ocrResult),
  };
}

/**
 * Export sample as downloadable JSON file
 * @param {DataSample} sample - The sample to export
 */
export function exportSampleAsJSON(sample) {
  const json = JSON.stringify(sample, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `ocr-sample-${sample.sheetType}-${sample.id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export just the raw OCR text as a text file
 * @param {OCRResult} ocrResult - The OCR result
 * @param {'electronic' | 'manuscript'} sheetType - The sheet type
 */
export function exportRawText(ocrResult, sheetType) {
  const blob = new Blob([ocrResult.fullText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `ocr-text-${sheetType}-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Log sample summary to console for quick inspection
 * @param {DataSample} sample
 */
export function logSampleSummary(sample) {
  console.log('=== OCR Data Sample ===');
  console.log('ID:', sample.id);
  console.log('Type:', sample.sheetType);
  console.log('Timestamp:', sample.timestamp);
  console.log('\n--- Statistics ---');
  console.table(sample.stats);

  if (sample.parsedResult) {
    console.log('\n--- Parsed Result ---');
    console.log('Team A:', sample.parsedResult.teamA.name);
    console.log('  Players:', sample.parsedResult.teamA.players.length);
    console.log('  Officials:', sample.parsedResult.teamA.officials.length);
    console.log('Team B:', sample.parsedResult.teamB.name);
    console.log('  Players:', sample.parsedResult.teamB.players.length);
    console.log('  Officials:', sample.parsedResult.teamB.officials.length);
    console.log('Warnings:', sample.parsedResult.warnings);
  } else {
    console.log('\n--- Parse Error ---');
    console.log(sample.parseError);
  }

  console.log('\n--- Raw OCR Text ---');
  console.log(sample.ocrResult.fullText);
  console.log('======================');
}

/**
 * Copy OCR text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Whether copy succeeded
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}
