#!/usr/bin/env bash
# Validation policy: which packages exist, what invalidates what, and which
# root files feed which checks. This is the file to open when adding a package
# or widening a check's inputs. Mechanism lives in scripts/validate.sh
# (selection, registry, gate) and scripts/validation-run.sh (execution).
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
# validate.sh. Not every check is package-scoped: format, tokens and the
# validation:* checks register from the standalone constants below.
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

# The validation scripts themselves, listed once and fed into both root sets
# below: a script added to one list but not the other would either leave stale
# PASS entries behind (missing from CORE_ROOT) or skip the suite that covers
# it (missing from SHELL_INPUTS).
VALIDATION_SCRIPTS="scripts/validate.sh scripts/validation-lib.sh scripts/validation-policy.sh scripts/validation-run.sh"

# CORE_ROOT drives ROOT_CHANGED, which marks every package affected, and is in
# every check's cache key. `.npmrc` is here because it controls pnpm's
# resolution behaviour for every package. The validation scripts are here on
# purpose: changing a check's command or input paths must not leave stale PASS
# entries behind.
CORE_ROOT="package.json .npmrc pnpm-lock.yaml pnpm-workspace.yaml $VALIDATION_SCRIPTS"

# Prettier's own inputs. `.editorconfig` is read by prettier 3 by default, so
# editing it changes the verdict for files that did not change.
FORMAT_ROOT=".prettierrc.json .prettierignore .editorconfig"

# Everything that decides whether the commit gate runs and what it decides:
# the hook, the file that registers the hook, and the scripts behind it. One
# list feeds both the trigger and the check's cache key.
# package.json is here as well as in CORE_ROOT: the suite asserts FORMAT_EXT
# against its format glob, so an edit to that glob must register the suite —
# invalidation alone only matters once a check registers. All three tracked
# settings files are here for the same reason: each registers hooks whose
# exec bits the suite pins.
SHELL_INPUTS=".claude/hooks .claude/settings.json .claude/settings-review.json .claude/settings-review-architecture.json package.json $VALIDATION_SCRIPTS scripts/validate.test.sh scripts/shellcheck.sh .github/workflows/ci-shell.yml"

# The design-token check compares the two generated files. Trigger and inputs
# are the same constant so editing the generator both invalidates the cache
# and registers the check.
TOKENS_INPUTS="packages/shared/styles scripts/sync-style-tokens.js"

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
