import { useTranslation } from "@/hooks/useTranslation";

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

  const handleChange = () => {
    onChange(!checked);
  };

  return (
    <label
      className="inline-flex items-center gap-2 cursor-pointer select-none"
      data-tour={dataTour}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        className="sr-only peer"
        aria-describedby={userLevel ? "level-filter-description" : undefined}
      />
      <span
        className={`
          relative w-9 h-5 rounded-full transition-colors
          peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 peer-focus:ring-offset-2
          ${checked ? "bg-primary-500" : "bg-gray-200 dark:bg-gray-700"}
        `}
      >
        <span
          className={`
            absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform
            ${checked ? "translate-x-4" : "translate-x-0"}
          `}
        />
      </span>
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {t("exchange.filterByLevel")}
        {userLevel && checked && (
          <span
            id="level-filter-description"
            className="ml-1 text-xs text-gray-400 dark:text-gray-500"
          >
            ({userLevel}+)
          </span>
        )}
      </span>
    </label>
  );
}
