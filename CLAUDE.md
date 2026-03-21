# CLAUDE.md - VolleyKit Monorepo

## Project Overview

VolleyKit is a multi-platform app suite for Swiss volleyball referee management (volleymanager.volleyball.ch).

| Application    | Location           | Description                                             |
| -------------- | ------------------ | ------------------------------------------------------- |
| Web App (PWA)  | `packages/web/`    | React 19 + Vite 7 + Tailwind 4                          |
| Mobile App     | `packages/mobile/` | React Native 0.83 + Expo 55 + NativeWind                |
| Shared Package | `packages/shared/` | API client, hooks, stores, i18n, offline (~70% sharing) |
| Help Site      | `help-site/`       | Astro 6 + Pagefind search                               |
| CORS Proxy     | `packages/worker/` | Cloudflare Worker (auth lockout, OCR proxy, OJP proxy)  |

**Always check official docs**: [react.dev](https://react.dev), [reactnative.dev](https://reactnative.dev), [docs.expo.dev](https://docs.expo.dev), [vite.dev](https://vite.dev)

## Read When Needed

**IMPORTANT**: You MUST read these files at the specified times:

| When                          | Read                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------- |
| Before committing             | [docs/VALIDATION.md](docs/VALIDATION.md) - validation commands, bundle limits |
| Touching auth/API/worker code | [docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md)                      |
| Unsure about patterns         | [docs/CODE_PATTERNS.md](docs/CODE_PATTERNS.md)                                |
| Writing tests                 | [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md)                          |
| API integration               | [docs/api/](docs/api/) - OpenAPI spec, endpoint docs, captures                |
| Reviewing PRs                 | [docs/REVIEW_CHECKLIST.md](docs/REVIEW_CHECKLIST.md)                          |
| Reviewing PR architecture     | [docs/REVIEW_CHECKLIST_ARCHITECTURE.md](docs/REVIEW_CHECKLIST_ARCHITECTURE.md)|
| Data storage questions        | [docs/DATA_RETENTION.md](docs/DATA_RETENTION.md)                              |

## Development Workflow

1. **Implement** - Complete the work
2. **Add changeset** - For `feat:`/`fix:` commits, create `.changeset/*.md` (see below)
3. **Commit** - Pre-commit hook validates automatically (Claude Code web only)
4. **Push** - Push to remote

Use `/pr-review` to create PR and auto-fix Claude Code Review issues.

## Project Structure

```
volleykit/
├── packages/
│   ├── shared/src/           # @volleykit/shared - API, auth, hooks, stores, i18n, types, utils, adapters, offline
│   ├── mobile/src/           # @volleykit/mobile - screens, navigation, components, services, hooks, stores, contexts
│   ├── web/src/              # volleykit-web - features, shared, e2e (Playwright)
│   └── worker/src/           # CORS proxy - handlers, utils (auth lockout, OCR, OJP)
├── help-site/src/            # Astro pages, layouts, components, i18n, styles
├── ocr-poc/                  # OCR proof-of-concept app
├── scripts/                  # Utility scripts
├── docs/                     # Guides and API docs
├── .changeset/               # Changelog staging
└── .github/workflows/        # CI, deploy, release
```

**Package manager**: pnpm 10 (workspaces defined in `pnpm-workspace.yaml`)

**Shared imports**: `import { useAssignments } from '@volleykit/shared/hooks'`

Subpath exports: `/api`, `/stores`, `/hooks`, `/utils`, `/i18n`, `/types`, `/adapters`, `/offline`

## Code Standards

**Naming** (ESLint enforced): Components `PascalCase`, Hooks `useCamelCase`, Constants `SCREAMING_SNAKE_CASE`

**React**: Zustand for client state, TanStack Query for server state. Query keys in `packages/shared/src/api/queryKeys.ts`. Use `useTranslation()` hook in .tsx.

**Styling**: Tailwind CSS 4 (web-app + help-site), NativeWind/Tailwind 3 (mobile).

**Avoid**: Magic numbers, array index as key, uncleared intervals, `isMountedRef` pattern, functions > 30 lines, > 4 parameters.

## Changesets

For `feat:`/`fix:` commits, add a changeset:

```bash
pnpm exec changeset  # Interactive
```

Or create `.changeset/<name>.md`:

```markdown
---
'volleykit-web': minor
---

Added dark mode toggle
```

**Bump types**: `patch` (fixes), `minor` (features), `major` (breaking)

**Package names**: `volleykit-web`, `@volleykit/shared`, `@volleykit/mobile`, `volleykit-help`

## Git Conventions

**Commits**: `feat|fix|refactor|test|docs|chore(scope): description`

**Scopes**: `web`, `mobile`, `shared`, `worker`, `docs`, `ci`

## Quick Commands

```bash
pnpm install                    # Root: all dependencies
pnpm run generate:api           # Generate API types (required before build)

cd packages/web && pnpm run dev      # Start dev server
cd packages/web && pnpm run build    # Production build
cd packages/web && pnpm run knip     # Dead code detection
cd packages/web && pnpm run size     # Bundle size check

cd packages/mobile && pnpm start  # Expo dev server
cd packages/mobile && pnpm run typecheck  # TypeScript check
```

## Definition of Done

1. Follows React/TypeScript best practices
2. Changeset added for feat/fix commits
3. Tests cover business logic
4. Translations in all 4 languages (de/en/fr/it)
5. All validation passes (lint, knip, test, build)
6. Accessible (keyboard, screen reader)
