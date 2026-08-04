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

if command -v jq &>/dev/null; then
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
else
  COMMAND=$(echo "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
fi

# The predicate lives in lib/ so this hook and the test suite share one
# definition rather than two that must be kept in agreement.
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib/is-git-commit.sh
source "$HOOK_DIR/lib/is-git-commit.sh" || allow

is_git_commit "$COMMAND" || allow

ROOT_DIR=$(git rev-parse --show-toplevel 2>/dev/null)
[ -z "$ROOT_DIR" ] && allow

# stderr is kept out of $RECORDS on purpose: anything the gate writes there is a
# crash, not a record, and would otherwise be rendered as outstanding work.
RECORDS=$("$ROOT_DIR/scripts/validate.sh" --gate 2>/dev/null)
STATUS=$?

# 0 = gate open. 1 = work outstanding. Anything else = the gate itself broke.
if [ $STATUS -eq 0 ]; then
  allow
fi

if [ $STATUS -ne 1 ] || [ -z "$RECORDS" ]; then
  ERR=$("$ROOT_DIR/scripts/validate.sh" --gate 2>&1 >/dev/null)
  block "Validation gate could not run (scripts/validate.sh exited $STATUS).

${ERR:-(no error output)}

Run it manually: scripts/validate.sh"
fi

# stdout is "<kind> <value>" per line, kind being `check` or `unstaged`.
CHECKS=""
UNSTAGED=""
while IFS=' ' read -r kind value; do
  case "$kind" in
    check) CHECKS="$CHECKS  - $value"$'\n' ;;
    unstaged) UNSTAGED="$UNSTAGED  - $value"$'\n' ;;
  esac
done <<<"$RECORDS"

REASON=""
if [ -n "$CHECKS" ]; then
  REASON="Not yet validated:

${CHECKS}
Run \`scripts/validate.sh\` (anything already green is skipped), then retry."
fi

if [ -n "$UNSTAGED" ]; then
  [ -n "$REASON" ] && REASON="$REASON

"
  REASON="${REASON}Staged content differs from the worktree, so the commit would record something unvalidated:

${UNSTAGED}
Run \`git add -A\`, then retry. Nothing re-runs."
fi

block "$REASON"
