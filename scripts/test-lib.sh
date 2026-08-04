#!/usr/bin/env bash
# Shared helpers for the validation suites.
#
# Sourced by scripts/validation-lib.test.sh and scripts/validate.test.sh. It
# exists so the scratch guard and the assertion harness have one definition each
# rather than a hand-copied block in both — the same reason
# lib/is-git-commit.sh exists. The copies had already drifted: one carried the
# comment explaining why not_ok must return 0, the other only the code.

# Refuse to proceed unless the given path is a usable scratch directory.
#
# `cd ""` is a successful no-op in bash, so a failed `mktemp` silently pointed a
# whole suite at the working repo: fixtures created there, commits landed on the
# branch, .gitignore overwritten. Every mktemp site goes through this.
#
# The containment test is a prefix, not equality: `mktemp` cannot return the repo
# root, but TMPDIR pointing inside the worktree is a real configuration and puts
# the scratch under it, where `git clean` in a fixture reset reaches the repo's
# own files.
require_scratch() {
  local path=$1 label=$2 repo=$3

  if [ ! -d "$path" ]; then
    echo "$label: could not create a scratch directory; refusing to run" >&2
    return 1
  fi
  case "$path" in
    "$repo" | "$repo"/*)
      echo "$label: scratch directory $path is inside the repository; refusing to run" >&2
      echo "$label: unset TMPDIR or point it outside $repo" >&2
      return 1
      ;;
  esac
  if [ -e "$path/.git" ]; then
    echo "$label: scratch directory $path is already a repository; refusing to run" >&2
    return 1
  fi
  return 0
}

# Same, for a temp FILE. Separate entry point rather than a mode flag, because
# every caller wants one or the other and a wrong flag would be silent. It
# exists so the third mktemp site stops open-coding a weaker copy of the checks.
require_temp_file() {
  local path=$1 label=$2 repo=$3

  if [ ! -f "$path" ]; then
    echo "$label: could not create a temp file; refusing to run" >&2
    return 1
  fi
  case "$path" in
    "$repo" | "$repo"/*)
      echo "$label: temp file $path is inside the repository; refusing to run" >&2
      return 1
      ;;
  esac
  return 0
}

# --- assertion harness ---------------------------------------------------------

PASS=0
FAIL=0

ok() {
  PASS=$((PASS + 1))
  echo "  ok   - $1"
}

not_ok() {
  FAIL=$((FAIL + 1))
  echo "  FAIL - $1"
  [ $# -gt 1 ] && echo "         $2"
  # Must return 0: the `cond && not_ok X || ok X` call sites would otherwise run
  # both branches when this returns non-zero, counting one result twice.
  return 0
}

assert_eq() {
  if [ "$2" = "$3" ]; then ok "$1"; else not_ok "$1" "expected equal, got '$2' vs '$3'"; fi
}

assert_ne() {
  if [ "$2" != "$3" ]; then ok "$1"; else not_ok "$1" "expected different, both '$2'"; fi
}

# Print the tally and set the suite's exit status.
report() {
  echo
  echo "$PASS passed, $FAIL failed"
  [ "$FAIL" -eq 0 ]
}

# --- guard coverage ------------------------------------------------------------

# Every branch of both guards, asserted by whichever suite calls this.
#
# Both suites are protected by these functions, so both assert them: pinned in
# one only, a change made while running the other reads as green. And each row
# checks the MESSAGE, not just a non-zero status — two branches return 1, so a
# fixture that stops at the wrong one satisfies a status check while asserting
# nothing about the branch it is named for.
#
# $1 is a usable scratch directory outside the repo, $2 the repo root.
assert_guard_rows() {
  local scratch=$1 repo=$2 out

  out=$(require_scratch "" "probe" "$repo" 2>&1)
  case "$out" in
    *"could not create a scratch directory"*) ok "an empty scratch path is refused" ;;
    *) not_ok "an empty scratch path is refused" "$out" ;;
  esac

  out=$(require_scratch "$repo/scripts" "probe" "$repo" 2>&1)
  case "$out" in
    *"is inside the repository"*) ok "a scratch path inside the repo is refused" ;;
    *) not_ok "a scratch path inside the repo is refused" "$out" ;;
  esac

  mkdir -p "$scratch/guard-probe-repo/.git"
  out=$(require_scratch "$scratch/guard-probe-repo" "probe" "$repo" 2>&1)
  case "$out" in
    *"is already a repository"*) ok "a scratch path that is already a repository is refused" ;;
    *) not_ok "a scratch path that is already a repository is refused" "$out" ;;
  esac
  rm -rf "$scratch/guard-probe-repo"

  mkdir -p "$scratch/guard-probe-ok"
  if require_scratch "$scratch/guard-probe-ok" "probe" "$repo" 2>/dev/null; then
    ok "a real scratch path is accepted"
  else
    not_ok "a real scratch path is accepted" "a usable directory outside the repo was refused"
  fi
  rmdir "$scratch/guard-probe-ok"

  # Both of the next two land on the same `! -f` branch — require_temp_file has
  # no directory-specific case, and does not need one. Two names for one lever,
  # kept because the pair documents which inputs the branch is meant to cover.
  out=$(require_temp_file "" "probe" "$repo" 2>&1)
  case "$out" in
    *"could not create a temp file"*) ok "an empty temp-file path is refused" ;;
    *) not_ok "an empty temp-file path is refused" "$out" ;;
  esac

  out=$(require_temp_file "$scratch" "probe" "$repo" 2>&1)
  case "$out" in
    *"could not create a temp file"*) ok "a directory is refused as a temp file" ;;
    *) not_ok "a directory is refused as a temp file" "$out" ;;
  esac

  out=$(require_temp_file "$repo/package.json" "probe" "$repo" 2>&1)
  case "$out" in
    *"is inside the repository"*) ok "a temp-file path inside the repo is refused" ;;
    *) not_ok "a temp-file path inside the repo is refused" "$out" ;;
  esac
}
