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

# Only gate git commit.
if [[ $COMMAND != *"git commit"* ]]; then
  allow
fi

ROOT_DIR=$(git rev-parse --show-toplevel 2>/dev/null)
[ -z "$ROOT_DIR" ] && allow

# stderr is kept out of $MISSING on purpose: anything the gate writes there is a
# crash, not a check name, and would otherwise be rendered as a missing check.
MISSING=$("$ROOT_DIR/scripts/validate.sh" --gate 2>/dev/null)
STATUS=$?

# 0 = gate open. 1 = work outstanding. Anything else = the gate itself broke.
if [ $STATUS -eq 0 ]; then
  allow
fi

if [ $STATUS -ne 1 ] || [ -z "$MISSING" ]; then
  ERR=$("$ROOT_DIR/scripts/validate.sh" --gate 2>&1 >/dev/null)
  block "Validation gate could not run (scripts/validate.sh exited $STATUS).

${ERR:-(no error output)}

Run it manually: scripts/validate.sh"
fi

block "Validation is not complete for the current changes:

$(echo "$MISSING" | sed 's/^/  /')

Run validation — results stream as each check finishes, and anything already green is skipped:

scripts/validate.sh

Then retry the commit."
