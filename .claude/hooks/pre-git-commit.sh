#!/bin/bash
# Pre-git-commit gate for Claude Code (web sessions only).
#
# Asks scripts/validate.sh whether every required check has a cached PASS for
# the current file contents. If yes the commit is approved instantly; if not,
# the block message names exactly which checks are missing.
#
# The cache is content-addressed, so checks Claude already ran during the work
# (e.g. `scripts/validate.sh lint`) count towards the gate and are never
# re-run. Nothing here is time-based.

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  echo '{"decision": "approve"}'
  exit 0
fi

set -uo pipefail

allow() {
  echo '{"decision": "approve"}'
  exit 0
}

block() {
  local reason="$1"
  reason=$(printf '%s' "$reason" | sed 's/\\/\\\\/g; s/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
  printf '{"decision": "block", "reason": "%s"}\n' "$reason"
  exit 0
}

INPUT=$(cat)

# The predicate lives in lib/ so this hook and the test suite share one
# definition rather than two that must be kept in agreement.
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib/is-git-commit.sh
if ! source "$HOOK_DIR/lib/is-git-commit.sh" 2>/dev/null ||
  ! declare -F is_git_commit >/dev/null || ! declare -F might_be_git_commit >/dev/null; then
  # The predicate is gone, so this is the one place a second copy is
  # unavoidable — might_be_git_commit is exactly what could not be loaded. It
  # only has to be a superset of a superset, so it stays a bare literal test.
  #
  # Without this the hook is registered on every Bash call and a missing lib
  # takes the whole session's shell with it, including the `mv` that would put
  # the file back. Anything that cannot be a commit still runs.
  case "$INPUT" in
    *commit* | *'\u'* | *'\U'*) ;;
    *) allow ;;
  esac
  block "Commit gate is broken: .claude/hooks/lib/is-git-commit.sh did not load.

Restore it (non-Bash tools still work), or remove the hook from
.claude/settings.json deliberately."
fi

# This hook is registered on every Bash call, so scope the jq requirement to
# input that could be a commit. Requiring jq ahead of this would block `ls`,
# and with it both remedies the block message names.
might_be_git_commit "$INPUT" || allow

# For anything that could be a commit, jq is required and its absence fails
# CLOSED. A grep fallback would neither unescape JSON nor tolerate an escaped
# quote, so it would hand the predicate a mangled string — extracting the
# command wrongly and then deciding is worse than declining to decide.
if ! command -v jq >/dev/null 2>&1; then
  block "Commit gate is broken: jq is not installed, and the gate cannot read
the command without it.

Install jq, or remove the hook from .claude/settings.json deliberately."
fi

# `// empty` already returns 0 for a legitimately absent key, so a non-zero
# status here is a real parse failure — the same "I do not know" the
# missing-jq branch refuses to answer approve.
if ! COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>&1); then
  block "Commit gate is broken: the hook input is not JSON jq can read.

$COMMAND"
fi

is_git_commit "$COMMAND" || allow

ROOT_DIR=$(git rev-parse --show-toplevel 2>/dev/null)
[ -z "$ROOT_DIR" ] && allow

# stderr is kept out of $RECORDS on purpose: anything the gate writes there is
# a crash, not a record, and would otherwise be rendered as outstanding work.
RECORDS=$("$ROOT_DIR/scripts/validate.sh" --gate 2>/dev/null)
STATUS=$?

# 0 = gate open. 1 = work outstanding. Anything else = the gate itself broke.
if [ $STATUS -eq 0 ]; then
  allow
fi

if [ $STATUS -ne 1 ] || [ -z "$RECORDS" ]; then
  # Re-run for stderr only: the broken-gate message (a crash, an
  # unrepresentable path, a dropped exec bit with its chmod remedy) is what
  # the block reason has to carry.
  ERR=$("$ROOT_DIR/scripts/validate.sh" --gate 2>&1 >/dev/null)
  block "Validation gate did not run (scripts/validate.sh exited $STATUS).

${ERR:-(no error output)}

Run it manually: scripts/validate.sh"
fi

# stdout is "<kind> <value>" per line, kind being `check` or `unstaged`. An
# unknown kind is collected rather than dropped: the protocol is extensible,
# and a block whose reason names nothing would leave no remedy at all.
#
# The value is split off explicitly at the first space rather than with
# `IFS=' ' read -r kind value` — read strips leading and trailing IFS
# whitespace from the last field, and a path with a leading or trailing
# space (which git lists unquoted) would have its remedy name a file that
# does not exist.
CHECKS=""
UNSTAGED=""
UNKNOWN=""
while IFS= read -r line; do
  kind=${line%% *}
  value=${line#"$kind"}
  value=${value# }
  case "$kind" in
    check) CHECKS="$CHECKS  - $value"$'\n' ;;
    unstaged) UNSTAGED="$UNSTAGED  - $value"$'\n' ;;
    *) [ -n "$kind" ] && UNKNOWN="$UNKNOWN  - $kind $value"$'\n' ;;
  esac
done <<<"$RECORDS"

REASON=""
if [ -n "$CHECKS" ]; then
  REASON="Not yet validated:

${CHECKS}
Run \`scripts/validate.sh\` (anything already green is skipped), then retry."
fi

# The staged copy of these files is not the content that was validated — the
# checks read the worktree, the commit records the index. `git add <file>`
# stages the validated content; the message deliberately does not prescribe
# `git add -A`, which for a partial (`git add -p`) stage would discard the
# intent rather than remedy anything.
if [ -n "$UNSTAGED" ]; then
  [ -n "$REASON" ] && REASON="$REASON

"
  REASON="${REASON}These files are staged with content that was never validated (the checks saw the worktree copy):

${UNSTAGED}
Stage the validated content (\`git add <file>\`), then retry. Nothing re-runs."
fi

if [ -n "$UNKNOWN" ]; then
  [ -n "$REASON" ] && REASON="$REASON

"
  REASON="${REASON}The gate reported work this hook cannot render:

${UNKNOWN}
Run \`scripts/validate.sh\` to see it directly."
fi

# Belt over the arms above: a record stream that parses to nothing at all
# (e.g. blank lines only) must still block with a remedy, never with an
# empty reason.
[ -z "$REASON" ] && REASON="The gate reported work outstanding but named nothing this hook can render.

Run \`scripts/validate.sh\` to see it directly."

block "$REASON"
