/**
 * Authentication service.
 *
 * Platform-agnostic authentication service that handles login flow.
 * Used by both web and mobile applications.
 */

import type { LoginFormFields, LoginResult, AuthServiceConfig, ActiveParty } from './types';
import { HTTP_STATUS, AUTH_ENDPOINTS } from './types';
import {
  extractLoginFormFields,
  extractCsrfTokenFromPage,
  extractActivePartyFromHtml,
  isDashboardHtmlContent,
  analyzeAuthResponseHtml,
  parseOccupationsFromActiveParty,
} from './parsers';
import type { UserProfile, Occupation } from '../stores/auth';

/** Default delay in ms to allow browser to process Set-Cookie headers */
const DEFAULT_COOKIE_PROCESSING_DELAY_MS = 100;

/**
 * Default logger that does nothing.
 */
const noopLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Creates an authentication service instance.
 *
 * @param config - Configuration for the auth service
 * @returns Auth service methods
 */
export function createAuthService(config: AuthServiceConfig) {
  const {
    apiBaseUrl,
    getSessionHeaders = () => ({}),
    captureSessionToken = () => {},
    cookieProcessingDelayMs = DEFAULT_COOKIE_PROCESSING_DELAY_MS,
    logger = noopLogger,
  } = config;

  const LOGIN_PAGE_URL = `${apiBaseUrl}${AUTH_ENDPOINTS.LOGIN_PAGE}`;
  const AUTH_URL = `${apiBaseUrl}${AUTH_ENDPOINTS.AUTHENTICATE}`;
  const LOGOUT_URL = `${apiBaseUrl}${AUTH_ENDPOINTS.LOGOUT}`;
  const DASHBOARD_URL = `${apiBaseUrl}${AUTH_ENDPOINTS.DASHBOARD}`;

  /**
   * Build form data for login submission.
   */
  function buildLoginFormData(
    username: string,
    password: string,
    formFields: LoginFormFields
  ): URLSearchParams {
    const formData = new URLSearchParams();

    // Add referrer fields (required by Neos Flow)
    formData.append('__referrer[@package]', formFields.referrerPackage);
    formData.append('__referrer[@subpackage]', formFields.referrerSubpackage);
    formData.append('__referrer[@controller]', formFields.referrerController);
    formData.append('__referrer[@action]', formFields.referrerAction);
    formData.append('__referrer[arguments]', formFields.referrerArguments);

    // Add CSRF protection token
    formData.append('__trustedProperties', formFields.trustedProperties);

    // Add credentials with Neos Flow authentication token format
    formData.append(
      '__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][username]',
      username
    );
    formData.append(
      '__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][password]',
      password
    );

    return formData;
  }

  /**
   * Fetch the login page to get form fields.
   */
  async function fetchLoginPage(): Promise<{ html: string; response: Response }> {
    const response = await fetch(LOGIN_PAGE_URL, {
      credentials: 'include',
      cache: 'no-store',
      headers: getSessionHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to load login page');
    }

    captureSessionToken(response);
    const html = await response.text();

    return { html, response };
  }

  /**
   * Fetch the dashboard after successful login.
   */
  async function fetchDashboard(): Promise<{ html: string; csrfToken: string | null }> {
    // Small delay to allow cookie processing (configurable via cookieProcessingDelayMs)
    await new Promise((resolve) => setTimeout(resolve, cookieProcessingDelayMs));

    const response = await fetch(DASHBOARD_URL, {
      credentials: 'include',
      cache: 'no-store',
      redirect: 'follow',
      headers: getSessionHeaders(),
    });

    captureSessionToken(response);

    if (!response.ok) {
      throw new Error('Failed to load dashboard');
    }

    const html = await response.text();
    const csrfToken = extractCsrfTokenFromPage(html);

    return { html, csrfToken };
  }

  /**
   * Submit login credentials and handle the response.
   */
  async function submitCredentials(
    username: string,
    password: string,
    formFields: LoginFormFields
  ): Promise<LoginResult> {
    const formData = buildLoginFormData(username, password, formFields);

    const response = await fetch(AUTH_URL, {
      method: 'POST',
      credentials: 'include',
      redirect: 'manual',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...getSessionHeaders(),
      },
      body: formData,
    });

    captureSessionToken(response);

    // Handle lockout response
    if (response.status === HTTP_STATUS.LOCKED) {
      try {
        const lockoutData = (await response.json()) as {
          lockedUntil?: number;
          message?: string;
        };
        return {
          success: false,
          error: lockoutData.message ?? 'Account temporarily locked',
          lockedUntil: lockoutData.lockedUntil,
        };
      } catch {
        return {
          success: false,
          error: 'Account temporarily locked due to too many failed attempts',
        };
      }
    }

    logger.info('Auth response received', {
      status: response.status,
      type: response.type,
    });

    // Handle JSON response from proxy (iOS Safari PWA fix)
    const contentType = response.headers.get('Content-Type');
    if (response.status === HTTP_STATUS.OK && contentType?.includes('application/json')) {
      try {
        const jsonResponse = (await response.json()) as {
          success?: boolean;
          redirectUrl?: string;
        };

        if (jsonResponse.redirectUrl && jsonResponse.success) {
          // Successful login - fetch dashboard for CSRF token
          const { html, csrfToken } = await fetchDashboard();
          if (csrfToken) {
            return { success: true, csrfToken, dashboardHtml: html };
          }
          return { success: false, error: 'Login succeeded but session could not be established' };
        }

        if (jsonResponse.redirectUrl && !jsonResponse.success) {
          return { success: false, error: 'Invalid username or password' };
        }
      } catch {
        // Not valid JSON, continue with other handling
      }
    }

    // Check for redirect response (303 = successful login)
    const isRedirectResponse =
      response.status >= HTTP_STATUS.REDIRECT_MIN &&
      response.status < HTTP_STATUS.REDIRECT_MAX &&
      response.type !== 'opaqueredirect';

    const locationHeader = response.headers.get('Location');
    const isRedirectToDashboard =
      isRedirectResponse &&
      locationHeader !== null &&
      locationHeader.includes(AUTH_ENDPOINTS.DASHBOARD);

    // Handle opaqueredirect
    if (response.type === 'opaqueredirect') {
      logger.info('Got opaqueredirect response, assuming successful login...');
      try {
        const { html, csrfToken } = await fetchDashboard();
        if (csrfToken) {
          return { success: true, csrfToken, dashboardHtml: html };
        }
      } catch {
        return { success: false, error: 'Login succeeded but could not load dashboard' };
      }
    }

    // If redirected to dashboard, fetch it for CSRF token
    if (isRedirectToDashboard) {
      logger.info('Login successful (detected from redirect), fetching dashboard...');
      try {
        const { html, csrfToken } = await fetchDashboard();
        if (csrfToken) {
          return { success: true, csrfToken, dashboardHtml: html };
        }
        return { success: false, error: 'Login succeeded but session could not be established' };
      } catch {
        return { success: false, error: 'Login succeeded but could not load dashboard' };
      }
    }

    // Not a redirect - analyze response HTML
    if (!response.ok) {
      return { success: false, error: 'Authentication request failed' };
    }

    const html = await response.text();

    // Check if this is actually the dashboard (content-based detection)
    if (isDashboardHtmlContent(html)) {
      const csrfToken = extractCsrfTokenFromPage(html);
      if (csrfToken) {
        return { success: true, csrfToken, dashboardHtml: html };
      }
    }

    // Check for errors in HTML
    const { hasAuthError, hasTfaPage } = analyzeAuthResponseHtml(html);

    if (hasAuthError) {
      return { success: false, error: 'Invalid username or password' };
    }

    if (hasTfaPage) {
      return {
        success: false,
        error:
          'Two-factor authentication is not supported. Please disable it in your VolleyManager account settings.',
      };
    }

    return { success: false, error: 'Login failed - please try again' };
  }

  /**
   * Main login function.
   *
   * @param username - SwissVolley username
   * @param password - Password
   * @returns Login result with CSRF token and user data on success
   */
  async function login(
    username: string,
    password: string
  ): Promise<LoginResult> {
    try {
      // Step 1: Fetch login page to get form fields
      const { html: loginPageHtml } = await fetchLoginPage();

      // Check if already logged in (login page has CSRF token)
      const existingCsrfToken = extractCsrfTokenFromPage(loginPageHtml);
      if (existingCsrfToken) {
        logger.info('Already logged in, fetching dashboard...');
        const { html: dashboardHtml, csrfToken } = await fetchDashboard();
        if (csrfToken) {
          return { success: true, csrfToken, dashboardHtml };
        }
      }

      // Step 2: Extract form fields
      const formFields = extractLoginFormFields(loginPageHtml);
      if (!formFields) {
        return { success: false, error: 'Could not extract form fields from login page' };
      }

      // Step 3: Submit credentials
      return await submitCredentials(username, password, formFields);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      logger.error('Login error:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Logout from the current session.
   */
  async function logout(): Promise<void> {
    try {
      await fetch(LOGOUT_URL, {
        credentials: 'include',
        redirect: 'manual',
      });
    } catch (error) {
      logger.error('Logout request failed:', error);
    }
  }

  /**
   * Check if the current session is valid.
   *
   * @returns True if session is valid, false otherwise
   */
  async function checkSession(): Promise<{
    valid: boolean;
    csrfToken?: string;
    activeParty?: ActiveParty | null;
  }> {
    try {
      const response = await fetch(DASHBOARD_URL, {
        credentials: 'include',
        redirect: 'follow',
        cache: 'no-store',
        headers: getSessionHeaders(),
      });

      captureSessionToken(response);

      if (!response.ok) {
        return { valid: false };
      }

      const html = await response.text();

      // Check if we got the login page instead
      if (!isDashboardHtmlContent(html)) {
        return { valid: false };
      }

      const csrfToken = extractCsrfTokenFromPage(html);
      const activeParty = extractActivePartyFromHtml(html);

      if (!csrfToken) {
        return { valid: false };
      }

      return { valid: true, csrfToken, activeParty };
    } catch (error) {
      logger.error('Session check failed:', error);
      return { valid: false };
    }
  }

  /**
   * Derive user profile from active party data.
   */
  function deriveUserFromActiveParty(
    activeParty: ActiveParty | null,
    existingUser: UserProfile | null,
    existingActiveOccupationId: string | null
  ): { user: UserProfile; activeOccupationId: string | null } {
    // Use groupedEligibleAttributeValues first, fall back to eligibleAttributeValues
    const attributeValues = activeParty?.groupedEligibleAttributeValues?.length
      ? activeParty.groupedEligibleAttributeValues
      : (activeParty?.eligibleAttributeValues ?? null);

    const parsedOccupations = parseOccupationsFromActiveParty(attributeValues);

    // Preserve existing occupations if parsing returns empty
    const occupations: Occupation[] =
      parsedOccupations.length > 0 ? parsedOccupations : (existingUser?.occupations ?? []);

    // Validate that the persisted activeOccupationId exists
    const isPersistedIdValid =
      existingActiveOccupationId !== null &&
      occupations.some((occ) => occ.id === existingActiveOccupationId);
    const activeOccupationId = isPersistedIdValid
      ? existingActiveOccupationId
      : (occupations[0]?.id ?? null);

    // Use the person's __identity from activeParty as the user id
    const userId = activeParty?.__identity ?? existingUser?.id ?? 'user';

    const user: UserProfile = existingUser
      ? { ...existingUser, id: userId, occupations }
      : {
          id: userId,
          firstName: '',
          lastName: '',
          occupations,
        };

    return { user, activeOccupationId };
  }

  return {
    login,
    logout,
    checkSession,
    fetchLoginPage,
    fetchDashboard,
    submitCredentials,
    deriveUserFromActiveParty,
    extractActivePartyFromHtml,
  };
}

/**
 * Type for the auth service instance.
 */
export type AuthService = ReturnType<typeof createAuthService>;
