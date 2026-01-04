#!/bin/bash
# Hook: Instructs Claude to immediately generate PR links after git push (Claude Code web only)
# Claude MUST act on these instructions without waiting for user input.
# Supports automatic PR updates via GitHub API when GITHUB_TOKEN is available.

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
  # Get current branch
  current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

  # Get the remote URL and extract owner/repo
  remote_url=$(git remote get-url origin 2>/dev/null)

  # Extract owner/repo from various URL formats
  # SSH: git@github.com:owner/repo.git
  # HTTPS: https://github.com/owner/repo.git
  # Local proxy: http://...@127.0.0.1:.../git/owner/repo
  if [[ "$remote_url" =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
    owner="${BASH_REMATCH[1]}"
    repo="${BASH_REMATCH[2]}"
  elif [[ "$remote_url" =~ /git/([^/]+)/([^/]+)$ ]]; then
    owner="${BASH_REMATCH[1]}"
    repo="${BASH_REMATCH[2]}"
  else
    # Fallback: no GitHub URL generation if we can't parse
    owner=""
    repo=""
  fi

  if [ -n "$owner" ] && [ -n "$repo" ] && [ -n "$current_branch" ]; then
    # Check if GITHUB_TOKEN is available for API operations
    github_token="${GITHUB_TOKEN:-$GITHUB_PERSONAL_ACCESS_TOKEN}"

    # URL-encode branch name for API call (handles special characters)
    encoded_branch=$(printf '%s' "$current_branch" | jq -sRr @uri)

    # Check if PR already exists using GitHub API (works for public repos)
    pr_exists="false"
    pr_number=""
    if command -v curl &> /dev/null; then
      pr_response=$(curl -s "https://api.github.com/repos/${owner}/${repo}/pulls?head=${owner}:${encoded_branch}&state=open" 2>/dev/null)
      if [ -n "$pr_response" ] && [ "$pr_response" != "[]" ] && echo "$pr_response" | jq -e '.[0].html_url' &>/dev/null; then
        pr_exists="true"
        pr_html_url=$(echo "$pr_response" | jq -r '.[0].html_url')
        pr_number=$(echo "$pr_response" | jq -r '.[0].number')
      fi
    fi

    if [ "$pr_exists" = "true" ]; then
      if [ -n "$github_token" ]; then
        # PR exists and we have a token - update via API
        cat <<EOF
{
  "decision": "block",
  "reason": "Push successful. PR #${pr_number} exists: ${pr_html_url}\\n\\n**YOU MUST IMMEDIATELY (no user input needed):**\\n\\n1. Generate PR content based on commits on this branch:\\n   - Title: conventional commit format (feat/fix/refactor/docs/chore)\\n   - Body: ## Summary (bullet points), ## Test Plan (checklist)\\n\\n2. Update PR via API using curl with jq for proper JSON escaping:\\n   jq -n --arg title \"<title>\" --arg body \"<body>\" '{title: \\\$title, body: \\\$body}' | \\\\\\n   curl -X PATCH \"https://api.github.com/repos/${owner}/${repo}/pulls/${pr_number}\" \\\\\\n     -H \"Authorization: token \\\$GITHUB_TOKEN\" \\\\\\n     -H \"Accept: application/vnd.github.v3+json\" \\\\\\n     -d @-\\n\\n3. Report result to user:\\n   - On success: \\\"✓ Updated PR #${pr_number}: ${pr_html_url}\\\"\\n   - On failure: \\\"✗ Failed to update PR: <error>\\\"\\n\\nDO THIS NOW - do not ask the user, do not wait for confirmation."
}
EOF
        exit 0
      else
        # PR exists but no token - output description for manual copy
        cat <<EOF
{
  "decision": "block",
  "reason": "Push successful. PR exists: ${pr_html_url}\\n\\n**YOU MUST IMMEDIATELY (no user input needed):**\\n\\n1. Generate PR content based on commits on this branch and output for manual copy:\\n\\n**Title:** <conventional commit format>\\n\\n\\\`\\\`\\\`markdown\\n## Summary\\n<bullet points>\\n\\n## Test Plan\\n- [ ] <test items>\\n\\\`\\\`\\\`\\n\\n2. Tell user: \\\"Copy the above to update PR at ${pr_html_url}\\\"\\n\\nDO THIS NOW - do not ask the user, do not wait for confirmation."
}
EOF
        exit 0
      fi
    else
      # No PR exists - generate a clickable markdown link
      default_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
      if [ -z "$default_branch" ]; then
        default_branch="main"
      fi
      base_url="https://github.com/${owner}/${repo}/compare/${default_branch}...${encoded_branch}?expand=1"
      cat <<EOF
{
  "decision": "block",
  "reason": "Push successful. No PR exists yet.\\n\\n**YOU MUST IMMEDIATELY (no user input needed):**\\n\\n1. Generate PR content based on commits on this branch:\\n   - Title: conventional commit format (feat/fix/refactor/docs/chore)\\n   - Body: ## Summary (bullet points), ## Test Plan (checklist)\\n\\n2. Create the PR link by URL-encoding the title and body, then output ONLY this clickable markdown link:\\n   [Create PR: <your-title>](${base_url}&title=<url-encoded-title>&body=<url-encoded-body>)\\n\\n3. Tell user: \\\"Click the link above to create the PR\\\"\\n\\nDO THIS NOW - do not ask the user, do not wait for confirmation. Generate the content and output the link immediately."
}
EOF
      exit 0
    fi
  fi

  # Fallback if we couldn't parse owner/repo
  cat <<EOF
{
  "decision": "block",
  "reason": "Push successful.\\n\\n**YOU MUST IMMEDIATELY (no user input needed):**\\n\\n1. Generate PR content based on commits on this branch and output for manual copy:\\n\\n**Title:** <conventional commit format>\\n\\n\\\`\\\`\\\`markdown\\n## Summary\\n<bullet points>\\n\\n## Test Plan\\n- [ ] <test items>\\n\\\`\\\`\\\`\\n\\n2. Tell user: \\\"PR description ready - create PR manually on GitHub\\\"\\n\\nDO THIS NOW - do not ask the user, do not wait for confirmation."
}
EOF
  exit 0
fi

exit 0
