/**
 * Translation stub for OCR PoC
 *
 * Provides a useTranslation hook that returns English strings.
 * This allows the PoC to import shared components from the web-app
 * that use the translation system.
 */

const translations: Record<string, string> = {
  // Common
  'common.close': 'Close',
  'common.confirm': 'Confirm',

  // OCR/Validation
  'validation.ocr.cancel': 'Cancel',
  'validation.ocr.takePhoto': 'Take Photo',
  'validation.ocr.selectImage': 'Select Image',
  'validation.ocr.scanScoresheet': 'Scan Scoresheet',
  'validation.ocr.scanScoresheetDescription':
    'Take a photo or select an image of the scoresheet to extract player information.',
  'validation.ocr.processing': 'Processing...',
  'validation.ocr.rotateLeft': 'Rotate left',
  'validation.ocr.rotateRight': 'Rotate right',

  // Photo guide
  'validation.ocr.photoGuide.alignScoresheet': 'Align scoresheet within the frame',
  'validation.ocr.photoGuide.electronicHint': 'Align player list table within the frame',
  'validation.ocr.photoGuide.manuscriptHint': 'Align roster section within the frame',

  // Errors
  'validation.ocr.errors.cameraNotAvailable': 'Camera not available. Please select an image instead.',
  'validation.ocr.errors.imageTooLarge': 'Image is too large. Please select an image under 10MB.',
  'validation.ocr.errors.processingFailed': 'Failed to process image. Please try again.',
  'validation.scoresheetUpload.invalidFileType': 'Invalid file type. Please select a JPG, PNG, or WebP image.',
}

/**
 * Translation function that returns English strings.
 */
function t(key: string): string {
  return translations[key] ?? key
}

/**
 * Hook matching the web-app's useTranslation interface.
 */
export function useTranslation() {
  return { t }
}
