/**
 * Authentication HTML parsing utilities.
 * Extracts form fields and tokens from Neos Flow login pages.
 */

import { authLogger as logger } from "@/shared/utils/auth-log-buffer";
import { captureSessionToken, getSessionHeaders } from "@/api/client";

/**
 * URL path pattern that indicates successful login redirect to dashboard.
 * The API redirects to this path after successful authentication.
 */
const DASHBOARD_URL_PATTERN = "/sportmanager.volleyball/main/dashboard";

/**
 * HTML patterns that indicate authentication failure.
 * The Vuetify snackbar uses these color attributes for error messages.
 */
const AUTH_ERROR_INDICATORS = ['color="error"', "color='error'"] as const;

/**
 * HTML patterns that indicate Two-Factor Authentication is required.
 * These patterns match the Neos Flow TFA input page.
 */
const TFA_PAGE_INDICATORS = [
  "secondFactorToken",
  "SecondFactor",
  "TwoFactorAuthentication",
  "totp",
  "TOTP",
] as const;

/** Maximum characters to include in diagnostic HTML preview logs */
const DIAGNOSTIC_PREVIEW_LENGTH = 500;

/** HTTP status code for account lockout (from proxy brute-force protection) */
const HTTP_STATUS_LOCKED = 423;

/** HTTP status code for successful response */
const HTTP_STATUS_OK = 200;

/** HTTP status codes for redirect detection (3xx range) */
const HTTP_REDIRECT_MIN = 300;
const HTTP_REDIRECT_MAX = 400;

/** Delay in ms to allow browser to process Set-Cookie headers from redirect response */
const COOKIE_PROCESSING_DELAY_MS = 100;

/**
 * Login form fields extracted from the login page HTML.
 * The Neos Flow framework requires these fields for CSRF protection.
 */
export interface LoginFormFields {
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
export function extractLoginFormFields(html: string): LoginFormFields | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Check for parsing errors
    const parserError = doc.querySelector("parsererror");
    if (parserError) {
      logger.error("DOMParser error:", parserError.textContent);
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
      logger.error("Missing __trustedProperties field in login form");
      return null;
    }

    return {
      trustedProperties,
      referrerPackage: referrerPackage ?? "SportManager.Volleyball",
      referrerSubpackage: referrerSubpackage ?? "",
      referrerController: referrerController ?? "Public",
      referrerAction: referrerAction ?? "login",
      referrerArguments: referrerArguments ?? "",
    };
  } catch (error) {
    logger.error("Failed to parse login page HTML:", error);
    return null;
  }
}

/**
 * Extract CSRF token from authenticated page HTML.
 * After login, the dashboard HTML contains data-csrf-token attribute
 * which is used as __csrfToken for subsequent API calls.
 */
export function extractCsrfTokenFromPage(html: string): string | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // The CSRF token is in the <html> tag's data-csrf-token attribute
    const htmlElement = doc.documentElement;
    const csrfToken = htmlElement?.getAttribute("data-csrf-token");

    if (csrfToken) {
      return csrfToken;
    }

    logger.warn("Could not find data-csrf-token in page");
    return null;
  } catch (error) {
    logger.error("Failed to extract CSRF token from page:", error);
    return null;
  }
}

/**
 * Checks if HTML content represents the dashboard page.
 * Used as fallback for iOS PWA standalone mode where response.url
 * may not update after redirects.
 *
 * This checks for dashboard-specific content to reliably detect
 * successful login even when response.url and response.redirected
 * are not properly set (known iOS Safari PWA limitation).
 */
export function isDashboardHtmlContent(html: string): boolean {
  // Dashboard pages have CSRF token AND don't have login form
  const hasCsrfToken = html.includes("data-csrf-token");
  const hasLoginForm =
    html.includes('action="/login"') ||
    (html.includes('id="username"') && html.includes('id="password"'));

  // Must have CSRF token (authenticated page) and NOT be a login page
  return hasCsrfToken && !hasLoginForm;
}

/**
 * Result of submitting login credentials.
 * On success, includes the dashboard HTML for extracting additional data like activeParty.
 */
export type LoginResult =
  | { success: true; csrfToken: string; dashboardHtml: string }
  | { success: false; error: string; lockedUntil?: number };

/**
 * Fetches the dashboard and extracts the CSRF token.
 * Used after detecting a successful login redirect.
 *
 * @returns LoginResult - success with CSRF token, or specific error
 */
async function fetchDashboardAfterLogin(dashboardUrl: string): Promise<LoginResult> {
  await new Promise((resolve) => setTimeout(resolve, COOKIE_PROCESSING_DELAY_MS));

  const dashboardResponse = await fetch(dashboardUrl, {
    method: "GET",
    credentials: "include",
    redirect: "follow",
    cache: "no-store",
    headers: getSessionHeaders(),
  });

  // Capture session token from response headers (iOS Safari PWA)
  captureSessionToken(dashboardResponse);

  if (!dashboardResponse.ok) {
    logger.warn("iOS PWA: Dashboard fetch failed after successful login redirect", {
      status: dashboardResponse.status,
    });
    return {
      success: false,
      error: "Login succeeded but could not load dashboard",
    };
  }

  const dashboardHtml = await dashboardResponse.text();
  const csrfToken = extractCsrfTokenFromPage(dashboardHtml);

  if (csrfToken) {
    return { success: true, csrfToken, dashboardHtml };
  }

  // Got dashboard but no CSRF token - check if it's actually the login page
  // (would happen if cookies weren't sent with the dashboard request)
  if (isDashboardHtmlContent(dashboardHtml)) {
    logger.warn("Dashboard fetched but CSRF token not found");
    return {
      success: false,
      error: "Login succeeded but session could not be established",
    };
  }

  // The "dashboard" response was actually the login page - cookie issue
  logger.warn("iOS PWA: Dashboard request returned login page - cookie not sent");
  return {
    success: false,
    error: "Login succeeded but session cookie failed. Please try again or use Safari browser.",
  };
}

/**
 * Analyzes HTML content to determine login result using fallback strategies.
 * Used when redirect-based detection fails or is unavailable.
 */
function analyzeLoginResponseHtml(
  html: string,
  responseUrl: string,
  wasRedirected: boolean,
): LoginResult {
  const isOnDashboard = responseUrl.includes(DASHBOARD_URL_PATTERN);
  const isDashboardContent = html.length > 0 && isDashboardHtmlContent(html);

  // Success detection using multiple strategies
  if (isOnDashboard || wasRedirected || isDashboardContent) {
    const csrfToken = extractCsrfTokenFromPage(html);
    if (csrfToken) {
      if (!isOnDashboard && !wasRedirected && isDashboardContent) {
        logger.info("iOS PWA mode: Login success detected via content analysis");
      }
      return { success: true, csrfToken, dashboardHtml: html };
    }

    // Dashboard URL but no CSRF token - parsing issue
    if (isOnDashboard) {
      logger.warn("Login succeeded but CSRF token not found in dashboard HTML");
      return {
        success: false,
        error: "Login succeeded but session could not be established",
      };
    }
    // wasRedirected or isDashboardContent but no CSRF token - fall through to error checks
  }

  // Check for authentication errors (Vuetify snackbar)
  const hasAuthError = AUTH_ERROR_INDICATORS.some((indicator) => html.includes(indicator));
  if (hasAuthError) {
    return { success: false, error: "Invalid username or password" };
  }

  // Check for Two-Factor Authentication page
  const hasTfaPage = TFA_PAGE_INDICATORS.some((indicator) => html.includes(indicator));
  if (hasTfaPage) {
    logger.info("TFA page detected - user has two-factor authentication enabled");
    return {
      success: false,
      error:
        "Two-factor authentication is not supported. Please disable it in your VolleyManager account settings to use this app.",
    };
  }

  // Unknown state - log diagnostic info
  logger.warn("Could not determine login result from response", {
    redirected: wasRedirected,
    isOnDashboard,
    isDashboardContent,
    url: responseUrl,
    htmlLength: html.length,
    htmlPreview: html.slice(0, DIAGNOSTIC_PREVIEW_LENGTH),
  });
  return { success: false, error: "Login failed - please try again" };
}

/**
 * Submit login credentials to the authentication endpoint.
 * This is the core login logic used after we have valid form fields.
 *
 * Success detection:
 * - The API returns 303 redirect to dashboard on success
 * - Fetch follows the redirect, so we check response.url to detect success
 * - Dashboard URL contains "/sportmanager.volleyball/main/dashboard"
 *
 * Failure detection:
 * - The API returns 200 with login page HTML on failure
 * - The login page contains a Vuetify snackbar with color="error"
 */
export async function submitLoginCredentials(
  authUrl: string,
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

  // iOS PWA standalone mode fix: Use redirect: "manual" instead of "follow".
  // In iOS Safari PWA standalone mode, fetch with redirect: "follow" has issues:
  // - response.url may not update after redirects
  // - response.redirected may be unreliable
  // - Cookies from redirect responses may not be properly stored/sent
  //
  // By handling redirects manually, we can:
  // 1. Detect successful login from the 303 status + Location header
  // 2. Manually fetch the dashboard in a separate request
  // 3. Give the browser time to process Set-Cookie headers
  const response = await fetch(authUrl, {
    method: "POST",
    credentials: "include",
    redirect: "manual",
    // cache: "no-store" is critical for iOS Safari PWA - prevents using stale cached cookies
    // See: https://developer.apple.com/forums/thread/89050
    cache: "no-store",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...getSessionHeaders(),
    },
    body: formData,
  });

  // Capture session token from response headers (iOS Safari PWA)
  captureSessionToken(response);

  // Handle lockout response from proxy (auth brute-force protection)
  if (response.status === HTTP_STATUS_LOCKED) {
    try {
      const lockoutData = (await response.json()) as {
        lockedUntil?: number;
        message?: string;
      };
      return {
        success: false,
        error: lockoutData.message ?? "Account temporarily locked",
        lockedUntil: lockoutData.lockedUntil,
      };
    } catch {
      return {
        success: false,
        error: "Account temporarily locked due to too many failed attempts",
      };
    }
  }

  // Log response details for debugging iOS PWA issues
  logger.info("Auth response received", {
    status: response.status,
    type: response.type,
    url: response.url,
    hasLocationHeader: response.headers.has("Location"),
  });

  // Handle JSON response from proxy (iOS Safari PWA fix)
  // The proxy converts ALL auth redirects to 200 + JSON so iOS Safari PWA
  // properly processes the Set-Cookie header (opaqueredirect hides all headers)
  const contentType = response.headers.get("Content-Type");
  if (response.status === HTTP_STATUS_OK && contentType?.includes("application/json")) {
    try {
      const jsonResponse = (await response.json()) as {
        success?: boolean;
        redirectUrl?: string;
      };
      if (jsonResponse.redirectUrl) {
        logger.info("iOS PWA: Got JSON auth response", {
          success: jsonResponse.success,
          redirectUrl: jsonResponse.redirectUrl,
        });

        // For successful login, fetch the dashboard to get CSRF token
        if (jsonResponse.success) {
          const dashboardUrl = jsonResponse.redirectUrl;
          const result = await fetchDashboardAfterLogin(dashboardUrl);
          if (result.success) {
            logger.info("iOS PWA: Successfully fetched dashboard after JSON auth response");
          }
          return result;
        }

        // For failed login (redirect back to login page), return error
        // The proxy detected this was a redirect to login/auth page
        logger.info("iOS PWA: Auth redirect indicates failed login");
        return { success: false, error: "Invalid username or password" };
      }
    } catch {
      // Not valid JSON, continue with other response handling
    }
  }

  // Check for redirect response (303 See Other = successful login)
  // With redirect: "manual", we get the raw redirect response instead of following it
  const isRedirectResponse =
    response.status >= HTTP_REDIRECT_MIN &&
    response.status < HTTP_REDIRECT_MAX &&
    response.type !== "opaqueredirect";
  const locationHeader = response.headers.get("Location");
  const isRedirectToDashboard =
    isRedirectResponse &&
    locationHeader !== null &&
    locationHeader.includes(DASHBOARD_URL_PATTERN);

  // Handle opaqueredirect - this can happen in some CORS configurations on iOS
  // We can't see the Location header, but type "opaqueredirect" indicates a redirect
  if (response.type === "opaqueredirect") {
    logger.info("iOS PWA: Got opaqueredirect response, assuming successful login...");
    const dashboardUrl = authUrl.replace(
      "/sportmanager.security/authentication/authenticate",
      "/sportmanager.volleyball/main/dashboard"
    );
    const result = await fetchDashboardAfterLogin(dashboardUrl);
    if (result.success) {
      logger.info("iOS PWA: Successfully fetched dashboard after opaqueredirect");
    }
    return result;
  }

  // If we got a redirect to the dashboard, login was successful
  // Now manually fetch the dashboard to get the CSRF token and user data
  if (isRedirectToDashboard) {
    logger.info("iOS PWA mode: Login successful (detected from 303 redirect), fetching dashboard...");
    return await fetchDashboardAfterLogin(locationHeader);
  }

  // Not a redirect response - could be error page or direct response
  // (opaqueredirect case is handled above and returns early)
  if (!response.ok) {
    return { success: false, error: "Authentication request failed" };
  }

  // Parse response HTML for content-based detection (fallback for non-redirect responses)
  const html = await response.text();
  return analyzeLoginResponseHtml(html, response.url ?? "", response.redirected);
}
