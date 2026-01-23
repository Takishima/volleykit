# Code Patterns Guide

Detailed code examples for common patterns in this codebase. Reference this when reviewing or writing code.

## React Patterns

### State Management

**Zustand for Client State**

```typescript
// src/stores/auth.ts pattern
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

**TanStack Query for Server State**

```typescript
// src/hooks/useAssignments.ts pattern
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useAssignments() {
  return useQuery({
    queryKey: ['assignments'],
    queryFn: () => api.getAssignments(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useConfirmAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.confirmAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
    },
  })
}
```

### Component Patterns

**Custom Hook Extraction**

```typescript
// Bad: Logic mixed in component
function AssignmentCard({ assignment }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [translateX, setTranslateX] = useState(0)

  const handleSwipeStart = (e: TouchEvent) => {
    /* 20 lines */
  }
  const handleSwipeMove = (e: TouchEvent) => {
    /* 20 lines */
  }
  const handleSwipeEnd = (e: TouchEvent) => {
    /* 20 lines */
  }

  // Component is now 100+ lines
}

// Good: Extract to custom hook
function useSwipeGesture(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const [translateX, setTranslateX] = useState(0)
  // ... gesture logic
  return { translateX, handlers }
}

function AssignmentCard({ assignment }: Props) {
  const { translateX, handlers } = useSwipeGesture(onConfirm, onReject)
  // Component stays focused on rendering
}
```

**Compound Components**

```typescript
// For complex UI with multiple related parts
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

// Usage
<Tabs defaultTab="home">
  <Tabs.List>
    <Tabs.Tab id="home">Home</Tabs.Tab>
    <Tabs.Tab id="away">Away</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel id="home">Home roster...</Tabs.Panel>
  <Tabs.Panel id="away">Away roster...</Tabs.Panel>
</Tabs>
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

### Inspecting Request Data

```typescript
it('sends correct request body', async () => {
  let capturedBody: URLSearchParams | null = null

  server.use(
    http.post('*/api%5crefereeconvocation/*', async ({ request }) => {
      // Capture request body for assertions
      const text = await request.text()
      capturedBody = new URLSearchParams(text)
      return HttpResponse.json({ items: [], totalItemsCount: 0 })
    })
  )

  await api.searchAssignments({ offset: 10, limit: 20 })

  expect(capturedBody?.get('searchConfiguration[offset]')).toBe('10')
  expect(capturedBody?.get('searchConfiguration[limit]')).toBe('20')
})
```

### Testing File Uploads

```typescript
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
