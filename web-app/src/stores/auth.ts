import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setCsrfToken, clearSession } from "@/api/client";

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
  // Internal: pending session check promise (for deduplication)
  _checkSessionPromise: Promise<boolean> | null;

  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  setUser: (user: UserProfile | null) => void;
  setDemoAuthenticated: () => void;
  setActiveOccupation: (id: string) => void;
}

// API base URL (proxy in production, direct in dev via Vite proxy)
const API_BASE = import.meta.env.VITE_API_PROXY_URL || "";

// Authentication endpoints (based on captured HAR files)
const LOGIN_PAGE_URL = `${API_BASE}/login`;
const AUTH_URL = `${API_BASE}/sportmanager.security/authentication/authenticate`;
const LOGOUT_URL = `${API_BASE}/logout`;

// Session check timeout (10 seconds)
// This prevents users from being stuck in a loading state if the API is slow
// or unresponsive. After 10 seconds, the check will abort and return false,
// allowing the user to retry or see an error state instead of infinite loading.
const SESSION_CHECK_TIMEOUT_MS = 10_000;

/**
 * Login form fields extracted from the login page HTML.
 * The Neos Flow framework requires these fields for CSRF protection.
 */
interface LoginFormFields {
  trustedProperties: string;
  referrerPackage: string;
  referrerSubpackage: string;
  referrerController: string;
  referrerAction: string;
  referrerArguments: string;
}

/**
 * Extract required form fields from login page HTML using DOMParser.
 * The Neos Flow framework uses __trustedProperties for CSRF protection
 * and __referrer fields for redirect handling.
 */
function extractLoginFormFields(html: string): LoginFormFields | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Check for parsing errors
    const parserError = doc.querySelector("parsererror");
    if (parserError) {
      console.error("DOMParser error:", parserError.textContent);
      return null;
    }

    // Extract all required hidden fields
    const trustedProperties = doc
      .querySelector('input[name="__trustedProperties"]')
      ?.getAttribute("value");
    const referrerPackage = doc
      .querySelector('input[name="__referrer[@package]"]')
      ?.getAttribute("value");
    const referrerSubpackage = doc
      .querySelector('input[name="__referrer[@subpackage]"]')
      ?.getAttribute("value");
    const referrerController = doc
      .querySelector('input[name="__referrer[@controller]"]')
      ?.getAttribute("value");
    const referrerAction = doc
      .querySelector('input[name="__referrer[@action]"]')
      ?.getAttribute("value");
    const referrerArguments = doc
      .querySelector('input[name="__referrer[arguments]"]')
      ?.getAttribute("value");

    // trustedProperties is required for CSRF protection
    if (!trustedProperties) {
      console.error("Missing __trustedProperties field in login form");
      return null;
    }

    // NOTE: We use fallback values for referrer fields based on observed values
    // from the actual login form. These are not arbitrary - they match the standard
    // Neos Flow authentication setup. If the backend ever changes these values
    // or validates them strictly, login will fail and we'll get an error,
    // which is preferable to silently using incorrect values that might work
    // but cause subtle issues later.
    return {
      trustedProperties,
      referrerPackage: referrerPackage ?? "SportManager.Volleyball",
      referrerSubpackage: referrerSubpackage ?? "",
      referrerController: referrerController ?? "Public",
      referrerAction: referrerAction ?? "login",
      referrerArguments: referrerArguments ?? "",
    };
  } catch (error) {
    console.error("Failed to parse login page HTML:", error);
    return null;
  }
}

/**
 * Extract CSRF token from authenticated page HTML.
 * After login, the dashboard HTML contains data-csrf-token attribute
 * which is used as __csrfToken for subsequent API calls.
 *
 * Note: data-csrf-token is different from data-session-key.
 * - data-session-key: matches the Neos_Flow_Session cookie value
 * - data-csrf-token: the actual CSRF protection token for POST requests
 */
function extractCsrfTokenFromPage(html: string): string | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // The CSRF token is in the <html> tag's data-csrf-token attribute
    const htmlElement = doc.documentElement;
    const csrfToken = htmlElement?.getAttribute("data-csrf-token");

    if (csrfToken) {
      return csrfToken;
    }

    console.warn("Could not find data-csrf-token in page");
    return null;
  } catch (error) {
    console.error("Failed to extract CSRF token from page:", error);
    return null;
  }
}

/**
 * Result of submitting login credentials.
 */
type LoginResult =
  | { success: true; csrfToken: string }
  | { success: false; error: string };

/**
 * Submit login credentials to the authentication endpoint.
 * This is the core login logic used after we have valid form fields.
 */
async function submitLoginCredentials(
  username: string,
  password: string,
  formFields: LoginFormFields,
): Promise<LoginResult> {
  // Build form data with Neos Flow authentication token format
  const formData = new URLSearchParams();

  // Add referrer fields (required by Neos Flow)
  formData.append("__referrer[@package]", formFields.referrerPackage);
  formData.append("__referrer[@subpackage]", formFields.referrerSubpackage);
  formData.append("__referrer[@controller]", formFields.referrerController);
  formData.append("__referrer[@action]", formFields.referrerAction);
  formData.append("__referrer[arguments]", formFields.referrerArguments);

  // Add CSRF protection token
  formData.append("__trustedProperties", formFields.trustedProperties);

  // Add credentials with Neos Flow authentication token format
  formData.append(
    "__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][username]",
    username,
  );
  formData.append(
    "__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][password]",
    password,
  );

  // Submit to authentication endpoint
  // - Success: 303 redirect to dashboard
  // - Failure: 200 OK with login page HTML containing error
  const loginResponse = await fetch(AUTH_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
    redirect: "manual",
  });

  // Success: 303/302 redirect or opaqueredirect
  const isRedirect =
    loginResponse.status === 303 ||
    loginResponse.status === 302 ||
    loginResponse.type === "opaqueredirect";

  if (!isRedirect) {
    return { success: false, error: "Invalid username or password" };
  }

  // Login successful - fetch dashboard to get CSRF token
  const dashboardResponse = await fetch(
    `${API_BASE}/sportmanager.volleyball/main/dashboard`,
    { credentials: "include" },
  );

  if (dashboardResponse.ok) {
    const dashboardHtml = await dashboardResponse.text();
    const csrfToken = extractCsrfTokenFromPage(dashboardHtml);

    if (csrfToken) {
      return { success: true, csrfToken };
    }
  }

  return { success: false, error: "Session verification failed" };
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

      login: async (username: string, password: string): Promise<boolean> => {
        set({ status: "loading", error: null });

        try {
          // Step 1: Fetch login page to get CSRF token and form fields
          // Note: If user has an existing session cookie, backend may redirect /login to /
          // We use redirect: "manual" to detect this case
          const loginPageResponse = await fetch(LOGIN_PAGE_URL, {
            credentials: "include",
            redirect: "manual",
          });

          // If backend redirects (303/302), user already has a valid session
          // This happens when session cookies are present and valid
          const isAlreadyAuthenticated =
            loginPageResponse.status === 303 ||
            loginPageResponse.status === 302 ||
            loginPageResponse.type === "opaqueredirect";

          if (isAlreadyAuthenticated) {
            // User is already logged in - verify session and extract CSRF token
            const dashboardResponse = await fetch(
              `${API_BASE}/sportmanager.volleyball/main/dashboard`,
              { credentials: "include" },
            );

            if (dashboardResponse.ok) {
              const dashboardHtml = await dashboardResponse.text();
              const csrfToken = extractCsrfTokenFromPage(dashboardHtml);

              if (csrfToken) {
                setCsrfToken(csrfToken);
                set({ status: "authenticated", csrfToken });
                return true;
              }
            }

            // Only retry login for authentication failures (401/403)
            // Other errors (500, network issues) should fail immediately
            const isAuthFailure =
              dashboardResponse.status === 401 ||
              dashboardResponse.status === 403;

            if (!isAuthFailure) {
              throw new Error(
                `Session verification failed: ${dashboardResponse.status}`,
              );
            }

            // Existing session is invalid (expired server-side) - logout and retry
            await fetch(LOGOUT_URL, {
              credentials: "include",
              redirect: "manual",
            });

            // Retry getting the login page after clearing stale session
            const retryResponse = await fetch(LOGIN_PAGE_URL, {
              credentials: "include",
            });

            if (!retryResponse.ok) {
              throw new Error(
                "Failed to load login page after clearing stale session",
              );
            }

            const retryHtml = await retryResponse.text();
            const retryFormFields = extractLoginFormFields(retryHtml);

            if (!retryFormFields) {
              throw new Error("Could not extract form fields from login page");
            }

            // Continue with login using retry form fields
            const retryResult = await submitLoginCredentials(
              username,
              password,
              retryFormFields,
            );

            if (retryResult.success) {
              setCsrfToken(retryResult.csrfToken);
              set({
                status: "authenticated",
                csrfToken: retryResult.csrfToken,
              });
              return true;
            }

            set({ status: "error", error: retryResult.error });
            return false;
          }

          if (!loginPageResponse.ok) {
            throw new Error("Failed to load login page");
          }

          const html = await loginPageResponse.text();
          const formFields = extractLoginFormFields(html);

          if (!formFields) {
            throw new Error("Could not extract form fields from login page");
          }

          // Step 2: Submit login credentials
          const result = await submitLoginCredentials(
            username,
            password,
            formFields,
          );

          if (result.success) {
            setCsrfToken(result.csrfToken);
            set({ status: "authenticated", csrfToken: result.csrfToken });
            return true;
          }

          set({ status: "error", error: result.error });
          return false;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Login failed";
          set({ status: "error", error: message });
          return false;
        }
      },

      logout: async () => {
        // Import here to avoid circular dependency at module load time
        const { useDemoStore } = await import("./demo");

        try {
          // Call server logout endpoint to invalidate session
          // The server responds with 303 redirect to /login
          await fetch(LOGOUT_URL, {
            credentials: "include",
            redirect: "manual", // Don't follow redirect
          });
        } catch (error) {
          // Log but don't block logout - we still want to clear local state
          console.error("Logout request failed:", error);
        }

        // Clear demo data if exiting demo mode
        if (get().isDemoMode) {
          useDemoStore.getState().clearDemoData();
        }

        // Clear local state regardless of server response
        clearSession();
        set({
          status: "idle",
          user: null,
          error: null,
          csrfToken: null,
          isDemoMode: false,
        });
      },

      checkSession: async (): Promise<boolean> => {
        // In demo mode, session is always valid
        if (get().isDemoMode) {
          return true;
        }

        // Return existing promise if a check is already in progress (stored in store state)
        const existingPromise = get()._checkSessionPromise;
        if (existingPromise) {
          return existingPromise;
        }

        // Create deferred promise to prevent race condition
        // RACE CONDITION SAFETY: JavaScript's single-threaded event loop ensures
        // this is safe. The sequence is:
        // 1. Create promise (synchronous)
        // 2. Call set() to store it (synchronous)
        // 3. Execute async IIFE below
        // Between steps 1-2, no other code can run because JS is single-threaded.
        // Any concurrent call to checkSession() will see the stored promise in step 2
        // and return it instead of creating a new one. The async work in step 3
        // happens after the promise is already stored.
        // Note: Using definite assignment assertion (!) because Promise executor runs synchronously
        let resolvePromise!: (value: boolean) => void;
        const promise = new Promise<boolean>((resolve) => {
          resolvePromise = resolve;
        });

        // Set the promise BEFORE starting async work to prevent race condition
        set({ _checkSessionPromise: promise });

        // Execute the session check
        (async () => {
          try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(
              () => controller.abort(),
              SESSION_CHECK_TIMEOUT_MS,
            );

            try {
              // Try to fetch protected resource to validate session
              // Using dashboard endpoint (same as post-login verification)
              // This is lightweight and reliable for session validation
              const response = await fetch(
                `${API_BASE}/sportmanager.volleyball/main/dashboard`,
                {
                  credentials: "include",
                  signal: controller.signal,
                },
              );

              clearTimeout(timeoutId);

              if (response.ok) {
                // Extract CSRF token from dashboard page to ensure it's current
                // This handles the case where user reloads the page with an existing session
                const dashboardHtml = await response.text();
                const csrfToken = extractCsrfTokenFromPage(dashboardHtml);

                if (csrfToken) {
                  setCsrfToken(csrfToken);
                  set({ status: "authenticated", csrfToken });
                } else {
                  set({ status: "authenticated" });
                }
                resolvePromise(true);
                return;
              }

              set({ status: "idle", user: null });
              resolvePromise(false);
            } catch (error) {
              clearTimeout(timeoutId);

              // Check if this was a timeout abort
              if (error instanceof Error && error.name === "AbortError") {
                console.error("Session check timed out");
                set({ status: "idle", user: null });
                resolvePromise(false);
                return;
              }

              throw error;
            }
          } catch (error) {
            console.error("Session check failed:", error);
            set({ status: "idle", user: null });
            resolvePromise(false);
          } finally {
            set({ _checkSessionPromise: null });
          }
        })();

        return promise;
      },

      setUser: (user: UserProfile | null) => {
        set({ user });
      },

      setDemoAuthenticated: () => {
        const demoOccupations: Occupation[] = [
          { id: "demo-referee", type: "referee" },
          { id: "demo-player", type: "player", clubName: "VBC Demo" },
        ];
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
    }),
    {
      name: "volleykit-auth",
      partialize: (state) => ({
        // =======================================================================
        // SECURITY ANALYSIS: localStorage Persistence
        // =======================================================================
        //
        // WHAT WE PERSIST:
        // - user: Name/ID only (firstName, lastName, id, occupations)
        // - csrfToken: Required for POST requests (see CSRF TOKEN PERSISTENCE below)
        // - _wasAuthenticated: Flag to restore UI state
        //
        // WHAT WE NEVER PERSIST (XSS-sensitive):
        // - session cookies: HttpOnly, managed by browser
        // - error/status: Transient UI state
        //
        // RISK ASSESSMENT:
        // If XSS occurs, an attacker could read persisted user profile data.
        // However, this data is:
        // - Already visible in the UI (name, role)
        // - Not sufficient for account takeover (no tokens/credentials)
        // - Not PII beyond what's shown publicly during games
        //
        // CSRF TOKEN PERSISTENCE:
        // CSRF tokens are persisted to fix the issue where session cookies persist
        // across page reloads but CSRF tokens were lost, causing 403 errors on POST
        // requests. CSRF tokens are less sensitive than session cookies because:
        // - They're meant to be included in client-side requests
        // - They're useless without the corresponding session cookie
        // - The HttpOnly session cookie provides the actual authentication
        // - CSRF tokens are already exposed in page HTML (data-session-key)
        //
        // TRADEOFF:
        // We accept this limited risk in exchange for better UX:
        // - Users see their name immediately on page load
        // - Avoids flash of "loading" state on every refresh
        // - POST requests work after page reload without re-login
        // - Session validity is still verified server-side via checkSession()
        //
        // MITIGATIONS:
        // - CSP headers on worker responses
        // - Session verification on protected routes
        // - HttpOnly cookies for actual session management
        //
        // ALTERNATIVE (more secure, worse UX):
        // Set partialize to return {} to persist nothing.
        // =======================================================================
        user: state.user,
        csrfToken: state.csrfToken,
        _wasAuthenticated: state.status === "authenticated",
        isDemoMode: state.isDemoMode,
        activeOccupationId: state.activeOccupationId,
      }),
      // Merge persisted state, converting _wasAuthenticated back to status
      merge: (persisted, current) => {
        const persistedState = persisted as
          | {
              user?: UserProfile | null;
              csrfToken?: string | null;
              _wasAuthenticated?: boolean;
              isDemoMode?: boolean;
              activeOccupationId?: string | null;
            }
          | undefined;

        // Restore CSRF token to API client if available
        const restoredCsrfToken = persistedState?.csrfToken ?? null;
        if (restoredCsrfToken) {
          setCsrfToken(restoredCsrfToken);
        }

        return {
          ...current,
          user: persistedState?.user ?? null,
          csrfToken: restoredCsrfToken,
          // If user was previously authenticated, set status to 'authenticated'
          // ProtectedRoute will verify this is still valid via checkSession()
          status: persistedState?._wasAuthenticated ? "authenticated" : "idle",
          isDemoMode: persistedState?.isDemoMode ?? false,
          activeOccupationId: persistedState?.activeOccupationId ?? null,
          // Ensure promise is always null on hydration (not serializable)
          _checkSessionPromise: null,
        };
      },
    },
  ),
);
