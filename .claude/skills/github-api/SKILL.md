---
name: github-api
description: Interact with the GitHub REST API for issues, PRs, comments, checks, labels, and other GitHub operations.
argument-hint: "[operation, e.g. 'list open PRs', 'get issue #42']"
---

# GitHub API Skill

Interact with GitHub using the built-in MCP server tools (`mcp__github__*`). Use this skill for any GitHub operations (issues, PRs, comments, checks, labels, etc.).

## User Input

```text
$ARGUMENTS
```

Interpret the user input as a GitHub API operation request. Examples:

- `list open PRs` → list open pull requests
- `get issue #42` → fetch issue details
- `create issue "title" "body"` → create a new issue
- `add label bug to issue #5` → add a label
- `get review comments on PR #12` → fetch PR review comments

## Repo Detection

Parse `owner` and `repo` from the git remote when not obvious from context:

```bash
git remote get-url origin
```

Handles these URL formats:
- SSH: `git@github.com:owner/repo.git`
- HTTPS: `https://github.com/owner/repo.git`
- Local proxy: `http://...@127.0.0.1:.../git/owner/repo`

## MCP Tool Reference

### Issues

| Operation      | Tool                         | Key Parameters                              |
| -------------- | ---------------------------- | ------------------------------------------- |
| Get issue      | `mcp__github__issue_read`    | `method: "get"`, `issue_number`             |
| List issues    | `mcp__github__list_issues`   | `state: "OPEN"/"CLOSED"`                   |
| Create issue   | `mcp__github__issue_write`   | `method: "create"`, `title`, `body`         |
| Update issue   | `mcp__github__issue_write`   | `method: "update"`, `issue_number`, `state` |
| Add comment    | `mcp__github__add_issue_comment` | `issue_number`, `body`                  |
| Get comments   | `mcp__github__issue_read`    | `method: "get_comments"`, `issue_number`    |
| Get labels     | `mcp__github__issue_read`    | `method: "get_labels"`, `issue_number`      |

### Pull Requests

| Operation         | Tool                                | Key Parameters                                   |
| ----------------- | ----------------------------------- | ------------------------------------------------ |
| List PRs          | `mcp__github__list_pull_requests`   | `owner`, `repo`, `state`                         |
| Get PR            | `mcp__github__pull_request_read`    | `method: "get"`, `pullRequestNumber`             |
| Create PR         | `mcp__github__create_pull_request`  | `title`, `body`, `head`, `base`                  |
| Update PR         | `mcp__github__update_pull_request`  | `pullRequestNumber`, `title`, `body`, `state`    |
| Get PR comments   | `mcp__github__pull_request_read`    | `method: "get_comments"`, `pullRequestNumber`    |
| Get PR reviews    | `mcp__github__pull_request_read`    | `method: "get_reviews"`, `pullRequestNumber`     |
| Reply to comment  | `mcp__github__add_reply_to_pull_request_comment` | `comment_id`, `body`            |

### Repository

| Operation      | Tool                          | Key Parameters         |
| -------------- | ----------------------------- | ---------------------- |
| List branches  | `mcp__github__list_branches`  | `owner`, `repo`        |
| Create branch  | `mcp__github__create_branch`  | `branch`, `sha`        |
| List commits   | `mcp__github__list_commits`   | `owner`, `repo`, `sha` |
| Get commit     | `mcp__github__get_commit`     | `owner`, `repo`, `sha` |
| Search code    | `mcp__github__search_code`    | `query`                |
| List releases  | `mcp__github__list_releases`  | `owner`, `repo`        |

### Search

| Operation      | Tool                              | Key Parameters |
| -------------- | --------------------------------- | -------------- |
| Search issues  | `mcp__github__search_issues`      | `query`        |
| Search PRs     | `mcp__github__search_pull_requests` | `query`      |
| Search repos   | `mcp__github__search_repositories` | `query`      |

## Tips

- Always pass `owner` and `repo` explicitly — parse from `git remote get-url origin` if not known
- For paginated results use the `perPage` and `after` (cursor) parameters
- To find a PR for a branch: use `mcp__github__list_pull_requests` and filter by `head` branch name, or `mcp__github__search_pull_requests` with query `head:BRANCH`
- Get current branch: `git rev-parse --abbrev-ref HEAD`
- Get current SHA: `git rev-parse HEAD`

## Output

Show a concise formatted summary of the MCP tool response. For list operations show a summary table. For mutations confirm the action and show the resulting URL.
