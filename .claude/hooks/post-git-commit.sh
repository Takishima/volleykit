#!/bin/bash
# Post-git-commit hook for Claude Code (web only)
# Cleans up the validation marker after a successful commit.

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

INPUT=$(cat)

# Extract command
if command -v jq &>/dev/null; then
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || echo "")
else
  COMMAND=$(echo "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
fi

# Only act on git commit commands
if [[ $COMMAND != *"git commit"* ]] && [[ $COMMAND != *"&&"*"commit"* ]]; then
  exit 0
fi

# Check if the tool succeeded (PostToolUse provides tool_result)
if command -v jq &>/dev/null; then
  EXIT_CODE=$(echo "$INPUT" | jq -r '.tool_result.exit_code // .tool_result.exitCode // "1"' 2>/dev/null || echo "1")
else
  EXIT_CODE=$(echo "$INPUT" | grep -o '"exit_code"[[:space:]]*:[[:space:]]*[0-9]*' | grep -o '[0-9]*$' || echo "1")
  [ -z "$EXIT_CODE" ] && EXIT_CODE="1"
fi

if [[ $EXIT_CODE == "0" ]]; then
  rm -rf /tmp/claude-validation-marker
fi
