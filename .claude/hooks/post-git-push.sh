#!/bin/bash
# Hook: Generate PR description after git push (Claude Code web only)

set -e

# Only run in Claude Code web sessions
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

# Parse input from Claude Code
input=$(cat)
tool_input=$(echo "$input" | jq -r '.tool_input // {}')
command=$(echo "$tool_input" | jq -r '.command // ""')

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
