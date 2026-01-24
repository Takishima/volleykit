#!/bin/bash
# Pre-git-commit hook for Claude Code
# Runs validation asynchronously using a two-phase approach:
#
# Phase 1 (first attempt):
#   - Starts validation in background
#   - Returns immediately with "validation started" message
#   - Claude retries the commit
#
# Phase 2 (retry):
#   - Checks if background validation completed
#   - If still running: block with progress message
#   - If done + passed: allow commit
#   - If done + failed: block with error details
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

# --- Async validation with polling ---

# Fixed directory so retries can find the running validation
VALIDATION_DIR="/tmp/claude-precommit-validation"
VALIDATION_PID_FILE="$VALIDATION_DIR/pid"
VALIDATION_OUTPUT_FILE="$VALIDATION_DIR/output"
VALIDATION_RESULT_FILE="$VALIDATION_DIR/result"
VALIDATION_START_FILE="$VALIDATION_DIR/started"

# Check if validation is already running or completed
if [[ -f "$VALIDATION_PID_FILE" ]]; then
    PID=$(cat "$VALIDATION_PID_FILE")

    # Check if process is still running
    if kill -0 "$PID" 2>/dev/null; then
        # Still running - check how long
        START_TIME=$(cat "$VALIDATION_START_FILE" 2>/dev/null || echo "0")
        NOW=$(date +%s)
        ELAPSED=$((NOW - START_TIME))

        cat << EOF
{
  "decision": "block",
  "reason": "Validation in progress (${ELAPSED}s elapsed)... The checks run in parallel for speed. Please retry your commit in a few seconds."
}
EOF
        exit 0
    else
        # Process finished - check result
        RESULT=$(cat "$VALIDATION_RESULT_FILE" 2>/dev/null || echo "1")
        OUTPUT=$(cat "$VALIDATION_OUTPUT_FILE" 2>/dev/null || echo "No output captured")

        # Cleanup
        rm -rf "$VALIDATION_DIR"

        if [[ "$RESULT" == "0" ]]; then
            # Success - allow commit
            cat << 'EOF'
{
  "decision": "allow"
}
EOF
            exit 0
        else
            # Failed - show errors
            # Escape special characters for JSON
            ESCAPED_OUTPUT=$(echo "$OUTPUT" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
            cat << EOF
{
  "decision": "block",
  "reason": "Validation failed. Fix the issues and retry:\n\n$ESCAPED_OUTPUT"
}
EOF
            exit 0
        fi
    fi
fi

# --- No validation running - start one in background ---

mkdir -p "$VALIDATION_DIR"
echo "$(date +%s)" > "$VALIDATION_START_FILE"

# Start validation in background
(
    CLAUDE_CODE_REMOTE=true "$VALIDATION_SCRIPT" > "$VALIDATION_OUTPUT_FILE" 2>&1
    echo $? > "$VALIDATION_RESULT_FILE"
) &

# Save the background process PID
echo $! > "$VALIDATION_PID_FILE"

cat << 'EOF'
{
  "decision": "block",
  "reason": "Validation started in background. Running format, lint, knip, test in PARALLEL, then build.\n\nPlease retry your commit in ~20-30 seconds. The hook will report results on retry."
}
EOF
