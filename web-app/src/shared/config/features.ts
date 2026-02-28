/**
 * Feature availability flags.
 *
 * All features are enabled by default. To create a build without a feature,
 * set it to `false` here, then delete the corresponding feature folder.
 *
 * Vite treats these as compile-time constants, so disabled features are
 * tree-shaken from the production bundle.
 */
export const features = {
  /** Swiss public transport integration (SBB routing, travel time filtering) */
  transport: true,
  /** OCR scoresheet scanning (experimental) */
  ocr: true,
} as const
