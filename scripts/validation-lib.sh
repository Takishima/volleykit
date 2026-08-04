#!/usr/bin/env bash
# Shared library for VolleyKit validation.
#
# Provides three things:
#   1. Change detection  - what changed vs HEAD (staged + unstaged + untracked)
#   2. Fingerprinting    - content hash of a check's input files
#   3. Check cache       - "this exact input already passed this check"
#
# The cache is content-addressed, so a result stays valid until the files the
# check actually reads change. That means a check run mid-work (e.g. via
# `scripts/validate.sh lint`) is NOT re-run at commit time, and a failure in
# one package does not invalidate checks for the other packages.
#
# Cache location: $ROOT_DIR/.validation-cache (gitignored)

# shellcheck disable=SC2034  # variables are consumed by sourcing scripts

set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
if [ -z "$ROOT_DIR" ]; then
  echo "Error: not inside a git repository" >&2
  exit 1
fi
cd "$ROOT_DIR"

CACHE_DIR="${VOLLEYKIT_CACHE_DIR:-$ROOT_DIR/.validation-cache}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
DIM='\033[2m'
NC='\033[0m'

# =============================================================================
# CHANGE DETECTION
# =============================================================================

# All files that differ from HEAD: staged, unstaged, and untracked.
# Superset of the staged set, so validation no longer depends on `git add`
# having been run first.
changed_files() {
  {
    if git rev-parse --verify -q HEAD >/dev/null; then
      git diff --name-only HEAD
    else
      git diff --name-only --cached
    fi
    git ls-files -o --exclude-standard
  } 2>/dev/null | sed '/^$/d' | sort -u
}

# =============================================================================
# FINGERPRINTING
# =============================================================================

# Content hash of every tracked file under the given pathspecs, plus the
# contents of any file modified in the worktree but not yet staged.
#
# `git ls-files -s` returns the index blob hash without reading file contents,
# which makes the common case cheap. Only worktree-dirty files are hashed.
fingerprint() {
  {
    git ls-files -s -- "$@" 2>/dev/null || true
    {
      git ls-files -m -o --exclude-standard -- "$@" 2>/dev/null || true
    } | sort -u | while IFS= read -r f; do
      if [ -f "$f" ]; then
        printf 'dirty %s %s\n' "$(sha256sum "$f" | cut -d' ' -f1)" "$f"
      else
        printf 'deleted %s\n' "$f"
      fi
    done
  } | sha256sum | cut -d' ' -f1
}

# =============================================================================
# CHECK CACHE
# =============================================================================

# A cache entry is an empty file named "<check>.<fingerprint>". Presence means
# "this check passed for exactly this input". Storing a result drops any older
# entry for the same check so the directory stays small.

cache_hit() {
  [ "${VOLLEYKIT_NO_CACHE:-}" != "1" ] && [ -f "$CACHE_DIR/$1.$2" ]
}

cache_store() {
  mkdir -p "$CACHE_DIR"
  rm -f "$CACHE_DIR/$1".* 2>/dev/null || true
  : >"$CACHE_DIR/$1.$2"
}

cache_drop() {
  rm -f "$CACHE_DIR/$1".* 2>/dev/null || true
}

cache_clear() {
  rm -rf "$CACHE_DIR"
}

# =============================================================================
# CHECK REGISTRY
# =============================================================================
#
# A check is: name | class | working dir | command | input pathspecs
#
# `class` groups checks so a targeted run (`validate.sh lint`) can select every
# lint check across the affected packages in one go — the same set the full run
# would use, so the cache entries it writes are hits at commit time.

declare -a CHECK_NAMES=()
declare -A CHECK_CLASS=()
declare -A CHECK_DIR=()
declare -A CHECK_CMD=()
declare -A CHECK_PATHS=()

register_check() {
  local name=$1 class=$2 dir=$3 cmd=$4 paths=$5
  CHECK_NAMES+=("$name")
  CHECK_CLASS["$name"]=$class
  CHECK_DIR["$name"]=$dir
  CHECK_CMD["$name"]=$cmd
  CHECK_PATHS["$name"]=$paths
}

# Files that invalidate every check in the repo.
ROOT_PATHS="package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json eslint.config.js eslint.config.mjs .prettierrc .prettierrc.json"

fingerprint_for_check() {
  local name=$1
  # shellcheck disable=SC2086  # pathspecs are intentionally word-split
  fingerprint $ROOT_PATHS ${CHECK_PATHS[$name]}
}
