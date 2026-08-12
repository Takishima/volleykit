#!/usr/bin/env bash
# Check registry for scripts/validate.sh: the registration mechanism, its
# command guard, and register_all_checks(), which fills the CHECK_* tables
# from the context (CHANGED / DOCS_ONLY / AFFECTED, scripts/validation/
# context.sh) and the policy tables. Meant to be sourced after context.sh;
# defines functions and type-only declarations, reports failure through
# return codes and leaves exiting to the caller:
#
#   register_all_checks || exit 3
#
# Adding a package means adding a row in scripts/validation/policy.sh and a
# register_check block in register_all_checks below.

# Type-only declarations; register_all_checks resets the registry per pass —
# the analogue of context_load resetting the context per run. Call-time reset
# means a repeated pass replaces the registry instead of appending to it, and
# a re-source after registration preserves the filled CHECK_NAMES — an
# initializer on it would wipe the list, leaving the caller to take the
# "nothing to validate" exit over checks that were never consulted. That
# silent direction is what the suite pins. The five maps fail the OTHER way:
# validate.sh reads ${CHECK_CLASS[$name]} under set -u, so a wiped map dies
# loud on the first name rather than opening the gate.
declare -a CHECK_NAMES
# shellcheck disable=SC2034  # CHECK_DIR/CMD/ARGS are consumed by validation/run.sh
declare -A CHECK_CLASS CHECK_DIR CHECK_CMD CHECK_PATHS CHECK_ARGS

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
#
# A guard violation records REGISTER_FAILED and returns 1; registration
# continues so every bad command is reported, and register_all_checks fails
# at the end. The caller turns that into a broken gate. The continue-then-
# fail shape relies on how the function is invoked: as the left side of
# `|| exit 3`, errexit is suppressed inside it, so a failing _register does
# not abort the pass before the latch is read.

_register() {
  local name=$1 class=$2 dir=$3 cmd=$4 paths=$5 args=${6-}
  # SC2016: the patterns match literal metacharacters, not expansions.
  # shellcheck disable=SC2016
  case "$cmd" in
    *$'\n'*)
      echo "register_check: $name: newline in command." >&2
      REGISTER_FAILED=1
      return 1
      ;;
    __*)
      if ! declare -F "composite_${cmd//__/}" >/dev/null; then
        echo "register_check: $name: no composite_${cmd//__/} function for $cmd." >&2
        REGISTER_FAILED=1
        return 1
      fi
      ;;
    *[\&\|\;\<\>\`\"\'\*\?]* | *'$('*)
      echo "register_check: $name: shell metacharacter, quote or glob in command." >&2
      echo "run_check execs argv, not a shell line; use a __sentinel__ for composites." >&2
      REGISTER_FAILED=1
      return 1
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

fingerprint_for_check() {
  local -a paths=()
  mapfile -t paths < <(
    read_paths "$CORE_ROOT_NL"
    read_paths "${CHECK_PATHS[$1]}"
  )
  fingerprint "${paths[@]}"
}

# --- composite commands: policy for the two checks a single argv cannot ---
# --- express, defined here beside their registrations, dispatched by name ---
# --- in validation/run.sh ---

composite_format() {
  # Newline-separated so paths containing spaces survive.
  local -a files=()
  mapfile -t files <<<"${CHECK_ARGS[$1]}"
  pnpm exec prettier --check "${files[@]}"
}

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

# --- registration ---

register_format_check() {
  # Changing prettier's own config changes the verdict for files that did not
  # change — removing a line from .prettierignore exposes a directory that has
  # never been formatted. So a config edit widens the check to every
  # formattable file rather than the changed ones. Without this, a lone
  # .prettierignore edit registered no check at all and the gate opened on it.
  local candidates widened files
  candidates=$(echo "$CHANGED" | grep -E "$FORMAT_EXT" || true)
  if matches "$(paths_to_regex "$FORMAT_ROOT")"; then
    # Union, not replace: $CHANGED includes untracked files, and `git
    # ls-files` without `-o` is tracked-only — replacing would drop every
    # newly added file.
    widened=$(tracked_and_untracked_files) || return 1
    candidates=$(
      {
        printf '%s\n' "$widened"
        printf '%s\n' "$candidates"
      } | grep -E "$FORMAT_EXT" | sed '/^$/d' | sort -u || true
    )
  fi

  # Deleted files are dropped: prettier exits non-zero on a path that is not
  # there, which would leave the gate closed until the deletion is committed.
  files=$(printf '%s\n' "$candidates" | while IFS= read -r f; do
    [ -n "$f" ] && [ -f "$f" ] && printf '%s\n' "$f"
  done || true)

  [ -z "$files" ] && return 0
  # FORMAT_ROOT rides along in the cache key rather than sitting in CORE_ROOT:
  # prettier config is the formatter's input and nobody else's. It is not in
  # CHECK_ARGS — prettier cannot parse .prettierignore and errors on it.
  # shellcheck disable=SC2086  # our own constant: split on purpose, no globs
  register_check_files "format" "format" "$ROOT_DIR" "__format__" \
    "$files$(printf '\n%s' $FORMAT_ROOT)" "$files"
}

register_all_checks() {
  # The registry reads the LOADED context — the variables context_load sets,
  # not merely the functions context.sh defines. Guarding on a function name
  # was tried and it let the real hazard through: all four modules sourced,
  # context_load never called, `$DOCS_ONLY` unbound-but-empty under a
  # `set -u`-off standalone load, every arm skipped, and the pass returned 0
  # having registered nothing. context_loaded is context.sh's own statement
  # of what a loaded context is; the error goes to stderr like every other
  # arm here, so the caller's exit 3 carries a remedy.
  if ! context_loaded; then
    echo "register_all_checks: run context_load first." >&2
    return 1
  fi

  CHECK_NAMES=()
  # shellcheck disable=SC2034  # CLASS/DIR/CMD are consumed by validate.sh and validation/run.sh
  CHECK_CLASS=() CHECK_DIR=() CHECK_CMD=() CHECK_PATHS=() CHECK_ARGS=()
  REGISTER_FAILED=0

  register_format_check || return 1

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

    # The validation scripts and the commit hook gate every commit, so they
    # get the same treatment as any other source: touching one runs the suite
    # that covers them before the gate reopens. The trigger fires on
    # SHELL_INPUTS or on any changed `*.sh` file wherever it lives; the
    # changed files enter the cache key too, so a stored PASS cannot be
    # reported as a hit for a check that was only just triggered.
    local changed_shell shell_key
    changed_shell=$(echo "$CHANGED" | grep -E '\.sh$' || true)

    if [ -n "$changed_shell" ] || matches "$(paths_to_regex "$SHELL_INPUTS")"; then
      # shellcheck disable=SC2086  # our own constant: split on purpose, no globs
      shell_key="$(printf '%s\n' $SHELL_INPUTS)"$'\n'"$changed_shell"
      register_check_files "validation:test" "test" "$ROOT_DIR" \
        "bash scripts/validate.test.sh" "$shell_key" ""

      # Shell linting runs locally when the binary is available, and always
      # in CI (.github/workflows/ci-shell.yml). scripts/shellcheck.sh is the
      # single definition of what is linted and how.
      if command -v shellcheck >/dev/null 2>&1; then
        register_check_files "validation:shellcheck" "lint" "$ROOT_DIR" \
          "bash scripts/shellcheck.sh" "$shell_key" ""
      else
        # stderr on purpose: gate mode silences stdout commentary, and "the
        # gate has no shell-lint opinion on this machine" is exactly when
        # that matters.
        echo "shellcheck not installed — shell lint runs in CI only." >&2
      fi
    fi
  fi

  [ "$REGISTER_FAILED" = 0 ]
}
