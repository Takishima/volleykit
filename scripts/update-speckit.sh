#!/usr/bin/env bash
#
# Update spec-kit templates to the latest version
#
# Usage: ./scripts/update-speckit.sh
#
# Prerequisites:
#   - uv (https://docs.astral.sh/uv/)
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== Updating spec-kit templates ==="

# Get current version
if [ -f .specify/version ]; then
    CURRENT_VERSION=$(cat .specify/version)
    echo "Current version: $CURRENT_VERSION"
else
    CURRENT_VERSION="unknown"
    echo "Current version: unknown"
fi

# Install spec-kit CLI
echo ""
echo "Installing spec-kit CLI..."
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git --force

# Update templates
echo ""
echo "Updating templates..."
echo "y" | specify init . --ai claude --no-git --ignore-agent-tools

# Store the installed version
specify version | grep -oP 'CLI Version:\s+\K[\d.]+' > .specify/version 2>/dev/null || true
NEW_VERSION=$(cat .specify/version 2>/dev/null || echo "unknown")
echo "New version: $NEW_VERSION"

# Apply local customizations
echo ""
echo "Applying local customizations..."

# LOCAL CUSTOMIZATION: Remove branch validation from check_feature_branch
#
# Why: Upstream speckit enforces ###-feature-name branch naming pattern.
# We removed this restriction to allow speckit commands to run from any
# branch (e.g., claude/* branches used by Claude Code web sessions).
sed -i '/^check_feature_branch() {$/,/^}$/c\check_feature_branch() {\n    # Branch validation removed - speckit commands can run from any branch\n    return 0\n}' .specify/scripts/bash/common.sh

# Verify customization applied
if grep -q "Branch validation removed" .specify/scripts/bash/common.sh; then
    echo "✓ Branch validation customization applied"
else
    echo "ERROR: Failed to apply branch validation customization"
    exit 1
fi

# Show changes
echo ""
echo "=== Changes ==="
if git diff --quiet && git diff --staged --quiet; then
    echo "No changes detected (already up to date)"
else
    git diff --stat
    echo ""
    echo "Review changes with: git diff"
    echo "Commit with: git add -A && git commit -m 'chore(deps): update spec-kit templates'"
fi
