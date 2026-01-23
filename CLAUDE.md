# CLAUDE.md - VolleyKit Monorepo

## Project Overview

VolleyKit is a multi-platform app suite for Swiss volleyball referee management (volleymanager.volleyball.ch).

| Application    | Location           | Description                                         |
| -------------- | ------------------ | --------------------------------------------------- |
| Web App (PWA)  | `web-app/`         | React 19 + Vite 7 + Tailwind 4                      |
| Mobile App     | `packages/mobile/` | React Native 0.79 + Expo 53                         |
| Shared Package | `packages/shared/` | API client, hooks, stores, i18n (~70% code sharing) |
| Help Site      | `help-site/`       | Astro 6 documentation                               |
| CORS Proxy     | `worker/`          | Cloudflare Worker                                   |

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
│   ├── shared/src/           # @volleykit/shared - API, hooks, stores, i18n, utils
│   └── mobile/src/           # React Native - screens, navigation, components
├── web-app/
│   ├── src/features/         # assignments, auth, compensations, exchanges, ocr, settings, validation
│   ├── src/shared/           # components, hooks, utils, stores, services
│   └── e2e/                  # Playwright tests with Page Object Models
├── help-site/src/            # Astro pages, components, i18n
├── worker/src/               # CORS proxy
├── docs/                     # Guides and API docs
├── .changeset/               # Changelog staging
└── .github/workflows/        # CI, deploy, release
```

**Shared imports**: `import { useAssignments } from '@volleykit/shared/hooks'`

## Code Standards

**Naming** (ESLint enforced): Components `PascalCase`, Hooks `useCamelCase`, Constants `SCREAMING_SNAKE_CASE`

**React**: Zustand for client state, TanStack Query for server state. Query keys in `packages/shared/src/api/queryKeys.ts`. Use `useTranslation()` hook in .tsx.

**Avoid**: Magic numbers, array index as key, uncleared intervals, `isMountedRef` pattern.

## Changesets

For `feat:`/`fix:` commits, add a changeset:

```bash
npx changeset  # Interactive
```

Or create `.changeset/<name>.md`:

```markdown
---
'volleykit-web': minor
---

Added dark mode toggle
```

**Bump types**: `patch` (fixes), `minor` (features), `major` (breaking)

## Git Conventions

**Commits**: `feat|fix|refactor|test|docs|chore(scope): description`

**Scopes**: `web`, `mobile`, `shared`, `worker`, `docs`, `ci`

## Quick Commands

```bash
npm install                    # Root: all dependencies
npm run generate:api           # Generate API types (required before build)

cd web-app && npm run dev      # Start dev server
cd web-app && npm run build    # Production build

cd packages/mobile && npm start  # Expo dev server
```

## Definition of Done

1. Follows React/TypeScript best practices
2. Changeset added for feat/fix commits
3. Tests cover business logic
4. Translations in all 4 languages (de/en/fr/it)
5. All validation passes
6. Accessible (keyboard, screen reader)
