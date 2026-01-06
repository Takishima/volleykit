import { useState, useCallback, lazy, Suspense, memo } from "react";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Card, CardContent, CardHeader } from "@/shared/components/Card";
import { ToggleSwitch } from "@/shared/components/ToggleSwitch";

const SafeModeWarningModal = lazy(
  () =>
    import("@/shared/components/SafeModeWarningModal").then((m) => ({
      default: m.SafeModeWarningModal,
    })),
);

interface DataProtectionSectionProps {
  isSafeModeEnabled: boolean;
  onSetSafeMode: (enabled: boolean) => void;
  isSafeValidationEnabled: boolean;
  onSetSafeValidation: (enabled: boolean) => void;
}

function DataProtectionSectionComponent({
  isSafeModeEnabled,
  onSetSafeMode,
  isSafeValidationEnabled,
  onSetSafeValidation,
}: DataProtectionSectionProps) {
  const { t } = useTranslation();
  const [showSafeModeWarning, setShowSafeModeWarning] = useState(false);

  const handleToggleSafeMode = useCallback(() => {
    if (isSafeModeEnabled) {
      setShowSafeModeWarning(true);
    } else {
      onSetSafeMode(true);
    }
  }, [isSafeModeEnabled, onSetSafeMode]);

  const handleCloseSafeModeWarning = useCallback(() => {
    setShowSafeModeWarning(false);
  }, []);

  const handleConfirmDisableSafeMode = useCallback(() => {
    onSetSafeMode(false);
  }, [onSetSafeMode]);

  const handleToggleSafeValidation = useCallback(() => {
    onSetSafeValidation(!isSafeValidationEnabled);
  }, [isSafeValidationEnabled, onSetSafeValidation]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-text-muted dark:text-text-muted-dark"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
              {t("settings.dataProtection.title")}
            </h2>
            {!isSafeModeEnabled && (
              <svg
                className="w-5 h-5 text-warning-600 dark:text-warning-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Safe Mode */}
          <div className="space-y-4">
            <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
              {t("settings.safeMode")}
            </div>
            <p className="text-sm text-text-muted dark:text-text-muted-dark">
              {t("settings.safeModeDescription")}
            </p>

            <div className="flex items-center justify-between py-2">
              <div className="flex-1">
                <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                  {isSafeModeEnabled
                    ? t("settings.safeModeEnabled")
                    : t("settings.safeModeDisabled")}
                </div>
                {!isSafeModeEnabled && (
                  <div className="text-xs text-warning-600 dark:text-warning-400 mt-1">
                    {t("settings.safeModeDangerous")}
                  </div>
                )}
              </div>

              <ToggleSwitch
                checked={isSafeModeEnabled}
                onChange={handleToggleSafeMode}
                label={t("settings.safeMode")}
                variant="success"
              />
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-border-subtle dark:border-border-subtle-dark" />

          {/* Safe Validation */}
          <div className="space-y-4">
            <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
              {t("settings.safeValidation")}
            </div>
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

              <ToggleSwitch
                checked={isSafeValidationEnabled}
                onChange={handleToggleSafeValidation}
                label={t("settings.safeValidation")}
                variant="success"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Safe Mode Warning Modal */}
      {showSafeModeWarning && (
        <Suspense fallback={null}>
          <SafeModeWarningModal
            isOpen={showSafeModeWarning}
            onClose={handleCloseSafeModeWarning}
            onConfirm={handleConfirmDisableSafeMode}
          />
        </Suspense>
      )}
    </>
  );
}

export const DataProtectionSection = memo(DataProtectionSectionComponent);
