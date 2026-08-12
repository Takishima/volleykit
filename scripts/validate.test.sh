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

STATUS=0
for part in primitives gate; do
  echo "## $part"
  bash "$SCRIPT_DIR/tests/$part.test.sh" || STATUS=1
  echo ""
done

if [ "$STATUS" -ne 0 ]; then
  echo "validate.test.sh: a suite failed (see above)"
fi
exit "$STATUS"
