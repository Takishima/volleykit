#!/bin/bash
# Pre-git-commit hook for Claude Code (web only)
#
# Lightweight gate: checks that validation was run (and passed) for the
# current set of staged files. The actual validation runs as a direct
# Bash command (`scripts/pre-commit-validate.sh`) so Claude gets
# streaming output in real-time — no more block-retry-block cycles.
#
# Flow:
#   1. Claude runs: CLAUDE_CODE_REMOTE=true scripts/pre-commit-validate.sh
#      → Gets streaming output as each check passes/fails
#      → Script writes success marker on pass
#   2. Claude runs: git commit -m "..."
#      → This hook checks marker is fresh + matches staged files → instant approve
#   3. If Claude skips step 1 → hook blocks with instructions

# Only run in Claude Code web sessions (skip for CLI)
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  echo '{"decision": "approve"}'
  exit 0
fi

set -euo pipefail

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

allow() {
  echo '{"decision": "approve"}'
  exit 0
}

block() {
  local reason="$1"
  reason=$(printf '%s' "$reason" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
  printf '{"decision": "block", "reason": "%s"}\n' "$reason"
  exit 0
}

# Extract command from JSON input with jq fallback
extract_command() {
  local input="$1"
  if command -v jq &>/dev/null; then
    echo "$input" | jq -r '.tool_input.command // empty' 2>/dev/null || echo ""
  else
    echo "$input" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo ""
  fi
}

# =============================================================================
# CONFIGURATION
# =============================================================================

# File patterns that require validation (regex for grep -E)
SOURCE_PATTERNS='\.(ts|tsx|js|jsx|astro)$'

# Files that always trigger validation regardless
FORCE_VALIDATE_PATTERNS='(package\.json|tsconfig\.json|vite\.config|eslint\.config)'

# Max age of validation marker (seconds) before it's considered stale
MARKER_MAX_AGE_S=120

# =============================================================================
# MAIN LOGIC
# =============================================================================

INPUT=$(cat)
COMMAND=$(extract_command "$INPUT")

# --- Gate 1: Only process git commit commands ---
if [[ $COMMAND != *"git commit"* ]] && [[ $COMMAND != *"git add"*"&&"*"commit"* ]]; then
  allow
fi

# --- Gate 2: Ensure validation docs were read (first-commit gate) ---
SESSION_MARKER="/tmp/.claude-validation-read"
if [[ ! -f $SESSION_MARKER ]]; then
  block "STOP: Before your first commit, you MUST read docs/VALIDATION.md to understand the validation process. After reading the file, retry your commit."
fi

# --- Gate 3: Check if validation is even needed ---
STAGED_FILES=$(git diff --name-only --cached 2>/dev/null || echo "")

# No staged files
[[ -z $STAGED_FILES ]] && allow

# Docs-only changes
if ! echo "$STAGED_FILES" | grep -v '^\s*$' | grep -qvE '\.md$'; then
  allow
fi

# No source or config files
HAS_SOURCE=false
HAS_CONFIG=false
echo "$STAGED_FILES" | grep -qE "$SOURCE_PATTERNS" && HAS_SOURCE=true
echo "$STAGED_FILES" | grep -qE "$FORCE_VALIDATE_PATTERNS" && HAS_CONFIG=true

if [[ $HAS_SOURCE == false ]] && [[ $HAS_CONFIG == false ]]; then
  allow
fi

# --- Gate 4: Check validation marker ---
MARKER_DIR="/tmp/claude-validation-marker"
MARKER_HASH_FILE="$MARKER_DIR/staged-hash"
MARKER_TIME_FILE="$MARKER_DIR/timestamp"

if [[ -f $MARKER_HASH_FILE ]] && [[ -f $MARKER_TIME_FILE ]]; then
  # Check marker age
  MARKER_TIME=$(cat "$MARKER_TIME_FILE" 2>/dev/null || echo "0")
  NOW=$(date +%s)
  AGE=$((NOW - MARKER_TIME))

  if [[ $AGE -le $MARKER_MAX_AGE_S ]]; then
    # Check that staged files haven't changed since validation
    CURRENT_HASH=$(git diff --name-only --cached | sort | sha256sum | cut -d' ' -f1)
    MARKER_HASH=$(cat "$MARKER_HASH_FILE" 2>/dev/null || echo "")

    if [[ $CURRENT_HASH == "$MARKER_HASH" ]]; then
      # Validation passed for exactly these files — approve!
      # Marker expires naturally via MARKER_MAX_AGE_S (don't delete here
      # in case the commit itself fails for unrelated reasons)
      allow
    fi

    # Staged files changed since validation
    block "Staged files changed since last validation. Run validation again:

CLAUDE_CODE_REMOTE=true scripts/pre-commit-validate.sh

Then retry your commit."
  fi
fi

# --- No valid marker — tell Claude to run validation ---
block "Validation required before commit. Run:

CLAUDE_CODE_REMOTE=true scripts/pre-commit-validate.sh

This runs all checks (format, lint, typecheck, test, build) with streaming output. Once it passes, retry your commit — the hook will approve instantly."
