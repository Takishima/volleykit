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

`--gate` writes one `<kind> <value>` record per line (`check <name>` or
`unstaged <path>`) and exits 0 when the gate is open, 1 when work is
outstanding, and anything else if the gate itself failed.

### The Check Cache

Each check declares the paths it depends on. Its cache key is a hash of the
**worktree contents** of every file under those paths — tracked or untracked,
staged or not — plus the root set (`package.json`, `pnpm-lock.yaml`,
`pnpm-workspace.yaml`, `.prettierrc.json`, `.prettierignore`, and the
validation scripts themselves).

Hashing the worktree uniformly is what makes the key staging-independent:
`git add` moves a file between git's internal representations without changing
a byte of it, so a key built from index blob hashes would change on `git add`
alone and throw away results that were still valid.

Consequences that matter in practice:

| Situation                                 | Behaviour                                          |
| ----------------------------------------- | -------------------------------------------------- |
| Ran `/lint` mid-work, then commit         | Lint is **not** re-run                             |
| Fixed a lint error in `web`, re-validated | Only `web` checks re-run; `shared`/`mobile` cached |
| Edited a file's contents, same file set   | That package's cache correctly invalidates         |
| `git add` / `git reset` with no edit      | Does **not** invalidate anything                   |
| Second commit with no edits in between    | Everything still cached                            |
| Changed `pnpm-lock.yaml`                  | Everything invalidates                             |
| Changed `scripts/validate.sh`             | Everything invalidates                             |

Cache lives in `.validation-cache/` (gitignored). There is no expiry —
correctness comes from the content hash, not from a timer.

```bash
scripts/validate.sh --no-cache   # force a full re-run
scripts/validate.sh --clear      # drop the cache
```

`scripts/validation-lib.test.sh` asserts these invariants against a scratch
repository. It is registered as the `validation:test` check, so editing any of
the three validation scripts runs it automatically — and since those scripts are
in the root set, that edit also invalidates every other cache entry.

### Two Things the Gate Deliberately Does

**It looks at the whole worktree, not just the index.** The checks are
package-wide (`eslint .`, `vitest run`), so an untracked or unstaged broken file
under `packages/web/` fails `web:lint` whether or not validation was told about
it. Scoping change detection to staged files would only hide that. The practical
effect: a broken scratch file blocks commits of unrelated staged work until it is
fixed, moved out of the package, or gitignored.

**It blocks when a file is both staged and dirty.** The checks read the
worktree; a commit records the index. A path that appears in _both_
`git diff --cached` and `git diff` has staged content that is not the content
that passed — a broken staged blob, fixed only on disk, would otherwise sail
through. The gate names those paths; `git add` alone clears it, because the
fingerprint is staging-independent and nothing needs to re-run.

The intersection is deliberate. A file that is merely dirty is not part of the
next commit and does not block it, so partial commits (`git add one-file` while
other work is in progress) keep working. And the check only runs once everything
else is green — while any check is outstanding the worktree fingerprint has
already missed, so reporting divergence too would just be noise.

### What Validation Does

1. **Detect changes** - staged + unstaged + untracked vs `HEAD` (no `git add` required)
2. **Skip trivial changes** - docs-only, or nothing matching source/config patterns
3. **Generate API types** - if `volleymanager-openapi.yaml` changed, before any
   check runs. The generated `schema.ts` is gitignored and so is not itself a
   cache input; invalidation comes from the spec, which is tracked
4. **Detect affected packages** - a package is affected when a changed path falls
   under its input paths, or when a root file changed
5. **Check design token sync** - `colors.js` vs `design-tokens.css`, when style files changed
6. **Run uncached checks in PARALLEL** - format on changed files + per-package lint, typecheck, test
7. **Build** - all affected builds in parallel (the web build includes the size check)

A package's input paths are the single source of truth for both _is it
affected_ and _what invalidates its cache_. `packages/shared/src` is an input of
web and mobile, so any change to it validates all three — there is no barrel-file
heuristic deciding which shared edits "count".

Builds run in parallel because none depends on another: `packages/shared`
resolves its subpath exports to `./src/*.ts` and nothing consumes
`packages/shared/dist`.

### Check Classes

`scripts/validate.sh <class>` runs one class across every affected package:
`format`, `tokens`, `lint`, `typecheck`, `test`, `build`.

A class-filtered run reports what the gate is still waiting on, so a partial run
never leaves you guessing whether you can commit.

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

The limits live in the `size-limit` key of `packages/web/package.json` — read
them there rather than from a copy that goes stale. `scripts/validate.sh` folds
the check into `web:build`, and prints the CI tolerance when it fails.

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
