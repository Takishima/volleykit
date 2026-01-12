#!/bin/bash
set -euo pipefail

# Only run in Claude Code Remote environment (web sessions)
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Run in background for faster session startup
echo '{"async": true, "asyncTimeout": 300000}'

echo "Setting up VolleyKit development environment..."

# Install root dependencies (workspaces + changesets CLI)
(
  cd "$CLAUDE_PROJECT_DIR"
  echo "Installing root dependencies..."
  npm install
)

# Install web-app dependencies and generate API types
(
  cd "$CLAUDE_PROJECT_DIR/web-app"
  echo "Installing web-app dependencies..."
  npm install
  echo "Generating API types..."
  npm run generate:api
)

echo "Development environment ready!"

# Inform Claude about available GitHub token if present
if [ -n "${GITHUB_TOKEN:-}" ]; then
  echo ""
  echo "=== GitHub API Access ==="
  echo "A GitHub token (GITHUB_TOKEN) is available in this environment."
  echo "IMPORTANT: ALWAYS use the GitHub REST API via curl instead of the gh CLI."
  echo "The gh CLI is NOT available. Use curl with the GITHUB_TOKEN for all GitHub operations."
  echo ""
  echo "CRITICAL: You MUST wrap curl commands in bash -c to access the token:"
  echo "  bash -c 'curl -s -H \"Authorization: Bearer \$GITHUB_TOKEN\" \\"
  echo "       -H \"Accept: application/vnd.github+json\" \\"
  echo "       https://api.github.com/repos/OWNER/REPO/issues'"
  echo ""
  echo "Direct curl commands will fail with 401 - always use bash -c wrapper."
  echo "========================="
fi
