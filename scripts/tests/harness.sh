#!/usr/bin/env bash
# Shared harness for the validation test suites under scripts/tests/, sourced
# by each part. Provides the check/ok/not_ok counters, scratch-repo helpers
# and the real-repo read idioms. Each part owns its own mktemp WORK tree and
# ends with `finish`.

REAL_ROOT=$(git rev-parse --show-toplevel)
PASS=0
FAIL=0

ok() {
  PASS=$((PASS + 1))
  echo "  ok - $1"
}

not_ok() {
  FAIL=$((FAIL + 1))
  echo "  FAIL - $1${2:+ ($2)}"
}

check() { # check <description> <status: 0 pass / else fail> [detail]
  if [ "$2" -eq 0 ]; then ok "$1"; else not_ok "$1" "${3-}"; fi
}

finish() {
  echo ""
  echo "$PASS passed, $FAIL failed"
  [ "$FAIL" -eq 0 ]
}

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# A scratch git repo with identity configured.
make_repo() {
  local dir=$1
  mkdir -p "$dir"
  git -C "$dir" init -q -b main
  git -C "$dir" config user.email test@test
  git -C "$dir" config user.name test
}

commit_all() {
  git -C "$1" add -A
  git -C "$1" commit -q -m "${2:-snapshot}"
}

# Run a snippet inside a scratch repo with the real lib sourced.
in_repo() {
  local dir=$1
  shift
  (cd "$dir" && bash -c "source '$REAL_ROOT/scripts/validation/lib.sh' || exit 99; $*")
}

# Run a snippet inside a repo with the full module chain loaded, in the order
# scripts/validate.sh loads it — the one copy of that order in the suite, so
# rows needing more than the lib cannot each hardcode their own.
in_modules() { # in_modules <dir> <snippet>
  local dir=$1
  shift
  (cd "$dir" && bash -c "
    source '$REAL_ROOT/scripts/validation/lib.sh' &&
    source '$REAL_ROOT/scripts/validation/policy.sh' &&
    source '$REAL_ROOT/scripts/validation/context.sh' &&
    source '$REAL_ROOT/scripts/validation/checks.sh' || exit 99; $*")
}

# Evaluate a snippet with the real policy file loaded — the one idiom for
# reading policy values, so the suite cannot drift from the table it tests.
read_policy() {
  (cd "$REAL_ROOT" && bash -c "source scripts/validation/policy.sh >/dev/null 2>&1; $1")
}
