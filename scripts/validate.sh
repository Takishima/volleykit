#!/usr/bin/env bash
# VolleyKit validation runner.
#
#   scripts/validate.sh              # everything the commit gate requires
#   scripts/validate.sh lint         # only lint, across affected packages
#   scripts/validate.sh lint test    # several classes
#   scripts/validate.sh --gate       # report what is still missing, run nothing
#   scripts/validate.sh --no-cache   # force a full re-run
#   scripts/validate.sh --clear      # drop the cache
#
# Results are cached by input content hash, so a check run mid-work is not
# re-run at commit time, and fixing one package does not re-run the others.
#
# Classes: format, tokens, lint, typecheck, test, build
#
# Only runs in the Claude Code web environment (CLAUDE_CODE_REMOTE=true).
# Human developers rely on CI.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./validation-lib.sh
source "$SCRIPT_DIR/validation-lib.sh"

# =============================================================================
# ARGUMENTS
# =============================================================================

GATE_MODE=false
declare -a CLASS_FILTER=()

for arg in "$@"; do
  case "$arg" in
    --gate) GATE_MODE=true ;;
    --no-cache) export VOLLEYKIT_NO_CACHE=1 ;;
    --clear)
      cache_clear
      echo "Validation cache cleared."
      exit 0
      ;;
    -h | --help)
      sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    all) ;;
    format | tokens | lint | typecheck | test | build) CLASS_FILTER+=("$arg") ;;
    *)
      echo "Unknown argument: $arg (see --help)" >&2
      exit 2
      ;;
  esac
done

# =============================================================================
# CHANGE DETECTION
# =============================================================================

# Gate mode is machine-readable: it prints missing check names and nothing else.
say() { [ "$GATE_MODE" = true ] || echo -e "$@"; }

CHANGED=$(changed_files)

if [ -z "$CHANGED" ]; then
  say "${GREEN}No changes, nothing to validate.${NC}"
  exit 0
fi

has_change_in() { echo "$CHANGED" | grep -q "^$1"; }
matches() { echo "$CHANGED" | grep -qE "$1"; }

# Docs-only changes need no validation.
if ! echo "$CHANGED" | grep -qvE '\.md$'; then
  say "${GREEN}Documentation-only changes, nothing to validate.${NC}"
  exit 0
fi

SOURCE_PATTERN='\.(ts|tsx|js|jsx|mjs|astro)$'
CONFIG_PATTERN='(package\.json|pnpm-lock\.yaml|tsconfig\.json|vite\.config|eslint\.config)'

if ! matches "$SOURCE_PATTERN" && ! matches "$CONFIG_PATTERN"; then
  say "${YELLOW}No source or config changes, nothing to validate.${NC}"
  exit 0
fi

# =============================================================================
# AFFECTED PACKAGES
# =============================================================================

HAS_WEB=false
HAS_SHARED=false
HAS_MOBILE=false
HAS_WORKER=false
HAS_HELP=false

has_change_in "packages/web/" && HAS_WEB=true
has_change_in "packages/shared/" && HAS_SHARED=true
has_change_in "packages/mobile/" && HAS_MOBILE=true
has_change_in "packages/worker/" && HAS_WORKER=true
has_change_in "help-site/" && HAS_HELP=true

# Shared changes always reach web; they reach mobile only when the exported
# API surface moves (index barrels, types, hooks, stores, api).
if [ "$HAS_SHARED" = true ]; then
  HAS_WEB=true
  if matches "^packages/shared/src/(index\.ts|[^/]+/index\.ts|types/|hooks/|stores/|api/)"; then
    HAS_MOBILE=true
  fi
fi

# Root config changes reach every package.
if matches '^(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|tsconfig\.json|eslint\.config)'; then
  HAS_WEB=true
  HAS_SHARED=true
  HAS_MOBILE=true
  HAS_WORKER=true
  HAS_HELP=true
fi

AFFECTED=""
[ "$HAS_WEB" = true ] && AFFECTED="$AFFECTED web"
[ "$HAS_SHARED" = true ] && AFFECTED="$AFFECTED shared"
[ "$HAS_MOBILE" = true ] && AFFECTED="$AFFECTED mobile"
[ "$HAS_WORKER" = true ] && AFFECTED="$AFFECTED worker"
[ "$HAS_HELP" = true ] && AFFECTED="$AFFECTED help-site"

# =============================================================================
# REGISTRY
# =============================================================================

WEB_INPUTS="packages/web packages/shared/src"
SHARED_INPUTS="packages/shared"
MOBILE_INPUTS="packages/mobile packages/shared/src"
WORKER_INPUTS="packages/worker"
HELP_INPUTS="help-site"

# Files prettier should check: everything changed with a formattable extension.
FORMAT_FILES=$(echo "$CHANGED" | grep -E '\.(ts|tsx|js|jsx|mjs|json|css|astro|md)$' || true)

if [ -n "$FORMAT_FILES" ]; then
  register_check "format" "format" "$ROOT_DIR" "__format__" "$(echo "$FORMAT_FILES" | tr '\n' ' ')"
fi

if has_change_in "packages/shared/styles/"; then
  register_check "tokens" "tokens" "$ROOT_DIR" \
    "node scripts/sync-style-tokens.js --check" \
    "packages/shared/styles scripts/sync-style-tokens.js"
fi

if [ "$HAS_WEB" = true ]; then
  register_check "web:lint" "lint" "$ROOT_DIR/packages/web" "pnpm run lint" "$WEB_INPUTS"
  register_check "web:test" "test" "$ROOT_DIR/packages/web" "pnpm test" "$WEB_INPUTS"
  # `build` is `tsc -b && vite build`, so it covers typecheck. `size` is folded
  # in because it can only run against a fresh build.
  register_check "web:build" "build" "$ROOT_DIR/packages/web" "__web_build__" "$WEB_INPUTS"
fi

if [ "$HAS_SHARED" = true ]; then
  register_check "shared:lint" "lint" "$ROOT_DIR/packages/shared" "pnpm run lint" "$SHARED_INPUTS"
  register_check "shared:typecheck" "typecheck" "$ROOT_DIR/packages/shared" "pnpm run typecheck" "$SHARED_INPUTS"
  register_check "shared:test" "test" "$ROOT_DIR/packages/shared" "pnpm test" "$SHARED_INPUTS"
  register_check "shared:build" "build" "$ROOT_DIR/packages/shared" "pnpm run build" "$SHARED_INPUTS"
fi

if [ "$HAS_MOBILE" = true ]; then
  register_check "mobile:lint" "lint" "$ROOT_DIR/packages/mobile" "pnpm run lint" "$MOBILE_INPUTS"
  register_check "mobile:typecheck" "typecheck" "$ROOT_DIR/packages/mobile" "pnpm run typecheck" "$MOBILE_INPUTS"
  register_check "mobile:test" "test" "$ROOT_DIR/packages/mobile" "pnpm test" "$MOBILE_INPUTS"
fi

if [ "$HAS_WORKER" = true ]; then
  register_check "worker:lint" "lint" "$ROOT_DIR/packages/worker" "pnpm run lint" "$WORKER_INPUTS"
  register_check "worker:test" "test" "$ROOT_DIR/packages/worker" "pnpm test" "$WORKER_INPUTS"
fi

if [ "$HAS_HELP" = true ]; then
  register_check "help-site:build" "build" "$ROOT_DIR/help-site" "pnpm run build" "$HELP_INPUTS"
fi

# =============================================================================
# SELECTION
# =============================================================================

wanted_class() {
  [ ${#CLASS_FILTER[@]} -eq 0 ] && return 0
  local c
  for c in "${CLASS_FILTER[@]}"; do
    [ "$c" = "$1" ] && return 0
  done
  return 1
}

declare -a SELECTED=()
declare -a CACHED=()
declare -A FP=()

if [ ${#CHECK_NAMES[@]} -eq 0 ]; then
  say "${YELLOW}Changes touch no validated package, nothing to validate.${NC}"
  exit 0
fi

for name in "${CHECK_NAMES[@]}"; do
  wanted_class "${CHECK_CLASS[$name]}" || continue
  FP["$name"]=$(fingerprint_for_check "$name")
  if cache_hit "$name" "${FP[$name]}"; then
    CACHED+=("$name")
  else
    SELECTED+=("$name")
  fi
done

# =============================================================================
# GATE MODE
# =============================================================================

if [ "$GATE_MODE" = true ]; then
  if [ ${#SELECTED[@]} -eq 0 ]; then
    exit 0
  fi
  printf '%s\n' "${SELECTED[@]}"
  exit 1
fi

# =============================================================================
# API TYPE GENERATION
# =============================================================================

if matches 'volleymanager-openapi\.yaml'; then
  echo "OpenAPI spec changed, regenerating types..."
  (cd "$ROOT_DIR" && pnpm run generate:api)
fi

# =============================================================================
# EXECUTION
# =============================================================================

echo -e "${BLUE}Validating:${NC}$AFFECTED"
if [ ${#CACHED[@]} -gt 0 ]; then
  echo -e "  ${DIM}cached (skipped): ${CACHED[*]}${NC}"
fi

if [ ${#SELECTED[@]} -eq 0 ]; then
  echo -e "${GREEN}All checks already passed for the current changes.${NC}"
  exit 0
fi

TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

# Run one check. Two checks need composite commands and are handled by name.
run_check() {
  local name=$1
  local out="$TEMP_DIR/$name.out"
  local res="$TEMP_DIR/$name.result"

  cd "${CHECK_DIR[$name]}"

  local ok=1
  case "${CHECK_CMD[$name]}" in
    __format__)
      # shellcheck disable=SC2086  # file list is intentionally word-split
      pnpm exec prettier --check ${CHECK_PATHS[$name]} >"$out" 2>&1 && ok=0
      ;;
    __web_build__)
      if pnpm run build >"$out" 2>&1; then
        pnpm run size >>"$out" 2>&1 && ok=0
      fi
      ;;
    *)
      local -a cmd
      read -ra cmd <<<"${CHECK_CMD[$name]}"
      "${cmd[@]}" >"$out" 2>&1 && ok=0
      ;;
  esac

  echo "$ok" >"$res"
}

declare -a WAVE_NAMES=()
declare -a WAVE_PIDS=()

launch() {
  run_check "$1" &
  WAVE_NAMES+=("$1")
  WAVE_PIDS+=($!)
}

declare -A RESULT=()
FAILED=false

# Wait for a wave, printing each result the moment its job exits.
await_wave() {
  local n=${#WAVE_NAMES[@]}
  [ "$n" -eq 0 ] && return 0
  local -a done_flags=()
  local i
  for ((i = 0; i < n; i++)); do done_flags+=("0"); done

  local completed=0
  while [ "$completed" -lt "$n" ]; do
    for ((i = 0; i < n; i++)); do
      if [ "${done_flags[$i]}" -eq 0 ] && ! kill -0 "${WAVE_PIDS[$i]}" 2>/dev/null; then
        wait "${WAVE_PIDS[$i]}" 2>/dev/null || true
        done_flags[i]=1
        completed=$((completed + 1))
        local nm="${WAVE_NAMES[$i]}"
        local r
        r=$(cat "$TEMP_DIR/$nm.result" 2>/dev/null || echo "1")
        RESULT["$nm"]=$r
        if [ "$r" -eq 0 ]; then
          echo -e "${GREEN}✓ $nm${NC}"
          cache_store "$nm" "${FP[$nm]}"
        else
          echo -e "${RED}✗ $nm${NC}"
          echo ""
          cat "$TEMP_DIR/$nm.out"
          echo ""
          cache_drop "$nm"
          FAILED=true
        fi
      fi
    done
    [ "$completed" -lt "$n" ] && sleep 0.2
  done

  WAVE_NAMES=()
  WAVE_PIDS=()
}

selected_has() {
  local n
  for n in "${SELECTED[@]}"; do [ "$n" = "$1" ] && return 0; done
  return 1
}

# --- Wave 1: everything that is not a build, fully parallel ---
for name in "${SELECTED[@]}"; do
  [ "${CHECK_CLASS[$name]}" = "build" ] && continue
  launch "$name"
done
[ ${#WAVE_NAMES[@]} -gt 0 ] && echo -e "${DIM}running ${#WAVE_NAMES[@]} check(s)...${NC}"
await_wave

# --- Wave 2: shared build (dependency of web build) ---
if [ "$FAILED" = false ] && selected_has "shared:build"; then
  launch "shared:build"
  await_wave
fi

# --- Wave 3: web + help-site builds, independent of each other ---
if [ "$FAILED" = false ]; then
  for name in "web:build" "help-site:build"; do
    selected_has "$name" && launch "$name"
  done
  [ ${#WAVE_NAMES[@]} -gt 0 ] && echo -e "${DIM}building...${NC}"
  await_wave
fi

# =============================================================================
# SUMMARY
# =============================================================================

echo ""
echo "────────────────────────────────────────"
for name in "${CACHED[@]}"; do
  echo -e "  ${DIM}[CACHED]${NC} $name"
done
for name in "${SELECTED[@]}"; do
  case "${RESULT[$name]:-skip}" in
    0) echo -e "  ${GREEN}[PASS]${NC}   $name" ;;
    skip) echo -e "  ${YELLOW}[SKIP]${NC}   $name" ;;
    *) echo -e "  ${RED}[FAIL]${NC}   $name" ;;
  esac
done
echo "────────────────────────────────────────"

if [ "$FAILED" = true ]; then
  echo -e "${RED}Validation failed. Fix the issues above and re-run — passing checks are cached and will be skipped.${NC}"
  exit 1
fi

# A partial run (class filter) is not enough to open the commit gate; say so.
if [ ${#CLASS_FILTER[@]} -gt 0 ]; then
  if VOLLEYKIT_NO_CACHE=0 "$SCRIPT_DIR/validate.sh" --gate >/dev/null 2>&1; then
    echo -e "${GREEN}All checks pass. Commit gate is open.${NC}"
  else
    REMAINING=$(VOLLEYKIT_NO_CACHE=0 "$SCRIPT_DIR/validate.sh" --gate 2>/dev/null | tr '\n' ' ' || true)
    echo -e "${GREEN}Passed.${NC} Still required before commit:${YELLOW} $REMAINING${NC}"
  fi
else
  echo -e "${GREEN}All checks passed. Commit gate is open.${NC}"
fi
