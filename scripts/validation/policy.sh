#!/usr/bin/env bash
# Validation policy: which packages exist, what invalidates what, and which
# root files feed which checks. This is the file to open when adding a package
# or widening a check's inputs. Mechanism lives in scripts/validate.sh
# (arguments, selection, gate), scripts/validation/checks.sh (registry) and
# scripts/validation/run.sh (execution).
#
# Meant to be sourced by scripts/validate.sh with the cwd at the repo root.
#
# shellcheck disable=SC2034  # every constant here is consumed by the sourcing script

# =============================================================================
# PACKAGE TABLE
# =============================================================================
#
# One table, two consumers. A package's input paths decide BOTH whether the
# package is affected by the current changes AND what invalidates its cache
# entries. Encoding those separately is how a package ends up unvalidated: an
# earlier design tested affectedness against a hand-written list of shared
# barrel files that omitted utils/, i18n/, adapters/ and offline/, so a change
# to any of those skipped mobile's checks entirely while still claiming a pass.
#
# Adding a package means adding a row here and a register_check block in
# scripts/validation/checks.sh. Not every check is package-scoped: format,
# tokens and the validation:* checks register from the standalone constants
# below.
#
# packages/shared/styles sits beside src/, not under it, and is consumed by
# web (index.css imports design-tokens.css), mobile (tailwind.config.js
# requires colors) and help-site (global.css) — hence its own entry in those
# three rows.
#
# Deliberately absent: `ocr-poc` (throwaway proof of concept, in
# pnpm-workspace.yaml but with nothing worth gating) and `devenv.nix` (dev
# environment definition; no check reads it, CI does not use it).

# The OpenAPI spec is one path with two consumers: it invalidates the packages
# that read the generated schema, and it triggers regeneration in validate.sh.
# One constant so the two cannot drift.
API_SPEC="docs/api/volleymanager-openapi.yaml"

declare -a PKG_NAMES=(web shared mobile worker help-site)
declare -A PKG_INPUTS=(
  [web]="packages/web packages/shared/src packages/shared/styles packages/shared/package.json $API_SPEC"
  [shared]="packages/shared $API_SPEC"
  [mobile]="packages/mobile packages/shared/src packages/shared/styles packages/shared/package.json $API_SPEC"
  [worker]="packages/worker wrangler.jsonc"
  [help-site]="help-site packages/shared/styles"
)

# =============================================================================
# ROOT FILE SETS
# =============================================================================
#
# Split by who actually reads them. One list cannot answer both "does this
# invalidate every check" and "does this invalidate the formatter": a prettier
# config change has nothing to do with whether the mobile tests still pass,
# and treating it as repo-wide re-runs the entire monorepo for it.

# CORE_ROOT drives ROOT_CHANGED, which marks every package affected, and is in
# every check's cache key. `.npmrc` is here because it controls pnpm's
# resolution behaviour for every package.
#
# `scripts/validation` is a directory, on purpose: every file the validation
# system is built from lives in it or is scripts/validate.sh, so anything
# validate.sh loads or execs from there — by any syntax, tracked or not — is in
# every cache key without being named. A stale PASS surviving an edit to
# validation code is therefore ruled out by layout, not by a declared list that
# has to be kept complete. The residual is the layout rule itself: a load from
# OUTSIDE this tree would not be covered. None exists; docs/VALIDATION.md names
# the rule and review owns it.
CORE_ROOT="package.json .npmrc pnpm-lock.yaml pnpm-workspace.yaml scripts/validate.sh scripts/validation"

# Prettier's own inputs. `.editorconfig` is read by prettier 3 by default, so
# editing it changes the verdict for files that did not change.
FORMAT_ROOT=".prettierrc.json .prettierignore .editorconfig"

# Everything that decides whether the commit gate runs and what it decides —
# the inputs (and cache key) of the validation:* checks. Directory prefixes,
# not file lists: `scripts` covers the runner, its modules, the suite and the
# lint script; `.claude/hooks` covers the commit hook and its predicate.
# package.json is here as well as in CORE_ROOT: the suite asserts FORMAT_EXT
# against its format glob, so an edit to that glob must register the suite —
# invalidation alone only matters once a check registers.
SHELL_INPUTS="scripts .claude/hooks .claude/settings.json .github/workflows/ci-shell.yml package.json"

# The design-token check compares the two generated files. Trigger and inputs
# are the same constant so editing the generator both invalidates the cache
# and registers the check.
TOKENS_INPUTS="packages/shared/styles scripts/sync-style-tokens.js"

# =============================================================================
# EXEC-BIT PATHS
# =============================================================================
#
# Tracked files that are invoked by path and must stay mode 100755: everything
# directly in .claude/hooks/ (that is what the directory is — the settings
# files exec each entry by path), plus scripts/validate.sh (invoked by path in
# the permission allowlist and by the commit hook). `:(glob)` so `*` does not
# cross `/`: .claude/hooks/lib/ holds sourced helpers, and 100644 is their
# ordinary spelling. Enforced by exec_bits (scripts/validation/lib.sh), which
# validate.sh runs uncached on every invocation — a mode is not content, so no
# fingerprint can carry it.
#
# Residual, accepted: a hook registered from some other directory would not be
# pinned here. Keeping every registered hook in .claude/hooks/ is the layout
# rule that makes this list complete.
declare -a EXEC_BIT_PATHS=(':(glob).claude/hooks/*.sh' 'scripts/validate.sh')

# =============================================================================
# FORMAT EXTENSIONS
# =============================================================================
#
# Must stay in agreement with the root `format` script's glob in package.json:
# the gate has to check the same file set `pnpm run format` writes. The test
# suite asserts the two agree (a runtime derivation was tried and rejected —
# it made jq a dependency of every invocation and failed silently on a second
# brace group; drift is better caught as a red test than parsed at startup).
FORMAT_EXT='\.(ts|tsx|js|jsx|mjs|json|css|md|astro)$'
