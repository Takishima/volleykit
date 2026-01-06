import { memo } from "react";

type ToggleVariant = "primary" | "success";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
  variant?: ToggleVariant;
}

const VARIANT_CLASSES: Record<ToggleVariant, string> = {
  primary: "bg-primary-600",
  success: "bg-success-600",
};

function ToggleSwitchComponent({
  checked,
  onChange,
  disabled = false,
  label,
  variant = "primary",
}: ToggleSwitchProps) {
  const enabledClass = VARIANT_CLASSES[variant];

  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
        disabled
          ? "bg-surface-muted dark:bg-surface-subtle-dark cursor-not-allowed opacity-50"
          : checked
            ? enabledClass
            : "bg-surface-muted dark:bg-surface-subtle-dark"
      }`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export const ToggleSwitch = memo(ToggleSwitchComponent);
