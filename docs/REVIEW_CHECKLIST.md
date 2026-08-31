# Code Review Checklist

Single source of truth for Claude Code Review. This file is automatically loaded by the review hook.

## CLAUDE.md Violations (Must Flag)

### Naming Conventions (ESLint enforced)

- Components: `PascalCase`
- Hooks: `useCamelCase`
- Constants: `SCREAMING_SNAKE_CASE`

### Anti-Patterns (See [CODE_PATTERNS.md](CODE_PATTERNS.md) for examples)

| Pattern                        | Issue                              | Fix                                        |
| ------------------------------ | ---------------------------------- | ------------------------------------------ |
| Magic numbers                  | `setTimeout(fn, 300)`              | Use named constant `ANIMATION_DURATION_MS` |
| Array index as key             | `key={index}`                      | Use unique identifier `key={item.id}`      |
| Uncleared intervals            | No cleanup in useEffect            | Return cleanup function                    |
| `isMountedRef` pattern         | Outdated (React 16/17)             | Use `AbortController`                      |
| Functions > 30 lines           | Hard to test/maintain              | Extract to custom hooks                    |
| > 4 parameters                 | Code smell                         | Use options object                         |
| Async fn directly in component | Violates hook extraction guideline | Extract to a custom hook                   |

### Accessibility (Required)

- Icon buttons need `aria-label`
- Modals need `aria-modal`, `aria-labelledby`, keyboard dismiss
- Dynamic content needs `aria-live` regions
- `aria-hidden="true"` must **not** be placed on a wrapper that contains the dialog — it hides all descendants from AT. Keep the backdrop and dialog as siblings (see [CODE_PATTERNS.md](CODE_PATTERNS.md#modal-dialogs))
- Submit buttons in `<form>` elements should use `type="submit"` so that pressing Enter in any field submits the form

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
| Dependencies | New packages with network access, pnpm audit warnings             |

### Sensitive Files (Require extra scrutiny)

- `packages/worker/src/index.ts` - CORS proxy
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

## Recurring Findings (check first)

These classes have each cost multiple review rounds. Flag them in the FIRST review — and authors should self-check them before opening the PR:

| Class           | Rule                                                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Persisted cache | Schema transform, newly requested API property, or filter-driving field changed ⇒ `PERSISTED_SCHEMA_VERSION` must be bumped |
| Query cache     | Filter/derive in `select` or hooks, never in `queryFn` — the cache holds the server's response verbatim                     |
| Platform parity | A shared behavior change lands on web AND mobile in the same PR                                                             |
| Empty states    | Blame a filter only when a filter actually removed items — count what each stage removed, don't infer from toggles          |
| Enum tolerance  | Display-only enums use `tolerantEnum`; behavior-driving enums stay strict with a drop test                                  |
| Pagination      | `totalItemsCount` is the server's cross-page total — never adjust it page-locally                                           |

## Re-Review Guidelines

When `EVENT TYPE` is `synchronize`:

- DO NOT repeat issues still present - reference briefly
- DO acknowledge fixed issues with "Fixed: [issue]"
- DO flag NEW issues in latest commits
- Focus on changes since last review

### Convergence Rules (re-reviews)

Each review round costs a full fix-push-review cycle. The goal of a re-review is to converge, not to find something:

- **Scope**: review only the commits pushed since your last review, plus regressions of issues you flagged. Do NOT raise new findings on code unchanged since the last round — that code was already reviewed.
- **Severity floor**: on the first re-review, flag `bug` and `risk` only from unchanged code; from the second re-review onward, flag `bug` only, anywhere. Nits found late are omitted, not listed — put at most a one-line "optional follow-up" note in Recommendations.
- **Respect recorded decisions**: if a commit message or PR comment documents a suggestion as "Not taken" with a rationale, do not re-raise it unless you can show the rationale is factually wrong (e.g. a concrete failing case).
- **Declare convergence**: "No issues found" is a successful review. If your remaining findings are judgment calls with defensible alternatives on both sides, say so and stop instead of listing them.
