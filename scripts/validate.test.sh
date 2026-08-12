#!/usr/bin/env bash
# Entry point for the validation-system test suites. Runs each part under
# scripts/tests/ and fails if any part fails; the parts print their own
# per-row output and totals. This is the file the `validation:test` check
# and CI (.github/workflows/ci-shell.yml) invoke.
#
# Parts:
#   scripts/tests/primitives.test.sh  fingerprint/change/cache/guard/exec-bit
#                                     primitives, commit predicate, policy
#                                     agreement rows
#   scripts/tests/gate.test.sh        end-to-end runner, gate protocol and
#                                     commit hook against a scratch monorepo
#
# Everything runs against scratch repositories under mktemp with `pnpm`
# stubbed, so the suites need only bash, git and jq and finish in seconds.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# The part list is derived from the directory, not declared: a new
# *.test.sh under scripts/tests/ runs without editing this file, the same
# way CORE_ROOT's directory entry covers a new validation module. The
# harness is excluded by the glob, and parts are order-independent (each
# owns its own mktemp WORK tree).
STATUS=0
for part in "$SCRIPT_DIR"/tests/*.test.sh; do
  echo "## $(basename "$part" .test.sh)"
  bash "$part" || STATUS=1
  echo ""
done

if [ "$STATUS" -ne 0 ]; then
  echo "validate.test.sh: a suite failed (see above)"
fi
exit "$STATUS"
