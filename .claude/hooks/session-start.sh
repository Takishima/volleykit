#!/bin/bash
set -euo pipefail

# Only run in Claude Code Remote environment (web sessions)
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Run in background for faster session startup
echo '{"async": true, "asyncTimeout": 300000}'

echo "Setting up VolleyKit development environment..."

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
  echo "You can use the GitHub API via curl or the WebFetch tool."
  echo "========================="
fi
