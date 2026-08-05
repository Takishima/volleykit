#!/usr/bin/env bash
# Execution layer for scripts/validate.sh: run the selected checks in two
# parallel waves and render the summary. Meant to be sourced; operates on the
# caller's registry state (CHECK_* tables, FP, SELECTED, CACHED) and the cache
# primitives from scripts/validation-lib.sh.
#
# Wave order: everything that is not a build fully parallel, then all builds
# in parallel. packages/shared exposes its subpath exports as ./src/*.ts and
# nothing resolves packages/shared/dist, so web:build does not consume
# shared:build — the builds are independent of each other.

# Run one check. CHECK_CMD is space-separated argv; composite commands need a
# shell and are handled by name (`__format__`, `__web_build__`).
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
      mapfile -t files <<<"${CHECK_ARGS[$name]}"
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
      # `read -ra` splits on IFS and does no glob or command expansion; the
      # registration guard has already rejected metacharacters.
      local -a cmd=()
      read -ra cmd <<<"${CHECK_CMD[$name]}"
      "${cmd[@]}" >"$out" 2>&1 && ok=0
      ;;
  esac

  echo "$ok" >"$res"
}

declare -a WAVE_NAMES=() WAVE_PIDS=()
declare -A RESULT=()
FAILED=false

launch() {
  run_check "$1" &
  WAVE_NAMES+=("$1")
  WAVE_PIDS+=($!)
}

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

# Run every selected check: non-builds in parallel, then builds in parallel.
# Sets RESULT and FAILED.
run_selected_checks() {
  local name
  for name in "${SELECTED[@]}"; do
    [ "${CHECK_CLASS[$name]}" = "build" ] && continue
    launch "$name"
  done
  [ ${#WAVE_NAMES[@]} -gt 0 ] && echo -e "${DIM}running ${#WAVE_NAMES[@]} check(s)...${NC}"
  await_wave

  if [ "$FAILED" = false ]; then
    for name in "${SELECTED[@]}"; do
      [ "${CHECK_CLASS[$name]}" = "build" ] && launch "$name"
    done
    [ ${#WAVE_NAMES[@]} -gt 0 ] && echo -e "${DIM}building...${NC}"
    await_wave
  fi
}

print_summary() {
  local name
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
}
