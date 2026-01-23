# Testing Strategy

This document describes the testing strategy for VolleyKit, explaining when to use each type of test and how to avoid duplication between test layers.

## Test Pyramid

```
        ┌─────────────┐
        │    E2E      │  Slow, browser-specific flows
        │  (Playwright)│
        ├─────────────┤
        │ Integration │  Component interactions with
        │   (Vitest)  │  real stores/providers
        ├─────────────┤
        │    Unit     │  Fast, isolated component/hook
        │   (Vitest)  │  tests with mocks
        └─────────────┘
```

## When to Use Each Test Type

### Unit Tests (`*.test.tsx`)

**Location**: `src/**/*.test.tsx`

**Use for**:

- Component rendering and state
- Tab navigation and ARIA attributes
- Form validation and error states
- Loading/error/empty states
- Business logic and filtering
- Accessibility attributes
- Keyboard navigation

**Example coverage**:

```typescript
// src/pages/AssignmentsPage.test.tsx
describe("Tab Navigation", () => {
  it("should default to Upcoming tab", () => {
    render(<AssignmentsPage />);
    const upcomingTab = screen.getByRole("tab", { name: /upcoming/i });
    expect(upcomingTab).toHaveAttribute("aria-selected", "true");
  });
});
```

**Characteristics**:

- Fast execution (<1s per file)
- All external dependencies mocked
- No browser required
- Run on every commit

### Integration Tests (`*.integration.test.tsx`)

**Location**: `src/**/*.integration.test.tsx`

**Use for**:

- Multi-component interactions
- Store mutations with real Zustand stores
- API call verification with mock API
- Optimistic updates and error rollback
- Query invalidation

**Example coverage**:

```typescript
// src/components/layout/AppShell.integration.test.tsx
describe('association switching', () => {
  it('calls switchRoleAndAttribute API when switching associations', async () => {
    const user = userEvent.setup()
    renderAppShell()

    await user.click(screen.getByRole('button', { name: /referee.*SV/i }))
    await user.click(await screen.findByRole('option', { name: /SVRBA/i }))

    await waitFor(() => {
      expect(mockApi.switchRoleAndAttribute).toHaveBeenCalledWith('demo-referee-svrba')
    })
  })
})
```

**Characteristics**:

- Uses real stores (Zustand) and query client
- Uses mock API (`mockApi`) instead of real network
- Still runs in jsdom (no browser)
- Fast enough for frequent runs

### E2E Tests (`e2e/*.spec.ts`)

**Location**: `web-app/e2e/*.spec.ts`

**Use for**:

- Cross-page navigation with URL verification
- Route protection (auth redirects)
- Full user journeys (login → navigate → action)
- Real viewport/responsive testing
- Data loading with demo API
- Features requiring real browser (cookies, service workers)

**Example coverage**:

```typescript
// e2e/app.spec.ts
describe('Route Protection', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/assignments')
    await expect(page).toHaveURL(/login/)
  })
})
```

**Characteristics**:

- Slow execution (30s+ timeout per test)
- Runs in real browsers (Chromium, Firefox, WebKit)
- Tests actual page navigation and routing
- Run on CI, not on every commit

## What NOT to Test in E2E

Avoid duplicating unit test coverage in E2E tests. The following should **only** be tested at the unit level:

| Pattern         | Test in Unit               | NOT in E2E             |
| --------------- | -------------------------- | ---------------------- |
| Tab switching   | ✅ Component state changes | ❌ Redundant           |
| ARIA attributes | ✅ `toHaveAttribute()`     | ❌ Redundant           |
| Form validation | ✅ Required attributes     | ❌ Slow for no benefit |
| Loading states  | ✅ Mock loading data       | ❌ Redundant           |
| Error states    | ✅ Mock error responses    | ❌ Redundant           |
| Empty states    | ✅ Mock empty data         | ❌ Redundant           |
| Card rendering  | ✅ Mock data → visible     | ❌ Redundant           |

## Decision Flowchart

```
Does this test require...?

Navigation between pages (URL changes)?
├── YES → E2E test
└── NO ↓

Real browser features (viewport, cookies, SW)?
├── YES → E2E test
└── NO ↓

Multiple components with real stores?
├── YES → Integration test
└── NO ↓

API call verification or optimistic updates?
├── YES → Integration test
└── NO ↓

Otherwise → Unit test
```

## File Naming Conventions

| Type        | Pattern                  | Example                         |
| ----------- | ------------------------ | ------------------------------- |
| Unit        | `*.test.tsx`             | `LoginPage.test.tsx`            |
| Integration | `*.integration.test.tsx` | `AppShell.integration.test.tsx` |
| E2E         | `e2e/*.spec.ts`          | `e2e/app.spec.ts`               |

## Test Organization

### E2E Tests Structure

Each E2E spec file should:

1. Document what unit tests cover in a header comment
2. Focus only on browser-specific behavior
3. Use Page Object Models for maintainability

```typescript
/**
 * Assignments page E2E tests - focused on browser-specific behavior only.
 *
 * Tab navigation, ARIA attributes, card rendering, and accessibility
 * are covered by unit tests in src/pages/AssignmentsPage.test.tsx
 */
test.describe('Assignments Journey', () => {
  // Only page loading and navigation tests
})
```

### Unit Tests Structure

Each unit test file should:

1. Test all component states (loading, error, empty, success)
2. Test all user interactions (tab clicks, form inputs)
3. Test accessibility attributes
4. Use mock factories for consistent test data

```typescript
describe('AssignmentsPage', () => {
  describe('Tab Navigation', () => {
    /* ... */
  })
  describe('Content Display', () => {
    /* ... */
  })
  describe('Error Handling', () => {
    /* ... */
  })
  describe('Accessibility', () => {
    /* ... */
  })
})
```

## API Mocking with MSW

We use [Mock Service Worker (MSW)](https://mswjs.io/) for API mocking in tests. MSW intercepts requests at the network level, providing more realistic testing than manual fetch mocking.

### Benefits

- **Network-level interception**: Tests actual fetch calls through the network layer
- **Catches serialization bugs**: Validates request/response serialization
- **Single source of truth**: Centralized API mock handlers
- **Browser DevTools compatible**: Works identically in browser for debugging

### Setup

MSW is configured globally in `src/test/setup.ts`:

```typescript
import { server } from './msw/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### Basic Usage

```typescript
import { server, http, HttpResponse } from '@/test/msw'

it('handles custom response', async () => {
  server.use(
    http.post('*/api%5crefereeconvocation/*', () => {
      return HttpResponse.json({ items: [mockItem], totalItemsCount: 1 })
    })
  )

  const result = await api.searchAssignments({})
  expect(result.items).toHaveLength(1)
})
```

### Testing Error Scenarios

```typescript
it('handles server error', async () => {
  server.use(
    http.post('*/api%5crefereeconvocation/*', () => {
      return new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' })
    })
  )

  await expect(api.searchAssignments({})).rejects.toThrow('500')
})
```

### Capturing Request Data

```typescript
it('sends correct request body', async () => {
  let capturedBody: URLSearchParams | null = null

  server.use(
    http.post('*/api%5crefereeconvocation/*', async ({ request }) => {
      const text = await request.text()
      capturedBody = new URLSearchParams(text)
      return HttpResponse.json({ items: [], totalItemsCount: 0 })
    })
  )

  await api.searchAssignments({ offset: 0, limit: 10 })

  expect(capturedBody?.get('searchConfiguration[offset]')).toBe('0')
})
```

### File Locations

| File                       | Purpose                                   |
| -------------------------- | ----------------------------------------- |
| `src/test/msw/handlers.ts` | Default API handlers and helper factories |
| `src/test/msw/server.ts`   | MSW server setup for Node.js              |
| `src/test/polyfills.ts`    | BroadcastChannel polyfill for happy-dom   |

## Running Tests

```bash
# Unit + Integration tests (fast, run frequently)
npm test

# Unit tests with coverage
npm run test:coverage

# E2E tests (slow, run before PR)
npm run build && npm run test:e2e

# Single browser E2E
npx playwright test --project=chromium
```

## Coverage Requirements

See `vite.config.ts` for thresholds:

- Lines: 50%
- Functions: 70%
- Branches: 70%
- Statements: 50%

## Adding New Tests

1. **Start with unit tests** for component behavior
2. **Add integration tests** if testing store/API interactions
3. **Add E2E tests only** for navigation flows or browser-specific features
4. **Check for duplication** before adding any E2E test

When in doubt, prefer unit tests—they're faster, more reliable, and easier to debug.
