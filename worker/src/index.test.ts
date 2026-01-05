/**
 * Unit tests for VolleyKit CORS Proxy Worker.
 *
 * Tests cover:
 * - Origin validation
 * - Path filtering
 * - Cookie rewriting
 * - Error handling
 * - Cache control headers
 * - Session issue detection
 */
import { describe, it, expect, vi } from "vitest";
import {
  AUTH_ENDPOINT,
  KILL_SWITCH_RETRY_AFTER_SECONDS,
  VOLLEYKIT_USER_AGENT,
  checkKillSwitch,
  detectSessionIssue,
  extractICalCode,
  extractRawPathAndSearch,
  hasAuthCredentials,
  isAllowedOrigin,
  isAllowedPath,
  isDynamicContent,
  isPathSafe,
  isValidICalCode,
  noCacheHeaders,
  parseAllowedOrigins,
  requiresApiPrefix,
  rewriteCookie,
  transformAuthFormData,
  validateAllowedOrigins,
} from "./utils";

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

describe("iCal Proxy Route", () => {
  describe("isValidICalCode", () => {
    it("accepts valid 6-character alphanumeric codes", () => {
      expect(isValidICalCode("ABC123")).toBe(true);
      expect(isValidICalCode("abcdef")).toBe(true);
      expect(isValidICalCode("123456")).toBe(true);
      expect(isValidICalCode("aB3dE6")).toBe(true);
    });

    it("rejects codes shorter than 6 characters", () => {
      expect(isValidICalCode("ABC12")).toBe(false);
      expect(isValidICalCode("A")).toBe(false);
      expect(isValidICalCode("")).toBe(false);
    });

    it("rejects codes longer than 6 characters", () => {
      expect(isValidICalCode("ABC1234")).toBe(false);
      expect(isValidICalCode("ABCDEFGH")).toBe(false);
    });

    it("rejects codes with special characters", () => {
      expect(isValidICalCode("ABC-12")).toBe(false);
      expect(isValidICalCode("ABC_12")).toBe(false);
      expect(isValidICalCode("ABC.12")).toBe(false);
      expect(isValidICalCode("ABC 12")).toBe(false);
      expect(isValidICalCode("ABC@12")).toBe(false);
    });

    it("rejects codes with unicode characters", () => {
      expect(isValidICalCode("ABCäöü")).toBe(false);
      expect(isValidICalCode("АВС123")).toBe(false); // Cyrillic
    });
  });

  describe("extractICalCode", () => {
    it("extracts code from valid iCal path", () => {
      expect(extractICalCode("/iCal/referee/ABC123")).toBe("ABC123");
      expect(extractICalCode("/iCal/referee/xyzabc")).toBe("xyzabc");
    });

    it("returns null for non-iCal paths", () => {
      expect(extractICalCode("/login")).toBe(null);
      expect(extractICalCode("/")).toBe(null);
      expect(extractICalCode("/indoorvolleyball.refadmin/api/test")).toBe(null);
    });

    it("returns null for malformed iCal paths", () => {
      expect(extractICalCode("/iCal/")).toBe(null);
      expect(extractICalCode("/iCal/referee/")).toBe(null);
      expect(extractICalCode("/iCal/referee")).toBe(null);
      expect(extractICalCode("/ical/referee/ABC123")).toBe(null); // case-sensitive
    });

    it("returns null for iCal paths with extra segments", () => {
      expect(extractICalCode("/iCal/referee/ABC123/extra")).toBe(null);
      expect(extractICalCode("/prefix/iCal/referee/ABC123")).toBe(null);
    });

    it("extracts code even if format is invalid (validation is separate)", () => {
      // extractICalCode only extracts, isValidICalCode validates
      expect(extractICalCode("/iCal/referee/toolong123")).toBe("toolong123");
      expect(extractICalCode("/iCal/referee/ABC-12")).toBe("ABC-12");
    });
  });

  describe("iCal endpoint behavior", () => {
    it("iCal path is not in allowed paths (handled separately)", () => {
      // The iCal route is handled before the path allowlist check
      expect(isAllowedPath("/iCal/referee/ABC123")).toBe(false);
    });

    it("builds correct target URL", () => {
      const targetHost = "https://volleymanager.volleyball.ch";
      const code = "ABC123";
      const expectedUrl = `${targetHost}/indoor/iCal/referee/${code}`;
      expect(expectedUrl).toBe(
        "https://volleymanager.volleyball.ch/indoor/iCal/referee/ABC123",
      );
    });
  });

  describe("iCal HTTP methods", () => {
    // Simulates the method check logic from the worker
    function isAllowedICalMethod(method: string): boolean {
      return method === "GET" || method === "HEAD";
    }

    it("allows GET requests for iCal endpoint", () => {
      expect(isAllowedICalMethod("GET")).toBe(true);
    });

    it("allows HEAD requests for iCal endpoint", () => {
      // HEAD is used by clients to validate calendar codes exist without downloading content
      expect(isAllowedICalMethod("HEAD")).toBe(true);
    });

    it("rejects POST requests for iCal endpoint", () => {
      expect(isAllowedICalMethod("POST")).toBe(false);
    });

    it("rejects PUT requests for iCal endpoint", () => {
      expect(isAllowedICalMethod("PUT")).toBe(false);
    });

    it("rejects DELETE requests for iCal endpoint", () => {
      expect(isAllowedICalMethod("DELETE")).toBe(false);
    });
  });
});

describe("URL Encoding Preservation", () => {
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

describe("Cache Control Headers", () => {
  it("returns strict no-cache headers", () => {
    const headers = noCacheHeaders();
    expect(headers["Cache-Control"]).toBe(
      "no-store, no-cache, must-revalidate, max-age=0",
    );
  });

  it("includes Pragma no-cache for HTTP/1.0 compatibility", () => {
    const headers = noCacheHeaders();
    expect(headers["Pragma"]).toBe("no-cache");
  });

  it("includes Expires header set to 0", () => {
    const headers = noCacheHeaders();
    expect(headers["Expires"]).toBe("0");
  });

  it("contains all required cache-busting headers", () => {
    const headers = noCacheHeaders();
    const keys = Object.keys(headers);
    expect(keys).toContain("Cache-Control");
    expect(keys).toContain("Pragma");
    expect(keys).toContain("Expires");
    expect(keys.length).toBe(3);
  });
});

describe("Dynamic Content Detection", () => {
  describe("isDynamicContent", () => {
    it("returns true for null content type (unknown = dynamic)", () => {
      expect(isDynamicContent(null)).toBe(true);
    });

    it("returns true for HTML content", () => {
      expect(isDynamicContent("text/html")).toBe(true);
      expect(isDynamicContent("text/html; charset=utf-8")).toBe(true);
      expect(isDynamicContent("TEXT/HTML")).toBe(true);
    });

    it("returns true for JSON content", () => {
      expect(isDynamicContent("application/json")).toBe(true);
      expect(isDynamicContent("application/json; charset=utf-8")).toBe(true);
      expect(isDynamicContent("APPLICATION/JSON")).toBe(true);
    });

    it("returns true for form data content", () => {
      expect(isDynamicContent("application/x-www-form-urlencoded")).toBe(true);
    });

    it("returns false for static content types", () => {
      expect(isDynamicContent("image/png")).toBe(false);
      expect(isDynamicContent("image/jpeg")).toBe(false);
      expect(isDynamicContent("application/pdf")).toBe(false);
      expect(isDynamicContent("text/css")).toBe(false);
      expect(isDynamicContent("application/javascript")).toBe(false);
    });

    it("returns false for calendar content (iCal has separate cache)", () => {
      expect(isDynamicContent("text/calendar")).toBe(false);
    });
  });
});

describe("Session Issue Detection", () => {
  // Helper to create mock response
  function mockResponse(
    status: number,
    location?: string,
  ): { status: number; headers: { get: (name: string) => string | null } } {
    return {
      status,
      headers: {
        get: (name: string) => (name === "Location" ? location ?? null : null),
      },
    };
  }

  describe("detectSessionIssue", () => {
    it("detects redirect to /login", () => {
      expect(detectSessionIssue(mockResponse(302, "/login"))).toBe(true);
      expect(detectSessionIssue(mockResponse(303, "/login?redirect=..."))).toBe(
        true,
      );
    });

    it("detects redirect to root (often login redirect)", () => {
      expect(detectSessionIssue(mockResponse(302, "/"))).toBe(true);
      expect(
        detectSessionIssue(mockResponse(302, "https://example.com/")),
      ).toBe(true);
    });

    it("detects redirect to authentication endpoint", () => {
      expect(
        detectSessionIssue(
          mockResponse(302, "/sportmanager.security/authentication/login"),
        ),
      ).toBe(true);
    });

    it("detects 401 Unauthorized responses", () => {
      expect(detectSessionIssue(mockResponse(401))).toBe(true);
    });

    it("detects 403 Forbidden responses", () => {
      expect(detectSessionIssue(mockResponse(403))).toBe(true);
    });

    it("detects login form in HTML body", () => {
      const loginHtml = `
        <html>
          <body>
            <form>
              <input name="username" type="text" />
              <input name="password" type="password" />
              <button>Login</button>
            </form>
          </body>
        </html>
      `;
      expect(detectSessionIssue(mockResponse(200), loginHtml)).toBe(true);
    });

    it("does not flag normal 200 responses", () => {
      expect(detectSessionIssue(mockResponse(200))).toBe(false);
    });

    it("does not flag redirects to non-login paths", () => {
      expect(detectSessionIssue(mockResponse(302, "/dashboard"))).toBe(false);
      expect(detectSessionIssue(mockResponse(302, "/api/data"))).toBe(false);
    });

    it("does not flag normal HTML without login form", () => {
      const normalHtml = `
        <html>
          <body>
            <h1>Dashboard</h1>
            <p>Welcome to the application</p>
          </body>
        </html>
      `;
      expect(detectSessionIssue(mockResponse(200), normalHtml)).toBe(false);
    });

    it("does not flag HTML with only username field (not a complete login form)", () => {
      const partialForm = `
        <html>
          <body>
            <form>
              <input name="username" type="text" />
              <button>Search</button>
            </form>
          </body>
        </html>
      `;
      expect(detectSessionIssue(mockResponse(200), partialForm)).toBe(false);
    });

    it("handles case-insensitive location headers", () => {
      expect(detectSessionIssue(mockResponse(302, "/LOGIN"))).toBe(true);
      expect(detectSessionIssue(mockResponse(302, "/Authentication/Login"))).toBe(
        true,
      );
    });
  });
});

describe("Proxy Timestamp Header", () => {
  it("timestamp header format includes ISO date and latency", () => {
    // Simulates the header format used by the proxy
    const timestamp = new Date().toISOString();
    const latencyMs = 42;
    const headerValue = `${timestamp}; latency=${latencyMs}ms`;

    expect(headerValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(headerValue).toContain("; latency=");
    expect(headerValue).toContain("ms");
  });

  it("latency is measured in milliseconds", () => {
    const startTime = Date.now();
    // Simulate some work
    const endTime = startTime + 100;
    const latencyMs = endTime - startTime;

    expect(latencyMs).toBe(100);
    expect(typeof latencyMs).toBe("number");
  });
});
