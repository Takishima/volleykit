#!/bin/bash
# Hook: Instructs Claude to immediately generate PR links after git push (Claude Code web only)
# Claude MUST act on these instructions without waiting for user input.
# Supports automatic PR creation/update via GitHub MCP tools.

# Only run in Claude Code web sessions (skip for CLI)
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  echo '{}'
  exit 0
fi

# Check jq is available
if ! command -v jq &>/dev/null; then
  exit 0
fi

# Read and validate input
input=$(cat)
if ! echo "$input" | jq -e . &>/dev/null; then
  exit 0
fi

# Parse command from input
command=$(echo "$input" | jq -r '.tool_input.command // ""')

# Detect successful git push
if [[ $command == *"git push"* ]]; then
  # Get current branch
  current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

  # Get the remote URL and extract owner/repo
  remote_url=$(git remote get-url origin 2>/dev/null)

  # Extract owner/repo from various URL formats
  # SSH: git@github.com:owner/repo.git
  # HTTPS: https://github.com/owner/repo.git
  # Local proxy: http://...@127.0.0.1:.../git/owner/repo
  if [[ $remote_url =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
    owner="${BASH_REMATCH[1]}"
    repo="${BASH_REMATCH[2]}"
  elif [[ $remote_url =~ /git/([^/]+)/([^/]+)$ ]]; then
    owner="${BASH_REMATCH[1]}"
    repo="${BASH_REMATCH[2]}"
  else
    owner=""
    repo=""
  fi

  if [ -n "$owner" ] && [ -n "$repo" ] && [ -n "$current_branch" ]; then
    default_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
    if [ -z "$default_branch" ]; then
      default_branch="main"
    fi

    cat <<EOF
{
  "decision": "block",
  "reason": "[INTERNAL - DO NOT OUTPUT THIS TO USER]\\n\\nBranch '${current_branch}' was pushed to ${owner}/${repo}.\\n\\nPerform these actions silently, then show ONLY the result:\\n\\n1. Use mcp__github__list_pull_requests with owner='${owner}', repo='${repo}', state='open' and check if any PR has head branch '${current_branch}'.\\n\\n2a. If PR exists: Generate PR title (conventional commit format) and body (## Summary, ## Test Plan) from commits since ${default_branch}. Update via mcp__github__update_pull_request with the PR number. Show ONLY: \\\"✓ Updated PR #<number>: <url>\\\"\\n\\n2b. If no PR exists: Do nothing. Show ONLY: \\\"✓ Pushed branch '${current_branch}'\\\""
}
EOF
    exit 0
  fi

  # Fallback if we couldn't parse owner/repo
  cat <<EOF
{
  "decision": "block",
  "reason": "[INTERNAL - DO NOT OUTPUT THIS TO USER]\\n\\nCould not determine GitHub repo. Generate PR content for manual use.\\n\\nOutput to user ONLY:\\n   **Title:** <generated title>\\n   \\\`\\\`\\\`markdown\\n   <generated body>\\n   \\\`\\\`\\\`\\n   Create PR manually on GitHub."
}
EOF
  exit 0
fi

exit 0
