# Create PR and Address Reviews

Open a PR for the current branch and address Claude Code Review comments.

## Prerequisites

- Current branch must be pushed to origin
- Commits ready for PR (run `/build` first if needed)

## Steps

### Step 1: Get Repository Info

```bash
bash -c 'echo "Branch: $(git rev-parse --abbrev-ref HEAD)"'
```

```bash
bash -c 'REMOTE=$(git remote get-url origin 2>/dev/null); if [[ "$REMOTE" =~ github\.com[:/]([^/]+)/([^/.]+) ]]; then echo "Repo: ${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"; elif [[ "$REMOTE" =~ /git/([^/]+)/([^/]+)$ ]]; then echo "Repo: ${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"; fi'
```

### Step 2: Check for Existing PR

```bash
bash -c 'BRANCH=$(git rev-parse --abbrev-ref HEAD); REMOTE=$(git remote get-url origin); if [[ "$REMOTE" =~ github\.com[:/]([^/]+)/([^/.]+) ]]; then OWNER=${BASH_REMATCH[1]}; REPO=${BASH_REMATCH[2]}; elif [[ "$REMOTE" =~ /git/([^/]+)/([^/]+)$ ]]; then OWNER=${BASH_REMATCH[1]}; REPO=${BASH_REMATCH[2]}; fi; ENCODED=$(printf "%s" "$BRANCH" | jq -sRr @uri); curl -s -H "Authorization: Bearer $GITHUB_TOKEN" "https://api.github.com/repos/$OWNER/$REPO/pulls?head=$OWNER:$ENCODED&state=open" | jq ".[0] | {number, html_url, title} // \"No PR found\""'
```

### Step 3a: Create PR (if none exists)

Generate title and body from commits:
- Title: Conventional commit format (e.g., `feat(scope): description`)
- Body: `## Summary` (bullet points) + `## Test plan` (checklist)

Create PR via GitHub API:

```bash
bash -c 'BRANCH=$(git rev-parse --abbrev-ref HEAD); REMOTE=$(git remote get-url origin); if [[ "$REMOTE" =~ github\.com[:/]([^/]+)/([^/.]+) ]]; then OWNER=${BASH_REMATCH[1]}; REPO=${BASH_REMATCH[2]}; elif [[ "$REMOTE" =~ /git/([^/]+)/([^/]+)$ ]]; then OWNER=${BASH_REMATCH[1]}; REPO=${BASH_REMATCH[2]}; fi; jq -n --arg title "PR_TITLE_HERE" --arg body "PR_BODY_HERE" --arg head "$BRANCH" --arg base "main" "{title: \$title, body: \$body, head: \$head, base: \$base}" | curl -s -X POST -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/$OWNER/$REPO/pulls" -d @- | jq "{number, html_url}"'
```

Replace `PR_TITLE_HERE` and `PR_BODY_HERE` with generated content.

### Step 3b: Update PR (if exists)

```bash
bash -c 'REMOTE=$(git remote get-url origin); if [[ "$REMOTE" =~ github\.com[:/]([^/]+)/([^/.]+) ]]; then OWNER=${BASH_REMATCH[1]}; REPO=${BASH_REMATCH[2]}; elif [[ "$REMOTE" =~ /git/([^/]+)/([^/]+)$ ]]; then OWNER=${BASH_REMATCH[1]}; REPO=${BASH_REMATCH[2]}; fi; jq -n --arg title "PR_TITLE_HERE" --arg body "PR_BODY_HERE" "{title: \$title, body: \$body}" | curl -s -X PATCH -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/$OWNER/$REPO/pulls/PR_NUMBER_HERE" -d @- | jq "{number, html_url}"'
```

### Step 4: Wait for Claude Code Review

Inform the user, then wait 1 minute 30 seconds for the review workflow:

```bash
sleep 90
```

### Step 5: Fetch Review Comments (with retry)

Fetch the latest review comment from Claude:

```bash
bash -c 'REMOTE=$(git remote get-url origin); if [[ "$REMOTE" =~ github\.com[:/]([^/]+)/([^/.]+) ]]; then OWNER=${BASH_REMATCH[1]}; REPO=${BASH_REMATCH[2]}; elif [[ "$REMOTE" =~ /git/([^/]+)/([^/]+)$ ]]; then OWNER=${BASH_REMATCH[1]}; REPO=${BASH_REMATCH[2]}; fi; curl -s -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/$OWNER/$REPO/issues/PR_NUMBER_HERE/comments" | jq "[.[] | select(.user.login == \"claude[bot]\") | {id, created_at, body}] | sort_by(.created_at) | last"'
```

If no review comment is found (null result) or the comment is older than this PR update, wait 1 more minute and retry:

```bash
sleep 60
```

```bash
bash -c 'REMOTE=$(git remote get-url origin); if [[ "$REMOTE" =~ github\.com[:/]([^/]+)/([^/.]+) ]]; then OWNER=${BASH_REMATCH[1]}; REPO=${BASH_REMATCH[2]}; elif [[ "$REMOTE" =~ /git/([^/]+)/([^/]+)$ ]]; then OWNER=${BASH_REMATCH[1]}; REPO=${BASH_REMATCH[2]}; fi; curl -s -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/$OWNER/$REPO/issues/PR_NUMBER_HERE/comments" | jq "[.[] | select(.user.login == \"claude[bot]\") | {id, created_at, body}] | sort_by(.created_at) | last"'
```

If still no review after retry, inform the user and stop.

### Step 6: Parse and Address Issues

From the review comment body, find the `### Issues Found` section.

Format: `1. **\`file.ts:123\` - Description**`

For each issue:
1. Read the file at the specified line
2. Understand and implement the fix
3. Move to next issue

If "No issues found" or "LGTM", inform user and stop.

### Step 7: Commit and Push Fixes

After addressing ALL issues:

```bash
git add -A && git commit -m "fix(review): address PR review comments"
```

```bash
git push
```

The `fix(review):` prefix prevents infinite review loops.

## Output

- `Created PR #N: <url>` or `Updated PR #N: <url>`
- `Waiting 1m30s for review...`
- `Retrying in 1 minute...` (if no review found)
- `Addressing N issues...` or `No issues found`
- `Pushed fixes`
