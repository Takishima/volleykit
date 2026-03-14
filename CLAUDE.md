# CLAUDE.md - VolleyKit Monorepo

## Project Overview

VolleyKit is a multi-platform app suite for Swiss volleyball referee management (volleymanager.volleyball.ch).

| Application    | Location           | Description                                              |
| -------------- | ------------------ | -------------------------------------------------------- |
| Web App (PWA)  | `web-app/`         | React 19 + Vite 7 + Tailwind 4                          |
| Mobile App     | `packages/mobile/` | React Native 0.83 + Expo 55 + NativeWind                |
| Shared Package | `packages/shared/` | API client, hooks, stores, i18n, offline (~70% sharing)  |
| Help Site      | `help-site/`       | Astro 6 + Pagefind search                               |
| CORS Proxy     | `worker/`          | Cloudflare Worker (auth lockout, OCR proxy, OJP proxy)   |
| OCR PoC        | `ocr-poc/`         | OCR proof-of-concept (Vite standalone)                   |

**Always check official docs**: [react.dev](https://react.dev), [reactnative.dev](https://reactnative.dev), [docs.expo.dev](https://docs.expo.dev), [vite.dev](https://vite.dev)

## Read When Needed

**IMPORTANT**: You MUST read these files at the specified times:

| When                          | Read                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------- |
| Before committing             | [docs/VALIDATION.md](docs/VALIDATION.md) - validation commands, bundle limits |
| Touching auth/API/worker code | [docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md)                      |
| Unsure about patterns         | [docs/CODE_PATTERNS.md](docs/CODE_PATTERNS.md)                               |
| Writing tests                 | [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md)                          |
| API integration               | [docs/api/](docs/api/) - OpenAPI spec, endpoint docs, captures               |
| Reviewing PRs                 | [docs/REVIEW_CHECKLIST.md](docs/REVIEW_CHECKLIST.md)                          |
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
│   ├── shared/src/           # @volleykit/shared
│   │   ├── api/              #   API client, schema (OpenAPI-generated), query keys
│   │   ├── auth/             #   Authentication logic
│   │   ├── hooks/            #   Shared React hooks (useAssignments, etc.)
│   │   ├── stores/           #   Zustand stores (auth, settings, demo)
│   │   ├── i18n/             #   Translations (de/en/fr/it) + useTranslation hook
│   │   ├── types/            #   Shared TypeScript types
│   │   ├── utils/            #   Utility functions
│   │   ├── adapters/         #   Platform adapters (web vs mobile)
│   │   └── offline/          #   Offline support
│   └── mobile/src/           # @volleykit/mobile (React Native + Expo)
│       ├── screens/          #   Screen components
│       ├── navigation/       #   React Navigation setup
│       ├── components/       #   Mobile-specific components
│       ├── contexts/         #   React contexts
│       ├── providers/        #   App providers
│       ├── platform/         #   Platform-specific code
│       ├── hooks/            #   Mobile-specific hooks
│       ├── stores/           #   Mobile-specific stores
│       └── services/         #   Mobile services
├── web-app/
│   ├── src/
│   │   ├── features/         #   Feature modules:
│   │   │   ├── assignments/  #     Referee assignment management
│   │   │   ├── auth/         #     Authentication (login, session)
│   │   │   ├── compensations/#     Compensation tracking
│   │   │   ├── exchanges/    #     Assignment exchanges
│   │   │   ├── ocr/          #     OCR document scanning
│   │   │   ├── referee-backup/#    Referee backup management
│   │   │   ├── settings/     #     User settings
│   │   │   └── validation/   #     Form validation
│   │   └── shared/           #   Shared web-app code:
│   │       ├── components/   #     UI components (Button, Card, Modal, etc.)
│   │       ├── hooks/        #     Web-specific hooks
│   │       ├── stores/       #     Web-specific stores
│   │       ├── services/     #     Web services
│   │       ├── utils/        #     Web utilities
│   │       ├── config/       #     App configuration
│   │       └── types/        #     Web-specific types
│   └── e2e/                  #   Playwright E2E tests
│       ├── pages/            #     Page Object Models
│       └── *.spec.ts         #     Test specs (app, assignments, compensations, etc.)
├── help-site/src/            # Help documentation site
│   ├── pages/                #   Astro pages
│   ├── components/           #   Site components
│   ├── layouts/              #   Page layouts
│   ├── i18n/                 #   Help site translations
│   └── data/                 #   Content data
├── worker/src/               # Cloudflare Worker CORS proxy
│   ├── index.ts              #   Main worker (CORS, auth lockout, OCR, OJP)
│   ├── utils.ts              #   Utility functions
│   └── types.d.ts            #   Type definitions
├── ocr-poc/                  # OCR proof-of-concept app
├── docs/                     # Developer documentation
│   ├── api/                  #   OpenAPI spec + endpoint docs + captures
│   ├── CODE_PATTERNS.md      #   Code pattern examples
│   ├── TESTING_STRATEGY.md   #   Testing strategy guide
│   ├── VALIDATION.md         #   Validation commands + bundle limits
│   ├── SECURITY_CHECKLIST.md #   Security review checklist
│   ├── REVIEW_CHECKLIST.md   #   PR review checklist
│   └── DATA_RETENTION.md     #   Local data storage documentation
├── scripts/                  # Build/CI scripts
│   ├── pre-commit-validate.sh#   Pre-commit validation hook
│   └── update-speckit.sh     #   SpecKit update script
├── .claude/                  # Claude Code configuration
│   ├── settings.json         #   Permissions + hooks
│   ├── commands/             #   Slash commands (build, lint, test, review, etc.)
│   ├── agents/               #   Custom agents
│   └── hooks/                #   Session start, pre-commit, post-push hooks
├── .specify/                 # SpecKit feature spec templates
├── .changeset/               # Changelog staging
└── .github/workflows/        # CI/CD workflows
```

**Package manager**: pnpm 10 (workspaces defined in `pnpm-workspace.yaml`)

**Node.js**: >= 22.0.0 (configured via devenv.nix)

**Shared imports** (subpath exports):
```typescript
import { useAssignments } from '@volleykit/shared/hooks'
import { apiClient } from '@volleykit/shared/api'
import { useAuthStore } from '@volleykit/shared/stores'
import { useTranslation } from '@volleykit/shared/i18n'
import { formatDate } from '@volleykit/shared/utils'
import type { Assignment } from '@volleykit/shared/types'
import { WebAdapter } from '@volleykit/shared/adapters'
import { offlineManager } from '@volleykit/shared/offline'
```

## Code Standards

**Naming** (ESLint enforced): Components `PascalCase`, Hooks `useCamelCase`, Constants `SCREAMING_SNAKE_CASE`

**React**: Zustand for client state, TanStack Query for server state. Query keys in `packages/shared/src/api/queryKeys.ts`. Use `useTranslation()` hook in .tsx.

**Validation**: Zod for schema validation (v4 in web-app, v3 in mobile).

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
# Root-level
pnpm install                           # Install all dependencies
pnpm run generate:api                  # Generate API types from OpenAPI spec
pnpm run lint                          # Lint all packages
pnpm run format                        # Format all files
pnpm run format:check                  # Check formatting
pnpm run test                          # Test all packages
pnpm run build                         # Build all packages

# Web App (run from web-app/)
pnpm run dev                           # Start dev server
pnpm run build                         # Production build (tsc + vite)
pnpm run lint                          # ESLint (0 warnings)
pnpm run lint:fix                      # ESLint auto-fix
pnpm run knip                          # Dead code detection
pnpm test                              # Vitest unit + integration tests
pnpm run test:coverage                 # Tests with coverage
pnpm run test:e2e                      # Playwright E2E tests
pnpm run size                          # Bundle size check

# Shared Package (run from packages/shared/)
pnpm test                              # Vitest tests
pnpm run typecheck                     # TypeScript check
pnpm run lint                          # ESLint

# Mobile App (run from packages/mobile/)
pnpm start                             # Expo dev server
pnpm run typecheck                     # TypeScript check
pnpm run lint                          # ESLint
pnpm test                              # Jest tests

# Worker (run from worker/ or root with wrangler)
pnpm test                              # Worker tests
pnpm run lint                          # ESLint

# Help Site (run from help-site/)
pnpm run dev                           # Astro dev server
pnpm run build                         # Build + Pagefind index
```

## Testing

| Layer       | Tool       | Location                    | Run with          |
| ----------- | ---------- | --------------------------- | ----------------- |
| Unit        | Vitest     | `*.test.tsx`                | `pnpm test`       |
| Integration | Vitest     | `*.integration.test.tsx`    | `pnpm test`       |
| E2E         | Playwright | `web-app/e2e/*.spec.ts`     | `pnpm run test:e2e` |
| Mobile      | Jest       | `packages/mobile/`          | `pnpm test`       |

**API mocking**: MSW (Mock Service Worker) - handlers in `web-app/src/test/msw/`.

**Coverage thresholds** (Vitest): Lines 50%, Functions 70%, Branches 70%, Statements 50%.

## Bundle Size Limits (gzipped)

| Component            | Limit  |
| -------------------- | ------ |
| Main App Bundle      | 145 KB |
| Vendor Chunks (each) | 50 KB  |
| PDF Library (lazy)   | 185 KB |
| Image Cropper (lazy) | 10 KB  |
| CSS                  | 12 KB  |
| Total JS             | 580 KB |

## CI/CD

Key workflows in `.github/workflows/`:

| Workflow              | Purpose                              |
| --------------------- | ------------------------------------ |
| `ci.yml`              | Web app lint, test, build, size      |
| `ci-mobile.yml`       | Mobile lint, typecheck, test         |
| `ci-worker.yml`       | Worker lint, test                    |
| `deploy-web.yml`      | Deploy web app (GitHub Pages)        |
| `deploy-worker.yml`   | Deploy worker (Cloudflare)           |
| `release.yml`         | Changeset release automation         |
| `claude-code-review.yml` | Automated PR review with Claude   |
| `codeql.yml`          | Security analysis                    |

## Definition of Done

1. Follows React/TypeScript best practices
2. Changeset added for feat/fix commits
3. Tests cover business logic
4. Translations in all 4 languages (de/en/fr/it)
5. All validation passes (lint, knip, test, build)
6. Accessible (keyboard nav, screen reader, aria attributes)
7. No bundle size regressions
