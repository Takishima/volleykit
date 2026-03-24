#!/bin/bash
set -euo pipefail

# Only run in Claude Code Remote environment (web sessions)
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Run in background for faster session startup
echo '{"async": true, "asyncTimeout": 300000}'

echo "Setting up VolleyKit development environment..."

cd "$CLAUDE_PROJECT_DIR"

# Marker file to track successful installs (stores pnpm-lock.yaml hash)
INSTALL_MARKER=".claude/.install-marker"
CURRENT_LOCK_HASH=$(md5sum pnpm-lock.yaml 2>/dev/null | cut -d' ' -f1 || echo "none")

# Check if dependencies need to be installed
needs_install() {
  # No node_modules = need install
  [ ! -d "node_modules" ] && return 0
  # No marker file = need install
  [ ! -f "$INSTALL_MARKER" ] && return 0
  # Lock file changed = need install
  local stored_hash
  stored_hash=$(cat "$INSTALL_MARKER" 2>/dev/null || echo "")
  [ "$stored_hash" != "$CURRENT_LOCK_HASH" ] && return 0
  return 1
}

# Check if API types need regeneration
needs_api_generation() {
  local openapi_spec="docs/api/volleymanager-openapi.yaml"
  local shared_output="packages/shared/src/api/schema.ts"
  local webapp_output="packages/web/src/api/schema.ts"

  # Output files don't exist = need generation
  [ ! -f "$shared_output" ] || [ ! -f "$webapp_output" ] && return 0
  # OpenAPI spec is newer than outputs = need generation
  [ "$openapi_spec" -nt "$shared_output" ] || [ "$openapi_spec" -nt "$webapp_output" ] && return 0
  return 1
}

# Install dependencies if needed
if needs_install; then
  echo "Installing dependencies (pnpm-lock.yaml changed or first run)..."

  # Remove stale marker to ensure fresh state on failure
  rm -f "$INSTALL_MARKER"

  # Single pnpm install at root handles all workspaces (web-app, packages/shared, packages/mobile)
  # Running parallel installs could cause race conditions since workspaces share node_modules
  if pnpm install; then
    # Store hash to skip install next time
    echo "$CURRENT_LOCK_HASH" >"$INSTALL_MARKER"
    echo "Dependencies installed successfully"
  else
    echo "Warning: pnpm install failed - will retry on next session"
  fi
else
  echo "Dependencies already installed (skipping pnpm install)"
fi

# Generate API types only if needed
if needs_api_generation; then
  echo "Generating API types..."
  pnpm run generate:api
else
  echo "API types are up-to-date (skipping generation)"
fi

echo "Development environment ready!"

# Inform Claude about GitHub MCP server availability
echo ""
echo "=== GitHub API Access ==="
echo "GitHub MCP server tools (mcp__github__*) are available."
echo "Use these tools directly for all GitHub operations (issues, PRs, comments, checks, labels, etc.)."
echo "Do NOT use curl or gh CLI for GitHub API calls."
echo "========================="
