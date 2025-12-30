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
  "reason": "Code pushed successfully.\n\nYou MUST now output the updated PR description inside a markdown code block so the user can copy it.\n\nOutput format (use EXACTLY this structure):\n\nHere is the updated PR description:\n\n```\n## Summary\n\n- [bullet points summarizing what was done]\n\n## Changes\n\n- [list of specific changes made]\n\n## Test Plan\n\n- [ ] [checklist items for testing]\n```\n\nThe triple backtick code block is REQUIRED so the user can easily copy the entire PR description."
}
EOF
  exit 0
fi

exit 0
