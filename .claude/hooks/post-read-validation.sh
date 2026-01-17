#!/bin/bash
# Post-read hook for Claude Code
# Marks when validation docs have been read

# Read the tool input from stdin
INPUT=$(cat)

# Extract the file path that was read
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Check if this is the validation docs
if [[ "$FILE_PATH" == *"docs/VALIDATION.md"* ]] || [[ "$FILE_PATH" == *"VALIDATION.md"* ]]; then
    # Create marker file
    touch /tmp/.claude-validation-read
fi

# Always allow (this is post-tool, not blocking)
echo '{"decision": "allow"}'
