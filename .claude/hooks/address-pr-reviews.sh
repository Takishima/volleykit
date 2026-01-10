#!/bin/bash
# Hook: Automatically address PR review comments after git push (Claude Code web only)
#
# ANTI-INFINITE-LOOP SAFEGUARDS:
# 1. Skips if last commit message contains "fix(review):" or "[skip-review-check]"
# 2. Tracks processed review comment IDs in state file
# 3. Limits to max 3 review-addressing cycles per session
# 4. Enforces 5-minute cooldown between checks
# 5. Only processes unresolved/pending review comments

# Only run in Claude Code web sessions
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

# Check dependencies
for cmd in jq curl git; do
  if ! command -v "$cmd" &> /dev/null; then
    exit 0
  fi
done

# Read and validate input
input=$(cat)
if ! echo "$input" | jq -e . &> /dev/null; then
  exit 0
fi

# Parse command from input
command=$(echo "$input" | jq -r '.tool_input.command // ""')

# Only trigger on git push commands
if [[ "$command" != *"git push"* ]]; then
  exit 0
fi

# Check if push was successful (no error in output)
tool_output=$(echo "$input" | jq -r '.tool_output // ""')
if [[ "$tool_output" == *"error"* ]] || [[ "$tool_output" == *"rejected"* ]] || [[ "$tool_output" == *"failed"* ]]; then
  exit 0
fi

# --- SAFEGUARD 1: Skip if last commit is a review-addressing commit ---
last_commit_msg=$(git log -1 --pretty=%B 2>/dev/null | head -1)
if [[ "$last_commit_msg" == *"fix(review):"* ]] || [[ "$last_commit_msg" == *"[skip-review-check]"* ]]; then
  exit 0
fi

# Get repository info
current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
remote_url=$(git remote get-url origin 2>/dev/null)

# Extract owner/repo
if [[ "$remote_url" =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
  owner="${BASH_REMATCH[1]}"
  repo="${BASH_REMATCH[2]}"
elif [[ "$remote_url" =~ /git/([^/]+)/([^/]+)$ ]]; then
  owner="${BASH_REMATCH[1]}"
  repo="${BASH_REMATCH[2]}"
else
  exit 0
fi

if [ -z "$owner" ] || [ -z "$repo" ] || [ -z "$current_branch" ]; then
  exit 0
fi

# Check for GitHub token
github_token="${GITHUB_TOKEN:-$GITHUB_PERSONAL_ACCESS_TOKEN}"
if [ -z "$github_token" ]; then
  exit 0
fi

# URL-encode branch name
encoded_branch=$(printf '%s' "$current_branch" | jq -sRr @uri)

# Check if PR exists
pr_response=$(curl -s -H "Authorization: token $github_token" \
  "https://api.github.com/repos/${owner}/${repo}/pulls?head=${owner}:${encoded_branch}&state=open" 2>/dev/null)

if [ -z "$pr_response" ] || [ "$pr_response" = "[]" ]; then
  exit 0
fi

pr_number=$(echo "$pr_response" | jq -r '.[0].number // empty')
if [ -z "$pr_number" ]; then
  exit 0
fi

# --- STATE FILE MANAGEMENT ---
STATE_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/.state"
STATE_FILE="$STATE_DIR/review-check-state.json"
mkdir -p "$STATE_DIR"

# Initialize state file if it doesn't exist
if [ ! -f "$STATE_FILE" ]; then
  echo '{"last_check": 0, "cycle_count": 0, "processed_comment_ids": [], "session_id": ""}' > "$STATE_FILE"
fi

# Get current session ID (use a combination of date and PR number)
current_session_id="${pr_number}-$(date +%Y%m%d)"
stored_session_id=$(jq -r '.session_id // ""' "$STATE_FILE")

# Reset cycle count if new session
if [ "$stored_session_id" != "$current_session_id" ]; then
  jq --arg sid "$current_session_id" '.session_id = $sid | .cycle_count = 0' "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
fi

# --- SAFEGUARD 2: Check cycle count (max 3 per session) ---
cycle_count=$(jq -r '.cycle_count // 0' "$STATE_FILE")
if [ "$cycle_count" -ge 3 ]; then
  exit 0
fi

# --- SAFEGUARD 3: Cooldown check (5 minutes between checks) ---
last_check=$(jq -r '.last_check // 0' "$STATE_FILE")
current_time=$(date +%s)
cooldown_seconds=300  # 5 minutes

if [ $((current_time - last_check)) -lt $cooldown_seconds ]; then
  exit 0
fi

# All safeguards passed - output instruction to wait and then check for reviews
cat <<EOF
{
  "decision": "block",
  "reason": "[AUTO-ADDRESS PR REVIEWS]\\n\\nPR #${pr_number} exists for branch '${current_branch}'.\\n\\n**WAIT 2 MINUTES** before checking for reviews. Ask the user if they want to skip the wait.\\n\\nAfter waiting, follow these steps:\\n\\n## Step 1: Fetch Claude Code Review Comments\\n\\nFetch issue comments (NOT PR review comments) to find reviews from claude[bot]:\\n\\n\\\`\\\`\\\`bash\\nbash -c 'curl -s -H \"Authorization: Bearer \\\$GITHUB_TOKEN\" -H \"Accept: application/vnd.github+json\" \"https://api.github.com/repos/${owner}/${repo}/issues/${pr_number}/comments\" | jq \"[.[] | select(.user.login == \\\"claude[bot]\\\") | {id, created_at, body}]\"'\\n\\\`\\\`\\\`\\n\\n## Step 2: Parse Reviews to Find Unaddressed Issues\\n\\nClaude Code Reviews have this structure:\\n- **Initial reviews**: Contain \\\"### Issues Found\\\" section with numbered issues like:\\n  \\\"1. **\\\`file.ts:123\\\` - Description**\\\"\\n- **Re-reviews**: Start with \\\"Re-review after changes\\\" and show \\\"### Fixed Since Last Review\\\"\\n\\nTo find unaddressed issues:\\n1. Find the LATEST review comment (by created_at)\\n2. If it's a re-review that says \\\"No new issues\\\" or \\\"LGTM\\\" -> No action needed\\n3. If it's an initial review or re-review with \\\"### Issues Found\\\" containing numbered items -> Address those\\n4. SKIP any issue that contains \\\"No issues found\\\" or similar\\n\\n## Step 3: Address Each Issue\\n\\nFor each numbered issue in \\\"### Issues Found\\\":\\n1. Parse the file path and line number from the issue (format: \\\`file.ts:123\\\`)\\n2. Read the file and understand the feedback\\n3. Make the requested change\\n4. Continue to next issue\\n\\n## Step 4: Commit and Push\\n\\nAfter addressing ALL issues:\\n1. Create ONE commit: \\\`fix(review): address PR review comments\\\`\\n2. Push the changes\\n3. The hook will skip triggering again due to the \\\"fix(review):\\\" prefix\\n\\n## Safeguards\\n\\n- **Max 3 cycles** per session (current: ${cycle_count}/3)\\n- **5-min cooldown** between checks\\n- **fix(review): commits** don't trigger this hook\\n- **State file**: ${STATE_FILE}\\n\\nIf the latest review has no actionable issues, inform the user and do NOT commit."
}
EOF

# Update state: increment cycle count and update last_check time
jq --argjson time "$current_time" --argjson count "$((cycle_count + 1))" \
  '.last_check = $time | .cycle_count = $count' "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"

exit 0
