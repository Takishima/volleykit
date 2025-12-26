import { memo } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { formatTravelTime } from "@/hooks/useTravelTime";
import { Badge } from "@/components/ui/Badge";

interface TravelTimeBadgeProps {
  /** Travel time in minutes */
  durationMinutes: number | undefined;
  /** Whether the travel time is currently loading */
  isLoading?: boolean;
  /** Whether there was an error fetching travel time */
  isError?: boolean;
  /** Additional CSS classes */
  className?: string;
}

function TravelTimeBadgeComponent({
  durationMinutes,
  isLoading = false,
  isError = false,
  className = "",
}: TravelTimeBadgeProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Badge variant="neutral" className={`animate-pulse ${className}`}>
        <span className="flex items-center gap-1">
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
          <span>...</span>
        </span>
      </Badge>
    );
  }

  if (isError || durationMinutes === undefined) {
    return null;
  }

  // Determine badge variant based on travel time
  const variant =
    durationMinutes <= 45
      ? "success"
      : durationMinutes <= 90
        ? "warning"
        : "danger";

  return (
    <Badge
      variant={variant}
      className={className}
      title={t("exchange.travelTime")}
    >
      <span className="flex items-center gap-1">
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
        <span>{formatTravelTime(durationMinutes)}</span>
      </span>
    </Badge>
  );
}

export const TravelTimeBadge = memo(TravelTimeBadgeComponent);
