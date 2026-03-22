# VolleyKit Code Structure Review

**Date**: 2026-03-22
**Scope**: Full monorepo architecture review (shared, web, mobile, worker, help-site)
**Focus**: Maintainability, separation of concerns, code architecture

---

## Executive Summary

**Overall health: Good.** The codebase has solid foundations: clean package boundaries, interface-based API design, platform abstraction via adapters, and comprehensive tests (~1:1.3 code-to-test ratio in web). The monorepo structure with pnpm workspaces and subpath exports is well-designed.

However, two significant structural issues undermine long-term maintainability:

1. **Web/Shared store divergence** — Web has completely independent store implementations (auth, settings, demo) that don't use `@volleykit/shared/stores`, while mobile properly consumes them. This contradicts the ~70% sharing goal and creates drift risk.
2. **Growing `common/` directory** — Web's `common/` has become a catch-all (60+ components, 54 hooks, 15+ stores) that would benefit from domain-based reorganization.

### What's Working Well

- **Shared package architecture**: Clean module boundaries (api, stores, hooks, utils, i18n, adapters, auth, offline) with subpath exports
- **Interface-based API client**: Dependency injection allows real, mock, and calendar implementations
- **Platform abstraction**: Adapters for storage, biometrics, location, notifications — mobile implements, shared defines contracts
- **No circular dependencies** across packages or within shared
- **Query key factory** with hierarchical invalidation and association-scoped caching
- **Feature-based web organization**: 9 self-contained modules with barrel files
- **Worker security**: Comprehensive CORS, auth lockout, session relay, with high test coverage
- **Toast factory pattern**: Both web and mobile use `createToastStore()` from shared — the model for how other stores should work

---

## Findings

### 1. Critical: Web/Shared Store Divergence

**Problem**: Web has completely independent store implementations that don't import from `@volleykit/shared/stores` at all. Mobile properly consumes shared stores. Only the toast store follows the intended sharing pattern.

| Store | Shared | Web | Mobile |
|-------|--------|-----|--------|
| Auth | `stores/auth.ts` — platform-agnostic | `stores/auth.ts` (10.9KB) — independent impl with login/logout/CSRF/persistence | `@volleykit/shared/stores` |
| Settings | `stores/settings.ts` — basic prefs | `stores/settings/store.ts` — independent impl with mode-based settings, migrations | `@volleykit/shared/stores` |
| Demo | `stores/demo.ts` — simple toggle | `stores/demo/` — directory with generators | N/A |
| Toast | `stores/toast.ts` — factory | `stores/toast.ts` — uses shared factory | Uses shared factory |

**Evidence**: `grep -r "@volleykit/shared/stores" packages/web/src/` returns only toast imports. Mobile has 7+ files importing from shared stores.

**Why it matters**:
- Type definitions duplicated: `AuthStatus`, `DataSource`, `UserProfile`, `Occupation` all redefined in web's `auth.ts`
- Bug fixes to shared stores don't benefit web
- New developers face two parallel implementations with unclear canonical source
- Auth state shape can drift between platforms silently

**Files**:
- `packages/shared/src/stores/auth.ts` (shared, used by mobile)
- `packages/web/src/common/stores/auth.ts` (web's independent version)
- `packages/shared/src/stores/settings.ts` (shared, used by mobile)
- `packages/web/src/common/stores/settings/store.ts` (web's independent version)

**Recommendation**: Refactor toward the toast store pattern — shared defines the core state shape and factory, platforms add specifics:

1. **Types first**: Extract all auth/settings types to `@volleykit/shared` as the single source of truth. Web should import types, not redefine them.
2. **Factory pattern**: Create `createAuthStore(options)` in shared (like `createToastStore`). Options include platform-specific callbacks for login, logout, session check, persistence.
3. **Web extends, not replaces**: Web's auth store calls the shared factory and layers on CSRF, persistence middleware, and web-specific actions.
4. **Incremental migration**: Start with types, then state shape, then actions. Each step independently verifiable.

**Scope**: Large. Plan carefully, migrate incrementally.

---

### 2. Important: Cross-Feature Coupling in Web

**Problem**: Several features import directly from other features' internal modules.

**Instances**:
- `api/client.ts` → `features/assignments/api/calendar-client` (the API dispatcher reaches into a feature)
- `features/auth/` → `features/assignments/utils/calendar-helpers` (calendar code extraction)
- `features/assignments/` lazy-loads `features/compensations/` and `features/validation/`
- `features/validation/` lazy-loads from `features/assignments/`

**Constraint**: Barrel file re-exports (`index.ts`) can cause infinite recursion on iOS PWA, so the standard "only import from barrel files" approach is not viable everywhere.

**Recommendation**:
1. **Extract shared utilities upward**: Move `calendar-client` and `calendar-helpers` out of `features/assignments/` into `common/services/calendar/` — they serve auth and the API dispatcher, not just assignments
2. **Direct imports are acceptable** between features when barrel files cause iOS recursion issues, but these should be:
   - Documented with a comment explaining why the direct import is needed
   - Limited to utility/service files, not components
   - Tracked as known coupling points
3. **Lazy loading between features is fine** — it's the correct pattern for code splitting. The concern is non-lazy direct imports into internal paths.

**Files to move**:
- `packages/web/src/features/assignments/api/calendar-client.ts` → `packages/web/src/common/services/calendar/client.ts`
- `packages/web/src/features/assignments/utils/calendar-helpers.ts` → `packages/web/src/common/services/calendar/helpers.ts`

**Scope**: Small-medium.

---

### 3. Important: Oversized Web `common/` Directory

**Problem**: `common/` has grown into an undifferentiated catch-all:
- `components/` — 60+ files
- `hooks/` — 54 files
- `stores/` — 15+ files (mix of flat files and subdirectories)
- `services/` — 6+ files
- `utils/` — 8+ files

Finding a specific hook or component requires scanning dozens of files.

**Recommendation**: Group by domain rather than by type:

```
common/
├── ui/                    # Pure presentational
│   ├── components/        # Button, Card, Modal, Badge, etc.
│   └── hooks/             # useModalState, useSwipeGesture, useKeyboardShortcut
├── data/                  # Data access layer
│   ├── stores/            # Auth, settings, demo, action-queue
│   ├── hooks/             # usePaginatedQuery, useCacheWarming, useAuthSync
│   └── services/          # Offline, notifications
├── transport/             # Travel/location (domain-specific shared concern)
│   ├── hooks/             # useGeocode, useSbbUrl, useTravelTimeFilter
│   └── services/          # OJP client
├── config/                # Feature flags (existing)
├── types/                 # Shared types (existing)
└── utils/                 # Pure functions (existing, keep small)
```

**Scope**: Medium. Mostly file moves + import path updates via Vite aliases. Can be done incrementally, one domain at a time.

---

### 4. Important: Offline Logic Split Across Three Locations

**Problem**: Offline functionality spans three packages with unclear boundaries:

| Location | Content | LOC |
|----------|---------|-----|
| `packages/shared/src/offline/` | Types, sync utilities, action definitions | ~500 |
| `packages/web/src/common/stores/action-queue.ts` + `common/services/offline/` | Web queue store + services | ~500 |
| `packages/mobile/src/services/offline/` | Mobile queue + sync | ~500 |

**Recommendation**:
- Current split is actually reasonable — shared defines contracts, platforms implement
- Add architecture documentation explaining the layering
- Consider moving retry logic and conflict resolution from platform implementations into shared, since both platforms need the same strategies
- Ensure action type definitions stay in sync (shared is the source of truth)

**Scope**: Small (documentation) to Medium (extracting common logic to shared).

---

### 5. Moderate: Duplicated Constants in Shared Hooks

**Problem**: `DEFAULT_PAGE_SIZE = 50` defined independently in three hook files. Stale times also defined per-hook.

**Files**:
- `packages/shared/src/hooks/useAssignments.ts` — staleTime: 5min (list), 10min (detail)
- `packages/shared/src/hooks/useCompensations.ts` — staleTime: 5min
- `packages/shared/src/hooks/useExchanges.ts` — staleTime: 2min

**Recommendation**: Extract to `packages/shared/src/api/constants.ts`:

```typescript
export const DEFAULT_PAGE_SIZE = 50

export const STALE_TIMES = {
  list: 5 * 60 * 1000,       // 5 minutes — assignments, compensations
  detail: 10 * 60 * 1000,    // 10 minutes — single item details
  exchange: 2 * 60 * 1000,   // 2 minutes — exchanges (more volatile)
} as const
```

**Scope**: Small. Quick win.

---

### 6. Moderate: Mobile Dual API Client Pattern

**Problem**: Mobile has two separate files for API clients with different naming than web's approach.

| Platform | Pattern | Files |
|----------|---------|-------|
| Web | Dispatcher: `getApiClient(dataSource)` in `api/client.ts` returns real/mock/calendar | `client.ts`, `real-api.ts`, `mock-api.ts` |
| Mobile | Manual selection in consuming code | `client.ts` (mock, 418 LOC), `realClient.ts` (real, 342 LOC) |

**Recommendation**: Add a `getApiClient(dataSource)` dispatcher to mobile, matching web's pattern. This makes the codebase consistent and easier to understand when switching between platforms.

**Scope**: Small-medium.

---

### 7. Minor: schema.ts — Verify Single Source

**Problem**: Both `packages/shared/src/api/schema.ts` (6,072 LOC) and `packages/web/src/api/schema.ts` exist. If duplicated, one should be the source.

**Recommendation**: Check if web's schema.ts is identical to or imports from shared's. If identical, delete web's copy and import from `@volleykit/shared/api`. If different, document why.

**Scope**: Tiny verification.

---

### 8. Minor: Demo Generators Location

**Problem**: `packages/web/src/common/stores/demo-generators/` is a sibling of store files. Demo generators are data factories, not state management.

**Recommendation**: Move to `packages/web/src/api/demo-generators/` alongside `mock-api.ts` where they're consumed, or `packages/web/src/test/fixtures/` if also used in tests.

---

## Priority Matrix

| Priority | Finding | Risk | Effort | Value |
|----------|---------|------|--------|-------|
| 1 | Duplicated constants (#5) | Low | Small | Quick win, sets precedent |
| 2 | schema.ts verification (#7) | Low | Tiny | Eliminate potential duplication |
| 3 | Cross-feature coupling (#2) | Medium | Small-Medium | Prevents further coupling |
| 4 | common/ reorganization (#3) | Low | Medium | Better developer experience |
| 5 | Mobile API client (#6) | Low | Small-Medium | Cross-platform consistency |
| 6 | Offline docs (#4) | Low | Small | Clarifies architecture |
| 7 | Demo generators (#8) | Low | Tiny | Minor cleanup |
| 8 | Web/Shared store divergence (#1) | **High** | **Large** | Highest long-term value, do last |

**Rationale**: Start with low-risk quick wins to build momentum and validate the refactoring approach. The store divergence (#1) is the most impactful but also the highest risk — tackle it last with a careful migration plan, using the toast factory pattern as the proven model.

---

## Verification Checklist

For each change:

- [ ] `cd packages/shared && pnpm run test` — shared tests pass
- [ ] `cd packages/web && pnpm run test` — web tests pass
- [ ] `cd packages/web && pnpm run build` — production build succeeds
- [ ] `cd packages/web && pnpm run knip` — no dead code introduced
- [ ] `cd packages/mobile && pnpm run typecheck` — mobile types check (for shared changes)
- [ ] Demo mode, calendar mode, and API mode all work in web (for store changes)
- [ ] Bundle size within limits: `cd packages/web && pnpm run size`
