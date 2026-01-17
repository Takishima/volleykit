# CLAUDE.md - VolleyKit Monorepo

## Project Overview

VolleyKit is a multi-platform app suite for Swiss volleyball referee management (volleymanager.volleyball.ch).

| Application | Location | Description |
|-------------|----------|-------------|
| Web App (PWA) | `web-app/` | React 19 + Vite 7 + Tailwind 4 |
| Mobile App | `packages/mobile/` | React Native 0.79 + Expo 53 |
| Shared Package | `packages/shared/` | API client, hooks, stores, i18n (~70% code sharing) |
| Help Site | `help-site/` | Astro 6 documentation |
| CORS Proxy | `worker/` | Cloudflare Worker |
| OCR POC | `ocr-poc/` | Scoresheet OCR proof of concept |

**Always check official docs** before implementing: [react.dev](https://react.dev), [reactnative.dev](https://reactnative.dev), [docs.expo.dev](https://docs.expo.dev), [vite.dev](https://vite.dev)

**Detailed guides**: [CHANGELOG.md](CHANGELOG.md), [docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md), [docs/CODE_PATTERNS.md](docs/CODE_PATTERNS.md), [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md)

## AI Development Workflow

1. **Implement** - Complete the work
2. **Add changeset** - For `feat:`/`fix:` changes, create `.changeset/*.md` file (see [Changesets](#changesets))
3. **Commit** - Pre-commit hook validates automatically (Claude Code web only)
4. **Push** - Push to remote

### Pre-Commit Validation (Claude Code Web Only)

The hook (`scripts/pre-commit-validate.sh`) runs: format → lint → knip → test (parallel) → build. Skipped for docs-only changes.

**Manual validation**: `cd web-app && npm run format:check && npm run lint && npm run knip && npm test && npm run build`

### PR Review Command

Use `/pr-review` to create PR, wait for Claude Code Review workflow, and auto-fix issues.

## Project Structure

```
volleykit/
├── packages/
│   ├── shared/src/           # @volleykit/shared - API, hooks, stores, i18n, utils
│   └── mobile/src/           # React Native app - screens, navigation, components
├── web-app/
│   ├── src/features/         # assignments, auth, compensations, exchanges, ocr, settings, validation
│   ├── src/shared/           # components, hooks, utils, stores, services
│   └── e2e/                  # Playwright tests with Page Object Models
├── help-site/src/            # Astro pages, components, i18n
├── worker/src/               # CORS proxy (index.ts)
├── docs/api/                 # OpenAPI spec, endpoint docs, captures
├── .changeset/               # Changelog staging
├── .claude/                  # Commands, hooks, agents
└── .github/workflows/        # CI, deploy, release, claude-review
```

**Feature modules** follow: `components/`, `hooks/`, `api/`, `utils/`

**Shared imports**: `import { useAssignments } from '@volleykit/shared/hooks'`

## Tech Stack

**Web**: React 19, TypeScript 5.9, Vite 7, Tailwind 4, Zustand 5, TanStack Query 5, React Router v7, Zod 4, Vitest + Playwright

**Mobile**: React Native 0.79, Expo 53, React Navigation 7, NativeWind, expo-local-authentication, expo-secure-store, expo-calendar, expo-notifications

**Shared**: Platform-agnostic API client, TanStack Query hooks, Zustand stores with adapters, i18n (de/en/fr/it)

## Code Standards

### Naming (ESLint enforced)
- Components: `PascalCase`, Hooks: `useCamelCase`, Types: `PascalCase`, Constants: `SCREAMING_SNAKE_CASE`
- Files: kebab-case for components, camelCase for utilities

### React Best Practices
- No `isMountedRef` - use AbortController or TanStack Query
- Zustand for client state, TanStack Query for server state
- Query keys in `packages/shared/src/api/queryKeys.ts`
- Use `useTranslation()` hook in .tsx (ESLint blocks direct `t()` import)

### Anti-patterns to Avoid
| Bad | Good |
|-----|------|
| Magic numbers | Named constants (`MINIMUM_SWIPE_DISTANCE_PX`) |
| Array index as key | Unique `id` from data |
| Uncleared intervals | Cleanup in `useEffect` |
| `isMountedRef` | AbortController or TanStack Query |

## Testing

**Test**: Business logic, hooks, component interactions, regression cases. **Skip**: Presentational components, trivial getters.

**Coverage thresholds**: Lines 50%, Functions 70%, Branches 70%, Statements 50%

**E2E**: Playwright with POMs in `e2e/pages/`. Cross-browser: Chromium, Firefox, WebKit + mobile viewports.

## API Integration

**Docs**: `docs/api/volleymanager-openapi.yaml`, endpoint docs in `docs/api/*_api.md`, captures in `docs/api/captures/`

**Generate types**: `npm run generate:api` (required before lint/test/build, `schema.ts` is gitignored)

**CORS**: Vite proxy (dev), Cloudflare Worker (prod)

## Security

**ESLint plugins**: eslint-plugin-security, eslint-plugin-no-unsanitized, eslint-plugin-sonarjs

**Best practices**: CSRF tokens in requests, never log credentials, use `URLSearchParams` for query params, `expo-secure-store` for mobile secrets

**Sensitive files**: `worker/src/index.ts`, `web-app/src/api/client.ts`, `packages/shared/src/stores/auth.ts`

## Git Conventions

**Commits** (convco enforced): `feat|fix|refactor|test|docs|chore(scope): description`

**Scopes**: `web`, `mobile`, `shared`, `worker`, `docs`, `ci`

## Changesets

For `feat:`/`fix:` commits, add a changeset:

```bash
npx changeset  # Interactive
# Or manually create .changeset/<name>.md:
```

```markdown
---
"volleykit-web": minor
---

Added dark mode toggle to settings
```

**Bump types**: `patch` (fixes), `minor` (features), `major` (breaking changes requiring user action)

**Release**: GitHub Actions workflow combines changesets → CHANGELOG.md → version bump → tag → deploy

## Commands

```bash
# Root (monorepo)
npm install                    # All dependencies
npm run generate:api           # Generate API types
npm run lint / test / build    # All packages

# Web App (cd web-app)
npm run dev / build / preview
npm run format / lint / knip
npm test / test:e2e / test:e2e:ui

# Mobile (cd packages/mobile)
npm start / run ios / run android
npm test / run lint / run typecheck

# Worker (cd worker)
npm run dev / deploy
```

## Bundle Size Limits (Web App)

| Component | Limit | | Component | Limit |
|-----------|-------|-|-----------|-------|
| Main Bundle | 145 KB | | PDF Library | 185 KB (lazy) |
| Vendor Chunks | 50 KB ea | | Total JS | 520 KB |

Check: `npm run build && npm run size`

## Definition of Done

1. Follows React/TypeScript best practices
2. Changeset added for feat/fix commits
3. Unit tests cover business logic
4. E2E tests for critical flows (web)
5. Translations in all 4 languages
6. All validation passes (format, lint, knip, test, build)
7. Bundle size limits not exceeded
8. Accessible (keyboard, screen reader)
9. No ESLint warnings
