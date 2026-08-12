#!/usr/bin/env bash
# Lint every shell script git knows about, tracked or untracked.
#
# One definition of scope: `*.sh` files from the lib's guarded enumeration,
# minus `.specify/` (vendored speckit tooling, not ours to fix). Untracked
# scripts are included so a local scratch script cannot rot unnoticed —
# gitignore it to exclude it. The enumeration comes from
# tracked_and_untracked_files rather than a bare `git ls-files`: the
# primitive refuses a path git must C-quote instead of silently dropping it
# from the lint set.
#
# Used as the `validation:shellcheck` check by scripts/validate.sh (when the
# binary is installed) and by CI (.github/workflows/ci-shell.yml), which is
# the enforcing run. The exec-bit invariant is not here: it needs to run
# uncached on every validate.sh invocation, so it lives in
# scripts/validation/lib.sh (exec_bits) with its path set in
# scripts/validation/policy.sh (EXEC_BIT_PATHS).

set -euo pipefail

# shellcheck source=./validation/lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/validation/lib.sh" || exit 1
cd "$ROOT_DIR"

if ! command -v shellcheck >/dev/null 2>&1; then
  echo "shellcheck.sh: shellcheck is not installed" >&2
  exit 1
fi

if ! listing=$(tracked_and_untracked_files '*.sh' ':!:.specify/**'); then
  exit 1
fi

# Deleted-but-tracked files stay in the listing until the deletion is
# committed; shellcheck errors on a missing path, so filter to what exists.
mapfile -t files < <(printf '%s\n' "$listing" |
  while IFS= read -r f; do [ -n "$f" ] && [ -f "$f" ] && printf '%s\n' "$f"; done)

if [ ${#files[@]} -eq 0 ]; then
  echo "shellcheck.sh: no shell files found" >&2
  exit 1
fi

shellcheck -x --severity=warning "${files[@]}"
echo "shellcheck: ${#files[@]} files clean"
