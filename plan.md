# Implementation Plan: Adopt Documented Code Patterns

## Analysis Summary

After auditing the codebase against `docs/CODE_PATTERNS.md`, these patterns need adoption:

### Patterns NOT yet used
| Pattern | Status | Impact |
|---------|--------|--------|
| `queryOptions()` | Not used — all queries are inline | Type safety, reusability |
| `useSuspenseQuery` | Not used | Cleaner data access in Suspense trees |
| `useOptimistic` (React 19) | Not used | Instant UI feedback for mutations |
| `useActionState` (React 19) | Not used | Form action state management |
| Compound Components | Not used — Modal uses separate imports | API ergonomics |

### Patterns PARTIALLY adopted (anti-patterns remain)
| Pattern | Status | Impact |
|---------|--------|--------|
| `useShallow` selectors | 14 instances subscribe to entire store without selectors | Performance — unnecessary re-renders |

### Patterns FULLY adopted (no action needed)
`useSafeMutation`, `ErrorBoundary + Suspense`, `AbortController`, `aria-modal`/`aria-labelledby`, `aria-live`, `vi.hoisted()`, `React.lazy`, discriminated unions, MSW patterns, `queryKeys` factory

---

## Implementation Steps

### Task 1: Fix Zustand `useShallow` anti-patterns (14 instances)
**Priority: High — performance impact, straightforward fix**

Add proper selectors with `useShallow` to all 14 instances that subscribe to entire stores:

**Files to fix:**
- `web-app/src/shared/components/PendingActionsIndicator.tsx` (lines 32, 87) — `useActionQueueStore()`
- `web-app/src/shared/components/tour/TourProvider.tsx` (line 24) — `useTourStore()`
- `web-app/src/shared/components/tour/TourModeBanner.tsx` (line 5) — `useTourStore()`
- `web-app/src/shared/components/LanguageSwitcher.tsx` (line 10) — `useLanguageStore()`
- `web-app/src/shared/components/layout/AppShell.tsx` (line 98) — `useCalendarFilterStore()`
- `web-app/src/features/assignments/hooks/useCalendarAssociationFilter.ts` (line 74) — `useCalendarFilterStore()`
- `web-app/src/features/compensations/hooks/useCompensations.ts` (lines 137, 248, 447) — `useActionQueueStore()`
- `web-app/src/features/exchanges/hooks/useExchanges.ts` (lines 140, 237, 333) — `useActionQueueStore()`
- `web-app/src/features/settings/components/AppInfoSection.tsx` (line 23) — `useSettingsStore()`

**Approach:** For each instance, identify which fields are actually used, then wrap with `useShallow` if selecting multiple fields or use a direct selector for a single field.

### Task 2: Adopt `queryOptions()` for reusable query configs
**Priority: High — type safety and reusability**

Extract inline `useQuery` calls into `queryOptions()` factory functions. This enables sharing query config between `useQuery`, `prefetchQuery`, and `invalidateQueries`.

**Steps:**
1. Identify all `useQuery` calls in `packages/shared/src/hooks/` and `web-app/src/features/`
2. Create `queryOptions()` factories co-located with the query keys in `packages/shared/src/api/`
3. Update hooks to use `useQuery(someOptions(...))` instead of inline configs
4. Update any `queryClient.invalidateQueries` or `queryClient.prefetchQuery` calls to use the same options

**Target files (hooks with useQuery):**
- `packages/shared/src/hooks/useAssignments.ts`
- `packages/shared/src/hooks/useCompensations.ts`
- `packages/shared/src/hooks/useExchanges.ts`
- `web-app/src/features/` — any feature-specific query hooks
- `web-app/src/shared/hooks/` — any shared query hooks

### Task 3: Adopt `useSuspenseQuery` for Suspense-wrapped routes
**Priority: Medium — cleaner code, guaranteed data types**

Routes already use `<Suspense>` + `<ErrorBoundary>` in `App.tsx`. Convert selected queries inside these boundaries to `useSuspenseQuery` so `data` is guaranteed non-undefined.

**Steps:**
1. Identify page-level components rendered inside `<Suspense>` boundaries in `App.tsx`
2. For each, check if the primary data query can be converted to `useSuspenseQuery`
3. Remove `isLoading`/`undefined` checks that become unnecessary
4. Ensure `<ErrorBoundary>` is present to catch query errors

**Candidates:**
- `AssignmentsPage` — main assignments query
- `CompensationsPage` — main compensations query
- `ExchangePage` — main exchanges query
- `SettingsPage` — user profile query

### Task 4: Adopt `useOptimistic` for assignment confirmation
**Priority: Medium — UX improvement for common action**

Apply `useOptimistic` to the assignment confirmation flow so users see instant feedback before the API responds.

**Steps:**
1. Identify the assignment confirmation mutation flow
2. Add `useOptimistic` to provide instant status update in the assignment list
3. Keep existing `useSafeMutation` for the actual API call — `useOptimistic` handles the optimistic UI layer

**Target:** `web-app/src/features/assignments/` — confirmation action in assignment list/card

### Task 5: Adopt `useActionState` for login form
**Priority: Low — incremental React 19 adoption**

The login form is a good candidate since it's a simple form with error state. This is explicitly documented as incremental adoption alongside existing TanStack Query patterns.

**Steps:**
1. Refactor `LoginPage.tsx` to use `useActionState` for form submission
2. Replace manual `isPending`/`error` state management with `useActionState`
3. Keep existing auth flow logic

**Target:** `web-app/src/features/auth/LoginPage.tsx`

### Task 6: Convert Modal to Compound Component pattern (Optional)
**Priority: Low — API ergonomics, larger refactor**

Currently `Modal`, `ModalHeader`, `ModalFooter` are separate imports. Converting to compound components (`Modal.Header`, `Modal.Footer`) is a larger refactor affecting many files.

**Steps:**
1. Add `.Header`, `.Footer` as static properties on `Modal` component
2. Keep backward-compatible separate exports during migration
3. Update consuming files incrementally

**Note:** This is optional and lower priority. The current separate-import pattern works fine. Only pursue if the team values the compound component API.

---

## Execution Order

1. **Task 1** (useShallow) — Quick wins, pure performance improvement
2. **Task 2** (queryOptions) — Foundation for Tasks 3-4
3. **Task 3** (useSuspenseQuery) — Builds on queryOptions
4. **Task 4** (useOptimistic) — Independent UX improvement
5. **Task 5** (useActionState) — Independent, low priority
6. **Task 6** (Compound Components) — Optional, largest refactor

## Validation

After each task:
- Run `cd web-app && pnpm run build` — ensure no type errors
- Run `cd web-app && pnpm run knip` — ensure no dead code introduced
- Run existing tests to verify no regressions
