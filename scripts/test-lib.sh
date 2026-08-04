#!/usr/bin/env bash
# Shared helpers for the validation suites.
#
# Sourced by scripts/validation-lib.test.sh and scripts/validate.test.sh. It
# exists so the scratch-directory guard has one definition rather than a
# hand-copied block in each — the same reason lib/is-git-commit.sh exists.

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

  if [ -z "$path" ] || [ ! -d "$path" ]; then
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

  if [ -z "$path" ] || [ ! -f "$path" ]; then
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
