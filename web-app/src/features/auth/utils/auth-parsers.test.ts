import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  extractLoginFormFields,
  extractCsrfTokenFromPage,
  submitLoginCredentials,
  isDashboardHtmlContent,
  type LoginFormFields,
} from "./auth-parsers";

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Helper to create a mock Response with proper headers
function createMockResponse(options: {
  ok?: boolean;
  status?: number;
  type?: ResponseType;
  url?: string;
  redirected?: boolean;
  headers?: Record<string, string>;
  body?: string;
}): Partial<Response> {
  const headers = new Map(Object.entries(options.headers ?? {}));
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    type: options.type ?? "basic",
    url: options.url ?? "",
    redirected: options.redirected ?? false,
    headers: {
      get: (name: string) => headers.get(name) ?? null,
      has: (name: string) => headers.has(name),
    } as Headers,
    text: () => Promise.resolve(options.body ?? ""),
    json: () => Promise.resolve(JSON.parse(options.body ?? "{}")),
  };
}

// Clear mocks before each test to prevent test pollution
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.resetAllMocks();
  vi.useRealTimers();
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
  const authUrl = "https://example.com/sportmanager.security/authentication/authenticate";
  const dashboardUrl = "https://example.com/sportmanager.volleyball/main/dashboard";
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

  describe("successful login with redirect: manual", () => {
    it("returns success when receiving 303 redirect to dashboard", async () => {
      const dashboardHtml = createDashboardHtml("success-csrf-token");

      // First call: auth POST returns 303 redirect
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 303,
          headers: { Location: dashboardUrl },
        })
      );

      // Second call: manual dashboard fetch returns dashboard with CSRF token
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          body: dashboardHtml,
        })
      );

      const resultPromise = submitLoginCredentials(authUrl, username, password, formFields);

      // Advance timers for the 100ms delay
      await vi.advanceTimersByTimeAsync(100);

      const result = await resultPromise;

      expect(result).toEqual({
        success: true,
        csrfToken: "success-csrf-token",
        dashboardHtml,
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("sends correct form data with redirect: manual", async () => {
      const dashboardHtml = createDashboardHtml("token");

      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 303,
          headers: { Location: dashboardUrl },
        })
      );
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          body: dashboardHtml,
        })
      );

      const resultPromise = submitLoginCredentials(authUrl, username, password, formFields);
      await vi.advanceTimersByTimeAsync(100);
      await resultPromise;

      expect(mockFetch).toHaveBeenNthCalledWith(1, authUrl, {
        method: "POST",
        credentials: "include",
        redirect: "manual",
        cache: "no-store",
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

    it("handles opaqueredirect by fetching dashboard directly", async () => {
      const dashboardHtml = createDashboardHtml("opaque-csrf-token");

      // First call: auth POST returns opaqueredirect
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 0,
          type: "opaqueredirect",
        })
      );

      // Second call: dashboard fetch succeeds
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          body: dashboardHtml,
        })
      );

      const resultPromise = submitLoginCredentials(authUrl, username, password, formFields);
      await vi.advanceTimersByTimeAsync(100);
      const result = await resultPromise;

      expect(result).toEqual({
        success: true,
        csrfToken: "opaque-csrf-token",
        dashboardHtml,
      });
    });

    it("succeeds with fallback when receiving 200 OK with dashboard content", async () => {
      // Fallback case: Some configurations might return 200 with dashboard directly
      const dashboardHtml = createDashboardHtml("fallback-token");
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          body: dashboardHtml,
        })
      );

      const result = await submitLoginCredentials(authUrl, username, password, formFields);

      expect(result).toEqual({
        success: true,
        csrfToken: "fallback-token",
        dashboardHtml,
      });
    });

    it("succeeds when redirected flag is true (legacy fallback)", async () => {
      // Legacy fallback: response.redirected might be true in some environments
      const dashboardHtml = createDashboardHtml("pwa-csrf-token");
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          redirected: true,
          body: dashboardHtml,
        })
      );

      const result = await submitLoginCredentials(authUrl, username, password, formFields);

      expect(result).toEqual({
        success: true,
        csrfToken: "pwa-csrf-token",
        dashboardHtml,
      });
    });
  });

  describe("failed login", () => {
    it("returns error when response is not ok and not a redirect", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 500,
          type: "basic",
        })
      );

      const result = await submitLoginCredentials(authUrl, username, password, formFields);

      expect(result).toEqual({ success: false, error: "Authentication request failed" });
    });

    it("returns error when login page shows error indicator with double quotes", async () => {
      const errorHtml = `
        <html><body>
          <v-snackbar color="error">Error!</v-snackbar>
        </body></html>
      `;
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          url: "https://example.com/login",
          body: errorHtml,
        })
      );

      const result = await submitLoginCredentials(authUrl, username, password, formFields);

      expect(result).toEqual({ success: false, error: "Invalid username or password" });
    });

    it("returns error when login page shows error indicator with single quotes", async () => {
      const errorHtml = `
        <html><body>
          <v-snackbar color='error'>Error!</v-snackbar>
        </body></html>
      `;
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          body: errorHtml,
        })
      );

      const result = await submitLoginCredentials(authUrl, username, password, formFields);

      expect(result).toEqual({ success: false, error: "Invalid username or password" });
    });

    it("returns TFA error when secondFactorToken field is present", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          body: createTfaPageHtml(),
        })
      );

      const result = await submitLoginCredentials(authUrl, username, password, formFields);

      expect(result).toEqual({
        success: false,
        error:
          "Two-factor authentication is not supported. Please disable it in your VolleyManager account settings to use this app.",
      });
    });

    it("returns TFA error when TOTP indicator is present", async () => {
      const tfaHtml = `<html><body>Please enter your TOTP code</body></html>`;
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          body: tfaHtml,
        })
      );

      const result = await submitLoginCredentials(authUrl, username, password, formFields);

      expect(result).toEqual({
        success: false,
        error:
          "Two-factor authentication is not supported. Please disable it in your VolleyManager account settings to use this app.",
      });
    });

    it("returns error when dashboard fetch fails after redirect", async () => {
      // First call: 303 redirect to dashboard
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 303,
          headers: { Location: dashboardUrl },
        })
      );

      // Second call: dashboard fetch fails
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 500,
        })
      );

      const resultPromise = submitLoginCredentials(authUrl, username, password, formFields);
      await vi.advanceTimersByTimeAsync(100);
      const result = await resultPromise;

      expect(result).toEqual({
        success: false,
        error: "Login succeeded but could not load dashboard",
      });
    });

    it("returns cookie error when dashboard returns login page after redirect", async () => {
      const loginPageHtml = `<html><body><form action="/login"><input id="username"/><input id="password"/></form></body></html>`;

      // First call: 303 redirect to dashboard
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 303,
          headers: { Location: dashboardUrl },
        })
      );

      // Second call: dashboard returns login page (cookie not sent)
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          body: loginPageHtml,
        })
      );

      const resultPromise = submitLoginCredentials(authUrl, username, password, formFields);
      await vi.advanceTimersByTimeAsync(100);
      const result = await resultPromise;

      expect(result).toEqual({
        success: false,
        error: "Login succeeded but session cookie failed. Please try again or use Safari browser.",
      });
    });

    it("returns generic error when unable to determine login result", async () => {
      const unknownHtml = `<html><body>Unknown page</body></html>`;
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          url: "https://example.com/unknown",
          body: unknownHtml,
        })
      );

      const result = await submitLoginCredentials(authUrl, username, password, formFields);

      expect(result).toEqual({ success: false, error: "Login failed - please try again" });
    });

    it("falls through to error checks when redirect detected but no CSRF token", async () => {
      const errorHtml = `<html><body><v-snackbar color="error">Error!</v-snackbar></body></html>`;
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: true,
          status: 200,
          redirected: true,
          body: errorHtml,
        })
      );

      const result = await submitLoginCredentials(authUrl, username, password, formFields);

      expect(result).toEqual({ success: false, error: "Invalid username or password" });
    });
  });

  describe("lockout handling", () => {
    it("returns lockout error with lockedUntil timestamp", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 423,
          body: JSON.stringify({ lockedUntil: 60, message: "Account locked for 60 seconds" }),
        })
      );

      const result = await submitLoginCredentials(authUrl, username, password, formFields);

      expect(result).toEqual({
        success: false,
        error: "Account locked for 60 seconds",
        lockedUntil: 60,
      });
    });

    it("returns default lockout error if response parsing fails", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 423,
          body: "invalid json",
        })
      );

      const result = await submitLoginCredentials(authUrl, username, password, formFields);

      expect(result).toEqual({
        success: false,
        error: "Account temporarily locked due to too many failed attempts",
      });
    });
  });
});

describe("isDashboardHtmlContent", () => {
  describe("dashboard detection", () => {
    it("returns true for dashboard page with CSRF token", () => {
      const html = '<html data-csrf-token="abc123"><body>Dashboard content</body></html>';
      expect(isDashboardHtmlContent(html)).toBe(true);
    });

    it("returns true for dashboard with double-quoted CSRF token", () => {
      const html = `<html data-csrf-token="token-value"><body>Dashboard</body></html>`;
      expect(isDashboardHtmlContent(html)).toBe(true);
    });

    it("returns true for dashboard with single-quoted CSRF token", () => {
      const html = `<html data-csrf-token='token-value'><body>Dashboard</body></html>`;
      expect(isDashboardHtmlContent(html)).toBe(true);
    });
  });

  describe("login page detection", () => {
    it("returns false for login page with form action", () => {
      const html = `<html><body><form action="/login"><input id="username"/><input id="password"/></form></body></html>`;
      expect(isDashboardHtmlContent(html)).toBe(false);
    });

    it("returns false for login page with username/password inputs", () => {
      const html = `<html><body><form><input id="username"/><input id="password"/></form></body></html>`;
      expect(isDashboardHtmlContent(html)).toBe(false);
    });

    it("returns false for login page even with CSRF token", () => {
      // Edge case: login page might have CSRF token but still has login form
      const html = `<html data-csrf-token="abc"><body><form action="/login"><input id="username"/><input id="password"/></form></body></html>`;
      expect(isDashboardHtmlContent(html)).toBe(false);
    });
  });

  describe("other pages", () => {
    it("returns false for page without CSRF token", () => {
      const html = "<html><body>No token here</body></html>";
      expect(isDashboardHtmlContent(html)).toBe(false);
    });

    it("returns false for empty HTML", () => {
      expect(isDashboardHtmlContent("")).toBe(false);
    });

    it("returns false for error page without CSRF token", () => {
      const html = `<html><body><v-snackbar color="error">Error!</v-snackbar></body></html>`;
      expect(isDashboardHtmlContent(html)).toBe(false);
    });
  });
});
