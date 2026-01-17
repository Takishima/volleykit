# CLAUDE.md - VolleyKit Monorepo

## Project Overview

VolleyKit is a multi-platform application suite for Swiss volleyball referee management, providing improved interfaces for volleymanager.volleyball.ch.

**Target**: https://volleymanager.volleyball.ch (Swiss volleyball referee management)

**Applications**:
- **Web App (PWA)**: Progressive web application at `web-app/`
- **Mobile App**: React Native/Expo app at `packages/mobile/`
- **Help Site**: Astro-based documentation at `help-site/`
- **OCR POC**: Scoresheet OCR proof of concept at `ocr-poc/`
- **CORS Proxy**: Cloudflare Worker at `worker/`

## Staying Current with Best Practices

**IMPORTANT**: Always consult official documentation for the latest best practices before implementing features:

- **React**: Check [react.dev](https://react.dev) for latest patterns and APIs
- **React Native**: Check [reactnative.dev](https://reactnative.dev) for mobile patterns
- **Expo**: Check [docs.expo.dev](https://docs.expo.dev) for Expo-specific APIs
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
2. **Add changeset** - For any `feat:` or `fix:` changes, run `npx changeset` to create a changelog entry (see [Adding Changesets](#adding-changesets-claude-instructions))
3. **Commit** - The pre-commit hook automatically validates before allowing the commit
4. **Push** - Push your changes to the remote

### Automatic Pre-Commit Validation (Claude Code Web Only)

A git pre-commit hook (`scripts/pre-commit-validate.sh`) automatically runs validation before any commit **in Claude Code web environment only** (`CLAUDE_CODE_REMOTE=true`). Human developers are not affected and rely on CI. This is configured via devenv and runs:

1. **Detect staged changes** - Skip validation for docs-only changes
2. **Generate API types** - If `volleymanager-openapi.yaml` is staged
3. **Run format, lint, knip, test in PARALLEL** - Maximum speed by running concurrently
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
npm run format:check  # Check formatting (Prettier)
npm run format        # Auto-fix formatting issues
npm run lint          # Lint check (0 warnings allowed)
npm run lint:fix      # Auto-fix lint issues where possible
npm run knip          # Dead code detection
npm test              # Run all tests
npm run build         # Production build (includes tsc)
```

### Claude Code Post-Push Hooks (Claude Code Web Only)

After a successful `git push`, hooks run automatically in Claude Code web sessions. When hooks return a `"decision": "block"` response, Claude MUST follow the instructions in the `reason` field immediately.

1. **post-git-push.sh** - Generates PR links or updates existing PRs
   - If no PR exists: Outputs a clickable link to create one
   - If PR exists: Updates title/body via GitHub API (when `GITHUB_TOKEN` available)

### PR Review Command

To create a PR and address Claude Code Review comments, use the `/pr-review` command. This is useful on mobile/iPhone where typing is limited. The command:
- Creates or updates a PR for the current branch
- Waits 2 minutes for Claude Code Review workflow
- Fetches and addresses any issues found
- Commits fixes with `fix(review):` prefix to prevent loops

## Tech Stack

### Web App (PWA)
- **Framework**: React 19 with TypeScript 5.9
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand 5 (client state), TanStack Query 5 (server state)
- **Routing**: React Router v7
- **Validation**: Zod 4
- **API Client**: Generated from OpenAPI spec with openapi-typescript
- **Testing**: Vitest 4 + React Testing Library (unit/integration), Playwright (E2E)
- **i18n**: Custom translation system (de, en, fr, it)
- **Icons**: Lucide React
- **Dates**: date-fns 4
- **PDF**: pdf-lib (lazy-loaded)
- **Transport**: OJP SDK (Swiss public transport)

### Mobile App (React Native)
- **Framework**: React Native 0.79 with Expo 53
- **Navigation**: React Navigation 7
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: Zustand 5 (via @volleykit/shared), TanStack Query 5
- **Authentication**: expo-local-authentication (biometrics)
- **Storage**: expo-secure-store, AsyncStorage
- **Calendar**: expo-calendar
- **Location**: expo-location
- **Notifications**: expo-notifications
- **Background Tasks**: expo-task-manager
- **Widgets**: react-native-widgetkit (iOS), react-native-android-widget

### Shared Package (@volleykit/shared)
- Platform-agnostic API client, validation schemas, query keys
- TanStack Query hooks (useAssignments, useCompensations, useExchanges)
- Zustand stores (auth, settings) with platform adapter interfaces
- i18n translations
- Date and error helpers
- ~70% code sharing between web and mobile

### Infrastructure
- **CORS Proxy**: Cloudflare Workers (production)
- **Help Site**: Astro 6 with Pagefind search
- **CI/CD**: GitHub Actions

## Project Structure

The project is a **monorepo** using npm workspaces with a **feature-based folder structure** for clear domain boundaries.

```
volleykit/
├── .changeset/                 # Changelog staging (Changesets)
│   ├── config.json            # Changesets configuration
│   └── *.md                   # Pending changelog entries
├── .claude/                    # Claude Code configuration
│   ├── agents/                # Custom agent definitions
│   ├── commands/              # Slash commands (e.g., /pr-review)
│   ├── hooks/                 # Git hooks for Claude Code
│   └── settings.json          # Claude Code settings
├── .specify/                   # Spec-kit integration
│   ├── memory/                # Feature memory
│   ├── scripts/               # Spec-kit scripts
│   └── templates/             # Spec templates
├── packages/
│   ├── shared/                # @volleykit/shared - shared code
│   │   └── src/
│   │       ├── adapters/      # Platform adapters (storage, etc.)
│   │       ├── api/           # API client, schema, validation
│   │       ├── hooks/         # Shared TanStack Query hooks
│   │       ├── i18n/          # Translations (de, en, fr, it)
│   │       ├── stores/        # Zustand stores
│   │       ├── types/         # Shared TypeScript types
│   │       └── utils/         # Shared utilities
│   └── mobile/                # @volleykit/mobile - React Native app
│       ├── src/
│       │   ├── components/    # React Native components
│       │   ├── contexts/      # React contexts
│       │   ├── hooks/         # Mobile-specific hooks
│       │   ├── navigation/    # React Navigation config
│       │   ├── platform/      # Platform adapters
│       │   ├── providers/     # App providers
│       │   ├── screens/       # Screen components
│       │   ├── services/      # Background services
│       │   ├── stores/        # Mobile-specific stores
│       │   ├── types/         # Mobile types
│       │   └── utils/         # Mobile utilities
│       └── app.json           # Expo configuration
├── web-app/                    # volleykit-web - React PWA
│   ├── e2e/                   # Playwright E2E tests
│   │   ├── *.spec.ts          # Test specifications
│   │   └── pages/             # Page Object Models
│   ├── public/                # Static PWA assets (icons, manifest)
│   ├── src/
│   │   ├── api/               # Web-specific API code
│   │   │   ├── client.ts      # API fetch wrapper
│   │   │   ├── mock-api.ts    # Demo mode simulation
│   │   │   ├── queryKeys.ts   # Query key re-exports
│   │   │   ├── schema.ts      # Generated OpenAPI types
│   │   │   └── validation.ts  # Zod schemas
│   │   ├── features/          # Feature modules (domain-driven)
│   │   │   ├── assignments/   # Assignment management
│   │   │   ├── auth/          # Authentication
│   │   │   ├── compensations/ # Compensation tracking
│   │   │   ├── exchanges/     # Exchange/swap feature
│   │   │   ├── ocr/           # OCR scoresheet scanning
│   │   │   ├── referee-backup/# On-call (Pikett) feature
│   │   │   ├── settings/      # User settings
│   │   │   └── validation/    # Game validation wizard
│   │   ├── shared/            # Web-specific shared code
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── hooks/         # Web-specific hooks
│   │   │   ├── utils/         # Web utilities
│   │   │   ├── stores/        # Web-specific stores
│   │   │   └── services/      # External integrations
│   │   ├── contexts/          # React context providers
│   │   ├── i18n/              # i18n re-exports
│   │   ├── test/              # Test setup and utilities
│   │   └── types/             # Web type declarations
│   ├── playwright.config.ts   # E2E test configuration
│   └── vite.config.ts         # Vite + PWA configuration
├── help-site/                  # volleykit-help - Astro docs
│   └── src/
│       ├── components/        # Astro components
│       ├── data/              # Content data
│       ├── i18n/              # Help site translations
│       ├── layouts/           # Page layouts
│       ├── pages/             # Astro pages
│       ├── styles/            # CSS styles
│       └── utils/             # Utilities
├── ocr-poc/                    # OCR proof of concept
│   └── src/                   # Vite + React app for OCR testing
├── worker/                     # volleykit-proxy - Cloudflare Worker
│   └── src/
│       └── index.ts           # CORS proxy with security
├── docs/                       # Documentation
│   ├── api/                   # API documentation
│   │   ├── volleymanager-openapi.yaml  # Complete OpenAPI spec
│   │   ├── *_api.md           # Endpoint documentation
│   │   └── captures/          # Real API request/response examples
│   ├── SECURITY_CHECKLIST.md  # Security review guide
│   ├── CODE_PATTERNS.md       # Code examples and patterns
│   ├── DATA_RETENTION.md      # Data handling documentation
│   └── TESTING_STRATEGY.md    # Testing guidelines
├── scripts/                    # Build/CI scripts
│   └── pre-commit-validate.sh # Pre-commit validation
├── specs/                      # Feature specifications
├── .github/workflows/         # CI/CD pipelines
│   ├── ci.yml                 # Web app CI (lint, test, build, E2E)
│   ├── ci-mobile.yml          # Mobile app CI
│   ├── ci-worker.yml          # Worker validation
│   ├── deploy-web.yml         # Production deployment
│   ├── deploy-pr-preview.yml  # PR preview builds
│   ├── release.yml            # Release automation
│   ├── codeql.yml             # Security analysis
│   └── claude*.yml            # AI code review
├── devenv.nix                  # Nix development environment
├── package.json               # Root workspace config
└── wrangler.jsonc             # Cloudflare Worker config
```

### Feature Module Structure

Each feature module follows a consistent structure:
- **components/**: UI components specific to this feature
- **hooks/**: Custom hooks for data fetching and state
- **api/**: API clients and helpers (if needed)
- **utils/**: Business logic and helper functions

Import from features using: `@/features/assignments`, `@/features/compensations`, etc.

### Shared Package Imports

Import shared code in both web and mobile apps:
```typescript
// API and types
import { apiClient } from '@volleykit/shared/api';
import type { Assignment } from '@volleykit/shared/types';

// Hooks
import { useAssignments } from '@volleykit/shared/hooks';

// Stores
import { useAuthStore } from '@volleykit/shared/stores';

// i18n
import { t } from '@volleykit/shared/i18n';

// Utilities
import { formatDate } from '@volleykit/shared/utils';
```

## Development Environment

### Nix/devenv (Recommended)

The project uses [devenv](https://devenv.sh) for reproducible development environments:

```bash
# Enter development environment (auto-installs dependencies)
devenv shell

# Available commands
dev            # Start web-app dev server
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
# Install all workspace dependencies from root
npm install

# Or install individually
cd web-app && npm install
cd worker && npm install
cd packages/mobile && npm install
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

- **Zustand** for global client state (auth, preferences) - see `packages/shared/src/stores/`
- **TanStack Query** for server state (API data) - see hooks in `packages/shared/src/hooks/`

### Query Keys Pattern

Query keys are centralized in `packages/shared/src/api/queryKeys.ts`:

```typescript
// Using query keys
import { queryKeys } from '@volleykit/shared/api';

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

### E2E Testing with Playwright (Web App)

E2E tests use Page Object Models (POMs) in `web-app/e2e/pages/`.

**Cross-Browser Testing**: Chromium, Firefox, WebKit + mobile viewports (Pixel 5, iPhone 12).

**Configuration** (`playwright.config.ts`):
- Test timeout: 30s
- Expect timeout: 10s
- Retries: 2 on CI, 1 locally
- Screenshots on failure
- Trace on first retry

### Mobile App Testing

```bash
cd packages/mobile
npm test              # Run Jest tests
npm run typecheck     # TypeScript type checking
npm run lint          # ESLint
```

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
1. Add the key to `packages/shared/src/i18n/types.ts` for type safety
2. Add translations to all 4 locale files in `packages/shared/src/i18n/locales/`
3. Use nested keys: `section.subsection.key`

**Note**: Direct imports of `t` from `@/i18n` in `.tsx` files are blocked by ESLint to ensure proper reactivity.

## Demo Mode

The app supports demo mode for testing without API access.

- **Enable**: `VITE_DEMO_MODE_ONLY=true` (PR previews use this automatically)
- **Demo Store** (`web-app/src/stores/demo/`): Modular demo data with seeded UUIDs
- **Mock API** (`web-app/src/api/mock-api.ts`): Simulates all endpoints
- **Contract Tests** (`web-app/src/api/contract.test.ts`): Verify mock matches real API schema

## API Integration

### SwissVolley API Documentation

**IMPORTANT**: Before implementing API features, consult `docs/api/`:

- **OpenAPI Spec**: `docs/api/volleymanager-openapi.yaml`
- **Endpoint Docs**: `auth_api.md`, `assignments_api.md`, `compensations_api.md`, `exchanges_api.md`
- **Captured Examples**: `docs/api/captures/` - Real request/response examples

### Generated Types

```bash
npm run generate:api  # Generates schema.ts in shared and web-app from OpenAPI spec
```

**Important**: Always run this before lint/test/build. The `schema.ts` file is gitignored.

### CORS Handling

- **Development**: Vite proxy handles CORS (see `vite.config.ts` proxy config)
- **Production**: Cloudflare Worker proxy at `worker/`

## Security

### ESLint Plugins

**Security**:
- `eslint-plugin-security`: Detects common security issues
- `eslint-plugin-no-unsanitized`: Prevents XSS via DOM manipulation

**Code Quality**:
- `eslint-plugin-sonarjs`: Code complexity and quality rules
- `eslint-plugin-import-x`: Import ordering and validation
- `eslint-plugin-jsx-a11y`: Accessibility checks

**React**:
- `eslint-plugin-react-hooks`: Hook rules enforcement
- `eslint-plugin-react-refresh`: Fast Refresh compatibility

### Best Practices

- Session cookies managed by the API (httpOnly)
- CSRF tokens included in requests
- Never log credentials or tokens
- Environment variables in `.env.local` (never commit)
- Use `URLSearchParams` for query parameters (never string interpolation)
- Mobile: Use expo-secure-store for sensitive data

### Files with Elevated Security Sensitivity

- `worker/src/index.ts` - CORS proxy, origin validation
- `web-app/src/api/client.ts` - API requests, credential handling
- `packages/shared/src/stores/auth.ts` - Authentication state
- `packages/mobile/src/stores/` - Mobile secure storage

## Git Conventions

**Commit Messages** (enforced by convco pre-commit hook):
- `feat(scope): description` - New features
- `fix(scope): description` - Bug fixes
- `refactor(scope): description` - Code refactoring
- `test(scope): description` - Tests
- `docs(scope): description` - Documentation
- `chore(scope): description` - Maintenance

**Scopes**: `web`, `mobile`, `shared`, `worker`, `docs`, `ci`

**Branch Naming**: `feature/description`, `bugfix/description`, `refactor/description`

## Semantic Versioning & Changelog

This project uses [Semantic Versioning](https://semver.org/) and [Changesets](https://github.com/changesets/changesets) for changelog management. The changelog follows [Keep a Changelog](https://keepachangelog.com/) format.

### Version Format: MAJOR.MINOR.PATCH

- **MAJOR**: Breaking changes requiring user action (e.g., authentication flow changes, feature removal)
- **MINOR**: New backwards-compatible features (e.g., new pages, settings, enhancements)
- **PATCH**: Bug fixes and minor improvements (e.g., fixes, performance, translations)

### Adding Changesets (Claude Instructions)

Changesets are stored as individual markdown files in `.changeset/` directory. This avoids merge conflicts when multiple PRs modify the changelog.

**When to add a changeset**:
- After implementing a new feature (`feat:` commits)
- After fixing a bug (`fix:` commits)
- After making breaking changes
- After security-related changes

**How to add a changeset**:

```bash
npx changeset
```

This interactive command will prompt you to:
1. Select which packages are affected
2. Select the version bump type (`major`, `minor`, or `patch`)
3. Write a description of your changes

**Alternatively, create a changeset file manually** in `.changeset/`:

```markdown
---
"volleykit-web": patch
---

Fixed PDF download for compensation statements - MIME type validation is now case-insensitive
```

**Version bump guidelines**:
- **patch**: Bug fixes, performance improvements, internal refactoring
- **minor**: New features, enhancements (backwards-compatible)
- **major**: Breaking changes that require user action

**What counts as a breaking change** (use `major`):
- Removing or renaming public APIs, components, or props
- Changing authentication or authorization flows
- Removing features users depend on
- Changing data formats that affect stored data
- Requiring user action after update (re-login, clear cache, etc.)

**Changeset description guidelines**:
- Write user-facing descriptions (what users will notice, not implementation details)
- Be concise but descriptive
- No need to include PR numbers (added automatically by GitHub integration)

### PWA Version Display

The app version is displayed in Settings > About. It shows:
- **Version**: From `package.json` (e.g., "1.7.0")
- **Git Hash**: Short commit hash for build identification

The PWA automatically checks for updates and prompts users when a new version is deployed.

### Releasing a New Version

Releases are fully automated via the **Release workflow** (`.github/workflows/release.yml`).

**To create a release**:
1. Go to **Actions** > **Release** workflow in GitHub
2. Click **Run workflow**
3. Optionally enable **Dry run** to preview changes without committing

**What the workflow does**:
1. Validates the codebase (lint, test, build)
2. Checks for pending changesets in `.changeset/`
3. Runs `changeset version` to:
   - Combine all changesets into CHANGELOG.md
   - Bump version in `package.json` based on highest bump type
   - Delete the changeset files
4. Creates commit: `chore(release): prepare vX.Y.Z release`
5. Creates git tag: `vX.Y.Z`
6. Creates GitHub Release with changelog excerpt
7. Deployment triggers automatically via `deploy-web.yml`

**Version bump logic** (automatic from changesets):
- If any changeset specifies `major` → MAJOR bump
- Else if any changeset specifies `minor` → MINOR bump
- Else → PATCH bump

**Manual release** (if needed):
```bash
npx changeset version  # Combines changesets into CHANGELOG.md
# Commit the changes
git add .
git commit -m "chore(release): prepare vX.Y.Z release"
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin main --tags
```

## Commands Reference

### Monorepo Commands (from root)

```bash
# Install all dependencies
npm install

# Run across all workspaces
npm run lint          # Lint all packages
npm run test          # Test all packages
npm run build         # Build all packages

# Generate API types
npm run generate:api  # Generates to shared and web-app

# Mobile app
npm run mobile:start  # Start Expo dev server
npm run mobile:ios    # Run on iOS simulator
npm run mobile:android # Run on Android emulator

# Shared package
npm run shared:build  # Build shared package
npm run shared:test   # Test shared package

# Changesets
npm run changeset        # Add a changeset
npm run changeset:status # Check pending changesets
```

### Web App Commands (web-app/)

```bash
cd web-app
npm run dev           # Start dev server with hot reload
npm run build         # Production build (includes tsc)
npm run preview       # Preview production build
npm run format        # Auto-fix all formatting issues
npm run format:check  # Check for formatting issues (CI)
npm run lint          # Lint check (0 warnings allowed)
npm run lint:fix      # Auto-fix lint issues
npm run knip          # Dead code detection
npm test              # Run all tests
npm run test:watch    # Watch mode for tests
npm run test:coverage # Tests with coverage report
npm run test:e2e      # Run all E2E tests
npm run test:e2e:ui   # Interactive Playwright UI mode
npm run size          # Check bundle size
npm run generate:api  # Generate API types from OpenAPI spec
```

### Mobile App Commands (packages/mobile/)

```bash
cd packages/mobile
npm start             # Start Expo dev server
npm run ios           # Run on iOS simulator
npm run android       # Run on Android emulator
npm run prebuild      # Generate native projects
npm test              # Run Jest tests
npm run lint          # Lint check
npm run typecheck     # TypeScript check
```

### Worker Commands (worker/)

```bash
cd worker
npm run dev           # Local worker dev
npm run deploy        # Deploy to Cloudflare
npm run lint          # Lint worker code
npm test              # Test worker
```

### Help Site Commands (help-site/)

```bash
cd help-site
npm run dev           # Start dev server
npm run build         # Build with Pagefind search
npm run preview       # Preview production build
```

## Bundle Size Limits (Web App)

CI will fail if limits are exceeded (gzipped):

| Component | Limit |
|-----------|-------|
| Main App Bundle | 145 KB |
| Vendor Chunks (each) | 50 KB |
| PDF Library | 185 KB (lazy-loaded) |
| OCR Feature | 12 KB (lazy-loaded) |
| Image Cropper | 10 KB (lazy-loaded) |
| CSS | 12 KB |
| Total JS | 520 KB |

**Check size**: `cd web-app && npm run build && npm run size`

**Bundle Analysis**: After build, open `stats.html` for detailed visualization.

### Bundle Splitting

Manual chunks defined in `vite.config.ts`:
- `react-vendor`: React, React DOM
- `router`: React Router
- `state`: Zustand, TanStack Query
- `validation`: Zod
- `pdf-lib`: PDF generation (lazy-loaded)
- `cropper`: Image cropping (lazy-loaded)

## Accessibility

- Use `aria-label` on icon-only buttons
- Use `aria-labelledby` to associate modal titles with dialogs
- Handle Escape key for modals via `useEffect`, not on backdrop
- Use `role="alert"` and `aria-live="polite"` for notifications
- All interactive elements must be keyboard accessible

ESLint plugin `jsx-a11y` enforces many accessibility rules.

## PWA Features (Web App)

- **Service Worker**: Auto-updating, precaches app shell
- **Offline Support**: NetworkFirst for API, CacheFirst for assets
- **Install Prompt**: Handled via `PWAContext`
- **Update Notification**: `ReloadPromptPWA` component

**Note**: PWA is disabled for PR previews to avoid service worker scope conflicts.

## Mobile App Features

- **Biometric Authentication**: expo-local-authentication for Face ID/Touch ID
- **Secure Storage**: expo-secure-store for credentials
- **Calendar Integration**: expo-calendar for syncing assignments
- **Home Screen Widgets**: iOS (WidgetKit) and Android widgets
- **Push Notifications**: expo-notifications
- **Background Location**: expo-location + expo-task-manager for departure reminders
- **Offline Support**: TanStack Query persistence with AsyncStorage

## Definition of Done

1. Implementation follows React/TypeScript best practices
2. **Changeset added** - Required for `feat:` and `fix:` commits. Run `npx changeset` to create a changelog entry.
3. Unit tests cover business logic and interactions
4. E2E tests added for critical user flows (web app, if applicable)
5. Translations added for all 4 languages (de, en, fr, it)
6. **All validation phases pass before push** (lint, knip, test, build)
7. Bundle size limits not exceeded (web app)
8. Works across modern browsers (Chrome, Firefox, Safari) for web
9. Accessible (keyboard navigation, screen reader compatible)
10. No ESLint warnings (`--max-warnings 0`)
