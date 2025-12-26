import { memo } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { formatTravelTime } from "@/hooks/useTravelTime";
import { Badge } from "@/components/ui/Badge";
import { TrainFront } from "@/components/ui/icons";

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
          <TrainFront className="w-3 h-3" aria-hidden="true" />
          <span>...</span>
        </span>
      </Badge>
    );
  }

  if (isError || durationMinutes === undefined) {
    return null;
  }

  return (
    <Badge
      variant="neutral"
      className={className}
      title={t("exchange.travelTime")}
    >
      <span className="flex items-center gap-1">
        <TrainFront className="w-3 h-3" aria-hidden="true" />
        <span>{formatTravelTime(durationMinutes)}</span>
      </span>
    </Badge>
  );
}

export const TravelTimeBadge = memo(TravelTimeBadgeComponent);
