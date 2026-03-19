# Validation Guide

Read this file before committing changes.

## Pre-Commit Validation (Claude Code Web Only)

The pre-commit hook (`scripts/pre-commit-validate.sh`) runs automatically in Claude Code web environment (`CLAUDE_CODE_REMOTE=true`). Human developers rely on CI instead.

### What the Hook Does

1. **Detect staged changes** - Skip validation for docs-only changes (`.md` files only)
2. **Detect affected packages** - Determines which packages have changes (web, shared, mobile, worker, help-site)
3. **Generate API types** - If `volleymanager-openapi.yaml` is staged
4. **Run checks in PARALLEL** - Per-package validation (format, lint, knip, typecheck, test)
5. **Run build sequentially** - Build affected packages (shared → web → help-site)

Shared package changes also trigger web and mobile validation (downstream consumers).

The commit is **blocked** if any step fails. Fix issues and commit again.

### Checks Per Package

| Package   | format | lint | knip | typecheck  | test | build |
| --------- | ------ | ---- | ---- | ---------- | ---- | ----- |
| web       | ✓      | ✓    | ✓    | (in build) | ✓    | ✓     |
| shared    | ✓      | ✓    | –    | ✓          | ✓    | ✓     |
| mobile    | ✓      | ✓    | –    | ✓          | ✓    | –     |
| worker    | ✓      | ✓    | –    | –          | ✓    | –     |
| help-site | ✓      | –    | –    | –          | –    | ✓     |

### Manual Validation Commands

Run from `packages/web/` directory:

```bash
# Generate API types (if OpenAPI spec changed)
pnpm run generate:api

# Formatting
pnpm run format:check  # Check only
pnpm run format        # Auto-fix

# Linting (0 warnings allowed)
pnpm run lint          # Check only
pnpm run lint:fix      # Auto-fix where possible

# Dead code detection
pnpm run knip

# Tests
pnpm test              # Run all tests
pnpm run test:watch    # Watch mode
pnpm run test:coverage # With coverage report

# Build
pnpm run build         # Production build (includes tsc)
```

### When Validation Runs

**Triggers validation**:

- Adding, modifying, or deleting `.ts`, `.tsx`, `.js`, `.jsx` files
- Modifying imports, exports, or dependencies
- Changing type definitions or interfaces
- Updating configuration files (`vite.config.ts`, `tsconfig.json`, etc.)

**Skips validation**:

- Changes to `.md` documentation files only
- No source files changed

## Mobile App Validation

Run from `packages/mobile/` directory:

```bash
pnpm run typecheck     # TypeScript check
pnpm run lint          # ESLint
pnpm test              # Jest tests
```

## Worker Validation

Run from `packages/worker/` directory:

```bash
pnpm run lint          # ESLint
pnpm test              # Tests
```

## E2E Tests (Web App)

Run from `packages/web/` directory:

```bash
pnpm run test:e2e      # Run all E2E tests (headless)
pnpm run test:e2e:ui   # Interactive Playwright UI mode
```

### E2E Configuration

- **Browsers**: Chromium, Firefox, WebKit
- **Mobile viewports**: Pixel 5, iPhone 12
- **Timeouts**: Test 30s, Expect 10s
- **Retries**: 2 on CI, 1 locally
- **Artifacts**: Screenshots on failure, trace on first retry

### Page Object Models

E2E tests use POMs in `e2e/pages/` for maintainable selectors.

## Bundle Size Check

```bash
cd packages/web
pnpm run build
pnpm run size
```

### Size Limits (gzipped)

| Component            | Limit  |
| -------------------- | ------ |
| Main App Bundle      | 145 KB |
| Vendor Chunks (each) | 50 KB  |
| PDF Library (lazy)   | 185 KB |
| Image Cropper (lazy) | 10 KB  |
| CSS                  | 12 KB  |
| Total JS             | 580 KB |

### Bundle Analysis

After build, open `stats.html` for detailed visualization of chunk contents.

## Coverage Requirements

Minimum thresholds enforced by Vitest (see `vite.config.ts`):

| Metric     | Threshold |
| ---------- | --------- |
| Lines      | 50%       |
| Functions  | 70%       |
| Branches   | 70%       |
| Statements | 50%       |
