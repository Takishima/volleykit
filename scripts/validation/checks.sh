#!/usr/bin/env bash
# Check registry for scripts/validate.sh: the registration mechanism, its
# metacharacter guard, and the table of checks each affected package
# contributes. Meant to be sourced by validate.sh after lib.sh and policy.sh,
# with the cwd at the repo root; reads the caller's CHANGED / DOCS_ONLY /
# AFFECTED state and fills the CHECK_* tables.
#
# Adding a package means adding a row in scripts/validation/policy.sh and a
# register_check block here.

declare -a CHECK_NAMES=()
# shellcheck disable=SC2034  # CHECK_DIR/CMD/ARGS are consumed by validation/run.sh
declare -A CHECK_CLASS=() CHECK_DIR=() CHECK_CMD=() CHECK_PATHS=() CHECK_ARGS=()

# CHECK_PATHS is stored newline-separated so filenames containing spaces
# survive — splitting "my file.ts" on IFS would produce two pathspecs matching
# nothing, silently dropping the file from that check's cache key and, because
# the hash of an empty listing is a constant, leaving the check green forever.
#
# CHECK_CMD is a plain space-separated command. run_check splits it with
# `read -ra` (which does no glob expansion) and execs the result — no shell.
# The guard below rejects shell metacharacters, globs and newlines at
# registration: `a.sh && b.sh` handed to exec would pass `&&` as a literal
# argument, run only a.sh and report green; a newline would smuggle a second
# command past a guard that only looked at one line. Composite commands are a
# `__sentinel__` naming a composite_* function defined below, and the sentinel
# arm verifies the function exists rather than exempting itself from checking.

_register() {
  local name=$1 class=$2 dir=$3 cmd=$4 paths=$5 args=${6-}
  # SC2016: the patterns match literal metacharacters, not expansions.
  # shellcheck disable=SC2016
  case "$cmd" in
    *$'\n'*)
      echo "register_check: $name: newline in command." >&2
      exit 3
      ;;
    __*)
      if ! declare -F "composite_${cmd//__/}" >/dev/null; then
        echo "register_check: $name: no composite_${cmd//__/} function for $cmd." >&2
        exit 3
      fi
      ;;
    *[\&\|\;\<\>\`\"\'\*\?]* | *'$('*)
      echo "register_check: $name: shell metacharacter, quote or glob in command." >&2
      echo "run_check execs argv, not a shell line; use a __sentinel__ for composites." >&2
      exit 3
      ;;
  esac
  CHECK_NAMES+=("$name")
  # shellcheck disable=SC2034  # consumed by validate.sh's selection and validation/run.sh
  CHECK_CLASS["$name"]=$class
  # shellcheck disable=SC2034  # CHECK_DIR/CMD/ARGS are consumed by validation/run.sh
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

composite_format() {
  # Newline-separated so paths containing spaces survive.
  local -a files=()
  mapfile -t files <<<"${CHECK_ARGS[$1]}"
  pnpm exec prettier --check "${files[@]}"
}

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

# --- package checks, from the policy table ---

# `web:build` is `tsc -b && vite build`, so it covers typecheck. `size` is
# folded in because it can only run against a fresh build; the bundle limits
# live in packages/web/package.json ("size-limit"), which is under the web
# input paths.
composite_web_build() {
  if ! pnpm run build; then return 1; fi
  if ! pnpm run size; then
    echo ""
    echo "Bundle size exceeded the limits in packages/web/package.json (\"size-limit\")."
    echo "Note: CI builds the merge commit and lands ~10-15 kB above a local build."
    return 1
  fi
}

if [ "$DOCS_ONLY" = false ]; then
  if matches "$(paths_to_regex "$TOKENS_INPUTS")"; then
    register_check "tokens" "tokens" "$ROOT_DIR" \
      "node scripts/sync-style-tokens.js --check" \
      "$TOKENS_INPUTS"
  fi

  if affected web; then
    register_check "web:lint" "lint" "$ROOT_DIR/packages/web" "pnpm run lint" "${PKG_INPUTS[web]}"
    register_check "web:test" "test" "$ROOT_DIR/packages/web" "pnpm test" "${PKG_INPUTS[web]}"
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
