/**
 * Mobile authentication service.
 *
 * Wraps the shared auth service with mobile-specific functionality:
 * - Secure credential storage for biometric login
 * - Integration with the shared auth store
 * - Mobile-specific session handling
 */

import Constants from 'expo-constants';
import { createAuthService, type LoginResult } from '@volleykit/shared/auth';
import { useAuthStore } from '@volleykit/shared/stores';
import { secureStorage } from '../platform/secureStorage';
import {
  setSessionToken as setApiSessionToken,
  setCsrfToken as setApiCsrfToken,
  clearTokens as clearApiTokens,
} from '../api';

/**
 * API base URL for authentication requests.
 * Uses the CORS proxy configured in app.json extra settings.
 * Falls back to production proxy URL if not configured.
 */
const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  'https://proxy.volleykit.app';

// Session token storage (in-memory for now, could use AsyncStorage)
let sessionToken: string | null = null;

/**
 * Get session headers for API requests.
 */
function getSessionHeaders(): Record<string, string> {
  return sessionToken ? { 'X-Session-Token': sessionToken } : {};
}

/**
 * Capture session token from response headers.
 * Syncs the token with both the local auth service and the real API client.
 */
function captureSessionToken(response: Response): void {
  const token = response.headers.get('X-Session-Token');
  if (token) {
    sessionToken = token;
    // Sync session token with real API client
    setApiSessionToken(token);
  }
}

/**
 * Clear the session token.
 * Clears both the local auth service token and the real API client tokens.
 */
export function clearSessionToken(): void {
  sessionToken = null;
  // Clear all tokens in the real API client
  clearApiTokens();
}

/**
 * Simple logger for auth operations.
 */
const logger = {
  info: (...args: unknown[]) => {
    if (__DEV__) {
      console.log('[Auth]', ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (__DEV__) {
      console.warn('[Auth]', ...args);
    }
  },
  error: (...args: unknown[]) => {
    console.error('[Auth]', ...args);
  },
};

/**
 * Create the auth service instance.
 */
const authService = createAuthService({
  apiBaseUrl: API_BASE_URL,
  getSessionHeaders,
  captureSessionToken,
  logger,
});

/**
 * Login with username and password.
 *
 * On success:
 * - Updates the shared auth store
 * - Stores credentials securely for biometric login (if enabled)
 *
 * @param username - SwissVolley username
 * @param password - Password
 * @param saveCredentials - Whether to save credentials for biometric login
 * @returns Login result
 */
export async function login(
  username: string,
  password: string,
  saveCredentials = true
): Promise<LoginResult> {
  // Set loading state (get fresh state reference for mutations)
  useAuthStore.getState().setStatus('loading');
  useAuthStore.getState().setError(null);

  try {
    const result = await authService.login(username, password);

    if (result.success) {
      // Sync CSRF token with the real API client for subsequent requests
      if (result.csrfToken) {
        setApiCsrfToken(result.csrfToken);
      }

      // Get fresh state after async operation to avoid stale references
      const currentState = useAuthStore.getState();

      // Extract user data from dashboard HTML
      const activeParty = authService.extractActivePartyFromHtml(result.dashboardHtml);
      const { user, activeOccupationId } = authService.deriveUserFromActiveParty(
        activeParty,
        currentState.user,
        currentState.activeOccupationId
      );

      // Check if user has referee role
      if (user.occupations.length === 0) {
        // Logout from server
        await authService.logout();
        clearSessionToken();

        useAuthStore.getState().setError({
          message: 'No referee role found. This app is for referees only.',
          code: 'invalid_credentials',
        });
        useAuthStore.getState().setStatus('error');

        return { success: false, error: 'No referee role found' };
      }

      // Update auth store (get fresh reference for mutations)
      const store = useAuthStore.getState();
      store.setUser(user);
      if (activeOccupationId) {
        store.setActiveOccupation(activeOccupationId);
      }
      store.setDataSource('api');

      // Save credentials for biometric login
      if (saveCredentials) {
        try {
          await secureStorage.setCredentials(username, password);
          logger.info('Credentials saved for biometric login');
        } catch (error) {
          logger.warn('Failed to save credentials:', error);
          // Don't fail login if credential storage fails
        }
      }

      return result;
    }

    // Handle login failure (get fresh reference for mutations)
    useAuthStore.getState().setError({
      message: result.error,
      code: result.lockedUntil ? 'locked' : 'invalid_credentials',
      lockedUntilSeconds: result.lockedUntil,
    });
    useAuthStore.getState().setStatus('error');

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    logger.error('Login error:', error);

    useAuthStore.getState().setError({
      message,
      code: 'network_error',
    });
    useAuthStore.getState().setStatus('error');

    return { success: false, error: message };
  }
}

/**
 * Logout from the current session.
 */
export async function logout(): Promise<void> {
  const store = useAuthStore.getState();

  try {
    await authService.logout();
  } catch (error) {
    logger.error('Logout error:', error);
  }

  // Clear session token
  clearSessionToken();

  // Clear auth store
  store.logout();
}

/**
 * Check if the current session is valid.
 *
 * @returns True if session is valid
 */
export async function checkSession(): Promise<boolean> {
  const store = useAuthStore.getState();

  // Skip check for demo/calendar modes
  if (store.dataSource !== 'api') {
    return true;
  }

  try {
    const result = await authService.checkSession();

    if (result.valid && result.activeParty) {
      // Sync CSRF token with the real API client
      if (result.csrfToken) {
        setApiCsrfToken(result.csrfToken);
      }

      // Update user data from active party
      const { user, activeOccupationId } = authService.deriveUserFromActiveParty(
        result.activeParty,
        store.user,
        store.activeOccupationId
      );

      store.setUser(user);
      if (activeOccupationId) {
        store.setActiveOccupation(activeOccupationId);
      }

      return true;
    }

    // Session invalid - clear auth state
    store.logout();
    clearSessionToken();

    return false;
  } catch (error) {
    logger.error('Session check error:', error);
    return false;
  }
}

/**
 * Re-login with stored credentials (for biometric login).
 *
 * @returns True if re-login succeeded
 */
export async function reloginWithStoredCredentials(): Promise<boolean> {
  try {
    const credentials = await secureStorage.getCredentials();
    if (!credentials) {
      logger.info('No stored credentials for re-login');
      return false;
    }

    const result = await login(credentials.username, credentials.password, false);
    return result.success;
  } catch (error) {
    logger.error('Re-login error:', error);
    return false;
  }
}

/**
 * Clear stored credentials.
 */
export async function clearStoredCredentials(): Promise<void> {
  try {
    await secureStorage.clearCredentials();
    logger.info('Stored credentials cleared');
  } catch (error) {
    logger.warn('Failed to clear credentials:', error);
  }
}

/**
 * Check if stored credentials exist.
 */
export async function hasStoredCredentials(): Promise<boolean> {
  try {
    return await secureStorage.hasCredentials();
  } catch {
    return false;
  }
}
