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
 * Result of submitting login credentials.
 * On success, includes the dashboard HTML for extracting additional data like activeParty.
 */
export type LoginResult =
  | { success: true; csrfToken: string; dashboardHtml: string }
  | { success: false; error: string };

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
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
  });

  if (!response.ok) {
    return { success: false, error: "Authentication request failed" };
  }

  // Parse response HTML
  const html = await response.text();

  // Check if we were redirected to the dashboard (successful login)
  // The API returns 303 redirect on success, fetch follows it automatically
  // Note: Some proxies may not preserve the redirected flag, so we check
  // if the final URL contains the dashboard pattern regardless of redirect flag
  const isOnDashboard = response.url?.includes(DASHBOARD_URL_PATTERN) ?? false;

  if (isOnDashboard) {
    // Successfully redirected to dashboard - extract CSRF token
    const csrfToken = extractCsrfTokenFromPage(html);
    if (csrfToken) {
      return { success: true, csrfToken, dashboardHtml: html };
    }
    // Redirected to dashboard but couldn't find CSRF token
    // This is a parsing issue, not invalid credentials
    logger.warn("Login succeeded but CSRF token not found in dashboard HTML");
    return {
      success: false,
      error: "Login succeeded but session could not be established",
    };
  }

  // Not redirected - check if we're on the login page with an error
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

  // Fallback: Check if CSRF token exists (might be on dashboard without redirect flag)
  const csrfToken = extractCsrfTokenFromPage(html);
  if (csrfToken) {
    return { success: true, csrfToken, dashboardHtml: html };
  }

  // Unknown state - couldn't determine success or failure
  // Log diagnostic info to help debug login issues
  logger.warn("Could not determine login result from response", {
    redirected: response.redirected,
    url: response.url ?? "(no url)",
    htmlLength: html.length,
    htmlPreview: html.slice(0, DIAGNOSTIC_PREVIEW_LENGTH),
  });
  return { success: false, error: "Login failed - please try again" };
}
