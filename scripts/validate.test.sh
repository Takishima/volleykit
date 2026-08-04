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
REPO="$(cd "$HERE/.." && pwd)"

# Sourced up front: the scratch fixture is built from SHELLCHECK_INPUTS, and
# is_shell_file / shellcheck_files / all_shell_files are read by rows below.
# shellcheck source=./shellcheck.sh
source "$HERE/shellcheck.sh" || exit 1

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
for tool in pnpm node shellcheck; do
  printf '#!/bin/sh\nexit 0\n' >"$SCRATCH/bin/$tool"
  chmod +x "$SCRATCH/bin/$tool"
done
export PATH="$SCRATCH/bin:$PATH"

cd "$SCRATCH" || exit 1
git init -q .
git config user.email test@example.com
git config user.name Test

# The package layout is derived from validate.sh's own table, and each derived
# path gets a real committed file so the generated rows below can assert that a
# package is reachable from its own inputs.
#
# The fixture cannot check the table against the REAL repo — `mkdir -p` creates
# whatever the table names, so the scratch and the table agree by construction.
# That direction is asserted separately, against $REPO, in the block below.
eval "$(sed -n '/^declare -a PKG_NAMES=(/p' "$HERE/validate.sh")"
eval "$(sed -n '/^declare -A PKG_INPUTS=(/,/^)/p' "$HERE/validate.sh")"

mkdir -p scripts .claude/hooks/lib docs/api

# The scratch has to contain every SHELLCHECK_INPUTS path, or shellcheck_files
# returns non-zero on the first missing one and any row reading it sees a
# truncated set — passing for the wrong reason.
# Each directory gets a committed placeholder. An empty directory is untracked,
# and reset_tree's `git clean -qfd` removes it — after which shellcheck_files
# returns non-zero on the missing path and every row reading it sees an empty
# set, passing for the wrong reason.
for path in $SHELLCHECK_INPUTS; do
  case "$path" in
    *.*)
      mkdir -p "$(dirname "$path")"
      [ -e "$path" ] || printf '#!/usr/bin/env bash\ntrue\n' >"$path"
      ;;
    *)
      mkdir -p "$path"
      [ -e "$path/.keep.sh" ] || printf '#!/usr/bin/env bash\ntrue\n' >"$path/.keep.sh"
      ;;
  esac
done
for pkg in "${PKG_NAMES[@]}"; do
  for path in ${PKG_INPUTS[$pkg]}; do
    case "$path" in
      *.json)
        mkdir -p "$(dirname "$path")"
        [ -e "$path" ] || echo '{}' >"$path"
        ;;
      *.yaml)
        mkdir -p "$(dirname "$path")"
        [ -e "$path" ] || echo 'openapi: 3.0.0' >"$path"
        ;;
      *)
        mkdir -p "$path"
        [ -e "$path/probe.ts" ] || echo 'export const probe = 1' >"$path/probe.ts"
        ;;
    esac
  done
done

cp "$HERE/validate.sh" "$HERE/validation-lib.sh" "$HERE/validation-lib.test.sh" \
  "$HERE/validate.test.sh" "$HERE/shellcheck.sh" scripts/
cp "$HERE/../.claude/hooks/pre-git-commit.sh" .claude/hooks/
cp "$HERE/../.claude/hooks/lib/is-git-commit.sh" .claude/hooks/lib/
printf '{"hooks":{"PreToolUse":[{"hooks":[{"command":".claude/hooks/pre-git-commit.sh"}]}]}}\n' >.claude/settings.json

echo '{}' >package.json
echo '{}' >pnpm-lock.yaml
echo '{}' >pnpm-workspace.yaml
echo '{}' >.prettierrc.json
printf 'node_modules\n' >.prettierignore
mkdir -p packages/shared/styles packages/web/src packages/shared/src \
  packages/mobile/src packages/worker/src help-site/src
echo 'x' >scripts/sync-style-tokens.js
echo 'export const a = 1' >packages/web/src/index.ts
echo 'export const b = 1' >packages/shared/src/index.ts
echo ':root{}' >packages/shared/styles/design-tokens.css
echo 'export const c = 1' >packages/mobile/src/index.ts
echo 'export const d = 1' >packages/worker/src/index.ts
echo 'x' >help-site/src/index.astro
echo 'openapi: 3.0.0' >docs/api/volleymanager-openapi.yaml

git add -A
git commit -qm init

# Both suites assert cache-hit behaviour, so an ambient VOLLEYKIT_NO_CACHE
# would fail them for a reason unrelated to what they test. This is not the
# leak fix — validate.sh no longer exports the flag — it is the same isolation
# as VOLLEYKIT_CACHE_DIR below. The rows that want a forced miss set it
# explicitly per-invocation.
unset VOLLEYKIT_NO_CACHE
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

# --- the table describes the real repo ------------------------------------------
#
# Every path constant in validate.sh is a promise about the filesystem. The
# scratch monorepo cannot test that promise: it is built from the same table, so
# the two agree no matter what the table says. A typo here is the original
# failure — the package looks registered and validates nothing — so it is
# checked against the source tree directly.

# Scraped by naming convention, not by name: an earlier version listed the
# constants literally, so a sixth one was asserted by nothing — the same
# covers-what-existed-when-it-was-written shape as the package list.
mapfile -t PATH_CONSTS < <(
  sed -n 's/^\([A-Z_]*\(INPUTS\|ROOT\)\)=.*/\1/p' "$HERE/validate.sh" "$HERE/shellcheck.sh" | sort -u
)
eval "$(sed -n '/^[A-Z_]*\(INPUTS\|ROOT\)=/p' "$HERE/validate.sh" "$HERE/shellcheck.sh")"

if [ "${#PATH_CONSTS[@]}" -ge 5 ]; then
  ok "path constants are scraped from the scripts (${#PATH_CONSTS[@]} found)"
else
  not_ok "path constants are scraped from the scripts" "found ${#PATH_CONSTS[@]}, expected at least 5"
fi

check_paths_exist() {
  local label=$1 missing=""
  shift
  local path
  for path in "$@"; do
    [ -e "$REPO/$path" ] || missing="$missing $path"
  done
  if [ -z "$missing" ]; then
    ok "every path in $label exists in the repo"
  else
    not_ok "every path in $label exists in the repo" "missing:$missing"
  fi
}

for pkg in "${PKG_NAMES[@]}"; do
  # shellcheck disable=SC2086  # the table is space-separated, split on purpose
  check_paths_exist "PKG_INPUTS[$pkg]" ${PKG_INPUTS[$pkg]}
done
for const in "${PATH_CONSTS[@]}"; do
  # shellcheck disable=SC2086  # the constants are space-separated, split on purpose
  check_paths_exist "$const" ${!const}
done

# SHELLCHECK_EXCLUDED is not scraped by the convention above, and it *widens*
# the coverage row below — an exclusion that grows silently excuses whatever it
# names from the only assertion guarding lint coverage. So it is checked for
# existence, and capped: growing it is a deliberate edit here, not a side effect.
# shellcheck disable=SC2086
check_paths_exist "SHELLCHECK_EXCLUDED" $SHELLCHECK_EXCLUDED
# shellcheck disable=SC2086  # our own constant: split on purpose, no globs
EXCLUDED_COUNT=$(printf '%s\n' $SHELLCHECK_EXCLUDED | sed '/^$/d' | wc -l)
if [ "$EXCLUDED_COUNT" -le 1 ]; then
  ok "the shell-lint exclusion list is still minimal ($EXCLUDED_COUNT of max 1)"
else
  not_ok "the shell-lint exclusion list is still minimal" \
    "$EXCLUDED_COUNT entries — each one excuses its tree from the coverage row"
fi

# The lint's argv and its cache key are the same constant, but only if every
# file the lint actually reads sits under it. Anything outside is linted in CI
# and invisible to the gate, and a stored PASS survives that file breaking.
# `git ls-files` over the whole repo, not a list of directories to look in —
# naming the scan roots is the same covers-what-existed-when-it-was-written
# shape, one level up, and it left six tracked scripts linted by nothing.
# Newline-delimited, not `|`: a real filename can contain a pipe and match a
# boundary that is not there — the same class as the escaped-regex membership
# test divergence() was rewritten to avoid.
LINTED_SET=$(cd "$REPO" && shellcheck_files)
UNCOVERED=""
UNCOVERED_LIST=""
SHELL_FILE_COUNT=0
while IFS= read -r f; do
  SHELL_FILE_COUNT=$((SHELL_FILE_COUNT + 1))
  covered=false
  # Membership in the linted set, not "sits under a directory the linter looks
  # in" — those differ for any file the lint's own filter skips, which is how an
  # extensionless script under scripts/ counted as covered and was never linted.
  while IFS= read -r linted; do
    [ "$linted" = "$f" ] && { covered=true; break; }
  done <<<"$LINTED_SET"
  if [ "$covered" = false ]; then
    for path in $SHELLCHECK_EXCLUDED; do
      case "$f" in "$path"/* | "$path") covered=true; break ;; esac
    done
  fi
  if [ "$covered" != true ]; then
    UNCOVERED="$UNCOVERED $f"
    UNCOVERED_LIST="$UNCOVERED_LIST$f"$'\n'
  fi
done < <(cd "$REPO" && all_shell_files)

if [ "$SHELL_FILE_COUNT" -ge 10 ]; then
  ok "the shell-file scan found the repo's scripts ($SHELL_FILE_COUNT)"
else
  not_ok "the shell-file scan found the repo's scripts" "found $SHELL_FILE_COUNT, expected at least 10"
fi
if [ -z "$UNCOVERED" ]; then
  ok "every shell file in the worktree is linted or explicitly excluded"
else
  UNTRACKED_HINT=""
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    (cd "$REPO" && git ls-files --error-unmatch "$f" >/dev/null 2>&1) ||
      UNTRACKED_HINT="$UNTRACKED_HINT
           $f"
  done <<<"$UNCOVERED_LIST"
  HINT="neither under SHELLCHECK_INPUTS nor named in SHELLCHECK_EXCLUDED:$UNCOVERED"
  [ -n "$UNTRACKED_HINT" ] && HINT="$HINT

         Untracked, so probably a local scratch script:$UNTRACKED_HINT
         gitignore it (ignored files are skipped) or move it under a linted path.
         Editing SHELLCHECK_INPUTS/EXCLUDED is the wrong remedy for those."
  not_ok "every shell file in the worktree is linted or explicitly excluded" "$HINT"
fi

# ci-shell.yml's `paths:` filter is the last hand-maintained copy of these
# lists, and it decides whether CI runs at all — which is the only enforcement
# on a machine without shellcheck. A SHELLCHECK_INPUTS entry missing from it
# means a push touching only that directory gets no shell lint from either side.
WORKFLOW="$REPO/.github/workflows/ci-shell.yml"

# Each trigger block is checked separately: `push` and `pull_request` are
# independent filters, and a union of the two would report green while one of
# them had a hole.
workflow_paths() {
  # The second-level key is tracked, not just the block: matching any list item
  # under `push:` also reads `branches:`, and — the case that matters — renaming
  # `paths:` to `paths-ignore:` inverts the filter while leaving the entries
  # untouched, which a block-only parser reports as still covered.
  #
  # The list marker and the quotes are stripped separately; eating one character
  # on each side assumes every entry is quoted, and fails on a valid unquoted one.
  awk -v want="$1" '
    /^  [a-z_]+:/ { block = $1; sub(":", "", block); key = "" }
    /^    [a-z_-]+:/ { key = $1; sub(":", "", key) }
    block == want && key == "paths" && /^ *- / {
      gsub(/^ *- */, ""); gsub(/^["\047]|["\047]$/, ""); print
    }
  ' "$WORKFLOW" | sed 's|/\*\*$||;s|/\*$||' | sort -u
}

if [ -f "$WORKFLOW" ]; then
  for block in push pull_request; do
    mapfile -t WF_PATHS < <(workflow_paths "$block")
    MISSING=""
    if [ ${#WF_PATHS[@]} -eq 0 ]; then
      MISSING=" (no paths parsed for $block)"
    else
      for path in $SHELLCHECK_INPUTS $SHELL_INPUTS; do
        covered=false
        for wf in "${WF_PATHS[@]}"; do
          case "$path" in "$wf" | "$wf"/*) covered=true; break ;; esac
        done
        [ "$covered" = true ] || MISSING="$MISSING $path"
      done
    fi
    if [ -z "$MISSING" ]; then
      ok "ci-shell.yml $block triggers on every path the shell checks read"
    else
      not_ok "ci-shell.yml $block triggers on every path the shell checks read" \
        "not covered by its paths filter:$MISSING"
    fi
  done
else
  not_ok "ci-shell.yml is present" "$WORKFLOW"
fi

# --- affectedness -------------------------------------------------------------
#
# One generated row per package: touching a file under the package's own first
# input path must select a check for it. This is what makes the table the single
# source of truth — add a package with a wrong path and this fails, rather than
# the suite quietly having no opinion.

for pkg in "${PKG_NAMES[@]}"; do
  first=${PKG_INPUTS[$pkg]%% *}
  echo 'export const probe = 2' >"$first/probe.ts"
  assert_contains "a change under $pkg's own input path selects a $pkg check" "check $pkg:"
done


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
ARGV=$(format_argv)
case "$ARGV" in
  *zz-new*) ok "an untracked file reaches prettier on its own" ;;
  *) not_ok "an untracked file reaches prettier on its own" "$(printf '%s' "$ARGV" | tr '\n' ' ')" ;;
esac

printf '\n\n' >>.prettierrc.json
ARGV=$(format_argv)
case "$ARGV" in
  *zz-new*) ok "a prettier-config change widens rather than replaces the file set" ;;
  *) not_ok "a prettier-config change widens rather than replaces the file set" \
    "zz-new.ts dropped out when .prettierrc.json also changed" ;;
esac
case "$ARGV" in
  *packages/mobile*) ok "the widened set reaches files that did not change" ;;
  *) not_ok "the widened set reaches files that did not change" "$(printf '%s' "$ARGV" | tr '\n' ' ')" ;;
esac
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
(cd "$SCRATCH" && bash scripts/validate.sh >/dev/null 2>&1) # re-prime for the new content
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

# A runner-internal flag must not reach the check subprocess. This has been
# fixed twice and come back twice: once by dropping `export`, which does not
# strip the attribute from a variable that arrived exported.
printf 'export const a = 3\n' >packages/web/src/index.ts
# The stub writes to a file, not stdout: run_check redirects a check's output
# and prints it only on failure, so a passing stub's stdout is discarded and the
# row could never have failed.
LEAK_LOG="$CACHE/leak.log"
: >"$LEAK_LOG"
cat >"$SCRATCH/bin/pnpm" <<STUB
#!/bin/sh
echo "NO_CACHE=[\${VOLLEYKIT_NO_CACHE:-unset}]" >>"$LEAK_LOG"
exit 0
STUB
chmod +x "$SCRATCH/bin/pnpm"
(cd "$SCRATCH" && VOLLEYKIT_NO_CACHE=1 bash scripts/validate.sh lint >/dev/null 2>&1) || true
printf '#!/bin/sh\nexit 0\n' >"$SCRATCH/bin/pnpm"
chmod +x "$SCRATCH/bin/pnpm"
if [ ! -s "$LEAK_LOG" ]; then
  not_ok "VOLLEYKIT_NO_CACHE does not reach a check subprocess" \
    "the stub never ran, so the row proves nothing"
elif grep -q 'NO_CACHE=\[1\]' "$LEAK_LOG"; then
  not_ok "VOLLEYKIT_NO_CACHE does not reach a check subprocess" \
    "the check saw the runner-internal flag"
else
  ok "VOLLEYKIT_NO_CACHE does not reach a check subprocess"
fi
reset_tree

# The trigger widening is invisible to every other row: it corresponds to no
# path constant, so the constants-to-triggers check structurally cannot see it.
# Both halves get a row that goes red on revert.

mkdir -p packages/mobile
# shellcheck disable=SC2016  # fixture content, deliberately not expanded here
printf '#!/usr/bin/env bash\nrm -rf $UNQUOTED/*\n' >packages/mobile/scripts_helper
GOT=$(gate_records)
for want in validation:registry validation:shellcheck; do
  case "$GOT" in
    *"check $want"*) ok "a shell file outside every directory list selects $want" ;;
    *) not_ok "a shell file outside every directory list selects $want" "$GOT" ;;
  esac
done
rm -rf packages/mobile
reset_tree

for block in push pull_request; do
  if workflow_paths "$block" | grep -qE '^\*\*\.sh$|^\*\*/\*\.sh$'; then
    ok "ci-shell.yml $block triggers on shell files outside the listed directories"
  else
    not_ok "ci-shell.yml $block triggers on shell files outside the listed directories" \
      "no repo-wide shell glob in its paths filter"
  fi
done

# With the lint, the trigger and the scan all on one predicate, a file it fails
# to recognise is absent from every side at once — not linted, not scanned, not
# triggered — and no coverage row can go red on it. Its breadth is the coverage
# claim, so it is asserted directly.
PROBE="$SCRATCH/shebang-probe"
shebang_is_shell() {
  printf '%s\n' "$1" >"$PROBE"
  is_shell_file "$PROBE"
}
while IFS='|' read -r want line; do
  [ -z "$want" ] && continue
  if shebang_is_shell "$line"; then got=yes; else got=no; fi
  if [ "$got" = "$want" ]; then
    ok "shebang recognised as shell=$want: $line"
  else
    not_ok "shebang recognised as shell=$want: $line" "got shell=$got"
  fi
done <<'TABLE'
yes|#!/bin/bash
yes|#!/bin/sh
yes|#! /bin/bash
yes|#!/usr/bin/env bash
yes|#!/usr/bin/env sh
yes|#!/usr/bin/env ksh
yes|#!/usr/bin/env -S bash -e
yes|#!/bin/dash
yes|#!/bin/zsh
no|#!/usr/bin/env python3
no|#!/usr/bin/env node
no|#!/usr/bin/perl
no|not a shebang at all
TABLE
rm -f "$PROBE"

# The trigger only helps if the cache key moved too. Every other row here is
# `--gate`, which reports and never executes, so nothing in the suite ever
# stores an entry — and a check whose key did not change is a hit, skipped, no
# matter what selected it. This row warms the cache first.
#
# The two suite commands are stubbed out in the scratch before warming, or the
# warming run re-enters this suite recursively.
printf '#!/bin/sh\nexit 0\n' >"$SCRATCH/scripts/validate.test.sh"
printf '#!/bin/sh\nexit 0\n' >"$SCRATCH/scripts/validation-lib.test.sh"
echo 'export const a = 7' >packages/web/src/index.ts
(cd "$SCRATCH" && bash scripts/validate.sh >/dev/null 2>&1)

mkdir -p packages/mobile/tools
# shellcheck disable=SC2016  # fixture content, deliberately not expanded here
printf '#!/usr/bin/env bash\nrm -rf $UNQUOTED/*\n' >packages/mobile/tools/helper.sh
GOT=$(gate_records)
for want in validation:registry validation:shellcheck; do
  case "$GOT" in
    *"check $want"*) ok "a warm cache does not hide $want from a new shell file" ;;
    *) not_ok "a warm cache does not hide $want from a new shell file" \
      "cache hit: the trigger selected it and the key did not move — $GOT" ;;
  esac
done
rm -rf packages/mobile
reset_tree

# The scan must answer the same before and after `git add`. The fingerprint is
# staging-independent, so a scan that is not leaves a window where the key has
# not moved and the PASS stored before the add is still valid.
mkdir -p packages/mobile/tools
# shellcheck disable=SC2016  # fixture content, deliberately not expanded here
printf '#!/usr/bin/env bash\nrm -rf $UNQUOTED/*\n' >packages/mobile/tools/helper.sh
# No extension: the only path to this one is the untracked-shebang branch, and
# it is the shape (.envrc-like) the shared predicate was introduced for.
printf '#!/bin/bash\necho scratch\n' >packages/mobile/tools/helper
BEFORE_ADD=$(cd "$SCRATCH" && all_shell_files)
(cd "$SCRATCH" && git add packages/mobile/tools/helper.sh packages/mobile/tools/helper)
AFTER_ADD=$(cd "$SCRATCH" && all_shell_files)
if [ "$BEFORE_ADD" = "$AFTER_ADD" ]; then
  ok "the shell-file scan answers the same before and after git add"
else
  not_ok "the shell-file scan answers the same before and after git add" \
    "an index-only scan moves while the cache key does not, so the stale PASS survives"
fi
case "$BEFORE_ADD" in
  *packages/mobile/tools/helper.sh*) ok "an untracked .sh file is in the scan" ;;
  *) not_ok "an untracked .sh file is in the scan" "not found before git add" ;;
esac
case "$BEFORE_ADD" in
  *"packages/mobile/tools/helper"$'\n'*) ok "an untracked extensionless shell file is in the scan" ;;
  *) not_ok "an untracked extensionless shell file is in the scan" \
    "only the .sh branch answers; the shebang branch is unexercised" ;;
esac
(cd "$SCRATCH" && git reset -q)
rm -rf packages/mobile
reset_tree

# 50b: the workflow file is in SHELL_INPUTS so that editing it registers a check
mkdir -p .github/workflows
cp "$REPO/.github/workflows/ci-shell.yml" .github/workflows/ci-shell.yml 2>/dev/null || true
printf '\n# t\n' >>.github/workflows/ci-shell.yml
GOT=$(gate_records)
case "$GOT" in
  *"check validation:registry"*) ok "editing ci-shell.yml selects the registry check" ;;
  *) not_ok "editing ci-shell.yml selects the registry check" \
    "narrowing its paths filter narrows the only enforcement a machine without shellcheck has — $GOT" ;;
esac
rm -rf .github
reset_tree

# The coverage row tells a developer to gitignore a scratch script. That remedy
# has to work on both sides: an earlier version filtered ignored files out of the
# scan but not out of the lint, so following the message moved the failure from
# one check to another with no mention of why.
# shellcheck disable=SC2016  # fixture content, deliberately not expanded here
printf '#!/usr/bin/env bash\nrm -rf $SCRATCHVAR/*\n' >scripts/scratch-debug.sh
echo 'scripts/scratch-debug.sh' >>.gitignore
IN_SCAN=$(cd "$SCRATCH" && all_shell_files | grep -c 'scratch-debug' || true)
IN_LINT=$(cd "$SCRATCH" && shellcheck_files | grep -c 'scratch-debug' || true)
if [ "$IN_SCAN" -eq 0 ] && [ "$IN_LINT" -eq 0 ]; then
  ok "gitignoring a scratch script removes it from both the scan and the lint"
else
  not_ok "gitignoring a scratch script removes it from both the scan and the lint" \
    "scan=$IN_SCAN lint=$IN_LINT — the remedy the failure message names must work on both"
fi
rm -f scripts/scratch-debug.sh
reset_tree

# --- guards -------------------------------------------------------------------

# A path git cannot list unquoted must break the gate, not open it: exit 3, not
# 0. `pre-git-commit.sh` reads anything other than 0 or 1 as a broken gate.
printf 'export const q = 1\n' >'packages/web/src/we"ird.ts'
(cd "$SCRATCH" && bash scripts/validate.sh --gate >/dev/null 2>&1)
STATUS=$?
if [ "$STATUS" -eq 3 ]; then
  ok "a path git cannot list unquoted breaks the gate rather than opening it"
else
  not_ok "a path git cannot list unquoted breaks the gate rather than opening it" \
    "exit $STATUS (0 would approve the commit with nothing run)"
fi
rm -f 'packages/web/src/we"ird.ts'
reset_tree

# run_check execs argv, so a composite command must fail at registration.
sed 's|"bash scripts/validate.test.sh"|"bash a.sh \&\& bash b.sh"|' \
  "$HERE/validate.sh" >"$SCRATCH/scripts/validate-composite.sh"
# Touch a SHELL_INPUTS path so the composite check actually registers.
printf '\n# t\n' >>.claude/settings.json
(cd "$SCRATCH" && bash scripts/validate-composite.sh --gate >/dev/null 2>&1)
STATUS=$?
rm -f "$SCRATCH/scripts/validate-composite.sh"
if [ "$STATUS" -eq 3 ]; then
  ok "a composite check command is rejected at registration"
else
  not_ok "a composite check command is rejected at registration" \
    "exit $STATUS (the command would be exec'd as argv and half-ignored)"
fi
reset_tree

# --- result -------------------------------------------------------------------

echo
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
