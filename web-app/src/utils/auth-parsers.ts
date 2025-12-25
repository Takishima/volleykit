/**
 * Authentication HTML parsing utilities.
 * Extracts form fields and tokens from Neos Flow login pages.
 */

import { logger } from "@/utils/logger";

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
 */
export type LoginResult =
  | { success: true; csrfToken: string }
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
  const isOnDashboard =
    response.redirected &&
    response.url.includes("/sportmanager.volleyball/main/dashboard");

  if (isOnDashboard) {
    // Successfully redirected to dashboard - extract CSRF token
    const csrfToken = extractCsrfTokenFromPage(html);
    if (csrfToken) {
      return { success: true, csrfToken };
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
  const hasAuthError =
    html.includes('color="error"') || html.includes("color='error'");

  if (hasAuthError) {
    return { success: false, error: "Invalid username or password" };
  }

  // Fallback: Check if CSRF token exists (might be on dashboard without redirect flag)
  const csrfToken = extractCsrfTokenFromPage(html);
  if (csrfToken) {
    return { success: true, csrfToken };
  }

  // Unknown state - couldn't determine success or failure
  logger.warn("Could not determine login result from response");
  return { success: false, error: "Login failed - please try again" };
}
