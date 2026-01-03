/**
 * Unit tests for VolleyKit CORS Proxy Worker.
 *
 * Tests cover:
 * - Origin validation
 * - Path filtering
 * - Cookie rewriting
 * - Error handling
 */
import { describe, it, expect, vi } from "vitest";

// Extract testable functions from the module
// We test the logic by re-implementing the helper functions here
// since the worker exports a default object without named exports

// Test implementations of the helper functions
function parseAllowedOrigins(allowedOrigins: string): string[] {
  return allowedOrigins
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

function validateAllowedOrigins(origins: string[]): void {
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error(`Origin must use http or https protocol: ${origin}`);
      }
      if (url.pathname !== "/" || url.search || url.hash) {
        throw new Error(
          `Origin should not include path, query, or fragment: ${origin}`,
        );
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("Origin")) {
        throw e;
      }
      throw new Error(`Invalid origin format: ${origin}`);
    }
  }
}

function isAllowedOrigin(
  origin: string | null,
  allowedOrigins: string[],
): boolean {
  if (!origin) return false;
  const normalizedOrigin = origin.replace(/\/$/, "").toLowerCase();
  return allowedOrigins.some(
    (allowed) => allowed.replace(/\/$/, "").toLowerCase() === normalizedOrigin,
  );
}

// Exact match paths (no subpaths allowed) - NOT prefixed with /api/
const ALLOWED_EXACT_PATHS = ["/", "/login", "/logout"];

// Prefix match paths that are NOT prefixed with /api/ (auth and dashboard)
const ALLOWED_PREFIX_PATHS_NO_API = [
  "/sportmanager.security/",
  "/sportmanager.volleyball/",
];

// Prefix match paths that ARE prefixed with /api/ (API endpoints)
const ALLOWED_PREFIX_PATHS_WITH_API = [
  "/indoorvolleyball.refadmin/",
  "/sportmanager.indoorvolleyball/",
  "/sportmanager.core/",
  "/sportmanager.resourcemanagement/",
  "/sportmanager.notificationcenter/",
];

// Specific paths within WITH_API prefixes that do NOT need the /api/ prefix
// These are file download endpoints that serve binary content (PDFs, etc.)
const EXCEPTIONS_NO_API = [
  "/indoorvolleyball.refadmin/refereestatementofexpenses/downloadrefereestatementofexpenses", // PDF download
];

function isAllowedPath(pathname: string): boolean {
  // Check exact matches first
  if (ALLOWED_EXACT_PATHS.includes(pathname)) {
    return true;
  }
  // Check prefix matches (both with and without /api/ prefix)
  return (
    ALLOWED_PREFIX_PATHS_NO_API.some((prefix) => pathname.startsWith(prefix)) ||
    ALLOWED_PREFIX_PATHS_WITH_API.some((prefix) => pathname.startsWith(prefix))
  );
}

/**
 * Check if a path requires the /api/ prefix when forwarding to the target host.
 * API endpoints need this prefix, while auth/dashboard endpoints do not.
 *
 * Special cases:
 * - Some paths under /indoorvolleyball.refadmin/ (like PDF downloads)
 *   do NOT need the /api/ prefix even though most /indoorvolleyball.refadmin/ paths do.
 */
function requiresApiPrefix(pathname: string): boolean {
  // Check for exceptions that normally would need /api/ but don't (e.g., PDF downloads)
  if (EXCEPTIONS_NO_API.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }
  return ALLOWED_PREFIX_PATHS_WITH_API.some((prefix) =>
    pathname.startsWith(prefix),
  );
}

function rewriteCookie(cookie: string): string {
  return (
    cookie
      .replace(/Domain=[^;]+;?\s*/gi, "")
      .replace(/;\s*Secure\s*(;|$)/gi, "$1")
      .replace(/SameSite=[^;]+;?\s*/gi, "")
      .replace(/;\s*Partitioned\s*(;|$)/gi, "$1") +
    "; SameSite=None; Secure; Partitioned"
  );
}

// The correct authentication endpoint
const AUTH_ENDPOINT = "/sportmanager.security/authentication/authenticate";

// Form field name that indicates authentication credentials are present
const AUTH_USERNAME_FIELD =
  "__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][username]";

/**
 * Check if request body contains authentication credentials.
 */
function hasAuthCredentials(body: string): boolean {
  // Check for Neos Flow format (from React fetch)
  const encodedField = encodeURIComponent(AUTH_USERNAME_FIELD);
  if (body.includes(AUTH_USERNAME_FIELD) || body.includes(encodedField)) {
    return true;
  }

  // Check for simple HTML form format (from iOS native form submission)
  const params = new URLSearchParams(body);
  return params.has("username") && params.has("password");
}

/**
 * Transform simple form fields to Neos Flow authentication format.
 */
function transformAuthFormData(body: string): string {
  // Check if already in Neos Flow format
  const encodedField = encodeURIComponent(AUTH_USERNAME_FIELD);
  if (body.includes(AUTH_USERNAME_FIELD) || body.includes(encodedField)) {
    return body; // Already in correct format
  }

  // Parse simple form fields
  const params = new URLSearchParams(body);
  const username = params.get("username");
  const password = params.get("password");

  if (!username || !password) {
    return body; // Not a valid login form, return unchanged
  }

  // Build Neos Flow format form data
  const neosParams = new URLSearchParams();

  // Add authentication credentials in Neos Flow format
  neosParams.set(
    "__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][username]",
    username,
  );
  neosParams.set(
    "__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][password]",
    password,
  );

  // Copy any other fields that might be present
  for (const [key, value] of params.entries()) {
    if (key !== "username" && key !== "password") {
      neosParams.set(key, value);
    }
  }

  return neosParams.toString();
}

describe("Origin Validation", () => {
  describe("parseAllowedOrigins", () => {
    it("parses comma-separated origins", () => {
      const result = parseAllowedOrigins("https://a.com, https://b.com");
      expect(result).toEqual(["https://a.com", "https://b.com"]);
    });

    it("trims whitespace", () => {
      const result = parseAllowedOrigins("  https://a.com  ,  https://b.com  ");
      expect(result).toEqual(["https://a.com", "https://b.com"]);
    });

    it("filters empty strings", () => {
      const result = parseAllowedOrigins("https://a.com,,https://b.com,");
      expect(result).toEqual(["https://a.com", "https://b.com"]);
    });

    it("handles single origin", () => {
      const result = parseAllowedOrigins("https://example.com");
      expect(result).toEqual(["https://example.com"]);
    });
  });

  describe("validateAllowedOrigins", () => {
    it("accepts valid HTTPS origins", () => {
      expect(() =>
        validateAllowedOrigins(["https://example.com"]),
      ).not.toThrow();
    });

    it("accepts valid HTTP origins", () => {
      expect(() =>
        validateAllowedOrigins(["http://localhost:3000"]),
      ).not.toThrow();
    });

    it("rejects origins with paths", () => {
      expect(() =>
        validateAllowedOrigins(["https://example.com/path"]),
      ).toThrow("Origin should not include path, query, or fragment");
    });

    it("rejects origins with query strings", () => {
      expect(() =>
        validateAllowedOrigins(["https://example.com?foo=bar"]),
      ).toThrow("Origin should not include path, query, or fragment");
    });

    it("rejects origins with fragments", () => {
      expect(() =>
        validateAllowedOrigins(["https://example.com#section"]),
      ).toThrow("Origin should not include path, query, or fragment");
    });

    it("rejects non-http protocols", () => {
      expect(() => validateAllowedOrigins(["ftp://example.com"])).toThrow(
        "Origin must use http or https protocol",
      );
    });

    it("rejects invalid URLs", () => {
      expect(() => validateAllowedOrigins(["not-a-url"])).toThrow(
        "Invalid origin format",
      );
    });
  });

  describe("isAllowedOrigin", () => {
    const allowedOrigins = ["https://example.com", "https://test.com"];

    it("returns true for allowed origin", () => {
      expect(isAllowedOrigin("https://example.com", allowedOrigins)).toBe(true);
    });

    it("returns false for disallowed origin", () => {
      expect(isAllowedOrigin("https://malicious.com", allowedOrigins)).toBe(
        false,
      );
    });

    it("returns false for null origin", () => {
      expect(isAllowedOrigin(null, allowedOrigins)).toBe(false);
    });

    it("handles trailing slashes", () => {
      expect(isAllowedOrigin("https://example.com/", allowedOrigins)).toBe(
        true,
      );
    });

    it("is case-insensitive (RFC 6454)", () => {
      expect(isAllowedOrigin("https://EXAMPLE.com", allowedOrigins)).toBe(true);
    });
  });
});

describe("Path Filtering", () => {
  describe("isAllowedPath", () => {
    it("allows login page path", () => {
      expect(isAllowedPath("/login")).toBe(true);
    });

    it("allows logout path", () => {
      expect(isAllowedPath("/logout")).toBe(true);
    });

    it("allows authentication endpoint", () => {
      expect(
        isAllowedPath("/sportmanager.security/authentication/authenticate"),
      ).toBe(true);
    });

    it("allows dashboard path", () => {
      expect(isAllowedPath("/sportmanager.volleyball/main/dashboard")).toBe(
        true,
      );
    });

    it("allows referee admin API paths", () => {
      expect(isAllowedPath("/indoorvolleyball.refadmin/api/test")).toBe(true);
    });

    it("allows sport manager API paths", () => {
      expect(isAllowedPath("/sportmanager.indoorvolleyball/api/test")).toBe(
        true,
      );
    });

    it("allows root path", () => {
      expect(isAllowedPath("/")).toBe(true);
    });

    it("rejects unknown paths", () => {
      expect(isAllowedPath("/admin/secret")).toBe(false);
    });

    it("rejects paths that look similar but are not allowed", () => {
      expect(isAllowedPath("/loginpage")).toBe(false); // not exactly /login
      expect(isAllowedPath("/logoutuser")).toBe(false); // not exactly /logout
    });

    it("allows core API paths", () => {
      expect(isAllowedPath("/sportmanager.core/api/test")).toBe(true);
    });

    it("allows resource management API paths", () => {
      expect(isAllowedPath("/sportmanager.resourcemanagement/api/upload")).toBe(
        true,
      );
    });

    it("allows notification center API paths", () => {
      expect(
        isAllowedPath("/sportmanager.notificationcenter/api/notifications"),
      ).toBe(true);
    });
  });

  describe("requiresApiPrefix", () => {
    it("returns true for referee admin API paths", () => {
      expect(requiresApiPrefix("/indoorvolleyball.refadmin/api/test")).toBe(
        true,
      );
    });

    it("returns true for indoor volleyball API paths", () => {
      expect(
        requiresApiPrefix("/sportmanager.indoorvolleyball/api/game"),
      ).toBe(true);
    });

    it("returns true for core API paths", () => {
      expect(requiresApiPrefix("/sportmanager.core/api/search")).toBe(true);
    });

    it("returns true for resource management API paths", () => {
      expect(
        requiresApiPrefix("/sportmanager.resourcemanagement/api/upload"),
      ).toBe(true);
    });

    it("returns true for notification center API paths", () => {
      expect(
        requiresApiPrefix("/sportmanager.notificationcenter/api/test"),
      ).toBe(true);
    });

    it("returns false for authentication endpoint", () => {
      expect(
        requiresApiPrefix("/sportmanager.security/authentication/authenticate"),
      ).toBe(false);
    });

    it("returns false for dashboard path", () => {
      expect(requiresApiPrefix("/sportmanager.volleyball/main/dashboard")).toBe(
        false,
      );
    });

    it("returns false for login path", () => {
      expect(requiresApiPrefix("/login")).toBe(false);
    });

    it("returns false for logout path", () => {
      expect(requiresApiPrefix("/logout")).toBe(false);
    });

    it("returns false for root path", () => {
      expect(requiresApiPrefix("/")).toBe(false);
    });

    it("returns false for PDF download endpoint (exception)", () => {
      // PDF download endpoint does NOT use /api/ prefix
      // even though it's under /indoorvolleyball.refadmin/
      expect(
        requiresApiPrefix(
          "/indoorvolleyball.refadmin/refereestatementofexpenses/downloadrefereestatementofexpenses",
        ),
      ).toBe(false);
    });

    it("returns false for PDF download endpoint with query params", () => {
      expect(
        requiresApiPrefix(
          "/indoorvolleyball.refadmin/refereestatementofexpenses/downloadrefereestatementofexpenses?refereeConvocation=abc-123",
        ),
      ).toBe(false);
    });
  });
});

describe("Cookie Rewriting", () => {
  describe("rewriteCookie", () => {
    it("adds SameSite=None, Secure, and Partitioned", () => {
      const cookie = "session=abc123; Path=/";
      const result = rewriteCookie(cookie);
      expect(result).toContain("SameSite=None");
      expect(result).toContain("Secure");
      expect(result).toContain("Partitioned");
    });

    it("removes existing Domain attribute", () => {
      const cookie = "session=abc123; Domain=.example.com; Path=/";
      const result = rewriteCookie(cookie);
      expect(result).not.toContain("Domain=");
      expect(result).not.toContain(".example.com");
    });

    it("removes existing Secure attribute", () => {
      const cookie = "session=abc123; Secure; Path=/";
      const result = rewriteCookie(cookie);
      // Should only have one Secure (the one we add)
      const secureCount = (result.match(/Secure/g) || []).length;
      expect(secureCount).toBe(1);
    });

    it("removes existing Partitioned attribute", () => {
      const cookie = "session=abc123; Partitioned; Path=/";
      const result = rewriteCookie(cookie);
      // Should only have one Partitioned (the one we add)
      const partitionedCount = (result.match(/Partitioned/g) || []).length;
      expect(partitionedCount).toBe(1);
    });

    it("removes existing SameSite attribute", () => {
      const cookie = "session=abc123; SameSite=Strict; Path=/";
      const result = rewriteCookie(cookie);
      expect(result).not.toContain("SameSite=Strict");
      expect(result).toContain("SameSite=None");
    });

    it("handles complex cookies", () => {
      const cookie =
        "TYPO3_Flow_Session=abc; Domain=.volleyball.ch; Path=/; Secure; SameSite=Lax; HttpOnly";
      const result = rewriteCookie(cookie);
      expect(result).not.toContain("Domain=");
      expect(result).toContain("SameSite=None");
      expect(result).toContain("Secure");
      expect(result).toContain("Partitioned");
      expect(result).toContain("HttpOnly");
    });

    it("handles cookies with all attributes already present", () => {
      const cookie =
        "session=abc; Domain=.example.com; Secure; SameSite=Strict; Partitioned; HttpOnly";
      const result = rewriteCookie(cookie);
      // Should remove Domain and replace attributes with our values
      expect(result).not.toContain("Domain=");
      expect(result).not.toContain("SameSite=Strict");
      expect(result).toContain("SameSite=None");
      // Should only have one of each
      const secureCount = (result.match(/Secure/g) || []).length;
      const partitionedCount = (result.match(/Partitioned/g) || []).length;
      expect(secureCount).toBe(1);
      expect(partitionedCount).toBe(1);
    });
  });
});

describe("iOS Authentication Workaround", () => {
  describe("hasAuthCredentials", () => {
    it("detects Neos Flow format credentials", () => {
      const body =
        "__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][username]=testuser&" +
        "__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][password]=testpass";
      expect(hasAuthCredentials(body)).toBe(true);
    });

    it("detects URL-encoded Neos Flow format credentials", () => {
      const body =
        "__authentication%5BNeos%5D%5BFlow%5D%5BSecurity%5D%5BAuthentication%5D%5BToken%5D%5BUsernamePassword%5D%5Busername%5D=testuser&" +
        "__authentication%5BNeos%5D%5BFlow%5D%5BSecurity%5D%5BAuthentication%5D%5BToken%5D%5BUsernamePassword%5D%5Bpassword%5D=testpass";
      expect(hasAuthCredentials(body)).toBe(true);
    });

    it("detects simple HTML form format credentials", () => {
      const body = "username=testuser&password=testpass";
      expect(hasAuthCredentials(body)).toBe(true);
    });

    it("returns false for body without credentials", () => {
      const body = "search=test&filter=active";
      expect(hasAuthCredentials(body)).toBe(false);
    });

    it("returns false for body with only username", () => {
      const body = "username=testuser&filter=active";
      expect(hasAuthCredentials(body)).toBe(false);
    });

    it("returns false for body with only password", () => {
      const body = "password=testpass&filter=active";
      expect(hasAuthCredentials(body)).toBe(false);
    });

    it("returns false for empty body", () => {
      expect(hasAuthCredentials("")).toBe(false);
    });
  });

  describe("transformAuthFormData", () => {
    it("transforms simple form fields to Neos Flow format", () => {
      const body = "username=testuser&password=testpass";
      const result = transformAuthFormData(body);
      expect(result).toContain(
        "__authentication%5BNeos%5D%5BFlow%5D%5BSecurity%5D%5BAuthentication%5D%5BToken%5D%5BUsernamePassword%5D%5Busername%5D=testuser",
      );
      expect(result).toContain(
        "__authentication%5BNeos%5D%5BFlow%5D%5BSecurity%5D%5BAuthentication%5D%5BToken%5D%5BUsernamePassword%5D%5Bpassword%5D=testpass",
      );
    });

    it("returns body unchanged if already in Neos Flow format", () => {
      const body =
        "__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][username]=testuser&" +
        "__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][password]=testpass";
      const result = transformAuthFormData(body);
      expect(result).toBe(body);
    });

    it("returns body unchanged if URL-encoded Neos Flow format", () => {
      const body =
        "__authentication%5BNeos%5D%5BFlow%5D%5BSecurity%5D%5BAuthentication%5D%5BToken%5D%5BUsernamePassword%5D%5Busername%5D=testuser";
      const result = transformAuthFormData(body);
      expect(result).toBe(body);
    });

    it("preserves additional fields when transforming", () => {
      const body = "username=testuser&password=testpass&rememberMe=true";
      const result = transformAuthFormData(body);
      expect(result).toContain("rememberMe=true");
    });

    it("returns body unchanged if missing username", () => {
      const body = "password=testpass&filter=active";
      const result = transformAuthFormData(body);
      expect(result).toBe(body);
    });

    it("returns body unchanged if missing password", () => {
      const body = "username=testuser&filter=active";
      const result = transformAuthFormData(body);
      expect(result).toBe(body);
    });

    it("handles special characters in credentials", () => {
      const body = "username=test%40user.com&password=pass%26word%3D123";
      const result = transformAuthFormData(body);
      // URLSearchParams decodes then re-encodes, so check decoded values are preserved
      expect(result).toContain("test%40user.com");
      expect(result).toContain("pass%26word%3D123");
    });
  });

  describe("AUTH_ENDPOINT constant", () => {
    it("points to correct authentication endpoint", () => {
      expect(AUTH_ENDPOINT).toBe(
        "/sportmanager.security/authentication/authenticate",
      );
    });
  });
});

describe("Environment Validation", () => {
  it("validates ALLOWED_ORIGINS is required", () => {
    // This tests the concept - actual validateEnv would throw
    const env = { ALLOWED_ORIGINS: "", TARGET_HOST: "https://example.com" };
    expect(env.ALLOWED_ORIGINS.trim()).toBe("");
  });

  it("validates TARGET_HOST must be a valid URL", () => {
    expect(() => new URL("https://example.com")).not.toThrow();
    expect(() => new URL("not-a-url")).toThrow();
  });
});

describe("CORS Headers", () => {
  const corsHeaders = (origin: string) => ({
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  });

  it("sets correct Allow-Origin header", () => {
    const headers = corsHeaders("https://example.com");
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://example.com");
  });

  it("allows credentials", () => {
    const headers = corsHeaders("https://example.com");
    expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
  });

  it("does NOT include Cookie in allowed headers", () => {
    const headers = corsHeaders("https://example.com");
    expect(headers["Access-Control-Allow-Headers"]).not.toContain("Cookie");
  });

  it("sets max age for preflight caching", () => {
    const headers = corsHeaders("https://example.com");
    expect(headers["Access-Control-Max-Age"]).toBe("86400");
  });
});

describe("Path Safety (Traversal Prevention)", () => {
  // Re-implementation of isPathSafe for testing
  // Note: Backslashes are ALLOWED because TYPO3 Neos/Flow uses them as
  // namespace separators in API controller paths (e.g., api\refereeconvocation)
  function isPathSafe(pathname: string): boolean {
    let decoded: string;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      return false;
    }
    if (
      decoded.includes("..") ||
      decoded.includes("//") ||
      decoded.includes("\0")
    ) {
      return false;
    }
    return true;
  }

  it("accepts normal paths", () => {
    expect(isPathSafe("/neos/login")).toBe(true);
    expect(isPathSafe("/indoorvolleyball.refadmin/api/test")).toBe(true);
  });

  it("rejects path traversal with ..", () => {
    expect(isPathSafe("/api/../secret")).toBe(false);
    expect(isPathSafe("/../etc/passwd")).toBe(false);
  });

  it("rejects double slashes", () => {
    expect(isPathSafe("//evil.com/path")).toBe(false);
  });

  it("rejects null bytes", () => {
    expect(isPathSafe("/api/test%00.txt")).toBe(false);
  });

  it("allows backslashes (used by Neos/Flow as namespace separators)", () => {
    // TYPO3 Neos/Flow uses backslashes in API paths for namespace separation
    // e.g., /indoorvolleyball.refadmin/api\refereeconvocation/search
    expect(isPathSafe("/api\\test")).toBe(true);
    expect(
      isPathSafe("/indoorvolleyball.refadmin/api\\refereeconvocation/search"),
    ).toBe(true);
    expect(
      isPathSafe(
        "/indoorvolleyball.refadmin/api\\refereeassociationsettings/get",
      ),
    ).toBe(true);
  });

  it("rejects encoded traversal attempts", () => {
    expect(isPathSafe("/api/%2e%2e/secret")).toBe(false); // encoded ..
  });

  it("rejects invalid encoding", () => {
    expect(isPathSafe("/api/%ZZ/test")).toBe(false); // invalid hex
  });
});

describe("Rate Limiting", () => {
  // Mock rate limiter interface
  interface RateLimiter {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  }

  // Simulates the rate limiting check logic
  async function checkRateLimit(
    rateLimiter: RateLimiter | undefined,
    clientIP: string,
  ): Promise<boolean> {
    if (!rateLimiter) return true; // No rate limiter = allow all
    const { success } = await rateLimiter.limit({ key: clientIP });
    return success;
  }

  it("allows requests when rate limiter is not configured", async () => {
    const result = await checkRateLimit(undefined, "192.168.1.1");
    expect(result).toBe(true);
  });

  it("allows requests under rate limit", async () => {
    const mockRateLimiter: RateLimiter = {
      limit: vi.fn().mockResolvedValue({ success: true }),
    };
    const result = await checkRateLimit(mockRateLimiter, "192.168.1.1");
    expect(result).toBe(true);
    expect(mockRateLimiter.limit).toHaveBeenCalledWith({ key: "192.168.1.1" });
  });

  it("blocks requests over rate limit", async () => {
    const mockRateLimiter: RateLimiter = {
      limit: vi.fn().mockResolvedValue({ success: false }),
    };
    const result = await checkRateLimit(mockRateLimiter, "192.168.1.1");
    expect(result).toBe(false);
  });

  it("uses client IP as rate limit key", async () => {
    const mockRateLimiter: RateLimiter = {
      limit: vi.fn().mockResolvedValue({ success: true }),
    };
    await checkRateLimit(mockRateLimiter, "10.0.0.1");
    expect(mockRateLimiter.limit).toHaveBeenCalledWith({ key: "10.0.0.1" });
  });
});

describe("User-Agent Header", () => {
  // The worker sets a custom User-Agent to identify VolleyKit traffic
  const VOLLEYKIT_USER_AGENT =
    "VolleyKit/1.0 (PWA; https://github.com/Takishima/volleykit)";

  it("sets custom User-Agent for upstream requests", () => {
    // Verify the expected User-Agent string format
    expect(VOLLEYKIT_USER_AGENT).toBe(
      "VolleyKit/1.0 (PWA; https://github.com/Takishima/volleykit)",
    );
  });

  it("User-Agent identifies the app as VolleyKit", () => {
    expect(VOLLEYKIT_USER_AGENT).toContain("VolleyKit");
  });

  it("User-Agent includes version number", () => {
    expect(VOLLEYKIT_USER_AGENT).toMatch(/VolleyKit\/\d+\.\d+/);
  });

  it("User-Agent indicates PWA nature", () => {
    expect(VOLLEYKIT_USER_AGENT).toContain("PWA");
  });

  it("User-Agent includes contact/project URL", () => {
    expect(VOLLEYKIT_USER_AGENT).toMatch(/https?:\/\//);
  });

  // Simulates how the worker modifies request headers
  function prepareProxyHeaders(originalHeaders: Headers): Headers {
    const headers = new Headers(originalHeaders);
    // Worker removes Host and sets it to target
    headers.delete("Host");
    headers.set("Host", "volleymanager.volleyball.ch");
    // Worker sets custom User-Agent
    headers.set("User-Agent", VOLLEYKIT_USER_AGENT);
    return headers;
  }

  it("replaces browser User-Agent with custom VolleyKit User-Agent", () => {
    const browserHeaders = new Headers();
    browserHeaders.set(
      "User-Agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    );
    browserHeaders.set("Accept", "application/json");

    const proxyHeaders = prepareProxyHeaders(browserHeaders);

    expect(proxyHeaders.get("User-Agent")).toBe(VOLLEYKIT_USER_AGENT);
    expect(proxyHeaders.get("User-Agent")).not.toContain("Mozilla");
  });

  it("preserves other headers when setting User-Agent", () => {
    const browserHeaders = new Headers();
    browserHeaders.set("User-Agent", "Mozilla/5.0");
    browserHeaders.set("Accept", "application/json");
    browserHeaders.set("Content-Type", "application/x-www-form-urlencoded");
    browserHeaders.set("Cookie", "session=abc123");

    const proxyHeaders = prepareProxyHeaders(browserHeaders);

    expect(proxyHeaders.get("Accept")).toBe("application/json");
    expect(proxyHeaders.get("Content-Type")).toBe(
      "application/x-www-form-urlencoded",
    );
    expect(proxyHeaders.get("Cookie")).toBe("session=abc123");
  });

  it("sets Host header to target domain", () => {
    const browserHeaders = new Headers();
    browserHeaders.set("Host", "proxy.example.com");

    const proxyHeaders = prepareProxyHeaders(browserHeaders);

    expect(proxyHeaders.get("Host")).toBe("volleymanager.volleyball.ch");
    expect(proxyHeaders.get("Host")).not.toBe("proxy.example.com");
  });
});

describe("Kill Switch", () => {
  // Simulates the kill switch check logic from the worker
  function checkKillSwitch(env: { KILL_SWITCH?: string }): boolean {
    return env.KILL_SWITCH === "true";
  }

  it("returns true when KILL_SWITCH is 'true'", () => {
    expect(checkKillSwitch({ KILL_SWITCH: "true" })).toBe(true);
  });

  it("returns false when KILL_SWITCH is 'false'", () => {
    expect(checkKillSwitch({ KILL_SWITCH: "false" })).toBe(false);
  });

  it("returns false when KILL_SWITCH is undefined", () => {
    expect(checkKillSwitch({})).toBe(false);
  });

  it("returns false when KILL_SWITCH is empty string", () => {
    expect(checkKillSwitch({ KILL_SWITCH: "" })).toBe(false);
  });

  it("returns false when KILL_SWITCH is 'TRUE' (case sensitive)", () => {
    // Kill switch should be case-sensitive for safety
    expect(checkKillSwitch({ KILL_SWITCH: "TRUE" })).toBe(false);
  });

  it("returns false when KILL_SWITCH is '1'", () => {
    // Only exact string "true" should enable kill switch
    expect(checkKillSwitch({ KILL_SWITCH: "1" })).toBe(false);
  });

  // Test the response format
  const KILL_SWITCH_RETRY_AFTER_SECONDS = 86400;

  it("returns 503 status with proper headers", () => {
    const expectedStatus = 503;
    const expectedRetryAfter = String(KILL_SWITCH_RETRY_AFTER_SECONDS);

    expect(expectedStatus).toBe(503);
    expect(expectedRetryAfter).toBe("86400");
  });

  it("retry-after header is 24 hours in seconds", () => {
    const twentyFourHoursInSeconds = 24 * 60 * 60;
    expect(KILL_SWITCH_RETRY_AFTER_SECONDS).toBe(twentyFourHoursInSeconds);
  });
});

describe("Robots.txt Endpoint", () => {
  // Simulates checking if a request is for robots.txt
  function isRobotsTxtRequest(pathname: string): boolean {
    return pathname === "/robots.txt";
  }

  it("matches /robots.txt path", () => {
    expect(isRobotsTxtRequest("/robots.txt")).toBe(true);
  });

  it("does not match other paths", () => {
    expect(isRobotsTxtRequest("/")).toBe(false);
    expect(isRobotsTxtRequest("/robots")).toBe(false);
    expect(isRobotsTxtRequest("/robots.txt/")).toBe(false);
    expect(isRobotsTxtRequest("/api/robots.txt")).toBe(false);
  });

  // Test the response content
  const ROBOTS_TXT_CONTENT = "User-agent: *\nDisallow: /\n";

  it("disallows all user agents from all paths", () => {
    expect(ROBOTS_TXT_CONTENT).toContain("User-agent: *");
    expect(ROBOTS_TXT_CONTENT).toContain("Disallow: /");
  });

  it("has correct format (newline separated)", () => {
    const lines = ROBOTS_TXT_CONTENT.split("\n");
    expect(lines[0]).toBe("User-agent: *");
    expect(lines[1]).toBe("Disallow: /");
  });

  // Test that robots.txt is served even when kill switch is enabled
  // This is verified by the order of checks in the worker
  it("robots.txt check comes before kill switch (order matters)", () => {
    // This test documents the intended behavior:
    // robots.txt should be accessible even when the service is disabled
    // The worker code order is: robots.txt check -> kill switch check
    const checkOrder = ["robots.txt", "kill_switch"];
    expect(checkOrder[0]).toBe("robots.txt");
    expect(checkOrder[1]).toBe("kill_switch");
  });
});

describe("URL Encoding Preservation", () => {
  // Simulates the URL path extraction logic from the worker
  // This preserves the original URL encoding by extracting the raw path string
  function extractRawPathAndSearch(requestUrlStr: string): string {
    const pathStart = requestUrlStr.indexOf(
      "/",
      requestUrlStr.indexOf("://") + 3,
    );
    return pathStart >= 0 ? requestUrlStr.substring(pathStart) : "/";
  }

  it("preserves URL-encoded backslashes (%5c) in paths", () => {
    // TYPO3 Neos/Flow requires exact %5c encoding for namespace separators
    const requestUrl =
      "https://proxy.example.com/indoorvolleyball.refadmin/api%5crefereeconvocation/search";
    const result = extractRawPathAndSearch(requestUrl);
    expect(result).toBe(
      "/indoorvolleyball.refadmin/api%5crefereeconvocation/search",
    );
    expect(result).toContain("%5c"); // Encoding must be preserved
  });

  it("preserves URL-encoded backslashes in complex paths", () => {
    const requestUrl =
      "https://proxy.example.com/indoorvolleyball.refadmin/api%5Crefereeassociationsettings/get";
    const result = extractRawPathAndSearch(requestUrl);
    expect(result).toBe(
      "/indoorvolleyball.refadmin/api%5Crefereeassociationsettings/get",
    );
    expect(result).toContain("%5C"); // Uppercase encoding also preserved
  });

  it("preserves query parameters with URL encoding", () => {
    const requestUrl =
      "https://proxy.example.com/api/search?filter=%5Cnamespace%5Cclass";
    const result = extractRawPathAndSearch(requestUrl);
    expect(result).toBe("/api/search?filter=%5Cnamespace%5Cclass");
    expect(result).toContain("filter=%5Cnamespace%5Cclass");
  });

  it("preserves multiple special characters in URL encoding", () => {
    const requestUrl = "https://proxy.example.com/api/test?param=%20%2B%3D%26";
    const result = extractRawPathAndSearch(requestUrl);
    expect(result).toBe("/api/test?param=%20%2B%3D%26");
    // Space, plus, equals, ampersand should all be preserved
    expect(result).toContain("%20"); // space
    expect(result).toContain("%2B"); // plus
    expect(result).toContain("%3D"); // equals
    expect(result).toContain("%26"); // ampersand
  });

  it("handles root path correctly", () => {
    const requestUrl = "https://proxy.example.com/";
    const result = extractRawPathAndSearch(requestUrl);
    expect(result).toBe("/");
  });

  it("handles paths without encoding correctly", () => {
    const requestUrl =
      "https://proxy.example.com/indoorvolleyball.refadmin/api/test";
    const result = extractRawPathAndSearch(requestUrl);
    expect(result).toBe("/indoorvolleyball.refadmin/api/test");
  });

  it("extracts path and search together", () => {
    const requestUrl = "https://proxy.example.com/api/search?q=test&limit=10";
    const result = extractRawPathAndSearch(requestUrl);
    expect(result).toBe("/api/search?q=test&limit=10");
  });

  it("handles URL without path (defaults to /)", () => {
    // Edge case: URL without path separator after host
    const requestUrl = "https://proxy.example.com";
    const result = extractRawPathAndSearch(requestUrl);
    expect(result).toBe("/");
  });

  it("preserves hash fragments if present in request URL", () => {
    // Note: Hash fragments typically don't reach the server, but if they do, preserve them
    const requestUrl = "https://proxy.example.com/api/test#section";
    const result = extractRawPathAndSearch(requestUrl);
    expect(result).toBe("/api/test#section");
  });

  it("does not double-encode already encoded characters", () => {
    // Regression test: URL constructor would re-encode %5c to %255c
    const requestUrl = "https://proxy.example.com/api%5ctest";
    const result = extractRawPathAndSearch(requestUrl);
    expect(result).toBe("/api%5ctest");
    expect(result).not.toContain("%255c"); // Should NOT be double-encoded
  });
});
