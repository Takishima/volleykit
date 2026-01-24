#!/bin/bash
# Pre-git-commit hook for Claude Code
# Runs validation (format, lint, knip, test, build) before allowing commits
#
# The validation script runs checks in PARALLEL for speed:
#   - format, lint, knip, test run concurrently
#   - build runs after if all parallel checks pass

# Read the tool input from stdin
INPUT=$(cat)

# Extract the command being run
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Early exit for non-commit commands (avoids unnecessary processing)
if [[ "$COMMAND" != *"git commit"* ]] && [[ "$COMMAND" != *"git add"*"&&"*"commit"* ]]; then
    echo '{"decision": "allow"}'
    exit 0
fi

# --- This is a git commit command ---

# Check if validation docs were read this session (first-commit gate)
SESSION_MARKER="/tmp/.claude-validation-read"
if [[ ! -f "$SESSION_MARKER" ]]; then
    cat << 'EOF'
{
  "decision": "block",
  "reason": "STOP: Before your first commit, you MUST read docs/VALIDATION.md to understand the validation process. The pre-commit hook runs: format → lint → knip → test → build. After reading the file, retry your commit."
}
EOF
    exit 0
fi

# Determine project root directory
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
VALIDATION_SCRIPT="$PROJECT_DIR/scripts/pre-commit-validate.sh"

# Check if validation script exists
if [[ ! -x "$VALIDATION_SCRIPT" ]]; then
    echo '{"decision": "allow"}'
    exit 0
fi

# Run validation script with CLAUDE_CODE_REMOTE=true to enable it
# The script runs format, lint, knip, test in PARALLEL, then build sequentially
VALIDATION_OUTPUT=$(CLAUDE_CODE_REMOTE=true "$VALIDATION_SCRIPT" 2>&1)
VALIDATION_EXIT=$?

if [[ $VALIDATION_EXIT -ne 0 ]]; then
    # Escape the output for JSON (handle newlines and quotes)
    ESCAPED_OUTPUT=$(echo "$VALIDATION_OUTPUT" | jq -Rs '.')

    # Block commit with validation errors
    cat << EOF
{
  "decision": "block",
  "reason": "Validation failed. Fix the issues below and retry:\n\n$VALIDATION_OUTPUT"
}
EOF
    exit 0
fi

# All checks passed - allow the commit
echo '{"decision": "allow"}'
