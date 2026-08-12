#!/usr/bin/env bash
# Behavior tests for the validation primitives: fingerprinting, change
# detection, divergence, the cache, the context and registry lifecycle, the
# registration guard, the exec-bit invariant against the real repository,
# the commit predicate and the policy/package.json agreement rows. The
# end-to-end runner and hook tests live in scripts/tests/gate.test.sh;
# scripts/validate.test.sh runs both.

# SC2319: `"$([ condition ]; echo $?)"` is this suite's one check idiom — the
# status is captured immediately, nothing overwrites it, and check() wants a
# status argument, not a guarded command.
# shellcheck disable=SC2319

set -uo pipefail

# shellcheck source=./harness.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/harness.sh"

# =============================================================================
echo "# fingerprint"
# =============================================================================

R="$WORK/fp"
make_repo "$R"
mkdir -p "$R/pkg" "$R/other"
echo 'one' >"$R/pkg/a.txt"
echo 'two' >"$R/other/b.txt"
commit_all "$R"

FP0=$(in_repo "$R" 'fingerprint pkg')

echo 'edited' >"$R/pkg/a.txt"
FP_UNSTAGED=$(in_repo "$R" 'fingerprint pkg')
git -C "$R" add pkg/a.txt
FP_STAGED=$(in_repo "$R" 'fingerprint pkg')

check "content edit changes the fingerprint" \
  "$([ "$FP0" != "$FP_UNSTAGED" ]; echo $?)"
check "git add of the same bytes does not change the fingerprint" \
  "$([ "$FP_UNSTAGED" = "$FP_STAGED" ]; echo $?)" "unstaged=$FP_UNSTAGED staged=$FP_STAGED"

FP_OTHER0=$(in_repo "$R" 'fingerprint other')
echo 'edited again' >"$R/pkg/a.txt"
FP_OTHER1=$(in_repo "$R" 'fingerprint other')
check "an edit outside the pathspec leaves the fingerprint unchanged" \
  "$([ "$FP_OTHER0" = "$FP_OTHER1" ]; echo $?)"

echo 'new file' >"$R/pkg/untracked.txt"
FP_UNTRACKED=$(in_repo "$R" 'fingerprint pkg')
FP_BEFORE=$(git -C "$R" stash -q -u && in_repo "$R" 'fingerprint pkg'; git -C "$R" stash pop -q)
check "an untracked file enters the fingerprint" \
  "$([ "$FP_UNTRACKED" != "$FP_BEFORE" ]; echo $?)"

rm "$R/pkg/a.txt"
FP_DELETED=$(in_repo "$R" 'fingerprint pkg')
check "deleting a tracked file changes the fingerprint" \
  "$([ "$FP_DELETED" != "$FP_UNTRACKED" ]; echo $?)"

# =============================================================================
echo "# changed_files"
# =============================================================================

R="$WORK/cf"
make_repo "$R"
echo 'a' >"$R/committed.txt"
echo 'b' >"$R/staged.txt"
echo 'c' >"$R/dirty.txt"
commit_all "$R"

OUT=$(in_repo "$R" 'changed_files')
check "clean repo reports no changes" "$([ -z "$OUT" ]; echo $?)" "$OUT"

echo 'staged edit' >"$R/staged.txt"
git -C "$R" add staged.txt
echo 'dirty edit' >"$R/dirty.txt"
echo 'brand new' >"$R/untracked.txt"

OUT=$(in_repo "$R" 'changed_files')
for f in staged.txt dirty.txt untracked.txt; do
  check "changed_files lists $f" "$(printf '%s\n' "$OUT" | grep -qx "$f"; echo $?)" "$OUT"
done
check "changed_files does not list the unchanged file" \
  "$(printf '%s\n' "$OUT" | grep -qx "committed.txt"; echo $((1 - $?)))" "$OUT"

# A path staged and then restored on disk differs from HEAD only in the index:
# `git diff HEAD` says nothing about it, only `git diff --cached` does.
git -C "$R" checkout -q -- dirty.txt
echo 'index only' >"$R/dirty.txt"
git -C "$R" add dirty.txt
git -C "$R" restore -q --source=HEAD --worktree dirty.txt
OUT=$(in_repo "$R" 'changed_files')
check "a change that exists only in the index is still listed" \
  "$(printf '%s\n' "$OUT" | grep -qx "dirty.txt"; echo $?)" "$OUT"
git -C "$R" restore -q --staged dirty.txt
git -C "$R" checkout -q -- dirty.txt

touch "$R/bad\"name.txt"
in_repo "$R" 'changed_files' >/dev/null 2>&1
check "a path git must C-quote makes changed_files fail rather than skip" \
  "$([ $? -ne 0 ]; echo $?)"
in_repo "$R" 'tracked_and_untracked_files' >/dev/null 2>&1
check "the same path makes tracked_and_untracked_files fail rather than skip" \
  "$([ $? -ne 0 ]; echo $?)"
rm "$R/bad\"name.txt"

# =============================================================================
echo "# staged_worktree_divergence"
# =============================================================================

R="$WORK/div"
make_repo "$R"
echo 'a' >"$R/f.txt"
echo 'b' >"$R/g.txt"
commit_all "$R"

echo 'staged' >"$R/f.txt"
git -C "$R" add f.txt
OUT=$(in_repo "$R" 'staged_worktree_divergence')
check "staged-only file does not diverge" "$([ -z "$OUT" ]; echo $?)" "$OUT"

echo 'and dirty again' >"$R/f.txt"
echo 'merely dirty' >"$R/g.txt"
OUT=$(in_repo "$R" 'staged_worktree_divergence')
check "staged-and-dirty file diverges" "$(printf '%s\n' "$OUT" | grep -qx "f.txt"; echo $?)" "$OUT"
check "merely dirty file does not diverge" \
  "$(printf '%s\n' "$OUT" | grep -qx "g.txt"; echo $((1 - $?)))" "$OUT"

# =============================================================================
echo "# cache primitives"
# =============================================================================

R="$WORK/cache"
make_repo "$R"
git -C "$R" commit -q --allow-empty -m init

in_repo "$R" 'cache_store mycheck abc123; cache_hit mycheck abc123'
check "stored entry is a hit" $?
in_repo "$R" 'cache_store mycheck abc123; cache_hit mycheck other'
check "different fingerprint is a miss" "$((1 - $?))"
in_repo "$R" 'cache_store mycheck abc123; cache_store mycheck def456; cache_hit mycheck abc123'
check "storing a new fingerprint drops the old entry" "$((1 - $?))"
in_repo "$R" 'cache_store mycheck abc123; cache_drop mycheck; cache_hit mycheck abc123'
check "dropped entry is a miss" "$((1 - $?))"
in_repo "$R" 'cache_store mycheck abc123; VOLLEYKIT_NO_CACHE=1 cache_hit mycheck abc123'
check "VOLLEYKIT_NO_CACHE=1 bypasses the cache" "$((1 - $?))"

# =============================================================================
echo "# context and registry lifecycle"
# =============================================================================

# The per-run-reset symmetry of context.sh and checks.sh: each resets its
# state in the function that fills it (context_load, register_all_checks),
# and source-time declarations are type-only, so neither a re-source nor a
# repeated pass can leave partial or doubled state. The rule, by subject:
# rows about state that a load or a pass resets live here; rows about what
# _register and register_all_checks reject at registration live under
# "# registration guard". The fixture's web file stays untracked, so it is
# the change set.
R="$WORK/ctx"
make_repo "$R"
git -C "$R" commit -q --allow-empty -m init
mkdir -p "$R/packages/web/src"
echo 'export const a = 1' >"$R/packages/web/src/app.ts"

# An initializer on AFFECTED would half-reset the context on re-source —
# map emptied, scalars surviving — passing context_loaded and shrinking the
# registry to format alone.
RS_OUT=$(in_modules "$R" '
  context_load &&
  source "'"$REAL_ROOT"'/scripts/validation/context.sh" &&
  register_all_checks && echo "${CHECK_NAMES[*]}"' 2>&1)
check "the loaded context survives a re-source of context.sh" \
  "$(printf '%s' "$RS_OUT" | grep -q 'web:lint'; echo $?)" "$RS_OUT"

# An initializer on CHECK_NAMES would wipe the whole registry on re-source
# AFTER registration — validate.sh would read an empty registry and take
# the "nothing to validate" exit. The snippet prints a shape, so a red run
# reports `n=0 []` rather than the empty string that IS the failure.
RS_OUT=$(in_modules "$R" 'context_load && register_all_checks &&
  source "'"$REAL_ROOT"'/scripts/validation/checks.sh" &&
  printf "n=%s [%s]" "${#CHECK_NAMES[@]}" "${CHECK_NAMES[*]}"' 2>&1)
check "the filled registry survives a re-source of checks.sh" \
  "$(printf '%s' "$RS_OUT" | grep -q 'web:lint'; echo $?)" "$RS_OUT"

# register_all_checks resets the registry per pass, so a second pass on one
# load replaces it — never appends duplicate checks. The predicate gates on
# the count-pair shape first, so a chain that reds before printing fails as
# a malformed capture instead of a bare `[` error.
RG_OUT=$(in_modules "$R" 'context_load && register_all_checks &&
  printf "%s|" "${#CHECK_NAMES[@]}" && register_all_checks &&
  printf "%s" "${#CHECK_NAMES[@]}"' 2>&1)
check "a second registration pass replaces the registry, not appends" \
  "$([[ $RG_OUT =~ ^([0-9]+)\|([0-9]+)$ ]] && [ "${BASH_REMATCH[1]}" -gt 0 ] &&
    [ "${BASH_REMATCH[1]}" = "${BASH_REMATCH[2]}" ]; echo $?)" "$RG_OUT"

# =============================================================================
echo "# registration guard"
# =============================================================================

# checks.sh's header claims it defines functions only; pin the observable
# half — a standalone source succeeds silently, needing no other module and
# printing nothing. Deliberately NOT in_modules: standalone is the property.
G_OUT=$(bash -c "source '$REAL_ROOT/scripts/validation/checks.sh'" 2>&1)
check "checks.sh sources standalone with no output" \
  "$([ $? -eq 0 ] && [ -z "$G_OUT" ]; echo $?)" "$G_OUT"

# _register is the chokepoint every registration passes through. run_check
# execs argv without a shell, so a command that would need one must be
# rejected here — a metacharacter or newline reaching exec would run a
# truncated command and report green. The rows run with the full module
# chain loaded (in_modules), the same shape as a real run.
R="$WORK/reg"
make_repo "$R"
git -C "$R" commit -q --allow-empty -m init

G_OUT=$(in_modules "$R" '_register x lint /tmp "a.sh && b.sh" pkg' 2>&1)
check "a metacharacter command is rejected" \
  "$([ $? -ne 0 ] && printf '%s' "$G_OUT" | grep -q 'shell metacharacter'; echo $?)" "$G_OUT"

G_OUT=$(in_modules "$R" "_register x lint /tmp \$'a.sh\nb.sh' pkg" 2>&1)
check "a newline command is rejected" \
  "$([ $? -ne 0 ] && printf '%s' "$G_OUT" | grep -q 'newline in command'; echo $?)" "$G_OUT"

G_OUT=$(in_modules "$R" '_register x lint /tmp __nope__ pkg' 2>&1)
check "a sentinel without its composite_* function is rejected" \
  "$([ $? -ne 0 ] && printf '%s' "$G_OUT" | grep -q 'no composite_nope'; echo $?)" "$G_OUT"

in_modules "$R" '_register x lint /tmp __format__ pkg && [ "${CHECK_NAMES[0]}" = x ]'
check "a sentinel with its composite_* function registers" $?

in_modules "$R" '_register x lint /tmp "pnpm run lint" pkg && [ "${CHECK_NAMES[0]}" = x ]'
check "a plain argv command registers" $?

# One bad registration must fail the whole pass, not just its own row —
# register_all_checks reports through the latch, and the caller exits 3.
in_modules "$R" '_register x lint /tmp __nope__ pkg 2>/dev/null; [ "$REGISTER_FAILED" = 1 ]'
check "a guard violation latches REGISTER_FAILED" $?

# register_all_checks reads the loaded context, and the hazard is the full
# module chain sourced with context_load never called: `set -u` off, every
# variable unbound-but-empty, every arm skipped, exit 0 with an empty
# registry. context_loaded must turn that into an error with the remedy on
# stderr.
RA_OUT=$(in_modules "$R" 'register_all_checks' 2>&1) && RA_STATUS=0 || RA_STATUS=$?
check "register_all_checks without context_load errors, not an empty registry" \
  "$([ "$RA_STATUS" -ne 0 ] && printf '%s' "$RA_OUT" | grep -q 'context_load first'; echo $?)" \
  "status=$RA_STATUS out=$RA_OUT"

# =============================================================================
echo "# policy agrees with package.json"
# =============================================================================

# FORMAT_EXT is a declared constant; the root `format` script's glob is the
# set `pnpm run format` actually writes. They must be the same set — a runtime
# derivation was rejected (jq at every startup, silent narrowing on a second
# brace group), so drift shows up here instead. Sets, not strings: alternation
# order is irrelevant to the ERE, so a reordered glob must stay green.
POLICY_EXT=$(read_policy 'printf "%s" "$FORMAT_EXT"')
POLICY_SET=$(printf '%s' "$POLICY_EXT" | sed 's/^\\\.(//; s/)\$$//' | tr '|' '\n' | sort)
glob_set() { # glob_set <package.json script name>
  jq -r ".scripts.\"$1\" // \"\"" "$REAL_ROOT/package.json" | grep -o '{[^}]*}' | tr -d '{}'
}
GLOBS=$(glob_set format)
check "root format script has exactly one extension glob" \
  "$([ -n "$GLOBS" ] && [ "$(printf '%s\n' "$GLOBS" | wc -l)" -eq 1 ]; echo $?)" "globs=$GLOBS"
FORMAT_SET=$(printf '%s' "$GLOBS" | tr ',' '\n' | sort)
check "FORMAT_EXT matches the root format script's glob" \
  "$([ "$POLICY_SET" = "$FORMAT_SET" ]; echo $?)" "policy=$POLICY_SET package.json=$FORMAT_SET"
CHECK_SET=$(glob_set format:check | tr ',' '\n' | sort)
check "format:check covers the same set as format" \
  "$([ "$CHECK_SET" = "$FORMAT_SET" ]; echo $?)" "format:check=$CHECK_SET format=$FORMAT_SET"

# =============================================================================
echo "# exec bits in the real repo"
# =============================================================================

# The fixture rows in gate.test.sh pin the gate's behavior; these pin the
# actual repo state CI ships. The red-direction probe drops a bit in a
# scratch COPY of the index (GIT_INDEX_FILE), never the real one.
EB_OUT=$(in_modules "$REAL_ROOT" 'exec_bits "${EXEC_BIT_PATHS[@]}"' 2>&1) &&
  EB_STATUS=0 || EB_STATUS=$?
check "exec_bits passes on the real repo" "$EB_STATUS" "$EB_OUT"

EB_OUT=$(in_modules "$REAL_ROOT" '
  export GIT_INDEX_FILE="'"$WORK"'/exec-probe-index"
  cp "$(git rev-parse --git-dir)/index" "$GIT_INDEX_FILE"
  git update-index --chmod=-x .claude/hooks/pre-git-commit.sh
  exec_bits "${EXEC_BIT_PATHS[@]}"
' 2>&1) && EB_STATUS=0 || EB_STATUS=$?
check "a dropped hook exec bit fails exec_bits" \
  "$([ "$EB_STATUS" -ne 0 ] && printf '%s' "$EB_OUT" | grep -q 'not tracked executable:'; echo $?)" \
  "status=$EB_STATUS out=$EB_OUT"

# The remedy must name the real file, so the listing is split on the tab —
# awk's default FS would truncate a path containing spaces to its first word.
R="$WORK/eb"
make_repo "$R"
mkdir -p "$R/.claude/hooks"
echo '#!/bin/bash' >"$R/.claude/hooks/my hook.sh"
commit_all "$R"
EB_OUT=$(in_repo "$R" "exec_bits ':(glob).claude/hooks/*.sh'" 2>&1) && EB_STATUS=0 || EB_STATUS=$?
check "exec_bits names a non-exec path containing spaces in full" \
  "$([ "$EB_STATUS" -ne 0 ] && printf '%s' "$EB_OUT" | grep -qF '.claude/hooks/my hook.sh'; echo $?)" \
  "status=$EB_STATUS out=$EB_OUT"

# `:(glob)` keeps `*` from crossing `/`: the sourced helpers in
# .claude/hooks/lib/ are 100644, and demanding 100755 of them would red the
# gate on every legal checkout.
EB_OUT=$(in_modules "$REAL_ROOT" 'git ls-files -- "${EXEC_BIT_PATHS[@]}"' 2>&1)
check "EXEC_BIT_PATHS does not reach into .claude/hooks/lib/" \
  "$(printf '%s\n' "$EB_OUT" | grep -q '/lib/'; echo $((1 - $?)))" "$EB_OUT"
check "EXEC_BIT_PATHS covers the commit hook" \
  "$(printf '%s\n' "$EB_OUT" | grep -qx '.claude/hooks/pre-git-commit.sh'; echo $?)" "$EB_OUT"

# =============================================================================
echo "# is_git_commit"
# =============================================================================

# shellcheck source=../../.claude/hooks/lib/is-git-commit.sh
source "$REAL_ROOT/.claude/hooks/lib/is-git-commit.sh"

while IFS='|' read -r expect cmd; do
  is_git_commit "$cmd" && got=yes || got=no
  check "is_git_commit=$expect: $cmd" "$([ "$got" = "$expect" ]; echo $?)"
done <<'EOF'
yes|git commit -m "msg"
yes|git add -A && git commit -m "msg"
yes|cd packages/web; git commit
yes|git -C /some/path commit
yes|git -C "/path with spaces" commit
yes|git -c user.name="A B" commit -m x
yes|git "commit" -m x
yes|git --no-pager commit
yes|FOO=1 git commit
no|git log
no|git grep commit
no|git commitish
no|mygit commit
no|echo commit
no|ls -la
EOF

MULTILINE=$'pnpm test\ngit commit -m "msg"'
is_git_commit "$MULTILINE" && got=yes || got=no
check "is_git_commit=yes: multi-line command" "$([ "$got" = "yes" ]; echo $?)"

finish
