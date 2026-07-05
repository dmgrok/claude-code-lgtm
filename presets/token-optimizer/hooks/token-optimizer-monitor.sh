#!/bin/bash
# PostToolUse hook: warn on large file reads that waste tokens
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

if [[ "$TOOL_NAME" == "Read" ]]; then
  OUTPUT_LEN=$(echo "$INPUT" | jq -r '.tool_result // ""' | wc -c)
  if [[ "$OUTPUT_LEN" -gt 50000 ]]; then
    echo "{\"continue\": true, \"systemMessage\": \"Large read detected (${OUTPUT_LEN} chars). Use offset/limit for targeted reads next time.\"}"
    exit 0
  fi
fi

exit 0
