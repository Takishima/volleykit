#!/usr/bin/env bash
# Run context for scripts/validate.sh: what changed, and which packages that
# affects. Meant to be sourced after scripts/validation/policy.sh; defines
# functions only, reports failure through return codes and leaves exiting to
# the caller.
#
#   context_load || exit 3        # sets CHANGED, DOCS_ONLY, AFFECTED, ...
#
# context_load is re-run after API type generation: regeneration rewrites the
# generated schema, so the change set is recomputed rather than patched.

# Anchored match of the current change set against a whitespace-separated
# path constant.
matches() { echo "$CHANGED" | grep -qE "$1"; }

affected() { [ -n "${AFFECTED[$1]:-}" ]; }

# Sets CHANGED (every path differing from HEAD), DOCS_ONLY, ROOT_CHANGED,
# AFFECTED / AFFECTED_LIST and CORE_ROOT_NL. Returns non-zero when git cannot
# represent some path in the change set — the caller must treat that as a
# broken gate, never as "no changes".
context_load() {
  CHANGED=$(changed_files) || return 1

  # Docs-only changes still register `format` — markdown is in the format
  # glob and nothing else gates it — but skip every package check: a README
  # under packages/web says nothing about whether the web tests still pass.
  DOCS_ONLY=false
  if [ -n "$CHANGED" ] && ! echo "$CHANGED" | grep -qvE '\.md$'; then
    DOCS_ONLY=true
  fi

  # Deliberately no source/config extension filter here. An earlier design
  # had one, and it was a second copy of "does this change validate to
  # anything" — a question the registry already answers by ending up empty.
  # The two copies drifted twice: the pattern omitted `css`, making the
  # design-token check unreachable for the very file it watches, and it
  # matched `tsconfig.json` but not `tsconfig.app.json`, which is what
  # `tsc -b` reads. Both commits passed the gate with nothing run.
  #
  # The cost of dropping it is that an asset-only change under a package runs
  # that package's checks. That is the conservative direction, it is cached,
  # and it cannot silently skip.

  ROOT_CHANGED=false
  AFFECTED=()
  AFFECTED_LIST=""
  local pkg
  if [ "$DOCS_ONLY" = false ] && [ -n "$CHANGED" ]; then
    matches "$(paths_to_regex "$CORE_ROOT")" && ROOT_CHANGED=true
    for pkg in "${PKG_NAMES[@]}"; do
      if [ "$ROOT_CHANGED" = true ] || matches "$(paths_to_regex "${PKG_INPUTS[$pkg]}")"; then
        AFFECTED["$pkg"]=1
        AFFECTED_LIST="$AFFECTED_LIST $pkg"
      fi
    done
  fi
  return 0
}

declare -A AFFECTED=()

# Consumed by fingerprint_for_check (checks.sh) and divergence (validate.sh).
# shellcheck disable=SC2034,SC2086  # our own constant: split on purpose, no globs
CORE_ROOT_NL=$(printf '%s\n' $CORE_ROOT)
