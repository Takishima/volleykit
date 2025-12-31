/**
 * VolleyKit CORS Proxy Worker
 *
 * Proxies requests to volleymanager.volleyball.ch with proper CORS headers
 * to allow the web app to make authenticated API calls.
 *
 * Rate Limiting:
 * This worker should be protected by Cloudflare's Rate Limiting rules configured
 * in the Cloudflare dashboard or wrangler.toml. In-memory rate limiting would not
 * work reliably across worker instances. Recommended: 100 requests/minute per IP.
 *
 * @see https://developers.cloudflare.com/waf/rate-limiting-rules/
 */

import type { HeadersWithCookies } from "./types";

// Custom User-Agent to identify VolleyKit traffic to the upstream server
// This helps Swiss Volley distinguish our app from bots or abuse
const VOLLEYKIT_USER_AGENT =
  "VolleyKit/1.0 (PWA; https://github.com/Takishima/volleykit)";

// Retry-After duration when service is unavailable (kill switch enabled)
const KILL_SWITCH_RETRY_AFTER_SECONDS = 86400; // 24 hours

/**
 * Cloudflare Rate Limiter binding interface.
 * @see https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
 */
interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface Env {
  ALLOWED_ORIGINS: string;
  TARGET_HOST: string;
  RATE_LIMITER: RateLimiter;
  KILL_SWITCH?: string; // Set to "true" to disable the proxy
}

function validateEnv(env: Env): void {
  if (!env.ALLOWED_ORIGINS || env.ALLOWED_ORIGINS.trim() === "") {
    throw new Error("ALLOWED_ORIGINS environment variable is required");
  }
  if (!env.TARGET_HOST || env.TARGET_HOST.trim() === "") {
    throw new Error("TARGET_HOST environment variable is required");
  }
  // Validate TARGET_HOST is a valid URL
  try {
    new URL(env.TARGET_HOST);
  } catch {
    throw new Error("TARGET_HOST must be a valid URL");
  }
}

// Paths that should be proxied (matches volleymanager.volleyball.ch API structure)
// Authentication endpoints (Neos Flow):
// - /: Homepage (backend redirects /login here, contains login form)
// - /login: Login redirect target (redirects to / which has the actual form)
// - /sportmanager.security/authentication/authenticate: Submit credentials (POST)
// - /logout: Logout endpoint (GET)
// - /sportmanager.volleyball/: Dashboard and other authenticated pages
// API endpoints:
// - /indoorvolleyball.refadmin/: Referee admin API (assignments, compensations)
// - /sportmanager.indoorvolleyball/: Game exchange marketplace API

// Exact match paths (no subpaths allowed)
const ALLOWED_EXACT_PATHS = ["/", "/login", "/logout"];

// Prefix match paths (subpaths allowed)
const ALLOWED_PREFIX_PATHS = [
  "/sportmanager.security/",
  "/sportmanager.volleyball/",
  "/indoorvolleyball.refadmin/",
  "/sportmanager.indoorvolleyball/",
];

// The correct authentication endpoint
const AUTH_ENDPOINT = "/sportmanager.security/authentication/authenticate";

// Form field name that indicates authentication credentials are present
// This is the Neos Flow authentication token username field
const AUTH_USERNAME_FIELD =
  "__authentication[Neos][Flow][Security][Authentication][Token][UsernamePassword][username]";

function isAllowedPath(pathname: string): boolean {
  // Check exact matches first
  if (ALLOWED_EXACT_PATHS.includes(pathname)) {
    return true;
  }
  // Check prefix matches
  return ALLOWED_PREFIX_PATHS.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Check if request body contains authentication credentials.
 * This detects when iOS Safari's password autofill triggers a native form
 * submission to /login instead of the correct /sportmanager.security/authentication/authenticate endpoint.
 *
 * Checks for both:
 * 1. Neos Flow format: __authentication[Neos][Flow]...[username]=value
 * 2. Simple HTML form format: username=value (from native form submission)
 *
 * @param body The request body as text
 * @returns true if the body contains authentication credentials
 */
function hasAuthCredentials(body: string): boolean {
  // Check for Neos Flow format (from React fetch)
  const encodedField = encodeURIComponent(AUTH_USERNAME_FIELD);
  if (body.includes(AUTH_USERNAME_FIELD) || body.includes(encodedField)) {
    return true;
  }

  // Check for simple HTML form format (from iOS native form submission)
  // Look for username=...&password=... pattern
  const params = new URLSearchParams(body);
  return params.has("username") && params.has("password");
}

/**
 * Transform simple form fields to Neos Flow authentication format.
 * This converts native HTML form submission (username/password) to the
 * format expected by the VolleyManager authentication endpoint.
 *
 * @param body The original form body
 * @returns Transformed body with Neos Flow field names, or original if already in correct format
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
  // Note: The __trustedProperties and __referrer fields are required by Neos Flow
  // but we can't generate them here as they contain HMAC signatures.
  // This transformation will allow the auth to proceed, but it may fail server-side
  // if the CSRF protection rejects it. The real fix is in the PWA to prevent
  // native form submission, but this provides a fallback.
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

  // Copy any other fields that might be present (e.g., __trustedProperties if included)
  for (const [key, value] of params.entries()) {
    if (key !== "username" && key !== "password") {
      neosParams.set(key, value);
    }
  }

  return neosParams.toString();
}

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
      // Origin should not have path, query, or fragment
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
  // Normalize: remove trailing slash and lowercase for case-insensitive comparison
  // Origins are case-insensitive per RFC 6454
  const normalizedOrigin = origin.replace(/\/$/, "").toLowerCase();
  return allowedOrigins.some(
    (allowed) => allowed.replace(/\/$/, "").toLowerCase() === normalizedOrigin,
  );
}

/**
 * Validate pathname to prevent path traversal attacks.
 * Returns true if the path is safe, false if it contains suspicious patterns.
 *
 * Note: Backslashes (\) are ALLOWED because the TYPO3 Neos/Flow backend uses
 * them as namespace separators in controller paths. For example:
 * - /indoorvolleyball.refadmin/api\refereeconvocation/search
 * - /indoorvolleyball.refadmin/api\crefereeassociationsettings/get
 *
 * The backslash is not a path traversal risk here because:
 * 1. It's used as a literal character in the URL path, not as a directory separator
 * 2. The backend interprets it as a PHP namespace separator
 * 3. Path traversal requires ".." sequences, which are still blocked
 * 4. This worker runs on Cloudflare's Linux infrastructure, not Windows
 */
function isPathSafe(pathname: string): boolean {
  // Decode the pathname to catch encoded traversal attempts
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // Invalid encoding - reject
    return false;
  }

  // Check for path traversal patterns
  // Note: Backslash is intentionally NOT blocked - see function documentation
  if (
    decoded.includes("..") ||
    decoded.includes("//") ||
    decoded.includes("\0")
  ) {
    return false;
  }

  return true;
}

/**
 * Security headers to protect against common web vulnerabilities.
 * These are added to all proxy responses.
 */
function securityHeaders(): HeadersInit {
  return {
    // Content Security Policy - restrict resource loading
    // default-src 'self': Only allow resources from same origin
    // script-src 'self': Only allow scripts from same origin
    // style-src 'self' 'unsafe-inline': Allow inline styles (needed for some frameworks)
    // img-src 'self' data:: Allow images from same origin and data URIs
    // connect-src 'self': Only allow fetch/XHR to same origin
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'",
    // Prevent clickjacking - only allow framing from same origin
    "X-Frame-Options": "SAMEORIGIN",
    // Prevent MIME type sniffing
    "X-Content-Type-Options": "nosniff",
    // Enable XSS protection in older browsers
    "X-XSS-Protection": "1; mode=block",
    // Referrer policy - don't leak referrer to other origins
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    // Note: Cookie header is NOT included - browsers handle cookies automatically
    // when credentials: 'include' is set. Including Cookie would be a security risk.
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Robots.txt - prevent search engine indexing of the proxy
    // This is placed before the kill switch so search engines can always fetch it
    if (url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nDisallow: /\n", {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
          ...securityHeaders(),
        },
      });
    }

    // Kill switch - immediately disable proxy if requested by Swiss Volley
    if (env.KILL_SWITCH === "true") {
      return new Response(
        "Service temporarily unavailable. Please use volleymanager.volleyball.ch directly.",
        {
          status: 503,
          headers: {
            "Content-Type": "text/plain",
            "Retry-After": String(KILL_SWITCH_RETRY_AFTER_SECONDS),
            ...securityHeaders(),
          },
        },
      );
    }

    // Health check endpoint - no authentication needed, no rate limiting
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...securityHeaders(),
          },
        },
      );
    }

    // Rate limiting check (100 requests per minute per IP)
    // Uses Cloudflare's Rate Limiter binding configured in wrangler.toml
    if (env.RATE_LIMITER) {
      const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
      const { success } = await env.RATE_LIMITER.limit({ key: clientIP });

      if (!success) {
        return new Response("Too Many Requests", {
          status: 429,
          headers: {
            "Content-Type": "text/plain",
            "Retry-After": "60",
            ...securityHeaders(),
          },
        });
      }
    }

    // Validate environment variables
    let allowedOrigins: string[];
    try {
      validateEnv(env);
      allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);
      validateAllowedOrigins(allowedOrigins);
    } catch (error) {
      console.error("Configuration error:", error);
      return new Response("Server configuration error", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const origin = request.headers.get("Origin");

    // Check if origin is allowed
    if (!isAllowedOrigin(origin, allowedOrigins)) {
      return new Response("Forbidden: Origin not allowed", {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin!),
      });
    }

    // Validate pathname for security (path traversal prevention)
    if (!isPathSafe(url.pathname)) {
      return new Response("Bad Request: Invalid path", {
        status: 400,
        headers: {
          "Content-Type": "text/plain",
          ...corsHeaders(origin!),
          ...securityHeaders(),
        },
      });
    }

    // Only proxy allowed paths
    if (!isAllowedPath(url.pathname)) {
      return new Response("Not Found: Path not proxied", {
        status: 404,
        headers: {
          "Content-Type": "text/plain",
          ...corsHeaders(origin!),
          ...securityHeaders(),
        },
      });
    }

    // Build target URL
    // Extract the raw path + search from request URL to preserve URL encoding
    // This is critical for backslash (%5c) encoding required by TYPO3 Neos/Flow
    const requestUrlStr = request.url;
    const pathStart = requestUrlStr.indexOf(
      "/",
      requestUrlStr.indexOf("://") + 3,
    );
    let rawPathAndSearch =
      pathStart >= 0 ? requestUrlStr.substring(pathStart) : "/";

    // iOS Safari workaround: Detect requests to /login with auth credentials
    // iOS Safari can trigger form submission with incorrect method (GET instead of POST)
    // or send to wrong endpoint. This rewrites such requests to the correct auth endpoint.
    let requestBody: string | null = null;
    let methodOverride: string | null = null;
    if (
      url.pathname === "/login" &&
      (request.method === "POST" || request.method === "GET")
    ) {
      // Check for auth credentials in body (POST) or query params (GET)
      if (
        request.method === "POST" &&
        request.headers.get("Content-Type")?.includes("application/x-www-form-urlencoded")
      ) {
        // Clone the request to read the body (body can only be read once)
        const clonedRequest = request.clone();
        requestBody = await clonedRequest.text();

        if (hasAuthCredentials(requestBody)) {
          console.log("iOS auth workaround: Rewriting POST /login to auth endpoint");
          rawPathAndSearch = AUTH_ENDPOINT;
          requestBody = transformAuthFormData(requestBody);
        }
      } else if (request.method === "GET" && url.search) {
        // iOS Safari bug: form may submit as GET with credentials in query string
        // or with postData attached to GET (invalid HTTP, but Safari does it)
        const queryBody = url.search.slice(1); // Remove leading '?'
        if (hasAuthCredentials(queryBody)) {
          console.log("iOS auth workaround: Converting GET /login to POST auth endpoint");
          rawPathAndSearch = AUTH_ENDPOINT;
          requestBody = transformAuthFormData(queryBody);
          methodOverride = "POST";
        }
      }
    }

    const targetUrl = new URL(rawPathAndSearch, env.TARGET_HOST);

    // Forward the request
    // If we already read the body for iOS workaround detection, use it directly
    // methodOverride is used when converting GET to POST for iOS auth workaround
    const proxyRequest = new Request(targetUrl.toString(), {
      method: methodOverride ?? request.method,
      headers: request.headers,
      body: requestBody ?? request.body,
      redirect: "manual", // Handle redirects manually to preserve cookies
    });

    // If we're overriding to POST, ensure Content-Type is set
    if (methodOverride === "POST" && requestBody) {
      proxyRequest.headers.set("Content-Type", "application/x-www-form-urlencoded");
    }

    // Remove headers that shouldn't be forwarded
    proxyRequest.headers.delete("Host");
    proxyRequest.headers.set("Host", new URL(env.TARGET_HOST).host);

    proxyRequest.headers.set("User-Agent", VOLLEYKIT_USER_AGENT);

    try {
      const response = await fetch(proxyRequest);

      // Create response with CORS headers
      const responseHeaders = new Headers(response.headers);

      // Add CORS and security headers
      Object.entries({ ...corsHeaders(origin!), ...securityHeaders() }).forEach(
        ([key, value]) => {
          responseHeaders.set(key, value);
        },
      );

      // Handle Set-Cookie headers for cross-origin
      // Must set SameSite=None; Secure for cross-origin cookies to work
      // Use getSetCookie() to handle multiple cookies (get() only returns first)
      const cookies = (response.headers as HeadersWithCookies).getSetCookie();
      if (cookies.length > 0) {
        // First, delete any existing Set-Cookie headers
        responseHeaders.delete("Set-Cookie");

        for (const cookie of cookies) {
          // Remove Domain, Secure, and SameSite - we'll add them back explicitly
          // This ensures consistent behavior regardless of original cookie format
          const modifiedCookie = cookie
            .replace(/Domain=[^;]+;?\s*/gi, "")
            .replace(/;\s*Secure\s*(;|$)/gi, "$1")
            .replace(/SameSite=[^;]+;?\s*/gi, "");

          // Always add SameSite=None and Secure for cross-origin compatibility
          responseHeaders.append(
            "Set-Cookie",
            `${modifiedCookie}; SameSite=None; Secure`,
          );
        }
      }

      // Handle redirects
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("Location");
        if (location) {
          // Rewrite redirect to go through proxy
          const redirectUrl = new URL(location, env.TARGET_HOST);
          if (redirectUrl.host === new URL(env.TARGET_HOST).host) {
            // Internal redirect - rewrite to proxy
            const proxyRedirect = new URL(request.url);
            proxyRedirect.pathname = redirectUrl.pathname;
            proxyRedirect.search = redirectUrl.search;
            responseHeaders.set("Location", proxyRedirect.toString());
          }
        }
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error("Proxy error:", error);
      return new Response("Proxy Error", {
        status: 502,
        headers: {
          "Content-Type": "text/plain",
          ...corsHeaders(origin!),
          ...securityHeaders(),
        },
      });
    }
  },
};
