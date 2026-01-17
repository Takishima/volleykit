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

# Marker file to track successful installs (stores package-lock.json hash)
INSTALL_MARKER=".claude/.install-marker"
CURRENT_LOCK_HASH=$(md5sum package-lock.json 2>/dev/null | cut -d' ' -f1 || echo "none")

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
  local webapp_output="web-app/src/api/schema.ts"

  # Output files don't exist = need generation
  [ ! -f "$shared_output" ] || [ ! -f "$webapp_output" ] && return 0
  # OpenAPI spec is newer than outputs = need generation
  [ "$openapi_spec" -nt "$shared_output" ] || [ "$openapi_spec" -nt "$webapp_output" ] && return 0
  return 1
}

# Install dependencies if needed
if needs_install; then
  echo "Installing dependencies (package-lock.json changed or first run)..."

  # Remove stale marker to ensure fresh state on failure
  rm -f "$INSTALL_MARKER"

  # Single npm install at root handles all workspaces (web-app, packages/shared, packages/mobile)
  # Running parallel installs could cause race conditions since workspaces share node_modules
  if npm install; then
    # Store hash to skip install next time
    echo "$CURRENT_LOCK_HASH" > "$INSTALL_MARKER"
    echo "Dependencies installed successfully"
  else
    echo "Warning: npm install failed - will retry on next session"
  fi
else
  echo "Dependencies already installed (skipping npm install)"
fi

# Generate API types only if needed
if needs_api_generation; then
  echo "Generating API types..."
  npm run generate:api
else
  echo "API types are up-to-date (skipping generation)"
fi

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
