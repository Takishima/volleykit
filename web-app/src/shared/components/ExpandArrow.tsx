import { ChevronDown } from "@/shared/components/icons";

interface ExpandArrowProps {
  isExpanded: boolean;
  className?: string;
}

/**
 * Animated chevron arrow for expandable/collapsible sections.
 * Rotates 180 degrees when expanded.
 */
export function ExpandArrow({ isExpanded, className = "" }: ExpandArrowProps) {
  return (
    <ChevronDown
      className={`w-4 h-4 text-text-subtle transition-transform duration-200 ${isExpanded ? "rotate-180" : ""} ${className}`}
      aria-hidden="true"
    />
  );
}
