#!/bin/bash
# Session start hook for Claude Code Review (code review workflow only)
# This hook ensures review guidelines are loaded before reviewing PRs

# Only run when CLAUDE_CODE_REVIEW=true (set by claude-code-review.yml)
# This prevents the hook from running for @claude implementation requests
if [ "${CLAUDE_CODE_REVIEW:-}" != "true" ]; then
  exit 0
fi

# Synchronous execution - block until complete
cat << 'EOF'
=== Claude Code Review Session ===

MANDATORY: You MUST read these files FIRST before reviewing any code:

1. docs/REVIEW_CHECKLIST.md - Primary review criteria (READ THIS FIRST)
2. docs/SECURITY_CHECKLIST.md - Security review requirements
3. docs/CODE_PATTERNS.md - Anti-patterns with examples

These files define what violations to flag. Do not proceed with the review
until you have read and understood the checklist.

After reading, check for previous review comments on this PR to ensure
consistency (don't repeat issues, acknowledge fixes).
===============================
EOF
