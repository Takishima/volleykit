# Validation Guide

## The Short Version

```bash
scripts/validate.sh          # everything the commit gate requires
scripts/validate.sh lint     # only lint, across every affected package
scripts/validate.sh --gate   # list what is still missing (runs nothing)
```

Every passing check is cached by the content hash of the files it reads.
**Nothing is ever run twice.** Validate as often as you like during the work —
the commit gate reuses those results instead of starting over.

Do not run raw `pnpm run lint` / `pnpm test` / `pnpm run build` to validate;
those results are not recorded and will be re-run at commit time.

## Pre-Commit Validation (Claude Code Web Only)

Human developers rely on CI. The commit gate is active only in Claude Code web
(`CLAUDE_CODE_REMOTE=true`), but `scripts/validate.sh` itself runs anywhere.

### How It Works

**Step 1: Run validation** — output streams as each check finishes:

```bash
scripts/validate.sh
```

**Step 2: Commit** — `.claude/hooks/pre-git-commit.sh` asks
`scripts/validate.sh --gate` whether every required check has a cached PASS for
the current file contents. If yes, the commit is approved instantly. If not,
the block message names the exact checks that are missing.

### The Check Cache

Each check declares the paths it depends on. Its cache key is a hash of:

- the index blob hashes of every tracked file under those paths, plus
- the contents of any of those files modified in the working tree, plus
- the root config set (`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
  `tsconfig.json`, `eslint.config.*`, prettier config)

Consequences that matter in practice:

| Situation                                 | Behaviour                                          |
| ----------------------------------------- | -------------------------------------------------- |
| Ran `/lint` mid-work, then commit         | Lint is **not** re-run                             |
| Fixed a lint error in `web`, re-validated | Only `web` checks re-run; `shared`/`mobile` cached |
| Edited a file's contents, same file set   | That package's cache correctly invalidates         |
| `git add` of an extra file                | Does **not** invalidate anything on its own        |
| Second commit with no edits in between    | Everything still cached                            |
| Changed `pnpm-lock.yaml`                  | Everything invalidates                             |

Cache lives in `.validation-cache/` (gitignored). There is no expiry —
correctness comes from the content hash, not from a timer.

```bash
scripts/validate.sh --no-cache   # force a full re-run
scripts/validate.sh --clear      # drop the cache
```

### What Validation Does

1. **Detect changes** - staged + unstaged + untracked vs `HEAD` (no `git add` required)
2. **Skip trivial changes** - docs-only, or nothing matching source/config patterns
3. **Detect affected packages** - web, shared, mobile, worker, help-site
4. **Generate API types** - if `volleymanager-openapi.yaml` changed
5. **Check design token sync** - `colors.js` vs `design-tokens.css`, when style files changed
6. **Run uncached checks in PARALLEL** - format on changed files + per-package lint, typecheck, test
7. **Build** - `shared` first, then `web` + `help-site` in parallel (web build includes the size check)

Shared package changes trigger web validation (always) and mobile validation
(only when the exported API surface is touched).

### Check Classes

`scripts/validate.sh <class>` runs one class across every affected package:
`format`, `tokens`, `lint`, `typecheck`, `test`, `build`.

Slash commands `/lint`, `/test`, `/build` are thin wrappers over these, so their
results also count towards the commit gate.

### Checks Per Package

| Package   | format¹ | lint | knip | typecheck  | test | build |
| --------- | ------- | ---- | ---- | ---------- | ---- | ----- |
| web       | ✓       | ✓    | CI²  | (in build) | ✓    | ✓     |
| shared    | ✓       | ✓    | –    | ✓          | ✓    | ✓     |
| mobile    | ✓       | ✓    | –    | ✓          | ✓    | –     |
| worker    | ✓       | ✓    | –    | –          | ✓    | –     |
| help-site | ✓       | –    | –    | –          | –    | ✓     |

¹ Format runs once on all changed files (not per-package)
² Knip (dead code detection) runs in CI only — too slow for pre-commit

### Manual Validation Commands

These are **not cached** and do not count towards the commit gate. Use them for
auto-fixing and exploration; use `scripts/validate.sh` to validate.

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
| Total JS             | 600 KB |

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
