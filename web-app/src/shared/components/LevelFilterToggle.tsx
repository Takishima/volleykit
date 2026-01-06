import { useTranslation } from "@/shared/hooks/useTranslation";
import { FilterChip } from "@/shared/components/FilterChip";

interface LevelFilterToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  userLevel?: string | null;
  dataTour?: string;
}

export function LevelFilterToggle({
  checked,
  onChange,
  userLevel,
  dataTour,
}: LevelFilterToggleProps) {
  const { t } = useTranslation();

  const handleToggle = () => {
    onChange(!checked);
  };

  // Show level suffix when active (e.g., "N2+")
  const activeValue = userLevel ? `${userLevel}+` : undefined;

  return (
    <FilterChip
      active={checked}
      onToggle={handleToggle}
      label={t("exchange.filterByLevel")}
      activeValue={activeValue}
      dataTour={dataTour}
    />
  );
}
