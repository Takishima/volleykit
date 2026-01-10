import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  extractLoginFormFields,
  extractCsrfTokenFromPage,
  submitLoginCredentials,
  type LoginFormFields,
} from "./auth-parsers";

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Clear mocks before each test to prevent test pollution
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.resetAllMocks();
});

// Helper to create login page HTML with all form fields
function createLoginPageHtml(options: {
  trustedProperties?: string | null;
  referrerPackage?: string | null;
  referrerSubpackage?: string | null;
  referrerController?: string | null;
  referrerAction?: string | null;
  referrerArguments?: string | null;
} = {}) {
  const fields: string[] = [];

  if (options.trustedProperties !== null) {
    fields.push(
      `<input type='hidden' name='__trustedProperties' value='${options.trustedProperties ?? "a:0:{}abc123def456"}' />`
    );
  }
  if (options.referrerPackage !== null) {
    fields.push(
      `<input type='hidden' name='__referrer[@package]' value='${options.referrerPackage ?? "SportManager.Volleyball"}' />`
    );
  }
  if (options.referrerSubpackage !== null) {
    fields.push(
      `<input type='hidden' name='__referrer[@subpackage]' value='${options.referrerSubpackage ?? ""}' />`
    );
  }
  if (options.referrerController !== null) {
    fields.push(
      `<input type='hidden' name='__referrer[@controller]' value='${options.referrerController ?? "Public"}' />`
    );
  }
  if (options.referrerAction !== null) {
    fields.push(
      `<input type='hidden' name='__referrer[@action]' value='${options.referrerAction ?? "login"}' />`
    );
  }
  if (options.referrerArguments !== null) {
    fields.push(
      `<input type='hidden' name='__referrer[arguments]' value='${options.referrerArguments ?? "YTowOnt9abc123"}' />`
    );
  }

  return `
    <html>
      <body>
        <form>
          ${fields.join("\n          ")}
        </form>
      </body>
    </html>
  `;
}

// Helper to create dashboard HTML with CSRF token
function createDashboardHtml(csrfToken: string | null = "abcd1234efgh5678") {
  if (csrfToken === null) {
    return `<html><body>Dashboard</body></html>`;
  }
  return `<html data-csrf-token='${csrfToken}'><body>Dashboard</body></html>`;
}

// Helper to create TFA page
function createTfaPageHtml() {
  return `
    <html>
      <body>
        <form>
          <input type='hidden' name='__trustedProperties' value='test123' />
          <input type='text' name='secondFactorToken' placeholder='Enter your 2FA code' />
          <button type='submit'>Verify</button>
        </form>
      </body>
    </html>
  `;
}

describe("extractLoginFormFields", () => {
  describe("successful extraction", () => {
    it("extracts all form fields from valid login page HTML", () => {
      const html = createLoginPageHtml();
      const result = extractLoginFormFields(html);

      expect(result).toEqual({
        trustedProperties: "a:0:{}abc123def456",
        referrerPackage: "SportManager.Volleyball",
        referrerSubpackage: "",
        referrerController: "Public",
        referrerAction: "login",
        referrerArguments: "YTowOnt9abc123",
      });
    });

    it("extracts custom trustedProperties value", () => {
      const html = createLoginPageHtml({ trustedProperties: "custom-token-value" });
      const result = extractLoginFormFields(html);

      expect(result?.trustedProperties).toBe("custom-token-value");
    });

    it("extracts custom referrer values", () => {
      const html = createLoginPageHtml({
        referrerPackage: "Custom.Package",
        referrerController: "CustomController",
        referrerAction: "customAction",
      });
      const result = extractLoginFormFields(html);

      expect(result?.referrerPackage).toBe("Custom.Package");
      expect(result?.referrerController).toBe("CustomController");
      expect(result?.referrerAction).toBe("customAction");
    });
  });

  describe("default values", () => {
    it("uses default referrerPackage when missing", () => {
      const html = createLoginPageHtml({ referrerPackage: null });
      const result = extractLoginFormFields(html);

      expect(result?.referrerPackage).toBe("SportManager.Volleyball");
    });

    it("uses default referrerSubpackage when missing", () => {
      const html = createLoginPageHtml({ referrerSubpackage: null });
      const result = extractLoginFormFields(html);

      expect(result?.referrerSubpackage).toBe("");
    });

    it("uses default referrerController when missing", () => {
      const html = createLoginPageHtml({ referrerController: null });
      const result = extractLoginFormFields(html);

      expect(result?.referrerController).toBe("Public");
    });

    it("uses default referrerAction when missing", () => {
      const html = createLoginPageHtml({ referrerAction: null });
      const result = extractLoginFormFields(html);

      expect(result?.referrerAction).toBe("login");
    });

    it("uses default referrerArguments when missing", () => {
      const html = createLoginPageHtml({ referrerArguments: null });
      const result = extractLoginFormFields(html);

      expect(result?.referrerArguments).toBe("");
    });
  });

  describe("error handling", () => {
    it("returns null when trustedProperties is missing", () => {
      const html = createLoginPageHtml({ trustedProperties: null });
      const result = extractLoginFormFields(html);

      expect(result).toBeNull();
    });

    it("returns null for empty HTML", () => {
      const result = extractLoginFormFields("");

      expect(result).toBeNull();
    });

    it("returns null for invalid HTML without form fields", () => {
      const html = "<html><body><p>No form here</p></body></html>";
      const result = extractLoginFormFields(html);

      expect(result).toBeNull();
    });
  });
});

describe("extractCsrfTokenFromPage", () => {
  describe("successful extraction", () => {
    it("extracts CSRF token from data-csrf-token attribute", () => {
      const html = createDashboardHtml("my-csrf-token-12345");
      const result = extractCsrfTokenFromPage(html);

      expect(result).toBe("my-csrf-token-12345");
    });

    it("extracts CSRF token with special characters", () => {
      const html = createDashboardHtml("token+with/special=chars");
      const result = extractCsrfTokenFromPage(html);

      expect(result).toBe("token+with/special=chars");
    });

    it("extracts CSRF token using double quotes", () => {
      const html = `<html data-csrf-token="double-quote-token"><body></body></html>`;
      const result = extractCsrfTokenFromPage(html);

      expect(result).toBe("double-quote-token");
    });
  });

  describe("error handling", () => {
    it("returns null when data-csrf-token is missing", () => {
      const html = createDashboardHtml(null);
      const result = extractCsrfTokenFromPage(html);

      expect(result).toBeNull();
    });

    it("returns null for empty HTML", () => {
      const result = extractCsrfTokenFromPage("");

      expect(result).toBeNull();
    });

    it("returns null when token is on wrong element", () => {
      const html = `<html><body><div data-csrf-token="wrong-place"></div></body></html>`;
      const result = extractCsrfTokenFromPage(html);

      expect(result).toBeNull();
    });
  });
});

describe("submitLoginCredentials", () => {
  const authUrl = "https://example.com/authenticate";
  const username = "testuser";
  const password = "testpass";
  const formFields: LoginFormFields = {
    trustedProperties: "test-trusted-props",
    referrerPackage: "SportManager.Volleyball",
    referrerSubpackage: "",
    referrerController: "Public",
    referrerAction: "login",
    referrerArguments: "YTowOnt9",
  };

  describe("successful login", () => {
    it("returns success with CSRF token and dashboard HTML when redirected to dashboard", async () => {
      const dashboardHtml = createDashboardHtml("success-csrf-token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        url: "https://example.com/sportmanager.volleyball/main/dashboard",
        text: () => Promise.resolve(dashboardHtml),
      });

      const result = await submitLoginCredentials(authUrl, username, password, formFields);

      expect(result).toEqual({
        success: true,
        csrfToken: "success-csrf-token",
        dashboardHtml,
      });
    });

    it("sends correct form data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        url: "https://example.com/sportmanager.volleyball/main/dashboard",
        text: () => Promise.resolve(createDashboardHtml("token")),
      });

      await submitLoginCredentials(authUrl, username, password, formFields);

      expect(mockFetch).toHaveBeenCalledWith(authUrl, {
        method: "POST",
        credentials: "include",
        redirect: "follow",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: expect.any(URLSearchParams),
      });

      const callArgs = mockFetch.mock.calls[0]?.[1] as { body: URLSearchParams } | undefined;
      expect(callArgs).toBeDefined();
      const body = callArgs!.body;
      expect(body.get("__trustedProperties")).toBe("test-trusted-props");
      expect(body.get("__referrer[@package]")).toBe("SportManager.Volleyball");
      expect(body.get("__referrer[@controller]")).toBe("Public");
      expect(body.get("__referrer[@action]")).toBe("login");
      expect(
        body.get(
          "__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][username]"
        )
      ).toBe(username);
      expect(
        body.get(
          "__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][password]"
        )
      ).toBe(password);
    });

    it("succeeds when CSRF token found even without dashboard URL", async () => {
      // Fallback case: CSRF token found but URL doesn't match dashboard pattern
      const htmlWithCsrf = createDashboardHtml("fallback-token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        url: "https://example.com/some-other-page",
        text: () => Promise.resolve(htmlWithCsrf),
      });

      const result = await submitLoginCredentials(authUrl, username, password, formFields);

      expect(result).toEqual({
        success: true,
        csrfToken: "fallback-token",
        dashboardHtml: htmlWithCsrf,
      });
    });

    it("succeeds in PWA mode when redirected flag is true but URL is not updated", async () => {
      // PWA standalone mode fix: Service workers may not update response.url after redirects
      // but response.redirected will still be true. Login should succeed if CSRF token is found.
      const dashboardHtml = createDashboardHtml("pwa-csrf-token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        redirected: true, // PWA mode: redirect happened
        url: "https://example.com/authenticate", // URL not updated (PWA quirk)
        text: () => Promise.resolve(dashboardHtml),
      });

      const result = await submitLoginCredentials(authUrl, username, password, formFields);

      expect(result).toEqual({
        success: true,
        csrfToken: "pwa-csrf-token",
        dashboardHtml,
      });
    });

    it("falls through to error checks when redirected but no CSRF token", async () => {
      // If redirected to an error page (no CSRF token), should detect the error
      const errorHtml = `<html><body><v-snackbar color="error">Error!</v-snackbar></body></html>`;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        redirected: true,
        url: "https://example.com/authenticate",
        text: () => Promise.resolve(errorHtml),
      });

      const result = await submitLoginCredentials(authUrl, username, password, formFields);

      expect(result).toEqual({ success: false, error: "Invalid username or password" });
    });
  });

  describe("failed login", () => {
    it("returns error when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await submitLoginCredentials(authUrl, username, password, formFields);

      expect(result).toEqual({ success: false, error: "Authentication request failed" });
    });

    it("returns error when login page shows error indicator with double quotes", async () => {
      const errorHtml = `
        <html><body>
          <v-snackbar color="error">Error!</v-snackbar>
        </body></html>
      `;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        url: "https://example.com/login",
        text: () => Promise.resolve(errorHtml),
      });

      const result = await submitLoginCredentials(authUrl, username, password, formFields);

      expect(result).toEqual({ success: false, error: "Invalid username or password" });
    });

    it("returns error when login page shows error indicator with single quotes", async () => {
      const errorHtml = `
        <html><body>
          <v-snackbar color='error'>Error!</v-snackbar>
        </body></html>
      `;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        url: "https://example.com/login",
        text: () => Promise.resolve(errorHtml),
      });

      const result = await submitLoginCredentials(authUrl, username, password, formFields);

      expect(result).toEqual({ success: false, error: "Invalid username or password" });
    });

    it("returns TFA error when secondFactorToken field is present", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        url: "https://example.com/login",
        text: () => Promise.resolve(createTfaPageHtml()),
      });

      const result = await submitLoginCredentials(authUrl, username, password, formFields);

      expect(result).toEqual({
        success: false,
        error:
          "Two-factor authentication is not supported. Please disable it in your VolleyManager account settings to use this app.",
      });
    });

    it("returns TFA error when TOTP indicator is present", async () => {
      const tfaHtml = `<html><body>Please enter your TOTP code</body></html>`;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        url: "https://example.com/login",
        text: () => Promise.resolve(tfaHtml),
      });

      const result = await submitLoginCredentials(authUrl, username, password, formFields);

      expect(result).toEqual({
        success: false,
        error:
          "Two-factor authentication is not supported. Please disable it in your VolleyManager account settings to use this app.",
      });
    });

    it("returns error when redirected to dashboard but no CSRF token found", async () => {
      const dashboardWithoutToken = createDashboardHtml(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        url: "https://example.com/sportmanager.volleyball/main/dashboard",
        text: () => Promise.resolve(dashboardWithoutToken),
      });

      const result = await submitLoginCredentials(authUrl, username, password, formFields);

      expect(result).toEqual({
        success: false,
        error: "Login succeeded but session could not be established",
      });
    });

    it("returns generic error when unable to determine login result", async () => {
      const unknownHtml = `<html><body>Unknown page</body></html>`;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        url: "https://example.com/unknown",
        text: () => Promise.resolve(unknownHtml),
      });

      const result = await submitLoginCredentials(authUrl, username, password, formFields);

      expect(result).toEqual({ success: false, error: "Login failed - please try again" });
    });
  });
});
