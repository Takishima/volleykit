/**
 * Unified icon exports using Lucide Icons.
 * All icons are re-exported from lucide-react for consistent styling.
 * Import icons from this file to ensure consistent usage across the app.
 *
 * @see https://lucide.dev/icons for the full icon catalog
 */

// Re-export icons used throughout the app
// Each export maintains tree-shaking - only imported icons are bundled

// Navigation icons
export { ClipboardList } from "lucide-react";
export { Wallet } from "lucide-react";
export { ArrowLeftRight } from "lucide-react";
export { Settings } from "lucide-react";

// Action icons
export { Upload } from "lucide-react";
export { Camera } from "lucide-react";
export { Check } from "lucide-react";
export { FileText } from "lucide-react";
export { AlertCircle } from "lucide-react";
export { User } from "lucide-react";
export { UserPlus } from "lucide-react";
export { RefreshCw } from "lucide-react";
export { Loader2 } from "lucide-react";
export { Trash2 } from "lucide-react";
export { Undo2 } from "lucide-react";
export { ChevronDown } from "lucide-react";
export { ChevronUp } from "lucide-react";
export { ChevronRight } from "lucide-react";
export { Circle } from "lucide-react";
export { X } from "lucide-react";
export { Plus } from "lucide-react";
export { MapPin } from "lucide-react";
export { Home } from "lucide-react";
export { Car } from "lucide-react";
export { TrainFront } from "lucide-react";
export { Navigation } from "lucide-react";
export { SlidersHorizontal } from "lucide-react";

// Status icons
export { CheckCircle } from "lucide-react";
export { AlertTriangle } from "lucide-react";
export { Calendar } from "lucide-react";
export { Clock } from "lucide-react";
export { Lock } from "lucide-react";
export { Inbox } from "lucide-react";
export { Info } from "lucide-react";

// App branding
export { Volleyball } from "lucide-react";

// Indicator icons
export { CircleAlert } from "lucide-react";
export { ExternalLink } from "lucide-react";

// Gender icons - custom SVGs since Lucide doesn't have Mars/Venus symbols
import type { SVGProps } from "react";

export function MaleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="10" cy="14" r="5" />
      <path d="M14 10l6-6" />
      <path d="M20 4v5" />
      <path d="M15 4h5" />
    </svg>
  );
}

export function FemaleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="9" r="5" />
      <path d="M12 14v7" />
      <path d="M9 18h6" />
    </svg>
  );
}
