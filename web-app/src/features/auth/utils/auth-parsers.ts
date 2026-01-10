/**
 * Authentication HTML parsing utilities.
 * Extracts form fields and tokens from Neos Flow login pages.
 */

import { logger } from "@/shared/utils/logger";

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

  const response = await fetch(authUrl, {
    method: "POST",
    credentials: "include",
    // Explicit redirect: "follow" for consistent behavior across browsers and PWA modes.
    // Some service workers may handle implicit defaults differently in standalone PWA mode.
    redirect: "follow",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
  });

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

  if (!response.ok) {
    return { success: false, error: "Authentication request failed" };
  }

  // Parse response HTML
  const html = await response.text();

  // Check if we were redirected to the dashboard (successful login)
  // The API returns 303 redirect on success, fetch follows it automatically.
  //
  // iOS PWA standalone mode fix: In iOS Safari PWA standalone mode,
  // response.url may not update after following redirects, AND response.redirected
  // may also be unreliable. We use multiple detection strategies:
  // 1. URL-based: Check if response.url contains dashboard pattern
  // 2. Redirect flag: Check response.redirected
  // 3. Content-based: Check if HTML content indicates dashboard (most reliable for iOS PWA)
  const isOnDashboard = response.url?.includes(DASHBOARD_URL_PATTERN) ?? false;
  const wasRedirected = response.redirected;
  const isDashboardContent = isDashboardHtmlContent(html);

  // Success detection using multiple strategies
  // Content-based detection is most reliable for iOS PWA standalone mode
  if (isOnDashboard || wasRedirected || isDashboardContent) {
    const csrfToken = extractCsrfTokenFromPage(html);
    if (csrfToken) {
      // Log which detection method succeeded for debugging
      if (!isOnDashboard && !wasRedirected && isDashboardContent) {
        logger.info("iOS PWA mode: Login success detected via content analysis");
      }
      return { success: true, csrfToken, dashboardHtml: html };
    }

    // If we detected dashboard but can't find CSRF token, continue with error checks.
    // The redirect might have been to an error page or TFA page.
    if (isOnDashboard) {
      // Specifically redirected to dashboard URL but couldn't find CSRF token
      // This is a parsing issue, not invalid credentials
      logger.warn("Login succeeded but CSRF token not found in dashboard HTML");
      return {
        success: false,
        error: "Login succeeded but session could not be established",
      };
    }
    // wasRedirected or isDashboardContent but no CSRF token - fall through to check for errors/TFA
  }

  // Check for authentication errors first
  // The Vuetify snackbar with color="error" indicates authentication failure
  const hasAuthError = AUTH_ERROR_INDICATORS.some((indicator) =>
    html.includes(indicator),
  );

  if (hasAuthError) {
    return { success: false, error: "Invalid username or password" };
  }

  // Check if we're on a Two-Factor Authentication page
  // TFA users see an OTP input form after valid credentials
  const hasTfaPage = TFA_PAGE_INDICATORS.some((indicator) =>
    html.includes(indicator),
  );

  if (hasTfaPage) {
    logger.info("TFA page detected - user has two-factor authentication enabled");
    return {
      success: false,
      error: "Two-factor authentication is not supported. Please disable it in your VolleyManager account settings to use this app.",
    };
  }

  // Unknown state - couldn't determine success or failure
  // Log diagnostic info to help debug login issues
  logger.warn("Could not determine login result from response", {
    redirected: wasRedirected,
    isOnDashboard,
    isDashboardContent,
    url: response.url ?? "(no url)",
    htmlLength: html.length,
    htmlPreview: html.slice(0, DIAGNOSTIC_PREVIEW_LENGTH),
  });
  return { success: false, error: "Login failed - please try again" };
}
