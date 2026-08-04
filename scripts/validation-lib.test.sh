#!/usr/bin/env bash
# Tests for scripts/validation-lib.sh and .claude/hooks/pre-git-commit.sh.
#
#   scripts/validation-lib.test.sh
#
# Two halves. The first asserts the invariants the check cache rests on: if
# fingerprint() gets any of them wrong, the commit gate either approves
# unvalidated code or throws away results it should have kept. The second drives
# the commit hook — its predicate, and end to end through its JSON input, which
# is where several bypasses lived.
#
# Everything runs against a scratch repository in a temp directory and never
# writes to the working repo. The lib-missing rows exercise a COPY of the hook
# rather than moving the real predicate aside: the EXIT trap deletes $SCRATCH,
# and the other shell checks run in the same parallel wave.

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_GUARD="$(cd "$HERE/.." && pwd)"
LIB="$HERE/validation-lib.sh"
# shellcheck source=./test-lib.sh
source "$HERE/test-lib.sh" || exit 1
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
require_scratch "$SCRATCH" "$(basename "$0")" "$REPO_GUARD" || exit 1
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

# One definition, sourced from the same file the hook sources. An earlier
# version copied the predicate here and used a `grep` guard to detect drift;
# the guard pinned only the match expression, so mutating the option list in
# the hook left this suite green while the gate was bypassable.
# shellcheck source=../.claude/hooks/lib/is-git-commit.sh
source "$HERE/../.claude/hooks/lib/is-git-commit.sh"

# Every gated fixture is asserted twice: against the predicate, and end to end
# through the hook. The hook applies might_be_git_commit to the raw JSON first,
# so a table that stopped at the predicate could not see that pre-filter
# narrowing past it — which is how a \u-escaped payload walked through.
assert_gated() {
  if is_git_commit "$2"; then ok "gates: $1"; else not_ok "gates: $1" "$2"; fi
  GATED_FIXTURES+=("$1"$'\x01'"$2")
}
assert_not_gated() {
  if is_git_commit "$2"; then not_ok "passes through: $1" "$2"; else ok "passes through: $1"; fi
  PASSTHROUGH_FIXTURES+=("$1"$'\x01'"$2")
}

declare -a GATED_FIXTURES=()
declare -a PASSTHROUGH_FIXTURES=()

# The word is spliced so this file's own fixtures do not trip the hook when the
# test itself is edited and committed.
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
assert_gated "absolute path" "/usr/bin/git $C -m x"
assert_gated "tab separated" "$(printf 'git\t%s -m x' "$C")"
assert_gated "backslash continuation" "$(printf 'git \\\n  %s -m x' "$C")"

assert_gated "-C quoted path with space" "git -C \"/path with space\" $C"
assert_gated "-c quoted value with space" "git -c user.name=\"A B\" $C"
assert_gated "--git-dir quoted" "git --git-dir=\"/p q/.git\" $C"
assert_gated "-C single-quoted" "git -C '/p q' $C -m x"
assert_gated "several options then commit" "git -C /r -c a=b $C"

assert_gated "double-quoted subcommand" "git \"$C\" -m x"
assert_gated "single-quoted subcommand" "git '$C' -m x"
assert_gated "option then quoted subcommand" "git -c a=b \"$C\""

assert_not_gated "git grep commit" "git grep $C"
assert_not_gated "git log" "git log --oneline"
assert_not_gated "unrelated" "ls -la"
assert_not_gated "commitizen" "npx ${C}izen"
assert_not_gated "a path containing the word" "cat docs/git-${C}s.md"

# --- commit-hook end to end -----------------------------------------------------
#
# Everything above tables is_git_commit. The hook also has to extract the command
# from its JSON input and decide what to do when it cannot — the part that had no
# row, and the part where two defects shipped: a grep fallback that mangled
# multi-line commands, and a jq requirement placed ahead of the is-this-a-commit
# question, which blocked every Bash call in the session.

hook_decision() {
  printf '%s' "$1" | PATH="${2:-$PATH}" CLAUDE_CODE_REMOTE=true bash "${3:-$HOOK}" 2>/dev/null |
    sed -n 's/.*"decision"[[:space:]]*:[[:space:]]*"\([a-z]*\)".*/\1/p'
}

assert_decision() {
  local label=$1 want=$2 got
  got=$(hook_decision "$3" "${4:-$PATH}" "${5:-$HOOK}")
  if [ "$got" = "$want" ]; then ok "hook: $label"; else not_ok "hook: $label" "expected $want, got '${got:-<none>}'"; fi
}

# json_escape turns a fixture into a JSON string body the way a real caller would.
# Preflighted at top level: every call site is $(json_escape ...), and an `exit`
# there ends only that subshell — a jq-less run reported 31 rows as wrong
# decisions instead of one missing tool.
if ! command -v jq >/dev/null 2>&1; then
  echo "validation-lib.test.sh: jq is required to build hook payloads" >&2
  exit 1
fi

json_escape() {
  printf '%s' "$1" | jq -Rs . | sed 's/^"//;s/"$//'
}

for fixture in "${GATED_FIXTURES[@]}"; do
  label=${fixture%%$'\x01'*}
  cmd=${fixture#*$'\x01'}
  payload=$(printf '{"tool_input":{"command":"%s"}}' "$(json_escape "$cmd")")
  assert_decision "reaches the predicate: $label" "block" "$payload"
done

# The mirror: without this, the hook could stop calling is_git_commit entirely
# and every one of these commands would be blocked with the suite still green.
for fixture in "${PASSTHROUGH_FIXTURES[@]}"; do
  label=${fixture%%$'\x01'*}
  cmd=${fixture#*$'\x01'}
  payload=$(printf '{"tool_input":{"command":"%s"}}' "$(json_escape "$cmd")")
  assert_decision "still passes through the hook: $label" "approve" "$payload"
done

assert_decision "an unrelated command is approved" "approve" '{"tool_input":{"command":"ls -la"}}'
assert_decision "malformed JSON is not approved" "block" \
  "$(printf '{"tool_input":{"command":"git %s' "$C")"

# A \u escape decodes to anything, so the raw-input pre-filter must not treat
# its absence of the literal word as "not a commit".
assert_decision "a unicode-escaped subcommand is not approved" "block" \
  '{"tool_input":{"command":"git \u0063ommit -m x"}}'
assert_decision "a fully escaped subcommand is not approved" "block" \
  '{"tool_input":{"command":"git \u0063\u006f\u006d\u006d\u0069\u0074 -m x"}}'
assert_decision "a \\U-escaped subcommand is not approved" "block" \
  '{"tool_input":{"command":"git \U0000063ommit -m x"}}'

# Without jq the hook cannot read the command — but it is registered on every
# Bash call, so it must still let through what cannot be one. Blocking those
# blocks the remedies the message itself names.
NOJQ_BIN="$SCRATCH/nojq"
mkdir -p "$NOJQ_BIN"
for b in bash sh cat sed grep git head sort find tr xargs dirname; do
  bp=$(command -v "$b" 2>/dev/null) && ln -sf "$bp" "$NOJQ_BIN/$b"
done
assert_decision "without jq, an unrelated command still runs" "approve" \
  '{"tool_input":{"command":"ls -la"}}' "$NOJQ_BIN"
assert_decision "without jq, a possible commit is blocked" "block" \
  "$(printf '{"tool_input":{"command":"git %s -m x"}}' "$C")" "$NOJQ_BIN"

# The lib can go missing. That must not take the session's shell with it: the
# hook runs on every Bash call, and the message's own remedy needs one.
#
# Exercised against a COPY with no sibling lib/ — the hook resolves HOOK_DIR from
# BASH_SOURCE, so the branch fires without touching the working repo. Moving the
# real lib aside would leave a tracked file inside $SCRATCH, which the EXIT trap
# deletes on Ctrl-C, and would race the other shell checks in the same wave.
NOLIB_HOOK="$SCRATCH/nolib/pre-git-commit.sh"
mkdir -p "$SCRATCH/nolib"
cp "$HOOK" "$NOLIB_HOOK"

assert_decision "with the predicate lib missing, an unrelated command still runs" \
  "approve" '{"tool_input":{"command":"ls -la"}}' "$PATH" "$NOLIB_HOOK"

# The fallback is a second copy of might_be_git_commit — unavoidable, since on
# that path the definition is what failed to load. Nothing else can hold it to
# the original, so it is pinned in BOTH directions.
#
# Driving the whole gated table through it would add nothing: every fixture
# carries the literal subcommand, so a narrow and a wide fallback classify them
# identically. What distinguishes them is an escaped payload.
assert_decision "with the lib missing, a literal commit is still gated" "block" \
  "$(printf '{"tool_input":{"command":"git %s -m x"}}' "$C")" "$PATH" "$NOLIB_HOOK"
assert_decision "with the lib missing, a \\u-escaped subcommand is still gated" "block" \
  '{"tool_input":{"command":"git \\u0063ommit -m x"}}' "$PATH" "$NOLIB_HOOK"
assert_decision "with the lib missing, a \\U-escaped subcommand is still gated" "block" \
  '{"tool_input":{"command":"git \\U0000063ommit -m x"}}' "$PATH" "$NOLIB_HOOK"

# The other direction, which has actually shipped broken: widening the fallback
# blocks the whole session. `git grep <subcommand>` and friends are deliberately
# absent — the fallback is a superset and gates them by design, and so is any
# path containing the word, which is why the block message points at non-Bash
# tools rather than at a shell command.
while IFS= read -r cmd; do
  [ -z "$cmd" ] && continue
  payload=$(printf '{"tool_input":{"command":"%s"}}' "$(json_escape "$cmd")")
  assert_decision "with the lib missing, still runnable: $cmd" "approve" "$payload" "$PATH" "$NOLIB_HOOK"
done <<'RECOVERY'
ls -la
git status
git log --oneline
git diff --stat
RECOVERY

# --- commit-hook registration -------------------------------------------------
#
# The hook only runs because .claude/settings.json registers it. That file is a
# gate input like any other; without the entry, validation is advisory.

SETTINGS="$HERE/../.claude/settings.json"
if [ -f "$SETTINGS" ]; then
  if grep -q 'pre-git-commit\.sh' "$SETTINGS"; then
    ok "settings.json registers the commit hook"
  else
    not_ok "settings.json registers the commit hook" "no reference to pre-git-commit.sh"
  fi
  if [ "$(jq -r '[.hooks.PreToolUse[]?.hooks[]?.command // ""] | map(select(test("pre-git-commit"))) | length' "$SETTINGS" 2>/dev/null)" -ge 1 ]; then
    ok "the registration is a PreToolUse hook"
  else
    not_ok "the registration is a PreToolUse hook" "not found under .hooks.PreToolUse"
  fi
else
  not_ok "settings.json is present" "$SETTINGS"
fi

if [ -x "$HOOK" ]; then
  ok "the hook is executable"
else
  not_ok "the hook is executable" "chmod +x .claude/hooks/pre-git-commit.sh"
fi

# --- result -------------------------------------------------------------------

echo ""
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
