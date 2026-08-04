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
SHELLCHECK_INPUTS="scripts .claude/hooks .claude/skills packages/web/scripts"

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

# Every .sh under the covered paths. Found rather than globbed: a glob for an
# empty directory stays literal and shellcheck then errors on a path that does
# not exist, failing the check for a reason unrelated to shell quality.
#
# find's status is honoured — a deleted or mistyped input path must fail the
# lint rather than silently narrowing it to whatever still resolves.
shellcheck_files() {
  # shellcheck disable=SC2086  # our own constant: split on purpose, no globs
  find $SHELLCHECK_INPUTS -name '*.sh' -type f | sort
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  set -uo pipefail
  cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)" || exit 1

  mapfile -t files < <(shellcheck_files)
  if [ ${#files[@]} -eq 0 ]; then
    echo "shellcheck.sh: no shell files found under $SHELLCHECK_INPUTS" >&2
    exit 1
  fi
  if ! command -v shellcheck >/dev/null 2>&1; then
    echo "shellcheck.sh: shellcheck is not installed" >&2
    exit 127
  fi
  exec shellcheck "${SHELLCHECK_ARGS[@]}" "${files[@]}"
fi
