import { memo } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { FilterChip } from "@/components/ui/FilterChip";
import { TrainFront } from "@/components/ui/icons";

interface TravelTimeFilterToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  maxTravelTimeMinutes: number;
  dataTour?: string;
}

function TravelTimeFilterToggleComponent({
  checked,
  onChange,
  maxTravelTimeMinutes,
  dataTour,
}: TravelTimeFilterToggleProps) {
  const { t } = useTranslation();

  const handleToggle = () => {
    onChange(!checked);
  };

  // Format time for display
  const formatTime = (): string => {
    if (maxTravelTimeMinutes < 60) {
      return `≤${maxTravelTimeMinutes}${t("common.minutesUnit")}`;
    }
    const hours = Math.floor(maxTravelTimeMinutes / 60);
    const minutes = maxTravelTimeMinutes % 60;
    if (minutes === 0) {
      return `≤${hours}${t("common.hoursUnit")}`;
    }
    return `≤${hours}${t("common.hoursUnit")} ${minutes}${t("common.minutesUnit")}`;
  };

  return (
    <FilterChip
      active={checked}
      onToggle={handleToggle}
      icon={<TrainFront className="w-full h-full" />}
      label={t("exchange.filterByTravelTime")}
      activeValue={formatTime()}
      showIconWhenActive
      dataTour={dataTour}
    />
  );
}

export const TravelTimeFilterToggle = memo(TravelTimeFilterToggleComponent);
