#!/bin/bash
# Hook: Generate PR description after git push (Claude Code web only)
# Supports automatic PR updates via GitHub API when GITHUB_TOKEN is available

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
        # PR exists and we have a token - update via API and output description
        cat <<EOF
{
  "decision": "block",
  "reason": "Push successful. PR #${pr_number} exists: ${pr_html_url}\\n\\nYou MUST do the following:\\n\\n1. Generate a PR title (conventional commit style, e.g., feat(scope): description)\\n\\n2. Generate a PR description in markdown with these sections:\\n   - ## Summary (bullet points)\\n   - ## Changes (list of changes)\\n   - ## Test Plan (checklist with [ ] items)\\n\\n3. Update the PR via GitHub API:\\n   curl -X PATCH \"https://api.github.com/repos/${owner}/${repo}/pulls/${pr_number}\" \\\\\\n     -H \"Authorization: token \\\$GITHUB_TOKEN\" \\\\\\n     -H \"Accept: application/vnd.github.v3+json\" \\\\\\n     -d '{\"title\": \"<title>\", \"body\": \"<description>\"}'\\n\\n4. Output the PR description in a code block so the user can see it:\\n   \\n   **Title:** <title>\\n   \\n   \\\`\\\`\\\`markdown\\n   <description>\\n   \\\`\\\`\\\`\\n\\nIMPORTANT:\\n- Escape JSON properly in the curl request (use jq if needed)\\n- Any code snippets INSIDE the description must use 4-space indentation, NOT backticks\\n- Report whether the API update succeeded or failed"
}
EOF
        exit 0
      else
        # PR exists but no token - output description for manual copy
        cat <<EOF
{
  "decision": "block",
  "reason": "Push successful. PR already exists: ${pr_html_url}\\n\\nYou MUST output the PR title and description for manual copy.\\n\\nOutput EXACTLY this format:\\n\\n**Title:** <conventional commit style title>\\n\\n\\\`\\\`\\\`markdown\\n## Summary\\n\\n- <bullet points summarizing what was done>\\n\\n## Changes\\n\\n- <list of specific changes>\\n\\n## Test Plan\\n\\n- [ ] <checklist items for testing>\\n\\\`\\\`\\\`\\n\\nIMPORTANT:\\n- The code block is REQUIRED so the user can copy the description\\n- Any code snippets INSIDE the description must use 4-space indentation, NOT backticks"
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
  "reason": "Push successful. No PR exists yet.\\n\\nYou MUST output a clickable markdown link to create the PR.\\n\\nSteps:\\n1. Generate a PR title (conventional commit style, e.g., feat(scope): description)\\n\\n2. Generate a PR description with these sections:\\n   - ## Summary (bullet points)\\n   - ## Changes (list of changes)  \\n   - ## Test Plan (checklist with [ ] items)\\n\\n3. URL-encode the title and description:\\n   - Spaces → %20\\n   - Newlines → %0A\\n   - # → %23\\n   - Other special chars as needed\\n\\n4. Build the URL: ${base_url}&title=<encoded-title>&body=<encoded-description>\\n\\n5. Output a SINGLE markdown link (nothing else):\\n   [Create PR: <title>](<url>)\\n\\nIMPORTANT:\\n- Output ONLY the markdown link - no code blocks, no raw URLs, no extra text\\n- Any code snippets in the description must use 4-space indentation, NOT backticks\\n- The link text format is: Create PR: <title>"
}
EOF
      exit 0
    fi
  fi

  # Fallback if we couldn't parse owner/repo
  cat <<EOF
{
  "decision": "block",
  "reason": "Push successful.\\n\\nYou MUST output the PR title and description for manual copy.\\n\\nOutput EXACTLY this format:\\n\\n**Title:** <conventional commit style title>\\n\\n\\\`\\\`\\\`markdown\\n## Summary\\n\\n- <bullet points summarizing what was done>\\n\\n## Changes\\n\\n- <list of specific changes>\\n\\n## Test Plan\\n\\n- [ ] <checklist items for testing>\\n\\\`\\\`\\\`\\n\\nIMPORTANT:\\n- The code block is REQUIRED so the user can copy the description\\n- Any code snippets INSIDE the description must use 4-space indentation, NOT backticks"
}
EOF
  exit 0
fi

exit 0
