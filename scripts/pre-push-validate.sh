#!/usr/bin/env bash
# Pre-push validation hook for VolleyKit
# Runs lint, knip, and test in PARALLEL, then build sequentially

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the root directory
ROOT_DIR="$(git rev-parse --show-toplevel)"
WEB_APP_DIR="$ROOT_DIR/web-app"

echo "🔍 Pre-push validation starting..."

# Get list of changed files compared to remote
REMOTE_REF="$1"
LOCAL_REF="$2"

# If no refs provided (direct hook call), compare against origin/main or HEAD~1
if [ -z "$REMOTE_REF" ]; then
    if git rev-parse --verify origin/main >/dev/null 2>&1; then
        CHANGED_FILES=$(git diff --name-only origin/main...HEAD 2>/dev/null || git diff --name-only HEAD 2>/dev/null)
    else
        CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null)
    fi
else
    CHANGED_FILES=$(git diff --name-only "$REMOTE_REF".."$LOCAL_REF" 2>/dev/null || echo "")
fi

# Also include staged changes
STAGED_FILES=$(git diff --name-only --cached 2>/dev/null || echo "")
ALL_CHANGED="$CHANGED_FILES"$'\n'"$STAGED_FILES"

# Check if only markdown files changed
if echo "$ALL_CHANGED" | grep -v '^\s*$' | grep -qvE '\.md$'; then
    HAS_NON_MD=true
else
    HAS_NON_MD=false
fi

# Check if source files changed
if echo "$ALL_CHANGED" | grep -qE '\.(ts|tsx|js|jsx)$'; then
    HAS_SOURCE=true
else
    HAS_SOURCE=false
fi

# Check if OpenAPI spec changed
if echo "$ALL_CHANGED" | grep -q 'volleymanager-openapi.yaml'; then
    HAS_OPENAPI=true
else
    HAS_OPENAPI=false
fi

# Skip validation for docs-only changes
if [ "$HAS_NON_MD" = false ]; then
    echo -e "${GREEN}✓ Only documentation changes detected, skipping validation${NC}"
    exit 0
fi

# Skip validation if no source files changed (but warn)
if [ "$HAS_SOURCE" = false ]; then
    echo -e "${YELLOW}⚠ No source files changed, skipping validation${NC}"
    exit 0
fi

cd "$WEB_APP_DIR"

# Generate API types if OpenAPI spec changed
if [ "$HAS_OPENAPI" = true ]; then
    echo "📝 OpenAPI spec changed, generating types..."
    npm run generate:api
fi

# Create temp directory for parallel job outputs
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Function to run a validation step and capture result
run_validation() {
    local name=$1
    local cmd=$2
    local output_file="$TEMP_DIR/${name}.out"
    local result_file="$TEMP_DIR/${name}.result"

    echo "0" > "$result_file"
    if $cmd > "$output_file" 2>&1; then
        echo "0" > "$result_file"
    else
        echo "1" > "$result_file"
    fi
}

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 Running lint, knip, and test in parallel...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Run lint, knip, and test in parallel
run_validation "lint" "npm run lint" &
LINT_PID=$!

run_validation "knip" "npm run knip" &
KNIP_PID=$!

run_validation "test" "npm test" &
TEST_PID=$!

# Wait for all parallel jobs to complete
echo "  ⏳ Lint (PID $LINT_PID)"
echo "  ⏳ Knip (PID $KNIP_PID)"
echo "  ⏳ Test (PID $TEST_PID)"
echo ""

wait $LINT_PID $KNIP_PID $TEST_PID

# Read results
LINT_RESULT=$(cat "$TEMP_DIR/lint.result")
KNIP_RESULT=$(cat "$TEMP_DIR/knip.result")
TEST_RESULT=$(cat "$TEMP_DIR/test.result")

# Print results for each
print_result() {
    local name=$1
    local result=$2
    local output_file="$TEMP_DIR/${name}.out"

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if [ "$result" -eq 0 ]; then
        echo -e "${GREEN}✓ ${name} passed${NC}"
    else
        echo -e "${RED}✗ ${name} failed${NC}"
        echo ""
        # Show output for failed checks
        cat "$output_file"
    fi
}

print_result "Lint" "$LINT_RESULT"
print_result "Knip" "$KNIP_RESULT"
print_result "Test" "$TEST_RESULT"

# Run build (only if previous steps passed)
BUILD_RESULT=0
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$LINT_RESULT" -eq 0 ] && [ "$KNIP_RESULT" -eq 0 ] && [ "$TEST_RESULT" -eq 0 ]; then
    echo "🏗️  Running build..."
    if npm run build; then
        echo -e "${GREEN}✓ Build passed${NC}"
    else
        echo -e "${RED}✗ Build failed${NC}"
        BUILD_RESULT=1
    fi
else
    echo -e "${YELLOW}⊘ Build skipped (previous checks failed)${NC}"
    BUILD_RESULT=2
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Validation Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_status() {
    local name=$1
    local result=$2
    if [ "$result" -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} $name"
    elif [ "$result" -eq 2 ]; then
        echo -e "  ${YELLOW}⊘${NC} $name (skipped)"
    else
        echo -e "  ${RED}✗${NC} $name"
    fi
}

print_status "Lint" "$LINT_RESULT"
print_status "Knip" "$KNIP_RESULT"
print_status "Test" "$TEST_RESULT"
print_status "Build" "$BUILD_RESULT"

# Exit with error if any check failed
if [ "$LINT_RESULT" -ne 0 ] || [ "$KNIP_RESULT" -ne 0 ] || [ "$TEST_RESULT" -ne 0 ] || [ "$BUILD_RESULT" -eq 1 ]; then
    echo ""
    echo -e "${RED}❌ Push blocked: Fix the issues above before pushing${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ All checks passed! Push allowed.${NC}"
exit 0
