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
# END HELP
#
# Layout: scripts/validation-lib.sh holds git/cache primitives,
# scripts/validation-policy.sh the package/inputs tables, and
# scripts/validation-run.sh the parallel executor. This file is selection,
# registry and the gate protocol.
#
# The commit gate (.claude/hooks/pre-git-commit.sh) is active only in Claude
# Code web sessions. This script itself runs anywhere.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Every load below is paired with record_load, which — as soon as the policy
# table is available — refuses any recorded path not declared in
# VALIDATION_SCRIPTS: exit 3, the hook reports a broken gate, never an open
# one. That makes "the declared set covers the loaded set" a property of
# every invocation, on whatever arm or branch the load sits. CORE_ROOT
# contains $VALIDATION_SCRIPTS, so a declared load is by construction one
# whose edits invalidate every cached result.
#
# Recording is deliberately separate from sourcing: a `source` inside a
# function frame silently makes the sourced file's bare `declare`s
# function-local, so the loads stay at top level and the helper only checks.
# The suite audits an xtrace-instrumented run: every file bash actually
# executes from must be declared, whatever syntax loaded it — see the
# "every file the traced runs load is declared" row.
LOADED_SCRIPTS="scripts/validate.sh"
record_load() {
  LOADED_SCRIPTS="$LOADED_SCRIPTS $1"
  [ -n "${VALIDATION_SCRIPTS:-}" ] || return 0
  # Re-checked after every load once the policy is present, which covers the
  # loads recorded before it (the lib and the policy itself).
  local s
  # shellcheck disable=SC2086  # our own constants: split on purpose
  for s in $LOADED_SCRIPTS; do
    case " $VALIDATION_SCRIPTS " in
      *" $s "*) ;;
      *)
        echo "validate.sh: loaded $s, which is not declared in VALIDATION_SCRIPTS" >&2
        echo "(scripts/validation-policy.sh). Declare it so its edits invalidate" >&2
        echo "cached results; the gate fails closed until then." >&2
        exit 3
        ;;
    esac
  done
}

# shellcheck source=./validation-lib.sh
source "$SCRIPT_DIR/validation-lib.sh" || exit 3
record_load scripts/validation-lib.sh
cd "$ROOT_DIR"
# shellcheck source=./validation-policy.sh
source "$SCRIPT_DIR/validation-policy.sh" || exit 3
record_load scripts/validation-policy.sh
# shellcheck source=./validation-run.sh
source "$SCRIPT_DIR/validation-run.sh" || exit 3
record_load scripts/validation-run.sh

# =============================================================================
# ARGUMENTS
# =============================================================================

GATE_MODE=false
declare -a CLASS_FILTER=()
# Runner-internal: cache_hit reads it in this process, and nothing downstream
# of run_check should. `export -n` is required, not just declining to export —
# a plain assignment to a name that arrived exported keeps the attribute, so
# `VOLLEYKIT_NO_CACHE=1 scripts/validate.sh` would ship it into every check's
# environment.
# shellcheck disable=SC2034  # read by cache_hit in validation-lib.sh
VOLLEYKIT_NO_CACHE="${VOLLEYKIT_NO_CACHE:-}"
export -n VOLLEYKIT_NO_CACHE

for arg in "$@"; do
  case "$arg" in
    --gate) GATE_MODE=true ;;
    --no-cache) VOLLEYKIT_NO_CACHE=1 ;;
    --clear)
      cache_clear
      echo "Validation cache cleared."
      exit 0
      ;;
    -h | --help)
      # The sentinel keeps header edits from silently truncating the help.
      # $SCRIPT_DIR, not $0: the script has already cd'd to the repo root, so
      # a relative $0 no longer resolves.
      sed -n '2,/^# END HELP/p' "$SCRIPT_DIR/validate.sh" | sed '$d' | sed 's/^# \{0,1\}//'
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

# The gate is always the whole required set; narrowing it to one class would
# report an open gate that is not open.
if [ "$GATE_MODE" = true ] && [ ${#CLASS_FILTER[@]} -gt 0 ]; then
  echo "--gate reports the whole required set and cannot be combined with a class filter." >&2
  exit 2
fi

# Gate mode's stdout is a machine-readable record stream (see the GATE MODE
# block below); say() keeps human commentary off it.
say() { [ "$GATE_MODE" = true ] || echo -e "$@"; }

# =============================================================================
# CHANGE DETECTION
# =============================================================================

# A non-zero return means git cannot represent some path in the change set.
# Exiting 3 rather than 0 or 1 makes the hook report a broken gate instead of
# an open one — an unrepresentable path must not read as "no changes".
if ! CHANGED=$(changed_files); then
  exit 3
fi

if [ -z "$CHANGED" ]; then
  say "${GREEN}No changes, nothing to validate.${NC}"
  exit 0
fi

matches() { echo "$CHANGED" | grep -qE "$1"; }

# Docs-only changes still register `format` — markdown is in the format
# glob and nothing else gates it — but skip every package check: a README
# under packages/web says nothing about whether the web tests still pass.
DOCS_ONLY=false
if ! echo "$CHANGED" | grep -qvE '\.md$'; then
  DOCS_ONLY=true
fi

# Deliberately no source/config extension filter here. An earlier design had
# one, and it was a second copy of "does this change validate to anything" — a
# question the registry below already answers by ending up empty. The two
# copies drifted twice: the pattern omitted `css`, making the design-token
# check unreachable for the very file it watches, and it matched
# `tsconfig.json` but not `tsconfig.app.json`, which is what `tsc -b` reads.
# Both commits passed the gate with nothing run.
#
# The cost of dropping it is that an asset-only change under a package runs
# that package's checks. That is the conservative direction, it is cached, and
# it cannot silently skip.

# =============================================================================
# API TYPE GENERATION
# =============================================================================
#
# Runs before any fingerprint is computed, because typecheck and build read the
# generated packages/shared/src/api/schema.ts. Generating after fingerprinting
# would store cache entries keyed on pre-generation content, guaranteeing a
# full cache miss on the next run.
#
# The generated schema is NOT a cache input: packages/shared/.gitignore
# excludes it, so no fingerprint ever contains it. Invalidation comes from
# $API_SPEC being in PKG_INPUTS — the spec is the tracked file, the schema is
# its derivative.
#
# Gate mode never mutates the worktree; if the spec changed without the schema
# being regenerated, the gate simply reports the checks as missing.

if [ "$GATE_MODE" = false ] && matches "$(paths_to_regex "$API_SPEC")"; then
  echo "OpenAPI spec changed, regenerating types..."
  pnpm run generate:api
  CHANGED=$(changed_files) || exit 3
fi

# =============================================================================
# AFFECTED PACKAGES
# =============================================================================

ROOT_CHANGED=false
declare -A AFFECTED=()
AFFECTED_LIST=""

if [ "$DOCS_ONLY" = false ]; then
  matches "$(paths_to_regex "$CORE_ROOT")" && ROOT_CHANGED=true
  for pkg in "${PKG_NAMES[@]}"; do
    if [ "$ROOT_CHANGED" = true ] || matches "$(paths_to_regex "${PKG_INPUTS[$pkg]}")"; then
      AFFECTED["$pkg"]=1
      AFFECTED_LIST="$AFFECTED_LIST $pkg"
    fi
  done
fi

affected() { [ -n "${AFFECTED[$1]:-}" ]; }

# =============================================================================
# CHECK REGISTRY
# =============================================================================

declare -a CHECK_NAMES=()
# shellcheck disable=SC2034  # CHECK_DIR/CMD/ARGS are consumed by validation-run.sh
declare -A CHECK_CLASS=() CHECK_DIR=() CHECK_CMD=() CHECK_PATHS=() CHECK_ARGS=()

# CHECK_PATHS is stored newline-separated so filenames containing spaces
# survive — splitting "my file.ts" on IFS would produce two pathspecs matching
# nothing, silently dropping the file from that check's cache key and, because
# the hash of an empty listing is a constant, leaving the check green forever.
#
# CHECK_CMD is a plain space-separated command. run_check splits it with
# `read -ra` (which does no glob expansion) and execs the result — no shell.
# The guard below rejects shell metacharacters at registration: `a.sh && b.sh`
# handed to exec would pass `&&` as a literal argument, run only a.sh and
# report green. Composite commands use a `__sentinel__` handled by name in
# run_check instead.

_register() {
  local name=$1 class=$2 dir=$3 cmd=$4 paths=$5 args=${6-}
  # SC2016: the patterns match literal metacharacters, not expansions.
  # shellcheck disable=SC2016
  case "$cmd" in
    __*) ;;
    *[\&\|\;\<\>\`\"\'\*\?]* | *'$('*)
      echo "register_check: $name: shell metacharacter, quote or glob in command." >&2
      echo "run_check execs argv, not a shell line; use a __sentinel__ for composites." >&2
      exit 3
      ;;
  esac
  CHECK_NAMES+=("$name")
  CHECK_CLASS["$name"]=$class
  # shellcheck disable=SC2034  # CHECK_DIR/CMD/ARGS are consumed by validation-run.sh
  CHECK_DIR["$name"]=$dir
  # shellcheck disable=SC2034
  CHECK_CMD["$name"]=$cmd
  CHECK_PATHS["$name"]=$paths
  # shellcheck disable=SC2034
  CHECK_ARGS["$name"]=$args
}

# Paths given as a whitespace-separated constant (our own lists, never
# filenames).
register_check() {
  local paths_nl
  # shellcheck disable=SC2086  # our own constant: split on purpose, no globs
  paths_nl=$(printf '%s\n' $5)
  _register "$1" "$2" "$3" "$4" "$paths_nl"
}

# Paths given as newline-separated real filenames, which may contain anything.
#
# CHECK_ARGS is what the command receives; CHECK_PATHS is what the cache key is
# built from. They are not the same list: prettier must be handed only files it
# can parse, while its config files still have to invalidate the result.
register_check_files() {
  _register "$1" "$2" "$3" "$4" "$5" "${6-$5}"
}

read_paths() {
  local -a lines=()
  mapfile -t lines <<<"$1"
  local p
  for p in "${lines[@]}"; do [ -n "$p" ] && printf '%s\n' "$p"; done
}

# shellcheck disable=SC2086  # our own constant: split on purpose, no globs
CORE_ROOT_NL=$(printf '%s\n' $CORE_ROOT)

fingerprint_for_check() {
  local -a paths=()
  mapfile -t paths < <(
    read_paths "$CORE_ROOT_NL"
    read_paths "${CHECK_PATHS[$1]}"
  )
  fingerprint "${paths[@]}"
}

# --- format: prettier over the changed files, minus any that were deleted ---
# (prettier exits non-zero on a path that is not there, which would leave the
# gate permanently closed until the deletion was committed)

# Changing prettier's own config changes the verdict for files that did not
# change — removing a line from .prettierignore exposes a directory that has
# never been formatted. So a config edit widens the check to every formattable
# file rather than the changed ones. Without this, a lone .prettierignore edit
# registered no check at all and the gate opened on it.
FORMAT_CANDIDATES=$(echo "$CHANGED" | grep -E "$FORMAT_EXT" || true)
if matches "$(paths_to_regex "$FORMAT_ROOT")"; then
  # Union, not replace: $CHANGED includes untracked files, and `git ls-files`
  # without `-o` is tracked-only — replacing would drop every newly added file.
  if ! WIDENED=$(tracked_and_untracked_files); then
    exit 3
  fi
  FORMAT_CANDIDATES=$(
    {
      printf '%s\n' "$WIDENED"
      printf '%s\n' "$FORMAT_CANDIDATES"
    } | grep -E "$FORMAT_EXT" | sed '/^$/d' | sort -u || true
  )
fi

FORMAT_FILES=$(printf '%s\n' "$FORMAT_CANDIDATES" | while IFS= read -r f; do
  [ -n "$f" ] && [ -f "$f" ] && printf '%s\n' "$f"
done || true)

if [ -n "$FORMAT_FILES" ]; then
  # FORMAT_ROOT rides along in the cache key rather than sitting in CORE_ROOT:
  # prettier config is the formatter's input and nobody else's. It is not in
  # CHECK_ARGS — prettier cannot parse .prettierignore and errors on it.
  # shellcheck disable=SC2086  # our own constant: split on purpose, no globs
  register_check_files "format" "format" "$ROOT_DIR" "__format__" \
    "$FORMAT_FILES$(printf '\n%s' $FORMAT_ROOT)" "$FORMAT_FILES"
fi

if [ "$DOCS_ONLY" = false ]; then
  if matches "$(paths_to_regex "$TOKENS_INPUTS")"; then
    register_check "tokens" "tokens" "$ROOT_DIR" \
      "node scripts/sync-style-tokens.js --check" \
      "$TOKENS_INPUTS"
  fi

  if affected web; then
    register_check "web:lint" "lint" "$ROOT_DIR/packages/web" "pnpm run lint" "${PKG_INPUTS[web]}"
    register_check "web:test" "test" "$ROOT_DIR/packages/web" "pnpm test" "${PKG_INPUTS[web]}"
    # `build` is `tsc -b && vite build`, so it covers typecheck. `size` is
    # folded in because it can only run against a fresh build.
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

  # The validation scripts and the commit hook gate every commit, so they get
  # the same treatment as any other source: touching one runs the suite that
  # covers them before the gate reopens. The trigger fires on SHELL_INPUTS or
  # on any changed `*.sh` file wherever it lives; the changed files enter the
  # cache key too, so a stored PASS cannot be reported as a hit for a check
  # that was only just triggered.
  CHANGED_SHELL=$(echo "$CHANGED" | grep -E '\.sh$' || true)

  if [ -n "$CHANGED_SHELL" ] || matches "$(paths_to_regex "$SHELL_INPUTS")"; then
    # shellcheck disable=SC2086  # our own constant: split on purpose, no globs
    SHELL_KEY="$(printf '%s\n' $SHELL_INPUTS)"$'\n'"$CHANGED_SHELL"
    register_check_files "validation:test" "test" "$ROOT_DIR" \
      "bash scripts/validate.test.sh" "$SHELL_KEY" ""

    # Shell linting runs locally when the binary is available, and always in
    # CI (.github/workflows/ci-shell.yml). scripts/shellcheck.sh is the single
    # definition of what is linted and how.
    if command -v shellcheck >/dev/null 2>&1; then
      register_check_files "validation:shellcheck" "lint" "$ROOT_DIR" \
        "bash scripts/shellcheck.sh" "$SHELL_KEY" ""
    else
      # stderr, not say(): in gate mode say() is silenced, and "the gate has
      # no shell-lint opinion on this machine" is exactly when that matters.
      echo "shellcheck not installed — shell lint runs in CI only." >&2
    fi
  fi
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

declare -a SELECTED=() CACHED=() OUT_OF_SCOPE=()
declare -A FP=() HIT=()

if [ ${#CHECK_NAMES[@]} -eq 0 ]; then
  say "${YELLOW}Changes touch no validated package, nothing to validate.${NC}"
  exit 0
fi

# Fingerprint every registered check, not just the ones this run will execute.
# A class-filtered run can then report what the gate is still waiting on from
# its own state, instead of re-invoking itself to ask.
for name in "${CHECK_NAMES[@]}"; do
  FP["$name"]=$(fingerprint_for_check "$name")
  if cache_hit "$name" "${FP[$name]}"; then HIT["$name"]=1; else HIT["$name"]=0; fi
done

for name in "${CHECK_NAMES[@]}"; do
  if wanted_class "${CHECK_CLASS[$name]}"; then
    if [ "${HIT[$name]}" = 1 ]; then CACHED+=("$name"); else SELECTED+=("$name"); fi
  elif [ "${HIT[$name]}" = 0 ]; then
    OUT_OF_SCOPE+=("$name")
  fi
done

# Paths that are both staged and dirty. The checks read the worktree but a
# commit records the index, so for these the content that passed is not the
# content being committed — a broken staged blob fixed only on disk would
# otherwise sail through. Everything else the fingerprint already covers.
#
# The filter is the union of every registered check's own paths, not the
# package table: `format` checks arbitrary changed files, `tokens` reads
# sync-style-tokens.js, `validation:test` reads the hooks — none of which sit
# under a package input.
#
# Membership is tested literally, not with a regex: these are real filenames,
# and a path containing an ERE metacharacter must not fall out of the filter
# silently.
divergence() {
  local -a paths=()
  mapfile -t paths < <(
    read_paths "$CORE_ROOT_NL"
    local n
    for n in "${CHECK_NAMES[@]}"; do read_paths "${CHECK_PATHS[$n]}"; done
  )

  local file p
  while IFS= read -r file; do
    [ -z "$file" ] && continue
    for p in "${paths[@]}"; do
      if [ "$file" = "$p" ] || [ "${file##"$p"/}" != "$file" ]; then
        printf '%s\n' "$file"
        break
      fi
    done
  done < <(staged_worktree_divergence)
}

# =============================================================================
# GATE MODE
# =============================================================================
#
# stdout is machine-readable: one "<kind> <value>" record per line, where kind
# is `check` or `unstaged`. Callers must not have to string-match prose to tell
# a check name from a file path.
#
#   exit 0  gate open
#   exit 1  work outstanding (records on stdout)
#   other   the gate itself failed

if [ "$GATE_MODE" = true ]; then
  MISSING_COUNT=0

  for name in "${CHECK_NAMES[@]}"; do
    if [ "${HIT[$name]}" = 0 ]; then
      echo "check $name"
      MISSING_COUNT=$((MISSING_COUNT + 1))
    fi
  done

  # Only meaningful once every check is otherwise green: while checks are
  # outstanding the worktree fingerprint has already missed, so divergence adds
  # nothing but noise.
  if [ "$MISSING_COUNT" -eq 0 ]; then
    while IFS= read -r p; do
      [ -n "$p" ] || continue
      echo "unstaged $p"
      MISSING_COUNT=$((MISSING_COUNT + 1))
    done < <(divergence)
  fi

  [ "$MISSING_COUNT" -eq 0 ] && exit 0
  exit 1
fi

# =============================================================================
# EXECUTION
# =============================================================================

if [ "$DOCS_ONLY" = true ]; then
  echo -e "${BLUE}Validating:${NC} documentation (format only)"
else
  echo -e "${BLUE}Validating:${NC}$AFFECTED_LIST"
fi
if [ ${#CACHED[@]} -gt 0 ]; then
  echo -e "  ${DIM}cached (skipped): ${CACHED[*]}${NC}"
fi

# Say whether the gate as a whole is open. Everything needed is already in this
# process: OUT_OF_SCOPE holds the checks a class filter excluded that are still
# missing, and every check this run executed has just been cached.
report_gate_status() {
  local diverged
  diverged=$(divergence)

  if [ ${#OUT_OF_SCOPE[@]} -eq 0 ] && [ -z "$diverged" ]; then
    echo -e "${GREEN}All checks pass. Commit gate is open.${NC}"
    return
  fi

  if [ ${#OUT_OF_SCOPE[@]} -gt 0 ]; then
    echo -e "${GREEN}Passed.${NC} Still required before commit:${YELLOW} ${OUT_OF_SCOPE[*]}${NC}"
  fi

  # `git add` alone reopens the gate here — the fingerprint is
  # staging-independent, so nothing re-runs.
  if [ -n "$diverged" ]; then
    echo -e "${YELLOW}Staged content differs from the worktree; stage these to commit what was validated:${NC}"
    echo "$diverged" | sed 's/^/    /'
  fi
}

if [ ${#SELECTED[@]} -eq 0 ]; then
  if [ ${#CACHED[@]} -gt 0 ]; then
    echo -e "${GREEN}All checks already passed for the current changes.${NC}"
  else
    echo -e "${YELLOW}No checks match that filter.${NC}"
  fi
  report_gate_status
  exit 0
fi

TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

run_selected_checks
print_summary

if [ "$FAILED" = true ]; then
  echo -e "${RED}Validation failed. Fix the issues above and re-run — passing checks are cached and will be skipped.${NC}"
  exit 1
fi

report_gate_status
