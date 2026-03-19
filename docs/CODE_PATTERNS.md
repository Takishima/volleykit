# Code Patterns Guide

Detailed code examples for common patterns in this codebase. Reference this when reviewing or writing code.

## React Patterns

### State Management

**Zustand for Client State**

```typescript
// packages/shared/src/stores/auth.ts pattern
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  isAuthenticated: boolean
  login: (credentials: Credentials) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      login: async (credentials) => {
        await api.login(credentials)
        set({ isAuthenticated: true })
      },
      logout: () => set({ isAuthenticated: false }),
    }),
    { name: 'auth-storage' }
  )
)
```

**Zustand Selector Optimization with `useShallow`**

Always select only the state slices your component needs. Use `useShallow` when selecting multiple fields to avoid re-renders when unrelated state changes.

```typescript
import { useShallow } from 'zustand/react/shallow'

// Bad: subscribes to entire store — re-renders on any change
const state = useAuthStore()

// Bad: new object reference every render — defeats shallow comparison
const { user, isAuthenticated } = useAuthStore((s) => ({
  user: s.user,
  isAuthenticated: s.isAuthenticated,
}))

// Good: useShallow compares each field individually
const { user, isAuthenticated } = useAuthStore(
  useShallow((s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }))
)

// Good: single primitive — no useShallow needed
const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
```

> Export custom hooks wrapping store selectors, not the raw store, so components subscribe to specific slices.

**TanStack Query for Server State**

```typescript
import { useQuery, useMutation, useQueryClient, queryOptions } from '@tanstack/react-query'

// queryOptions() — type-safe, reusable query config (v5+)
// Share queryKey + queryFn between useQuery, prefetch, and cache operations
function assignmentListOptions(config: SearchConfiguration, associationKey: string) {
  return queryOptions({
    queryKey: queryKeys.assignments.list(config, associationKey),
    queryFn: () => api.getAssignments(config),
    staleTime: 5 * 60 * 1000,
  })
}

// Usage across different call sites
useQuery(assignmentListOptions(config, key))
queryClient.prefetchQuery(assignmentListOptions(config, key))
queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all })
```

**`useSuspenseQuery` — guaranteed data**

When using Suspense boundaries, `useSuspenseQuery` guarantees `data` is `T` (not `T | undefined`). Loading/error states are handled by `<Suspense>` and `<ErrorBoundary>`.

```typescript
import { useSuspenseQuery } from '@tanstack/react-query'

function AssignmentDetail({ id }: { id: string }) {
  // data is guaranteed to be defined — no undefined checks needed
  const { data } = useSuspenseQuery(assignmentDetailOptions(id))
  return <div>{data.title}</div>
}
```

### Query Keys Factory

Use the hierarchical key factory in `packages/shared/src/api/queryKeys.ts`. This enables type-safe keys and bulk invalidation.

```typescript
export const queryKeys = {
  assignments: {
    all: ['assignments'] as const,
    lists: () => [...queryKeys.assignments.all, 'list'] as const,
    list: (config, key) => [...queryKeys.assignments.lists(), config, key] as const,
    details: () => [...queryKeys.assignments.all, 'detail'] as const,
    detail: (id) => [...queryKeys.assignments.details(), id] as const,
  },
}

// Invalidate all assignments (lists + details)
queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all })

// Invalidate only lists (not details)
queryClient.invalidateQueries({ queryKey: queryKeys.assignments.lists() })
```

### Component Patterns

**Custom Hook Extraction**

Extract complex logic (gestures, animations, data processing) into hooks. Components stay focused on rendering.

```typescript
// Extract reusable logic into a hook
function useSwipeGesture(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const [translateX, setTranslateX] = useState(0)
  // ... gesture logic (touch start/move/end handlers)
  return { translateX, handlers }
}

function AssignmentCard({ assignment }: Props) {
  const { translateX, handlers } = useSwipeGesture(onConfirm, onReject)
  // Component stays focused on rendering
}
```

**Compound Components**

```typescript
function Tabs({ children, defaultTab }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  );
}

Tabs.List = function TabList({ children }) { /* ... */ };
Tabs.Tab = function Tab({ id, children }) { /* ... */ };
Tabs.Panel = function TabPanel({ id, children }) { /* ... */ };
```

**Discriminated Unions for Mixed Lists**

Use discriminated unions when rendering lists with different item types. The `type` field enables exhaustive switch/if handling.

```typescript
type DisplayItem =
  | { type: 'assignment'; item: Assignment }
  | { type: 'onCall'; item: OnCallAssignment }

function renderItem(displayItem: DisplayItem) {
  switch (displayItem.type) {
    case 'assignment': return <AssignmentCard assignment={displayItem.item} />
    case 'onCall': return <OnCallCard onCall={displayItem.item} />
  }
}
```

**Lazy Loading / Code Splitting**

Use `lazy()` + `Suspense` for route-level and heavy component splitting. See `web-app/src/App.tsx`.

```typescript
import { lazy, Suspense } from 'react'

const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const EditCompensationModal = lazy(() => import('./EditCompensationModal'))

// In routes or render:
<Suspense fallback={<LoadingSpinner />}>
  <SettingsPage />
</Suspense>
```

## Anti-Pattern Examples

### Magic Numbers

```typescript
// Bad: What does 20 mean? What does 300 mean?
if (Math.abs(translateX) > 20) {
  setShowActions(true)
}
setTimeout(cleanup, 300)

// Good: Self-documenting constants
const MINIMUM_SWIPE_DISTANCE_PX = 20
const ANIMATION_DURATION_MS = 300

if (Math.abs(translateX) > MINIMUM_SWIPE_DISTANCE_PX) {
  setShowActions(true)
}
setTimeout(cleanup, ANIMATION_DURATION_MS)
```

### React Keys

```typescript
// Bad: Index as key causes bugs when list order changes
{items.map((item, index) => (
  <ListItem key={index} data={item} />
))}

// Good: Stable unique identifier
{items.map((item) => (
  <ListItem key={item.id} data={item} />
))}

// If items don't have IDs, add them when creating the data:
interface ListItem {
  id: string;  // Required for React keys
  name: string;
}
```

### Memory Leaks

```typescript
// Bad: Interval never cleared
useEffect(() => {
  setInterval(() => {
    checkForUpdates()
  }, 60000)
}, [])

// Good: Named constant + cleanup function
const CHECK_INTERVAL_MS = 60000

useEffect(() => {
  const intervalId = setInterval(checkForUpdates, CHECK_INTERVAL_MS)
  return () => clearInterval(intervalId)
}, [])
```

### Race Conditions

```typescript
// Bad: Rapid clicks trigger duplicate API calls
const handleSubmit = async () => {
  await api.submitForm(formData);
  navigate('/success');
};

// Good: Guard with ref (persists across renders without causing re-render)
const isSubmittingRef = useRef(false);

const handleSubmit = async () => {
  if (isSubmittingRef.current) return;
  isSubmittingRef.current = true;

  try {
    await api.submitForm(formData);
    navigate('/success');
  } finally {
    isSubmittingRef.current = false;
  }
};

// Alternative: Disable button during submission
const [isSubmitting, setIsSubmitting] = useState(false);

<button disabled={isSubmitting} onClick={handleSubmit}>
  {isSubmitting ? 'Submitting...' : 'Submit'}
</button>

// Best: useSafeMutation wraps all of this (see web-app/src/shared/hooks/useSafeMutation.ts)
const { execute, isExecuting } = useSafeMutation(
  (id: string) => api.deleteItem(id),
  {
    logContext: 'useItemActions',
    successMessage: 'items.deleteSuccess',
    errorMessage: 'items.deleteError',
  }
)
```

### Async Cleanup (Modern React 18+)

```typescript
// Bad: Outdated isMountedRef pattern (React 16/17 era)
const isMountedRef = useRef(true)
useEffect(() => {
  fetchData().then((data) => {
    if (isMountedRef.current) {
      setData(data)
    }
  })
  return () => {
    isMountedRef.current = false
  }
}, [])

// Good: AbortController for fetch cancellation
useEffect(() => {
  const controller = new AbortController()

  fetchData({ signal: controller.signal })
    .then(setData)
    .catch((error) => {
      if (error.name !== 'AbortError') {
        setError(error)
      }
    })

  return () => controller.abort()
}, [])

// Best: TanStack Query handles this automatically
const { data, error, isLoading } = useQuery({
  queryKey: ['data', id],
  queryFn: ({ signal }) => fetchData(id, { signal }),
})
```

## React 19 Patterns

The project runs React 19. These hooks are available for adoption alongside existing patterns.

**`useOptimistic` — instant UI feedback**

```typescript
import { useOptimistic } from 'react'

function AssignmentList({ assignments }: Props) {
  const [optimisticItems, addOptimistic] = useOptimistic(
    assignments,
    (current, confirmedId: string) =>
      current.map((a) => (a.id === confirmedId ? { ...a, status: 'confirmed' } : a))
  )

  async function handleConfirm(id: string) {
    addOptimistic(id) // Instant UI update
    await api.confirmAssignment(id) // Reverts when assignments prop updates with fresh data
  }
}
```

**`useActionState` — form action state**

```typescript
import { useActionState } from 'react'

function LoginForm() {
  const [error, submitAction, isPending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      const result = await api.login(formData)
      if (!result.ok) return result.error
      // In SPA context, use navigate() from react-router instead of redirect()
      navigate('/dashboard')
      return null
    },
    null
  )

  return (
    <form action={submitAction}>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={isPending}>Log in</button>
    </form>
  )
}
```

> Adopt incrementally — existing TanStack Query mutation patterns remain valid and preferred for server-state operations.

## Accessibility Patterns

### Modal Dialogs

```typescript
// Bad: Interactive backdrop with incorrect ARIA
<div
  role="button"
  tabIndex={0}
  onClick={onClose}
  className="backdrop"
>
  <div className="modal">...</div>
</div>

// Good: Proper dialog with non-interactive backdrop
function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop: clickable but not focusable */}
      <div
        className="backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog: proper ARIA attributes */}
      <dialog
        open
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h2 id="modal-title">{title}</h2>
        {children}
      </dialog>
    </>
  );
}
```

### Icon Buttons

```typescript
// Bad: No accessible name
<button onClick={onClose}>
  <XIcon />
</button>

// Good: aria-label for screen readers
<button onClick={onClose} aria-label="Close dialog">
  <XIcon aria-hidden="true" />
</button>
```

### Live Regions

```typescript
// For dynamic content updates (toasts, notifications)
<div role="alert" aria-live="polite">
  {message}
</div>

// For errors that need immediate attention
<div role="alert" aria-live="assertive">
  {errorMessage}
</div>
```

## Error Boundaries

Use the class-based `ErrorBoundary` in `web-app/src/shared/components/ErrorBoundary.tsx`. Wrap route-level or feature-level components.

```typescript
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'

// In routes or feature containers
<ErrorBoundary>
  <Suspense fallback={<LoadingSpinner />}>
    <AssignmentsPage />
  </Suspense>
</ErrorBoundary>
```

The boundary catches render errors, classifies them via `classifyError()`, and displays appropriate recovery UI.

## Platform Adapter Pattern

The shared package (`packages/shared/`) defines interfaces; web and mobile provide implementations. This enables ~70% code sharing.

```typescript
// packages/shared/src/api/client.ts — defines the contract
interface AssignmentsApiClient {
  searchAssignments(config: SearchConfiguration): Promise<AssignmentsResponse>
}

// packages/shared/src/hooks/useAssignments.ts — accepts adapter as parameter
export function useAssignments({ apiClient, period }: Options) {
  const config = useMemo(() => buildConfig(period), [period])
  return useQuery({
    queryKey: queryKeys.assignments.list(config),
    queryFn: () => apiClient.searchAssignments(config),
  })
}

// web-app provides its implementation; mobile provides a different one
// Both call the same shared hook with their platform-specific client
```

## Feature Module Structure

### Directory Layout

Each web-app feature follows this directory structure:

```
web-app/src/features/<feature>/
├── index.ts              # Public API — explicit exports only (no export *)
├── components/
│   ├── index.ts          # Internal barrel for components within the feature
│   └── *.tsx             # UI components
├── hooks/
│   ├── use<Feature>.ts   # Main state hook (state derivation + setters)
│   ├── use<Feature>Actions.ts  # API mutation logic (save, finalize, etc.)
│   └── types.ts          # Shared types for the feature's hooks
├── api/
│   └── api-helpers.ts    # Pure API orchestration functions
└── utils/
    └── *.ts              # Pure utility functions
```

### Separation of Concerns in Hooks

Split large hooks by concern:

- **State hooks** (`useState`, `useMemo`, `useCallback` setters) — derive and manage local state
- **Action hooks** (API calls, cache invalidation) — orchestrate side effects
- **Components** consume both, but logic stays in hooks

```typescript
// useValidationState.ts — state derivation + setters (280 LOC)
export function useValidationState(gameId?: string) {
  const [state, setState] = useState(createInitialState)
  // ... memos, setters, completion status derivation
  const { saveProgress, finalizeValidation, isSaving, isFinalizing } =
    useValidationActions({ gameId, state, gameDetails, ... })
  return { state, isDirty, completionStatus, saveProgress, ... }
}

// useValidationActions.ts — API orchestration (180 LOC)
export function useValidationActions({ gameId, state, gameDetails }) {
  // ... file upload, roster save, scorer save, cache invalidation
  return { saveProgress, finalizeValidation, isSaving, isFinalizing }
}
```

### Barrel File Exports

Feature barrel files (`index.ts`) use **explicit exports only** — never `export *`:

```typescript
// Good — explicit public API
export { ValidateGameModal } from './components/ValidateGameModal'
export { useValidateGameWizard } from './hooks/useValidateGameWizard'

// Bad — leaks internal components as public API
export * from './components'
```

Internal component barrels (`components/index.ts`) may use explicit re-exports for convenience within the feature, but these are not exposed at the feature boundary.

### Hook Extraction Guidelines

Extract a hook when a component or hook exceeds ~300 LOC and mixes concerns:

- **File upload logic** (validation, progress, preview URLs) → `useFileUpload`
- **API mutations** (save, finalize, cache invalidation) → `use<Feature>Actions`
- **Gesture handling** (touch events, animations) → `useSwipeGesture`
- **Form orchestration** (wizard steps, validation state) → `use<Feature>Wizard`

The extracted hook should be in the same `hooks/` directory with a descriptive name.

## E2E Testing Patterns

### Page Object Model

```typescript
// e2e/pages/assignments.page.ts
import { Page, Locator } from '@playwright/test'

export class AssignmentsPage {
  readonly page: Page
  readonly assignmentsList: Locator
  readonly filterButton: Locator

  constructor(page: Page) {
    this.page = page
    this.assignmentsList = page.getByTestId('assignments-list')
    this.filterButton = page.getByRole('button', { name: /filter/i })
  }

  async goto() {
    await this.page.goto('/assignments')
    await this.assignmentsList.waitFor()
  }

  async getAssignmentCard(id: string) {
    return this.page.getByTestId(`assignment-${id}`)
  }

  async confirmAssignment(id: string) {
    const card = await this.getAssignmentCard(id)
    await card.getByRole('button', { name: /confirm/i }).click()
  }
}

// e2e/assignments.spec.ts
import { test, expect } from '@playwright/test'
import { AssignmentsPage } from './pages'

test('user can confirm an assignment', async ({ page }) => {
  const assignmentsPage = new AssignmentsPage(page)
  await assignmentsPage.goto()

  await assignmentsPage.confirmAssignment('123')

  const card = await assignmentsPage.getAssignmentCard('123')
  await expect(card).toContainText('Confirmed')
})
```

## Unit Testing Patterns (Vitest)

### Testing Hooks with TanStack Query

```typescript
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

const { result } = renderHook(() => useAssignments({ apiClient, period: 'upcoming' }), {
  wrapper: createWrapper(),
})
```

### `vi.hoisted()` for Mock Initialization

Use `vi.hoisted()` to create mocks before module imports resolve. Required when mocking stores or modules.

```typescript
const { mockAuthStore } = vi.hoisted(() => {
  const mockAuthStore = Object.assign(vi.fn(), {
    getState: vi.fn(() => ({ dataSource: 'api' })),
    subscribe: vi.fn(() => () => {}),
  })
  return { mockAuthStore }
})

vi.mock('@volleykit/shared/stores', () => ({ useAuthStore: mockAuthStore }))
```

### Fake Timers for Date-Dependent Tests

```typescript
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})
```

## i18n Patterns

### Adding New Translations

```typescript
// 1. Add type definition (src/i18n/types.ts)
interface TranslationKeys {
  assignments: {
    title: string;
    confirmButton: string;
    // Add new key here
    newFeature: string;
  };
}

// 2. Add to all locale files (src/i18n/locales/*.ts)
// de.ts
export const de = {
  assignments: {
    title: 'Einsätze',
    confirmButton: 'Bestätigen',
    newFeature: 'Neue Funktion',
  },
};

// en.ts
export const en = {
  assignments: {
    title: 'Assignments',
    confirmButton: 'Confirm',
    newFeature: 'New Feature',
  },
};

// 3. Use in component
function MyComponent() {
  const { t } = useTranslation();
  return <span>{t('assignments.newFeature')}</span>;
}
```

### Interpolation

```typescript
// Define with placeholder
confirmMessage: 'Are you sure you want to confirm {count} assignments?'

// Use with values
t('assignments.confirmMessage', { count: 5 })
// Result: "Are you sure you want to confirm 5 assignments?"
```

## API Client Patterns

### Error Handling

```typescript
// src/api/client.ts pattern
async function fetchWithErrorHandling<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // For cookies
  })

  if (!response.ok) {
    // Don't expose internal details
    if (response.status === 401) {
      throw new AuthenticationError('Session expired')
    }
    if (response.status === 403) {
      throw new AuthorizationError('Access denied')
    }
    throw new ApiError(`Request failed: ${response.status}`)
  }

  return response.json()
}
```

### Type-Safe API Calls

```typescript
// Using generated types from OpenAPI spec
import type { paths } from './schema'

type AssignmentsResponse =
  paths['/api/assignments']['get']['responses']['200']['content']['application/json']

async function getAssignments(): Promise<AssignmentsResponse> {
  return fetchWithErrorHandling('/api/assignments')
}
```

## API Mocking Patterns (MSW)

We use MSW (Mock Service Worker) for API mocking. It intercepts requests at the network level, providing realistic testing.

### Basic Handler Override

```typescript
import { server, http, HttpResponse } from '@/test/msw'

describe('API tests', () => {
  it('returns custom data', async () => {
    // Override default handler for this test only
    server.use(
      http.post('*/api%5crefereeconvocation/*', () => {
        return HttpResponse.json({
          items: [mockAssignment],
          totalItemsCount: 1,
        })
      })
    )

    const result = await api.searchAssignments({})
    expect(result.items).toHaveLength(1)
  })
})
```

### Testing Error Responses

```typescript
it('handles 401 unauthorized', async () => {
  server.use(
    http.post('*/api%5crefereeconvocation/*', () => {
      return new HttpResponse(null, {
        status: 401,
        statusText: 'Unauthorized',
      })
    })
  )

  await expect(api.searchAssignments({})).rejects.toThrow('Session expired')
})
```

### Inspecting Requests & File Uploads

```typescript
it('sends correct request body', async () => {
  let capturedBody: URLSearchParams | null = null

  server.use(
    http.post('*/api%5crefereeconvocation/*', async ({ request }) => {
      capturedBody = new URLSearchParams(await request.text())
      return HttpResponse.json({ items: [], totalItemsCount: 0 })
    })
  )

  await api.searchAssignments({ offset: 10, limit: 20 })
  expect(capturedBody?.get('searchConfiguration[offset]')).toBe('10')
})

it('uploads file with FormData', async () => {
  let capturedFormData: FormData | null = null

  server.use(
    http.post('*/api%5cpersistentresource/upload', async ({ request }) => {
      capturedFormData = await request.formData()
      return HttpResponse.json([{ __identity: 'res-1' }])
    })
  )

  const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
  await api.uploadResource(file)
  expect(capturedFormData?.get('resource')).toBeInstanceOf(File)
})
```
