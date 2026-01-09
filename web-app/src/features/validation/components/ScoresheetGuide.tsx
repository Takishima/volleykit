/**
 * ScoresheetGuide Component
 *
 * Provides a visual overlay guide for framing scoresheets when capturing images.
 * Displays a frame with the correct aspect ratio to help users align scoresheets.
 *
 * Supports two aspect ratios based on scoresheet type:
 * - Electronic (4:5 portrait): For player list table capture from screenshots
 * - Manuscript (4:5 portrait): For roster section capture from physical scoresheets
 */

import type { ScoresheetType } from "@/features/ocr/utils/scoresheet-detector";
import { useTranslation } from "@/shared/hooks/useTranslation";

/**
 * Aspect ratio dimensions for electronic scoresheet player list
 * 4:5 portrait format matches Swiss volleyball scoresheet tables
 */
const ELECTRONIC_WIDTH = 4;
const ELECTRONIC_HEIGHT = 5;
const TABLE_ASPECT_RATIO = ELECTRONIC_WIDTH / ELECTRONIC_HEIGHT;

/**
 * Aspect ratio dimensions for manuscript scoresheet roster section
 * 4:5 portrait format matches the roster area of Swiss volleyball scoresheets
 */
const MANUSCRIPT_WIDTH = 4;
const MANUSCRIPT_HEIGHT = 5;
const MANUSCRIPT_ASPECT_RATIO = MANUSCRIPT_WIDTH / MANUSCRIPT_HEIGHT;

interface ScoresheetGuideProps {
  /** Type of scoresheet being captured */
  scoresheetType: ScoresheetType;
}

/**
 * Visual overlay guide for scoresheet image capture.
 * Shows a frame with the appropriate aspect ratio and alignment hints.
 */
export function ScoresheetGuide({ scoresheetType }: ScoresheetGuideProps) {
  const { t } = useTranslation();

  const isElectronic = scoresheetType === "electronic";
  const aspectRatio = isElectronic ? TABLE_ASPECT_RATIO : MANUSCRIPT_ASPECT_RATIO;

  // Calculate frame dimensions based on aspect ratio
  // Both electronic and manuscript use portrait orientation (4:5)
  // Electronic uses smaller frame width (70%) for tighter focus on player list
  // Manuscript uses larger frame width (90%) for broader roster capture
  const frameStyle = isElectronic
    ? {
        width: "70%",
        aspectRatio: `${aspectRatio}`,
      }
    : {
        width: "90%",
        aspectRatio: `${aspectRatio}`,
      };

  const hintText = isElectronic
    ? t("validation.ocr.photoGuide.electronicHint")
    : t("validation.ocr.photoGuide.manuscriptHint");

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {/* Semi-transparent overlay with cutout */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Guide frame */}
      <div
        className="relative border-2 border-white/80 rounded-lg bg-transparent z-10"
        style={frameStyle}
      >
        {/* Corner markers */}
        <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
        <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
        <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
        <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />

        {/* Center crosshair */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-0.5 bg-white/50" />
          <div className="absolute w-0.5 h-8 bg-white/50" />
        </div>

        {/* Hint text at bottom */}
        <div className="absolute -bottom-10 left-0 right-0 text-center">
          <span className="text-sm text-white/90 bg-black/50 px-3 py-1 rounded-full">
            {hintText}
          </span>
        </div>
      </div>

      {/* Alignment instruction at top */}
      <div className="absolute top-4 left-0 right-0 text-center z-10">
        <span className="text-sm font-medium text-white/90 bg-black/50 px-4 py-2 rounded-lg">
          {t("validation.ocr.photoGuide.alignScoresheet")}
        </span>
      </div>
    </div>
  );
}
