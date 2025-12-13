# VolleyKit CORS Proxy Worker

A Cloudflare Worker that proxies requests to volleymanager.volleyball.ch with proper CORS headers, enabling the VolleyKit web app to make authenticated API calls.

## Features

- CORS proxy for cross-origin API requests
- Cookie rewriting for cross-origin authentication (SameSite=None; Secure)
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Path traversal protection
- Health check endpoint (`/health`)

## Development

```bash
npm install
npm run dev      # Start local development server
npm test         # Run tests
```

## Deployment

```bash
npx wrangler deploy
```

## Deployment Checklist

**IMPORTANT**: Complete all items before considering the worker production-ready.

### 1. Environment Variables (Required)

Configure in `wrangler.toml` or Cloudflare Dashboard:

- [ ] `ALLOWED_ORIGINS` - Set to your production domain(s)
- [ ] `TARGET_HOST` - Set to `https://volleymanager.volleyball.ch`

### 2. Rate Limiting (Configured)

This worker implements rate limiting using Cloudflare's Rate Limiter binding:

- **Limit**: 100 requests per minute per IP
- **Configuration**: Set in `wrangler.toml` via `[[rate_limits]]` binding
- **Response**: Returns HTTP 429 with `Retry-After: 60` header when exceeded

The rate limiter is configured in `wrangler.toml`:

```toml
[[rate_limits]]
binding = "RATE_LIMITER"
namespace_id = "1001"
simple = { limit = 100, period = 60 }
```

For additional protection (e.g., stricter login rate limiting), you can also configure Cloudflare WAF rules in the dashboard.

See: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

### 3. Verification Steps

After deployment, verify:

- [ ] Health check works: `curl https://your-worker.workers.dev/health`
- [ ] CORS headers present on responses
- [ ] Rate limiting is active (test with rapid requests)
- [ ] Allowed origins are correctly configured
- [ ] Login flow works end-to-end

### 4. Monitoring

- [ ] Enable observability in `wrangler.toml` (already configured)
- [ ] Set up alerts for error rates in Cloudflare Dashboard
- [ ] Monitor request counts to stay within free tier limits (100k/day)

## Configuration Reference

See `wrangler.toml` for all configuration options and detailed comments.

## Security Notes

- Cookies are rewritten with `SameSite=None; Secure` for cross-origin compatibility
- Only whitelisted paths are proxied (see `ALLOWED_PATHS` in source)
- Path traversal attacks are blocked
- Security headers are added to all responses
