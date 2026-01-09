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
import {
  AUTH_ENDPOINT,
  KILL_SWITCH_RETRY_AFTER_SECONDS,
  VOLLEYKIT_USER_AGENT,
  detectSessionIssue,
  extractICalCode,
  hasAuthCredentials,
  isAllowedOrigin,
  isAllowedPath,
  isDynamicContent,
  isPathSafe,
  isValidICalCode,
  noCacheHeaders,
  parseAllowedOrigins,
  requiresApiPrefix,
  transformAuthFormData,
  validateAllowedOrigins,
  // Auth lockout imports
  type AuthLockoutKV,
  checkLockoutStatus,
  clearAuthLockout,
  getAuthLockoutState,
  isAuthRequest,
  isFailedLoginResponse,
  isSuccessfulLoginResponse,
  recordFailedAttempt,
} from "./utils";

// OCR configuration constants
const OCR_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB - Mistral API limit
const OCR_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;
const OCR_RATE_LIMIT_RETRY_SECONDS = 60;

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
  MISTRAL_API_KEY?: string; // API key for Mistral OCR
  AUTH_LOCKOUT?: AuthLockoutKV; // KV namespace for auth lockout state
}

function validateEnv(env: Env): void {
  if (!env.ALLOWED_ORIGINS || env.ALLOWED_ORIGINS.trim() === "") {
    throw new Error("ALLOWED_ORIGINS environment variable is required");
  }
  if (!env.TARGET_HOST || env.TARGET_HOST.trim() === "") {
    throw new Error("TARGET_HOST environment variable is required");
  }
  try {
    new URL(env.TARGET_HOST);
  } catch {
    throw new Error("TARGET_HOST must be a valid URL");
  }
}

/**
 * Security headers to protect against common web vulnerabilities.
 */
function securityHeaders(): HeadersInit {
  return {
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'",
    "X-Frame-Options": "SAMEORIGIN",
    "X-Content-Type-Options": "nosniff",
    "X-XSS-Protection": "1; mode=block",
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
    // Requires CORS headers for browser-based health checks (e.g., OCR availability check)
    // Verifies Mistral OCR API connectivity by calling /v1/models endpoint
    if (url.pathname === "/health") {
      const origin = request.headers.get("Origin");
      let allowedOrigins: string[];
      try {
        allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);
      } catch {
        return new Response("Server configuration error", {
          status: 500,
          headers: { "Content-Type": "text/plain" },
        });
      }

      // Check origin for health endpoint (required for CORS)
      // Include CORS headers even in error responses so browsers can read the error
      if (!isAllowedOrigin(origin, allowedOrigins)) {
        const errorHeaders: HeadersInit = {
          "Content-Type": "text/plain",
          ...securityHeaders(),
        };
        // If origin was provided, include CORS headers so browser can read the error
        if (origin) {
          Object.assign(errorHeaders, corsHeaders(origin));
        }
        return new Response("Forbidden: Origin not allowed", {
          status: 403,
          headers: errorHeaders,
        });
      }

      // Handle CORS preflight for health check
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(origin!),
        });
      }

      // Check Mistral API connectivity if API key is configured
      // Uses /v1/models endpoint as a lightweight health check (no token consumption)
      // Timeout after 5 seconds to prevent health check from hanging
      const HEALTH_CHECK_TIMEOUT_MS = 5000;
      let mistralStatus: "ok" | "not_configured" | "error" = "not_configured";
      let mistralError: string | undefined;

      if (env.MISTRAL_API_KEY) {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          HEALTH_CHECK_TIMEOUT_MS,
        );

        try {
          const mistralResponse = await fetch(
            "https://api.mistral.ai/v1/models",
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${env.MISTRAL_API_KEY}`,
              },
              signal: controller.signal,
            },
          );

          if (mistralResponse.ok) {
            mistralStatus = "ok";
          } else {
            mistralStatus = "error";
            mistralError =
              mistralResponse.status === 401
                ? "Invalid API key"
                : `API returned ${mistralResponse.status}`;
          }
        } catch (error) {
          mistralStatus = "error";
          if (error instanceof Error && error.name === "AbortError") {
            mistralError = "Health check timed out";
          } else {
            mistralError =
              error instanceof Error ? error.message : "Connection failed";
          }
        } finally {
          clearTimeout(timeoutId);
        }
      }

      const overallStatus = mistralStatus === "ok" ? "ok" : "degraded";

      return new Response(
        JSON.stringify({
          status: overallStatus,
          timestamp: new Date().toISOString(),
          services: {
            proxy: "ok",
            mistral_ocr: mistralStatus,
            ...(mistralError && { mistral_ocr_error: mistralError }),
          },
        }),
        {
          status: overallStatus === "ok" ? 200 : 503,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(origin!),
            ...securityHeaders(),
          },
        },
      );
    }

    // OCR endpoint - proxy to Mistral OCR API
    // Accepts POST with image data and returns OCR results
    if (url.pathname === "/ocr") {
      const origin = request.headers.get("Origin");
      let allowedOrigins: string[];
      try {
        allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);
      } catch {
        return new Response("Server configuration error", {
          status: 500,
          headers: { "Content-Type": "text/plain" },
        });
      }

      // Check origin for OCR endpoint
      // Include CORS headers even in error responses so browsers can read the error
      if (!isAllowedOrigin(origin, allowedOrigins)) {
        const errorHeaders: HeadersInit = {
          "Content-Type": "text/plain",
          ...securityHeaders(),
        };
        // If origin was provided, include CORS headers so browser can read the error
        if (origin) {
          Object.assign(errorHeaders, corsHeaders(origin));
        }
        return new Response("Forbidden: Origin not allowed", {
          status: 403,
          headers: errorHeaders,
        });
      }

      // Handle CORS preflight for OCR
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(origin!),
        });
      }

      // Rate limiting for OCR endpoint
      if (env.RATE_LIMITER) {
        const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
        const { success } = await env.RATE_LIMITER.limit({ key: clientIP });

        if (!success) {
          return new Response(
            JSON.stringify({ error: "Too many requests" }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": String(OCR_RATE_LIMIT_RETRY_SECONDS),
                ...corsHeaders(origin!),
                ...securityHeaders(),
              },
            },
          );
        }
      }

      // Only allow POST for OCR
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            "Content-Type": "text/plain",
            Allow: "POST",
            ...corsHeaders(origin!),
            ...securityHeaders(),
          },
        });
      }

      // Check if Mistral API key is configured
      if (!env.MISTRAL_API_KEY) {
        return new Response(
          JSON.stringify({ error: "OCR service not configured" }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders(origin!),
              ...securityHeaders(),
            },
          },
        );
      }

      try {
        // Parse the incoming request - expects multipart form data with 'image' field
        const formData = await request.formData();
        const imageFile = formData.get("image") as File | null;

        if (!imageFile) {
          return new Response(
            JSON.stringify({ error: "Missing 'image' field in form data" }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders(origin!),
                ...securityHeaders(),
              },
            },
          );
        }

        // Validate file type
        if (
          !OCR_ALLOWED_MIME_TYPES.includes(
            imageFile.type as (typeof OCR_ALLOWED_MIME_TYPES)[number],
          )
        ) {
          return new Response(
            JSON.stringify({
              error: `Unsupported file type: ${imageFile.type}. Allowed: ${OCR_ALLOWED_MIME_TYPES.join(", ")}`,
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders(origin!),
                ...securityHeaders(),
              },
            },
          );
        }

        // Validate file size
        if (imageFile.size > OCR_MAX_FILE_SIZE_BYTES) {
          return new Response(
            JSON.stringify({
              error: `File too large: ${(imageFile.size / 1024 / 1024).toFixed(1)}MB. Maximum: 50MB`,
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders(origin!),
                ...securityHeaders(),
              },
            },
          );
        }

        // Convert image to base64 for Mistral API
        // Use chunked approach to avoid stack overflow with large files
        const imageBuffer = await imageFile.arrayBuffer();
        const bytes = new Uint8Array(imageBuffer);
        const CHUNK_SIZE = 8192;
        let base64Image = "";
        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
          const chunk = bytes.subarray(i, i + CHUNK_SIZE);
          base64Image += String.fromCharCode(...chunk);
        }
        base64Image = btoa(base64Image);
        const dataUrl = `data:${imageFile.type};base64,${base64Image}`;

        // Call Mistral OCR API
        const mistralResponse = await fetch("https://api.mistral.ai/v1/ocr", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.MISTRAL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "mistral-ocr-latest",
            document: {
              type: "image_url",
              image_url: {
                url: dataUrl,
              },
            },
            include_image_base64: false,
            // Enable HTML table formatting for structured table extraction
            // Scoresheets contain player lists and scores that benefit from table structure
            table_format: "html",
          }),
        });

        if (!mistralResponse.ok) {
          const errorText = await mistralResponse.text();
          console.error("Mistral OCR error:", mistralResponse.status, errorText);

          // Return appropriate error based on status
          if (mistralResponse.status === 401) {
            return new Response(
              JSON.stringify({ error: "OCR service authentication failed" }),
              {
                status: 503,
                headers: {
                  "Content-Type": "application/json",
                  ...corsHeaders(origin!),
                  ...securityHeaders(),
                },
              },
            );
          }

          if (mistralResponse.status === 429) {
            return new Response(
              JSON.stringify({ error: "OCR service rate limit exceeded" }),
              {
                status: 429,
                headers: {
                  "Content-Type": "application/json",
                  "Retry-After": String(OCR_RATE_LIMIT_RETRY_SECONDS),
                  ...corsHeaders(origin!),
                  ...securityHeaders(),
                },
              },
            );
          }

          return new Response(
            JSON.stringify({ error: "OCR processing failed" }),
            {
              status: 502,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders(origin!),
                ...securityHeaders(),
              },
            },
          );
        }

        // Return the Mistral OCR response
        const ocrResult = await mistralResponse.json();
        return new Response(JSON.stringify(ocrResult), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(origin!),
            ...securityHeaders(),
          },
        });
      } catch (error) {
        console.error("OCR proxy error:", error);
        return new Response(
          JSON.stringify({ error: "Internal server error during OCR processing" }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders(origin!),
              ...securityHeaders(),
            },
          },
        );
      }
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
    // Include CORS headers even in error responses so browsers can read the error
    if (!isAllowedOrigin(origin, allowedOrigins)) {
      const errorHeaders: HeadersInit = {
        "Content-Type": "text/plain",
        ...securityHeaders(),
      };
      // If origin was provided, include CORS headers so browser can read the error
      if (origin) {
        Object.assign(errorHeaders, corsHeaders(origin));
      }
      return new Response("Forbidden: Origin not allowed", {
        status: 403,
        headers: errorHeaders,
      });
    }

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin!),
      });
    }

    // Handle iCal proxy route: GET/HEAD /iCal/referee/:code
    // This is a public endpoint that proxies to volleymanager's iCal feed
    // HEAD is used by the client to validate calendar codes exist without downloading content
    const iCalCode = extractICalCode(url.pathname);
    if (iCalCode !== null) {
      // Only allow GET and HEAD requests for iCal
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            "Content-Type": "text/plain",
            Allow: "GET, HEAD",
            ...corsHeaders(origin!),
            ...securityHeaders(),
          },
        });
      }

      // Validate code format (6 alphanumeric characters)
      if (!isValidICalCode(iCalCode)) {
        return new Response("Bad Request: Invalid calendar code format", {
          status: 400,
          headers: {
            "Content-Type": "text/plain",
            ...corsHeaders(origin!),
            ...securityHeaders(),
          },
        });
      }

      // Proxy to volleymanager iCal endpoint
      // Note: We always use GET for the upstream request, even for HEAD requests from clients.
      // This is because the upstream server may not support HEAD, and we need to verify the
      // calendar exists. For HEAD requests, we simply discard the response body.
      const iCalTargetUrl = `${env.TARGET_HOST}/indoor/iCal/referee/${iCalCode}`;

      try {
        const iCalResponse = await fetch(iCalTargetUrl, {
          method: "GET",
          headers: {
            "User-Agent": VOLLEYKIT_USER_AGENT,
            Accept: "text/calendar",
          },
        });

        // Pass through 404 if not found
        if (iCalResponse.status === 404) {
          return new Response("Not Found: Calendar not found", {
            status: 404,
            headers: {
              "Content-Type": "text/plain",
              ...corsHeaders(origin!),
              ...securityHeaders(),
            },
          });
        }

        // Handle other error responses from upstream
        if (!iCalResponse.ok) {
          console.error(
            "iCal upstream error:",
            iCalResponse.status,
            iCalResponse.statusText,
          );
          return new Response("Bad Gateway: Upstream error", {
            status: 502,
            headers: {
              "Content-Type": "text/plain",
              ...corsHeaders(origin!),
              ...securityHeaders(),
            },
          });
        }

        // Return the iCal data with proper headers
        // For HEAD requests, return empty body (used for validation)
        const iCalBody =
          request.method === "HEAD" ? null : await iCalResponse.text();
        return new Response(iCalBody, {
          status: 200,
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Cache-Control": "public, max-age=300", // 5 minutes
            ...corsHeaders(origin!),
            ...securityHeaders(),
          },
        });
      } catch (error) {
        console.error("iCal proxy error:", error);
        return new Response("Bad Gateway: Unable to reach calendar service", {
          status: 502,
          headers: {
            "Content-Type": "text/plain",
            ...corsHeaders(origin!),
            ...securityHeaders(),
          },
        });
      }
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

    // Auth lockout check - block auth requests from locked-out IPs
    // This is tamper-proof as the state is stored server-side in KV
    const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
    const isAuthReq = isAuthRequest(url.pathname, request.method);

    if (isAuthReq && env.AUTH_LOCKOUT) {
      const lockoutState = await getAuthLockoutState(env.AUTH_LOCKOUT, clientIP);
      const lockoutStatus = checkLockoutStatus(lockoutState);

      if (lockoutStatus.isLocked) {
        console.log("[Auth Lockout] Blocked locked-out IP:", {
          ip: clientIP,
          remainingSeconds: lockoutStatus.remainingSeconds,
          failedAttempts: lockoutStatus.failedAttempts,
        });
        return new Response(
          JSON.stringify({
            error: "Too many failed login attempts",
            lockedUntil: lockoutStatus.remainingSeconds,
            message: `Account locked. Try again in ${lockoutStatus.remainingSeconds} seconds.`,
          }),
          {
            status: 423, // 423 Locked
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(lockoutStatus.remainingSeconds),
              ...corsHeaders(origin!),
              ...securityHeaders(),
            },
          },
        );
      }
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
          // Rewrite to correct auth endpoint (iOS Safari workaround)
          rawPathAndSearch = AUTH_ENDPOINT;
          requestBody = transformAuthFormData(requestBody);
        }
      } else if (request.method === "GET" && url.search) {
        // iOS Safari bug: form may submit as GET with credentials in query string
        // or with postData attached to GET (invalid HTTP, but Safari does it)
        const queryBody = url.search.slice(1); // Remove leading '?'
        if (hasAuthCredentials(queryBody)) {
          // Convert GET to POST and rewrite to correct auth endpoint (iOS Safari workaround)
          rawPathAndSearch = AUTH_ENDPOINT;
          requestBody = transformAuthFormData(queryBody);
          methodOverride = "POST";
        }
      }
    }

    // Prepend /api/ prefix for API endpoints
    // Note: We check the original pathname, not rawPathAndSearch, because iOS Safari
    // workaround may have rewritten rawPathAndSearch to AUTH_ENDPOINT
    const needsApiPrefix = requiresApiPrefix(url.pathname);
    const finalPath = needsApiPrefix
      ? `/api${rawPathAndSearch}`
      : rawPathAndSearch;
    const targetUrl = new URL(finalPath, env.TARGET_HOST);

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
    const targetHostUrl = new URL(env.TARGET_HOST);
    const targetHost = targetHostUrl.host;
    const targetOrigin = targetHostUrl.origin;
    proxyRequest.headers.set("Host", targetHost);

    // Rewrite Origin and Referer to match target host
    // The upstream Neos Flow server validates these for CSRF protection
    proxyRequest.headers.set("Origin", targetOrigin);

    const originalReferer = proxyRequest.headers.get("Referer");
    if (originalReferer) {
      try {
        const refererUrl = new URL(originalReferer);
        refererUrl.protocol = targetHostUrl.protocol;
        refererUrl.host = targetHost;
        proxyRequest.headers.set("Referer", refererUrl.toString());
      } catch {
        // If Referer is malformed, set a safe default
        proxyRequest.headers.set("Referer", targetOrigin + "/");
      }
    }

    proxyRequest.headers.set("User-Agent", VOLLEYKIT_USER_AGENT);

    // Record request start time for latency tracking
    const requestStartTime = Date.now();

    try {
      const response = await fetch(proxyRequest);

      // Track auth attempts for lockout
      // Must clone response to read body without consuming it
      let responseBodyForCheck: string | undefined;
      if (isAuthReq && env.AUTH_LOCKOUT) {
        // Clone response to read body for auth result detection
        const clonedResponse = response.clone();
        try {
          responseBodyForCheck = await clonedResponse.text();
        } catch {
          // If we can't read the body, continue without it
        }

        const isSuccess = isSuccessfulLoginResponse(response);
        const isFailed = isFailedLoginResponse(response, responseBodyForCheck);

        if (isSuccess) {
          // Clear lockout on successful login
          await clearAuthLockout(env.AUTH_LOCKOUT, clientIP);
          console.log("[Auth Lockout] Cleared lockout for IP:", clientIP);
        } else if (isFailed) {
          // Record failed attempt
          const result = await recordFailedAttempt(env.AUTH_LOCKOUT, clientIP);
          console.log("[Auth Lockout] Recorded failed attempt:", {
            ip: clientIP,
            failedAttempts: result.failedAttempts,
            attemptsRemaining: result.attemptsRemaining,
            isLocked: result.isLocked,
            remainingSeconds: result.remainingSeconds,
          });
        }
      }

      // Create response with CORS headers
      const responseHeaders = new Headers(response.headers);

      // Add CORS and security headers
      Object.entries({ ...corsHeaders(origin!), ...securityHeaders() }).forEach(
        ([key, value]) => {
          responseHeaders.set(key, value);
        },
      );

      // Apply cache control based on content type
      // Dynamic content (HTML, JSON) should never be cached to prevent stale data
      const contentType = response.headers.get("Content-Type");
      if (isDynamicContent(contentType)) {
        // Remove any upstream cache headers that could cause stale data
        responseHeaders.delete("ETag");
        responseHeaders.delete("Last-Modified");

        // Apply strict no-cache headers
        Object.entries(noCacheHeaders()).forEach(([key, value]) => {
          responseHeaders.set(key, value);
        });
      }

      // Add proxy timing header for debugging stale data issues
      // Format: timestamp when proxy processed request, latency in ms
      const latencyMs = Date.now() - requestStartTime;
      responseHeaders.set(
        "X-Proxy-Timestamp",
        `${new Date().toISOString()}; latency=${latencyMs}ms`,
      );

      // Detect potential session issues for logging/debugging
      // This helps identify when cached responses might be from expired sessions
      if (detectSessionIssue(response)) {
        responseHeaders.set("X-Proxy-Session-Warning", "potential-session-issue");
      }

      // Handle Set-Cookie headers for cross-origin
      // Must set SameSite=None; Secure for cross-origin cookies to work
      // Use getSetCookie() to handle multiple cookies (get() only returns first)
      const cookies = (response.headers as HeadersWithCookies).getSetCookie();
      if (cookies.length > 0) {
        // First, delete any existing Set-Cookie headers
        responseHeaders.delete("Set-Cookie");

        for (const cookie of cookies) {
          // Remove Domain, Secure, SameSite, and Partitioned - we'll add them back explicitly
          // This ensures consistent behavior regardless of original cookie format
          const modifiedCookie = cookie
            .replace(/Domain=[^;]+;?\s*/gi, "")
            .replace(/;\s*Secure\s*(;|$)/gi, "$1")
            .replace(/SameSite=[^;]+;?\s*/gi, "")
            .replace(/;\s*Partitioned\s*(;|$)/gi, "$1");

          // Add SameSite=None, Secure, and Partitioned for cross-origin compatibility
          // Partitioned (CHIPS) is required for iOS Safari's ITP to allow third-party cookies
          responseHeaders.append(
            "Set-Cookie",
            `${modifiedCookie}; SameSite=None; Secure; Partitioned`,
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
