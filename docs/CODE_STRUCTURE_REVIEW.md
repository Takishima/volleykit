# Code Structure Review - VolleyKit Monorepo

**Date:** 2026-03-15
**Focus:** Maintainability, separation of concerns, architectural health

---

## Executive Summary

VolleyKit is a well-architected monorepo with a clear **shared library + platform implementations** pattern. The unidirectional dependency flow (`web-app`/`mobile` -> `shared`) is clean, and the ~70% code-sharing goal is well-executed. However, there are recurring structural issues around **oversized files**, **business logic in components**, **duplicated offline sync logic**, and **type source misplacement** that, if addressed, would significantly improve long-term maintainability.

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

| Layer | Modules | Assessment |
|-------|---------|------------|
| Data Fetching | `api/`, `hooks/` | Clean - hooks abstract TanStack Query, client is interface-only |
| State Management | `stores/` | Clean - 3 focused Zustand stores, no cross-store imports |
| Business Logic | `utils/` | Clean - pure functions, no side effects |
| Auth | `auth/` | Tight - types misplaced in `stores/auth.ts` instead of `auth/types.ts` |
| i18n | `i18n/` | Clean - unidirectional locale -> types -> hook |
| Platform Adapters | `adapters/`, `types/` | Clean - interfaces only |

**Issue: Type Source Misplacement**
`OccupationType`, `Occupation`, and `UserProfile` are defined in `stores/auth.ts` but imported by `api/client.ts`, `auth/parsers.ts`, and `auth/service.ts`. This creates a backward dependency where the auth module depends on the stores module for its own domain types.

**Recommendation:** Move these types to `auth/types.ts` and re-export from `stores/auth.ts` for backward compatibility.

---

### 2.2 Web App (`web-app/src/`)

**8 feature modules with consistent folder structure. Strong test coverage (182 test files).**

Features follow a good pattern: `Page.tsx` + `components/` + `hooks/` + `utils/` + `index.ts`.

#### God Files (>500 LOC needing attention)

| File | LOC | Issue |
|------|-----|-------|
| `shared/stores/demo-generators.ts` | 1,782 | Too many data generators in one file |
| `shared/components/debug/DebugPanel.tsx` | 1,145 | Multiple debug sections should be split |
| `features/validation/components/OCREntryModal.tsx` | 1,076 | Mixes intro, capture, processing, results |
| `shared/stores/settings.ts` | 954 | Mixed concerns: travel, location, auth, demo, preferences |
| `api/mock-api.ts` | 856 | Mirror of real-api.ts - consider generating from shared interface |
| `api/real-api.ts` | 776 | Large but acceptable for API surface |
| `features/compensations/components/EditCompensationModal.tsx` | 768 | Form handling, PDF preview, API calls mixed |
| `features/auth/LoginPage.tsx` | 612 | OAuth flow, parsing, and UI interleaved |
| `features/compensations/hooks/useCompensations.ts` | 587 | Could split query logic from mutation logic |
| `features/assignments/AssignmentsPage.tsx` | 564 | Data merging, swipe config, grouping, state in one component |
| `features/exchanges/ExchangePage.tsx` | 540 | 29 imports - highest coupling in the codebase |

#### High-Coupling Components

| File | Import Count | Risk |
|------|-------------|------|
| `ExchangePage.tsx` | 29 | Very high - multiple responsibilities |
| `App.tsx` | 26 | Acceptable for root orchestrator |
| `AssignmentsPage.tsx` | 23 | High - container doing too much |
| `EditCompensationModal.tsx` | 21 | High - form + API + PDF mixed |
| `AppShell.tsx` | 19 | Moderate - layout complexity |

#### Cross-Feature Dependencies

```
validation ──→ ocr          (TIGHT: OCREntryModal, OCRPanel, types)
assignments ──→ compensations (LIGHT: isAssignmentCompensationEditable)
settings ──→ auth            (LIGHT: useActiveAssociationCode)
```

The `validation -> ocr` coupling is the strongest cross-feature dependency. These could be merged into a single feature or given a shared interface.

---

### 2.3 Mobile App (`packages/mobile/src/`)

**~9,187 LOC. Well-structured with clear subsystems.**

Good patterns:
- Platform adapters in `platform/` cleanly implement shared interfaces
- Offline queue is well-isolated in `services/offline/`
- Departure reminder subsystem is modular (5 files)
- Hooks are focused (all under 200 LOC)
- Zustand stores are minimal (4 stores, 530 LOC total)

Issues:
- `CalendarSettingsScreen.tsx` (412 LOC) - handles ICS input, calendar selection, venue selection, sync status
- `services/departure-reminder/route-calculator.ts` (424 LOC) - OJP routing logic could be split

---

### 2.4 Worker (`worker/src/`)

**5,917 LOC across 4 files. Excellent test coverage (3:1 test-to-code ratio).**

- `index.ts` at 1,273 LOC is monolithic but appropriate for Cloudflare Worker constraints
- Utility extraction to `utils.ts` (724 LOC) is well-done
- Security features (auth lockout, origin validation, path traversal prevention) are solid

No structural changes recommended - the monolithic pattern is idiomatic for Workers.

---

### 2.5 Help Site (`help-site/src/`)

**~3,855 LOC. Clean Astro component architecture.**

- Well-sized pages (160-220 LOC average)
- Independent i18n implementation (not shared - appropriate for static site)
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

Web-app's `real-api.ts` and mobile's `realClient.ts` both implement the `ApiClient` interface from shared, but conformance is only enforced by structural typing. No compile-time assertion exists.

**Recommendation:** Add explicit type assertions:
```typescript
const api: ApiClient = { ... } satisfies ApiClient;
```

### 3.4 i18n Consistency

Help-site maintains its own translation files separate from `@volleykit/shared/i18n`. This means translation keys and strings can drift.

**Assessment:** Acceptable. Help-site has documentation-specific content that doesn't overlap with app translations. No action needed unless content starts overlapping.

---

## 4. Prioritized Recommendations

### Priority 1: High Impact, Low Effort

| # | Recommendation | Files Affected | Effort |
|---|---------------|----------------|--------|
| 1 | **Move auth types from `stores/auth.ts` to `auth/types.ts`** - eliminates backward dependency from auth -> stores | 4 files in shared | Small |
| 2 | **Split `settings.ts` store (954 LOC)** into domain-specific stores: `travelSettings`, `displaySettings`, `locationSettings` | 1 file -> 3 files | Small |
| 3 | **Add `satisfies ApiClient`** assertions to web and mobile API implementations | 2 files | Tiny |
| 4 | **Split `demo-generators.ts` (1,782 LOC)** by feature domain: assignment generators, compensation generators, exchange generators | 1 file -> 4 files | Small |

### Priority 2: High Impact, Medium Effort

| # | Recommendation | Files Affected | Effort |
|---|---------------|----------------|--------|
| 5 | **Extract business logic from page components** - move filtering, sorting, grouping, and data transformation from `ExchangePage`, `AssignmentsPage`, `CompensationsPage` into dedicated hooks or utils | 3 pages + new hooks | Medium |
| 6 | **Split `OCREntryModal.tsx` (1,076 LOC)** into step components: `OCRIntroStep`, `OCRCaptureStep`, `OCRProcessingStep`, `OCRResultsStep` | 1 file -> 5 files | Medium |
| 7 | **Split `EditCompensationModal.tsx` (768 LOC)** - extract form logic into a `useCompensationForm` hook, PDF preview into a subcomponent | 1 file -> 3 files | Medium |
| 8 | **Split `DebugPanel.tsx` (1,145 LOC)** into section components: `AuthDebug`, `CacheDebug`, `NetworkDebug`, `SettingsDebug` | 1 file -> 5 files | Medium |

### Priority 3: Strategic, Higher Effort

| # | Recommendation | Files Affected | Effort |
|---|---------------|----------------|--------|
| 9 | **Unify offline sync orchestration** - move retry/backoff/queue logic to `@volleykit/shared/offline/`, keep only storage adapters platform-specific | ~8 files across packages | Large |
| 10 | **Define feature boundaries with lint rules** - add ESLint `import/no-restricted-paths` to prevent `validation -> ocr` direct imports; create shared interface if needed | ESLint config + refactor | Medium |
| 11 | **Extract `mock-api.ts` and `real-api.ts` patterns** - both are 800+ LOC with identical method signatures; consider a code-generated approach from the `ApiClient` interface | 2 files | Large |

---

## 5. What's Working Well

These patterns should be **preserved and extended**:

1. **Feature folder consistency** - all 8 features follow the same `Page + components/ + hooks/ + utils/` pattern
2. **Centralized query keys** - `queryKeys.ts` factory prevents cache key collisions
3. **Lazy loading** - pages and heavy modals use `React.lazy()` + Suspense
4. **Platform adapter pattern** - `StorageAdapter`, `BiometricAdapter`, etc. enable clean abstraction
5. **Zod validation at API boundary** - runtime safety on all API responses
6. **Barrel exports with subpath imports** - clean public API surface for shared package
7. **Test discipline** - 182 unit tests + 14 e2e tests in web-app, 3:1 test ratio in worker
8. **Single TODO in entire codebase** - tracked as an issue (#775), excellent code hygiene
9. **Bundle size enforcement** - explicit limits in Vite config (145 KB main, 580 KB total)
10. **Discriminated unions for offline actions** - type-safe action queue with exhaustive matching

---

## 6. Metrics Summary

| Package | Source LOC | Test LOC | God Files (>500) | Max Coupling | Health |
|---------|-----------|----------|-------------------|--------------|--------|
| `shared` | ~12,400 | ~3,500 | 1 (validation.ts 617) | Low | A |
| `web-app` | ~45,000 | ~64,000 | 11 | High (29 imports) | B |
| `mobile` | ~9,200 | ~500 | 0 | Low | A- |
| `worker` | ~2,000 | ~3,900 | 1 (index.ts 1,273) | N/A (monolith) | A |
| `help-site` | ~3,900 | 0 | 0 | None | A |

---

*This review focuses on structural maintainability. Security, performance, and accessibility are covered by their respective checklists in `docs/`.*
