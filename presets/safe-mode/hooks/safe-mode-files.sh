#!/bin/bash
# safe-mode-files.sh — PreToolUse hook for Read|Write|Edit
# Blocks access to sensitive files (.env, SSH keys, credentials) and system paths

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
FILE=$(echo "$INPUT" | jq -r '.tool_call.file_path // .tool_input.file_path // empty' 2>/dev/null)
[ -z "$FILE" ] && exit 0

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG="$CLAUDE_DIR/safe-mode.json"
ALLOW_ENV_READ=$(jq -r '.allow_env_read // false' "$CONFIG" 2>/dev/null || echo "false")

# Normalise: expand ~ and resolve to basename for pattern matching
FILE_EXPANDED="${FILE/#\~/$HOME}"
FILE_BASE=$(basename "$FILE_EXPANDED")
FILE_DIR=$(dirname "$FILE_EXPANDED")

block() {
  echo "🛑 safe-mode blocked: $1" >&2
  exit 2
}

warn() {
  printf '{"continue":true,"systemMessage":"⚠️ safe-mode warning: %s"}\n' "$1"
  exit 0
}

# ── Sensitive secrets files ───────────────────────────────────────────────────
if [ "$ALLOW_ENV_READ" != "true" ]; then
  if echo "$FILE_BASE" | grep -qE '^\.env(\.|$)'; then
    block "reading \`$FILE\` — .env file may contain secrets (set allow_env_read=true to allow)"
  fi
fi

if echo "$FILE_BASE" | grep -qiE '(credential|secret|password|passwd|token)s?(\.json|\.yml|\.yaml|\.toml|\.env|\.cfg|\.ini)?$'; then
  block "reading \`$FILE\` — filename suggests it contains secrets"
fi

# SSH keys
if echo "$FILE_EXPANDED" | grep -qE "$HOME/\.ssh/(id_|config|known_hosts)"; then
  block "reading \`$FILE\` — SSH key or config file"
fi

# Cloud credentials
if echo "$FILE_EXPANDED" | grep -qE "$HOME/\.aws/credentials|$HOME/\.config/gh/hosts\.yml"; then
  block "reading \`$FILE\` — cloud credentials file"
fi

# ── Blocked write targets ─────────────────────────────────────────────────────
if [ "$TOOL" = "Write" ] || [ "$TOOL" = "Edit" ]; then
  # System directories
  if echo "$FILE_EXPANDED" | grep -qE '^/(etc|usr/(bin|local/bin|sbin)|bin|sbin)/'; then
    block "writing to \`$FILE\` — system directory (requires explicit sudo)"
  fi

  # SSH authorized_keys
  if echo "$FILE_EXPANDED" | grep -qE "$HOME/\.ssh/authorized_keys"; then
    block "writing to \`$FILE\` — modifying authorized_keys is a security risk"
  fi

  # Shell config — warn only
  if echo "$FILE_BASE" | grep -qE '^\.(bash_profile|bashrc|zshrc|zprofile|profile)$'; then
    warn "writing to \`$FILE\` — modifying shell config. Verify this is intentional."
  fi
fi

exit 0
