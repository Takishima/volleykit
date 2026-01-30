#!/bin/bash
# Post-read hook for Claude Code (web only)
# Marks when validation docs have been read

# Only run in Claude Code web sessions (skip for CLI)
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  echo '{}'
  exit 0
fi

# Read the tool input from stdin
INPUT=$(cat)

# Extract the file path that was read (with jq fallback)
if command -v jq &>/dev/null; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
else
  FILE_PATH=""
fi

# Check if this is the validation docs
if [[ $FILE_PATH == *"docs/VALIDATION.md"* ]] || [[ $FILE_PATH == *"VALIDATION.md"* ]]; then
  # Create marker file
  touch /tmp/.claude-validation-read
fi

# PostToolUse hooks don't use decision - just return empty object
echo '{}'
