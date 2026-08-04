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

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB="$HERE/validation-lib.sh"
HOOK="$HERE/../.claude/hooks/pre-git-commit.sh"

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
  # Must return 0: the `cond && not_ok X || ok X` call sites would otherwise run
  # both branches when this returns non-zero, counting one result twice.
  return 0
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

# --- commit-hook dispatch predicate -------------------------------------------
#
# The hook decides whether a Bash command is a `git commit`. Getting this wrong
# in the permissive direction costs one re-run; getting it wrong in the strict
# direction is an unvalidated commit, so every shape that reaches a commit must
# be listed here.

# Mirrors the predicate in pre-git-commit.sh. Kept in sync by asserting the
# regex line below is present verbatim in the hook.
gates() {
  local COMMAND=$1
  local GIT_OPT='(-[Cc][[:space:]]+[^[:space:]]+|--(git-dir|work-tree|namespace|exec-path)[=[:space:]][^[:space:]]+|-[^[:space:]]+)'
  [[ $COMMAND =~ (^|[^[:alnum:]_.-])git([[:space:]]+$GIT_OPT)*[[:space:]]+commit([^[:alnum:]_-]|$) ]]
}

assert_gated() {
  if gates "$2"; then ok "gates: $1"; else not_ok "gates: $1" "$2"; fi
}
assert_not_gated() {
  if gates "$2"; then not_ok "passes through: $1" "$2"; else ok "passes through: $1"; fi
}

C="com""mit"
assert_gated "plain" "git $C -m x"
assert_gated "after &&" "git add -A && git $C -m x"
assert_gated "after ;" "git add -A; git $C -m x"
assert_gated "after newline" "$(printf 'git add -A\ngit %s -m x' "$C")"
assert_gated "after cd + newline" "$(printf 'cd packages/web\ngit %s -m x' "$C")"
assert_gated "in a subshell" "(git $C -m x)"
assert_gated "inside if/then" "if true; then git $C -m x; fi"
assert_gated "env-var prefix" "GIT_EDITOR=true git $C"
assert_gated "-C with a path" "git -C /repo $C -m x"
assert_gated "-c with a config" "git -c user.name=x $C -m y"
assert_gated "--git-dir=" "git --git-dir=/r/.git $C -m x"
assert_gated "--amend" "git $C --amend --no-edit"
assert_gated "heredoc body" "$(printf 'git %s -F - <<EOF\nmsg\nEOF' "$C")"

assert_not_gated "git grep commit" "git grep $C"
assert_not_gated "git log" "git log --oneline"
assert_not_gated "unrelated" "ls -la"
assert_not_gated "commitizen" "npx ${C}izen"
assert_not_gated "a path containing the word" "cat docs/git-${C}s.md"

if [ -f "$HOOK" ]; then
  if grep -qF 'COMMAND =~ (^|[^[:alnum:]_.-])git([[:space:]]+$GIT_OPT)*[[:space:]]+commit([^[:alnum:]_-]|$)' "$HOOK"; then
    ok "hook uses the predicate asserted above"
  else
    not_ok "hook uses the predicate asserted above" "pre-git-commit.sh regex drifted from this test"
  fi
else
  not_ok "hook is present" "$HOOK"
fi

# --- result -------------------------------------------------------------------

echo ""
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
