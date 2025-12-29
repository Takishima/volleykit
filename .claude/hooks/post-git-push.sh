#!/bin/bash
# Hook: Generate PR description after git push (Claude Code web only)

# Only run in Claude Code web sessions
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

# Check jq is available
if ! command -v jq &> /dev/null; then
  exit 0
fi

# Read and validate input
input=$(cat)
if ! echo "$input" | jq -e . &> /dev/null; then
  exit 0
fi

# Parse command from input
command=$(echo "$input" | jq -r '.tool_input.command // ""')

# Detect successful git push
if [[ "$command" == *"git push"* ]]; then
  cat <<'EOF'
{
  "decision": "block",
  "reason": "Code pushed successfully. Generate a PR description for copy-paste into GitHub.\n\nIMPORTANT: Use 4-space indented code blocks (not triple backticks) to avoid markdown rendering issues in the Claude mobile app.\n\nFormat:\n\n## Summary\n\n- [bullet points]\n\n## Changes\n\n- [list of changes]\n\n## Test Plan\n\n- [ ] [checklist items]"
}
EOF
  exit 0
fi

exit 0
