#!/usr/bin/env bash
# Single definition of "does this shell command run `git commit`".
#
# Sourced by .claude/hooks/pre-git-commit.sh, which enforces the commit gate,
# and by scripts/validate.test.sh, which table-drives it. One definition on
# purpose: two copies kept in agreement by a guard is drift waiting to happen.

# This deliberately errs towards matching. Shell syntax cannot be parsed
# reliably with a regex, and the two failure directions are not symmetric: a
# false positive costs one command that has to run again once validation is
# green, while a false negative is an unvalidated commit — the thing the gate
# exists to stop.
#
# So `git` only has to be preceded by something that is not part of a longer
# word: start of string, whitespace, newline, quote, paren, semicolon, pipe.
# `grep "git commit" file` matches too, and that is the acceptable direction.
# Anchoring on an explicit separator list instead would let `(git commit ...)`,
# `then git commit`, `FOO=1 git commit` and — because bash `=~` has no
# multiline mode, so `^` is start-of-string — every multi-line command
# straight through.
#
# Between `git` and `commit`, only git's own global options are allowed, with
# the value-taking ones spelled out. That is what keeps `git grep commit` — a
# real, different command — from being gated.

# An option value is either bare, or single/double quoted — quoted because
# paths contain spaces, and a bare `[^[:space:]]+` stops at the first one,
# which would leave `git -C "/path with space" commit` ungated.
# A quoted section may carry a bare prefix (`user.name="A B"`), so the quoted
# alternative allows non-space text on either side of it.
# shellcheck disable=SC2034  # consumed by the regex in is_git_commit
_IGC_VAL='([^[:space:]]*("[^"]*"|'"'"'[^'"'"']*'"'"')[^[:space:]]*|[^[:space:]]+)'
# shellcheck disable=SC2034
_IGC_OPT='(-[Cc][[:space:]]+'"$_IGC_VAL"'|--(git-dir|work-tree|namespace|exec-path)[=[:space:]]'"$_IGC_VAL"'|-[^[:space:]]+)'

# `\\[[:space:]]` covers a backslash-newline line continuation between tokens.
# shellcheck disable=SC2034
_IGC_SP='([[:space:]]|\\[[:space:]])+'

# The subcommand may be quoted (`git "commit" -m x`). `git grep commit` stays
# out because `grep` is neither an option nor the subcommand.
# shellcheck disable=SC2034
_IGC_Q='["'"'"']?'

# Cheap pre-filter over the RAW hook input, before it is parsed.
#
# It lives here rather than in the hook because it is the same question as
# is_git_commit and must stay a superset of it — a second predicate in another
# file is exactly the drift this file exists to prevent.
#
# A `\u` escape decodes to anything, including the subcommand itself
# (`git commit`), so it is treated as unknowable and sent down the parsing
# path rather than approved. A literal backslash-u in a payload takes the same
# route, which is the fail-closed direction.
might_be_git_commit() {
  case "$1" in
    *commit* | *'\u'* | *'\U'*) return 0 ;;
    *) return 1 ;;
  esac
}

is_git_commit() {
  [[ $1 =~ (^|[^[:alnum:]_.-])git(${_IGC_SP}${_IGC_OPT})*${_IGC_SP}${_IGC_Q}commit${_IGC_Q}([^[:alnum:]_-]|$) ]]
}
