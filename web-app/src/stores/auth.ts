import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setCsrfToken, clearSession } from "@/api/client";
import { filterRefereeOccupations } from "@/utils/parseOccupations";
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
            // Already logged in - parse activeParty from current page
            const activeParty = extractActivePartyFromHtml(html);
            setCsrfToken(existingCsrfToken);
            set({
              status: "authenticated",
              csrfToken: existingCsrfToken,
              eligibleAttributeValues: activeParty?.eligibleAttributeValues ?? null,
              eligibleRoles: activeParty?.eligibleRoles ?? null,
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
            set({
              status: "authenticated",
              csrfToken: result.csrfToken,
              eligibleAttributeValues: activeParty?.eligibleAttributeValues ?? null,
              eligibleRoles: activeParty?.eligibleRoles ?? null,
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

                if (csrfToken) {
                  setCsrfToken(csrfToken);
                  set({
                    status: "authenticated",
                    csrfToken,
                    eligibleAttributeValues: activeParty?.eligibleAttributeValues ?? null,
                    eligibleRoles: activeParty?.eligibleRoles ?? null,
                  });
                } else {
                  set({
                    status: "authenticated",
                    eligibleAttributeValues: activeParty?.eligibleAttributeValues ?? null,
                    eligibleRoles: activeParty?.eligibleRoles ?? null,
                  });
                }
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
        return hasMultipleAssociations(get().eligibleAttributeValues);
      },
    }),
    {
      name: "volleykit-auth",
      partialize: (state) => ({
        // Persist minimal user data for UX (immediate name display).
        // Session cookies are HttpOnly and managed by browser.
        // CSRF token is persisted to enable POST requests after page reload.
        // eligibleAttributeValues persisted for hasMultipleAssociations() on refresh.
        user: state.user,
        csrfToken: state.csrfToken,
        _wasAuthenticated: state.status === "authenticated",
        isDemoMode: state.isDemoMode,
        activeOccupationId: state.activeOccupationId,
        eligibleAttributeValues: state.eligibleAttributeValues,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as
          | {
              user?: UserProfile | null;
              csrfToken?: string | null;
              _wasAuthenticated?: boolean;
              isDemoMode?: boolean;
              activeOccupationId?: string | null;
              eligibleAttributeValues?: AttributeValue[] | null;
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
          _checkSessionPromise: null,
        };
      },
    },
  ),
);
