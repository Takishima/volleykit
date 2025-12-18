import { useState, useCallback } from "react";
import { useAuthStore } from "@/stores/auth";
import { useSettingsStore } from "@/stores/settings";
import { useTranslation } from "@/hooks/useTranslation";
import { usePWA } from "@/contexts/PWAContext";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { getOccupationLabelKey } from "@/utils/occupation-labels";
import { SafeModeWarningModal } from "@/components/features/SafeModeWarningModal";

export function SettingsPage() {
  const { user, logout, isDemoMode } = useAuthStore();
  const { isSafeModeEnabled, setSafeMode } = useSettingsStore();
  const { t, locale } = useTranslation();
  const {
    needRefresh,
    isChecking,
    lastChecked,
    checkError,
    checkForUpdate,
    updateApp,
  } = usePWA();
  const [showSafeModeWarning, setShowSafeModeWarning] = useState(false);

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

  const handleToggleSafeMode = useCallback(() => {
    if (isSafeModeEnabled) {
      setShowSafeModeWarning(true);
    } else {
      setSafeMode(true);
    }
  }, [isSafeModeEnabled, setSafeMode]);

  const handleCloseSafeModeWarning = useCallback(() => {
    setShowSafeModeWarning(false);
  }, []);

  const handleConfirmDisableSafeMode = useCallback(() => {
    setSafeMode(false);
  }, [setSafeMode]);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">
        {t("settings.title")}
      </h1>

      {/* Profile section */}
      {user && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
              {t("settings.profile")}
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-2xl">
                {user.firstName.charAt(0)}
                {user.lastName.charAt(0)}
              </div>
              <div>
                <div className="font-medium text-text-primary dark:text-text-primary-dark">
                  {user.firstName} {user.lastName}
                </div>
                {user.email && (
                  <div className="text-sm text-text-muted dark:text-text-muted-dark">
                    {user.email}
                  </div>
                )}
              </div>
            </div>

            {user.occupations && user.occupations.length > 0 && (
              <div className="border-t border-border-subtle dark:border-border-subtle-dark pt-4">
                <div className="text-sm text-text-muted dark:text-text-muted-dark mb-2">
                  {t("settings.roles")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.occupations.map((occ) => (
                    <Badge key={occ.id} variant="neutral" className="rounded-full">
                      {t(getOccupationLabelKey(occ.type))}
                      {occ.associationCode && ` (${occ.associationCode})`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Language section */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
            {t("settings.language")}
          </h2>
        </CardHeader>
        <CardContent>
          <LanguageSwitcher variant="grid" />
        </CardContent>
      </Card>

      {/* Safe Mode section - only show in non-demo mode */}
      {!isDemoMode && (
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
      )}

      {/* Privacy */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
            {t("settings.privacy")}
          </h2>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-text-muted dark:text-text-muted-dark">
          <p>{t("settings.privacyNoCollection")}</p>
          <p>{t("settings.privacyDirectComm")}</p>
          <p>{t("settings.privacyNoAnalytics")}</p>
        </CardContent>
      </Card>

      {/* Updates - only show when PWA is enabled */}
      {__PWA_ENABLED__ && (
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
                <button
                  onClick={updateApp}
                  className="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-primary-950 hover:bg-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:outline-none"
                  aria-label={t("settings.updateNow")}
                >
                  {t("settings.updateNow")}
                </button>
              ) : (
                <button
                  onClick={checkForUpdate}
                  disabled={isChecking}
                  aria-busy={isChecking}
                  className="rounded-md bg-surface-subtle dark:bg-surface-subtle-dark px-4 py-2 text-sm font-medium text-text-secondary dark:text-text-secondary-dark hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={t("settings.checkForUpdates")}
                >
                  {isChecking ? t("settings.checking") : t("settings.checkForUpdates")}
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* App info */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
            {t("settings.about")}
          </h2>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted dark:text-text-muted-dark">
              {t("settings.version")}
            </span>
            <span className="text-text-primary dark:text-text-primary-dark">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted dark:text-text-muted-dark">
              {t("settings.platform")}
            </span>
            <span className="text-text-primary dark:text-text-primary-dark">Web</span>
          </div>
          <div className="border-t border-border-subtle dark:border-border-subtle-dark pt-3 mt-3">
            <a
              href="https://volleymanager.volleyball.ch"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              {t("settings.openWebsite")} →
            </a>
          </div>
          <div className="border-t border-border-subtle dark:border-border-subtle-dark pt-3 mt-3 space-y-2">
            <p className="text-text-muted dark:text-text-muted-dark">
              {t("settings.dataSource")}
            </p>
            <p className="text-xs text-text-subtle dark:text-text-subtle-dark">
              {t("settings.disclaimer")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <div className="pt-4 border-t border-border-default dark:border-border-default-dark">
        <button onClick={logout} className="btn btn-secondary w-full sm:w-auto">
          {t("auth.logout")}
        </button>
      </div>

      {/* Safe Mode Warning Modal */}
      <SafeModeWarningModal
        isOpen={showSafeModeWarning}
        onClose={handleCloseSafeModeWarning}
        onConfirm={handleConfirmDisableSafeMode}
      />
    </div>
  );
}
