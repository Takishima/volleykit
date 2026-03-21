---
name: github-api
description: Interact with the GitHub REST API for issues, PRs, comments, checks, labels, and other GitHub operations.
argument-hint: "[operation, e.g. 'list open PRs', 'get issue #42']"
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

Run the helper script to make API calls. It auto-detects the repo from git remote, chooses `gh` or `curl` (with proper `$GITHUB_TOKEN` auth), and handles JSON bodies.

**IMPORTANT**: Always invoke the script via `bash -c` to ensure `$GITHUB_TOKEN` is accessible:

```bash
bash -c '${CLAUDE_SKILL_DIR}/scripts/ghapi.sh METHOD ENDPOINT [JSON_BODY]'
```

The script:
- Auto-detects `OWNER`/`REPO` from git remote (or use literal `OWNER`/`REPO` in endpoints and they get replaced)
- Prefers `gh api` when available, falls back to `curl` with `$GITHUB_TOKEN`
- Appends `per_page=100` to GET requests automatically
- Pipes JSON body via stdin for POST/PATCH/PUT

## Usage Examples

### GET requests

```bash
bash -c '${CLAUDE_SKILL_DIR}/scripts/ghapi.sh GET /repos/OWNER/REPO/pulls?state=open | jq .'
```

```bash
bash -c '${CLAUDE_SKILL_DIR}/scripts/ghapi.sh GET /repos/OWNER/REPO/issues/42 | jq .'
```

### POST requests

```bash
bash -c '${CLAUDE_SKILL_DIR}/scripts/ghapi.sh POST /repos/OWNER/REPO/issues "$(jq -n --arg title "Bug report" --arg body "Details here" "{title: \$title, body: \$body}")" | jq .'
```

### PATCH requests

```bash
bash -c '${CLAUDE_SKILL_DIR}/scripts/ghapi.sh PATCH /repos/OWNER/REPO/issues/42 "$(jq -n --arg state "closed" "{state: \$state}")" | jq .'
```

### Multiline body content

```bash
bash -c 'BODY=$(cat <<'\''EOF'\''
This is a multiline
body with **markdown**.
EOF
)
${CLAUDE_SKILL_DIR}/scripts/ghapi.sh POST /repos/OWNER/REPO/issues/42/comments "$(jq -n --arg body "$BODY" "{body: \$body}")" | jq .'
```

## Common Endpoints Reference

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

1. Determine the appropriate API endpoint and method from the reference above
2. Construct and execute using the `ghapi.sh` wrapper script
3. Pipe output through `jq` to show relevant fields
4. For paginated results, call multiple pages: `ENDPOINT?page=1`, `ENDPOINT?page=2`, etc.

## Tips

- URL-encode branch names: `printf '%s' "$BRANCH" | jq -sRr @uri`
- Filter by user: `jq '[.[] | select(.user.login == "USERNAME")]'`
- Get current branch: `git rev-parse --abbrev-ref HEAD`
- Get current SHA: `git rev-parse HEAD`

## Output

Show the API response formatted with jq. For list operations, show a concise summary table. For mutations, confirm the action and show the resulting URL.
