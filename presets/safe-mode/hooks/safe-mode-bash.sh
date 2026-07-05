#!/bin/bash
# safe-mode-bash.sh — PreToolUse hook for Bash
# Blocks destructive commands, remote code execution, and data exfiltration

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_call.command // .tool_input.command // empty' 2>/dev/null)
[ -z "$CMD" ] && exit 0

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG="$CLAUDE_DIR/safe-mode.json"
ALLOW_FORCE_PUSH=$(jq -r '.allow_force_push // false' "$CONFIG" 2>/dev/null || echo "false")

block() {
  echo "🛑 safe-mode blocked: $1" >&2
  exit 2
}

warn() {
  printf '{"continue":true,"systemMessage":"⚠️ safe-mode warning: %s"}\n' "$1"
  exit 0
}

# ── Destructive filesystem ────────────────────────────────────────────────────
if echo "$CMD" | grep -qE 'rm\s+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+(\/|~|\.|\/\*|\*)\s*$|rm\s+-[a-zA-Z]*f[a-zA-Z]*r[a-zA-Z]*\s+(\/|~|\.|\/\*|\*)\s*$'; then
  block "\`$(echo "$CMD" | head -c 60)\` — destructive rm on root/home/cwd"
fi

if echo "$CMD" | grep -qE ':\(\).*\{.*:\|:'; then
  block "fork bomb pattern detected"
fi

if echo "$CMD" | grep -qE '\bmkfs\b'; then
  block "\`$CMD\` — filesystem format command"
fi

if echo "$CMD" | grep -qE '\bdd\s+if=\/dev\/'; then
  block "\`$(echo "$CMD" | head -c 60)\` — disk overwrite via dd"
fi

if echo "$CMD" | grep -qE '\bchmod\s+(u\+s|g\+s|[0-9]*7[0-9][0-9])\b'; then
  warn "\`$(echo "$CMD" | head -c 60)\` — chmod 7xx or setuid bit. Verify this is intentional."
fi

# ── Destructive git ───────────────────────────────────────────────────────────
if [ "$ALLOW_FORCE_PUSH" != "true" ]; then
  if echo "$CMD" | grep -qE 'git\s+push\s+.*(-f\b|--force)\b'; then
    block "\`$(echo "$CMD" | head -c 80)\` — git push --force (set allow_force_push=true to allow)"
  fi
fi

if echo "$CMD" | grep -qE 'git\s+branch\s+.*-D\s+(main|master|develop)\b'; then
  block "\`$(echo "$CMD" | head -c 80)\` — deleting protected branch"
fi

if echo "$CMD" | grep -qE 'git\s+clean\s+-[a-zA-Z]*x'; then
  warn "\`$(echo "$CMD" | head -c 80)\` — git clean -x removes untracked+ignored files. Verify this is intentional."
fi

# ── Remote code execution ─────────────────────────────────────────────────────
if echo "$CMD" | grep -qE '(curl|wget)\s+.*\|\s*(ba)?sh|eval\s*\$\(\s*(curl|wget)'; then
  block "\`$(echo "$CMD" | head -c 80)\` — downloading and executing remote code"
fi

if echo "$CMD" | grep -qE '(curl|wget)\s+.*-o\s+[^;]+;\s*(ba)?sh\s+'; then
  block "\`$(echo "$CMD" | head -c 80)\` — download-and-execute pattern"
fi

# ── Data exfiltration ─────────────────────────────────────────────────────────
if echo "$CMD" | grep -qE 'curl\s+.*(--data|-d\s|--data-raw|-F\s|--form\s|--data-urlencode|--upload-file|-T\s)\s*[^l]'; then
  if ! echo "$CMD" | grep -qE 'https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)'; then
    warn "\`$(echo "$CMD" | head -c 80)\` — sending data to external URL. Verify this is intentional."
  fi
fi

if echo "$CMD" | grep -qE '\bscp\s+.*@|rsync\s+.*@[^:]+:'; then
  warn "\`$(echo "$CMD" | head -c 80)\` — copying files to remote host. Verify this is intentional."
fi

# ── Privilege escalation ──────────────────────────────────────────────────────
if echo "$CMD" | grep -qE 'docker\s+run\s+.*--privileged'; then
  warn "\`$(echo "$CMD" | head -c 80)\` — docker --privileged grants full host access."
fi

if echo "$CMD" | grep -qE '^\s*sudo\b'; then
  warn "\`$(echo "$CMD" | head -c 80)\` — running as sudo. Verify this is intentional."
fi

exit 0
