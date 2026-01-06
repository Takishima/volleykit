import { useTranslation } from "@/shared/hooks/useTranslation";
import { FilterChip } from "@/shared/components/FilterChip";
import { MapPin } from "@/shared/components/icons";

interface DistanceFilterToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  maxDistanceKm: number;
  dataTour?: string;
}

export function DistanceFilterToggle({
  checked,
  onChange,
  maxDistanceKm,
  dataTour,
}: DistanceFilterToggleProps) {
  const { t } = useTranslation();

  const handleToggle = () => {
    onChange(!checked);
  };

  // Show distance value when active (e.g., "≤50 km")
  const activeValue = `≤${maxDistanceKm} ${t("common.distanceUnit")}`;

  return (
    <FilterChip
      active={checked}
      onToggle={handleToggle}
      icon={<MapPin className="w-full h-full" />}
      label={t("exchange.filterByDistance")}
      activeValue={activeValue}
      showIconWhenActive
      dataTour={dataTour}
    />
  );
}
