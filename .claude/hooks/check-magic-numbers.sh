#!/bin/bash
# Hook: Detect magic numbers in edited TypeScript/JavaScript files
# Runs after Edit tool to catch magic numbers before they're committed

set -euo pipefail

# Read and validate input from Claude
input=$(cat)
if ! echo "$input" | jq -e . &> /dev/null; then
  exit 0
fi

# Get the file path that was edited
file_path=$(echo "$input" | jq -r '.tool_input.file_path // ""')

# Only check TypeScript/JavaScript files
if [[ ! "$file_path" =~ \.(ts|tsx|js|jsx)$ ]]; then
  exit 0
fi

# Skip test files, config files, and generated files
if [[ "$file_path" =~ \.(test|spec)\.(ts|tsx|js|jsx)$ ]] || \
   [[ "$file_path" =~ \.config\.(ts|js)$ ]] || \
   [[ "$file_path" =~ /schema\.ts$ ]] || \
   [[ "$file_path" =~ /test/ ]] || \
   [[ "$file_path" =~ /__tests__/ ]] || \
   [[ "$file_path" =~ /e2e/ ]]; then
  exit 0
fi

# Check if file exists
if [ ! -f "$file_path" ]; then
  exit 0
fi

# Pattern to find potential magic numbers:
# - Numbers > 1 in comparisons, conditions, function args, array access
# - Excludes: 0, 1, -1, numbers in const SCREAMING_CASE declarations
# - Excludes: version strings, hex colors, dates, port numbers in comments
magic_number_pattern='(^|[^a-zA-Z0-9_"])([2-9]|[1-9][0-9]+)([^a-zA-Z0-9_.:x#-]|$)'

# Find lines with potential magic numbers
# grep -n returns line_number:content
matches=$(grep -nE "$magic_number_pattern" "$file_path" 2>/dev/null || true)

if [ -z "$matches" ]; then
  exit 0
fi

# Filter out false positives
findings=""
while IFS= read -r line; do
  [ -z "$line" ] && continue

  line_num="${line%%:*}"
  content="${line#*:}"

  # Skip lines that are likely false positives:
  # - Import/export statements
  # - Constant declarations with SCREAMING_SNAKE_CASE
  # - Comments explaining numbers
  # - CSS/Tailwind classes (e.g., p-4, gap-2)
  # - Date patterns (e.g., 2024, months, days)
  # - Version strings
  # - Hex colors (#fff, #123456)
  # - Array destructuring indices ([0], [1] in destructuring)
  # - Index access with explicit variable names
  # - Zod schema definitions (min, max often have literal numbers that are OK with context)
  # - Duration definitions (ms, s, etc.)
  # - HTTP status codes with clear context

  if echo "$content" | grep -qE '^\s*(import|export)\s'; then
    continue
  fi

  if echo "$content" | grep -qE '^\s*const\s+[A-Z][A-Z0-9_]+\s*='; then
    continue
  fi

  if echo "$content" | grep -qE '^\s*(//|/\*|\*)'; then
    continue
  fi

  if echo "$content" | grep -qE '(className|class).*[a-z]+-[0-9]+'; then
    continue
  fi

  if echo "$content" | grep -qE '(20[0-9]{2}|19[0-9]{2})'; then
    continue
  fi

  if echo "$content" | grep -qE '#[0-9a-fA-F]{3,8}'; then
    continue
  fi

  if echo "$content" | grep -qE '\[[0-9]+\]\s*[,\]]'; then
    continue
  fi

  if echo "$content" | grep -qE '(ms|px|em|rem|vh|vw|%)\b'; then
    continue
  fi

  # This line likely has a magic number
  findings="${findings}  Line ${line_num}: ${content}\n"
done <<< "$matches"

if [ -z "$findings" ]; then
  exit 0
fi

# Get the relative path for cleaner output
rel_path="${file_path#$PWD/}"

# Report findings as a blocking hook
cat <<EOF
{
  "decision": "block",
  "reason": "⚠️ **Potential magic numbers detected in \`${rel_path}\`**\n\nPlease review these lines and consider extracting numbers to named constants:\n\n${findings}\n**Suggested fix**: Extract to descriptive constants like:\n\`\`\`typescript\nconst MINIMUM_SWIPE_DISTANCE_PX = 20;\nconst DEFAULT_TIMEOUT_MS = 5000;\nconst MAX_RETRY_ATTEMPTS = 3;\n\`\`\`\n\nIf these numbers are intentional (e.g., array indices, well-documented values), you may proceed."
}
EOF
