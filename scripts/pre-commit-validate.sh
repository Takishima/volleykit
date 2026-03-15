#!/usr/bin/env bash
# Pre-commit validation hook for VolleyKit
# Detects which packages have staged changes and runs their validation
# checks in PARALLEL, then build sequentially.
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

echo "Pre-commit validation starting..."
echo "  Root: $ROOT_DIR"

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

# Skip validation for docs-only changes
if [ "$HAS_NON_MD" = false ]; then
  echo -e "${GREEN}Only documentation changes detected, skipping validation${NC}"
  exit 0
fi

# Check if source files are staged (any package)
if echo "$STAGED_FILES" | grep -qE '\.(ts|tsx|js|jsx|astro)$'; then
  HAS_SOURCE=true
else
  HAS_SOURCE=false
fi

# Check for config files that always trigger validation
if echo "$STAGED_FILES" | grep -qE '(package\.json|tsconfig\.json|vite\.config|eslint\.config)'; then
  HAS_CONFIG=true
else
  HAS_CONFIG=false
fi

# Skip validation if no source or config files changed
if [ "$HAS_SOURCE" = false ] && [ "$HAS_CONFIG" = false ]; then
  echo -e "${YELLOW}No source or config files changed, skipping validation${NC}"
  exit 0
fi

# Check if OpenAPI spec is staged
if echo "$STAGED_FILES" | grep -q 'volleymanager-openapi.yaml'; then
  HAS_OPENAPI=true
else
  HAS_OPENAPI=false
fi

# =============================================================================
# DETECT AFFECTED PACKAGES
# =============================================================================

has_changes_in() {
  echo "$STAGED_FILES" | grep -q "^$1"
}

HAS_WEB_APP=false
HAS_SHARED=false
HAS_MOBILE=false
HAS_WORKER=false
HAS_HELP_SITE=false

has_changes_in "web-app/" && HAS_WEB_APP=true
has_changes_in "packages/shared/" && HAS_SHARED=true
has_changes_in "packages/mobile/" && HAS_MOBILE=true
has_changes_in "worker/" && HAS_WORKER=true
has_changes_in "help-site/" && HAS_HELP_SITE=true

# Shared changes also affect web-app and mobile (downstream consumers)
if [ "$HAS_SHARED" = true ]; then
  HAS_WEB_APP=true
  HAS_MOBILE=true
fi

# Root config changes affect all packages
if echo "$STAGED_FILES" | grep -qE '^(package\.json|tsconfig\.json|eslint\.config)'; then
  HAS_WEB_APP=true
  HAS_SHARED=true
  HAS_MOBILE=true
  HAS_WORKER=true
fi

# Log affected packages
AFFECTED=""
[ "$HAS_WEB_APP" = true ] && AFFECTED="$AFFECTED web-app"
[ "$HAS_SHARED" = true ] && AFFECTED="$AFFECTED shared"
[ "$HAS_MOBILE" = true ] && AFFECTED="$AFFECTED mobile"
[ "$HAS_WORKER" = true ] && AFFECTED="$AFFECTED worker"
[ "$HAS_HELP_SITE" = true ] && AFFECTED="$AFFECTED help-site"
echo "  Affected packages:$AFFECTED"

# Generate API types if OpenAPI spec changed (run from root)
if [ "$HAS_OPENAPI" = true ]; then
  echo "OpenAPI spec changed, generating types..."
  cd "$ROOT_DIR"
  pnpm run generate:api
fi

# Create temp directory for parallel job outputs
TEMP_DIR=$(mktemp -d)
trap "rm -rf \"$TEMP_DIR\"" EXIT

# Optional: persist step outputs for external tools (e.g., Claude hooks)
# Set VALIDATION_STEPS_DIR to save per-step outputs (format.log, lint.log, etc.)
STEPS_DIR="${VALIDATION_STEPS_DIR:-}"

# =============================================================================
# VALIDATION FUNCTIONS
# =============================================================================

# Run a validation step in a specific directory and capture result
# Args: name, directory, command...
run_validation() {
  local name=$1
  local dir=$2
  shift 2
  local output_file="$TEMP_DIR/${name}.out"
  local result_file="$TEMP_DIR/${name}.result"

  # Ensure each background job runs from the correct directory
  cd "$dir"

  # Execute command directly via "$@" (avoids eval and command injection risks)
  if "$@" >"$output_file" 2>&1; then
    echo "0" >"$result_file"
  else
    echo "1" >"$result_file"
  fi
}

# Print result immediately when a job completes
print_result_immediate() {
  local name=$1
  local result=$2
  local output_file="$TEMP_DIR/${name}.out"

  if [ "$result" -eq 0 ]; then
    echo -e "${GREEN}✓ ${name} passed${NC}"
  else
    echo -e "${RED}✗ ${name} failed${NC}"
    echo ""
    cat "$output_file"
    echo ""
  fi
}

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

# =============================================================================
# LAUNCH PARALLEL VALIDATION JOBS
# =============================================================================

echo ""
echo -e "${BLUE}Running validation checks in parallel...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Arrays to track jobs
declare -a JOB_NAMES=()
declare -a JOB_PIDS=()

# Helper to launch a validation job
launch_job() {
  local name=$1
  local dir=$2
  shift 2
  run_validation "$name" "$dir" "$@" &
  JOB_NAMES+=("$name")
  JOB_PIDS+=($!)
}

# --- Web App checks ---
if [ "$HAS_WEB_APP" = true ]; then
  WEB_DIR="$ROOT_DIR/web-app"
  launch_job "web:format"  "$WEB_DIR" pnpm run format:check
  launch_job "web:lint"    "$WEB_DIR" pnpm run lint
  launch_job "web:knip"    "$WEB_DIR" pnpm run knip
  launch_job "web:test"    "$WEB_DIR" pnpm test
fi

# --- Shared package checks ---
if [ "$HAS_SHARED" = true ]; then
  SHARED_DIR="$ROOT_DIR/packages/shared"
  launch_job "shared:format"    "$SHARED_DIR" pnpm run format:check
  launch_job "shared:lint"      "$SHARED_DIR" pnpm run lint
  launch_job "shared:typecheck" "$SHARED_DIR" pnpm run typecheck
  launch_job "shared:test"      "$SHARED_DIR" pnpm test
fi

# --- Mobile package checks ---
if [ "$HAS_MOBILE" = true ]; then
  MOBILE_DIR="$ROOT_DIR/packages/mobile"
  launch_job "mobile:format"    "$MOBILE_DIR" pnpm run format:check
  launch_job "mobile:lint"      "$MOBILE_DIR" pnpm run lint
  launch_job "mobile:typecheck" "$MOBILE_DIR" pnpm run typecheck
  launch_job "mobile:test"      "$MOBILE_DIR" pnpm test
fi

# --- Worker checks ---
if [ "$HAS_WORKER" = true ]; then
  WORKER_DIR="$ROOT_DIR/worker"
  launch_job "worker:format" "$WORKER_DIR" pnpm run format:check
  launch_job "worker:lint"   "$WORKER_DIR" pnpm run lint
  launch_job "worker:test"   "$WORKER_DIR" pnpm test
fi

# --- Help site checks ---
if [ "$HAS_HELP_SITE" = true ]; then
  HELP_DIR="$ROOT_DIR/help-site"
  launch_job "help:format" "$HELP_DIR" pnpm run format:check
fi

NUM_JOBS=${#JOB_NAMES[@]}
echo "  Running $NUM_JOBS checks across:$AFFECTED"
echo ""

# =============================================================================
# MONITOR JOBS AND COLLECT RESULTS
# =============================================================================

declare -a JOB_DONE=()
declare -a JOB_RESULTS=()
for ((i=0; i<NUM_JOBS; i++)); do
  JOB_DONE+=("0")
  JOB_RESULTS+=("")
done

COMPLETED=0
while [ "$COMPLETED" -lt "$NUM_JOBS" ]; do
  for ((i=0; i<NUM_JOBS; i++)); do
    if [ "${JOB_DONE[$i]}" -eq 0 ] && ! kill -0 "${JOB_PIDS[$i]}" 2>/dev/null; then
      wait "${JOB_PIDS[$i]}" 2>/dev/null || true
      JOB_DONE[$i]=1
      JOB_RESULTS[$i]=$(cat "$TEMP_DIR/${JOB_NAMES[$i]}.result" 2>/dev/null || echo "1")
      print_result_immediate "${JOB_NAMES[$i]}" "${JOB_RESULTS[$i]}"
      COMPLETED=$((COMPLETED + 1))
    fi
  done

  if [ "$COMPLETED" -lt "$NUM_JOBS" ]; then
    sleep 0.2
  fi
done

# =============================================================================
# CHECK FOR FAILURES
# =============================================================================

HAS_FAILURES=false
for ((i=0; i<NUM_JOBS; i++)); do
  if [ "${JOB_RESULTS[$i]}" -ne 0 ]; then
    HAS_FAILURES=true
    break
  fi
done

# =============================================================================
# BUILD (only if all checks passed)
# =============================================================================

BUILD_RESULT=0
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$HAS_FAILURES" = false ]; then
  # Build shared first (dependency for web-app and mobile)
  if [ "$HAS_SHARED" = true ]; then
    echo "Building shared..."
    if (cd "$ROOT_DIR/packages/shared" && pnpm run build) ; then
      echo -e "${GREEN}shared build passed${NC}"
    else
      echo -e "${RED}shared build failed${NC}"
      BUILD_RESULT=1
    fi
  fi

  # Build web-app (only if shared build passed)
  if [ "$HAS_WEB_APP" = true ] && [ "$BUILD_RESULT" -eq 0 ]; then
    echo "Building web-app..."
    if (cd "$ROOT_DIR/web-app" && pnpm run build) ; then
      echo -e "${GREEN}web-app build passed${NC}"
    else
      echo -e "${RED}web-app build failed${NC}"
      BUILD_RESULT=1
    fi
  fi

  # Build help-site
  if [ "$HAS_HELP_SITE" = true ] && [ "$BUILD_RESULT" -eq 0 ]; then
    echo "Building help-site..."
    if (cd "$ROOT_DIR/help-site" && pnpm run build) ; then
      echo -e "${GREEN}help-site build passed${NC}"
    else
      echo -e "${RED}help-site build failed${NC}"
      BUILD_RESULT=1
    fi
  fi
else
  echo -e "${YELLOW}Build skipped (previous checks failed)${NC}"
  BUILD_RESULT=2
fi

# =============================================================================
# SUMMARY
# =============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Validation Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for ((i=0; i<NUM_JOBS; i++)); do
  print_status "${JOB_NAMES[$i]}" "${JOB_RESULTS[$i]}"
done
print_status "Build" "$BUILD_RESULT"

# Exit with error if any check failed
if [ "$HAS_FAILURES" = true ] || [ "$BUILD_RESULT" -eq 1 ]; then
  # Save per-step outputs if STEPS_DIR is set (for Claude hooks)
  if [ -n "$STEPS_DIR" ]; then
    mkdir -p "$STEPS_DIR"
    for ((i=0; i<NUM_JOBS; i++)); do
      local_name="${JOB_NAMES[$i]}"
      [ -f "$TEMP_DIR/${local_name}.out" ] && cp "$TEMP_DIR/${local_name}.out" "$STEPS_DIR/${local_name}.log"
    done
    echo "Step outputs saved to $STEPS_DIR"
  fi

  echo ""
  echo -e "${RED}Commit blocked: Fix the issues above before committing${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}All checks passed! Commit allowed.${NC}"
exit 0
