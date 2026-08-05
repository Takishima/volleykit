#!/usr/bin/env bash
# Primitives for VolleyKit validation: change detection, content
# fingerprinting, path-set matching (paths_to_regex) and the check cache.
# Project policy (which packages exist, which checks they run) lives in
# scripts/validation-policy.sh; selection and the gate in scripts/validate.sh.
#
# This file is meant to be sourced. It does not set shell options, does not
# change the caller's working directory and does not exit the caller — it only
# defines functions and exports ROOT_DIR. Source it from a directory inside the
# repository; every function below assumes the caller has cd'd to ROOT_DIR.
#
#   source scripts/validation-lib.sh || exit 3
#   cd "$ROOT_DIR"

# shellcheck disable=SC2034  # colors are consumed by sourcing scripts

if ! ROOT_DIR=$(git rev-parse --show-toplevel 2>/dev/null) || [ -z "$ROOT_DIR" ]; then
  echo "validation-lib.sh: not inside a git repository" >&2
  return 1
fi
export ROOT_DIR

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

# Every path that differs from HEAD: staged, unstaged and untracked.
#
# Deliberately a superset of the staged set. The checks themselves are
# package-wide (`eslint .`, `vitest run`), so they see untracked and unstaged
# files whether or not validation was told about them; scoping detection to the
# index would only hide work the checks are already doing.
#
# `-c core.quotePath=false` on every listing: with the default, git C-quotes any
# path containing a non-ASCII byte, so `packages/web/src/café.ts` comes back as
# `"packages/web/src/caf\303\251.ts"`. Every consumer here matches raw path
# strings, so a quoted path would match nothing and the gate would open with
# zero checks run. In a de/fr/it codebase that is not a hypothetical.
#
# A path containing a literal quote, backslash or newline stays C-quoted even
# with quotePath=false. Those are NOT skipped — a skipped path is invisible to
# the registry, which is the accented-filename hole again. This returns non-zero
# instead, and the caller turns that into a broken gate rather than an open one.
changed_files() {
  local out
  out=$(
    {
      if git rev-parse --verify -q HEAD >/dev/null 2>&1; then
        git -c core.quotePath=false diff --name-only HEAD 2>/dev/null || true
      fi
      # The index is unioned in unconditionally, not as the no-HEAD fallback.
      # A path staged with one content and then restored on disk differs from
      # HEAD only in the index, so `git diff HEAD` says nothing about it — the
      # run would exit as "no changes" and the gate would open on a blob no
      # check ever saw. Listing it here registers its checks and lets the
      # divergence rule report it.
      git -c core.quotePath=false diff --name-only --cached 2>/dev/null || true
      git -c core.quotePath=false ls-files -o --exclude-standard 2>/dev/null || true
    } | sed '/^$/d' | sort -u
  )
  if printf '%s\n' "$out" | grep -q '^"'; then
    echo "validation: git cannot list this path unquoted, so the change set" >&2
    echo "cannot be trusted. Rename it (no quote, backslash or newline):" >&2
    printf '%s\n' "$out" | grep '^"' | sed 's/^/  /' >&2
    return 1
  fi
  printf '%s\n' "$out"
}

# Every file under the given pathspecs that git knows about, tracked or not.
#
# Refuses an unrepresentable path for the same reason changed_files does. It
# cannot lean on that check: this listing exists to cover files that did NOT
# change, so changed_files never sees them. Skipping instead would silently
# drop such a file out of the widened format set — the quoted form ends in `"`,
# so no extension filter matches it — and the check would pass having never
# looked.
tracked_and_untracked_files() {
  local out
  out=$(git -c core.quotePath=false ls-files -c -o --exclude-standard 2>/dev/null -- "$@" || true)
  if printf '%s\n' "$out" | grep -q '^"'; then
    echo "validation: git cannot list this path unquoted, so the file set" >&2
    echo "cannot be trusted. Rename it (no quote, backslash or newline):" >&2
    printf '%s\n' "$out" | grep '^"' | sed 's/^/  /' >&2
    return 1
  fi
  printf '%s\n' "$out"
}

# Paths that are BOTH staged and modified in the worktree — the intersection of
# `git diff --cached --name-only` and `git diff --name-only`.
#
# The intersection is the point. A path that is merely dirty is not part of the
# next commit and must not block it, or partial commits become impossible:
# staging one file would arm the gate against every other file in progress.
# A path in both sets is the real hazard — its staged content is not the
# content that was validated.
staged_worktree_divergence() {
  local staged dirty
  staged=$(git -c core.quotePath=false diff --cached --name-only 2>/dev/null || true)
  [ -z "$staged" ] && return 0
  dirty=$(git -c core.quotePath=false diff --name-only 2>/dev/null || true)
  [ -z "$dirty" ] && return 0
  comm -12 <(printf '%s\n' "$staged" | sort -u) <(printf '%s\n' "$dirty" | sort -u)
}

# Anchored ERE matching the given whitespace-separated paths and anything
# beneath them. Callers pass our own policy constants, never arbitrary
# filenames — divergence checks compare literally, precisely because filenames
# can contain metacharacters. The escape chain covers every ERE metacharacter
# anyway so that adding a path with one cannot quietly change what matches.
paths_to_regex() {
  local out="" p
  # shellcheck disable=SC2086  # our own constant: split on purpose, no globs
  for p in $1; do
    p=${p//\\/\\\\}
    p=${p//./\\.}
    p=${p//+/\\+}
    p=${p//\{/\\\{}
    p=${p//(/\\(}
    p=${p//)/\\)}
    p=${p//[/\\[}
    p=${p//\*/\\*}
    p=${p//\?/\\?}
    p=${p//|/\\|}
    p=${p//^/\\^}
    p=${p//\$/\\\$}
    out="${out:+$out|}$p"
  done
  printf '^(%s)(/|$)' "$out"
}

# =============================================================================
# FINGERPRINTING
# =============================================================================

# Content hash of every file under the given pathspecs — tracked or untracked,
# staged or not.
#
# Staging-independence is the point: `git add` moves a file between git's
# internal representations without changing a byte of it, so a fingerprint that
# mixed index blob hashes with worktree hashes would change on `git add` alone
# and throw away a valid cache entry. Everything here is hashed from the
# worktree, uniformly.
#
# Files tracked but deleted from the worktree simply drop out of the listing,
# which changes the hash — that is the intended signal.
#
# NUL-delimited throughout (`-z`, `xargs -0`), so paths git would C-quote in a
# newline listing are hashed correctly rather than skipped.
fingerprint() {
  local listing
  # `|| true` twice: sha256sum exits non-zero for a tracked path deleted from
  # the worktree, and under `pipefail` that would abort the caller. The path
  # simply dropping out of the listing is the signal we want.
  listing=$(
    {
      git ls-files -c -o --exclude-standard -z -- "$@" 2>/dev/null || true
    } | sort -z -u | xargs -0 -r sha256sum 2>/dev/null || true
  )
  printf '%s' "$listing" | sha256sum | cut -d' ' -f1
}

# =============================================================================
# CHECK CACHE
# =============================================================================

# A cache entry is an empty file named "<check>.<fingerprint>". Its presence
# means "this check passed for exactly this input". Storing a result drops any
# older entry for the same check, so the directory stays small.

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
