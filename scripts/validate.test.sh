#!/usr/bin/env bash
# Behavior tests for the validation system: the fingerprint/cache primitives
# (scripts/validation-lib.sh), the runner and its commit gate
# (scripts/validate.sh), and the hook that consumes the gate
# (.claude/hooks/pre-git-commit.sh with .claude/hooks/lib/is-git-commit.sh).
#
# Everything runs against scratch repositories under mktemp with `pnpm`
# stubbed, so the suite needs only bash, git and jq and finishes in seconds.
# CI runs it via .github/workflows/ci-shell.yml; locally it is the
# `validation:test` check in scripts/validate.sh.

set -uo pipefail

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
  (cd "$dir" && bash -c "source '$REAL_ROOT/scripts/validation-lib.sh' || exit 99; $*")
}

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
echo "# validate.sh in a scratch monorepo"
# =============================================================================

# Stub pnpm/node: instant pass, or instant fail while the marker file exists.
STUB_BIN="$WORK/bin"
STUB_FAIL="$WORK/stub-fail"
mkdir -p "$STUB_BIN"
for tool in pnpm node; do
  cat >"$STUB_BIN/$tool" <<EOF
#!/bin/bash
[ -f "$STUB_FAIL" ] && exit 1
exit 0
EOF
  chmod +x "$STUB_BIN/$tool"
done

M="$WORK/mono"
make_repo "$M"
mkdir -p "$M/scripts" "$M/packages/web/src" "$M/packages/shared/src" \
  "$M/packages/mobile/src" "$M/packages/worker/src" "$M/help-site/src" "$M/docs"
cp "$REAL_ROOT/scripts/validate.sh" "$REAL_ROOT"/scripts/validation-*.sh "$M/scripts/"
echo '{}' >"$M/package.json"
echo '.validation-cache/' >"$M/.gitignore"
echo 'export const a = 1' >"$M/packages/web/src/app.ts"
echo 'export const s = 1' >"$M/packages/shared/src/index.ts"
echo 'export const w = 1' >"$M/packages/worker/src/index.ts"
commit_all "$M" "monorepo snapshot"

run_validate() { # run_validate <args...>; sets V_OUT and V_STATUS
  V_OUT=$( (cd "$M" && PATH="$STUB_BIN:$PATH" bash scripts/validate.sh "$@") 2>&1 )
  V_STATUS=$?
}

run_validate --gate
check "clean scratch repo: gate is open" "$V_STATUS" "$V_OUT"

echo 'export const a = 2' >"$M/packages/web/src/app.ts"
run_validate --gate
check "web edit closes the gate" "$([ "$V_STATUS" -eq 1 ]; echo $?)" "exit=$V_STATUS"
for record in "check web:lint" "check web:test" "check web:build" "check format"; do
  check "gate reports '$record'" "$(printf '%s\n' "$V_OUT" | grep -qx "$record"; echo $?)" "$V_OUT"
done
check "gate does not report worker checks for a web edit" \
  "$(printf '%s\n' "$V_OUT" | grep -q "worker"; echo $((1 - $?)))" "$V_OUT"

run_validate
check "full run with stubbed tools passes" "$V_STATUS" "$V_OUT"
run_validate --gate
check "gate is open after a passing run" "$V_STATUS" "$V_OUT"

git -C "$M" add -A
run_validate --gate
check "git add alone does not reopen the gate" "$V_STATUS" "$V_OUT"

# Staged content vs worktree content: the divergence rule.
echo 'export const a = 3' >"$M/packages/web/src/app.ts"
run_validate --gate
check "post-add edit closes the gate again" "$([ "$V_STATUS" -eq 1 ]; echo $?)" "exit=$V_STATUS"
run_validate
check "re-validating the edit passes" "$V_STATUS" "$V_OUT"
run_validate --gate
check "validated-but-unstaged content blocks as 'unstaged'" \
  "$([ "$V_STATUS" -eq 1 ] && printf '%s\n' "$V_OUT" | grep -qx "unstaged packages/web/src/app.ts"; echo $?)" \
  "exit=$V_STATUS out=$V_OUT"
git -C "$M" add -A
run_validate --gate
check "staging the validated content opens the gate" "$V_STATUS" "$V_OUT"
commit_all "$M" "web edit"

# Cross-package isolation and the shared fan-out.
echo 'export const w = 2' >"$M/packages/worker/src/index.ts"
run_validate --gate
check "worker edit reports worker:lint" \
  "$(printf '%s\n' "$V_OUT" | grep -qx "check worker:lint"; echo $?)" "$V_OUT"
check "worker edit reports no web check" \
  "$(printf '%s\n' "$V_OUT" | grep -q "check web:"; echo $((1 - $?)))" "$V_OUT"
git -C "$M" checkout -q -- .

echo 'export const s = 2' >"$M/packages/shared/src/index.ts"
run_validate --gate
for record in "check shared:lint" "check web:lint" "check mobile:lint"; do
  check "shared edit fans out: '$record'" \
    "$(printf '%s\n' "$V_OUT" | grep -qx "$record"; echo $?)" "$V_OUT"
done
git -C "$M" checkout -q -- .

# Docs-only changes register format (markdown is in the format glob and
# nothing else gates it) but no package checks.
echo 'notes' >"$M/docs/README.md"
run_validate --gate
check "docs-only change requires format" \
  "$([ "$V_STATUS" -eq 1 ] && printf '%s\n' "$V_OUT" | grep -qx "check format"; echo $?)" \
  "exit=$V_STATUS out=$V_OUT"
check "docs-only change requires nothing else" \
  "$(printf '%s\n' "$V_OUT" | grep -qv "^check format$"; echo $((1 - $?)))" "$V_OUT"
run_validate
run_validate --gate
check "formatted docs-only change opens the gate" "$V_STATUS" "$V_OUT"
rm "$M/docs/README.md"

# A prettier-config edit widens format to every formattable file, so it must
# register a check even when no formattable file changed.
echo 'dist/' >"$M/.prettierignore"
run_validate --gate
check "a lone .prettierignore edit registers format" \
  "$([ "$V_STATUS" -eq 1 ] && printf '%s\n' "$V_OUT" | grep -qx "check format"; echo $?)" \
  "exit=$V_STATUS out=$V_OUT"
run_validate
check "widened format run passes" "$V_STATUS" "$V_OUT"
rm "$M/.prettierignore"

# Failure path: nothing is cached for a failing check.
echo 'export const a = 4' >"$M/packages/web/src/app.ts"
touch "$STUB_FAIL"
run_validate
check "failing check fails the run" "$([ "$V_STATUS" -eq 1 ]; echo $?)" "exit=$V_STATUS"
rm "$STUB_FAIL"
run_validate --gate
check "failed checks are not cached — gate stays closed" \
  "$([ "$V_STATUS" -eq 1 ]; echo $?)" "exit=$V_STATUS"
run_validate
run_validate --gate
check "fixing the tool and re-running opens the gate" "$V_STATUS" "$V_OUT"
git -C "$M" add -A
commit_all "$M" "settle"

# Class filter: a lint-only run caches lint and reports the rest.
echo 'export const a = 5' >"$M/packages/web/src/app.ts"
run_validate lint
check "class-filtered run passes" "$V_STATUS" "$V_OUT"
run_validate --gate
check "lint no longer missing after 'validate.sh lint'" \
  "$(printf '%s\n' "$V_OUT" | grep -q "check web:lint"; echo $((1 - $?)))" "$V_OUT"
check "test still missing after 'validate.sh lint'" \
  "$(printf '%s\n' "$V_OUT" | grep -qx "check web:test"; echo $?)" "$V_OUT"
run_validate
git -C "$M" add -A
commit_all "$M" "settle again"

check "--gate with a class filter is rejected" \
  "$( (cd "$M" && bash scripts/validate.sh --gate lint >/dev/null 2>&1); [ $? -eq 2 ]; echo $?)"

# =============================================================================
echo "# policy agrees with package.json"
# =============================================================================

# FORMAT_EXT is a declared constant; the root `format` script's glob is the
# set `pnpm run format` actually writes. They must be the same set — a runtime
# derivation was rejected (jq at every startup, silent narrowing on a second
# brace group), so drift shows up here instead.
POLICY_EXT=$(cd "$REAL_ROOT" && bash -c 'source scripts/validation-policy.sh >/dev/null 2>&1; printf "%s" "$FORMAT_EXT"')
GLOBS=$(jq -r '.scripts.format // ""' "$REAL_ROOT/package.json" | grep -o '{[^}]*}' | tr -d '{}')
EXPECTED_EXT="\\.($(printf '%s' "$GLOBS" | tr ',' '|'))\$"
check "root format script has exactly one extension glob" \
  "$([ -n "$GLOBS" ] && [ "$(printf '%s\n' "$GLOBS" | wc -l)" -eq 1 ]; echo $?)" "globs=$GLOBS"
check "FORMAT_EXT matches the root format script's glob" \
  "$([ "$POLICY_EXT" = "$EXPECTED_EXT" ]; echo $?)" "policy=$POLICY_EXT package.json=$EXPECTED_EXT"

# =============================================================================
echo "# is_git_commit"
# =============================================================================

# shellcheck source=../.claude/hooks/lib/is-git-commit.sh
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

# =============================================================================
echo "# pre-git-commit hook"
# =============================================================================

hook_decision() { # hook_decision <command string>; sets H_OUT
  local payload
  payload=$(jq -cn --arg cmd "$1" '{tool_input: {command: $cmd}}')
  H_OUT=$( (cd "$M" && printf '%s' "$payload" |
    CLAUDE_CODE_REMOTE=true PATH="$STUB_BIN:$PATH" \
      bash "$REAL_ROOT/.claude/hooks/pre-git-commit.sh") 2>&1 )
}

hook_decision 'ls -la'
check "hook approves a non-commit command" \
  "$(printf '%s' "$H_OUT" | grep -q '"approve"'; echo $?)" "$H_OUT"

hook_decision 'git commit -m "clean tree"'
check "hook approves a commit when the gate is open" \
  "$(printf '%s' "$H_OUT" | grep -q '"approve"'; echo $?)" "$H_OUT"

echo 'export const a = 6' >"$M/packages/web/src/app.ts"
hook_decision 'git commit -m "unvalidated"'
check "hook blocks a commit when checks are missing" \
  "$(printf '%s' "$H_OUT" | grep -q '"block"'; echo $?)" "$H_OUT"
check "block reason names the missing check" \
  "$(printf '%s' "$H_OUT" | grep -q 'web:lint'; echo $?)" "$H_OUT"

run_validate
git -C "$M" add -A
hook_decision 'git commit -m "validated"'
check "hook approves after validation and staging" \
  "$(printf '%s' "$H_OUT" | grep -q '"approve"'; echo $?)" "$H_OUT"
commit_all "$M" "hook settle"

# Gate crash: the hook must block, not approve, when validate.sh cannot run.
cp "$M/scripts/validate.sh" "$M/scripts/validate.sh.bak"
printf '#!/bin/bash\necho boom >&2\nexit 3\n' >"$M/scripts/validate.sh"
hook_decision 'git commit -m "broken gate"'
check "hook blocks when the gate itself fails" \
  "$(printf '%s' "$H_OUT" | grep -q '"block"'; echo $?)" "$H_OUT"
check "broken-gate reason says the gate did not run" \
  "$(printf '%s' "$H_OUT" | grep -q 'did not run'; echo $?)" "$H_OUT"
mv "$M/scripts/validate.sh.bak" "$M/scripts/validate.sh"

hook_decision 'git commit -m "restored"'
check "hook approves again once the gate is restored" \
  "$(printf '%s' "$H_OUT" | grep -q '"approve"'; echo $?)" "$H_OUT"

OUT=$(printf '%s' '{"tool_input": {"command": "echo hi"}}' |
  CLAUDE_CODE_REMOTE=false bash "$REAL_ROOT/.claude/hooks/pre-git-commit.sh" 2>&1)
check "hook approves everything outside Claude Code web" \
  "$(printf '%s' "$OUT" | grep -q '"approve"'; echo $?)" "$OUT"

# =============================================================================
echo ""
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
