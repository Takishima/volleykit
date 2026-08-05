# Validation Guide

## Commands

```bash
scripts/validate.sh          # everything the commit gate requires
scripts/validate.sh lint     # one class, across every affected package
scripts/validate.sh --gate   # list what is missing (runs nothing)
scripts/validate.sh --clear  # drop the cache
```

Classes: `format`, `tokens`, `lint`, `typecheck`, `test`, `build`.
`/lint`, `/test`, `/build` are wrappers over these.

## Rules

- Validate as often as you like. Every pass is cached by content hash, so
  **nothing is ever run twice** and the commit gate reuses the results.
- Never validate with raw `pnpm run lint` / `pnpm test` / `pnpm run build` —
  those results are not cached and get re-run at commit time.
- After a failure, fix and re-run the same command. Only the affected package
  re-runs; everything else stays cached.
- `git add` is not required before validating, and never invalidates anything.

## The Commit Gate

Active in Claude Code web only (`CLAUDE_CODE_REMOTE=true`); human developers
rely on CI. `scripts/validate.sh` itself runs anywhere.

`.claude/hooks/pre-git-commit.sh` asks `--gate` whether every required check has
a cached PASS for the current file contents, and approves instantly if so.

`--gate` prints one `<kind> <value>` record per line:

| Record            | Meaning                                           | Fix                   |
| ----------------- | ------------------------------------------------- | --------------------- |
| `check <name>`    | That check has not passed for the current content | `scripts/validate.sh` |
| `unstaged <path>` | Staged content differs from the worktree copy     | `git add -A`          |

Exit 0 = gate open, 1 = work outstanding, anything else = the gate itself
failed and the hook blocks. A path git cannot list unquoted — one containing a
quote, backslash or newline — is that third case: it would otherwise be
invisible to every check and read as "no changes".

Two consequences worth knowing:

- Checks are package-wide (`eslint .`, `vitest run`), so an untracked broken
  file under a package fails its checks even if you never staged it.
- The gate reports `unstaged` only for files that are both staged **and** dirty.
  A merely dirty file does not block a partial commit.

## The Cache

Each check's key is a content hash of its declared input paths plus a root set:
`CORE_ROOT` (manifests, lockfile, validation scripts) is in every key;
`FORMAT_ROOT` (prettier config) is in `format`'s key only.

| Situation                                 | Behaviour                                         |
| ----------------------------------------- | ------------------------------------------------- |
| Ran `/lint` mid-work, then commit         | Lint is **not** re-run                            |
| Fixed a lint error in `web`, re-validated | Only `web` re-runs; `shared`/`mobile` stay cached |
| Edited file contents                      | That package's checks invalidate                  |
| `git add` / `git reset` with no edit      | Nothing invalidates                               |
| Second commit with no edits between       | Everything still cached                           |
| Changed `pnpm-lock.yaml`                  | Everything invalidates                            |
| Changed `scripts/validate.sh`             | Everything invalidates                            |
| Changed `.prettierignore`                 | `format` widens to every formattable file         |

Stored in `.validation-cache/` (gitignored). No expiry — correctness comes from
the hash, not a timer. `--no-cache` forces a full re-run.

## What Runs

A package is affected when a changed path falls under its input paths (see
`PKG_INPUTS` in `scripts/validate.sh`) or when a root file changed.
`packages/shared/src` is an input of web and mobile, so any shared edit
validates all three.

| Package   | format¹ | lint | knip | typecheck  | test | build |
| --------- | ------- | ---- | ---- | ---------- | ---- | ----- |
| web       | ✓       | ✓    | CI²  | (in build) | ✓    | ✓     |
| shared    | ✓       | ✓    | –    | ✓          | ✓    | ✓     |
| mobile    | ✓       | ✓    | –    | ✓          | ✓    | –     |
| worker    | ✓       | ✓    | –    | –          | ✓    | –     |
| help-site | ✓       | –    | –    | –          | –    | ✓     |

¹ Runs once over all changed files, not per-package
² Knip runs in CI only — too slow for pre-commit

Non-build checks run in parallel, then all builds in parallel. The web build
includes `tsc -b` and the bundle-size check. API types regenerate first if
`volleymanager-openapi.yaml` changed.

**Skipped entirely**: docs-only changes, and changes that register no check at
all. There is no extension allowlist — an asset-only change under a package
runs that package's checks rather than being silently skipped.

## Changing the Validation Scripts

Four checks cover the validation code itself:

- `validation:test` — `scripts/validation-lib.test.sh`: fingerprint, cache and
  change detection.
- `validation:hook` — `scripts/commit-hook.test.sh`: the commit hook's
  predicate, its JSON extraction, and its fail-closed branches.
- `validation:registry` — `scripts/validate.test.sh`: the registry, against a
  scratch monorepo with `pnpm` stubbed — a table of _changed path -> expected
  `--gate` records_. Two directions are asserted: every path constant
  (`PKG_INPUTS`, `CORE_ROOT`, `SHELL_INPUTS`, `TOKENS_INPUTS`, `FORMAT_ROOT`)
  exists in the real repo, and every package in the table registers a check. The
  constants are scraped by naming convention, so a new one is covered without
  editing the suite. It also asserts that every tracked shell file is either
  linted or explicitly excluded, that the exclusion list stays minimal, and that
  `ci-shell.yml` triggers on everything the shell checks read. The scan covers
  untracked files too, so a local scratch script fails it. Gitignore it — the
  failure message says so, and an ignored file drops out of the lint as well. Add a check or a
  trigger, add a row.
- `validation:shellcheck` — `scripts/shellcheck.sh`, the single definition of
  what is linted and how; `validate.sh` sources it so the trigger, the cache key
  and the argv cannot disagree. Registered when `shellcheck` is on `PATH`, and
  reported on stderr as skipped when it is not. Always runs in CI.

`validation:test`, `validation:hook` and `validation:registry` are triggered by
any edit to `SHELL_INPUTS` — the scripts, `.claude/hooks/`, and `.claude/settings.json`,
which is what registers the hook in the first place. `validation:shellcheck` is
triggered by `SHELLCHECK_INPUTS`, which is wider: it covers shell the suites do
not exercise. Both triggers also fire on any changed shell file, wherever it lives —
identified by extension or shebang, the same predicate the lint and the coverage
scan use. `ci-shell.yml`'s own `paths:` filter can only express globs, so CI
sees `**.sh` but not an extensionless script; that asymmetry is why the local
trigger is the shebang-aware one. A new script outside the directory lists is exactly the case the
coverage assertions exist to flag, and keyed on a narrower proxy they never ran
for it. The changed files enter the cache key too, so a warm cache cannot report
a hit for a check that was only just triggered.

The hook's predicate lives in `.claude/hooks/lib/is-git-commit.sh` and is
sourced by both the hook and `commit-hook.test.sh`, so there is one definition
rather than two that must agree. If it cannot be loaded the hook blocks rather than
approves — it cannot tell whether the command is a commit, and that answer is
not "yes, go ahead". It errs towards gating: it fires on anything resembling a
commit invocation, including one quoted inside another command. A false positive
costs one re-run; a false negative is an unvalidated commit.

`.github/workflows/ci-shell.yml` runs both suites plus `scripts/shellcheck.sh`,
so the linting is enforced even where the binary is not installed locally.

## Auto-Fix Commands

Not cached, and they do not count towards the gate. Use them to fix, then
validate.

```bash
pnpm run format          # prettier --write
pnpm run lint:fix        # eslint --fix        (web, mobile)
pnpm run generate:api    # regenerate API types
cd packages/web && pnpm run knip    # dead code
```

## E2E Tests (Web App)

Not part of the commit gate.

```bash
cd packages/web
pnpm run test:e2e      # headless
pnpm run test:e2e:ui   # Playwright UI
```

Chromium/Firefox/WebKit plus Pixel 5 and iPhone 12 viewports. Test timeout 30s,
expect 10s. Retries 2 on CI, 1 locally. Screenshots on failure, trace on first
retry. Selectors live in page objects under `e2e/pages/`.

## Bundle Size

Limits are the `size-limit` key of `packages/web/package.json` — read them
there. Folded into `web:build`; open `stats.html` after a build to see chunk
contents. CI builds the merge commit and lands ~10-15 kB above a local build.

## Coverage Thresholds

Enforced by Vitest (see `vite.config.ts`): lines 50%, functions 70%,
branches 70%, statements 50%.
