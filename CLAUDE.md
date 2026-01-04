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

- **[Security Checklist](docs/SECURITY_CHECKLIST.md)** - Security review checklist (XSS, injection, auth)
- **[Code Patterns](docs/CODE_PATTERNS.md)** - Detailed code examples and anti-patterns
- **[Testing Strategy](docs/TESTING_STRATEGY.md)** - When to use unit, integration, and E2E tests

## AI Development Workflow

### Implement, Commit, Validate Before Push

**CRITICAL**: Implement features fully, commit meaningfully along the way, then run all validation phases before pushing.

**Workflow**:
1. **Implement features/fixes** - Complete the work as required
2. **Commit along the way** - Make meaningful commits as you progress (logical units of work)
3. **Run full validation before push** - Before pushing, run all validation phases
4. **Fix any issues** - If validation fails, fix issues and amend/add commits as needed
5. **Push** - Only after all validations pass

**Before pushing source code changes, run all phases in order**:

```bash
cd web-app
npm run generate:api  # If API types are affected
npm run lint          # Lint check (0 warnings allowed)
npm run knip          # Dead code detection
npm test              # Run all tests
npm run build         # Production build (includes tsc)
```

**When full validation is required** (run all commands above before push):
- Adding, modifying, or deleting `.ts`, `.tsx`, `.js`, `.jsx` files
- Modifying imports, exports, or dependencies
- Changing type definitions or interfaces
- Updating configuration files (`vite.config.ts`, `tsconfig.json`, etc.)
- Refactoring code structure

**When validation can be skipped**:
- Comment-only changes that don't affect code logic
- Fixing typos in comments or strings
- Changes to `.md` documentation files only
- Translation-only changes (`.json` locale files) - run `npm run lint` only

**Order matters**: Run commands in sequence—later steps depend on earlier ones passing. If lint fails, fix issues before running tests. If tests fail, fix before building. Do not push until all phases pass.

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

```
volleykit/
├── web-app/                    # React PWA
│   ├── e2e/                   # Playwright E2E tests
│   │   ├── *.spec.ts          # Test specifications
│   │   └── pages/             # Page Object Models
│   ├── public/                # Static PWA assets (icons, manifest)
│   ├── src/
│   │   ├── api/               # API client, generated types, mock API
│   │   │   ├── client.ts      # API fetch wrapper with error handling
│   │   │   ├── mock-api.ts    # Demo mode API simulation
│   │   │   ├── queryKeys.ts   # TanStack Query key definitions
│   │   │   ├── schema.ts      # Generated OpenAPI types (do not edit)
│   │   │   └── validation.ts  # Zod schemas for API responses
│   │   ├── components/
│   │   │   ├── features/      # Feature-specific components
│   │   │   │   ├── validation/# Game validation wizard components
│   │   │   │   └── settings/  # Settings page sections
│   │   │   ├── layout/        # App shell, navigation
│   │   │   └── ui/            # Reusable UI components (Button, Modal, Card, etc.)
│   │   ├── contexts/          # React context providers (PWA)
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── useAssignments.ts      # Assignment data fetching
│   │   │   ├── useCompensations.ts    # Compensation data fetching
│   │   │   ├── useExchanges.ts        # Exchange data fetching
│   │   │   ├── useTranslation.ts      # i18n hook
│   │   │   ├── useSwipeGesture.ts     # Touch gesture handling
│   │   │   ├── useSafeMutation.ts     # Mutation with confirmation
│   │   │   └── ...
│   │   ├── i18n/              # Internationalization
│   │   │   ├── types.ts       # Translation key types (edit this first)
│   │   │   ├── index.ts       # Translation functions
│   │   │   └── locales/       # Translation files (de, en, fr, it)
│   │   ├── pages/             # Route components
│   │   │   ├── AssignmentsPage.tsx
│   │   │   ├── CompensationsPage.tsx
│   │   │   ├── ExchangePage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── stores/            # Zustand stores
│   │   │   ├── auth.ts        # Authentication state
│   │   │   ├── demo/          # Demo mode state (assignments, compensations, etc.)
│   │   │   ├── language.ts    # Language preference
│   │   │   ├── toast.ts       # Toast notifications
│   │   │   └── tour.ts        # Onboarding tour state
│   │   ├── test/              # Test setup and utilities
│   │   ├── types/             # TypeScript types
│   │   └── utils/             # Utility functions
│   │       ├── assignment-actions.ts  # Assignment business logic
│   │       ├── date-helpers.ts        # Date formatting
│   │       ├── error-helpers.ts       # Error handling utilities
│   │       └── ...
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

### Pre-commit Hooks (via devenv)

Automatic checks on commit:
- **treefmt**: Code formatting (Prettier, nixfmt, yamlfmt)
- **ripsecrets**: Secret detection
- **convco**: Conventional commit messages
- **check-merge-conflicts**: Conflict markers
- **check-yaml/json**: File validation

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

- **Zustand** for global client state (auth, preferences) - see `src/stores/`
- **TanStack Query** for server state (API data) - see `src/hooks/`

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
1. Unit tests cover business logic and interactions
1. E2E tests added for critical user flows (if applicable)
1. Translations added for all 4 languages (de, en, fr, it)
1. **All validation phases pass before push** (lint, knip, test, build - see [AI Development Workflow](#ai-development-workflow))
1. Bundle size limits not exceeded
1. Works across modern browsers (Chrome, Firefox, Safari)
1. Accessible (keyboard navigation, screen reader compatible)
1. No ESLint warnings (`--max-warnings 0`)
