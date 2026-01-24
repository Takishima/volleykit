#!/bin/bash
# Pre-git-commit hook for Claude Code
# Runs validation asynchronously using a two-phase approach:
#
# Phase 1 (first attempt):
#   - Checks if validation can be skipped (docs-only, etc.)
#   - If not skippable, starts validation in background
#   - Returns immediately with "validation started" message
#
# Phase 2 (retry):
#   - Checks if background validation completed
#   - If still running: block with progress message
#   - If done + passed: allow commit
#   - If done + failed: block with error details

set -euo pipefail

# =============================================================================
# CONFIGURATION - Edit these to change behavior
# =============================================================================

# File patterns that require validation (regex for grep -E)
SOURCE_PATTERNS='\.(ts|tsx|js|jsx)$'

# File patterns that can be skipped (validation not needed)
SKIP_PATTERNS='\.(md|txt|json|yaml|yml|sh|css|svg|png|jpg|jpeg|gif|ico)$'

# Files that always trigger validation regardless of SKIP_PATTERNS
FORCE_VALIDATE_PATTERNS='(package\.json|tsconfig\.json|vite\.config|eslint\.config)'

# Timeout settings (in seconds)
MAX_VALIDATION_TIME_S=300  # 5 minutes - consider validation hung after this
STALE_VALIDATION_AGE_S=600 # 10 minutes - cleanup stale validation state

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

allow() {
    echo '{"decision": "allow"}'
    exit 0
}

block() {
    local reason="$1"
    # Escape for JSON - handle backslashes, quotes, and newlines
    # Use printf '%s' to avoid echo's escape sequence interpretation
    reason=$(printf '%s' "$reason" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
    # Use printf to avoid heredoc variable expansion issues
    printf '{"decision": "block", "reason": "%s"}\n' "$reason"
    exit 0
}

# Sanitize output for safe inclusion in messages
# Removes control characters and limits length
sanitize_output() {
    local input="$1"
    local max_length="${2:-2000}"
    # Remove ANSI escape codes and control characters, limit length
    echo "$input" | sed 's/\x1b\[[0-9;]*m//g' | tr -cd '[:print:]\n' | head -c "$max_length"
}

get_staged_files() {
    git diff --name-only --cached 2>/dev/null || echo ""
}

needs_validation() {
    local staged_files="$1"

    # No files staged - skip
    [[ -z "$staged_files" ]] && return 1

    # Check for files that force validation (config files, etc.)
    if echo "$staged_files" | grep -qE "$FORCE_VALIDATE_PATTERNS"; then
        return 0
    fi

    # Check for source files that need validation
    if echo "$staged_files" | grep -qE "$SOURCE_PATTERNS"; then
        return 0
    fi

    # All files match skip patterns - no validation needed
    return 1
}

# Extract command from JSON input with jq fallback
extract_command() {
    local input="$1"
    # Try jq first, fall back to grep/sed if jq unavailable
    if command -v jq &>/dev/null; then
        echo "$input" | jq -r '.tool_input.command // empty' 2>/dev/null || echo ""
    else
        # Fallback: basic extraction without jq
        echo "$input" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo ""
    fi
}

# =============================================================================
# MAIN LOGIC
# =============================================================================

# Read the tool input from stdin
INPUT=$(cat)

# Extract the command being run (with jq fallback)
COMMAND=$(extract_command "$INPUT")

# --- Gate 1: Only process git commit commands ---
if [[ "$COMMAND" != *"git commit"* ]] && [[ "$COMMAND" != *"git add"*"&&"*"commit"* ]]; then
    allow
fi

# --- Gate 2: Ensure validation docs were read (first-commit gate) ---
SESSION_MARKER="/tmp/.claude-validation-read"
if [[ ! -f "$SESSION_MARKER" ]]; then
    block "STOP: Before your first commit, you MUST read docs/VALIDATION.md to understand the validation process. The pre-commit hook runs: format → lint → knip → test → build. After reading the file, retry your commit."
fi

# --- Gate 3: Check if validation script exists ---
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
VALIDATION_SCRIPT="$PROJECT_DIR/scripts/pre-commit-validate.sh"

if [[ ! -x "$VALIDATION_SCRIPT" ]]; then
    allow
fi

# --- Gate 4: Check if validation can be skipped based on staged files ---
STAGED_FILES=$(get_staged_files)

if ! needs_validation "$STAGED_FILES"; then
    # No source files - allow without validation
    allow
fi

# =============================================================================
# ASYNC VALIDATION WITH POLLING
# =============================================================================

# Fixed directory so retries can find the running validation
VALIDATION_DIR="/tmp/claude-precommit-validation"
VALIDATION_PID_FILE="$VALIDATION_DIR/pid"
VALIDATION_OUTPUT_FILE="$VALIDATION_DIR/output"
VALIDATION_RESULT_FILE="$VALIDATION_DIR/result"
VALIDATION_START_FILE="$VALIDATION_DIR/started"
VALIDATION_STEPS_DIR="$VALIDATION_DIR/steps"

# Failure output directory (persists for Claude to read)
FAILURE_DIR="/tmp/claude-validation-failure"

# --- Check for stale validation state and cleanup ---
if [[ -f "$VALIDATION_START_FILE" ]]; then
    START_TIME=$(cat "$VALIDATION_START_FILE" 2>/dev/null || echo "0")
    NOW=$(date +%s)
    AGE=$((NOW - START_TIME))

    if [[ $AGE -gt $STALE_VALIDATION_AGE_S ]]; then
        # Stale validation state from previous session - cleanup
        rm -rf "$VALIDATION_DIR"
    fi
fi

# --- Check if validation is already running or completed ---
if [[ -f "$VALIDATION_PID_FILE" ]]; then
    PID=$(cat "$VALIDATION_PID_FILE")
    START_TIME=$(cat "$VALIDATION_START_FILE" 2>/dev/null || echo "0")
    NOW=$(date +%s)
    ELAPSED=$((NOW - START_TIME))

    if kill -0 "$PID" 2>/dev/null; then
        # Check if validation has been running too long (hung)
        if [[ $ELAPSED -gt $MAX_VALIDATION_TIME_S ]]; then
            # Kill hung validation and cleanup
            kill "$PID" 2>/dev/null || true
            rm -rf "$VALIDATION_DIR"
            block "Validation timed out after ${MAX_VALIDATION_TIME_S}s. The process may be hung. Cleaned up stale state - please retry your commit."
        fi

        # Still running - show elapsed time
        block "Validation in progress (${ELAPSED}s elapsed)... The checks run in parallel for speed. Please retry your commit in a few seconds."
    fi

    # Process finished - check result
    RESULT=$(cat "$VALIDATION_RESULT_FILE" 2>/dev/null || echo "1")
    OUTPUT=$(cat "$VALIDATION_OUTPUT_FILE" 2>/dev/null || echo "No output captured")

    if [[ "$RESULT" == "0" ]]; then
        # Success - cleanup and allow
        rm -rf "$VALIDATION_DIR"
        allow
    fi

    # --- Validation failed - prepare error report ---
    rm -rf "$FAILURE_DIR"
    mkdir -p "$FAILURE_DIR"

    # Save full output
    echo "$OUTPUT" > "$FAILURE_DIR/full-output.log"

    # Copy per-step logs if they exist
    STEP_LOGS=""
    if [[ -d "$VALIDATION_STEPS_DIR" ]]; then
        cp -r "$VALIDATION_STEPS_DIR"/* "$FAILURE_DIR/" 2>/dev/null || true
        for log in "$FAILURE_DIR"/*.log; do
            [[ -f "$log" ]] && STEP_LOGS="$STEP_LOGS
  - $log"
        done
    fi

    # Cleanup validation dir
    rm -rf "$VALIDATION_DIR"

    # Extract and sanitize summary (key failure indicators)
    SUMMARY=$(echo "$OUTPUT" | grep -E "(✗|failed|error|Error)" | head -10)
    if [[ -z "$SUMMARY" ]]; then
        SUMMARY=$(echo "$OUTPUT" | tail -20)
    fi
    # Sanitize to prevent command injection via crafted output
    SUMMARY=$(sanitize_output "$SUMMARY" 1500)

    block "Validation failed. Summary:

$SUMMARY

Logs saved to $FAILURE_DIR/:
  - full-output.log (complete validation output)$STEP_LOGS

Use Read tool to see complete error details."
fi

# =============================================================================
# START BACKGROUND VALIDATION
# =============================================================================

mkdir -p "$VALIDATION_DIR"
mkdir -p "$VALIDATION_STEPS_DIR"
echo "$(date +%s)" > "$VALIDATION_START_FILE"

# Start validation in background
(
    # Disable errexit inside subshell to ensure exit code is captured even on failure
    set +e
    CLAUDE_CODE_REMOTE=true VALIDATION_STEPS_DIR="$VALIDATION_STEPS_DIR" \
        "$VALIDATION_SCRIPT" > "$VALIDATION_OUTPUT_FILE" 2>&1
    echo "$?" > "$VALIDATION_RESULT_FILE"
) &

# Save the background process PID
echo "$!" > "$VALIDATION_PID_FILE"

block "Validation started in background. Running format, lint, knip, test in PARALLEL, then build.

Please retry your commit in ~20-30 seconds. The hook will report results on retry."
