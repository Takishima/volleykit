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

`.claude/hooks/pre-git-commit.sh` asks `--gate` whether every required check
has a cached PASS for the current file contents, and approves instantly if so.

`--gate` prints one `<kind> <value>` record per line:

| Record            | Meaning                                           | Fix                        |
| ----------------- | ------------------------------------------------- | -------------------------- |
| `check <name>`    | That check has not passed for the current content | `scripts/validate.sh`      |
| `unstaged <path>` | Staged content differs from the worktree copy     | stage it: `git add <path>` |

Exit 0 = gate open, 1 = work outstanding, anything else = the gate itself
failed and the hook blocks with the error. That third case covers a path git
cannot list unquoted — one containing a quote, backslash or newline, which
would otherwise be invisible to every check and read as "no changes" — and a
dropped exec bit on a hook (see below).

Two consequences worth knowing:

- Checks are package-wide (`eslint .`, `vitest run`), so an untracked broken
  file under a package fails its checks even if you never staged it.
- The gate reports `unstaged` only for files that are both staged **and**
  dirty. A merely dirty file does not block a partial commit — across files.
  A within-file partial stage (`git add -p`) does block: the staged hunks are
  content no check ever saw, so the file must be staged whole (validated) to
  commit.

## The Cache

Each check's key is a content hash of its declared input paths plus a root
set: `CORE_ROOT` (manifests, lockfile, `.npmrc`, `scripts/validate.sh` and
the whole `scripts/validation/` directory) is in every key; `FORMAT_ROOT`
(prettier config: `.prettierrc.json`, `.prettierignore`, `.editorconfig`) is
in `format`'s key only. Both live in `scripts/validation/policy.sh`.

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

Stored in `.validation-cache/` (gitignored). No expiry — correctness comes
from the hash, not a timer. `--no-cache` forces a full re-run.

## What Runs

A package is affected when a changed path falls under its input paths (see
`PKG_INPUTS` in `scripts/validation/policy.sh`) or when a root file changed.
`packages/shared/src` and `packages/shared/styles` are inputs of their
consumers, so a shared edit validates web and mobile too. `ocr-poc` is a
throwaway proof of concept and is deliberately unvalidated.

Not every check is package-scoped: `format`, `tokens` and the `validation:*`
checks register from their own constants in the policy file, not from the
package table.

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

**Docs-only changes** run `format` only — markdown is in the format glob and
nothing else gates it — and skip every package check. Changes that register no
check at all skip validation entirely. There is no extension allowlist — an
asset-only change under a package runs that package's checks rather than
being silently skipped.

## Exec Bits

The Claude Code hooks and `scripts/validate.sh` are invoked by path, so a
dropped exec bit means the file never runs and never emits a decision — the
one failure a fail-closed hook cannot report. A tracked mode is not content,
so no fingerprint can carry it: `validate.sh` runs `exec_bits` (paths in
`EXEC_BIT_PATHS`, `scripts/validation/policy.sh`) uncached on every
invocation, before anything else. A `100644` hook fails the gate closed with
the remedy: `git update-index --chmod=+x <file>`.

Not covered, accepted: an **untracked** hook has no tracked mode to pin, and
a hook registered from outside `.claude/hooks/` would not be in the path set.
Keeping every registered hook in `.claude/hooks/` is the layout rule that
makes the list complete.

## Changing the Validation Scripts

The runner is built from `scripts/validate.sh` plus the modules under
`scripts/validation/` — and nothing else. That layout is what makes stale
caches impossible: `CORE_ROOT` names the file and the directory, so every
file there — current or added later, whatever loads it and however — is in
every check's cache key, and an edit to any of them invalidates every cached
result. There is no list of sourced files to keep complete and no runtime
guard to maintain; the guarantee is the directory boundary. The test suite
probes it per file: editing each tracked file in the tree must re-open every
package check.

What the boundary does not cover, by construction: code the runner calls
**outside** the tree. Those are the check commands themselves (`pnpm`,
`node scripts/sync-style-tokens.js`, `bash scripts/shellcheck.sh`,
`bash scripts/validate.test.sh`), and each is covered instead by its check's
declared inputs — `TOKENS_INPUTS` for the token script, `SHELL_INPUTS` (all
of `scripts/`, the hooks, the settings and the CI workflow) for the shell
checks. A new dependency of `validate.sh` itself belongs under
`scripts/validation/`; loading one from anywhere else would silently escape
the cache key, which is why none exists and review holds that line.

Touching the validation scripts, the hooks, `.claude/settings.json` or any
`*.sh` file registers two more checks before the gate reopens:

- `validation:test` — `scripts/validate.test.sh`, which runs the behavior
  suites under `scripts/tests/`: the fingerprint/cache/exec-bit primitives,
  the registration guard, the runner, the gate protocol and the commit hook,
  all against scratch repositories with `pnpm` stubbed. Needs only bash, git
  and jq.
- `validation:shellcheck` — `scripts/shellcheck.sh`, which lints every `*.sh`
  file git knows about, tracked or untracked (minus vendored `.specify/`).
  Registered locally when `shellcheck` is installed;
  `.github/workflows/ci-shell.yml` runs both this and the test suite on every
  push and PR, so the lint is enforced even where the binary is missing
  locally.

The hook's commit predicate lives in `.claude/hooks/lib/is-git-commit.sh` and
is sourced by both the hook and the test suite — one definition rather than
two that must agree. It errs towards gating: a false positive costs one
re-run; a false negative is an unvalidated commit. If the lib cannot be loaded
the hook blocks commits rather than approving them.

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

Chromium/Firefox/WebKit plus Pixel 5 and iPhone 12 viewports. Test timeout
30s, expect 10s. Retries 2 on CI, 1 locally. Screenshots on failure, trace on
first retry. Selectors live in page objects under `e2e/pages/`.

## Bundle Size

Limits are the `size-limit` key of `packages/web/package.json` — read them
there. Folded into `web:build`; open `stats.html` after a build to see chunk
contents. CI builds the merge commit and lands ~10-15 kB above a local build.

## Coverage Thresholds

Enforced by Vitest (see `vite.config.ts`): lines 50%, functions 70%,
branches 70%, statements 50%.
