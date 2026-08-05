#!/usr/bin/env bash
# Lint every shell script git knows about, tracked or untracked.
#
# One definition of scope: `*.sh` files from `git ls-files -c -o
# --exclude-standard`, minus `.specify/` (vendored speckit tooling, not ours
# to fix). Untracked scripts are included so a local scratch script cannot rot
# unnoticed — gitignore it to exclude it.
#
# Used by scripts/validate.sh (when shellcheck is installed) and by CI
# (.github/workflows/ci-shell.yml), which is the enforcing run.

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# Exec-bit invariant, owned here because this is where the file list is
# derived by walking git rather than reconstructed from settings command
# strings. Everything directly in .claude/hooks/ is invoked by path — that
# is what the directory is; lib/ is sourced, not executed, so it is
# excluded — plus scripts/validate.sh (permission allowlist). A dropped
# exec bit means the hook never runs and never emits a decision: the one
# failure fail-closed design cannot cover. Needs git only, so it sits
# above the shellcheck-binary guard, and validate.sh calls it UNCACHED on
# every run via --exec-bits: a tracked mode is not content, so no
# fingerprint can carry it and a cached PASS would open the gate over it.
exec_bits() {
  local nonexec
  # :(glob) so * does not cross /: subdirectories (lib/) hold sourced
  # helpers, which need no exec bit — 100644 is their ordinary spelling.
  nonexec=$(git ls-files -s -- ':(glob).claude/hooks/*.sh' 'scripts/validate.sh' |
    awk '$1 != "100755" { print $4 }')
  [ -z "$nonexec" ] && return 0
  echo "shellcheck.sh: invoked by path but not tracked executable:" >&2
  printf '  %s\n' "$nonexec" >&2
  return 1
}

if [ "${1-}" = "--exec-bits" ]; then
  exec_bits
  exit
fi

if ! command -v shellcheck >/dev/null 2>&1; then
  echo "shellcheck.sh: shellcheck is not installed" >&2
  exit 1
fi

# Deleted-but-tracked files stay in `ls-files -c` until the deletion is
# committed; shellcheck errors on a missing path, so filter to what exists.
mapfile -t files < <(git ls-files -c -o --exclude-standard -- '*.sh' ':!:.specify/**' |
  while IFS= read -r f; do [ -f "$f" ] && printf '%s\n' "$f"; done)

if [ ${#files[@]} -eq 0 ]; then
  echo "shellcheck.sh: no shell files found" >&2
  exit 1
fi

shellcheck -x --severity=warning "${files[@]}"
exec_bits
echo "shellcheck: ${#files[@]} files clean"
