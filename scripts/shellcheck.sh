#!/usr/bin/env bash
# Lint every tracked shell script in the repository.
#
# One definition of scope: tracked `*.sh` files, minus `.specify/` (vendored
# speckit tooling, not ours to fix). Untracked scripts are linted too so a
# local scratch script cannot rot unnoticed — gitignore it to exclude it.
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
echo "shellcheck: ${#files[@]} files clean"
