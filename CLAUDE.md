# CLAUDE.md - VolleyKit Web App

## Project Overview

A progressive web application (PWA) that provides an improved interface for volleymanager.volleyball.ch, the Swiss volleyball referee management system.

**Target**: https://volleymanager.volleyball.ch (Swiss volleyball referee management)

## Staying Current with Best Practices

**IMPORTANT**: Always consult official documentation for the latest best practices before implementing features:

- **React**: Check [react.dev](https://react.dev) for latest patterns and APIs
- **TypeScript**: Review [typescriptlang.org](https://www.typescriptlang.org/docs/) for current features
- **Vite**: Check [vite.dev](https://vite.dev) for build configuration
- **Packages**: Always check package documentation on [npmjs.com](https://www.npmjs.com) for latest version compatibility and migration guides

## Detailed Guides

For code reviews and detailed examples, see:

- **[Changelog](CHANGELOG.md)** - Version history and release notes
- **[Security Checklist](docs/SECURITY_CHECKLIST.md)** - Security review checklist (XSS, injection, auth)
- **[Code Patterns](docs/CODE_PATTERNS.md)** - Detailed code examples and anti-patterns
- **[Testing Strategy](docs/TESTING_STRATEGY.md)** - When to use unit, integration, and E2E tests

## AI Development Workflow

### Implement, Commit, Push

**Workflow**:
1. **Implement features/fixes** - Complete the work as required
2. **Update CHANGELOG.md** - Add entry to `[Unreleased]` section for any `feat:` or `fix:` changes (see [Changelog Maintenance](#changelog-maintenance-claude-instructions))
3. **Commit** - The pre-commit hook automatically validates before allowing the commit
4. **Push** - Push your changes to the remote

### Automatic Pre-Commit Validation (Claude Code Web Only)

A git pre-commit hook (`scripts/pre-commit-validate.sh`) automatically runs validation before any commit **in Claude Code web environment only** (`CLAUDE_CODE_REMOTE=true`). Human developers are not affected and rely on CI. This is configured via devenv and runs:

1. **Detect staged changes** - Skip validation for docs-only changes
2. **Generate API types** - If `volleymanager-openapi.yaml` is staged
3. **Run lint, knip, test in PARALLEL** - Maximum speed by running concurrently
4. **Run build** - Production build (only if parallel steps pass)

The commit is **blocked** if any validation step fails. Fix issues and commit again.

**When validation runs automatically**:
- Adding, modifying, or deleting `.ts`, `.tsx`, `.js`, `.jsx` files
- Modifying imports, exports, or dependencies
- Changing type definitions or interfaces
- Updating configuration files (`vite.config.ts`, `tsconfig.json`, etc.)

**When validation is skipped** (by the hook):
- Changes to `.md` documentation files only
- No source files changed

**Manual validation** (for debugging or running individually):

```bash
cd web-app
npm run generate:api  # If API types are affected
npm run lint          # Lint check (0 warnings allowed)
npm run knip          # Dead code detection
npm test              # Run all tests
npm run build         # Production build (includes tsc)
```

### Claude Code Post-Push Hooks (Claude Code Web Only)

After a successful `git push`, these hooks run automatically in Claude Code web sessions. **IMPORTANT**: When these hooks return a `"decision": "block"` response, Claude MUST follow the instructions in the `reason` field immediately and autonomously.

1. **post-git-push.sh** - Generates PR links or updates existing PRs
   - If no PR exists: Outputs a clickable link to create one
   - If PR exists: Updates title/body via GitHub API (when `GITHUB_TOKEN` available)

2. **address-pr-reviews.sh** - Automatically addresses PR review comments
   - **Claude MUST**: Wait 2 minutes (`sleep 120`), then fetch and address review comments
   - Fetches Claude Code Review comments from `claude[bot]`
   - Parses "Issues Found" section and addresses each issue
   - Creates a single `fix(review):` commit with all fixes
   - **Anti-infinite-loop safeguards**:
     - Skips if last commit has `fix(review):` prefix (won't re-trigger)
     - Max 3 review cycles per session per PR
     - 5-minute cooldown between checks
     - Only processes unresolved issues from the latest review

3. **address-pr-reviews-on-create.sh** - Addresses reviews when PR is created
   - Triggers when a new PR is created via GitHub API (curl POST to /pulls)
   - **Claude MUST**: Wait 2 minutes, then fetch and address review comments (same as above)
   - Shares state file with push hook to prevent duplicate processing

The hooks are configured in `.claude/settings.json` and state is tracked in `.claude/.state/` (gitignored).

**Hook Response Format**: Hooks return JSON with `decision` and `reason` fields. When `decision` is `"block"`, Claude must parse the `reason` field and execute the instructions contained within it.

## Tech Stack

- **Framework**: React 19 with TypeScript 5.9
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand 5 (client state), TanStack Query 5 (server state)
- **Routing**: React Router v7
- **Validation**: Zod 4
- **API Client**: Generated from OpenAPI spec with openapi-typescript
- **Testing**: Vitest 4 + React Testing Library (unit/integration), Playwright (E2E)
- **i18n**: Custom translation system (de, en, fr, it)
- **CORS Proxy**: Cloudflare Workers (production)
- **Icons**: Lucide React
- **Dates**: date-fns 4
- **PDF**: pdf-lib (lazy-loaded)
- **Transport**: OJP SDK (Swiss public transport)

## Project Structure

The project uses a **feature-based folder structure** for clear domain boundaries and better code organization.

```
volleykit/
├── web-app/                    # React PWA
│   ├── e2e/                   # Playwright E2E tests
│   │   ├── *.spec.ts          # Test specifications
│   │   └── pages/             # Page Object Models
│   ├── public/                # Static PWA assets (icons, manifest)
│   ├── src/
│   │   ├── api/               # Core API client and types
│   │   │   ├── client.ts      # API fetch wrapper with error handling
│   │   │   ├── mock-api.ts    # Demo mode API simulation
│   │   │   ├── queryKeys.ts   # TanStack Query key definitions
│   │   │   ├── schema.ts      # Generated OpenAPI types (do not edit)
│   │   │   └── validation.ts  # Zod schemas for API responses
│   │   ├── features/          # Feature modules (domain-driven)
│   │   │   ├── assignments/   # Assignment management feature
│   │   │   │   ├── components/    # AssignmentCard, CalendarErrorModal, etc.
│   │   │   │   ├── hooks/         # useAssignments, useAssignmentActions
│   │   │   │   ├── api/           # Calendar API client, iCal parser
│   │   │   │   ├── utils/         # assignment-actions, assignment-helpers
│   │   │   │   └── AssignmentsPage.tsx
│   │   │   ├── compensations/ # Compensation management feature
│   │   │   │   ├── components/    # CompensationCard, EditCompensationModal
│   │   │   │   ├── hooks/         # useCompensations, useCompensationActions
│   │   │   │   ├── utils/         # compensation-actions
│   │   │   │   └── CompensationsPage.tsx
│   │   │   ├── exchanges/     # Exchange/swap feature
│   │   │   │   ├── components/    # ExchangeCard, ExchangeSettingsSheet
│   │   │   │   ├── hooks/         # useExchanges, useExchangeActions
│   │   │   │   ├── utils/         # exchange-actions
│   │   │   │   └── ExchangePage.tsx
│   │   │   ├── validation/    # Game validation wizard
│   │   │   │   ├── components/    # ValidateGameModal, panels, wizard UI
│   │   │   │   ├── hooks/         # useValidateGameWizard, useValidationState
│   │   │   │   ├── api/           # Validation API helpers
│   │   │   │   └── utils/         # roster-validation
│   │   │   ├── settings/      # User settings feature
│   │   │   │   ├── components/    # ProfileSection, LanguageSection, etc.
│   │   │   │   ├── hooks/         # useSettings
│   │   │   │   └── SettingsPage.tsx
│   │   │   └── auth/          # Authentication feature
│   │   │       ├── hooks/         # useActiveAssociation
│   │   │       ├── utils/         # auth-parsers, parseOccupations
│   │   │       └── LoginPage.tsx
│   │   ├── shared/            # Shared/common code
│   │   │   ├── components/    # Reusable UI components
│   │   │   │   ├── layout/        # AppShell, navigation
│   │   │   │   ├── tour/          # Onboarding tour system
│   │   │   │   └── ...            # Button, Modal, Card, etc.
│   │   │   ├── hooks/         # Common hooks
│   │   │   │   ├── useTranslation.ts
│   │   │   │   ├── useSwipeGesture.ts
│   │   │   │   └── ...
│   │   │   ├── utils/         # Common utilities
│   │   │   │   ├── date-helpers.ts
│   │   │   │   ├── error-helpers.ts
│   │   │   │   └── ...
│   │   │   ├── stores/        # Zustand stores
│   │   │   │   ├── auth.ts        # Authentication state
│   │   │   │   ├── demo/          # Demo mode state
│   │   │   │   ├── settings.ts    # User preferences
│   │   │   │   └── ...
│   │   │   └── services/      # External service integrations
│   │   │       └── transport/     # Swiss public transport (OJP)
│   │   ├── contexts/          # React context providers (PWA)
│   │   ├── i18n/              # Internationalization
│   │   │   ├── types.ts       # Translation key types (edit this first)
│   │   │   ├── index.ts       # Translation functions
│   │   │   └── locales/       # Translation files (de, en, fr, it)
│   │   ├── test/              # Test setup and utilities
│   │   └── types/             # TypeScript type declarations
│   ├── playwright.config.ts   # E2E test configuration
│   ├── vite.config.ts         # Vite + PWA configuration
│   └── package.json
├── worker/                     # Cloudflare Worker CORS proxy
│   └── src/
│       └── index.ts           # Proxy with security, rate limiting
├── docs/                       # Documentation
│   ├── api/                   # API documentation
│   │   ├── volleymanager-openapi.yaml  # Complete OpenAPI spec
│   │   ├── *_api.md           # Endpoint documentation
│   │   └── captures/          # Real API request/response examples
│   ├── SECURITY_CHECKLIST.md  # Security review guide
│   ├── CODE_PATTERNS.md       # Code examples and patterns
│   └── DATA_RETENTION.md      # Data handling documentation
├── .github/workflows/         # CI/CD pipelines
│   ├── ci.yml                 # Consolidated CI (lint, test, build, E2E, Lighthouse)
│   ├── ci-worker.yml          # Worker validation
│   ├── deploy-web.yml         # Production deployment
│   ├── deploy-pr-preview.yml  # PR preview builds
│   ├── codeql.yml             # Security analysis
│   └── claude*.yml            # AI code review
└── devenv.nix                  # Nix development environment
```

### Feature Module Structure

Each feature module follows a consistent structure:
- **components/**: UI components specific to this feature
- **hooks/**: Custom hooks for data fetching and state
- **api/**: API clients and helpers (if needed)
- **utils/**: Business logic and helper functions

Import from features using: `@/features/assignments`, `@/features/compensations`, etc.

## Development Environment

### Nix/devenv (Recommended)

The project uses [devenv](https://devenv.sh) for reproducible development environments:

```bash
# Enter development environment (auto-installs dependencies)
devenv shell

# Available commands
dev            # Start dev server
build          # Production build
run-tests      # Run unit tests
lint           # Run ESLint
generate-api   # Generate API types from OpenAPI spec
worker-dev     # Start Cloudflare Worker locally
worker-deploy  # Deploy worker to Cloudflare
```

### Git Hooks (via devenv)

**Pre-commit** (automatic on commit):
- **treefmt**: Code formatting (Prettier, nixfmt, yamlfmt)
- **ripsecrets**: Secret detection
- **convco**: Conventional commit messages
- **check-merge-conflicts**: Conflict markers
- **check-yaml/json**: File validation
- **pre-commit-validate**: Runs lint, knip, tests, and build (see `scripts/pre-commit-validate.sh`) - Claude Code web only

### Without Nix

```bash
cd web-app && npm install
cd worker && npm install
```

## Code Philosophy

### Self-Documenting Code Over Comments

Write code that explains itself. Comments are for explaining *why*, not *what*.
Use TODOs with ticket references: `// TODO(#123): Remove after API migration`

### Naming Conventions

ESLint enforces these conventions:

- **Components**: PascalCase (`AssignmentCard`)
- **Hooks**: camelCase with `use` prefix (`useAssignments`)
- **Types/Interfaces**: PascalCase (`Assignment`, `AssignmentStatus`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_BASE_URL`)
- **Variables/functions**: camelCase (`isAuthenticated`, `fetchAssignments`)
- **Files**: kebab-case for components, camelCase for utilities

### Function Design

- Max 20-30 lines per function (extract if longer)
- Max 3-4 parameters (use object parameter if more)
- Single responsibility - each function does one thing
- Prefer early returns over deep nesting

## React Best Practices

### Modern React (19) Guidelines

This project uses React 19. Avoid outdated patterns:

- **No `isMountedRef` pattern** - Use `AbortController` or TanStack Query instead
- **Prefer TanStack Query** for data fetching (handles cancellation automatically)
- **Use concurrent features** - Transitions, Suspense boundaries for loading states
- **Avoid class components** - Use function components with hooks exclusively

### State Management

- **Zustand** for global client state (auth, preferences) - see `src/shared/stores/`
- **TanStack Query** for server state (API data) - see feature hooks in `src/features/*/hooks/`

### Query Keys Pattern

Query keys are centralized in `src/api/queryKeys.ts`:

```typescript
// Using query keys
import { queryKeys } from '@/api/queryKeys';

useQuery({
  queryKey: queryKeys.assignments.all(),
  queryFn: fetchAssignments,
});

// Invalidating related queries
queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all() });
```

## Common Anti-patterns to Avoid

| Anti-pattern | Solution |
|--------------|----------|
| Magic numbers (`if (x > 20)`) | Named constants (`MINIMUM_SWIPE_DISTANCE_PX`) |
| Array index as React key | Use unique `id` field from data |
| Uncleared intervals/timeouts | Return cleanup function from `useEffect` |
| Race conditions on rapid clicks | Guard with `useRef` flag or disable button |
| `isMountedRef` pattern | Use `AbortController` or TanStack Query |
| Direct `t()` import in .tsx | Use `useTranslation()` hook (ESLint enforced) |

## Testing

### Test Philosophy

**Test**: Business logic, custom hooks, component interactions, edge cases that caused bugs.
**Skip**: Simple presentational components, third-party wrappers, trivial getters/setters.

See existing tests in `src/**/*.test.ts` for patterns.

### Coverage Requirements

Minimum thresholds enforced by Vitest (see `vite.config.ts`):
- Lines: 50%
- Functions: 70%
- Branches: 70%
- Statements: 50%

### E2E Testing with Playwright

E2E tests use Page Object Models (POMs) in `web-app/e2e/pages/`.

**Cross-Browser Testing**: Chromium, Firefox, WebKit + mobile viewports (Pixel 5, iPhone 12).

**Configuration** (`playwright.config.ts`):
- Test timeout: 30s
- Expect timeout: 10s
- Retries: 2 on CI, 1 locally
- Screenshots on failure
- Trace on first retry

## Internationalization (i18n)

The app supports 4 languages: German (de), English (en), French (fr), Italian (it).

**Usage in Components** (ESLint enforced):
```typescript
import { useTranslation } from '@/hooks/useTranslation';

function MyComponent() {
  const { t } = useTranslation();
  return <span>{t('assignments.title')}</span>;
}
```

**Adding Translations**:
1. Add the key to `src/i18n/types.ts` for type safety
2. Add translations to all 4 locale files in `src/i18n/locales/`
3. Use nested keys: `section.subsection.key`

**Note**: Direct imports of `t` from `@/i18n` in `.tsx` files are blocked by ESLint to ensure proper reactivity.

## Demo Mode

The app supports demo mode for testing without API access.

- **Enable**: `VITE_DEMO_MODE_ONLY=true` (PR previews use this automatically)
- **Demo Store** (`src/stores/demo/`): Modular demo data with seeded UUIDs
- **Mock API** (`src/api/mock-api.ts`): Simulates all endpoints
- **Contract Tests** (`src/api/contract.test.ts`): Verify mock matches real API schema

## API Integration

### SwissVolley API Documentation

**IMPORTANT**: Before implementing API features, consult `docs/api/`:

- **OpenAPI Spec**: `docs/api/volleymanager-openapi.yaml`
- **Endpoint Docs**: `auth_api.md`, `assignments_api.md`, `compensations_api.md`, `exchanges_api.md`
- **Captured Examples**: `docs/api/captures/` - Real request/response examples

### Generated Types

```bash
npm run generate:api  # Generates src/api/schema.ts from OpenAPI spec
```

**Important**: Always run this before lint/test/build. The `schema.ts` file is gitignored.

### CORS Handling

- **Development**: Vite proxy handles CORS (see `vite.config.ts` proxy config)
- **Production**: Cloudflare Worker proxy at `worker/`

## Security

### ESLint Security Plugins

- `eslint-plugin-security`: Detects common security issues
- `eslint-plugin-no-unsanitized`: Prevents XSS via DOM manipulation

### Best Practices

- Session cookies managed by the API (httpOnly)
- CSRF tokens included in requests
- Never log credentials or tokens
- Environment variables in `.env.local` (never commit)
- Use `URLSearchParams` for query parameters (never string interpolation)

### Files with Elevated Security Sensitivity

- `worker/src/index.ts` - CORS proxy, origin validation
- `src/api/client.ts` - API requests, credential handling
- `src/stores/auth.ts` - Authentication state

## Git Conventions

**Commit Messages** (enforced by convco pre-commit hook):
- `feat(scope): description` - New features
- `fix(scope): description` - Bug fixes
- `refactor(scope): description` - Code refactoring
- `test(scope): description` - Tests
- `docs(scope): description` - Documentation
- `chore(scope): description` - Maintenance

**Branch Naming**: `feature/description`, `bugfix/description`, `refactor/description`

## Semantic Versioning & Changelog

This project uses [Semantic Versioning](https://semver.org/) and maintains a [Changelog](CHANGELOG.md) following [Keep a Changelog](https://keepachangelog.com/) format.

### Version Format: MAJOR.MINOR.PATCH

- **MAJOR**: Breaking changes requiring user action (e.g., authentication flow changes, feature removal)
- **MINOR**: New backwards-compatible features (e.g., new pages, settings, enhancements)
- **PATCH**: Bug fixes and minor improvements (e.g., fixes, performance, translations)

### Changelog Maintenance (Claude Instructions)

**When to update the changelog**:
- After implementing a new feature (`feat:` commits)
- After fixing a bug (`fix:` commits)
- After making breaking changes
- After security-related changes

**How to update**:
1. Add entries to the `[Unreleased]` section in `CHANGELOG.md`
2. Use the appropriate subsection: Added, Changed, Deprecated, Removed, Fixed, Security
3. Include the PR/issue number: `- Description of change (#123)`
4. Write user-facing descriptions (what users will notice, not implementation details)
5. **For breaking changes**: Prefix the entry with `BREAKING:` (see below)

**Entry format**:
```markdown
### Added
- Calendar export to Google Calendar and Apple Calendar (#123)

### Fixed
- Assignment dates now display correctly in all timezones (#126)

### Changed
- BREAKING: Authentication now requires email instead of username (#130)
```

**Breaking change markers** (triggers MAJOR version bump):
- `BREAKING:` - Prefix for breaking changes
- `BREAKING CHANGE:` - Alternative prefix
- `[BREAKING]` - Inline marker

**What counts as a breaking change** (use `BREAKING:` prefix):
- Removing or renaming public APIs, components, or props
- Changing authentication or authorization flows
- Removing features users depend on
- Changing data formats that affect stored data
- Requiring user action after update (re-login, clear cache, etc.)

The release workflow auto-detects the version bump type:
- **MAJOR**: Any entry contains `BREAKING:`, `BREAKING CHANGE:`, or `[BREAKING]`
- **MINOR**: `### Added` section has entries (new features)
- **PATCH**: Only `### Fixed`, `### Changed`, etc. without breaking markers

### PWA Version Display

The app version is displayed in Settings > About. It shows:
- **Version**: From `package.json` (e.g., "1.0.0")
- **Git Hash**: Short commit hash for build identification

The PWA automatically checks for updates and prompts users when a new version is deployed.

### Releasing a New Version

Releases are fully automated via the **Release workflow** (`.github/workflows/release.yml`).

**To create a release**:
1. Go to **Actions** > **Release** workflow in GitHub
2. Click **Run workflow**
3. Leave version type as `auto` (recommended) or manually select:
   - `auto` - **Automatically detects** from changelog content (default)
   - `patch` - Bug fixes (1.0.0 -> 1.0.1)
   - `minor` - New features (1.0.0 -> 1.1.0)
   - `major` - Breaking changes (1.0.0 -> 2.0.0)
4. Optionally enable **Dry run** to preview changes without committing

**Auto-detection rules** (from changelog content):
- **MAJOR**: Entry contains `BREAKING:`, `BREAKING CHANGE:`, or `[BREAKING]`
- **MINOR**: `### Added` section has entries
- **PATCH**: Only fixes, changes, or other non-breaking updates

**What the workflow does**:
1. Validates the codebase (lint, test, build)
2. Auto-detects version bump type from changelog (or uses manual selection)
3. Updates CHANGELOG.md using [keep-a-changelog-action](https://github.com/release-flow/keep-a-changelog-action):
   - Moves `[Unreleased]` entries to new version section
   - Updates comparison links
   - Outputs the new version number
4. Updates `web-app/package.json` and `package-lock.json` with the **same version**
5. Verifies all three files have matching versions (fails if mismatch)
6. Creates commit: `chore(release): prepare vX.Y.Z release`
7. Creates git tag: `vX.Y.Z`
8. Creates GitHub Release with changelog excerpt
9. Deployment triggers automatically via `deploy-web.yml`

**Manual release** (if needed):
1. Move `[Unreleased]` entries to a new version section with date
2. Update version in `web-app/package.json`
3. Update comparison links at the bottom of `CHANGELOG.md`
4. Create a git tag: `git tag -a v1.1.0 -m "Release 1.1.0"`

## Commands Reference

### CI Validation (Run Before Push and PRs)

**CRITICAL**: Run validation before pushing source code changes (see [AI Development Workflow](#ai-development-workflow) for when to skip). Always run full validation before creating a pull request.

```bash
cd web-app
npm run generate:api  # REQUIRED before lint/test/build
npm run lint          # Lint check (0 warnings allowed)
npm run knip          # Dead code detection
npm test              # Run all tests
npm run build         # Production build (includes tsc)
npm run size          # Check bundle size (before PRs)
```

### Development

```bash
cd web-app
npm run dev           # Start dev server with hot reload
npm run test:watch    # Watch mode for tests
npm run test:coverage # Tests with coverage report
```

### E2E Testing

```bash
cd web-app
npm run build                           # Build first (required)
npm run test:e2e                        # Run all E2E tests
npm run test:e2e:ui                     # Interactive Playwright UI mode
npx playwright test --project=chromium  # Single browser
```

**Note**: E2E tests run against production build (`npm run preview`), not dev server.

### Worker (CORS proxy)

```bash
cd worker
npm run dev           # Local worker dev
npm run lint          # Lint worker code
npm test              # Test worker
npx wrangler deploy   # Deploy to Cloudflare
```

## Bundle Size Limits

CI will fail if limits are exceeded (gzipped):

| Component | Limit |
|-----------|-------|
| Main App Bundle | 145 KB |
| Vendor Chunks (each) | 50 KB |
| PDF Library | 185 KB (lazy-loaded) |
| CSS | 10 KB |
| Total JS | 460 KB |

**Check size**: `npm run build && npm run size`

**Bundle Analysis**: After build, open `stats.html` for detailed visualization.

### Bundle Splitting

Manual chunks defined in `vite.config.ts`:
- `react-vendor`: React, React DOM
- `router`: React Router
- `state`: Zustand, TanStack Query
- `validation`: Zod
- `pdf-lib`: PDF generation (lazy-loaded)

## Accessibility

- Use `aria-label` on icon-only buttons
- Use `aria-labelledby` to associate modal titles with dialogs
- Handle Escape key for modals via `useEffect`, not on backdrop
- Use `role="alert"` and `aria-live="polite"` for notifications
- All interactive elements must be keyboard accessible

ESLint plugin `jsx-a11y` enforces many accessibility rules.

## PWA Features

- **Service Worker**: Auto-updating, precaches app shell
- **Offline Support**: NetworkFirst for API, CacheFirst for assets
- **Install Prompt**: Handled via `PWAContext`
- **Update Notification**: `ReloadPromptPWA` component

**Note**: PWA is disabled for PR previews to avoid service worker scope conflicts.

## Definition of Done

1. Implementation follows React/TypeScript best practices
2. **CHANGELOG.md updated** - Required for `feat:` and `fix:` commits. Add entry to `[Unreleased]` section with PR number. Use `BREAKING:` prefix for breaking changes. (see [Changelog Maintenance](#changelog-maintenance-claude-instructions))
3. Unit tests cover business logic and interactions
4. E2E tests added for critical user flows (if applicable)
5. Translations added for all 4 languages (de, en, fr, it)
6. **All validation phases pass before push** (lint, knip, test, build - see [AI Development Workflow](#ai-development-workflow))
7. Bundle size limits not exceeded
8. Works across modern browsers (Chrome, Firefox, Safari)
9. Accessible (keyboard navigation, screen reader compatible)
10. No ESLint warnings (`--max-warnings 0`)
