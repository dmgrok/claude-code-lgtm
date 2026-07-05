#!/bin/bash
INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
echo "Hook fired for tool: $TOOL"
