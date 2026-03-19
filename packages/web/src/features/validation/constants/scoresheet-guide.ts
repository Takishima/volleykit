/**
 * Shared constants for scoresheet guide overlay dimensions.
 *
 * These values define the guide overlay shown during camera capture
 * and are used by both ScoresheetGuide.tsx (visual overlay) and
 * image-crop.ts (auto-crop calculation).
 *
 * IMPORTANT: Keep these values in sync - they define what the user
 * sees during capture and what area is cropped from the captured image.
 */

/** Guide width as percentage of container width for electronic scoresheets (70%) */
export const ELECTRONIC_GUIDE_WIDTH_PERCENT = 0.7

/** Guide width as percentage of container width for manuscript scoresheets (90%) */
export const MANUSCRIPT_GUIDE_WIDTH_PERCENT = 0.9

/** Aspect ratio width component (4:5 portrait) */
const ASPECT_WIDTH = 4

/** Aspect ratio height component (4:5 portrait) */
const ASPECT_HEIGHT = 5

/**
 * Guide aspect ratio (width / height).
 * 4:5 portrait format = 0.8
 */
export const GUIDE_ASPECT_RATIO = ASPECT_WIDTH / ASPECT_HEIGHT
