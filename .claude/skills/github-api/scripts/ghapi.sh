#!/usr/bin/env bash
# ghapi.sh - Unified GitHub API wrapper
# Handles gh/curl detection, auth ($GITHUB_TOKEN via bash -c), repo detection, and JSON bodies.
#
# Usage:
#   ghapi.sh GET /repos/OWNER/REPO/pulls?state=open
#   ghapi.sh POST /repos/OWNER/REPO/issues '{"title":"Bug","body":"Details"}'
#   ghapi.sh PATCH /repos/OWNER/REPO/issues/42 '{"state":"closed"}'
#
# If OWNER/REPO appear literally in the endpoint, they are auto-replaced
# with values detected from the git remote.
#
# Environment:
#   GITHUB_TOKEN - Required when gh CLI is not available
#   GHAPI_PER_PAGE - Items per page (default: 100)

set -euo pipefail

# --- Repo detection ---
detect_repo() {
  local remote
  remote=$(git remote get-url origin 2>/dev/null) || { echo "ERROR: No git remote 'origin' found" >&2; exit 1; }

  if [[ "$remote" =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
    OWNER="${BASH_REMATCH[1]}"
    REPO="${BASH_REMATCH[2]}"
  elif [[ "$remote" =~ /git/([^/]+)/([^/]+)$ ]]; then
    OWNER="${BASH_REMATCH[1]}"
    REPO="${BASH_REMATCH[2]}"
  else
    echo "ERROR: Could not detect GitHub repo from remote: $remote" >&2
    exit 1
  fi
}

# --- Tool detection ---
detect_tool() {
  if command -v gh &>/dev/null; then
    TOOL="gh"
  elif [ -n "${GITHUB_TOKEN:-}" ]; then
    TOOL="curl"
  else
    TOOL="none"
  fi
}

# --- Main ---
METHOD="${1:?Usage: ghapi.sh METHOD ENDPOINT [JSON_BODY]}"
ENDPOINT="${2:?Usage: ghapi.sh METHOD ENDPOINT [JSON_BODY]}"
BODY="${3:-}"
PER_PAGE="${GHAPI_PER_PAGE:-100}"

detect_repo
detect_tool

# Replace literal OWNER/REPO placeholders in endpoint
ENDPOINT="${ENDPOINT//OWNER/$OWNER}"
ENDPOINT="${ENDPOINT//REPO/$REPO}"

# Append per_page if GET and not already present
if [[ "$METHOD" == "GET" && "$ENDPOINT" != *per_page* ]]; then
  if [[ "$ENDPOINT" == *"?"* ]]; then
    ENDPOINT="${ENDPOINT}&per_page=${PER_PAGE}"
  else
    ENDPOINT="${ENDPOINT}?per_page=${PER_PAGE}"
  fi
fi

# Strip leading slash for gh api compatibility
ENDPOINT="${ENDPOINT#/}"

case "$TOOL" in
  gh)
    if [[ "$METHOD" == "GET" ]]; then
      gh api "$ENDPOINT"
    elif [[ -n "$BODY" ]]; then
      gh api "$ENDPOINT" -X "$METHOD" --input <(echo "$BODY")
    else
      gh api "$ENDPOINT" -X "$METHOD"
    fi
    ;;
  curl)
    API_URL="https://api.github.com/${ENDPOINT}"
    if [[ "$METHOD" == "GET" ]]; then
      curl -sf \
        -H "Authorization: Bearer $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github+json" \
        "$API_URL"
    elif [[ -n "$BODY" ]]; then
      echo "$BODY" | curl -sf \
        -X "$METHOD" \
        -H "Authorization: Bearer $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github+json" \
        -H "Content-Type: application/json" \
        "$API_URL" \
        -d @-
    else
      curl -sf \
        -X "$METHOD" \
        -H "Authorization: Bearer $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github+json" \
        "$API_URL"
    fi
    ;;
  none)
    # Read-only public access - no auth header
    if [[ "$METHOD" != "GET" ]]; then
      echo "ERROR: No auth available. Only GET requests work without gh or GITHUB_TOKEN." >&2
      exit 1
    fi
    curl -sf \
      -H "Accept: application/vnd.github+json" \
      "https://api.github.com/${ENDPOINT}"
    ;;
esac
