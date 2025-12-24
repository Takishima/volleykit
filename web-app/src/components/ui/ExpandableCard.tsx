import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { ExpandArrow } from "@/components/ui/ExpandArrow";
import { useExpandable } from "@/hooks/useExpandable";

interface ExpandableCardRenderContext {
  /** Current expansion state */
  isExpanded: boolean;
  /** Pre-rendered ExpandArrow element, or null if expansion is disabled */
  expandArrow: ReactNode | null;
}

interface ExpandableCardProps<T> {
  /** The data to render */
  data: T;
  /** When true, expansion is disabled and the arrow is hidden */
  disableExpansion?: boolean;
  /** Optional callback instead of internal toggle */
  onClick?: () => void;
  /** Additional className for Card wrapper */
  className?: string;
  /** Render function for compact view (always visible header) */
  renderCompact: (data: T, context: ExpandableCardRenderContext) => ReactNode;
  /** Render function for expanded details section */
  renderDetails: (data: T) => ReactNode;
}

/**
 * Generic expandable card component with smooth CSS Grid animation.
 * Implements WAI-ARIA Disclosure pattern for accessibility.
 *
 * @example
 * ```tsx
 * <ExpandableCard
 *   data={assignment}
 *   renderCompact={(data) => <CompactView data={data} />}
 *   renderDetails={(data) => <DetailsView data={data} />}
 * />
 * ```
 */
export function ExpandableCard<T>({
  data,
  disableExpansion,
  onClick,
  className,
  renderCompact,
  renderDetails,
}: ExpandableCardProps<T>) {
  const { isExpanded, detailsId, handleToggle } = useExpandable({
    disabled: disableExpansion,
    onClick,
  });

  const expandArrow = disableExpansion ? null : (
    <ExpandArrow isExpanded={isExpanded} className="shrink-0" />
  );

  return (
    <Card className={className}>
      <CardContent className="p-0">
        {/* Clickable header region */}
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={isExpanded}
          aria-controls={detailsId}
          className="w-full text-left px-2 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset rounded-xl"
        >
          {/* Compact view - always visible */}
          <div className="flex items-center gap-3">
            {renderCompact(data, { isExpanded, expandArrow })}
          </div>
        </button>

        {/* Expanded details - using CSS Grid for smooth animation */}
        <div
          id={detailsId}
          className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">{renderDetails(data)}</div>
        </div>
      </CardContent>
    </Card>
  );
}
