import { useState, useCallback, lazy, Suspense, memo } from "react";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Card, CardContent, CardHeader } from "@/shared/components/Card";

const SafeModeWarningModal = lazy(
  () =>
    import("@/shared/components/SafeModeWarningModal").then((m) => ({
      default: m.SafeModeWarningModal,
    })),
);

interface SafeModeSectionProps {
  isSafeModeEnabled: boolean;
  onSetSafeMode: (enabled: boolean) => void;
}

function SafeModeSectionComponent({ isSafeModeEnabled, onSetSafeMode }: SafeModeSectionProps) {
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
              {t("settings.safeMode")}
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
        <CardContent className="space-y-4">
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

            <button
              type="button"
              onClick={handleToggleSafeMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                isSafeModeEnabled
                  ? "bg-success-600"
                  : "bg-surface-muted dark:bg-surface-subtle-dark"
              }`}
              role="switch"
              aria-checked={isSafeModeEnabled}
              aria-label={t("settings.safeMode")}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isSafeModeEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
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

export const SafeModeSection = memo(SafeModeSectionComponent);
