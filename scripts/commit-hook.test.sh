#!/usr/bin/env bash
# Tests for .claude/hooks/pre-git-commit.sh.
#
#   scripts/commit-hook.test.sh
#
# The hook decides whether every Bash command in a Claude Code web session is a
# commit, and whether that commit proceeds. Three layers, all covered here: the
# predicate that classifies a command, the JSON extraction around it, and the
# fail-closed branches for a missing jq or a missing predicate library.
#
# Split out of validation-lib.test.sh, whose name described only the other half
# of what it held.
#
# Runs against a scratch repository in a temp directory and never writes to the
# working repo. The lib-missing rows exercise a COPY of the hook rather than
# moving the real predicate aside: the EXIT trap deletes $SCRATCH, and the other
# shell checks run in the same parallel wave.

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
# shellcheck source=./test-lib.sh
source "$HERE/test-lib.sh" || exit 1
HOOK="$HERE/../.claude/hooks/pre-git-commit.sh"

SCRATCH=$(mktemp -d)
require_scratch "$SCRATCH" "$(basename "$0")" "$REPO" || exit 1
trap 'rm -rf "$SCRATCH"' EXIT

# The hook is driven with cwd $SCRATCH, which has no scripts/validate.sh — so
# every gated payload lands on the gate-could-not-run branch. That is the
# deterministic oracle for "passed both predicates and reached the gate
# invocation"; running from the real repo would make the rows depend on whether
# the repo's own gate happens to be open.
cd "$SCRATCH" || exit 1
git init -q .
git config user.email test@example.com
git config user.name Test
echo '{}' >package.json
git add -A
git commit -qm init

echo "test-lib.sh"

# Both suites are protected by the guard, so both assert it. Counted at the call
# site: the rows are defined in the same file as the guards they cover.
GUARD_BEFORE=$((PASS + FAIL))
assert_guard_rows "$SCRATCH" "$REPO"
assert_eq "the guard block contributed every row it defines" \
  "$((PASS + FAIL - GUARD_BEFORE))" "$GUARD_ROW_COUNT"

echo "pre-git-commit.sh"

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

hook_output() {
  printf '%s' "$1" | PATH="${2:-$PATH}" CLAUDE_CODE_REMOTE=true bash "${3:-$HOOK}" 2>/dev/null
}

# $6, when given, is a substring the block reason must contain.
#
# A bare "block" is a weak oracle: the hook blocks for several distinct reasons,
# and these rows run with cwd $SCRATCH, which has no scripts/validate.sh — so
# every one of them lands on the gate-could-not-run branch. That branch is the
# right oracle for "the payload passed both predicates and reached the gate
# invocation", but only if the row says so; otherwise any hook that blocks after
# the pre-filter satisfies all of them.
assert_decision() {
  local label=$1 want=$2 payload=$3 path=${4:-$PATH} hook=${5:-$HOOK} want_reason=${6-}
  local out got
  out=$(hook_output "$payload" "$path" "$hook")
  got=$(printf '%s' "$out" | sed -n 's/.*"decision"[[:space:]]*:[[:space:]]*"\([a-z]*\)".*/\1/p')
  if [ "$got" != "$want" ]; then
    not_ok "hook: $label" "expected $want, got '${got:-<none>}'"
    return 0
  fi
  if [ -n "$want_reason" ]; then
    case "$out" in
      *"$want_reason"*) ;;
      *)
        not_ok "hook: $label" "blocked, but not for the stated reason: $out"
        return 0
        ;;
    esac
  fi
  ok "hook: $label"
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
  assert_decision "reaches the predicate: $label" "block" "$payload" "$PATH" "$HOOK" \
    "Validation gate could not run"
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
# --- row count ------------------------------------------------------------------
#
# See validate.test.sh: the per-block counts cannot see their own block being
# deleted, so the total is pinned outside all of them. A plain literal is right
# here — every data-driven loop reads an array built in this file. `+ 1` is this
# row counting itself.
assert_eq "the suite ran every row it defines" "$((PASS + FAIL + 1))" 85

# --- result -------------------------------------------------------------------

report
