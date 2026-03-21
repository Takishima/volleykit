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

### Step 2: Detect API Method

```bash
command -v gh >/dev/null 2>&1 && echo "METHOD=gh" || echo "METHOD=curl"
```

Use `gh api` when available (GitHub Actions, local dev with gh installed). Fall back to `curl` with `$GITHUB_TOKEN` (Claude Code web).

## API Call Patterns

### Using `gh api` (preferred when available)

#### GET request

```bash
gh api repos/OWNER/REPO/ENDPOINT
```

#### POST/PATCH/PUT request

```bash
gh api repos/OWNER/REPO/ENDPOINT -X POST --input <(jq -n --arg title "TITLE" --arg body "BODY" '{title: $title, body: $body}')
```

For multiline body content, use a heredoc variable:

```bash
BODY=$(cat <<'EOF'
Line 1
Line 2
EOF
)
gh api repos/OWNER/REPO/ENDPOINT -X POST --input <(jq -n --arg title "TITLE" --arg body "$BODY" '{title: $title, body: $body}')
```

#### Pagination

```bash
gh api --paginate repos/OWNER/REPO/issues
```

### Using `curl` (fallback when `gh` is unavailable)

**CRITICAL**: All curl commands MUST be wrapped in `bash -c` to access `$GITHUB_TOKEN`. Direct curl will fail with 401.

#### GET request

```bash
bash -c 'curl -s -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/OWNER/REPO/ENDPOINT" | jq .'
```

#### POST/PATCH/PUT request

```bash
bash -c 'jq -n --arg title "TITLE" --arg body "BODY" "{title: \$title, body: \$body}" | curl -s -X POST -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/OWNER/REPO/ENDPOINT" -d @- | jq .'
```

For multiline body content, use a heredoc variable inside `bash -c`:

```bash
bash -c 'BODY=$(cat <<'\''EOF'\''
Line 1
Line 2
EOF
)
jq -n --arg title "TITLE" --arg body "$BODY" "{title: \$title, body: \$body}" | curl -s -X POST -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/OWNER/REPO/ENDPOINT" -d @- | jq .'
```

#### Pagination

Add `?per_page=100&page=N` for large result sets.

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

1. Run **Step 1** and **Step 2** to detect repo and API method
2. Determine the appropriate API endpoint and method from the reference above
3. Construct and execute the command using the detected method (`gh api` or `curl`)
4. Parse the response with `jq` to show relevant fields
5. For paginated results: use `gh api --paginate` or `?per_page=100&page=N` (curl)

## Tips

- URL-encode branch names: `printf '%s' "$BRANCH" | jq -sRr @uri`
- Filter by user: `jq '[.[] | select(.user.login == "USERNAME")]'`
- Get current branch: `git rev-parse --abbrev-ref HEAD`
- Get current SHA: `git rev-parse HEAD`

## Output

Show the API response formatted with jq. For list operations, show a concise summary table. For mutations, confirm the action and show the resulting URL.
