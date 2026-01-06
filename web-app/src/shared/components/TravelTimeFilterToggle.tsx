import { memo } from "react";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { FilterChip } from "@/shared/components/FilterChip";
import { TrainFront } from "@/shared/components/icons";
import { formatTravelTime } from "@/shared/utils/format-travel-time";

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

  const timeUnits = {
    minutesUnit: t("common.minutesUnit"),
    hoursUnit: t("common.hoursUnit"),
  };

  return (
    <FilterChip
      active={checked}
      onToggle={handleToggle}
      icon={<TrainFront className="w-full h-full" />}
      label={t("exchange.filterByTravelTime")}
      activeValue={formatTravelTime(maxTravelTimeMinutes, timeUnits, "≤")}
      showIconWhenActive
      dataTour={dataTour}
    />
  );
}

export const TravelTimeFilterToggle = memo(TravelTimeFilterToggleComponent);
