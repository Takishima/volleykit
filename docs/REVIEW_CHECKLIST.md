# Code Review Checklist

Single source of truth for Claude Code Review. This file is automatically loaded by the review hook.

## CLAUDE.md Violations (Must Flag)

### Naming Conventions (ESLint enforced)

- Components: `PascalCase`
- Hooks: `useCamelCase`
- Constants: `SCREAMING_SNAKE_CASE`

### Anti-Patterns (See [CODE_PATTERNS.md](CODE_PATTERNS.md) for examples)

| Pattern                | Issue                   | Fix                                        |
| ---------------------- | ----------------------- | ------------------------------------------ |
| Magic numbers          | `setTimeout(fn, 300)`   | Use named constant `ANIMATION_DURATION_MS` |
| Array index as key     | `key={index}`           | Use unique identifier `key={item.id}`      |
| Uncleared intervals    | No cleanup in useEffect | Return cleanup function                    |
| `isMountedRef` pattern | Outdated (React 16/17)  | Use `AbortController`                      |
| Functions > 30 lines   | Hard to test/maintain   | Extract to custom hooks                    |
| > 4 parameters         | Code smell              | Use options object                         |

### Accessibility (Required)

- Icon buttons need `aria-label`
- Modals need `aria-modal`, `aria-labelledby`, keyboard dismiss
- Dynamic content needs `aria-live` regions

### i18n (4 languages: de/en/fr/it)

- All user-facing strings must use `useTranslation()` hook
- No hardcoded text in components

## Security Review (See [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md))

### Quick Checks

| Risk         | What to look for                                                  |
| ------------ | ----------------------------------------------------------------- |
| XSS          | `dangerouslySetInnerHTML`, dynamic `href`, unvalidated URLs       |
| Injection    | String interpolation in URLs (use `URLSearchParams`)              |
| Credentials  | Hardcoded secrets, tokens in localStorage, sensitive data in logs |
| Dependencies | New packages with network access, npm audit warnings              |

### Sensitive Files (Require extra scrutiny)

- `worker/src/index.ts` - CORS proxy
- `**/api/client.ts` - API requests
- `**/stores/auth.ts` - Authentication
- `vite.config.ts` - Build config

## Review Output Format

```markdown
## Claude Code Review

**Review type:** [Initial review | Re-review after changes]

### Summary

[1-2 sentence overview]

### Issues Found

[List issues with file:line references, or "No issues found"]

### Fixed Since Last Review (re-reviews only)

[List resolved issues, or omit section for initial reviews]

### Recommendations

[Optional suggestions for improvement]
```

## Re-Review Guidelines

When `EVENT TYPE` is `synchronize`:

- DO NOT repeat issues still present - reference briefly
- DO acknowledge fixed issues with "Fixed: [issue]"
- DO flag NEW issues in latest commits
- Focus on changes since last review
