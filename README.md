# claude-code-lgtm

Claude Code's `.claude/` folder has no validation. You can ship a `settings.json` with a misspelled hook event name, a hook script that isn't executable, or a slash command missing its frontmatter — and nothing will tell you until something silently misbehaves.

This is a linter for `.claude/`. It also ships a preset system for installing validated Claude Code configurations.

```bash
npm install -g github:dmgrok/claude-code-lgtm
lgtm
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

## How it works

```
.claude/             scanProject()         runRules()            output
├── settings.json ──→                    ┌─→ SettingsLintRule ─┐
├── hooks/*.sh    ──→  DiscoveredFiles  ─┼─→ HooksLintRule    ─┼─→ CLI / JSON / GitHub
├── commands/*.md ──→                    ├─→ CommandsLintRule  ─┤   annotations
└── SKILL.md      ──→                    ├─→ SkillSpecRule     ─┤   exit 0 or 1
                                         └─→ SkillSecurityRule ─┘
```

`scanProject()` walks `.claude/` and finds all configuration files. `runRules()` runs all five rule classes against the discovered files in parallel, collecting findings. Output is rendered as terminal text, JSON, or GitHub Actions annotations.

## What it catches

| Rule | What it validates |
|------|-------------------|
| **Settings** | `settings.json` — valid hook event names, matcher syntax, hook types, timeouts (1–600s), command paths that exist on disk |
| **Hooks** | `*.sh` files — executable bit set, stdin handling, dangerous patterns (`curl \| bash`, `rm -rf /`), hardcoded secrets |
| **Commands** | Slash command `.md` files — frontmatter present, `description` field, prompt injection patterns, file size |
| **Skill spec** | `SKILL.md` files — [Agent Skills spec](https://agentskills.io/specification) compliance (name format, required fields, metadata) |
| **Skill security** | `SKILL.md` files — prompt injection, code injection, data exfiltration (Cisco AI Defense taxonomy) |

## Install

The package is not yet published to npm. Install from GitHub:

```bash
# Global install
npm install -g github:dmgrok/claude-code-lgtm

# Run once without installing
npx github:dmgrok/claude-code-lgtm
```

**Prerequisites:** Node >= 18. For optional features: `jq` (required by preset hooks), `gitleaks` (secret detection), `LAKERA_GUARD_API_KEY` (ML-based prompt injection).

## CLI

```bash
lgtm                          # Check everything in the current directory
lgtm check [path]             # Check a specific path
lgtm check --rule hooks       # Only run hooks rules
lgtm check --rule settings    # Only run settings rules
lgtm check --rule skills      # Only run skills rules
lgtm check --format json      # Machine-readable output
lgtm check --format github    # GitHub Actions annotations
lgtm scan <path>              # Security scan only (skills/security rule)
lgtm init [path]              # Install LGTM hooks into a project
lgtm preset install <name>    # Install a configuration preset
lgtm preset remove <name>     # Remove an installed preset
lgtm preset list              # Show available and installed presets
```

## `lgtm init`

Installs LGTM's own hooks into your project so validation runs automatically:

```bash
lgtm init
```

Adds to your project:
- `.claude/hooks/lgtm-validate.sh` — PostToolUse hook, runs on every `Edit|Write`, validates any modified SKILL.md and injects findings as a system message
- `.claude/hooks/lgtm-precommit.sh` — PreToolUse hook, intercepts `git commit`, blocks the commit (exit 2) if staged SKILL.md files fail validation
- `.claude/commands/lgtm.md` — `/lgtm` slash command for on-demand checks
- Entries in `.claude/settings.json` wiring the hooks to the right events

## Presets

A preset is a named bundle of Claude Code configuration: hook scripts, slash commands, permission allowances, model settings, and CLAUDE.md guidelines. Installing a preset merges its configuration into your project; removing it cleanly undoes all changes.

```bash
lgtm preset install token-optimizer
lgtm preset remove token-optimizer
lgtm preset list
```

A lock file at `.claude/presets.lock.json` tracks what was installed. Multiple presets compose additively.

### Built-in: `token-optimizer`

Configures Claude Code for more efficient operation. What it actually does:

| Change | Effect |
|--------|--------|
| Sets `model: opusplan` in `settings.json` | Opus handles planning/reasoning, Sonnet handles execution. 32% cheaper per token than pure Opus at current API rates ($3.40/MTok blended vs $5.00). |
| Adds 14 `permissions.allow` entries | Pre-approves common Bash patterns (`git *`, `grep *`, `find *`, etc.) — eliminates permission roundtrips for routine operations |
| Installs `token-optimizer-concise.sh` (PreToolUse on `Read\|Agent`) | Injects a system message nudging Claude toward targeted line-range reads instead of full-file reads |
| Installs `token-optimizer-monitor.sh` (PostToolUse on `Read`) | Warns when a tool result exceeds 50,000 characters, prompting Claude to use offset/limit on subsequent reads |
| Appends guidelines to `CLAUDE.md` | Behavioral hints: grep before read, batch tool calls, avoid re-reading recently written files |
| Adds `/token-status` slash command | Reports installed model, permission count, and hook status on demand |

```bash
lgtm preset install token-optimizer
```

### Installing a local preset

```bash
lgtm preset install ./my-preset   # path to a directory containing preset.json
```

A preset directory needs a `preset.json` manifest. See [presets/token-optimizer/preset.json](presets/token-optimizer/preset.json) for the full schema.

## GitHub Action

Run checks on every push or PR. **Note:** requires a tagged release or use `@main`.)

```yaml
name: LGTM
on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dmgrok/claude-code-lgtm@main
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

The skill security scanner detects 10 threat categories (prompt injection, code injection, data exfiltration, tool abuse, obfuscation, and more) using regex patterns mapped to the [Cisco AI Defense threat taxonomy](https://github.com/cisco-ai-defense/skill-scanner).

Optionally layer in external tools:

- **[Lakera Guard](https://lakera.ai)** — ML-based prompt injection detection (free tier available)
- **[gitleaks](https://github.com/gitleaks/gitleaks)** — secret detection (uses gitleaks as a subprocess if installed, falls back to regex patterns)

```bash
brew install gitleaks
export LAKERA_GUARD_API_KEY=your-key
lgtm scan ./skills
```

## Programmatic API

```typescript
import { scanProject, runRules, formatResults, ALL_RULES } from 'claude-code-lgtm';

const files = await scanProject({ path: './my-project' });
const result = await runRules({ files }, ALL_RULES);
console.log(formatResults(result, files, 'cli'));
// result.passed — boolean
// result.findings — Finding[] with ruleId, severity, message, file, line, fix
```

Additional exports: `SecurityScanner`, `SpecValidator`, `installPreset`, `uninstallPreset`, `listAvailable`.

## License

MIT
