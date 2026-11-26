#!/usr/bin/env bash
# Prefetch the Nix inputs locked in devenv.lock inside Claude Code cloud sessions.
#
# The cloud sandbox proxy answers 403 to GitHub tarball downloads for any
# repository not attached to the session, so `github:` flake refs (and with
# them `nix shell nixpkgs#...`, `nix develop`, devenv) cannot be fetched.
# Fetching the same revision over the git protocol is allowed. This script
# does that for every locked input, in the background, and pins the `nixpkgs`
# registry entry to the result so plain `nixpkgs#pkg` refs work afterwards.
#
# Subcommands:
#   start   SessionStart hook: print the instructions, launch `fetch` detached
#   fetch   Worker: prefetch all inputs, pin the registry, record the result
#   notify  UserPromptSubmit hook: announce the result once it is available
#   status  Print the current state and the input -> store path table
#   wait    Block until the worker has finished (max WAIT_TIMEOUT_S), then status

set -euo pipefail

readonly WAIT_TIMEOUT_S=300
readonly WAIT_POLL_S=2

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
readonly PROJECT_DIR
readonly SELF="$PROJECT_DIR/.claude/hooks/nix-inputs.sh"
readonly LOCK_FILE="$PROJECT_DIR/devenv.lock"
readonly STATE_DIR="$PROJECT_DIR/.claude/.state/nix-inputs"
readonly STATUS_FILE="$STATE_DIR/status"     # "<running|done|failed> <lock hash>"
readonly INPUTS_FILE="$STATE_DIR/inputs.tsv" # "<name>\t<store path|FAILED>"
readonly LOG_FILE="$STATE_DIR/fetch.log"
readonly PID_FILE="$STATE_DIR/pid"
readonly NOTIFIED_FILE="$STATE_DIR/notified"

# Only cloud sessions have the restricted proxy; only act when the tools exist.
applicable() {
  [ "${CLAUDE_CODE_REMOTE:-}" = "true" ] &&
    [ -f "$LOCK_FILE" ] &&
    command -v nix >/dev/null 2>&1 &&
    command -v jq >/dev/null 2>&1
}

lock_hash() {
  sha256sum "$LOCK_FILE" | cut -d' ' -f1
}

# First word of the status file, or "none".
state() {
  local s=none
  [ -f "$STATUS_FILE" ] && read -r s _ <"$STATUS_FILE"
  echo "$s"
}

set_state() {
  printf '%s %s\n' "$1" "$2" >"$STATUS_FILE.tmp"
  mv "$STATUS_FILE.tmp" "$STATUS_FILE"
}

worker_alive() {
  [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

# True when a finished or still-running fetch already covers this devenv.lock.
up_to_date() {
  local s hash
  [ -f "$STATUS_FILE" ] || return 1
  read -r s hash <"$STATUS_FILE"
  [ "$hash" = "$(lock_hash)" ] || return 1
  case "$s" in
    done) return 0 ;;
    running) worker_alive ;;
    *) return 1 ;;
  esac
}

# "<name>\t<owner>\t<repo>\t<rev>" for every github-type locked input.
locked_github_inputs() {
  jq -r '.nodes | to_entries[]
    | select(.value.locked.type == "github")
    | [.key, .value.locked.owner, .value.locked.repo, .value.locked.rev]
    | @tsv' "$LOCK_FILE"
}

print_inputs() {
  [ -s "$INPUTS_FILE" ] || return 0
  echo "Locked inputs (name -> store path):"
  sed 's/\t/ -> /; s/^/  /' "$INPUTS_FILE"
}

print_instructions() {
  cat <<'EOF'
=== Nix flake inputs in this sandbox ===
GitHub tarball downloads are blocked here (HTTP 403 "GitHub access to this
repository is not enabled for this session"), so any `github:` flake ref fails:
`nix shell nixpkgs#x`, `nix flake prefetch github:...`, `nix develop`, devenv.
Do NOT retry those and do NOT call add_repo for nixpkgs & co.

Fetching over git works. To fetch any other input by hand:
  nix flake prefetch --json "git+https://github.com/<owner>/<repo>?rev=<rev>&shallow=1"

The inputs locked in devenv.lock are prefetched for you in the background and
the `nixpkgs` registry entry is pinned to the locked revision. Once that is done:
  nix shell nixpkgs#shellcheck -c shellcheck --version   # registry: just works
  nix-shell -I nixpkgs=<store path> -p <pkg>             # legacy commands
  --override-input <name> path:<store path>              # other flake inputs
Check or wait for the prefetch:
  .claude/hooks/nix-inputs.sh status
  .claude/hooks/nix-inputs.sh wait
EOF
}

cmd_start() {
  applicable || exit 0
  mkdir -p "$STATE_DIR"
  print_instructions
  echo
  if up_to_date; then
    echo "Prefetch state: $(state)."
    print_inputs
  else
    rm -f "$NOTIFIED_FILE" "$INPUTS_FILE"
    set_state running "$(lock_hash)"
    # Fully detached, so the hook returns at once and the session is not delayed.
    setsid nohup "$SELF" fetch </dev/null >"$LOG_FILE" 2>&1 &
    echo "Prefetch state: running in the background (takes about a minute)."
    echo "You will be told on the next user message once it has finished."
  fi
  echo "========================================"
}

cmd_fetch() {
  local hash failed=0 name owner repo rev path
  mkdir -p "$STATE_DIR"
  hash=$(lock_hash)
  echo $$ >"$PID_FILE"
  set_state running "$hash"
  : >"$INPUTS_FILE"
  while IFS=$'\t' read -r name owner repo rev; do
    echo "Fetching $name ($owner/$repo@$rev)"
    path=$(nix flake prefetch --json \
      "git+https://github.com/$owner/$repo?rev=$rev&shallow=1" | jq -r .storePath) || path=
    if [ -z "$path" ]; then
      path=FAILED
      failed=1
    elif [ "$name" = nixpkgs ]; then
      nix registry add nixpkgs "path:$path" || failed=1
    fi
    printf '%s\t%s\n' "$name" "$path" >>"$INPUTS_FILE"
  done < <(locked_github_inputs)
  if [ "$failed" -eq 0 ]; then set_state "done" "$hash"; else set_state failed "$hash"; fi
}

cmd_notify() {
  applicable || exit 0
  [ -f "$NOTIFIED_FILE" ] && exit 0
  case "$(state)" in
    done) echo "Nix inputs prefetch finished: \`nixpkgs#<pkg>\` refs now work." ;;
    failed) echo "Nix inputs prefetch FAILED for some inputs, see $LOG_FILE." ;;
    *) exit 0 ;;
  esac
  print_inputs
  touch "$NOTIFIED_FILE"
}

cmd_status() {
  echo "Prefetch state: $(state)"
  print_inputs
  if [ "$(state)" = failed ]; then echo "Log: $LOG_FILE"; fi
}

cmd_wait() {
  local waited=0
  while [ "$(state)" = running ] && worker_alive && [ "$waited" -lt "$WAIT_TIMEOUT_S" ]; do
    sleep "$WAIT_POLL_S"
    waited=$((waited + WAIT_POLL_S))
  done
  cmd_status
  [ "$(state)" = "done" ]
}

case "${1:-}" in
  start) cmd_start ;;
  fetch) cmd_fetch ;;
  notify) cmd_notify ;;
  status) cmd_status ;;
  wait) cmd_wait ;;
  *)
    echo "usage: $0 start|fetch|notify|status|wait" >&2
    exit 2
    ;;
esac
