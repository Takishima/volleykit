import { useState, useCallback, useRef, useEffect, lazy, Suspense } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAuthStore } from "@/stores/auth";
import { useDemoStore } from "@/stores/demo";
import { useSettingsStore } from "@/stores/settings";
import { useTourStore, type TourId } from "@/stores/tour";
import { useTranslation } from "@/hooks/useTranslation";
import { useTour } from "@/hooks/useTour";
import { usePWA } from "@/contexts/PWAContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { getOccupationLabelKey } from "@/utils/occupation-labels";

const SafeModeWarningModal = lazy(
  () =>
    import("@/components/features/SafeModeWarningModal").then((m) => ({
      default: m.SafeModeWarningModal,
    })),
);

const DEMO_RESET_MESSAGE_DURATION_MS = 3000;

const TOUR_IDS: TourId[] = ["assignments", "compensations", "exchange", "settings"];

export function SettingsPage() {
  const { user, logout, isDemoMode } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      logout: state.logout,
      isDemoMode: state.isDemoMode,
    })),
  );
  const { activeAssociationCode, refreshData } = useDemoStore(
    useShallow((state) => ({
      activeAssociationCode: state.activeAssociationCode,
      refreshData: state.refreshData,
    })),
  );
  const { isSafeModeEnabled, setSafeMode } = useSettingsStore(
    useShallow((state) => ({
      isSafeModeEnabled: state.isSafeModeEnabled,
      setSafeMode: state.setSafeMode,
    })),
  );
  const { getTourStatus, resetAllTours } = useTourStore(
    useShallow((state) => ({
      getTourStatus: state.getTourStatus,
      resetAllTours: state.resetAllTours,
    })),
  );
  const { t, locale } = useTranslation();

  // Initialize tour for this page (triggers auto-start on first visit)
  useTour("settings");
  const {
    needRefresh,
    isChecking,
    lastChecked,
    checkError,
    checkForUpdate,
    updateApp,
  } = usePWA();
  const [showSafeModeWarning, setShowSafeModeWarning] = useState(false);
  const [demoDataReset, setDemoDataReset] = useState(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const handleResetDemoData = useCallback(() => {
    refreshData();
    setDemoDataReset(true);
    // Clear any existing timeout before setting a new one
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
    resetTimeoutRef.current = setTimeout(
      () => setDemoDataReset(false),
      DEMO_RESET_MESSAGE_DURATION_MS,
    );
  }, [refreshData]);

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
        <CardContent data-tour="language-switcher">
          <LanguageSwitcher variant="grid" />
        </CardContent>
      </Card>

      {/* Guided Tours section */}
      <Card data-tour="tour-reset">
        <CardHeader>
          <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
            {t("tour.settings.tourSection.title")}
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-muted dark:text-text-muted-dark">
            {t("tour.settings.tourSection.description")}
          </p>

          {/* Safe mode note - only show outside demo mode */}
          {!isDemoMode && (
            <p className="text-sm text-warning-600 dark:text-warning-400">
              {t("tour.settings.tourSection.safeModeNote")}
            </p>
          )}

          {/* Tour status list */}
          <div className="space-y-2">
            {TOUR_IDS.map((tourId) => {
              const status = getTourStatus(tourId);
              return (
                <div
                  key={tourId}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-sm text-text-primary dark:text-text-primary-dark capitalize">
                    {t(`nav.${tourId}` as Parameters<typeof t>[0])}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      status === "completed"
                        ? "bg-success-100 text-success-700 dark:bg-success-900/50 dark:text-success-300"
                        : status === "dismissed"
                          ? "bg-warning-100 text-warning-700 dark:bg-warning-900/50 dark:text-warning-300"
                          : "bg-surface-subtle text-text-muted dark:bg-surface-subtle-dark dark:text-text-muted-dark"
                    }`}
                  >
                    {status === "completed"
                      ? t("tour.settings.tourSection.statusCompleted")
                      : status === "dismissed"
                        ? t("tour.settings.tourSection.statusSkipped")
                        : t("tour.settings.tourSection.statusNotStarted")}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Reset button */}
          <div className="pt-2">
            <Button variant="secondary" onClick={resetAllTours}>
              {t("tour.settings.tourSection.restart")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Demo Data section - only show in demo mode */}
      {isDemoMode && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
              {t("settings.demoData")}
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-text-muted dark:text-text-muted-dark">
              {t("settings.demoDataDescription")}
            </p>

            <div className="flex items-center justify-between py-2">
              <div className="flex-1">
                {demoDataReset && (
                  <div
                    className="text-sm font-medium text-success-600 dark:text-success-400"
                    role="status"
                    aria-live="polite"
                  >
                    {t("settings.demoDataReset")}
                  </div>
                )}
                {activeAssociationCode && !demoDataReset && (
                  <div className="text-sm text-text-muted dark:text-text-muted-dark">
                    {activeAssociationCode}
                  </div>
                )}
              </div>

              <Button
                variant="secondary"
                onClick={handleResetDemoData}
                aria-label={t("settings.resetDemoData")}
              >
                {t("settings.resetDemoData")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
            <span className="text-text-primary dark:text-text-primary-dark">{__APP_VERSION__}</span>
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
        <Button
          variant="secondary"
          onClick={logout}
          className="w-full sm:w-auto"
        >
          {t("auth.logout")}
        </Button>
      </div>

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
    </div>
  );
}
