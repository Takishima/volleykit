#!/usr/bin/env bash
# Tests for scripts/validation-lib.sh.
#
#   scripts/validation-lib.test.sh
#
# Runs against a scratch repository in a temp directory — it never touches the
# working repo. These assert the invariants the check cache rests on: if
# fingerprint() gets any of them wrong, the commit gate either approves
# unvalidated code or throws away results it should have kept.

set -uo pipefail

LIB="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/validation-lib.sh"

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
}

assert_eq() {
  if [ "$2" = "$3" ]; then ok "$1"; else not_ok "$1" "expected equal, got '$2' vs '$3'"; fi
}

assert_ne() {
  if [ "$2" != "$3" ]; then ok "$1"; else not_ok "$1" "expected different, both '$2'"; fi
}

# --- scratch repository -------------------------------------------------------

SCRATCH=$(mktemp -d)
trap 'rm -rf "$SCRATCH"' EXIT

cd "$SCRATCH"
git init -q .
git config user.email test@example.com
git config user.name Test

mkdir -p pkg-a/src pkg-b/src
echo 'export const a = 1' >pkg-a/src/index.ts
echo 'export const b = 1' >pkg-b/src/index.ts
echo '{}' >package.json
git add -A
git commit -qm init

export VOLLEYKIT_CACHE_DIR="$SCRATCH/.cache"
# shellcheck source=./validation-lib.sh
source "$LIB" || exit 1

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

git add -A && git commit -qm settle2
assert_eq "clean tree -> no changed files" "$(changed_files)" ""

echo 'export const a = 9' >pkg-a/src/index.ts
assert_eq "unstaged edit is detected" "$(changed_files)" "pkg-a/src/index.ts"

git add pkg-a/src/index.ts
assert_eq "staged edit is still detected" "$(changed_files)" "pkg-a/src/index.ts"

echo 'x' >pkg-b/src/new.ts
assert_eq "untracked file is detected" "$(changed_files | tr '\n' ' ')" "pkg-a/src/index.ts pkg-b/src/new.ts "

assert_eq "divergence is empty once everything is staged" "$(git add -A && staged_worktree_divergence pkg-a pkg-b)" ""
echo 'export const a = 10' >pkg-a/src/index.ts
assert_eq "divergence reports a staged file edited afterwards" "$(staged_worktree_divergence pkg-a pkg-b)" "pkg-a/src/index.ts"

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

# --- result -------------------------------------------------------------------

echo ""
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
