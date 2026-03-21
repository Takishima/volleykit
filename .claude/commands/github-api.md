---
description: Interact with the GitHub REST API for issues, PRs, comments, checks, labels, and other GitHub operations.
---

# GitHub API Skill

Interact with the GitHub REST API. Use this skill for any GitHub operations (issues, PRs, comments, checks, labels, etc.).

## User Input

```text
$ARGUMENTS
```

Interpret the user input as a GitHub API operation request. Examples:
- `list open PRs` → list open pull requests
- `get issue #42` → fetch issue details
- `create issue "title" "body"` → create a new issue
- `list checks on HEAD` → get CI check status for current commit
- `add label bug to issue #5` → add a label
- `get review comments on PR #12` → fetch PR review comments

## Setup

### Step 1: Detect Repository

```bash
bash -c 'REMOTE=$(git remote get-url origin 2>/dev/null); if [[ "$REMOTE" =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then echo "owner=${BASH_REMATCH[1]}"; echo "repo=${BASH_REMATCH[2]}"; elif [[ "$REMOTE" =~ /git/([^/]+)/([^/]+)$ ]]; then echo "owner=${BASH_REMATCH[1]}"; echo "repo=${BASH_REMATCH[2]}"; else echo "ERROR: Could not detect GitHub repo from remote: $REMOTE"; exit 1; fi'
```

Store the `owner` and `repo` values for subsequent API calls.

### Step 2: Detect Available Tools

```bash
bash -c 'if command -v gh &>/dev/null; then echo "TOOL=gh"; elif [ -n "$GITHUB_TOKEN" ]; then echo "TOOL=curl"; else echo "TOOL=none (read-only public access only)"; fi'
```

- **`gh` available** (e.g., GitHub Actions): Use `gh api` — handles auth and JSON automatically
- **`gh` unavailable, `$GITHUB_TOKEN` set** (e.g., Claude Code web): Use `curl` wrapped in `bash -c`
- **Neither**: Read-only public API access only

**IMPORTANT**: When using curl, you MUST wrap all curl commands in `bash -c '...'` to access `$GITHUB_TOKEN`. Direct curl commands will fail with 401 because the token is only available inside a `bash -c` subshell.

## API Call Patterns

### When `gh` is available (preferred)

#### GET request

```bash
gh api repos/OWNER/REPO/ENDPOINT
```

#### POST/PATCH/PUT request

```bash
gh api repos/OWNER/REPO/ENDPOINT -X POST -f title="TITLE" -f body="BODY"
```

For multiline body content:

```bash
gh api repos/OWNER/REPO/ENDPOINT -X POST --input <(jq -n --arg title "TITLE" --arg body "BODY" '{title: $title, body: $body}')
```

### When using curl (fallback)

**CRITICAL**: All curl commands MUST be wrapped in `bash -c` to access `$GITHUB_TOKEN`.
Direct curl commands will fail with 401 - always use the `bash -c` wrapper.

#### GET request

```bash
bash -c 'curl -s -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/OWNER/REPO/ENDPOINT" | jq .'
```

#### POST/PATCH/PUT request

**IMPORTANT**: Always use heredoc for multiline body content. Never use inline `\n` escapes in jq args.

```bash
bash -c 'BODY=$(cat <<'\''EOF'\''
BODY_CONTENT_HERE
EOF
)
jq -n --arg title "TITLE" --arg body "$BODY" "{title: \$title, body: \$body}" | curl -s -X POST -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/OWNER/REPO/ENDPOINT" -d @- | jq .'
```

## Common Operations Reference

Use these as templates. Replace `OWNER`, `REPO`, and parameters as needed.

### Pull Requests

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List open PRs | GET | `/repos/OWNER/REPO/pulls?state=open` |
| Get PR | GET | `/repos/OWNER/REPO/pulls/NUMBER` |
| Create PR | POST | `/repos/OWNER/REPO/pulls` (body: title, body, head, base) |
| Update PR | PATCH | `/repos/OWNER/REPO/pulls/NUMBER` |
| List PR files | GET | `/repos/OWNER/REPO/pulls/NUMBER/files` |
| List PR reviews | GET | `/repos/OWNER/REPO/pulls/NUMBER/reviews` |
| List PR comments | GET | `/repos/OWNER/REPO/pulls/NUMBER/comments` |
| Check if PR exists for branch | GET | `/repos/OWNER/REPO/pulls?head=OWNER:BRANCH&state=open` |

### Issues

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List issues | GET | `/repos/OWNER/REPO/issues?state=open` |
| Get issue | GET | `/repos/OWNER/REPO/issues/NUMBER` |
| Create issue | POST | `/repos/OWNER/REPO/issues` (body: title, body, labels, assignees) |
| Update issue | PATCH | `/repos/OWNER/REPO/issues/NUMBER` |
| Add comment | POST | `/repos/OWNER/REPO/issues/NUMBER/comments` (body: body) |
| List comments | GET | `/repos/OWNER/REPO/issues/NUMBER/comments` |
| Add labels | POST | `/repos/OWNER/REPO/issues/NUMBER/labels` (body: labels array) |

### CI / Checks

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Check runs for commit | GET | `/repos/OWNER/REPO/commits/SHA/check-runs` |
| Check runs for PR | GET | `/repos/OWNER/REPO/commits/SHA/check-runs` (get SHA from PR head) |
| Combined status | GET | `/repos/OWNER/REPO/commits/SHA/status` |

### Repository

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Get repo | GET | `/repos/OWNER/REPO` |
| List branches | GET | `/repos/OWNER/REPO/branches` |
| List releases | GET | `/repos/OWNER/REPO/releases` |
| List workflows | GET | `/repos/OWNER/REPO/actions/workflows` |
| List workflow runs | GET | `/repos/OWNER/REPO/actions/runs` |

## Execution

Based on the user input:

1. Run **Step 1** and **Step 2** to detect repo and available tools
2. Determine the appropriate API endpoint and method from the reference above
3. Construct and execute the command using `gh api` (preferred) or `curl` (fallback)
4. Parse the response with `jq` to show relevant fields
5. If the response is paginated, use `gh api --paginate` or add `?per_page=100&page=N` for curl

## Tips

- URL-encode branch names: `printf '%s' "$BRANCH" | jq -sRr @uri`
- Filter by user: `jq '[.[] | select(.user.login == "USERNAME")]'`
- Get current branch: `git rev-parse --abbrev-ref HEAD`
- Get current SHA: `git rev-parse HEAD`

## Output

Show the API response formatted with jq. For list operations, show a concise summary table. For mutations, confirm the action and show the resulting URL.
