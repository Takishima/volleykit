#!/bin/bash
# Session start hook for Architecture Claude Code Review (architecture review workflow only)
# This hook ensures architecture review guidelines are loaded before reviewing PRs

# Only run when CLAUDE_CODE_REVIEW_TYPE=architecture (set by claude-code-review-architecture.yml)
if [ "${CLAUDE_CODE_REVIEW_TYPE:-}" != "architecture" ]; then
  exit 0
fi

# Synchronous execution - block until complete
cat <<'EOF'
=== Architecture Code Review Session ===

MANDATORY: You MUST read these files FIRST before reviewing any code:

1. docs/REVIEW_CHECKLIST_ARCHITECTURE.md - Architecture review criteria (READ THIS FIRST)
2. docs/CODE_PATTERNS.md - Code patterns and module structure

These files define what architectural violations to flag. Do not proceed with
the review until you have read and understood the checklist.

IMPORTANT: You are the ARCHITECTURE reviewer. Focus ONLY on:
- Monorepo boundary violations
- Feature module structure
- Separation of concerns (hooks, components, services, utils)
- Platform adapter pattern compliance
- State management boundaries
- Circular dependencies and layer violations

Do NOT review: naming conventions, accessibility, i18n, security — those are
handled by the primary Code Review workflow.

After reading, check for previous review comments on this PR to ensure
consistency (don't repeat issues, acknowledge fixes).
===============================
EOF
