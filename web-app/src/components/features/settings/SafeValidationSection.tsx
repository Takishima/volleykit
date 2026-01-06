import { memo, useCallback } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

interface SafeValidationSectionProps {
  isSafeValidationEnabled: boolean;
  onSetSafeValidation: (enabled: boolean) => void;
}

function SafeValidationSectionComponent({
  isSafeValidationEnabled,
  onSetSafeValidation,
}: SafeValidationSectionProps) {
  const { t } = useTranslation();

  const handleToggle = useCallback(() => {
    onSetSafeValidation(!isSafeValidationEnabled);
  }, [isSafeValidationEnabled, onSetSafeValidation]);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
          {t("settings.safeValidation")}
        </h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-text-muted dark:text-text-muted-dark">
          {t("settings.safeValidationDescription")}
        </p>

        <div className="flex items-center justify-between py-2">
          <div className="flex-1">
            <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
              {isSafeValidationEnabled
                ? t("settings.safeValidationEnabled")
                : t("settings.safeValidationDisabled")}
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
              isSafeValidationEnabled
                ? "bg-success-600"
                : "bg-surface-muted dark:bg-surface-subtle-dark"
            }`}
            role="switch"
            aria-checked={isSafeValidationEnabled}
            aria-label={t("settings.safeValidation")}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isSafeValidationEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export const SafeValidationSection = memo(SafeValidationSectionComponent);
