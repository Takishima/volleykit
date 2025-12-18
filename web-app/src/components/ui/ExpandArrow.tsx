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
    <svg
      className={`w-4 h-4 text-text-subtle transition-transform duration-200 ${isExpanded ? "rotate-180" : ""} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
