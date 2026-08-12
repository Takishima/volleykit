#!/usr/bin/env bash
# End-to-end behavior tests for scripts/validate.sh and the commit hook,
# against a scratch monorepo with `pnpm` stubbed. The primitive and
# real-repo tests live in scripts/tests/primitives.test.sh;
# scripts/validate.test.sh runs both.

# SC2319: `"$([ condition ]; echo $?)"` is this suite's one check idiom — the
# status is captured immediately, nothing overwrites it, and check() wants a
# status argument, not a guarded command.
# shellcheck disable=SC2319

set -uo pipefail

# shellcheck source=./harness.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/harness.sh"

PKG_LIST=$(read_policy 'printf "%s\n" "${PKG_NAMES[@]}"')

# =============================================================================
echo "# fixture"
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
# The fixture carries the runner and everything it is built from: the
# pathspecs below are exactly the trees CORE_ROOT / SHELL_INPUTS /
# EXEC_BIT_PATHS / TOKENS_INPUTS cover. Tracked files only — an untracked
# scratch file must not change fixture behavior — and by construction the
# copy cannot include this suite (scripts/tests/ matches none of the
# pathspecs), so the suite can never recurse into itself. cp preserves exec
# bits, and git records them on commit, so the fixture's exec-bit state
# mirrors the repo's.
COPY_SET=$(cd "$REAL_ROOT" && git ls-files -- \
  scripts/validate.sh scripts/validation scripts/shellcheck.sh \
  scripts/sync-style-tokens.js .claude/hooks)
while IFS= read -r s; do
  mkdir -p "$M/$(dirname "$s")"
  cp "$REAL_ROOT/$s" "$M/$s" || not_ok "fixture copies $s" "missing from the repo"
done <<<"$COPY_SET"
# The fixture registry registers `bash scripts/validate.test.sh` as
# validation:test's command whenever a .sh file is dirty; a missing file
# would red every fixture full run at 127, and the real suite would recurse.
# A stub keeps the registration executable.
printf '#!/usr/bin/env bash\nexit 0\n' >"$M/scripts/validate.test.sh"
echo '{}' >"$M/package.json"
# The spec path comes from the policy, not a hand copy — an API_SPEC rename
# must move the fixture spec with it.
SPEC_PATH=$(read_policy 'printf "%s" "$API_SPEC"')
mkdir -p "$M/$(dirname "$SPEC_PATH")"
echo 'openapi: 3.0.0' >"$M/$SPEC_PATH"
echo '.validation-cache/' >"$M/.gitignore"
mkdir -p "$M/packages/shared/styles"
echo 'module.exports = {}' >"$M/packages/shared/styles/colors.js"
echo 'export const a = 1' >"$M/packages/web/src/app.ts"
echo 'export const s = 1' >"$M/packages/shared/src/index.ts"
echo 'export const w = 1' >"$M/packages/worker/src/index.ts"
commit_all "$M" "monorepo snapshot"

run_validate() { # run_validate <args...>; sets V_OUT and V_STATUS
  V_OUT=$( (cd "$M" && PATH="$STUB_BIN:$PATH" bash scripts/validate.sh "$@") 2>&1 )
  V_STATUS=$?
}

# =============================================================================
echo "# the gate"
# =============================================================================

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

# The OpenAPI spec is one path with two consumers: editing it must both mark
# the schema-reading packages affected and route the full run through the
# regeneration branch (stubbed pnpm here — the echo below is printed only
# inside that branch).
echo '# spec probe' >>"$M/$SPEC_PATH"
run_validate --gate
for record in "check web:lint" "check shared:lint" "check mobile:lint"; do
  check "spec edit fans out: '$record'" \
    "$(printf '%s\n' "$V_OUT" | grep -qx "$record"; echo $?)" "$V_OUT"
done
run_validate
check "full run on a spec edit reaches the regeneration branch" \
  "$(printf '%s' "$V_OUT" | grep -qF 'regenerating types'; echo $?)" "$V_OUT"
run_validate --gate
check "spec edit validates clean" "$V_STATUS" "$V_OUT"
git -C "$M" checkout -q -- "$SPEC_PATH"

# TOKENS_INPUTS is its own trigger: a styles edit must register the token
# check alongside the package fan-out.
echo '// token probe' >>"$M/packages/shared/styles/colors.js"
run_validate --gate
check "a styles edit registers the tokens check" \
  "$([ "$V_STATUS" -eq 1 ] && printf '%s\n' "$V_OUT" | grep -qx "check tokens"; echo $?)" \
  "exit=$V_STATUS out=$V_OUT"
git -C "$M" checkout -q -- packages/shared/styles

# =============================================================================
echo "# validation code invalidates the cache"
# =============================================================================

# Editing any file the runner is built from must invalidate every package
# check: CORE_ROOT covers scripts/validate.sh and the whole scripts/validation
# directory, so the property is structural — no file has to be declared. The
# probe set is derived from git, per file, so a module added to the directory
# is probed here without editing the suite. A file that escaped CORE_ROOT
# would fail its probe with the stale-PASS signature: the edit registers
# validation:* only, no package check.
#
# The probe reads absolute gate state, so every iteration re-pins its
# baseline: leaked dirty state from an earlier case would otherwise register
# package checks by itself and turn the remaining probes into no-ops.
LOAD_SET=$(cd "$REAL_ROOT" && git ls-files -- scripts/validate.sh scripts/validation)
while IFS= read -r rel; do
  run_validate --gate
  check "baseline before probing $rel: gate is open" "$V_STATUS" "$V_OUT"
  printf '\n# invalidation probe\n' >>"$M/$rel"
  run_validate --gate
  # Every package from the table, not a hand-copied list: a package added to
  # PKG_NAMES is asserted here without editing the suite, and a script moved
  # out of CORE_ROOT into one package's inputs cannot hide behind the others.
  MISS=$(while IFS= read -r p; do
    printf '%s\n' "$V_OUT" | grep -qE "^check $p:" || echo "$p"
  done <<<"$PKG_LIST")
  check "editing $rel invalidates the package checks" \
    "$([ "$V_STATUS" -eq 1 ] && [ -z "$MISS" ]; echo $?)" "exit=$V_STATUS missing=$MISS"
  git -C "$M" checkout -q -- "$rel"
done <<<"$LOAD_SET"

# A mode change is invisible to every fingerprint, so the exec-bit invariant
# is uncached: it must red the gate even when every check is a cache hit, and
# its message must carry the remedy.
git -C "$M" update-index --chmod=-x .claude/hooks/pre-git-commit.sh
run_validate --gate
check "a dropped hook exec bit fails the gate closed uncached" \
  "$([ "$V_STATUS" -eq 3 ] && printf '%s' "$V_OUT" | grep -q 'not tracked executable'; echo $?)" \
  "exit=$V_STATUS out=$V_OUT"
check "the exec-bit failure names the chmod remedy" \
  "$(printf '%s' "$V_OUT" | grep -q 'update-index --chmod=+x'; echo $?)" "$V_OUT"
git -C "$M" update-index --chmod=+x .claude/hooks/pre-git-commit.sh

check "--gate with a class filter is rejected" \
  "$( (cd "$M" && bash scripts/validate.sh --gate lint >/dev/null 2>&1); [ $? -eq 2 ]; echo $?)"

# --help must resolve its own file after the cd to the repo root (a relative
# $0 does not — hence the invocation from a subdirectory) and must stop at the
# END HELP sentinel rather than printing the whole script.
H_OUT=$( (cd "$M/packages/web" && bash ../../scripts/validate.sh --help) 2>&1 )
check "--help renders the usage block from a subdirectory" \
  "$(printf '%s' "$H_OUT" | grep -q 'Classes:'; echo $?)" "$H_OUT"
# Tied to the block having rendered: error output is non-empty and contains
# no 'Layout:' either, so a bare negative would pass on a broken --help.
check "--help stops at the sentinel" \
  "$(printf '%s' "$H_OUT" | grep -q 'Classes:' && ! printf '%s' "$H_OUT" | grep -q 'Layout:'; echo $?)" "$H_OUT"

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

# The record protocol is extensible; a kind this hook does not know must
# still be rendered into the reason, never dropped into an empty block.
cp "$M/scripts/validate.sh" "$M/scripts/validate.sh.bak"
printf '#!/bin/bash\n[ "$1" = --gate ] && { echo "mystery thing"; exit 1; }\nexit 0\n' \
  >"$M/scripts/validate.sh"
hook_decision 'git commit -m "unknown record"'
check "hook renders an unknown gate record rather than blocking blank" \
  "$(printf '%s' "$H_OUT" | grep -q '"block"' && printf '%s' "$H_OUT" | grep -q 'mystery thing'; echo $?)" "$H_OUT"

# And a stream that parses to nothing at all — blank lines only — must fall
# back to the generic remedy, never an empty reason.
printf '#!/bin/bash\n[ "$1" = --gate ] && { echo " "; exit 1; }\nexit 0\n' \
  >"$M/scripts/validate.sh"
hook_decision 'git commit -m "blank record"'
check "hook blocks with a remedy when the gate names nothing renderable" \
  "$(printf '%s' "$H_OUT" | grep -q '"block"' && printf '%s' "$H_OUT" | grep -q 'named nothing'; echo $?)" "$H_OUT"
mv "$M/scripts/validate.sh.bak" "$M/scripts/validate.sh"

# A dropped exec bit must surface through the hook with its remedy, not as a
# silent approve (a broken gate is exit 3, and the hook renders its stderr).
git -C "$M" update-index --chmod=-x .claude/hooks/pre-git-commit.sh
hook_decision 'git commit -m "mode drop"'
check "hook blocks on a dropped exec bit and names the remedy" \
  "$(printf '%s' "$H_OUT" | grep -q '"block"' && printf '%s' "$H_OUT" | grep -q 'chmod=+x'; echo $?)" "$H_OUT"
git -C "$M" update-index --chmod=+x .claude/hooks/pre-git-commit.sh

OUT=$(printf '%s' '{"tool_input": {"command": "echo hi"}}' |
  CLAUDE_CODE_REMOTE=false bash "$REAL_ROOT/.claude/hooks/pre-git-commit.sh" 2>&1)
check "hook approves everything outside Claude Code web" \
  "$(printf '%s' "$OUT" | grep -q '"approve"'; echo $?)" "$OUT"

finish
