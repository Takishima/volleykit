#!/usr/bin/env bash
# Pre-commit validation hook for VolleyKit
# Runs lint, knip, and test in PARALLEL, then build sequentially
#
# IMPORTANT: This hook only runs in Claude Code web environment
# to avoid slowing down human developers. Human devs rely on CI.

set -e

# Only run in Claude Code Remote environment (web sessions)
# Human developers can skip this and rely on CI
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
    exit 0
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the root directory using absolute path resolution
ROOT_DIR="$(git rev-parse --show-toplevel)"
if [ -z "$ROOT_DIR" ]; then
    echo -e "${RED}Error: Could not determine git root directory${NC}"
    exit 1
fi

WEB_APP_DIR="$ROOT_DIR/web-app"

# Verify web-app directory exists
if [ ! -d "$WEB_APP_DIR" ]; then
    echo -e "${RED}Error: web-app directory not found at $WEB_APP_DIR${NC}"
    exit 1
fi

echo "Pre-commit validation starting..."
echo "  Root: $ROOT_DIR"
echo "  Web App: $WEB_APP_DIR"

# Get list of staged files (for pre-commit hook)
STAGED_FILES=$(git diff --name-only --cached 2>/dev/null || echo "")

# Early exit if no files are staged
if [ -z "$STAGED_FILES" ]; then
    echo -e "${GREEN}No files staged, skipping validation${NC}"
    exit 0
fi

# Check if only markdown files are staged
if echo "$STAGED_FILES" | grep -v '^\s*$' | grep -qvE '\.md$'; then
    HAS_NON_MD=true
else
    HAS_NON_MD=false
fi

# Check if source files are staged
if echo "$STAGED_FILES" | grep -qE '\.(ts|tsx|js|jsx)$'; then
    HAS_SOURCE=true
else
    HAS_SOURCE=false
fi

# Check if OpenAPI spec is staged
if echo "$STAGED_FILES" | grep -q 'volleymanager-openapi.yaml'; then
    HAS_OPENAPI=true
else
    HAS_OPENAPI=false
fi

# Skip validation for docs-only changes
if [ "$HAS_NON_MD" = false ]; then
    echo -e "${GREEN}Only documentation changes detected, skipping validation${NC}"
    exit 0
fi

# Skip validation if no source files changed (but warn)
if [ "$HAS_SOURCE" = false ]; then
    echo -e "${YELLOW}No source files changed, skipping validation${NC}"
    exit 0
fi

# Change to web-app directory using absolute path
cd "$WEB_APP_DIR"

# Generate API types if OpenAPI spec changed
if [ "$HAS_OPENAPI" = true ]; then
    echo "OpenAPI spec changed, generating types..."
    npm run generate:api
fi

# Create temp directory for parallel job outputs
TEMP_DIR=$(mktemp -d)
trap "rm -rf \"$TEMP_DIR\"" EXIT

# Function to run a validation step and capture result
run_validation() {
    local name=$1
    local cmd=$2
    local output_file="$TEMP_DIR/${name}.out"
    local result_file="$TEMP_DIR/${name}.result"

    # Default to failure, only set success if command passes
    if $cmd > "$output_file" 2>&1; then
        echo "0" > "$result_file"
    else
        echo "1" > "$result_file"
    fi
}

# Function to print result immediately when a job completes
print_result_immediate() {
    local name=$1
    local result=$2
    local output_file="$TEMP_DIR/${name}.out"

    if [ "$result" -eq 0 ]; then
        echo -e "${GREEN}✓ ${name} passed${NC}"
    else
        echo -e "${RED}✗ ${name} failed${NC}"
        echo ""
        # Show output for failed checks immediately
        cat "$output_file"
        echo ""
    fi
}

echo ""
echo -e "${BLUE}Running lint, knip, and test in parallel...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Run lint, knip, and test in parallel
run_validation "lint" "npm run lint" &
LINT_PID=$!

run_validation "knip" "npm run knip" &
KNIP_PID=$!

run_validation "test" "npm test" &
TEST_PID=$!

# Track job completion
LINT_DONE=0
KNIP_DONE=0
TEST_DONE=0
LINT_RESULT=""
KNIP_RESULT=""
TEST_RESULT=""

echo "  Running: Lint, Knip, Test"
echo ""

# Monitor jobs and print results immediately as they complete
while [ $LINT_DONE -eq 0 ] || [ $KNIP_DONE -eq 0 ] || [ $TEST_DONE -eq 0 ]; do
    # Check lint
    if [ $LINT_DONE -eq 0 ] && ! kill -0 $LINT_PID 2>/dev/null; then
        wait $LINT_PID 2>/dev/null || true
        LINT_DONE=1
        LINT_RESULT=$(cat "$TEMP_DIR/lint.result" 2>/dev/null || echo "1")
        print_result_immediate "Lint" "$LINT_RESULT"
    fi

    # Check knip
    if [ $KNIP_DONE -eq 0 ] && ! kill -0 $KNIP_PID 2>/dev/null; then
        wait $KNIP_PID 2>/dev/null || true
        KNIP_DONE=1
        KNIP_RESULT=$(cat "$TEMP_DIR/knip.result" 2>/dev/null || echo "1")
        print_result_immediate "Knip" "$KNIP_RESULT"
    fi

    # Check test
    if [ $TEST_DONE -eq 0 ] && ! kill -0 $TEST_PID 2>/dev/null; then
        wait $TEST_PID 2>/dev/null || true
        TEST_DONE=1
        TEST_RESULT=$(cat "$TEMP_DIR/test.result" 2>/dev/null || echo "1")
        print_result_immediate "Test" "$TEST_RESULT"
    fi

    # Small delay to avoid busy loop (only if jobs still running)
    if [ $LINT_DONE -eq 0 ] || [ $KNIP_DONE -eq 0 ] || [ $TEST_DONE -eq 0 ]; then
        sleep 0.2
    fi
done

# Run build (only if previous steps passed)
BUILD_RESULT=0
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$LINT_RESULT" -eq 0 ] && [ "$KNIP_RESULT" -eq 0 ] && [ "$TEST_RESULT" -eq 0 ]; then
    echo "Running build..."
    if npm run build; then
        echo -e "${GREEN}Build passed${NC}"
    else
        echo -e "${RED}Build failed${NC}"
        BUILD_RESULT=1
    fi
else
    echo -e "${YELLOW}Build skipped (previous checks failed)${NC}"
    BUILD_RESULT=2
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Validation Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_status() {
    local name=$1
    local result=$2
    if [ "$result" -eq 0 ]; then
        echo -e "  ${GREEN}[PASS]${NC} $name"
    elif [ "$result" -eq 2 ]; then
        echo -e "  ${YELLOW}[SKIP]${NC} $name"
    else
        echo -e "  ${RED}[FAIL]${NC} $name"
    fi
}

print_status "Lint" "$LINT_RESULT"
print_status "Knip" "$KNIP_RESULT"
print_status "Test" "$TEST_RESULT"
print_status "Build" "$BUILD_RESULT"

# Exit with error if any check failed
if [ "$LINT_RESULT" -ne 0 ] || [ "$KNIP_RESULT" -ne 0 ] || [ "$TEST_RESULT" -ne 0 ] || [ "$BUILD_RESULT" -eq 1 ]; then
    echo ""
    echo -e "${RED}Commit blocked: Fix the issues above before committing${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}All checks passed! Commit allowed.${NC}"
exit 0
