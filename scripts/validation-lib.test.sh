#!/usr/bin/env bash
# Tests for scripts/validation-lib.sh.
#
#   scripts/validation-lib.test.sh
#
# Asserts the invariants the check cache rests on: if fingerprint() gets any of
# them wrong, the commit gate either approves unvalidated code or throws away
# results it should have kept.
#
# The commit hook is covered by scripts/commit-hook.test.sh. It used to live
# here, and the file name said otherwise for half its contents.
#
# Runs against a scratch repository in a temp directory and never writes to the
# working repo.

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
LIB="$HERE/validation-lib.sh"
# shellcheck source=./test-lib.sh
source "$HERE/test-lib.sh" || exit 1


# --- scratch repository -------------------------------------------------------

SCRATCH=$(mktemp -d)
require_scratch "$SCRATCH" "$(basename "$0")" "$REPO" || exit 1
trap 'rm -rf "$SCRATCH"' EXIT

cd "$SCRATCH" || exit 1
git init -q .
git config user.email test@example.com
git config user.name Test

mkdir -p pkg-a/src pkg-b/src
echo 'export const a = 1' >pkg-a/src/index.ts
echo 'export const b = 1' >pkg-b/src/index.ts
echo '{}' >package.json
git add -A
git commit -qm init

# Both suites assert cache-hit behaviour, so an ambient VOLLEYKIT_NO_CACHE
# would fail them for a reason unrelated to what they test. This is not the
# leak fix — validate.sh no longer exports the flag — it is the same isolation
# as VOLLEYKIT_CACHE_DIR below. The rows that want a forced miss set it
# explicitly per-invocation.
unset VOLLEYKIT_NO_CACHE
export VOLLEYKIT_CACHE_DIR="$SCRATCH/.cache"
# shellcheck source=./validation-lib.sh
source "$LIB" || exit 1

echo "test-lib.sh"

# Counted at the call site: the guard rows are defined in the same file as the
# guards they cover, so neutering that function would delete a branch and its
# only lever together — seven rows vanish and the tally is a number nobody
# compares.
GUARD_BEFORE=$((PASS + FAIL))
assert_guard_rows "$SCRATCH" "$REPO"
assert_eq "the guard block contributed every row it defines" \
  "$((PASS + FAIL - GUARD_BEFORE))" "$GUARD_ROW_COUNT"

echo "validation-lib.sh"

# --- fingerprint --------------------------------------------------------------

echo 'export const a = 2' >pkg-a/src/index.ts
UNSTAGED=$(fingerprint pkg-a)
git add pkg-a/src/index.ts
STAGED=$(fingerprint pkg-a)
assert_eq "same content, different staging state -> same hash" "$UNSTAGED" "$STAGED"

git commit -qm "change a"
COMMITTED=$(fingerprint pkg-a)
assert_eq "committing does not change the hash" "$STAGED" "$COMMITTED"

BEFORE=$(fingerprint pkg-a)
echo 'export const a = 3' >pkg-a/src/index.ts
assert_ne "content edit -> different hash" "$BEFORE" "$(fingerprint pkg-a)"

B_BEFORE=$(fingerprint pkg-b)
echo 'export const a = 4' >pkg-a/src/index.ts
assert_eq "edit outside the pathspec -> unchanged hash" "$B_BEFORE" "$(fingerprint pkg-b)"

NO_UNTRACKED=$(fingerprint pkg-a)
echo 'export const c = 1' >pkg-a/src/untracked.ts
assert_ne "new untracked file -> different hash" "$NO_UNTRACKED" "$(fingerprint pkg-a)"

rm pkg-a/src/untracked.ts
assert_eq "removing that untracked file -> back to the previous hash" "$NO_UNTRACKED" "$(fingerprint pkg-a)"

git add -A && git commit -qm "settle"
BEFORE=$(fingerprint pkg-a)
git rm -q pkg-a/src/index.ts
assert_ne "deleting a tracked file -> different hash" "$BEFORE" "$(fingerprint pkg-a)"
git reset -q --hard HEAD

printf 'ignored\n' >.gitignore
mkdir -p pkg-a/dist
echo 'junk' >pkg-a/dist/ignored
git add .gitignore && git commit -qm gitignore
BEFORE=$(fingerprint pkg-a)
echo 'more junk' >>pkg-a/dist/ignored
assert_eq "gitignored file churn -> unchanged hash" "$BEFORE" "$(fingerprint pkg-a)"

BEFORE=$(fingerprint pkg-a)
assert_eq "fingerprint is deterministic" "$BEFORE" "$(fingerprint pkg-a)"

assert_ne "different pathspecs -> different hashes" "$(fingerprint pkg-a)" "$(fingerprint pkg-b)"

# --- change detection ---------------------------------------------------------

git add -A
git commit -qm settle2 >/dev/null 2>&1 || true
assert_eq "clean tree -> no changed files" "$(changed_files)" ""

echo 'export const a = 9' >pkg-a/src/index.ts
assert_eq "unstaged edit is detected" "$(changed_files)" "pkg-a/src/index.ts"

git add pkg-a/src/index.ts
assert_eq "staged edit is still detected" "$(changed_files)" "pkg-a/src/index.ts"

echo 'x' >pkg-b/src/new.ts
assert_eq "untracked file is detected" "$(changed_files | tr '\n' ' ')" "pkg-a/src/index.ts pkg-b/src/new.ts "

git add -A
assert_eq "divergence is empty once everything is staged" "$(staged_worktree_divergence)" ""

echo 'export const a = 10' >pkg-a/src/index.ts
assert_eq "divergence reports a staged file edited afterwards" "$(staged_worktree_divergence)" "pkg-a/src/index.ts"

# The intersection matters: a merely-dirty file is not part of the next commit
# and must not block it, or partial commits become impossible.
git add -A
git commit -qm settle-divergence >/dev/null 2>&1 || true
echo 'export const a = 20' >pkg-a/src/index.ts
echo 'export const b = 20' >pkg-b/src/index.ts
git add pkg-a/src/index.ts
assert_eq "a dirty-but-unstaged file does not count as divergence" "$(staged_worktree_divergence)" ""

echo 'export const a = 21' >pkg-a/src/index.ts
assert_eq "only the staged-and-dirty file is reported" "$(staged_worktree_divergence)" "pkg-a/src/index.ts"

git reset -q --hard HEAD
rm -f pkg-b/src/new.ts
assert_eq "nothing staged -> no divergence" "$(staged_worktree_divergence)" ""

# --- cache --------------------------------------------------------------------

git add -A && git commit -qm settle3
FP=$(fingerprint pkg-a)

cache_hit "demo" "$FP" && not_ok "empty cache does not hit" || ok "empty cache does not hit"

cache_store "demo" "$FP"
cache_hit "demo" "$FP" && ok "stored entry hits" || not_ok "stored entry hits"

echo 'export const a = 11' >pkg-a/src/index.ts
cache_hit "demo" "$(fingerprint pkg-a)" && not_ok "entry misses after an edit" || ok "entry misses after an edit"

cache_store "demo" "$(fingerprint pkg-a)"
assert_eq "storing supersedes the old entry" "$(find "$VOLLEYKIT_CACHE_DIR" -name 'demo.*' | wc -l)" "1"

VOLLEYKIT_NO_CACHE=1 cache_hit "demo" "$(fingerprint pkg-a)" &&
  not_ok "VOLLEYKIT_NO_CACHE=1 forces a miss" || ok "VOLLEYKIT_NO_CACHE=1 forces a miss"

cache_drop "demo"
cache_hit "demo" "$(fingerprint pkg-a)" && not_ok "cache_drop removes the entry" || ok "cache_drop removes the entry"

cache_store "demo" "$(fingerprint pkg-a)"
cache_clear
[ -d "$VOLLEYKIT_CACHE_DIR" ] && not_ok "cache_clear removes the directory" || ok "cache_clear removes the directory"
# --- row count ------------------------------------------------------------------
#
# See validate.test.sh: the per-block counts cannot see their own block being
# deleted, so the total is pinned outside all of them.
#
# A plain literal is right here, unlike there: every data-driven loop in this
# file reads an array built in this file, so nothing outside it can move the
# count. `+ 1` is this row counting itself.
assert_eq "the suite ran every row it defines" "$((PASS + FAIL + 1))" 35

# --- result -------------------------------------------------------------------

report
