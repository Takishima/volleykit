#!/bin/bash
# Pre-git-commit hook for Claude Code
# Ensures Claude reads validation docs before first commit in a session

# Read the tool input from stdin
INPUT=$(cat)

# Extract the command being run
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Check if this is a git commit command
if [[ "$COMMAND" == *"git commit"* ]] || [[ "$COMMAND" == *"git add"*"&&"*"commit"* ]]; then
    # Marker file in project directory (persists for session)
    SESSION_MARKER="/tmp/.claude-validation-read"

    # Check if validation docs were read this session
    if [[ ! -f "$SESSION_MARKER" ]]; then
        # First commit attempt - block and request reading validation docs
        cat << 'EOF'
{
  "decision": "block",
  "reason": "STOP: Before your first commit, you MUST read docs/VALIDATION.md to understand the validation process. The pre-commit hook runs: format → lint → knip → test → build. After reading the file, retry your commit."
}
EOF
        exit 0
    fi
fi

# Allow the command
echo '{"decision": "allow"}'
