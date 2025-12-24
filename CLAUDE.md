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

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand (auth), TanStack Query (server state)
- **Routing**: React Router v7
- **API Client**: Generated from OpenAPI spec with openapi-typescript
- **Testing**: Vitest + React Testing Library (unit/integration), Playwright (E2E)
- **i18n**: Custom translation system (de, en, fr, it)
- **CORS Proxy**: Cloudflare Workers (production)

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
│   │   ├── components/
│   │   │   ├── features/      # Feature-specific components
│   │   │   │   └── validation/# Game validation wizard components
│   │   │   ├── layout/        # App shell, navigation
│   │   │   └── ui/            # Reusable UI components
│   │   ├── contexts/          # React context providers (PWA)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── i18n/              # Internationalization (de, en, fr, it)
│   │   │   └── locales/       # Translation files per language
│   │   ├── pages/             # Route components
│   │   ├── stores/            # Zustand stores (auth, demo, settings)
│   │   ├── test/              # Test setup and utilities
│   │   ├── types/             # TypeScript types
│   │   └── utils/             # Utility functions
│   ├── playwright.config.ts   # E2E test configuration
│   └── package.json
├── worker/                     # Cloudflare Worker CORS proxy
│   └── src/
│       └── index.ts           # Proxy with security, rate limiting
├── docs/                       # API documentation
│   └── api/
│       ├── volleymanager-openapi.yaml  # Complete OpenAPI spec
│       ├── *_api.md           # Endpoint documentation
│       └── captures/          # Real API request/response examples
├── .github/workflows/         # CI/CD pipelines
│   ├── ci-web.yml             # Lint, test, build
│   ├── ci-worker.yml          # Worker validation
│   ├── e2e.yml                # Cross-browser E2E tests
│   ├── deploy-web.yml         # Production deployment
│   └── deploy-pr-preview.yml  # PR preview builds
└── devenv.nix                  # Nix development environment
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

### Modern React (18+) Guidelines

This project uses React 19. Avoid outdated patterns:

- **No `isMountedRef` pattern** - Use `AbortController` or TanStack Query instead
- **Prefer TanStack Query** for data fetching (handles cancellation automatically)
- **Use concurrent features** - Transitions, Suspense boundaries for loading states
- **Avoid class components** - Use function components with hooks exclusively

### State Management

- **Zustand** for global client state (auth, preferences) - see `src/stores/`
- **TanStack Query** for server state (API data) - see `src/hooks/`

## Common Anti-patterns to Avoid

| Anti-pattern | Solution |
|--------------|----------|
| Magic numbers (`if (x > 20)`) | Named constants (`MINIMUM_SWIPE_VISIBILITY`) |
| Array index as React key | Use unique `id` field from data |
| Uncleared intervals/timeouts | Return cleanup function from `useEffect` |
| Race conditions on rapid clicks | Guard with `useRef` flag or disable button |
| `isMountedRef` pattern | Use `AbortController` or TanStack Query |

## Testing

### Test Philosophy

**Test**: Business logic, custom hooks, component interactions, edge cases that caused bugs.
**Skip**: Simple presentational components, third-party wrappers, trivial getters/setters.

See existing tests in `src/**/*.test.ts` for patterns.

### E2E Testing with Playwright

E2E tests use Page Object Models (POMs) in `web-app/e2e/pages/`.

**Cross-Browser Testing**: Chromium, Firefox, WebKit + mobile viewports (Pixel 5, iPhone 12).

## Internationalization (i18n)

The app supports 4 languages: German (de), English (en), French (fr), Italian (it).

**Usage**: `const { t } = useTranslation(); t('assignments.title')`

**Adding Translations**:
1. Add the key to `src/i18n/types.ts` for type safety
2. Add translations to all 4 locale files in `src/i18n/locales/`
3. Use nested keys: `section.subsection.key`

## Demo Mode

The app supports demo mode for testing without API access.

- **Enable**: `VITE_DEMO_MODE_ONLY=true` (PR previews use this automatically)
- **Demo Store** (`src/stores/demo.ts`): Deterministic sample data with seeded UUIDs
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

### CORS Handling

- **Development**: Vite proxy handles CORS
- **Production**: Cloudflare Worker proxy at `worker/`

## Security

- Session cookies managed by the API
- CSRF tokens included in requests
- Never log credentials or tokens
- Environment variables in `.env.local` (never commit)

## Git Conventions

**Commit Messages**: `feat(scope): description`, `fix(scope): description`, `refactor`, `test`, `docs`, `chore`

**Branch Naming**: `feature/description`, `bugfix/description`, `refactor/description`

## Commands Reference

### CI Validation (Run Before Creating PRs)

**CRITICAL**: Always run full CI validation before creating a pull request.

```bash
cd web-app
npm run generate:api  # REQUIRED before lint/test/build
npm run lint          # Lint check
npm test              # Run all tests
npm run build         # Production build (includes tsc)
npm run size          # Check bundle size
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
npm run test:e2e           # Run all E2E tests (requires build first)
npm run test:e2e:ui        # Interactive Playwright UI mode
npx playwright test --project=chromium  # Single browser
```

**Note**: E2E tests run against production build (`npm run preview`), not dev server.

### Worker (CORS proxy)

```bash
cd worker
npm run dev           # Local worker dev
npx wrangler deploy   # Deploy to Cloudflare
```

## Bundle Size Limits

CI will fail if limits are exceeded (gzipped):

| Component | Limit |
|-----------|-------|
| Main App | 122 KB |
| Vendor Chunks | 50 KB each |
| PDF Library | 185 KB (lazy-loaded) |
| CSS | 10 KB |
| Total JS | 400 KB |

**Check size**: `npm run build && npm run size`

## Accessibility

- Use `aria-label` on icon-only buttons
- Use `aria-labelledby` to associate modal titles with dialogs
- Handle Escape key for modals via `useEffect`, not on backdrop
- Use `role="alert"` and `aria-live="polite"` for notifications

## Definition of Done

1. Implementation follows React/TypeScript best practices
1. Unit tests cover business logic and interactions
1. E2E tests added for critical user flows (if applicable)
1. Translations added for all 4 languages (de, en, fr, it)
1. **Full CI validation passes locally** (see "CI Validation" section above)
1. Bundle size limits not exceeded
1. Works across modern browsers (Chrome, Firefox, Safari)
1. Accessible (keyboard navigation, screen reader compatible)
