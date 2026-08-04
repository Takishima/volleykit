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
# The cache MUST live outside the scratch repo. reset_tree runs `git clean -qfd`,
# which would delete it, leaving every later row running against a cold cache —
# and divergence is only consulted once no check is missing, so the divergence
# rows would pass without the rule ever being evaluated.
CACHE=$(mktemp -d)
trap 'rm -rf "$SCRATCH" "$CACHE"' EXIT

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

# The package layout is derived from validate.sh's own table rather than
# restated here: a package added there with a path that exists nowhere would
# otherwise fail nothing, which is the manual-agreement pattern this suite is
# meant to remove. Only the `declare -A PKG_INPUTS=(...)` block is evaluated.
eval "$(sed -n '/^declare -A PKG_INPUTS=(/,/^)/p' "$HERE/validate.sh")"

mkdir -p scripts .claude/hooks/lib docs/api
for pkg in "${!PKG_INPUTS[@]}"; do
  for path in ${PKG_INPUTS[$pkg]}; do
    case "$path" in
      *.json | *.yaml) mkdir -p "$(dirname "$path")" ;;
      *) mkdir -p "$path" ;;
    esac
  done
done
mkdir -p packages/web/src packages/shared/src packages/shared/styles \
  packages/mobile/src packages/worker/src help-site/src

cp "$HERE/validate.sh" "$HERE/validation-lib.sh" "$HERE/validation-lib.test.sh" \
  "$HERE/validate.test.sh" scripts/
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

export VOLLEYKIT_CACHE_DIR="$CACHE"

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

printf '\n# t\n' >>scripts/validate.test.sh
assert_contains "editing the registry suite selects it" "check validation:registry"

printf '\n# t\n' >>.prettierignore
assert_contains "editing .prettierignore selects format" "check format"

echo '{"compilerOptions":{}}' >packages/web/tsconfig.app.json
assert_contains "a tsconfig variant selects the web build" "check web:build"

echo 'x' >packages/web/src/logo.svg
assert_contains "an asset under a package is not silently skipped" "check web:lint"

# git C-quotes non-ASCII paths by default, and every consumer matches raw path
# strings, so the file was invisible to the whole registry — gate open, nothing
# run. A de/fr/it codebase will have these.
printf 'export const e = 1\n' >"packages/web/src/café.ts"
assert_contains "an accented filename is not invisible" "check web:lint"

printf 'export const e = 1\n' >"packages/web/src/café.ts"
assert_contains "an accented filename reaches format" "check format"

# The check's name registering is not the same as its argument list being right.
# A prettier-config change must WIDEN the file set, not replace it: `git ls-files`
# alone is tracked-only, so replacing dropped every newly added file. The stub
# records prettier's argv, which is what `format` actually receives.
ARGV_LOG="$CACHE/prettier-argv.log"
cat >"$SCRATCH/bin/pnpm" <<STUB
#!/bin/sh
if [ "\$1" = "exec" ] && [ "\$2" = "prettier" ]; then
  shift 3
  for a in "\$@"; do echo "\$a" >>"$ARGV_LOG"; done
fi
exit 0
STUB
chmod +x "$SCRATCH/bin/pnpm"

format_argv() {
  : >"$ARGV_LOG"
  (cd "$SCRATCH" && VOLLEYKIT_NO_CACHE=1 bash scripts/validate.sh format >/dev/null 2>&1)
  sort -u "$ARGV_LOG"
}

echo 'export const zz = 1' >packages/web/src/zz-new.ts
if format_argv | grep -q 'zz-new'; then
  ok "an untracked file reaches prettier on its own"
else
  not_ok "an untracked file reaches prettier on its own" "$(format_argv | tr '\n' ' ')"
fi

printf '\n\n' >>.prettierrc.json
if format_argv | grep -q 'zz-new'; then
  ok "a prettier-config change widens rather than replaces the file set"
else
  not_ok "a prettier-config change widens rather than replaces the file set" \
    "zz-new.ts dropped out when .prettierrc.json also changed"
fi

if format_argv | grep -q 'packages/mobile'; then
  ok "the widened set reaches files that did not change"
else
  not_ok "the widened set reaches files that did not change" "$(format_argv | tr '\n' ' ')"
fi
reset_tree

# Restore the plain stub for the rows below.
printf '#!/bin/sh\nexit 0\n' >"$SCRATCH/bin/pnpm"
chmod +x "$SCRATCH/bin/pnpm"

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
# Distinguishing the intersection from a union needs one file staged and a
# DIFFERENT file dirty. With only a dirty file, both rules report nothing, so
# the row would pass whatever the rule does. Everything must also be cached, or
# --gate never consults divergence at all and the row is vacuous twice over.
echo 'export const a = 98' >packages/web/src/index.ts
(cd "$SCRATCH" && git add packages/web/src/index.ts)
echo 'export const d = 98' >packages/worker/src/index.ts
(cd "$SCRATCH" && bash scripts/validate.sh >/dev/null 2>&1)

GOT=$(gate_records)
GOT=${GOT% }
case "$GOT" in
  "") ok "one file staged and another dirty: no divergence, gate open" ;;
  *) not_ok "one file staged and another dirty: no divergence, gate open" "$GOT" ;;
esac
(cd "$SCRATCH" && git reset -q)
reset_tree

# The same file staged AND dirty is the real hazard, and is reported.
echo 'export const a = 97' >packages/web/src/index.ts
(cd "$SCRATCH" && bash scripts/validate.sh >/dev/null 2>&1)
(cd "$SCRATCH" && git add packages/web/src/index.ts)
echo 'export const a = 96' >packages/web/src/index.ts
(cd "$SCRATCH" && bash scripts/validate.sh >/dev/null 2>&1)
GOT=$(gate_records)
GOT=${GOT% }
if [ "$GOT" = "unstaged packages/web/src/index.ts" ]; then
  ok "a staged-and-dirty file is reported"
else
  not_ok "a staged-and-dirty file is reported" "$GOT"
fi
(cd "$SCRATCH" && git reset -q)
reset_tree

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
