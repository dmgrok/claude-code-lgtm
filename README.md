# LGTM

**Claude Code project health checks.** Validates your `.claude/` configuration, hooks, commands, and skills in one pass.

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

## What It Checks

| Rule | What it validates |
|------|-------------------|
| **Settings lint** | `.claude/settings.json` — valid hook events, matcher syntax, hook types, timeouts, command existence |
| **Hooks lint** | `.claude/hooks/*.sh` — executable permissions, stdin handling, dangerous patterns, hardcoded secrets |
| **Commands lint** | `.claude/commands/*.md` — frontmatter, description field, prompt injection, file size |
| **Skill spec** | `SKILL.md` files — [Agent Skills spec](https://agentskills.io/specification) compliance (name format, description, frontmatter) |
| **Skill security** | `SKILL.md` files — prompt injection, code injection, data exfiltration, secrets ([Cisco AI Defense](https://github.com/cisco-ai-defense/skill-scanner) taxonomy) |

## Install

```bash
# Try it (zero install):
npx lgtm

# Add hooks to your project:
npx lgtm init

# Global install:
npm install -g lgtm
```

### `lgtm init`

Installs Claude Code hooks into your project:

- **Post-edit hook** — validates SKILL.md after every edit
- **Pre-commit gate** — blocks `git commit` if skills fail validation
- **`/lgtm` command** — on-demand health check from Claude Code

## CLI Usage

```bash
lgtm                              # Auto-discover and check everything
lgtm check [path]                 # Check project health
lgtm check --rule hooks           # Only run hooks rules
lgtm check --rule settings        # Only run settings rules
lgtm check --rule skills          # Only run skill rules
lgtm check --format json          # Machine-readable output
lgtm check --format github        # GitHub Actions annotations
lgtm scan <path>                  # Security scan only
lgtm init [path]                  # Install hooks into a project
lgtm preset install <name>        # Install a preset
lgtm preset remove <name>         # Remove an installed preset
lgtm preset list                  # Show available/installed presets
```

## Presets

Presets are shareable bundles of Claude Code configuration — hooks, permissions, model settings, commands, and CLAUDE.md snippets — installable in one command.

```bash
# Install the token optimizer preset:
lgtm preset install token-optimizer

# See what's available:
lgtm preset list

# Clean removal (no traces left):
lgtm preset remove token-optimizer
```

### `token-optimizer`

Reduces token consumption through:

| Lever | What it does |
|-------|-------------|
| Model strategy | Sets `opusplan` (Opus plans, Sonnet executes) |
| Permission allowlist | Pre-approves common read-only commands to reduce roundtrips |
| Context injection | PreToolUse hook nudges toward targeted file reads and focused subagents |
| Usage monitoring | PostToolUse hook warns on wastefully large file reads |
| CLAUDE.md guidelines | Token-efficiency rules Claude follows automatically |
| `/token-status` command | Session diagnostics for optimization status |

### Creating Custom Presets

A preset is a directory with a `preset.json` manifest:

```
my-preset/
  preset.json       # Required: manifest
  hooks/            # Shell scripts to install
  commands/         # Slash command .md files
  snippets/         # CLAUDE.md fragments to append
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

Presets compose additively — install multiple without conflicts. A lock file (`.claude/presets.lock.json`) tracks what was installed for clean removal.

```bash
# Install from a local directory:
lgtm preset install ./my-preset

# Force reinstall:
lgtm preset install token-optimizer --force
```

## GitHub Action

```yaml
name: LGTM Health Check
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

### Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `path` | Path to check | `.` |
| `fail-on-error` | Fail the action on errors | `true` |
| `lakera-api-key` | Lakera Guard API key for prompt injection detection | `''` |

### Outputs

| Output | Description |
|--------|-------------|
| `passed` | Whether all checks passed (true/false) |
| `score` | 100 if passed, 0 if failed (backwards compat) |
| `results-file` | Path to JSON results file |

## Security Scanner

The security scanner uses the [Cisco AI Defense threat taxonomy](https://github.com/cisco-ai-defense/skill-scanner) with optional professional detection:

- **Pattern-based detection** — prompt injection, code injection, data exfiltration, tool abuse, privilege escalation
- **[Lakera Guard](https://lakera.ai)** — ML-based prompt injection detection (optional, free tier available)
- **[gitleaks](https://github.com/gitleaks/gitleaks) / [trufflehog](https://github.com/trufflesecurity/trufflehog)** — Secret detection (uses external tools when available)

```bash
# Install secret detection tools (recommended):
brew install gitleaks

# Enable Lakera Guard:
export LAKERA_GUARD_API_KEY=your-key
```

## Programmatic Usage

```typescript
import { scanProject, runRules, formatResults, ALL_RULES } from 'lgtm';

const files = await scanProject({ path: './my-project' });
const result = await runRules({ files }, ALL_RULES);
console.log(formatResults(result, files, 'cli'));
```

## Architecture

```
src/
  cli.ts                    # CLI entry point (lgtm command)
  action.ts                 # GitHub Action entry point
  project-scanner.ts        # Auto-discovers .claude/ files
  rule-engine.ts            # Runs rules, collects findings
  reporter.ts              # Formats output (CLI, JSON, GitHub)
  rules/
    types.ts               # Rule interface, Finding, Severity
    index.ts               # Rule registry
    settings-lint.ts       # .claude/settings.json validation
    hooks-lint.ts          # Hook script validation
    commands-lint.ts       # Command file validation
    skill-spec.ts          # Agent Skills spec compliance
    skill-security.ts      # Security threat detection
  presets/
    types.ts               # PresetManifest, PresetsLock interfaces
    installer.ts           # Install preset into project
    uninstaller.ts         # Clean removal via lock file
    composer.ts            # Settings merge engine
    resolver.ts            # Resolve preset name to directory
    index.ts               # Public API
  scanners/
    security-scanner.ts    # Cisco threat taxonomy + Lakera + gitleaks
    spec-validator.ts      # Agent Skills specification rules
    types.ts               # Scanner types
presets/
  token-optimizer/          # Built-in preset: token consumption optimizer
```

## License

MIT
