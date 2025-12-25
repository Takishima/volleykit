import { useCallback } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { usePWA } from "@/contexts/PWAContext";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function UpdateSection() {
  const { t, locale } = useTranslation();
  const {
    needRefresh,
    isChecking,
    lastChecked,
    checkError,
    checkForUpdate,
    updateApp,
  } = usePWA();

  const formatLastChecked = useCallback(
    (date: Date) => {
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();

      if (isToday) {
        return date.toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      // Include date for non-today timestamps to avoid confusion
      return date.toLocaleString(locale, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    [locale],
  );

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
          {t("settings.updates")}
        </h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div
              className="text-sm font-medium text-text-primary dark:text-text-primary-dark"
              aria-live="polite"
            >
              {needRefresh
                ? t("settings.updateAvailable")
                : t("settings.upToDate")}
            </div>
            {lastChecked && (
              <div className="text-xs text-text-muted dark:text-text-muted-dark mt-1">
                {t("settings.lastChecked")}: {formatLastChecked(lastChecked)}
              </div>
            )}
            {checkError && (
              <div
                className="text-xs text-danger-600 dark:text-danger-400 mt-1"
                role="alert"
              >
                {t("settings.updateCheckFailed")}
              </div>
            )}
          </div>
          {needRefresh ? (
            <Button
              variant="primary"
              onClick={updateApp}
              aria-label={t("settings.updateNow")}
            >
              {t("settings.updateNow")}
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={checkForUpdate}
              loading={isChecking}
              aria-label={t("settings.checkForUpdates")}
            >
              {isChecking ? t("settings.checking") : t("settings.checkForUpdates")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
