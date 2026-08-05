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

# Exec-bit invariant, checked here because this is where the file list is
# derived by walking git rather than reconstructed from settings command
# strings (four review rounds of JSON-scraping each missed a registration
# form). Everything in .claude/hooks/ is invoked by path by construction —
# that is what the directory is — and scripts/validate.sh is invoked by
# path via the permission allowlist. A dropped exec bit means the hook
# never runs and never emits a decision: the one failure fail-closed
# design cannot cover, and a mode change is neither content nor text, so
# no other layer sees it.
NONEXEC=$(git ls-files -s -- '.claude/hooks/*.sh' 'scripts/validate.sh' | awk '$1 != "100755" { print $4 }')
if [ -n "$NONEXEC" ]; then
  echo "shellcheck.sh: invoked by path but not tracked executable:" >&2
  printf '  %s\n' "$NONEXEC" >&2
  exit 1
fi

echo "shellcheck: ${#files[@]} files clean"
