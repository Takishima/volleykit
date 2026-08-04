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
# Runner-internal: cache_hit reads it in this process, and nothing downstream of
# run_check should. `export -n` is required, not just declining to export — a
# plain assignment to a name that arrived exported keeps the attribute, so
# `VOLLEYKIT_NO_CACHE=1 scripts/validate.sh` shipped it into every check's
# environment and the two checks that are validation code failed on it.
# shellcheck disable=SC2034  # read by cache_hit in validation-lib.sh
VOLLEYKIT_NO_CACHE="${VOLLEYKIT_NO_CACHE:-}"
export -n VOLLEYKIT_NO_CACHE

for arg in "$@"; do
  case "$arg" in
    --gate) GATE_MODE=true ;;
    # Not exported: the only reader is cache_hit, in this process. Exporting
    # sent a runner-internal flag into every check's environment, and the two
    # checks that are themselves validation code broke on it.
    --no-cache) VOLLEYKIT_NO_CACHE=1 ;;
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

# Root files, split by who actually reads them. One list cannot answer both
# "does this invalidate every check" and "does this invalidate the formatter":
# a prettier config change has nothing to do with whether the mobile tests still
# pass, and treating it as repo-wide re-runs the entire monorepo for it.
#
# CORE_ROOT also drives ROOT_CHANGED, which marks every package affected. The
# validation scripts are in it on purpose: changing a check's command or input
# paths must not leave stale PASS entries behind.
CORE_ROOT="package.json pnpm-lock.yaml pnpm-workspace.yaml scripts/validate.sh scripts/validation-lib.sh"
FORMAT_ROOT=".prettierrc.json .prettierignore"

# Everything that decides whether the commit gate runs and what it decides:
# the hook, the file that registers the hook, and the scripts behind it. One
# list feeding both the trigger and the check's inputs — stating it twice is
# how .claude/settings.json ended up in neither.
#
# The workflow file is in this list because narrowing its `paths:` filter
# narrows the only enforcement a machine without shellcheck has, and it is
# matched by no other constant and by no shell predicate — editing it registered
# nothing. CI is the only enforcer a settings.json change cannot switch off; the
# shell lint's own scope is wider and lives in scripts/shellcheck.sh.
SHELL_INPUTS=".claude/hooks .claude/settings.json scripts/validate.sh scripts/validation-lib.sh scripts/validation-lib.test.sh scripts/validate.test.sh scripts/shellcheck.sh scripts/test-lib.sh .github/workflows/ci-shell.yml"

# The design-token check compares the two generated files. Its trigger used to
# be hand-written while its inputs were listed separately, so editing the
# generator invalidated the cache but never registered the check.
TOKENS_INPUTS="packages/shared/styles scripts/sync-style-tokens.js"

# SHELLCHECK_INPUTS comes from the script that runs the lint, so the trigger,
# the cache key and the argv cannot disagree.
# shellcheck source=./shellcheck.sh
source "$SCRIPT_DIR/shellcheck.sh" || exit 1

# =============================================================================
# CHANGE DETECTION
# =============================================================================

# A non-zero return means git cannot represent some path in the change set.
# Exiting 3 rather than 0 or 1 makes the hook report a broken gate instead of an
# open one — an unrepresentable path must not read as "no changes".
if ! CHANGED=$(changed_files); then
  exit 3
fi

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

# Deliberately no source/config extension filter here. There used to be one, and
# it was a second copy of "does this change validate to anything" — a question
# the registry below already answers by ending up empty. The two copies drifted
# twice: the pattern omitted `css`, making the design-token check unreachable for
# the very file it watches, and it matched `tsconfig.json` but not
# `tsconfig.app.json`, which is what `tsc -b` reads for the web build. Both
# commits passed the gate with nothing run.
#
# The cost of dropping it is that an asset-only change under a package now runs
# that package's checks. That is the conservative direction, it is cached, and
# it cannot silently skip.

# =============================================================================
# API TYPE GENERATION
# =============================================================================
#
# Runs before any check does, because typecheck and build read the generated
# packages/shared/src/api/schema.ts.
#
# It is NOT a cache input: packages/shared/.gitignore excludes src/api/schema.ts,
# so no fingerprint ever contains it. Invalidation comes from
# docs/api/volleymanager-openapi.yaml being in PKG_INPUTS — the spec is the
# tracked file, the schema is its derivative.
#
# Gate mode never mutates the worktree; if the spec changed without the schema
# being regenerated, the gate simply reports the checks as missing.

if [ "$GATE_MODE" = false ] && matches 'volleymanager-openapi\.yaml'; then
  echo "OpenAPI spec changed, regenerating types..."
  pnpm run generate:api
  CHANGED=$(changed_files) || exit 3
fi

# =============================================================================
# AFFECTED PACKAGES
# =============================================================================

# Anchored regex matching the given paths and anything beneath them. Callers
# pass our own constants, never arbitrary filenames — divergence() compares
# literally instead, precisely because filenames can contain metacharacters.
# The escape chain covers every ERE metacharacter anyway so that adding a path
# with one cannot quietly change what matches.
paths_to_regex() {
  local out="" p
  # shellcheck disable=SC2086  # our own constant: split on purpose, no globs
  for p in $1; do
    p=${p//\\/\\\\}
    p=${p//./\\.}
    p=${p//+/\\+}
    p=${p//\{/\\\{}
    p=${p//(/\\(}
    p=${p//)/\\)}
    p=${p//[/\\[}
    p=${p//\*/\\*}
    p=${p//\?/\\?}
    p=${p//|/\\|}
    p=${p//^/\\^}
    p=${p//\$/\\\$}
    out="${out:+$out|}$p"
  done
  printf '^(%s)(/|$)' "$out"
}

ROOT_CHANGED=false
matches "$(paths_to_regex "$CORE_ROOT")" && ROOT_CHANGED=true

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
declare -A CHECK_CLASS=() CHECK_DIR=() CHECK_CMD=() CHECK_PATHS=() CHECK_ARGS=()

# CHECK_PATHS is stored newline-separated so filenames containing spaces survive
# — splitting "my file.ts" on IFS would produce two pathspecs matching nothing,
# silently dropping the file from that check's cache key and, because the hash
# of an empty listing is a constant, leaving the check green forever.
#
# Normalising here rather than at the call sites is the point: a caller that
# forgot to convert would hit exactly that permanently-green failure, with no
# output distinguishing it from a real pass.

_register() {
  local name=$1 class=$2 dir=$3 cmd=$4 paths=$5 args=${6-}
  # run_check execs CHECK_CMD as argv with no shell, so a metacharacter is
  # passed through as a literal argument and silently does nothing. That is how
  # `a.sh && b.sh` came to run only a.sh while the check reported green.
  # Composites need a sentinel handled by name in run_check (__format__,
  # __web_build__). Fail at registration rather than pass at runtime.
  # shellcheck disable=SC2016  # the patterns match literal metacharacters
  case "$cmd" in
    __*) ;;
    *[\&\|\;\<\>\`\"\']* | *'$('*)
      echo "register_check: $name: shell metacharacter or quote in command." >&2
      echo "run_check execs argv, not a shell line. Use a sentinel." >&2
      exit 3
      ;;
  esac
  CHECK_NAMES+=("$name")
  CHECK_CLASS["$name"]=$class
  CHECK_DIR["$name"]=$dir
  CHECK_CMD["$name"]=$cmd
  CHECK_PATHS["$name"]=$paths
  CHECK_ARGS["$name"]=$args
}

# Paths given as a whitespace-separated constant (our own lists, never filenames).
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

fingerprint_for_check() {
  local -a paths=()
  mapfile -t paths < <(
    read_paths "$CORE_ROOT_NL"
    read_paths "${CHECK_PATHS[$1]}"
  )
  fingerprint "${paths[@]}"
}

# shellcheck disable=SC2086  # our own constant: split on purpose, no globs
CORE_ROOT_NL=$(printf '%s\n' $CORE_ROOT)

# --- format: prettier over the changed files, minus any that were deleted ---
# (prettier exits non-zero on a path that is not there, which would leave the
# gate permanently closed until the deletion was committed)
FORMAT_EXT='\.(ts|tsx|js|jsx|mjs|json|css|astro|md)$'

# Changing prettier's own config changes the verdict for files that did not
# change — removing a line from .prettierignore exposes a directory that has
# never been formatted. So a config edit widens the check to every tracked
# formattable file rather than the changed ones. Without this, a lone
# .prettierignore edit registered no check at all and the gate opened on it.
FORMAT_CANDIDATES=$(echo "$CHANGED" | grep -E "$FORMAT_EXT" || true)
if matches "$(paths_to_regex "$FORMAT_ROOT")"; then
  # Union, not replace. $CHANGED includes untracked files; `git ls-files` alone
  # is tracked-only, so replacing dropped every newly added file — a batch that
  # added one file and touched prettier config stopped checking that file.
  # `-c -o --exclude-standard` is the same listing fingerprint() uses.
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
  # FORMAT_ROOT rides along here rather than sitting in CORE_ROOT: prettier
  # config is the formatter's input and nobody else's.
  # Cache inputs: the files plus prettier's config. Command arguments: the
  # files only — prettier cannot parse .prettierignore and errors on it.
  # shellcheck disable=SC2086  # our own constant: split on purpose, no globs
  register_check_files "format" "format" "$ROOT_DIR" "__format__" \
    "$FORMAT_FILES$(printf '\n%s' $FORMAT_ROOT)" "$FORMAT_FILES"
fi

if matches "$(paths_to_regex "$TOKENS_INPUTS")"; then
  register_check "tokens" "tokens" "$ROOT_DIR" \
    "node scripts/sync-style-tokens.js --check" \
    "$TOKENS_INPUTS"
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

# The validation scripts and the commit hook gate every commit, so they get the
# same treatment as any other source: touching one runs the suite that covers
# them before the gate reopens. The hook in particular is what enforces
# everything else, and was previously the one file nothing validated.
# Any changed shell file also triggers these checks, wherever it lives: the
# coverage assertions live in them, and a new script outside the directory lists
# is exactly the case they exist to flag. is_shell_file is the same predicate
# the lint and the coverage scan use — keying the trigger on a narrower proxy
# (a directory list, then a file extension) is how this hole reopened twice.
#
# The changed files go into CHECK_PATHS as well as the trigger. Widening only
# the trigger leaves the cache key unchanged, so a stored PASS stays valid and
# the check that was just triggered is skipped as a hit.
CHANGED_SHELL=""
while IFS= read -r f; do
  [ -n "$f" ] && is_shell_file "$f" && CHANGED_SHELL="$CHANGED_SHELL$f"$'\n'
done <<<"$CHANGED"

if [ -n "$CHANGED_SHELL" ] || matches "$(paths_to_regex "$SHELL_INPUTS")"; then
  # One check per suite. CHECK_CMD is exec'd as argv, never through a shell, so
  # a composite `a && b` would pass `&&` as a positional argument and silently
  # run only the first — which is exactly what it did. Composite commands need a
  # sentinel handled by name in run_check (see __format__, __web_build__).
  # shellcheck disable=SC2086  # our own constant: split on purpose, no globs
  SHELL_KEY="$(printf '%s\n' $SHELL_INPUTS)"$'\n'"$CHANGED_SHELL"
  register_check_files "validation:test" "test" "$ROOT_DIR" \
    "bash scripts/validation-lib.test.sh" "$SHELL_KEY" ""
  register_check_files "validation:registry" "test" "$ROOT_DIR" \
    "bash scripts/validate.test.sh" "$SHELL_KEY" ""
fi

# Shell linting runs locally when the binary is available, and always in CI
# (.github/workflows/ci-shell.yml). Without it the gate goes green on a lint
# error and only fails after the push, which is how two malformed suppression
# directives reached CI in consecutive commits.

# Keyed on SHELLCHECK_INPUTS, which is what the lint reads — wider than
# SHELL_INPUTS, because it also covers scripts this suite does not exercise.
if [ -n "$CHANGED_SHELL" ] || matches "$(paths_to_regex "$SHELLCHECK_INPUTS")"; then
  if command -v shellcheck >/dev/null 2>&1; then
    # shellcheck disable=SC2086  # our own constant: split on purpose, no globs
    SHELLCHECK_KEY="$(printf '%s\n' $SHELLCHECK_INPUTS)"$'\n'"$CHANGED_SHELL"
    register_check_files "validation:shellcheck" "lint" "$ROOT_DIR" \
      "bash scripts/shellcheck.sh" "$SHELLCHECK_KEY" ""
  else
    # stderr, not say(): in gate mode say() is silenced, and "the gate has no
    # shell-lint opinion on this machine" is exactly when that matters.
    echo "shellcheck not installed — validation:shellcheck runs in CI only." >&2
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
# The filter is the union of every registered check's own paths, not the package
# table: `format` checks arbitrary changed files, `tokens` reads
# sync-style-tokens.js, `validation:test` reads the hooks — none of which sit
# under a package input. Restating the validated set instead of deriving it is
# how those fell through the filter.
# Membership is tested literally, not with a regex. These are real filenames:
# a path containing `|`, `$` or `^` either drops out of an escaped-regex filter
# silently — and `divergence()` ends in `|| true`, so the record vanishes and
# the gate opens — or, for `|`, opens an alternation that matches unrelated
# paths.
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

echo -e "${BLUE}Validating:${NC}$AFFECTED_LIST"
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
