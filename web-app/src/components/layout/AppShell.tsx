import { useState, useRef, useEffect, useCallback } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useAuthStore, type Occupation } from "@/stores/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { getOccupationLabelKey } from "@/utils/occupation-labels";

const navItems = [
  { path: "/", labelKey: "nav.assignments" as const, icon: "📋" },
  {
    path: "/compensations",
    labelKey: "nav.compensations" as const,
    icon: "💰",
  },
  { path: "/exchange", labelKey: "nav.exchange" as const, icon: "🔄" },
  { path: "/settings", labelKey: "nav.settings" as const, icon: "⚙️" },
];

export function AppShell() {
  const location = useLocation();
  const { t } = useTranslation();
  const {
    status,
    user,
    logout,
    activeOccupationId,
    setActiveOccupation,
    isDemoMode,
  } = useAuthStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  const handleOccupationSelect = (id: string) => {
    setActiveOccupation(id);
    setIsDropdownOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏐</span>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                VolleyKit
              </h1>
            </div>

            {isAuthenticated && (
              <div className="flex items-center gap-3">
                {/* Occupation dropdown */}
                {user?.occupations && user.occupations.length > 0 && (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center gap-1 px-2 py-1 text-sm font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors"
                      aria-expanded={isDropdownOpen}
                      aria-haspopup="listbox"
                    >
                      <span className="max-w-[100px] truncate">
                        {activeOccupation
                          ? getOccupationLabel(activeOccupation)
                          : "Select role"}
                      </span>
                      <svg
                        className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>

                    {isDropdownOpen && (
                      <div
                        className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
                        role="listbox"
                        aria-label="Select occupation"
                      >
                        {user?.occupations?.map((occupation) => (
                          <button
                            key={occupation.id}
                            onClick={() =>
                              handleOccupationSelect(occupation.id)
                            }
                            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                              occupation.id === activeOccupationId
                                ? "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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
                  <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">
                    {user.firstName}
                  </span>
                )}
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {t("auth.logout")}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Demo mode banner */}
      {isDemoMode && (
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

      {/* Main content
          pb-16 (4rem/64px) provides padding to prevent content from being hidden
          behind the fixed bottom nav. This matches the compact nav height. */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 pb-16">
        <Outlet />
      </main>

      {/* Bottom navigation (mobile-first) - fixed to always stay visible */}
      <nav className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 fixed bottom-0 left-0 right-0 z-50 safe-area-inset-bottom">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-around">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`
                    flex flex-col items-center py-2 px-4 text-[10px] font-medium
                    transition-all duration-150 rounded-lg mx-1
                    ${
                      isActive
                        ? "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }
                  `}
                >
                  <span
                    className={`text-lg leading-tight ${isActive ? "scale-110" : ""} transition-transform`}
                  >
                    {item.icon}
                  </span>
                  <span>{t(item.labelKey)}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
