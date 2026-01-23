# Security Review Checklist

Use this checklist when reviewing code changes for security vulnerabilities.

## Automated Checks (ESLint)

These are enforced automatically via `eslint-plugin-security` and `eslint-plugin-no-unsanitized`:

- [x] No `eval()` or `Function()` constructor
- [x] No `innerHTML`, `outerHTML`, or `document.write()` with unsanitized input
- [x] No `dangerouslySetInnerHTML` without sanitization
- [x] No hardcoded credentials or secrets
- [x] No unsafe regular expressions (ReDoS)

## Manual Review Required

### XSS Prevention

| Check                     | What to look for                                  |
| ------------------------- | ------------------------------------------------- |
| User input in JSX         | Ensure React's automatic escaping is not bypassed |
| URL parameters            | Validate before using in redirects or API calls   |
| `dangerouslySetInnerHTML` | Must use DOMPurify or similar sanitizer           |
| Dynamic `href` values     | Check for `javascript:` protocol injection        |

```typescript
// Bad: URL from user input without validation
<a href={userProvidedUrl}>Link</a>

// Good: Validate URL protocol
const safeUrl = url.startsWith('https://') ? url : '#';
<a href={safeUrl}>Link</a>
```

### Injection Attacks

| Check                       | What to look for                               |
| --------------------------- | ---------------------------------------------- |
| API query parameters        | Ensure proper encoding with `URLSearchParams`  |
| Dynamic object keys         | Validate against allowlist if from user input  |
| localStorage/sessionStorage | Never store sensitive data (tokens, passwords) |

```typescript
// Bad: Direct string interpolation in URL
fetch(`/api/users?name=${userName}`)

// Good: Use URLSearchParams
const params = new URLSearchParams({ name: userName })
fetch(`/api/users?${params}`)
```

### Authentication & Session

| Check               | What to look for                            |
| ------------------- | ------------------------------------------- |
| Credentials in code | No hardcoded usernames, passwords, API keys |
| Credentials in logs | Never log tokens, passwords, or session IDs |
| Session handling    | Use httpOnly cookies (handled by API)       |
| CSRF tokens         | Included in state-changing requests         |

```typescript
// Bad: Logging sensitive data
console.log('Login attempt:', { username, password })

// Good: Redact sensitive fields
console.log('Login attempt:', { username, password: '[REDACTED]' })
```

### Sensitive Data Exposure

| Check           | What to look for                                          |
| --------------- | --------------------------------------------------------- |
| Error messages  | Don't expose stack traces or internal paths to users      |
| API responses   | Don't log full response bodies (may contain PII)          |
| Form data       | Use `type="password"` for sensitive inputs                |
| Browser storage | Never store tokens in localStorage (use httpOnly cookies) |

### Third-Party Dependencies

| Check            | What to look for                                    |
| ---------------- | --------------------------------------------------- |
| New dependencies | Check npm audit, bundle size, maintenance status    |
| CDN scripts      | Avoid external scripts; bundle dependencies instead |
| Permissions      | Review what APIs new packages access                |

```bash
# Check for vulnerabilities before adding dependencies
npm audit
```

## CORS & Network

| Check             | What to look for                              |
| ----------------- | --------------------------------------------- |
| Fetch credentials | Use `credentials: 'include'` only when needed |
| CORS headers      | Verify worker allows only expected origins    |
| Redirect handling | Validate redirect URLs against allowlist      |

## Files to Watch

These files have elevated security sensitivity:

| File                  | Reason                                       |
| --------------------- | -------------------------------------------- |
| `worker/src/index.ts` | CORS proxy, origin validation, rate limiting |
| `src/api/client.ts`   | API requests, credential handling            |
| `src/stores/auth.ts`  | Authentication state                         |
| `vite.config.ts`      | Build configuration, proxy settings          |

## Quick Reference: OWASP Top 10

| Risk                      | Mitigation in this project                        |
| ------------------------- | ------------------------------------------------- |
| Injection                 | React escaping, URLSearchParams, TypeScript types |
| Broken Auth               | httpOnly cookies (API-managed), CSRF tokens       |
| Sensitive Data            | No localStorage for tokens, redacted logging      |
| XXE                       | Not applicable (no XML parsing)                   |
| Broken Access Control     | API-side enforcement                              |
| Security Misconfiguration | ESLint security plugins, strict CSP in worker     |
| XSS                       | React escaping, no-unsanitized ESLint rules       |
| Insecure Deserialization  | JSON.parse with typed validation (Zod)            |
| Vulnerable Components     | npm audit, Dependabot alerts                      |
| Logging & Monitoring      | Structured logging without sensitive data         |

## When to Escalate

Flag for additional review if the PR:

- Adds new authentication/authorization logic
- Modifies the CORS proxy worker
- Adds `dangerouslySetInnerHTML` usage
- Introduces new third-party dependencies with network access
- Handles file uploads or downloads
- Modifies cookie or session handling
