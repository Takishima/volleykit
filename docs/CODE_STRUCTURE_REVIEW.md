# Code Structure Review - VolleyKit Monorepo

**Date:** 2026-03-19 (updated from 2026-03-15)
**Focus:** Maintainability, separation of concerns, architectural health

---

## Executive Summary

VolleyKit is a well-architected monorepo with a clear **shared library + platform implementations** pattern. The unidirectional dependency flow (`web-app`/`mobile` -> `shared`) is clean, and the ~70% code-sharing goal is well-executed. However, there are recurring structural issues around **cross-feature coupling**, **oversized files**, **business logic in components**, **API layer duplication**, **shared directory scope creep**, and **duplicated offline sync logic** that, if addressed, would significantly improve long-term maintainability.

**Overall Health: B+** - Strong foundations, tactical improvements needed.

---

## 1. Architecture Overview

```
                    ┌──────────┐   ┌──────────┐
                    │ web-app  │   │  mobile   │
                    └────┬─────┘   └────┬──────┘
                         │              │
                         └──────┬───────┘
                                ▼
                       ┌────────────────┐
                       │ packages/shared │
                       │  api | stores   │
                       │  hooks | i18n   │
                       │  utils | types  │
                       │ adapters|offline│
                       └────────────────┘

           ┌───────────┐              ┌──────────┐
           │ help-site │ (standalone) │  worker  │ (standalone)
           └───────────┘              └──────────┘
```

**Strengths of this architecture:**

- Clear unidirectional dependency flow - no reverse imports from shared to consumers
- Help-site and worker are fully decoupled - no shared package imports
- Platform adapter pattern enables clean web/mobile abstraction
- Subpath exports (`@volleykit/shared/hooks`, `/api`, `/stores`, etc.) enable tree-shaking

---

## 2. Findings by Area

### 2.1 Shared Package (`packages/shared/src/`)

**~12,400 LOC across 9 modules. Well-layered overall.**

| Layer             | Modules               | Assessment                                                             |
| ----------------- | --------------------- | ---------------------------------------------------------------------- |
| Data Fetching     | `api/`, `hooks/`      | Clean - hooks abstract TanStack Query, client is interface-only        |
| State Management  | `stores/`             | Clean - 3 focused Zustand stores, no cross-store imports               |
| Business Logic    | `utils/`              | Clean - pure functions, no side effects                                |
| Auth              | `auth/`               | Tight - types misplaced in `stores/auth.ts` instead of `auth/types.ts` |
| i18n              | `i18n/`               | Clean - unidirectional locale -> types -> hook                         |
| Platform Adapters | `adapters/`, `types/` | Clean - interfaces only                                                |

**Issue: Type Source Misplacement**
`OccupationType`, `Occupation`, and `UserProfile` are defined in `stores/auth.ts` but imported by `api/client.ts`, `auth/parsers.ts`, and `auth/service.ts`. This creates a backward dependency where the auth module depends on the stores module for its own domain types.

**Recommendation:** Move these types to `auth/types.ts` and re-export from `stores/auth.ts` for backward compatibility.

**Issue: Hook Parameter Inconsistency**
The three data-fetching hooks (`useAssignments`, `useCompensations`, `useExchanges`) each accept an `apiClient` parameter differently. Standardize the options pattern:

```typescript
// Consistent pattern for all hooks
interface UseDataOptions<TClient> {
  apiClient: TClient
  enabled?: boolean
  staleTime?: number
}
```

**Issue: Translation Types Scalability**
`i18n/types.ts` (340 lines) defines all translation keys as a single TypeScript interface. As the app grows, consider splitting by feature namespace:

```typescript
interface AssignmentTranslations { ... }
interface CompensationTranslations { ... }
interface Translations extends AssignmentTranslations, CompensationTranslations, ... {}
```

---

### 2.2 Web App (`web-app/src/`)

**8 feature modules with consistent folder structure. Strong test coverage (182 test files).**

Features follow a good pattern: `Page.tsx` + `components/` + `hooks/` + `utils/` + `index.ts`.

#### 2.2.1 Cross-Feature Coupling (High Priority)

Feature modules import directly from each other, creating implicit dependencies that make features harder to refactor independently. **130 cross-feature imports found across 102 files.**

**Key violations:**

| Importing Feature | Imported From | What |
|---|---|---|
| `assignments` | `compensations/utils/compensation-actions` | `isAssignmentCompensationEditable` |
| `assignments` | `exchanges` | `useAddToExchange` |
| `assignments` | `auth/hooks/useActiveAssociation` | `useActiveAssociationCode` |
| `assignments` | `referee-backup` | `OnCallCard`, `useMyOnCallAssignments` |
| `assignments` | `settings/hooks/useSettings` | `useAssociationSettings`, `useActiveSeason` |
| `exchanges` | `assignments/hooks/useCalendarConflicts` | Conflict detection |
| `exchanges` | `assignments/utils/conflict-detection` | Conflict types/utils |
| `exchanges` | `auth/hooks/useActiveAssociation` | `useActiveAssociationCode` |
| `settings` | `auth/hooks/useActiveAssociation` | `useActiveAssociationCode` |
| `validation` | `ocr` (10 imports) | OCR components, types, services |

This creates a dependency graph where `assignments` is a hub depending on 4 other features.

**Proposed Fix A: Promote shared utilities out of features**

```
features/auth/hooks/useActiveAssociation.ts       → shared/hooks/useActiveAssociation.ts
features/assignments/utils/conflict-detection.ts   → shared/utils/conflict-detection.ts
features/compensations/utils/compensation-actions.ts
  → Extract isAssignmentCompensationEditable to shared/utils/compensation-helpers.ts
```

**Proposed Fix B: Use callback/prop patterns for cross-feature actions**

```typescript
// Before (tight coupling)
import { useAddToExchange } from '@/features/exchanges'

// After (loose coupling via prop)
function AssignmentCard({ onAddToExchange }: { onAddToExchange?: (id: string) => void })
```

**Proposed Fix C: Add ESLint enforcement**
Add `import/no-restricted-paths` to prevent new cross-feature imports from being introduced.

#### 2.2.2 God Files (>500 LOC needing attention)

| File                                                          | LOC   | Issue                                                             |
| ------------------------------------------------------------- | ----- | ----------------------------------------------------------------- |
| `features/ocr/utils/manuscript-parser.ts`                     | 1,775 | Split: constants, line parsing, team parsing, official parsing    |
| `features/ocr/utils/player-list-parser.ts`                    | 1,423 | Split: line parsing, team extraction, deduplication               |
| `shared/components/debug/DebugPanel.tsx`                      | 1,145 | Split: `AuthDebug`, `CacheDebug`, `NetworkDebug`, `SettingsDebug` |
| `features/validation/components/OCREntryModal.tsx`            | 1,076 | Split: intro, capture, processing, results step components        |
| `shared/stores/settings.ts`                                   | 954   | Split: `travelSettings`, `displaySettings`, `locationSettings`    |
| `features/assignments/api/ical/parser.ts`                     | 926   | Extract VEVENT parsing into `vevent-parser.ts`                    |
| `api/mock-api.ts`                                             | 856   | Split mock data by domain: assignments, compensations, exchanges  |
| `api/real-api.ts`                                             | 776   | Split by domain, re-export from barrel                            |
| `features/compensations/components/EditCompensationModal.tsx` | 768   | Extract form logic + PDF preview into subcomponents               |
| `worker/src/utils.ts`                                         | 724   | Split: path validation, auth lockout, cookie utils, login detect  |
| `features/ocr/utils/roster-comparison.ts`                     | 647   | Extract fuzzy matching into `fuzzy-match.ts`                      |
| `features/auth/LoginPage.tsx`                                 | 612   | Extract `LoginForm`, `CalendarLoginForm`, `LockoutTimer` components |
| `features/compensations/hooks/useCompensations.ts`            | 587   | Split query logic from mutation logic                             |
| `features/assignments/AssignmentsPage.tsx`                    | 564   | Extract data merging, swipe config, grouping into hooks           |
| `features/exchanges/ExchangePage.tsx`                         | 540   | 29 imports - highest coupling in the codebase                     |
| `features/assignments/utils/conflict-detection.ts`            | 514   | Extract gap analysis into `gap-analysis.ts`                       |
| `shared/services/transport/ojp-client.ts`                     | 512   | Review if truly shared (see 2.2.4)                                |
| `shared/components/layout/AppShell.tsx`                       | 504   | Extract `NavigationBar`, `OccupationSwitcher`, `AssociationFilter` |

**Splitting pattern:** Use barrel files to maintain existing import paths:

```typescript
// real-api.ts (barrel - keeps existing imports working)
export { fetchAssignments, searchAssignments } from './real-api-assignments'
export { fetchCompensations, updateCompensation } from './real-api-compensations'
export { fetchExchanges, applyForExchange } from './real-api-exchanges'
```

#### 2.2.3 API Layer Duplication (Medium Priority)

The web-app has **two separate API layers** that partially overlap:

1. **`@volleykit/shared/api`** - Platform-agnostic interfaces, query keys, validation schemas
2. **`web-app/src/api/`** - Web-specific implementations (`real-api.ts`, `mock-api.ts`, `client.ts`)

Features import from both: 130 imports from `@/api/` within feature code.

**Confusion points:**
- `@/api/queryKeys.ts` vs `@volleykit/shared/api` query keys - which is canonical?
- `@/api/validation.ts` vs `@volleykit/shared/api/validation.ts` - duplication risk
- Feature hooks import types from `@/api/client` that could come from `@volleykit/shared/api`

**Proposed fix:** Consolidate the canonical type/contract layer:

```typescript
// Before (ambiguous source)
import { type Assignment, type SearchConfiguration } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'

// After (clear separation: types from shared, implementations from web)
import type { Assignment, SearchConfiguration } from '@volleykit/shared/api'
import { queryKeys } from '@volleykit/shared/api'
import { fetchAssignments } from '@/api/assignments'  // web implementation only
```

#### 2.2.4 `shared/` Directory Scope Creep (Medium Priority)

`web-app/src/shared/` has grown to **241 files** across components, hooks, stores, services, and utils. Some items are only used by a single feature.

**Symptoms:**
- `shared/stores/` contains 31 files including demo data generators and tour state
- `shared/services/` has 28 files including transport/OJP client (512 lines)
- `shared/hooks/` has 50 files, some highly specialized (`useSbbUrl`, `useTravelTimeFilter`)

**Proposed fix - relocate single-consumer modules:**

```
shared/hooks/useTravelTimeFilter.ts     → features/settings/hooks/
shared/services/transport/               → features/settings/services/transport/
shared/stores/demo/demo-generators/      → Colocate with demo store or split by domain
```

**Governance rule:** Before adding to `shared/`, confirm the module is used by 2+ features.

#### 2.2.5 High-Coupling Components

| File                        | Import Count | Risk                                  |
| --------------------------- | ------------ | ------------------------------------- |
| `ExchangePage.tsx`          | 29           | Very high - multiple responsibilities |
| `App.tsx`                   | 26           | Acceptable for root orchestrator      |
| `AssignmentsPage.tsx`       | 23           | High - container doing too much       |
| `EditCompensationModal.tsx` | 21           | High - form + API + PDF mixed         |
| `AppShell.tsx`              | 19           | Moderate - layout complexity          |

---

### 2.3 Mobile App (`packages/mobile/src/`)

**~9,200 LOC. Well-structured with clear subsystems.**

Good patterns:

- Platform adapters in `platform/` cleanly implement shared interfaces
- Offline queue is well-isolated in `services/offline/`
- Departure reminder subsystem is modular (5 files)
- Hooks are focused (all under 200 LOC)
- Zustand stores are minimal (4 stores, 530 LOC total)
- Accessibility props on all interactive elements

Issues:

| File | LOC | Recommendation |
|---|---|---|
| `CalendarSettingsScreen.tsx` | 412 | Handles two fundamentally different calendar modes (iCal vs direct sync). Split into orchestrator + `ICalSettingsSection` + `DirectSyncSettingsSection` |
| `services/departure-reminder/route-calculator.ts` | 424 | OJP routing logic could be split from caching concerns |

---

### 2.4 Worker (`worker/src/`)

**~2,000 LOC across 8 handler files + utils. Excellent test coverage (3:1 test-to-code ratio).**

- Clean handler-per-route pattern (`proxy.ts`, `ocr.ts`, `ojp.ts`, `ical.ts`, `health.ts`)
- Security features (auth lockout, origin validation, path traversal prevention) are solid
- Sophisticated iOS PWA session cookie workarounds

**Issue: `utils.ts` (724 LOC) handles too many concerns:**
- Path validation and URL rewriting
- Auth lockout (KV-based rate limiting)
- Cookie rewriting (SameSite, CHIPS, session relay)
- Login/session detection

**Proposed split:**

```
worker/src/utils/
├── path-validation.ts    (~150 lines)
├── auth-lockout.ts       (~200 lines)
├── cookie-rewrite.ts     (~150 lines)
├── login-detection.ts    (~100 lines)
└── url.ts                (~80 lines)
```

---

### 2.5 Help Site (`help-site/src/`)

**~3,900 LOC. Clean Astro component architecture.**

- Well-sized pages (160-220 LOC average)
- Independent i18n implementation (appropriate for static site)
- Two large but justified components: SearchModal (422 LOC), DeviceScreenshot (378 LOC)

No structural changes recommended.

---

## 3. Cross-Cutting Concerns

### 3.1 OpenAPI Schema Duplication

`schema.ts` exists in both `packages/shared/src/api/` and `web-app/src/api/` (6,072 LOC each). Both are generated, but there's a drift risk.

**Recommendation:** Ensure `pnpm run generate:api` updates both locations atomically, and add a CI check that they stay in sync.

### 3.2 Offline Sync Logic Divergence

Web-app and mobile each implement their own `action-sync.ts` with retry logic, exponential backoff, and queue processing. The shared package only defines action types.

```
packages/shared/src/offline/action-types.ts  → Type definitions only
web-app/src/shared/services/offline/          → IndexedDB + web sync logic
packages/mobile/src/services/offline/         → AsyncStorage + mobile sync logic
```

**Recommendation:** Extract the sync orchestration (retry logic, queue processing, backoff calculation) into `@volleykit/shared/offline/`. Keep only storage I/O in platform-specific code.

### 3.3 API Client Conformance

Web-app's `real-api.ts` and mobile's `realClient.ts` both implement the `ApiClient` interface from shared, but conformance is only enforced by structural typing.

**Recommendation:** Add explicit type assertions:

```typescript
const api: ApiClient = { ... } satisfies ApiClient;
```

### 3.4 i18n Consistency

Help-site maintains its own translation files separate from `@volleykit/shared/i18n`. This means translation keys and strings can drift.

**Assessment:** Acceptable. Help-site has documentation-specific content that doesn't overlap with app translations. No action needed.

---

## 4. Prioritized Recommendations

### Priority 1: High Impact, Low Effort

| #   | Recommendation                                                                                                                    | Files Affected    | Effort |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------ |
| 1   | **Promote cross-feature utilities to `shared/`** - `useActiveAssociation`, `conflict-detection`, `compensation-actions`           | ~15 files         | Small  |
| 2   | **Move auth types from `stores/auth.ts` to `auth/types.ts`** - eliminates backward dependency                                    | 4 files in shared | Small  |
| 3   | **Add ESLint `import/no-restricted-paths`** to prevent new cross-feature imports                                                  | ESLint config     | Tiny   |
| 4   | **Add `satisfies ApiClient`** assertions to web and mobile API implementations                                                    | 2 files           | Tiny   |
| 5   | **Split `demo-generators.ts` (1,782 LOC)** by feature domain                                                                      | 1 file -> 4 files | Small  |

### Priority 2: High Impact, Medium Effort

| #   | Recommendation                                                                                                                                                              | Files Affected      | Effort |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------ |
| 6   | **Split `settings.ts` store (954 LOC)** into domain-specific stores                                                                                                         | 1 file -> 3 files   | Small  |
| 7   | **Extract business logic from page components** - move filtering, sorting, grouping from `ExchangePage`, `AssignmentsPage`, `CompensationsPage` into hooks                  | 3 pages + new hooks | Medium |
| 8   | **Split OCR parsers** - `manuscript-parser.ts` (1,775) and `player-list-parser.ts` (1,423) into focused modules                                                              | 2 files -> 8 files  | Medium |
| 9   | **Split `OCREntryModal.tsx` (1,076 LOC)** into step components                                                                                                               | 1 file -> 5 files   | Medium |
| 10  | **Split `worker/utils.ts` (724 LOC)** into focused modules                                                                                                                   | 1 file -> 5 files   | Small  |
| 11  | **Clarify API layer ownership** - types/queryKeys canonical in shared, implementations only in web                                                                           | ~50 import updates  | Medium |
| 12  | **Audit `shared/` for single-consumer modules** and relocate to owning features                                                                                              | ~10 files           | Small  |

### Priority 3: Strategic, Higher Effort

| #   | Recommendation                                                                                                                                                              | Files Affected           | Effort |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------ |
| 13  | **Unify offline sync orchestration** - move retry/backoff/queue logic to `@volleykit/shared/offline/`                                                                        | ~8 files across packages | Large  |
| 14  | **Extract `mock-api.ts` and `real-api.ts` patterns** - both are 800+ LOC with identical signatures; consider code-generated approach                                         | 2 files                  | Large  |
| 15  | **Use callback/prop patterns** for remaining cross-feature actions (`useAddToExchange`, `OnCallCard`)                                                                        | ~5 files                 | Medium |

---

## 5. What's Working Well

These patterns should be **preserved and extended**:

1. **Shared package architecture** - Clean dependency hierarchy, no circular imports, excellent adapter pattern
2. **Feature folder consistency** - all 8 features follow `Page + components/ + hooks/ + utils/` pattern
3. **Centralized query keys** - `queryKeys.ts` factory prevents cache key collisions
4. **State management separation** - Zustand for client state, TanStack Query for server state
5. **Lazy loading** - pages and heavy modals use `React.lazy()` + Suspense
6. **Platform adapter pattern** - `StorageAdapter`, `BiometricAdapter`, etc. enable clean abstraction
7. **Zod validation at API boundary** - runtime safety on all API responses
8. **Barrel exports with subpath imports** - clean public API surface for shared package
9. **Test discipline** - 182 unit tests + 14 e2e tests in web-app, 3:1 test ratio in worker
10. **Bundle size enforcement** - explicit limits in Vite config
11. **Discriminated unions for offline actions** - type-safe action queue with exhaustive matching
12. **Worker handler pattern** - clean per-route handlers with security middleware
13. **Mobile platform abstraction** - 7 platform adapter files cleanly implementing shared interfaces
14. **No magic numbers** - constants are named and documented throughout

---

## 6. Metrics Summary

| Package     | Source LOC | Test LOC | God Files (>500) | Cross-Feature Imports | Health |
| ----------- | ---------- | -------- | ----------------- | --------------------- | ------ |
| `shared`    | ~12,400    | ~3,500   | 1                 | N/A                   | A      |
| `web-app`   | ~45,000    | ~64,000  | 18                | 130 across 102 files  | B      |
| `mobile`    | ~9,200     | ~500     | 2                 | N/A                   | A-     |
| `worker`    | ~2,000     | ~3,900   | 1                 | N/A                   | A      |
| `help-site` | ~3,900     | 0        | 0                 | N/A                   | A      |

---

_This review focuses on structural maintainability. Security, performance, and accessibility are covered by their respective checklists in `docs/`._
