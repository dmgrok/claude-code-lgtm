# LGTM

You've set up Claude Code — added hooks, slash commands, maybe some agent skills. It works. But is it configured correctly? Are your hook scripts actually executable? Does your `settings.json` have valid event names? Are your SKILL.md files spec-compliant or subtly broken?

LGTM answers these questions. It's a linter for your `.claude/` folder.

```bash
npx lgtm
```

```
  LGTM — Claude Code Project Health
  ──────────────────────────────────────────────────

  .claude/settings.json
    ✓ Valid schema
    ✓ Hook events are valid

  .claude/hooks/
    ✓ lgtm-validate.sh is executable
    ✓ lgtm-precommit.sh is executable

  .claude/commands/
    ✓ lgtm.md has description frontmatter

  skills/my-skill/SKILL.md
    ✓ Spec compliant
    ✓ Security: clean

  ──────────────────────────────────────────────────
  0 errors, 0 warnings  ✓
```

## What it catches

| Rule | What it validates |
|------|-------------------|
| **Settings** | `settings.json` — valid hook events, matcher syntax, hook types, timeouts, command paths that actually exist |
| **Hooks** | `*.sh` files — executable bit set, stdin handling, dangerous patterns, hardcoded secrets |
| **Commands** | Slash command `.md` files — frontmatter present, description field, prompt injection, file size |
| **Skill spec** | `SKILL.md` files — [Agent Skills spec](https://agentskills.io/specification) compliance (name format, required fields) |
| **Skill security** | `SKILL.md` files — prompt injection, code injection, data exfiltration ([Cisco AI Defense](https://github.com/cisco-ai-defense/skill-scanner) taxonomy) |

## Install

```bash
# Run once without installing:
npx lgtm

# Set up hooks so it runs automatically on every edit and commit:
npx lgtm init

# Install globally:
npm install -g lgtm
```

`lgtm init` adds two hooks to your project:

- **Post-edit** — validates SKILL.md immediately after Claude edits it
- **Pre-commit gate** — blocks `git commit` if anything fails
- **`/lgtm` command** — run checks on-demand from inside Claude Code

## CLI

```bash
lgtm                          # Check everything in the current directory
lgtm check [path]             # Check a specific path
lgtm check --rule hooks       # Only run hooks rules
lgtm check --rule settings    # Only run settings rules
lgtm check --rule skills      # Only run skills rules
lgtm check --format json      # Machine-readable output
lgtm check --format github    # GitHub Actions annotations
lgtm scan <path>              # Security scan only
lgtm init [path]              # Install hooks into a project
```

## Presets

Presets bundle Claude Code configuration — hooks, permissions, model settings, slash commands, CLAUDE.md guidelines — into a single installable unit.

```bash
lgtm preset install token-optimizer   # Install a preset
lgtm preset list                      # See what's available and what's installed
lgtm preset remove token-optimizer    # Clean removal, no traces left
```

### Built-in: `token-optimizer`

If your Claude Code sessions are burning tokens faster than expected, this preset helps. It combines several levers:

- Sets `opusplan` mode (Opus reasons about what to do, Sonnet executes — cheaper without sacrificing quality)
- Pre-approves common read-only commands so Claude doesn't ask permission for `git log` or `grep`
- Injects a PreToolUse hook that nudges Claude toward targeted reads instead of reading whole files
- Adds a PostToolUse hook that warns when a file read was wastefully large
- Appends token-efficiency guidelines to your CLAUDE.md
- Installs a `/token-status` command for session diagnostics

```bash
lgtm preset install token-optimizer
```

### Creating your own preset

A preset is a folder with a `preset.json` manifest. Everything is optional except the name.

```
my-preset/
  preset.json         # Manifest
  hooks/              # Shell scripts → installed to .claude/hooks/
  commands/           # Slash command .md files → installed to .claude/commands/
  snippets/           # Text → appended to .claude/CLAUDE.md
```

```json
{
  "name": "my-preset",
  "version": "1.0.0",
  "description": "What this preset does",
  "settings": { "model": "opusplan" },
  "permissions": { "allow": ["Bash(git *)"] },
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{ "type": "command", "command": ".claude/hooks/my-hook.sh", "timeout": 10 }]
    }]
  },
  "commands": ["my-command.md"],
  "snippets": ["my-guidelines.md"],
  "conflicts": ["incompatible-preset"]
}
```

Multiple presets compose additively. A lock file (`.claude/presets.lock.json`) tracks what was installed so removal is clean.

```bash
lgtm preset install ./my-preset          # Install from a local directory
lgtm preset install token-optimizer --force   # Reinstall over an existing one
```

## GitHub Action

Run checks on every push or PR:

```yaml
name: LGTM
on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dmgrok/LGTM_agent_skills@v2
        with:
          path: '.'
          fail-on-error: true
```

| Input | Default | Description |
|-------|---------|-------------|
| `path` | `.` | Path to check |
| `fail-on-error` | `true` | Fail the action on errors |
| `lakera-api-key` | `''` | Lakera Guard API key for ML-based prompt injection detection |

## Security scanner

The skill security scanner uses the [Cisco AI Defense threat taxonomy](https://github.com/cisco-ai-defense/skill-scanner). Optionally layer in:

- **[Lakera Guard](https://lakera.ai)** — ML-based prompt injection detection (free tier available)
- **[gitleaks](https://github.com/gitleaks/gitleaks)** — secret detection

```bash
brew install gitleaks
export LAKERA_GUARD_API_KEY=your-key
npx lgtm scan ./skills
```

## Programmatic use

```typescript
import { scanProject, runRules, formatResults, ALL_RULES } from 'lgtm';

const files = await scanProject({ path: './my-project' });
const result = await runRules({ files }, ALL_RULES);
console.log(formatResults(result, files, 'cli'));
```

## License

MIT
