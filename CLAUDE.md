# CLAUDE.md - VolleyKit Web App

## Project Overview

A progressive web application (PWA) that provides an improved interface for volleymanager.volleyball.ch, the Swiss volleyball referee management system.

**Target**: https://volleymanager.volleyball.ch (Swiss volleyball referee management)

## Staying Current with Best Practices

**IMPORTANT**: Always consult official documentation for the latest best practices before implementing features:

- **React**: Check [react.dev](https://react.dev) for latest patterns and APIs
- **TypeScript**: Review [typescriptlang.org](https://www.typescriptlang.org/docs/) for current features
- **Vite**: Check [vite.dev](https://vite.dev) for build configuration
- **Packages**: Always check package documentation on [npmjs.com](https://www.npmjs.com) for:
  - Latest version compatibility
  - Migration guides for breaking changes
  - Current API usage patterns

**Before implementing any feature:**

1. Check if the framework/package has released newer versions with better patterns
1. Review official migration guides if updating major versions
1. Verify code examples in this document against current official documentation

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand (auth), TanStack Query (server state)
- **Routing**: React Router v7
- **API Client**: Generated from OpenAPI spec with openapi-typescript
- **Testing**: Vitest + React Testing Library
- **CORS Proxy**: Cloudflare Workers (production)

## Project Structure

```
volleykit/
├── web-app/                    # React PWA
│   ├── src/
│   │   ├── api/               # API client and generated types
│   │   ├── components/
│   │   │   ├── features/      # Feature-specific components
│   │   │   ├── layout/        # App shell, navigation
│   │   │   └── ui/            # Reusable UI components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── pages/             # Route components
│   │   ├── stores/            # Zustand stores
│   │   ├── test/              # Test setup
│   │   └── types/             # TypeScript types
│   └── package.json
├── worker/                     # Cloudflare Worker CORS proxy
├── docs/                       # API documentation
│   └── api/
│       └── volleymanager-openapi.yaml
└── devenv.nix                  # Development environment
```

## Code Philosophy

### Self-Documenting Code Over Comments

Write code that explains itself. Comments are a last resort.

```typescript
// Bad: Comment explaining what code does
// Check if user is logged in and redirect
if (token !== null && !isExpired(token)) {
  navigate('/home');
}

// Good: Self-explanatory code
if (session.isAuthenticated) {
  navigate('/home');
}
```

**When comments ARE appropriate:**

- Explaining *why* something non-obvious is necessary (workarounds, edge cases)
- TODOs with ticket references: `// TODO(#123): Remove after API migration`

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
- Extract duplicate logic into shared helpers (e.g., touch/mouse handlers sharing gesture logic)

## React Best Practices

### Component Structure

Keep components small and focused. Break large components into smaller, composable pieces.

### State Management

- **Zustand** for global client state (auth, preferences) - see `src/stores/auth.ts`
- **TanStack Query** for server state (API data) - see `src/hooks/useConvocations.ts`

### Custom Hooks

Encapsulate reusable logic in custom hooks. See examples in `src/hooks/`.

## Common Anti-patterns to Avoid

### Magic Numbers

Extract hardcoded values to named constants:

```typescript
// Bad: Magic numbers scattered in code
if (Math.abs(translateX) > 20) { /* ... */ }
setTimeout(cleanup, 300);

// Good: Named constants
const MINIMUM_SWIPE_VISIBILITY = 20;
const MODAL_CLEANUP_DELAY_MS = 300;

if (Math.abs(translateX) > MINIMUM_SWIPE_VISIBILITY) { /* ... */ }
setTimeout(cleanup, MODAL_CLEANUP_DELAY_MS);
```

### React Keys

Never use array index as `key` prop - it causes reconciliation issues:

```typescript
// Bad: Index as key
{items.map((item, index) => <Item key={index} {...item} />)}

// Good: Unique identifier
interface ListItem {
  id: string;  // Add id field to interfaces
  // ...
}
{items.map((item) => <Item key={item.id} {...item} />)}
```

### Memory Leaks

Always clean up intervals, timeouts, and subscriptions:

```typescript
// Bad: Interval never cleared
useEffect(() => {
  setInterval(() => checkForUpdates(), 60000);
}, []);

// Good: Cleanup function
useEffect(() => {
  const intervalId = setInterval(() => checkForUpdates(), 60000);
  return () => clearInterval(intervalId);
}, []);
```

### Race Conditions

Use refs to prevent duplicate async operations:

```typescript
// Bad: Multiple rapid clicks trigger duplicate requests
const handleSubmit = async () => {
  await submitForm();
};

// Good: Guard against concurrent execution
const isSubmittingRef = useRef(false);
const handleSubmit = async () => {
  if (isSubmittingRef.current) return;
  isSubmittingRef.current = true;
  try {
    await submitForm();
  } finally {
    isSubmittingRef.current = false;
  }
};
```

## Testing

### Test Philosophy

**Test these:**

- Business logic and data transformations
- Custom hooks with complex logic
- Component interactions (click handlers, form submissions)
- Edge cases that have caused bugs

**Skip these:**

- Simple presentational components
- Third-party library wrappers
- Trivial getters/setters

See existing tests in `src/**/*.test.ts` for patterns.

## API Integration

### Generated Types

The API client is generated from the OpenAPI spec:

```bash
npm run generate:api
```

This generates `src/api/schema.ts` with all types from `docs/api/volleymanager-openapi.yaml`.

### CORS Handling

- **Development**: Vite proxy handles CORS
- **Production**: Cloudflare Worker proxy at `worker/`

## Security

### Authentication

- Session cookies managed by the API
- CSRF tokens included in requests
- Never log credentials or tokens

### Environment Variables

```bash
# .env.local (never commit)
VITE_API_PROXY_URL=https://your-worker.workers.dev
```

## Git Conventions

### Commit Messages

```
feat(assignments): add filtering by date range
fix(auth): handle session timeout correctly
refactor(api): extract common fetch logic
test(components): add AssignmentCard tests
docs: update API documentation
chore: upgrade dependencies
```

### Branch Naming

```
feature/assignment-filters
bugfix/session-timeout
refactor/api-client
```

## Commands Reference

### CI Validation (Run Before Committing)

**IMPORTANT**: Always run these commands before committing to ensure CI will pass:

```bash
# Web App - Full CI validation (same as GitHub Actions)
cd web-app
npm run generate:api  # Generate API types first
npm run lint          # Lint check
npm test              # Run all tests
npm run build         # Production build (includes tsc)
npm run size          # Check bundle size

# Worker - Full CI validation
cd worker
npm run lint          # Lint check
npm test              # Run all worker tests
```

### Development

```bash
# Web App
cd web-app
npm run dev           # Start dev server with hot reload
npm run test:watch    # Watch mode for tests
npm run test:coverage # Tests with coverage report

# Worker (CORS proxy)
cd worker
npm run dev           # Local worker dev
npx wrangler deploy   # Deploy to Cloudflare
```

### Other Commands

```bash
# Type checking only (web-app)
cd web-app
npx tsc --noEmit

# Preview production build (web-app)
cd web-app
npm run preview
```

## Accessibility

### Modal Patterns

```typescript
// Bad: Interactive backdrop
<div role="button" tabIndex={0} onClick={onClose}>
  <dialog>...</dialog>
</div>

// Good: Non-interactive backdrop with proper dialog
<div onClick={onClose} aria-hidden="true">
  <dialog role="dialog" aria-modal="true" aria-labelledby="modal-title">
    ...
  </dialog>
</div>

// Handle Escape key via useEffect, not on backdrop
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [onClose]);
```

### ARIA Attributes

- Use `role="alert"` and `aria-live="polite"` for notifications/toasts
- Add `aria-label` to icon-only buttons
- Use `aria-labelledby` to associate modal titles with dialogs

## Definition of Done

A feature is complete when:

1. Implementation follows React/TypeScript best practices
1. Tests cover business logic and interactions
1. No TypeScript errors (`tsc --noEmit` passes)
1. No lint warnings (`npm run lint` passes)
1. Works across modern browsers (Chrome, Firefox, Safari)
1. Accessible (keyboard navigation, screen reader compatible)
