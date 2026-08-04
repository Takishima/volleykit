/**
 * Guide overlay dimensions for different scoresheet types.
 * Used by both ScoresheetGuide and CaptureScreen components.
 */

import type { SheetType, ManuscriptCaptureMode } from '@/stores/appStore'

export interface GuideConfig {
  widthPercent: number
  aspectRatio: number
}

export const GUIDE_CONFIG: Record<
  SheetType,
  Record<ManuscriptCaptureMode | 'default', GuideConfig>
> = {
  electronic: {
    default: { widthPercent: 0.7, aspectRatio: 4 / 5 },
    full: { widthPercent: 0.7, aspectRatio: 4 / 5 },
    'roster-only': { widthPercent: 0.7, aspectRatio: 4 / 5 },
  },
  manuscript: {
    default: { widthPercent: 0.9, aspectRatio: 4 / 5 },
    full: { widthPercent: 0.85, aspectRatio: 7 / 5 },
    'roster-only': { widthPercent: 0.9, aspectRatio: 4 / 5 },
  },
}
