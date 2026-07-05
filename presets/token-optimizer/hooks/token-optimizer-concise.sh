#!/bin/bash
# PreToolUse hook: inject token-efficiency context for Read and Agent calls
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

if [[ "$TOOL_NAME" == "Read" ]]; then
  echo '{"continue": true, "systemMessage": "Prefer reading specific line ranges (offset/limit) over full files when the target is known."}'
  exit 0
fi

if [[ "$TOOL_NAME" == "Agent" ]]; then
  echo '{"continue": true, "systemMessage": "Keep subagent prompts focused and single-purpose. Specify search breadth to avoid over-exploration."}'
  exit 0
fi

exit 0
