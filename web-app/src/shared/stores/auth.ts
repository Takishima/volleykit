import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setCsrfToken, clearSession } from "@/api/client";
import {
  filterRefereeOccupations,
  parseOccupationsFromActiveParty,
} from "@/features/auth/utils/parseOccupations";
import { logger } from "@/shared/utils/logger";
import {
  extractLoginFormFields,
  extractCsrfTokenFromPage,
  submitLoginCredentials,
} from "@/features/auth/utils/auth-parsers";
import {
  extractActivePartyFromHtml,
  hasMultipleAssociations,
  type AttributeValue,
  type RoleDefinition,
} from "@/features/auth/utils/active-party-parser";
import { useDemoStore } from "./demo";
import { useSettingsStore, DEMO_HOME_LOCATION } from "./settings";
import { fetchCalendarAssignments } from "@/features/assignments/api/calendar-api";

/**
 * Storage version for the auth store.
 * Increment this to invalidate all cached auth state and force re-login.
 *
 * Version history:
 * - 1: Initial version (pre-groupedEligibleAttributeValues)
 * - 2: Added groupedEligibleAttributeValues for multi-association detection
 */
const AUTH_STORE_VERSION = 2;

export type AuthStatus = "idle" | "loading" | "authenticated" | "error";

/**
 * Data source for assignments and compensations.
 * - 'api': Real SwissVolley API (full authentication)
 * - 'demo': Demo mode with simulated data
 * - 'calendar': Calendar mode with read-only iCal feed access
 */
export type DataSource = "api" | "demo" | "calendar";

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  occupations: Occupation[];
  profilePictureUrl?: string;
}

export interface Occupation {
  id: string;
  type: "referee" | "player" | "clubAdmin" | "associationAdmin";
  associationCode?: string;
  clubName?: string;
}

interface AuthState {
  status: AuthStatus;
  user: UserProfile | null;
  error: string | null;
  csrfToken: string | null;
  /** The current data source for assignments and compensations */
  dataSource: DataSource;
  /** Calendar code for calendar mode (6 characters) */
  calendarCode: string | null;
  activeOccupationId: string | null;
  /** True while switching associations - pages should show loading state */
  isAssociationSwitching: boolean;
  _checkSessionPromise: Promise<boolean> | null;
  /** Timestamp of the last successful authentication (login or session check) */
  _lastAuthTimestamp: number | null;
  // Active party data from embedded HTML (contains association memberships)
  eligibleAttributeValues: AttributeValue[] | null;
  /** All associations the user belongs to, grouped by role - use this for multi-association detection */
  groupedEligibleAttributeValues: AttributeValue[] | null;
  eligibleRoles: Record<string, RoleDefinition> | null;

  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: (signal?: AbortSignal) => Promise<boolean>;
  setUser: (user: UserProfile | null) => void;
  setDemoAuthenticated: () => void;
  setActiveOccupation: (id: string) => void;
  setAssociationSwitching: (isSwitching: boolean) => void;
  hasMultipleAssociations: () => boolean;
  /** Returns true if in calendar mode */
  isCalendarMode: () => boolean;
  /** Login with a calendar code. Validates the code format and fetches calendar data. */
  loginWithCalendar: (code: string) => Promise<void>;
  /** Logout from calendar mode (alias for logout) */
  logoutCalendar: () => Promise<void>;
  /** Get the current authentication mode */
  getAuthMode: () => "full" | "calendar" | "demo" | "none";
}

const API_BASE = import.meta.env.VITE_API_PROXY_URL || "";
const LOGIN_PAGE_URL = `${API_BASE}/login`;
const AUTH_URL = `${API_BASE}/sportmanager.security/authentication/authenticate`;
const LOGOUT_URL = `${API_BASE}/logout`;
const SESSION_CHECK_TIMEOUT_MS = 10_000;
/** Grace period after login during which session checks are skipped */
const SESSION_CHECK_GRACE_PERIOD_MS = 5_000;

/** Calendar codes are exactly 6 alphanumeric characters */
const CALENDAR_CODE_PATTERN = /^[a-zA-Z0-9]{6}$/;

/**
 * Dummy association code for calendar mode transport settings.
 * Using a dedicated code ensures calendar mode settings don't interfere
 * with real API association settings if the user logs in later.
 */
export const CALENDAR_ASSOCIATION = "CAL";

/**
 * Error key for users without a referee role.
 * This key is used by LoginPage to display a translated error message.
 * The actual translations are in i18n/locales under auth.noRefereeRole.
 */
export const NO_REFEREE_ROLE_ERROR_KEY = "auth.noRefereeRole";

/**
 * Rejects a login attempt for users without a referee role.
 * Invalidates the server session and clears local state.
 *
 * @returns false to indicate login was rejected
 */
async function rejectNonRefereeUser(
  set: (state: Partial<AuthState>) => void,
): Promise<false> {
  // Invalidate the server session
  try {
    await fetch(LOGOUT_URL, { credentials: "include", redirect: "manual" });
  } catch {
    // Ignore logout errors - we're rejecting the login anyway
  }
  clearSession();
  set({ status: "error", error: NO_REFEREE_ROLE_ERROR_KEY });
  return false;
}

/**
 * Derives user occupations and active occupation ID from active party data.
 * Used during login and session restoration to populate the association dropdown.
 *
 * Uses groupedEligibleAttributeValues as the primary source for associations.
 * Falls back to eligibleAttributeValues if groupedEligibleAttributeValues is empty,
 * which can happen on some pages or with certain user configurations.
 *
 * IMPORTANT: Preserves existing occupations if new parsing returns empty.
 * This prevents the association dropdown from disappearing when loading a page
 * that doesn't have complete activeParty data embedded in the HTML.
 */
function deriveUserWithOccupations(
  activeParty: {
    __identity?: string;
    groupedEligibleAttributeValues?: AttributeValue[] | null;
    eligibleAttributeValues?: AttributeValue[] | null;
  } | null,
  currentUser: UserProfile | null,
  currentActiveOccupationId: string | null,
): { user: UserProfile; activeOccupationId: string | null } {
  // Use groupedEligibleAttributeValues first, fall back to eligibleAttributeValues
  const attributeValues =
    activeParty?.groupedEligibleAttributeValues?.length
      ? activeParty.groupedEligibleAttributeValues
      : activeParty?.eligibleAttributeValues ?? null;

  const parsedOccupations = parseOccupationsFromActiveParty(attributeValues);

  // Preserve existing occupations if parsing returns empty
  // This prevents the dropdown from disappearing when navigating to pages
  // that don't have complete activeParty data
  const occupations =
    parsedOccupations.length > 0
      ? parsedOccupations
      : (currentUser?.occupations ?? []);

  const activeOccupationId = currentActiveOccupationId ?? occupations[0]?.id ?? null;

  // Use the person's __identity from activeParty as the user id
  // This matches the submittedByPerson.__identity format used in exchanges
  const userId = activeParty?.__identity ?? currentUser?.id ?? "user";

  const user = currentUser
    ? { ...currentUser, id: userId, occupations }
    : {
        id: userId,
        firstName: "",
        lastName: "",
        occupations,
      };

  return { user, activeOccupationId };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      status: "idle",
      user: null,
      error: null,
      csrfToken: null,
      dataSource: "api",
      calendarCode: null,
      activeOccupationId: null,
      isAssociationSwitching: false,
      _checkSessionPromise: null,
      _lastAuthTimestamp: null,
      eligibleAttributeValues: null,
      groupedEligibleAttributeValues: null,
      eligibleRoles: null,

      login: async (username: string, password: string): Promise<boolean> => {
        set({ status: "loading", error: null });

        try {
          const loginPageResponse = await fetch(LOGIN_PAGE_URL, {
            credentials: "include",
          });

          if (!loginPageResponse.ok) {
            throw new Error("Failed to load login page");
          }

          const html = await loginPageResponse.text();
          const existingCsrfToken = extractCsrfTokenFromPage(html);

          if (existingCsrfToken) {
            // Already logged in - the login page redirect doesn't contain activeParty data
            // We need to fetch the dashboard explicitly to get the user's associations
            const dashboardResponse = await fetch(
              `${API_BASE}/sportmanager.volleyball/main/dashboard`,
              { credentials: "include" },
            );

            let activeParty = null;
            if (dashboardResponse.ok) {
              const dashboardHtml = await dashboardResponse.text();
              activeParty = extractActivePartyFromHtml(dashboardHtml);
            }

            setCsrfToken(existingCsrfToken);

            const currentState = get();
            const { user, activeOccupationId } = deriveUserWithOccupations(
              activeParty,
              currentState.user,
              currentState.activeOccupationId,
            );

            // Reject users without referee role - this app is for referees only
            if (user.occupations.length === 0) {
              return rejectNonRefereeUser(set);
            }

            set({
              status: "authenticated",
              csrfToken: existingCsrfToken,
              eligibleAttributeValues: activeParty?.eligibleAttributeValues ?? null,
              groupedEligibleAttributeValues: activeParty?.groupedEligibleAttributeValues ?? null,
              eligibleRoles: activeParty?.eligibleRoles ?? null,
              user,
              activeOccupationId,
              _lastAuthTimestamp: Date.now(),
            });
            return true;
          }

          const formFields = extractLoginFormFields(html);
          if (!formFields) {
            throw new Error("Could not extract form fields from login page");
          }

          const result = await submitLoginCredentials(AUTH_URL, username, password, formFields);

          if (result.success) {
            // Parse activeParty from dashboard HTML after successful login
            const activeParty = extractActivePartyFromHtml(result.dashboardHtml);
            setCsrfToken(result.csrfToken);

            const currentState = get();
            const { user, activeOccupationId } = deriveUserWithOccupations(
              activeParty,
              currentState.user,
              currentState.activeOccupationId,
            );

            // Reject users without referee role - this app is for referees only
            if (user.occupations.length === 0) {
              return rejectNonRefereeUser(set);
            }

            set({
              status: "authenticated",
              csrfToken: result.csrfToken,
              eligibleAttributeValues: activeParty?.eligibleAttributeValues ?? null,
              groupedEligibleAttributeValues: activeParty?.groupedEligibleAttributeValues ?? null,
              eligibleRoles: activeParty?.eligibleRoles ?? null,
              user,
              activeOccupationId,
              _lastAuthTimestamp: Date.now(),
            });
            return true;
          }

          set({ status: "error", error: result.error });
          return false;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Login failed";
          set({ status: "error", error: message });
          return false;
        }
      },

      logout: async () => {
        const currentDataSource = get().dataSource;

        // Only call server logout for API mode
        if (currentDataSource === "api") {
          try {
            await fetch(LOGOUT_URL, {
              credentials: "include",
              redirect: "manual",
            });
          } catch (error) {
            logger.error("Logout request failed:", error);
          }
        }

        if (currentDataSource === "demo") {
          useDemoStore.getState().clearDemoData();
        }

        clearSession();
        set({
          status: "idle",
          user: null,
          error: null,
          csrfToken: null,
          dataSource: "api",
          calendarCode: null,
          eligibleAttributeValues: null,
          groupedEligibleAttributeValues: null,
          eligibleRoles: null,
          _lastAuthTimestamp: null,
        });
      },

      checkSession: async (signal?: AbortSignal): Promise<boolean> => {
        // Check if already aborted before starting
        if (signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }

        const currentDataSource = get().dataSource;
        // Demo and calendar modes don't need session verification
        if (currentDataSource === "demo" || currentDataSource === "calendar") {
          return true;
        }

        // Skip session check if authentication happened very recently.
        // This prevents redundant network requests right after login.
        const lastAuth = get()._lastAuthTimestamp;
        if (lastAuth && Date.now() - lastAuth < SESSION_CHECK_GRACE_PERIOD_MS) {
          logger.info("Session check: skipping, authenticated recently");
          return true;
        }

        const existingPromise = get()._checkSessionPromise;
        if (existingPromise) {
          // If caller provided a signal, wrap the promise to handle abortion
          if (signal) {
            return new Promise<boolean>((resolve, reject) => {
              const onAbort = () =>
                reject(new DOMException("Aborted", "AbortError"));
              signal.addEventListener("abort", onAbort, { once: true });

              existingPromise
                .then(resolve)
                .catch(reject)
                .finally(() => signal.removeEventListener("abort", onAbort));
            });
          }
          return existingPromise;
        }

        let resolvePromise!: (value: boolean) => void;
        const promise = new Promise<boolean>((resolve) => {
          resolvePromise = resolve;
        });

        set({ _checkSessionPromise: promise });

        (async () => {
          try {
            const timeoutController = new AbortController();
            const timeoutId = setTimeout(
              () => timeoutController.abort(),
              SESSION_CHECK_TIMEOUT_MS,
            );

            // Combine timeout signal with external signal if provided
            const fetchSignal = signal
              ? AbortSignal.any([timeoutController.signal, signal])
              : timeoutController.signal;

            try {
              const response = await fetch(
                `${API_BASE}/sportmanager.volleyball/main/dashboard`,
                { credentials: "include", signal: fetchSignal },
              );

              clearTimeout(timeoutId);

              // Detect stale session: if the server redirected us to the login page,
              // the session is invalid. This commonly happens when session cookies
              // expire but the app still has persisted auth state.
              if (response.url) {
                const pathname = new URL(response.url).pathname.toLowerCase();
                const isLoginPage = pathname === "/login" || pathname.endsWith("/login");
                if (isLoginPage) {
                  logger.info("Session check: redirected to login page, session is stale");
                  clearSession();
                  set({ status: "idle", user: null, csrfToken: null, _lastAuthTimestamp: null });
                  resolvePromise(false);
                  return;
                }
              }

              if (response.ok) {
                const dashboardHtml = await response.text();
                const csrfToken = extractCsrfTokenFromPage(dashboardHtml);

                // If we can't find a CSRF token and don't have one stored,
                // the session is invalid (dashboard pages always have CSRF tokens).
                // This catches cases where the server might return an error page
                // or the session is in an inconsistent state.
                const currentState = get();
                if (!csrfToken && !currentState.csrfToken) {
                  logger.info("Session check: no CSRF token found, session is invalid");
                  clearSession();
                  set({ status: "idle", user: null, csrfToken: null, _lastAuthTimestamp: null });
                  resolvePromise(false);
                  return;
                }

                const activeParty = extractActivePartyFromHtml(dashboardHtml);

                const { user, activeOccupationId } = deriveUserWithOccupations(
                  activeParty,
                  currentState.user,
                  currentState.activeOccupationId,
                );

                if (csrfToken) {
                  setCsrfToken(csrfToken);
                }

                set({
                  status: "authenticated",
                  csrfToken: csrfToken ?? currentState.csrfToken,
                  // Preserve existing attribute values if new values are missing
                  // This prevents the association dropdown from disappearing when
                  // checkSession fetches a page without activeParty data
                  eligibleAttributeValues:
                    activeParty?.eligibleAttributeValues ??
                    currentState.eligibleAttributeValues,
                  groupedEligibleAttributeValues:
                    activeParty?.groupedEligibleAttributeValues ??
                    currentState.groupedEligibleAttributeValues,
                  eligibleRoles:
                    activeParty?.eligibleRoles ?? currentState.eligibleRoles,
                  user,
                  activeOccupationId,
                  _lastAuthTimestamp: Date.now(),
                });
                resolvePromise(true);
                return;
              }

              set({ status: "idle", user: null });
              resolvePromise(false);
            } catch (error) {
              clearTimeout(timeoutId);

              if (error instanceof Error && error.name === "AbortError") {
                // Check if this was an external abort (not timeout)
                if (signal?.aborted) {
                  // External abort - don't log, don't update state
                  // Let the caller handle it via the wrapped promise
                  resolvePromise(false);
                  return;
                }
                // Timeout abort
                logger.error("Session check timed out");
                set({ status: "idle", user: null });
                resolvePromise(false);
                return;
              }

              throw error;
            }
          } catch (error) {
            logger.error("Session check failed:", error);
            set({ status: "idle", user: null });
            resolvePromise(false);
          } finally {
            set({ _checkSessionPromise: null });
          }
        })();

        // If caller provided a signal, wrap the promise to handle abortion
        if (signal) {
          return new Promise<boolean>((resolve, reject) => {
            const onAbort = () =>
              reject(new DOMException("Aborted", "AbortError"));
            signal.addEventListener("abort", onAbort, { once: true });

            promise
              .then(resolve)
              .catch(reject)
              .finally(() => signal.removeEventListener("abort", onAbort));
          });
        }

        return promise;
      },

      setUser: (user: UserProfile | null) => {
        set({ user });
      },

      setDemoAuthenticated: () => {
        const rawDemoOccupations: Occupation[] = [
          { id: "demo-referee-sv", type: "referee", associationCode: "SV" },
          { id: "demo-referee-svrba", type: "referee", associationCode: "SVRBA" },
          { id: "demo-referee-svrz", type: "referee", associationCode: "SVRZ" },
          { id: "demo-player", type: "player", clubName: "VBC Demo" },
        ];

        const demoOccupations = filterRefereeOccupations(rawDemoOccupations);

        // Set auth state to demo mode first
        set({
          status: "authenticated",
          dataSource: "demo",
          user: {
            id: "demo-user",
            firstName: "Demo",
            lastName: "User",
            email: "demo@example.com",
            occupations: demoOccupations,
          },
          activeOccupationId: demoOccupations[0]!.id,
          error: null,
        });

        // Set demo home location for distance filtering showcase
        // Must be called after dataSource is set to "demo" so the settings
        // store's mode is synced and the location is stored in demo settings.
        // Note: We explicitly call _setCurrentMode here for immediate sync because
        // the App.tsx subscription fires asynchronously after state updates.
        // The idempotent nature of _setCurrentMode makes this double-call safe.
        const settingsStore = useSettingsStore.getState();
        settingsStore._setCurrentMode("demo");
        settingsStore.setHomeLocation(DEMO_HOME_LOCATION);
      },

      setActiveOccupation: (id: string) => {
        set({ activeOccupationId: id });
      },

      setAssociationSwitching: (isSwitching: boolean) => {
        set({ isAssociationSwitching: isSwitching });
      },

      hasMultipleAssociations: () => {
        // Use groupedEligibleAttributeValues which contains all user associations
        return hasMultipleAssociations(get().groupedEligibleAttributeValues);
      },

      isCalendarMode: () => {
        return get().dataSource === "calendar";
      },

      loginWithCalendar: async (code: string): Promise<void> => {
        const trimmedCode = code.trim();

        // Validate calendar code format (6 alphanumeric characters)
        // Note: The calendar code should already be validated by LoginPage before
        // calling this function. This is just a safeguard for direct API calls.
        if (!CALENDAR_CODE_PATTERN.test(trimmedCode)) {
          set({ status: "error", error: "auth.invalidCalendarCode" });
          return;
        }

        set({ status: "loading", error: null });

        try {
          // Fetch calendar data to extract associations for transport settings
          // This unifies calendar mode with regular API mode - both have occupations
          const assignments = await fetchCalendarAssignments(trimmedCode);

          // Extract unique associations from calendar assignments
          const uniqueAssociations = new Set<string>();
          for (const assignment of assignments) {
            if (assignment.association) {
              uniqueAssociations.add(assignment.association);
            }
          }

          // Create synthetic occupations from associations found in calendar
          // This allows transport settings to work per-association like regular mode
          const occupations: Occupation[] = Array.from(uniqueAssociations)
            .sort()
            .map((assoc) => ({
              id: `calendar-${assoc}`,
              type: "referee" as const,
              associationCode: assoc,
            }));

          // Set authenticated state with occupations derived from calendar data
          set({
            status: "authenticated",
            dataSource: "calendar",
            calendarCode: trimmedCode,
            user: {
              id: `calendar-${trimmedCode}`,
              firstName: "Calendar",
              lastName: "User",
              occupations,
            },
            // Set first occupation as active if any found
            activeOccupationId: occupations[0]?.id ?? null,
            error: null,
          });
        } catch (error) {
          // If fetching fails, fall back to no occupations
          // This allows login to succeed even if calendar is empty or fails
          logger.warn("Failed to fetch calendar for associations:", error);

          set({
            status: "authenticated",
            dataSource: "calendar",
            calendarCode: trimmedCode,
            user: {
              id: `calendar-${trimmedCode}`,
              firstName: "Calendar",
              lastName: "User",
              occupations: [],
            },
            activeOccupationId: null,
            error: null,
          });
        }
      },

      logoutCalendar: async () => {
        // Separate method for API clarity and future extensibility
        // (e.g., calendar-specific cleanup or analytics)
        await get().logout();
      },

      getAuthMode: () => {
        const state = get();
        if (state.status !== "authenticated") {
          return "none";
        }
        switch (state.dataSource) {
          case "demo":
            return "demo";
          case "calendar":
            return "calendar";
          case "api":
            return "full";
        }
      },
    }),
    {
      name: "volleykit-auth",
      version: AUTH_STORE_VERSION,
      partialize: (state) => ({
        // Persist minimal user data for UX (immediate name display).
        // Session cookies are HttpOnly and managed by browser.
        // CSRF token is persisted to enable POST requests after page reload.
        // groupedEligibleAttributeValues persisted for hasMultipleAssociations() on refresh.
        user: state.user,
        csrfToken: state.csrfToken,
        _wasAuthenticated: state.status === "authenticated",
        dataSource: state.dataSource,
        calendarCode: state.calendarCode,
        activeOccupationId: state.activeOccupationId,
        eligibleAttributeValues: state.eligibleAttributeValues,
        groupedEligibleAttributeValues: state.groupedEligibleAttributeValues,
      }),
      // Clean break: invalidate old cached state when version changes
      // Users will need to re-login to get fresh association data
      migrate: (persistedState, version) => {
        if (version < AUTH_STORE_VERSION) {
          // Return undefined to use defaults (forces re-login)
          return undefined;
        }
        return persistedState;
      },
      merge: (persisted, current) => {
        const persistedState = persisted as
          | {
              user?: UserProfile | null;
              csrfToken?: string | null;
              _wasAuthenticated?: boolean;
              dataSource?: DataSource;
              calendarCode?: string | null;
              isDemoMode?: boolean;
              activeOccupationId?: string | null;
              eligibleAttributeValues?: AttributeValue[] | null;
              groupedEligibleAttributeValues?: AttributeValue[] | null;
            }
          | undefined;

        const restoredCsrfToken = persistedState?.csrfToken ?? null;
        if (restoredCsrfToken) {
          setCsrfToken(restoredCsrfToken);
        }

        // Derive dataSource from isDemoMode for backwards compatibility with old persisted state
        const dataSource: DataSource =
          persistedState?.dataSource ??
          (persistedState?.isDemoMode ? "demo" : "api");

        return {
          ...current,
          user: persistedState?.user ?? null,
          csrfToken: restoredCsrfToken,
          status: persistedState?._wasAuthenticated ? "authenticated" : "idle",
          dataSource,
          calendarCode: persistedState?.calendarCode ?? null,
          activeOccupationId: persistedState?.activeOccupationId ?? null,
          eligibleAttributeValues: persistedState?.eligibleAttributeValues ?? null,
          groupedEligibleAttributeValues: persistedState?.groupedEligibleAttributeValues ?? null,
          _checkSessionPromise: null,
        };
      },
    },
  ),
);
