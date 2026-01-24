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
# CONFIGURATION - Edit these to change skip behavior
# =============================================================================

# File patterns that require validation (regex for grep -E)
SOURCE_PATTERNS='\.(ts|tsx|js|jsx)$'

# File patterns that can be skipped (validation not needed)
SKIP_PATTERNS='\.(md|txt|json|yaml|yml|sh|css|svg|png|jpg|jpeg|gif|ico)$'

# Files that always trigger validation regardless of SKIP_PATTERNS
FORCE_VALIDATE_PATTERNS='(package\.json|tsconfig\.json|vite\.config|eslint\.config)'

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

allow() {
    echo '{"decision": "allow"}'
    exit 0
}

block() {
    local reason="$1"
    # Escape for JSON
    reason=$(echo "$reason" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
    cat << EOF
{"decision": "block", "reason": "$reason"}
EOF
    exit 0
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

# =============================================================================
# MAIN LOGIC
# =============================================================================

# Read the tool input from stdin
INPUT=$(cat)

# Extract the command being run
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

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

# --- Check if validation is already running or completed ---
if [[ -f "$VALIDATION_PID_FILE" ]]; then
    PID=$(cat "$VALIDATION_PID_FILE")

    if kill -0 "$PID" 2>/dev/null; then
        # Still running - show elapsed time
        START_TIME=$(cat "$VALIDATION_START_FILE" 2>/dev/null || echo "0")
        NOW=$(date +%s)
        ELAPSED=$((NOW - START_TIME))
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

    # Extract summary (key failure indicators)
    SUMMARY=$(echo "$OUTPUT" | grep -E "(✗|failed|error|Error)" | head -10)
    if [[ -z "$SUMMARY" ]]; then
        SUMMARY=$(echo "$OUTPUT" | tail -20)
    fi

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
    CLAUDE_CODE_REMOTE=true VALIDATION_STEPS_DIR="$VALIDATION_STEPS_DIR" \
        "$VALIDATION_SCRIPT" > "$VALIDATION_OUTPUT_FILE" 2>&1
    echo $? > "$VALIDATION_RESULT_FILE"
) &

# Save the background process PID
echo $! > "$VALIDATION_PID_FILE"

block "Validation started in background. Running format, lint, knip, test in PARALLEL, then build.

Please retry your commit in ~20-30 seconds. The hook will report results on retry."
