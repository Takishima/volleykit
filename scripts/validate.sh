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
# The commit gate (.claude/hooks/pre-git-commit.sh) is active only in Claude
# Code web sessions. This script itself runs anywhere.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./validation-lib.sh
source "$SCRIPT_DIR/validation-lib.sh" || exit 1
cd "$ROOT_DIR"

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
      sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'
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

# Gate mode is machine-readable: it prints missing check names and nothing else.
say() { [ "$GATE_MODE" = true ] || echo -e "$@"; }

# =============================================================================
# PACKAGE TABLE
# =============================================================================
#
# One table, two consumers. A package's input paths decide BOTH whether the
# package is affected by the current changes AND what invalidates its cache
# entries. Encoding those separately is how a package ends up unvalidated: the
# earlier version tested affectedness against a hand-written list of shared
# barrel files that omitted utils/, i18n/, adapters/ and offline/, so a change
# to any of those skipped mobile's checks entirely while still claiming a pass.
#
# Adding a package means adding a row here and a register_check block below.

declare -a PKG_NAMES=(web shared mobile worker help-site)
declare -A PKG_INPUTS=(
  [web]="packages/web packages/shared/src packages/shared/package.json docs/api/volleymanager-openapi.yaml"
  [shared]="packages/shared docs/api/volleymanager-openapi.yaml"
  [mobile]="packages/mobile packages/shared/src packages/shared/package.json docs/api/volleymanager-openapi.yaml"
  [worker]="packages/worker"
  [help-site]="help-site"
)

# Files that invalidate every check in the repo. The validation scripts are
# included on purpose: changing a check's command or input paths must not leave
# stale PASS entries behind.
ROOT_PATHS="package.json pnpm-lock.yaml pnpm-workspace.yaml .prettierrc.json .prettierignore scripts/validate.sh scripts/validation-lib.sh"

# =============================================================================
# CHANGE DETECTION
# =============================================================================

CHANGED=$(changed_files)

if [ -z "$CHANGED" ]; then
  say "${GREEN}No changes, nothing to validate.${NC}"
  exit 0
fi

matches() { echo "$CHANGED" | grep -qE "$1"; }

# Docs-only changes need no validation.
if ! echo "$CHANGED" | grep -qvE '\.md$'; then
  say "${GREEN}Documentation-only changes, nothing to validate.${NC}"
  exit 0
fi

SOURCE_PATTERN='\.(ts|tsx|js|jsx|mjs|astro)$'
CONFIG_PATTERN='(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|tsconfig\.json|vite\.config|eslint\.config|\.prettierrc|\.prettierignore|volleymanager-openapi\.yaml)'

if ! matches "$SOURCE_PATTERN" && ! matches "$CONFIG_PATTERN"; then
  say "${YELLOW}No source or config changes, nothing to validate.${NC}"
  exit 0
fi

# =============================================================================
# API TYPE GENERATION
# =============================================================================
#
# Must happen before any fingerprint is taken: it writes
# packages/shared/src/api/schema.ts, which is an input of web, shared and
# mobile. Generating afterwards would store cache entries keyed on
# pre-generation content and miss on every subsequent run.
#
# Gate mode never mutates the worktree; if the spec changed without the schema
# being regenerated, the gate simply reports the checks as missing.

if [ "$GATE_MODE" = false ] && matches 'volleymanager-openapi\.yaml'; then
  echo "OpenAPI spec changed, regenerating types..."
  pnpm run generate:api
  CHANGED=$(changed_files)
fi

# =============================================================================
# AFFECTED PACKAGES
# =============================================================================

# Turn a space-separated pathspec list into an anchored regex matching those
# paths and anything beneath them.
paths_to_regex() {
  local out="" p
  for p in $1; do
    p=${p//./\\.}
    out="${out:+$out|}$p"
  done
  printf '^(%s)(/|$)' "$out"
}

ROOT_CHANGED=false
matches "$(paths_to_regex "$ROOT_PATHS")" && ROOT_CHANGED=true

declare -A AFFECTED=()
AFFECTED_LIST=""
for pkg in "${PKG_NAMES[@]}"; do
  if [ "$ROOT_CHANGED" = true ] || matches "$(paths_to_regex "${PKG_INPUTS[$pkg]}")"; then
    AFFECTED["$pkg"]=1
    AFFECTED_LIST="$AFFECTED_LIST $pkg"
  fi
done

affected() { [ -n "${AFFECTED[$1]:-}" ]; }

# =============================================================================
# CHECK REGISTRY
# =============================================================================

declare -a CHECK_NAMES=()
declare -A CHECK_CLASS=() CHECK_DIR=() CHECK_CMD=() CHECK_PATHS=()

register_check() {
  local name=$1 class=$2 dir=$3 cmd=$4 paths=$5
  CHECK_NAMES+=("$name")
  CHECK_CLASS["$name"]=$class
  CHECK_DIR["$name"]=$dir
  CHECK_CMD["$name"]=$cmd
  CHECK_PATHS["$name"]=$paths
}

fingerprint_for_check() {
  # shellcheck disable=SC2086  # pathspecs are intentionally word-split
  fingerprint $ROOT_PATHS ${CHECK_PATHS[$1]}
}

# --- format: prettier over the changed files, minus any that were deleted ---
# (prettier exits non-zero on a path that is not there, which would leave the
# gate permanently closed until the deletion was committed)
FORMAT_FILES=$(echo "$CHANGED" | grep -E '\.(ts|tsx|js|jsx|mjs|json|css|astro|md)$' | while IFS= read -r f; do
  [ -f "$f" ] && printf '%s\n' "$f"
done || true)

if [ -n "$FORMAT_FILES" ]; then
  register_check "format" "format" "$ROOT_DIR" "__format__" "$FORMAT_FILES"
fi

if matches '^packages/shared/styles/'; then
  register_check "tokens" "tokens" "$ROOT_DIR" \
    "node scripts/sync-style-tokens.js --check" \
    "packages/shared/styles scripts/sync-style-tokens.js"
fi

if affected web; then
  register_check "web:lint" "lint" "$ROOT_DIR/packages/web" "pnpm run lint" "${PKG_INPUTS[web]}"
  register_check "web:test" "test" "$ROOT_DIR/packages/web" "pnpm test" "${PKG_INPUTS[web]}"
  # `build` is `tsc -b && vite build`, so it covers typecheck. `size` is folded
  # in because it can only run against a fresh build.
  register_check "web:build" "build" "$ROOT_DIR/packages/web" "__web_build__" "${PKG_INPUTS[web]}"
fi

if affected shared; then
  register_check "shared:lint" "lint" "$ROOT_DIR/packages/shared" "pnpm run lint" "${PKG_INPUTS[shared]}"
  register_check "shared:typecheck" "typecheck" "$ROOT_DIR/packages/shared" "pnpm run typecheck" "${PKG_INPUTS[shared]}"
  register_check "shared:test" "test" "$ROOT_DIR/packages/shared" "pnpm test" "${PKG_INPUTS[shared]}"
  register_check "shared:build" "build" "$ROOT_DIR/packages/shared" "pnpm run build" "${PKG_INPUTS[shared]}"
fi

if affected mobile; then
  register_check "mobile:lint" "lint" "$ROOT_DIR/packages/mobile" "pnpm run lint" "${PKG_INPUTS[mobile]}"
  register_check "mobile:typecheck" "typecheck" "$ROOT_DIR/packages/mobile" "pnpm run typecheck" "${PKG_INPUTS[mobile]}"
  register_check "mobile:test" "test" "$ROOT_DIR/packages/mobile" "pnpm test" "${PKG_INPUTS[mobile]}"
fi

if affected worker; then
  register_check "worker:lint" "lint" "$ROOT_DIR/packages/worker" "pnpm run lint" "${PKG_INPUTS[worker]}"
  register_check "worker:test" "test" "$ROOT_DIR/packages/worker" "pnpm test" "${PKG_INPUTS[worker]}"
fi

if affected help-site; then
  register_check "help-site:build" "build" "$ROOT_DIR/help-site" "pnpm run build" "${PKG_INPUTS[help-site]}"
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

declare -a SELECTED=() CACHED=()
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
  [ ${#SELECTED[@]} -gt 0 ] && printf '%s\n' "${SELECTED[@]}"

  # The checks read the worktree; a commit records the index. If any validated
  # file differs between the two, what is about to be committed is not what was
  # validated — a broken staged blob fixed only in the worktree would otherwise
  # sail through. Reported only when something is actually staged.
  DIVERGED=""
  if ! git diff --cached --quiet 2>/dev/null; then
    ALL_PATHS="$ROOT_PATHS"
    for pkg in "${!AFFECTED[@]}"; do ALL_PATHS="$ALL_PATHS ${PKG_INPUTS[$pkg]}"; done
    # shellcheck disable=SC2086  # pathspecs are intentionally word-split
    DIVERGED=$(staged_worktree_divergence $ALL_PATHS)
  fi
  if [ -n "$DIVERGED" ]; then
    echo "unstaged changes in validated files (stage them, then re-validate):"
    echo "$DIVERGED" | sed 's/^/    /'
  fi

  { [ ${#SELECTED[@]} -eq 0 ] && [ -z "$DIVERGED" ]; } && exit 0
  exit 1
fi

# =============================================================================
# EXECUTION
# =============================================================================

echo -e "${BLUE}Validating:${NC}$AFFECTED_LIST"
if [ ${#CACHED[@]} -gt 0 ]; then
  echo -e "  ${DIM}cached (skipped): ${CACHED[*]}${NC}"
fi

# For a partial run, say whether the gate as a whole is open.
report_gate_status() {
  local remaining
  remaining=$(VOLLEYKIT_NO_CACHE=0 "$SCRIPT_DIR/validate.sh" --gate 2>/dev/null | tr '\n' ' ' || true)
  if [ -z "${remaining// /}" ]; then
    echo -e "${GREEN}All checks pass. Commit gate is open.${NC}"
  else
    echo -e "${GREEN}Passed.${NC} Still required before commit:${YELLOW} $remaining${NC}"
  fi
}

if [ ${#SELECTED[@]} -eq 0 ]; then
  echo -e "${GREEN}All checks already passed for the current changes.${NC}"
  report_gate_status
  exit 0
fi

TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

# Run one check. Two checks need composite commands and are handled by name.
run_check() {
  local name=$1
  local out="$TEMP_DIR/$name.out"
  local res="$TEMP_DIR/$name.result"

  if ! cd "${CHECK_DIR[$name]}"; then
    echo "Cannot enter ${CHECK_DIR[$name]}" >"$out"
    echo 1 >"$res"
    return
  fi

  local ok=1
  case "${CHECK_CMD[$name]}" in
    __format__)
      # Newline-separated so paths containing spaces survive.
      local -a files=()
      mapfile -t files <<<"${CHECK_PATHS[$name]}"
      pnpm exec prettier --check "${files[@]}" >"$out" 2>&1 && ok=0
      ;;
    __web_build__)
      if pnpm run build >"$out" 2>&1; then
        if pnpm run size >>"$out" 2>&1; then
          ok=0
        else
          echo "" >>"$out"
          echo "Bundle size exceeded the limits in packages/web/package.json (\"size-limit\")." >>"$out"
          echo "Note: CI builds the merge commit and lands ~10-15 kB above a local build." >>"$out"
        fi
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

declare -a WAVE_NAMES=() WAVE_PIDS=()

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

# --- Wave 1: everything that is not a build, fully parallel ---
for name in "${SELECTED[@]}"; do
  [ "${CHECK_CLASS[$name]}" = "build" ] && continue
  launch "$name"
done
[ ${#WAVE_NAMES[@]} -gt 0 ] && echo -e "${DIM}running ${#WAVE_NAMES[@]} check(s)...${NC}"
await_wave

# --- Wave 2: builds, all parallel ---
# packages/shared exposes its subpath exports as ./src/*.ts and nothing
# resolves packages/shared/dist, so web:build does not consume shared:build.
# They are independent.
if [ "$FAILED" = false ]; then
  for name in "${SELECTED[@]}"; do
    [ "${CHECK_CLASS[$name]}" = "build" ] && launch "$name"
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

report_gate_status
