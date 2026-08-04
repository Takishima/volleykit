#!/usr/bin/env bash
# Single definition of "which shell files are linted, and how".
#
#   scripts/shellcheck.sh          # lint them
#
# Three consumers need this and must not disagree: the `validation:shellcheck`
# check in validate.sh (which also keys its cache on SHELLCHECK_INPUTS),
# .github/workflows/ci-shell.yml, and anyone running it by hand. An earlier
# version wrote the argv out in two places and keyed the cache on a third,
# narrower list — so a break in scripts/update-speckit.sh was invisible to the
# gate, and a stored PASS stayed valid after that file broke.
#
# Sourcing this file defines SHELLCHECK_INPUTS and shellcheck_files without
# running anything.

# Directories and files the lint covers. This is also the check's cache key, so
# it must name everything the lint reads.
# shellcheck disable=SC2034  # consumed by validate.sh
SHELLCHECK_INPUTS="scripts .claude/hooks .claude/skills packages/web/scripts .envrc"

# Tracked shell that is deliberately NOT linted. Stated rather than left out of
# the scan: validate.test.sh asserts every tracked .sh is either under
# SHELLCHECK_INPUTS or named here, so a new script cannot end up unlinted by
# accident — which is how six files sat outside every lint path at once.
# shellcheck disable=SC2034  # consumed by validate.test.sh
SHELLCHECK_EXCLUDED=".specify"  # vendored by scripts/update-speckit.sh

# Excluded repo-wide, both structural rather than defects: SC1091 cannot follow
# a sourced path it was not given, and SC2015 flags the `a && b || c` the test
# helpers use deliberately. `info` is included because SC2086 lives there.
SHELLCHECK_ARGS=(-x --severity=info -e SC1091 -e SC2015)

# One predicate for "is this a shell file", used by the lint's own file list, by
# validate.sh's trigger and by validate.test.sh's coverage scan. Keying any of
# the three on a narrower proxy is how the same hole reopened three times: a
# directory list, then a file extension, each time missing the file the coverage
# claim was about.
#
# Extension OR shell shebang. `.envrc` is tracked bash with no extension;
# `#!/usr/bin/env sh` and ksh are the same case.
SHELL_SHEBANG_RE='^#!([^[:space:]]*/)?(env[[:space:]]+)?(ba|z|k|da|a)?sh([[:space:]]|$)'

is_shell_file() {
  case "$1" in *.sh) return 0 ;; esac
  [ -f "$1" ] || return 1
  head -1 "$1" 2>/dev/null | grep -qE "$SHELL_SHEBANG_RE"
}

# Every tracked shell file in the repo. `git grep` narrows to files carrying a
# shebang at all, so only those are opened — reading the first line of all ~1150
# tracked files took longer than the rest of the suite.
all_shell_files() {
  {
    git ls-files '*.sh'
    git grep -lE '^#!' -- ':!*.sh' 2>/dev/null | while IFS= read -r f; do
      is_shell_file "$f" && printf '%s\n' "$f"
    done
  } | sed '/^$/d' | sort -u
}

# Every .sh under the covered paths. Found rather than globbed: a glob for an
# empty directory stays literal and shellcheck then errors on a path that does
# not exist, failing the check for a reason unrelated to shell quality.
#
# find's status is checked per input. `find a b | sort` returns sort's status and
# a process substitution's status is not observable at all, so an earlier version
# claimed to fail on a missing path and silently linted a narrower set instead.
shellcheck_files() {
  local path found all="" f
  for path in $SHELLCHECK_INPUTS; do
    if [ -f "$path" ]; then
      all="$all$path"$'\n'
      continue
    fi
    found=$(find "$path" -type f) || return 1
    while IFS= read -r f; do
      [ -n "$f" ] && is_shell_file "$f" && all="$all$f"$'\n'
    done <<<"$found"
  done
  printf '%s' "$all" | sed '/^$/d' | sort
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  set -uo pipefail
  cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)" || exit 1

  if ! files_list=$(shellcheck_files); then
    echo "shellcheck.sh: an entry in SHELLCHECK_INPUTS could not be read" >&2
    exit 1
  fi
  mapfile -t files <<<"$files_list"
  if [ ${#files[@]} -eq 0 ] || [ -z "${files[0]}" ]; then
    echo "shellcheck.sh: no shell files found under $SHELLCHECK_INPUTS" >&2
    exit 1
  fi
  if ! command -v shellcheck >/dev/null 2>&1; then
    echo "shellcheck.sh: shellcheck is not installed" >&2
    exit 127
  fi
  exec shellcheck "${SHELLCHECK_ARGS[@]}" "${files[@]}"
fi
