# Architecture Review Checklist

Single source of truth for the Architecture Claude Code Review. This file is automatically loaded by the architecture review hook.

## Focus Areas

This reviewer focuses exclusively on **code architecture and separation of concerns**. It does NOT review naming conventions, accessibility, i18n, or security — those are handled by the primary Code Review.

## Monorepo Boundary Violations (Must Flag)

### Package Dependency Direction

```
web ──→ shared ←── mobile
              ↑
           worker (independent)
```

- `shared` MUST NOT import from `web`, `mobile`, or `worker`
- `web` and `mobile` import from `shared` via subpath exports (`@volleykit/shared/hooks`, etc.)
- `worker` is independent — no imports from other packages
- Cross-package imports must use the package name, never relative paths (`../../../shared/`)

### Subpath Export Boundaries

Shared package exposes: `/api`, `/stores`, `/hooks`, `/utils`, `/i18n`, `/types`, `/adapters`, `/offline`

- Flag imports that bypass subpath exports (e.g., `@volleykit/shared/src/internal/...`)
- Flag deep imports into internal modules not exposed via barrel files

## Feature Module Structure (Must Flag)

### Expected Layout

```
packages/web/src/features/<feature>/
├── index.ts              # Public API — explicit exports only
├── components/           # UI components
├── hooks/                # State + action hooks
├── api/                  # Only if custom API logic needed
└── utils/                # Pure utility functions
```

- Flag features missing `index.ts` barrel file
- Flag `export *` in feature-level `index.ts` (must use explicit exports)
- Flag components importing directly from another feature's internals instead of its `index.ts`

### Cross-Feature Dependencies

- Features should communicate through shared state (Zustand stores) or shared hooks, not by importing each other's internals
- Flag direct imports between features (e.g., `import { X } from '../other-feature/components/Y'`)
- Acceptable: importing from another feature's public API (`index.ts`)

## Separation of Concerns (Must Flag)

### Hook Responsibility Split

- **State hooks**: `useState`, `useMemo`, `useCallback`, derived state — no API calls
- **Action hooks**: API mutations, cache invalidation, side effects
- **Components**: Rendering only — logic belongs in hooks

Flag when:
- A component contains business logic (>15 lines of non-rendering code)
- A single hook mixes state management AND API calls AND exceeds ~300 LOC
- API calls are made directly in components instead of through hooks or TanStack Query

### Services vs Utils

| Category   | Location      | Characteristics                                      |
| ---------- | ------------- | ---------------------------------------------------- |
| Services   | `services/`   | Stateful, side effects, platform APIs, singletons    |
| Utils      | `utils/`      | Pure functions, no side effects, easily unit-testable |

- Flag utility functions that have side effects or depend on platform APIs
- Flag service code that could be a pure function (no state, no side effects)

### State Management Boundaries

| State Type   | Tool           | Location                |
| ------------ | -------------- | ----------------------- |
| Server state | TanStack Query | Via shared hooks        |
| Client state | Zustand        | `shared/stores/`        |
| Form state   | React state    | Component/hook-local    |
| URL state    | React Router   | Route params/search     |

- Flag server data stored in Zustand (should use TanStack Query)
- Flag TanStack Query used for purely client-side state
- Flag global Zustand state that is only used by one component (should be local state)

## Platform Adapter Pattern (Must Flag)

### Contract Compliance

```typescript
// shared defines the contract (interface)
// web and mobile provide implementations
// shared hooks accept adapters as parameters
```

- Flag platform-specific code (DOM APIs, React Native APIs) in `packages/shared/`
- Flag shared hooks that import directly from `web` or `mobile` implementations
- Flag missing adapter pattern when shared code needs platform-specific behavior

## Code Organization (Should Flag)

### File Size Thresholds

| Threshold | Action                                         |
| --------- | ---------------------------------------------- |
| >300 LOC  | Consider splitting — flag if mixing concerns   |
| >500 LOC  | Must split — flag with extraction suggestions  |

### Circular Dependencies

- Flag circular imports between modules
- Flag features that form import cycles through shared modules

### Layer Violations

```
Components → Hooks → API/Stores → Utils
         (never the reverse)
```

- Flag hooks importing from components
- Flag utils importing from hooks or components
- Flag API layer importing from components

## Review Output Format

```markdown
## Architecture Review

**Review type:** [Initial review | Re-review after changes]

### Summary

[1-2 sentence overview of architectural health]

### Issues Found

[List issues with file:line references and category tags, or "No issues found"]

Categories: `[boundary]` `[separation]` `[structure]` `[adapter]` `[organization]`

### Fixed Since Last Review (re-reviews only)

[List resolved issues, or omit section for initial reviews]

### Recommendations

[Optional suggestions for architectural improvements]
```

## Re-Review Guidelines

When `EVENT TYPE` is `synchronize`:

- DO NOT repeat issues still present — reference briefly
- DO acknowledge fixed issues with "Fixed: [issue]"
- DO flag NEW architectural issues in latest commits
- Focus on changes since last review
