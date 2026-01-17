# Validation Guide

Read this file before committing changes.

## Pre-Commit Validation (Claude Code Web Only)

The pre-commit hook (`scripts/pre-commit-validate.sh`) runs automatically in Claude Code web environment (`CLAUDE_CODE_REMOTE=true`). Human developers rely on CI instead.

### What the Hook Does

1. **Detect staged changes** - Skip validation for docs-only changes (`.md` files only)
2. **Generate API types** - If `volleymanager-openapi.yaml` is staged
3. **Run in PARALLEL**: format:check, lint, knip, test
4. **Run build** - Production build (only if parallel steps pass)

The commit is **blocked** if any step fails. Fix issues and commit again.

### Manual Validation Commands

Run from `web-app/` directory:

```bash
# Generate API types (if OpenAPI spec changed)
npm run generate:api

# Formatting
npm run format:check  # Check only
npm run format        # Auto-fix

# Linting (0 warnings allowed)
npm run lint          # Check only
npm run lint:fix      # Auto-fix where possible

# Dead code detection
npm run knip

# Tests
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report

# Build
npm run build         # Production build (includes tsc)
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
npm run typecheck     # TypeScript check
npm run lint          # ESLint
npm test              # Jest tests
```

## Worker Validation

Run from `worker/` directory:

```bash
npm run lint          # ESLint
npm test              # Tests
```

## E2E Tests (Web App)

Run from `web-app/` directory:

```bash
npm run test:e2e      # Run all E2E tests (headless)
npm run test:e2e:ui   # Interactive Playwright UI mode
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
cd web-app
npm run build
npm run size
```

### Size Limits (gzipped)

| Component | Limit |
|-----------|-------|
| Main App Bundle | 145 KB |
| Vendor Chunks (each) | 50 KB |
| PDF Library (lazy) | 185 KB |
| OCR Feature (lazy) | 12 KB |
| Image Cropper (lazy) | 10 KB |
| CSS | 12 KB |
| Total JS | 520 KB |

### Bundle Analysis

After build, open `stats.html` for detailed visualization of chunk contents.

## Coverage Requirements

Minimum thresholds enforced by Vitest (see `vite.config.ts`):

| Metric | Threshold |
|--------|-----------|
| Lines | 50% |
| Functions | 70% |
| Branches | 70% |
| Statements | 50% |
