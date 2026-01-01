import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setCsrfToken, clearSession } from "@/api/client";
import {
  filterRefereeOccupations,
  parseOccupationsFromActiveParty,
} from "@/utils/parseOccupations";
import { logger } from "@/utils/logger";
import {
  extractLoginFormFields,
  extractCsrfTokenFromPage,
  submitLoginCredentials,
} from "@/utils/auth-parsers";
import {
  extractActivePartyFromHtml,
  hasMultipleAssociations,
  type AttributeValue,
  type RoleDefinition,
} from "@/utils/active-party-parser";
import { useDemoStore } from "./demo";
import { useSettingsStore, DEMO_HOME_LOCATION } from "./settings";

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

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  occupations: Occupation[];
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
  isDemoMode: boolean;
  activeOccupationId: string | null;
  _checkSessionPromise: Promise<boolean> | null;
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
  hasMultipleAssociations: () => boolean;
}

const API_BASE = import.meta.env.VITE_API_PROXY_URL || "";
const LOGIN_PAGE_URL = `${API_BASE}/login`;
const AUTH_URL = `${API_BASE}/sportmanager.security/authentication/authenticate`;
const LOGOUT_URL = `${API_BASE}/logout`;
const SESSION_CHECK_TIMEOUT_MS = 10_000;

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

  const user = currentUser
    ? { ...currentUser, occupations }
    : {
        id: "user",
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
      isDemoMode: false,
      activeOccupationId: null,
      _checkSessionPromise: null,
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

            set({
              status: "authenticated",
              csrfToken: existingCsrfToken,
              eligibleAttributeValues: activeParty?.eligibleAttributeValues ?? null,
              groupedEligibleAttributeValues: activeParty?.groupedEligibleAttributeValues ?? null,
              eligibleRoles: activeParty?.eligibleRoles ?? null,
              user,
              activeOccupationId,
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

            set({
              status: "authenticated",
              csrfToken: result.csrfToken,
              eligibleAttributeValues: activeParty?.eligibleAttributeValues ?? null,
              groupedEligibleAttributeValues: activeParty?.groupedEligibleAttributeValues ?? null,
              eligibleRoles: activeParty?.eligibleRoles ?? null,
              user,
              activeOccupationId,
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
        try {
          await fetch(LOGOUT_URL, {
            credentials: "include",
            redirect: "manual",
          });
        } catch (error) {
          logger.error("Logout request failed:", error);
        }

        if (get().isDemoMode) {
          useDemoStore.getState().clearDemoData();
        }

        clearSession();
        set({
          status: "idle",
          user: null,
          error: null,
          csrfToken: null,
          isDemoMode: false,
          eligibleAttributeValues: null,
          groupedEligibleAttributeValues: null,
          eligibleRoles: null,
        });
      },

      checkSession: async (signal?: AbortSignal): Promise<boolean> => {
        // Check if already aborted before starting
        if (signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }

        if (get().isDemoMode) {
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

              if (response.ok) {
                const dashboardHtml = await response.text();
                const csrfToken = extractCsrfTokenFromPage(dashboardHtml);
                const activeParty = extractActivePartyFromHtml(dashboardHtml);

                const currentState = get();
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

        // Set demo home location for distance filtering showcase
        useSettingsStore.getState().setHomeLocation(DEMO_HOME_LOCATION);

        set({
          status: "authenticated",
          isDemoMode: true,
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
      },

      setActiveOccupation: (id: string) => {
        set({ activeOccupationId: id });
      },

      hasMultipleAssociations: () => {
        // Use groupedEligibleAttributeValues which contains all user associations
        return hasMultipleAssociations(get().groupedEligibleAttributeValues);
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
        isDemoMode: state.isDemoMode,
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

        return {
          ...current,
          user: persistedState?.user ?? null,
          csrfToken: restoredCsrfToken,
          status: persistedState?._wasAuthenticated ? "authenticated" : "idle",
          isDemoMode: persistedState?.isDemoMode ?? false,
          activeOccupationId: persistedState?.activeOccupationId ?? null,
          eligibleAttributeValues: persistedState?.eligibleAttributeValues ?? null,
          groupedEligibleAttributeValues: persistedState?.groupedEligibleAttributeValues ?? null,
          _checkSessionPromise: null,
        };
      },
    },
  ),
);
