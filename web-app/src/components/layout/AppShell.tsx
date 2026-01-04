import { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore, type Occupation } from "@/stores/auth";
import { useTourStore } from "@/stores/tour";
import { useTranslation } from "@/hooks/useTranslation";
import { getOccupationLabelKey } from "@/utils/occupation-labels";
import { getApiClient } from "@/api/client";
import { toast } from "@/stores/toast";
import { createLogger } from "@/utils/logger";
import { prefetchAllTabData } from "@/hooks/usePrefetchTabData";
import {
  Volleyball,
  ClipboardList,
  Wallet,
  ArrowLeftRight,
  Settings,
  ChevronDown,
  Calendar,
} from "@/components/ui/icons";
import type { LucideIcon } from "lucide-react";
import { TourModeBanner } from "@/components/tour/TourModeBanner";

const log = createLogger("AppShell");

// Lazy-load debug panel to avoid bundle size impact in production
const DebugPanel = lazy(() =>
  import("@/components/debug/DebugPanel").then((m) => ({
    default: m.DebugPanel,
  })),
);

const MINIMUM_OCCUPATIONS_FOR_SWITCHER = 2;

interface NavItem {
  path: string;
  labelKey: "nav.assignments" | "nav.compensations" | "nav.exchange" | "nav.settings";
  icon: LucideIcon;
  testId: string;
}

const allNavItems: NavItem[] = [
  { path: "/", labelKey: "nav.assignments", icon: ClipboardList, testId: "nav-assignments" },
  { path: "/compensations", labelKey: "nav.compensations", icon: Wallet, testId: "nav-compensations" },
  { path: "/exchange", labelKey: "nav.exchange", icon: ArrowLeftRight, testId: "nav-exchange" },
  { path: "/settings", labelKey: "nav.settings", icon: Settings, testId: "nav-settings" },
];

// Paths that are hidden in calendar mode (read-only view)
const CALENDAR_MODE_HIDDEN_PATHS = ["/compensations", "/exchange"];

export function AppShell() {
  const location = useLocation();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const {
    status,
    user,
    logout,
    activeOccupationId,
    setActiveOccupation,
    dataSource,
    isAssociationSwitching,
    setAssociationSwitching,
    isCalendarMode,
  } = useAuthStore(
    useShallow((state) => ({
      status: state.status,
      user: state.user,
      logout: state.logout,
      activeOccupationId: state.activeOccupationId,
      setActiveOccupation: state.setActiveOccupation,
      dataSource: state.dataSource,
      isAssociationSwitching: state.isAssociationSwitching,
      setAssociationSwitching: state.setAssociationSwitching,
      isCalendarMode: state.isCalendarMode(),
    })),
  );
  const activeTour = useTourStore((state) => state.activeTour);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Track the latest switch request to handle race conditions
  // when user rapidly clicks different associations
  const switchCounterRef = useRef(0);

  const getOccupationLabel = useCallback(
    (occupation: Occupation): string => {
      const labelKey = getOccupationLabelKey(occupation.type);
      const baseLabel = t(labelKey);
      if (occupation.clubName) {
        return `${baseLabel} (${occupation.clubName})`;
      }
      if (occupation.associationCode) {
        return `${baseLabel} (${occupation.associationCode})`;
      }
      return baseLabel;
    },
    [t],
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isAuthenticated = status === "authenticated";

  // Filter nav items based on calendar mode
  const navItems = useMemo(() => {
    if (isCalendarMode) {
      return allNavItems.filter(
        (item) => !CALENDAR_MODE_HIDDEN_PATHS.includes(item.path),
      );
    }
    return allNavItems;
  }, [isCalendarMode]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeOccupation =
    user?.occupations?.find((o) => o.id === activeOccupationId) ??
    user?.occupations?.[0];

  const handleOccupationSelect = async (id: string) => {
    // Don't switch if selecting the same occupation
    if (id === activeOccupationId) {
      setIsDropdownOpen(false);
      return;
    }

    // Increment counter to track this specific switch request
    // This handles race conditions when user rapidly clicks different associations
    const currentSwitch = ++switchCounterRef.current;

    setAssociationSwitching(true);
    setIsDropdownOpen(false);

    try {
      // Call API to switch association (works for both demo and production mode)
      // In demo mode, the mock API handles regenerating demo data
      // In production mode, this switches the server-side active party
      const apiClient = getApiClient(dataSource);
      await apiClient.switchRoleAndAttribute(id);

      // Check if this is still the latest switch request (race condition protection)
      if (currentSwitch !== switchCounterRef.current) {
        // A newer switch was initiated, don't update state or invalidate queries
        return;
      }

      // Update state AFTER the API call succeeds to prevent race conditions.
      // If we update state before the API call, queries will start refetching
      // with new keys while the server is still in the old association context,
      // causing stale data to be cached under the new association key.
      setActiveOccupation(id);

      // Reset all queries to clear cached data and force fresh fetches.
      // Using resetQueries() instead of invalidateQueries() ensures:
      // 1. Old association's data is cleared immediately (shows loading state)
      // 2. New data is fetched fresh from the server
      // This prevents showing stale data from the previous association.
      await queryClient.resetQueries();

      // Prefetch data for all tabs in production mode.
      // This improves UX by loading data for tabs the user hasn't visited yet.
      // In demo mode, data comes directly from the store, so no prefetch needed.
      if (dataSource === "api") {
        // Don't await - let prefetch happen in background while user interacts
        prefetchAllTabData(queryClient, id).catch(() => {
          // Errors are already logged in prefetchAllTabData, no action needed
        });
      }
    } catch (error) {
      // Check if this is still the latest switch request before showing error
      if (currentSwitch === switchCounterRef.current) {
        // Show error toast to user - state was not changed so no revert needed
        toast.error(t("common.switchAssociationFailed"));
        log.error("Failed to switch association:", error);
      }
    } finally {
      // Only clear switching state if this is still the latest request
      if (currentSwitch === switchCounterRef.current) {
        setAssociationSwitching(false);
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-surface-page dark:bg-surface-page-dark">
      {/* Header - fixed to always stay visible */}
      <header className="bg-surface-card dark:bg-surface-card-dark shadow-sm border-b border-border-default dark:border-border-default-dark fixed top-0 left-0 right-0 z-50 safe-area-inset-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-2">
              <Volleyball className="w-6 h-6 text-primary-600 dark:text-primary-400" aria-hidden="true" />
              <h1 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
                VolleyKit
              </h1>
            </div>

            {isAuthenticated && (
              <div className="flex items-center gap-3">
                {/* Calendar Mode Indicator */}
                {dataSource === "calendar" && (
                  <div
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary-100 dark:bg-primary-900/40"
                    title={t("common.calendarModeTooltip")}
                  >
                    <Calendar
                      className="w-4 h-4 text-primary-700 dark:text-primary-300"
                      aria-hidden="true"
                    />
                    <span className="text-xs font-medium text-primary-700 dark:text-primary-300 hidden sm:inline">
                      {t("common.calendarModeBanner")}
                    </span>
                  </div>
                )}

                {user?.occupations &&
                  user.occupations.length >= MINIMUM_OCCUPATIONS_FOR_SWITCHER && (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      disabled={isAssociationSwitching}
                      className={`flex items-center gap-1 px-2 py-1 text-sm font-medium rounded-lg transition-colors ${
                        isAssociationSwitching
                          ? "text-text-muted dark:text-text-muted-dark bg-surface-subtle dark:bg-surface-subtle-dark cursor-wait"
                          : "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50"
                      }`}
                      aria-expanded={isDropdownOpen}
                      aria-haspopup="listbox"
                    >
                      <span className="max-w-[100px] truncate">
                        {activeOccupation
                          ? getOccupationLabel(activeOccupation)
                          : t("common.selectRole")}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </button>

                    {isDropdownOpen && (
                      <div
                        className="absolute right-0 mt-1 w-48 bg-surface-card dark:bg-surface-card-dark rounded-lg shadow-lg border border-border-default dark:border-border-default-dark py-1 z-50"
                        role="listbox"
                        aria-label={t("common.selectOccupation")}
                      >
                        {user?.occupations?.map((occupation) => (
                          <button
                            key={occupation.id}
                            onClick={() =>
                              handleOccupationSelect(occupation.id)
                            }
                            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                              occupation.id === activeOccupationId
                                ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                                : "text-text-secondary dark:text-text-secondary-dark hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark"
                            }`}
                            role="option"
                            aria-selected={occupation.id === activeOccupationId}
                          >
                            {getOccupationLabel(occupation)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {user && (
                  <span className="text-sm text-text-muted dark:text-text-secondary-dark hidden sm:block">
                    {user.firstName}
                  </span>
                )}
                <button
                  onClick={logout}
                  className="text-sm text-text-muted hover:text-text-secondary dark:text-text-muted-dark dark:hover:text-text-secondary-dark"
                >
                  {t("auth.logout")}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Spacer to account for fixed header height plus safe area inset */}
      <div className="header-spacer" aria-hidden="true" />

      {/* Demo mode banner */}
      {dataSource === "demo" && (
        <div
          className="bg-amber-100 dark:bg-amber-900/50 border-b border-amber-200 dark:border-amber-800"
          role="alert"
          aria-live="polite"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <p className="text-sm text-amber-800 dark:text-amber-200 text-center font-medium">
              {t("common.demoModeBanner")}
            </p>
          </div>
        </div>
      )}

      {/* Calendar mode banner */}
      {isCalendarMode && (
        <div
          className="bg-sky-100 dark:bg-sky-900/50 border-b border-sky-200 dark:border-sky-800"
          role="alert"
          aria-live="polite"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <p className="text-sm text-sky-800 dark:text-sky-200 text-center font-medium">
              {t("common.calendarModeBanner")}
            </p>
          </div>
        </div>
      )}

      {/* Tour mode banner */}
      <TourModeBanner />

      {/* Main content
          pb-16 (4rem/64px) provides padding to prevent content from being hidden
          behind the fixed bottom nav. This matches the compact nav height. */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 pb-16">
        <Outlet />
      </main>

      {/* Bottom navigation (mobile-first) - fixed to always stay visible */}
      <nav className="bg-surface-card dark:bg-surface-card-dark border-t border-border-default dark:border-border-default-dark fixed bottom-0 left-0 right-0 z-50 safe-area-inset-bottom">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-around">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              const isDisabled = activeTour !== null && !isActive;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  data-testid={item.testId}
                  onClick={(e) => {
                    if (isDisabled) {
                      e.preventDefault();
                    }
                  }}
                  className={`
                    flex flex-col items-center py-2 px-4 text-[10px] font-medium
                    transition-all duration-150 rounded-lg mx-1
                    ${
                      isActive
                        ? "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30"
                        : isDisabled
                          ? "text-text-muted/50 dark:text-text-muted-dark/50 cursor-not-allowed"
                          : "text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark"
                    }
                  `}
                  aria-disabled={isDisabled}
                >
                  <Icon
                    className={`w-5 h-5 ${isActive ? "scale-110" : ""} transition-transform`}
                    aria-hidden="true"
                  />
                  <span>{t(item.labelKey)}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Debug panel - toggle via ?debug or console: window.dispatchEvent(new Event('vk-debug-toggle')) */}
      <Suspense fallback={null}>
        <DebugPanel />
      </Suspense>
    </div>
  );
}
