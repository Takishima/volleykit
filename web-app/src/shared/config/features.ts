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
  /** OCR proof-of-concept standalone app (link in settings, CI build/deploy) */
  ocrPoc: true,
  /** Interactive guided tours for new users */
  helpTours: true,
  /** Home location setting with geocoding (enables distance calculations) */
  homeLocation: true,
  /** Offline support: IndexedDB cache persistence and action queue */
  offline: true,
} as const
