#!/usr/bin/env bash
# Tests for scripts/validate.sh — the registry, affectedness, and the records
# --gate emits.
#
#   scripts/validate.test.sh
#
# validation-lib.test.sh covers the primitives (fingerprint, cache, change
# detection). This covers the layer above them, which is where every hole found
# in review has actually been: a trigger that does not match the inputs it
# declares, a path that registers no check, an early exit that fires before the
# registry is built.
#
# It runs against a scratch monorepo with the real validate.sh copied in, and
# `pnpm` and `node` stubbed to succeed. No check command actually runs — what is
# under test is which checks get selected, not what they do.

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PASS=0
FAIL=0

ok() {
  PASS=$((PASS + 1))
  echo "  ok   - $1"
}

not_ok() {
  FAIL=$((FAIL + 1))
  echo "  FAIL - $1"
  [ $# -gt 1 ] && echo "         $2"
  return 0
}

# --- scratch monorepo ---------------------------------------------------------

SCRATCH=$(mktemp -d)
trap 'rm -rf "$SCRATCH"' EXIT

mkdir -p "$SCRATCH/bin"
for tool in pnpm node; do
  printf '#!/bin/sh\nexit 0\n' >"$SCRATCH/bin/$tool"
  chmod +x "$SCRATCH/bin/$tool"
done
export PATH="$SCRATCH/bin:$PATH"

cd "$SCRATCH" || exit 1
git init -q .
git config user.email test@example.com
git config user.name Test

mkdir -p scripts .claude/hooks/lib packages/web/src packages/shared/src \
  packages/shared/styles packages/mobile/src packages/worker/src help-site/src \
  docs/api

cp "$HERE/validate.sh" "$HERE/validation-lib.sh" "$HERE/validation-lib.test.sh" scripts/
cp "$HERE/../.claude/hooks/pre-git-commit.sh" .claude/hooks/
cp "$HERE/../.claude/hooks/lib/is-git-commit.sh" .claude/hooks/lib/
printf '{"hooks":{"PreToolUse":[{"hooks":[{"command":".claude/hooks/pre-git-commit.sh"}]}]}}\n' >.claude/settings.json

echo '{}' >package.json
echo '{}' >pnpm-lock.yaml
echo '{}' >pnpm-workspace.yaml
echo '{}' >.prettierrc.json
printf 'node_modules\n' >.prettierignore
echo 'x' >scripts/sync-style-tokens.js
echo 'export const a = 1' >packages/web/src/index.ts
echo 'export const b = 1' >packages/shared/src/index.ts
echo ':root{}' >packages/shared/styles/design-tokens.css
echo 'export const c = 1' >packages/mobile/src/index.ts
echo 'export const d = 1' >packages/worker/src/index.ts
echo 'x' >help-site/src/index.astro
echo 'openapi: 3.0.0' >docs/api/volleymanager-openapi.yaml
for p in web shared mobile worker; do echo '{}' >"packages/$p/package.json"; done
echo '{}' >help-site/package.json

git add -A
git commit -qm init

export VOLLEYKIT_CACHE_DIR="$SCRATCH/.cache"

echo "validate.sh"

# `--gate` runs nothing and prints one record per line. Comparing its output for
# a given change is the cheapest way to assert what the registry selected.
gate_records() {
  (cd "$SCRATCH" && bash scripts/validate.sh --gate 2>/dev/null | sort | tr '\n' ' ')
}

reset_tree() {
  (cd "$SCRATCH" && git checkout -q -- . && git clean -qfd)
}

# Asserts the exact set of records for a change, so a check that stops
# registering fails as loudly as one that starts.
assert_records() {
  local label=$1 expected=$2
  local got
  got=$(gate_records)
  got=${got% }
  if [ "$got" = "$expected" ]; then
    ok "$label"
  else
    not_ok "$label" "expected: $expected
         got:      $got"
  fi
  reset_tree
}

assert_contains() {
  local label=$1 needle=$2
  local got
  got=$(gate_records)
  case "$got" in
    *"$needle"*) ok "$label" ;;
    *) not_ok "$label" "expected to contain '$needle', got: $got" ;;
  esac
  reset_tree
}

assert_absent() {
  local label=$1 needle=$2
  local got
  got=$(gate_records)
  case "$got" in
    *"$needle"*) not_ok "$label" "expected NOT to contain '$needle', got: $got" ;;
    *) ok "$label" ;;
  esac
  reset_tree
}

# --- affectedness -------------------------------------------------------------

echo 'export const a = 2' >packages/web/src/index.ts
assert_records "a web source edit selects web checks and format" \
  "check format check web:build check web:lint check web:test"

echo 'export const b = 2' >packages/shared/src/index.ts
assert_contains "a shared edit reaches mobile" "check mobile:lint"

echo 'export const b = 3' >packages/shared/src/index.ts
assert_contains "a shared edit reaches web" "check web:lint"

echo 'export const d = 2' >packages/worker/src/index.ts
assert_absent "a worker edit does not select web" "web:"

echo 'x' >help-site/src/page.astro
assert_contains "a help-site edit selects its build" "check help-site:build"

# --- triggers that are not package inputs -------------------------------------
#
# Each of these was, at some point, a path that registered nothing.

echo ':root{--x:1}' >packages/shared/styles/design-tokens.css
assert_contains "a design-token css edit selects the tokens check" "check tokens"

echo 'x2' >scripts/sync-style-tokens.js
assert_contains "editing the token generator selects the tokens check" "check tokens"

printf '\n# t\n' >>.claude/settings.json
assert_contains "editing settings.json selects validation:test" "check validation:test"

printf '\n# t\n' >>.claude/hooks/pre-git-commit.sh
assert_contains "editing the commit hook selects validation:test" "check validation:test"

printf '\n# t\n' >>.claude/hooks/lib/is-git-commit.sh
assert_contains "editing the predicate selects validation:test" "check validation:test"

printf '\n# t\n' >>.prettierignore
assert_contains "editing .prettierignore selects format" "check format"

echo '{"compilerOptions":{}}' >packages/web/tsconfig.app.json
assert_contains "a tsconfig variant selects the web build" "check web:build"

echo 'x' >packages/web/src/logo.svg
assert_contains "an asset under a package is not silently skipped" "check web:lint"

# --- root files ---------------------------------------------------------------

echo '{"a":1}' >pnpm-lock.yaml
assert_contains "a lockfile change reaches mobile" "check mobile:lint"

printf '\n# t\n' >>scripts/validate.sh
assert_contains "editing validate.sh invalidates everything" "check shared:build"

# --- things that should select nothing ----------------------------------------

echo 'hello' >README.md
assert_records "a docs-only change selects nothing" ""

echo 'x' >.github-unused-file
assert_records "a file under no package and no root selects nothing" ""

# --- divergence ---------------------------------------------------------------
#
# The gate reports a path whose staged content is not what was validated. It is
# only consulted once every check is otherwise green, so the cache is primed
# first by running for real against the stubs.

# The backup lives outside the repo: an untracked file inside it would itself
# be a change, and `git clean` in reset_tree would delete the cache directory.
BACKUP="$(mktemp)"

# Prime the cache against the exact worktree content asserted on below.
echo 'export const a = 42' >packages/web/src/index.ts
cp packages/web/src/index.ts "$BACKUP"
(cd "$SCRATCH" && bash scripts/validate.sh >/dev/null 2>&1)
GOT=$(gate_records)
GOT=${GOT% }
if [ -z "$GOT" ]; then
  ok "a full run against the stubs opens the gate"
else
  not_ok "a full run against the stubs opens the gate" "$GOT"
fi

# Stage something the run never saw, then put the validated content back.
echo 'export const a = 99' >packages/web/src/index.ts
git add packages/web/src/index.ts
cp "$BACKUP" packages/web/src/index.ts
GOT=$(gate_records)
GOT=${GOT% }
if [ "$GOT" = "unstaged packages/web/src/index.ts" ]; then
  ok "staged content that was never validated is reported"
else
  not_ok "staged content that was never validated is reported" "$GOT"
fi
rm -f "$BACKUP"
(cd "$SCRATCH" && git reset -q && git checkout -q -- . && git clean -qfd)

# A file that is dirty but not staged is not part of the next commit.
echo 'export const a = 98' >packages/web/src/index.ts
assert_absent "a dirty-but-unstaged file is not reported as unstaged" "unstaged"

# --- argument handling --------------------------------------------------------

(cd "$SCRATCH" && bash scripts/validate.sh --gate lint >/dev/null 2>&1)
[ $? -eq 2 ] && ok "--gate with a class filter is rejected" ||
  not_ok "--gate with a class filter is rejected"

(cd "$SCRATCH" && bash scripts/validate.sh bogus >/dev/null 2>&1)
[ $? -eq 2 ] && ok "an unknown argument is rejected" ||
  not_ok "an unknown argument is rejected"

# --- result -------------------------------------------------------------------

echo
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
