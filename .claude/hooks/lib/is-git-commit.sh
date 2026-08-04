#!/usr/bin/env bash
# Single definition of "does this shell command run `git commit`".
#
# Sourced by .claude/hooks/pre-git-commit.sh, which enforces the commit gate,
# and by scripts/validation-lib.test.sh, which table-drives it. One definition
# on purpose: an earlier version kept a copy in the test and a `grep` guard to
# detect drift, and the guard pinned only the match expression — mutating the
# option list in the hook left the suite green while the gate was bypassable.

# This deliberately errs towards matching. Shell syntax cannot be parsed
# reliably with a regex, and the two failure directions are not symmetric: a
# false positive costs one command that has to run again once validation is
# green, while a false negative is an unvalidated commit — the thing the gate
# exists to stop.
#
# So `git` only has to be preceded by something that is not part of a longer
# word: start of string, whitespace, newline, quote, paren, semicolon, pipe.
# `grep "git commit" file` matches too, and that is the acceptable direction.
# An earlier version anchored on an explicit separator list and let
# `(git commit ...)`, `then git commit`, `FOO=1 git commit` and — because bash
# `=~` has no multiline mode, so `^` is start-of-string — every multi-line
# command straight through.
#
# Between `git` and `commit`, only git's own global options are allowed, with
# the value-taking ones spelled out. That is what keeps `git grep commit` — a
# real, different command — from being gated.

# shellcheck disable=SC2034  # consumed by the regex in is_git_commit
_IGC_OPT='(-[Cc][[:space:]]+[^[:space:]]+|--(git-dir|work-tree|namespace|exec-path)[=[:space:]][^[:space:]]+|-[^[:space:]]+)'

# `\\[[:space:]]` covers a backslash-newline line continuation between tokens.
_IGC_SP='([[:space:]]|\\[[:space:]])+'

is_git_commit() {
  [[ $1 =~ (^|[^[:alnum:]_.-])git(${_IGC_SP}${_IGC_OPT})*${_IGC_SP}commit([^[:alnum:]_-]|$) ]]
}
