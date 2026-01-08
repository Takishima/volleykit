/**
 * useOCRScoresheet Hook
 *
 * React hook for processing scoresheet images with OCR.
 * Handles the full flow: OCR extraction → text parsing → structured data.
 *
 * Works with both manuscript (handwritten) and electronic (printed) scoresheets.
 */

import { useState, useCallback, useRef } from 'react';
import type {
  OCRProgress,
  ParsedGameSheet,
  UseOCRScoresheetReturn,
  OCREngine,
} from '../types';
import { OCRFactory } from '../services/ocr-factory';
import { parseGameSheet } from '../utils/player-list-parser';

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for processing scoresheet images with OCR.
 *
 * @example
 * ```tsx
 * function ScoresheetUpload() {
 *   const { processImage, isProcessing, progress, result, error, reset } = useOCRScoresheet();
 *
 *   const handleFileSelect = async (file: File) => {
 *     const parsed = await processImage(file);
 *     if (parsed) {
 *       console.log('Home team:', parsed.teamA.name);
 *       console.log('Players:', parsed.teamA.players);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       {isProcessing && <ProgressBar value={progress?.progress ?? 0} />}
 *       {error && <ErrorMessage>{error.message}</ErrorMessage>}
 *       {result && <PlayerList teams={result} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOCRScoresheet(): UseOCRScoresheetReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OCRProgress | null>(null);
  const [result, setResult] = useState<ParsedGameSheet | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Keep reference to current OCR engine for cancellation
  const engineRef = useRef<OCREngine | null>(null);

  /**
   * Process an image and extract player data
   */
  const processImage = useCallback(
    async (imageBlob: Blob): Promise<ParsedGameSheet | null> => {
      // Reset state
      setIsProcessing(true);
      setProgress(null);
      setResult(null);
      setError(null);

      try {
        // Create OCR engine with progress callback
        const engine = await OCRFactory.createWithFallback((p) => {
          setProgress(p);
        });
        engineRef.current = engine;

        // Initialize OCR
        await engine.initialize();

        // Perform OCR
        const ocrResult = await engine.recognize(imageBlob);

        // Parse the OCR text into structured data
        const parsed = parseGameSheet(ocrResult.fullText);

        // Clean up
        await engine.terminate();
        engineRef.current = null;

        // Update state
        setResult(parsed);
        setIsProcessing(false);

        return parsed;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));

        // Don't set error state if cancelled
        if (errorObj.message !== 'OCR cancelled') {
          setError(errorObj);
        }

        setIsProcessing(false);
        engineRef.current = null;

        return null;
      }
    },
    [],
  );

  /**
   * Cancel ongoing processing
   */
  const cancel = useCallback(async () => {
    if (engineRef.current) {
      try {
        await engineRef.current.terminate();
      } catch {
        // Ignore errors during cancellation - engine may already be terminated
      }
      engineRef.current = null;
    }
    setIsProcessing(false);
    setProgress(null);
  }, []);

  /**
   * Reset state to initial values
   */
  const reset = useCallback(() => {
    setIsProcessing(false);
    setProgress(null);
    setResult(null);
    setError(null);
  }, []);

  return {
    // State
    isProcessing,
    progress,
    result,
    error,
    // Actions
    processImage,
    cancel,
    reset,
  };
}
