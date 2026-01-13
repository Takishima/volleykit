# VolleyKit Constitution

## Core Principles

### I. Code Quality

**Self-Documenting Code Over Comments**
- Write code that explains itself; comments explain *why*, not *what*
- Use TODOs with ticket references: `// TODO(#123): Remove after API migration`
- Max 20-30 lines per function (extract if longer)
- Max 3-4 parameters (use object parameter if more)
- Single responsibility - each function does one thing
- Prefer early returns over deep nesting

**Naming Conventions** (ESLint enforced):
- Components: PascalCase (`AssignmentCard`)
- Hooks: camelCase with `use` prefix (`useAssignments`)
- Types/Interfaces: PascalCase (`Assignment`, `AssignmentStatus`)
- Constants: SCREAMING_SNAKE_CASE (`API_BASE_URL`)
- Variables/functions: camelCase (`isAuthenticated`, `fetchAssignments`)
- Files: kebab-case for components, camelCase for utilities

### II. Testing Standards

**Coverage Requirements** (enforced by Vitest):
- Lines: 50%
- Functions: 70%
- Branches: 70%
- Statements: 50%

**Test Philosophy**:
- Test: Business logic, custom hooks, component interactions, edge cases that caused bugs
- Skip: Simple presentational components, third-party wrappers, trivial getters/setters

**Test Types**:
| Type | Tool | Target |
|------|------|--------|
| Unit tests | Vitest/Jest + Testing Library | Shared code, components |
| Integration tests | Vitest/Jest | Store + API interactions |
| E2E tests | Playwright/Detox | Critical user flows |
| Contract tests | Vitest/Jest | API validation |

### III. User Experience Consistency

**Internationalization** (i18n):
- Support 4 languages: German (de), English (en), French (fr), Italian (it)
- Add keys to types.ts first for type safety
- All user-facing text must be translated
- Use `useTranslation()` hook in components (ESLint enforced)

**Accessibility**:
- Use `aria-label` on icon-only buttons
- Use `aria-labelledby` to associate modal titles with dialogs
- Handle Escape key for modals via `useEffect`
- Use `role="alert"` and `aria-live="polite"` for notifications
- All interactive elements must be keyboard accessible

**Cross-Platform Parity**:
- PWA and mobile app share business logic (70%+ code sharing target)
- Platform-specific code isolated in adapter modules
- Consistent UI patterns across platforms via NativeWind/Tailwind

### IV. Performance Requirements

**Bundle Size Limits** (gzipped, CI enforced):
| Component | Limit |
|-----------|-------|
| Main App Bundle | 145 KB |
| Vendor Chunks (each) | 50 KB |
| PDF Library | 185 KB (lazy-loaded) |
| CSS | 12 KB |
| Total JS | 520 KB |

**Mobile Performance Goals**:
- Cold start: < 3 seconds
- Biometric re-auth: < 3 seconds
- Widget data refresh: Background-safe (cached data only)

**Optimization Strategies**:
- Lazy-load heavy dependencies (PDF generation)
- Manual chunk splitting for vendor libraries
- Platform adapters for storage/auth differences

### V. Security First

**ESLint Security Plugins**:
- `eslint-plugin-security`: Common security issues
- `eslint-plugin-no-unsanitized`: XSS prevention via DOM manipulation

**Credential Handling**:
- Session cookies managed by API (httpOnly)
- CSRF tokens included in requests
- Never log credentials or tokens
- Mobile: Secure Enclave (iOS) / Keystore (Android) for biometric credentials
- Biometric credentials: foreground-only access, no background processes

**Sensitive Files** (elevated review required):
- `worker/src/index.ts` - CORS proxy, origin validation
- `src/api/client.ts` - API requests, credential handling
- `src/stores/auth.ts` - Authentication state
- `packages/mobile/src/platform/biometrics.ts` - Credential storage

### VI. Simplicity

**YAGNI Principles**:
- Start simple, expand only when needed
- No premature abstraction - three similar lines > early abstraction
- Don't add features beyond what was asked
- Don't add error handling for impossible scenarios
- Delete unused code completely (no backwards-compatibility hacks)

**Code Sharing Priority**:
- Prefer shared package over platform duplication
- Platform-specific code only where truly necessary
- Interface-based adapters for platform differences

## Quality Gates

**Pre-Commit Validation** (automatic in Claude Code web):
1. Generate API types (if OpenAPI changed)
2. Format check (Prettier)
3. Lint check (0 warnings allowed)
4. Dead code detection (Knip)
5. Run tests
6. Production build

**Definition of Done**:
1. Implementation follows React/TypeScript best practices
2. Changeset added for `feat:` and `fix:` commits
3. Unit tests cover business logic and interactions
4. E2E tests for critical user flows (if applicable)
5. Translations added for all 4 languages
6. All validation phases pass
7. Bundle size limits not exceeded
8. Works across modern browsers
9. Accessible (keyboard, screen reader)
10. No ESLint warnings

## Development Workflow

**Commit Messages** (convco enforced):
- `feat(scope):` - New features
- `fix(scope):` - Bug fixes
- `refactor(scope):` - Code refactoring
- `test(scope):` - Tests
- `docs(scope):` - Documentation
- `chore(scope):` - Maintenance

**Modern React Guidelines** (React 19):
- No `isMountedRef` pattern - use `AbortController` or TanStack Query
- Prefer TanStack Query for data fetching
- Function components with hooks exclusively
- Zustand for global client state, TanStack Query for server state

## Governance

- Constitution supersedes all other practices
- Amendments require documentation and migration plan
- All PRs must verify compliance with these principles
- Complexity deviations must be justified in PR description
- Use CLAUDE.md for runtime development guidance

**Version**: 1.0.0 | **Ratified**: 2026-01-13 | **Last Amended**: 2026-01-13
