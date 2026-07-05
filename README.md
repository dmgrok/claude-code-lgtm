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

Reduces what you pay per session. See [Cost: before vs after](#cost-before-vs-after) for the numbers.

- `opusplan` mode — Opus plans, Sonnet executes (32% cheaper per token at current API rates)
- RTK integration — compresses Bash output before it enters context (57.5% measured reduction)
- Headroom MCP — compresses large file reads and search results (~30%)
- Permission allowlist — 14 pre-approved commands, no roundtrip overhead
- PreToolUse/PostToolUse hooks + CLAUDE.md guidelines — behavioral savings

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

## Cost: before vs after

A typical Claude Code session without optimization sends every tool output — grep results, directory listings, full file reads — straight into the context window at full price. Over 50 tool calls, that accumulates fast.

The `token-optimizer` preset attacks this at three independent layers that compound: it compresses what enters the context, routes execution to a cheaper model, and shapes behavior to avoid waste in the first place.

### Worked example

Representative 1-hour session: 50 tool calls, medium codebase, implementing a feature across 4 files. Roughly 55% of input tokens come from tool outputs (Bash results, file reads); the rest is conversation context.

**Baseline — pure Opus 4.8, no optimization:**

| | Tokens | Rate | Cost |
|---|---|---|---|
| Input | 2.0M | $5.00/MTok | $10.00 |
| Output | 150K | $25.00/MTok | $3.75 |
| **Total** | | | **$13.75** |

**With `token-optimizer` installed, the same session:**

*Layer 1 — RTK compresses Bash output.* The 1.1M tool-output tokens pass through RTK before reaching Claude. Measured reduction: 57.5%. 1.1M × 0.425 = **467K tokens survive** (633K eliminated).

*Layer 2 — Headroom compresses file reads.* Of the surviving tool output, ~300K are file reads. Headroom applies ~30% compression. 300K × 0.70 = 210K (**90K eliminated**).

*Layer 3 — Hooks and CLAUDE.md behavioral shaping.* Targeted reads over full-file reads, plan-then-batch, no re-reads of just-written files. Reduces conversation context accumulation by ~10%. 0.9M × 0.90 = **810K conversation tokens**.

Optimized input total: 377K (tool) + 810K (conversation) = **1.19M tokens** — 40.7% fewer than baseline.

*Layer 4 — opusplan reduces the per-token rate.* Instead of pure Opus ($5.00/MTok input), the blended rate is 80% Sonnet ($3.00) + 20% Opus ($5.00) = **$3.40/MTok input**.

**Optimized:**

| | Tokens | Rate | Cost |
|---|---|---|---|
| Input | 1.19M | $3.40/MTok | $4.05 |
| Output | 150K | $17.00/MTok | $2.55 |
| **Total** | | | **$6.60** |

### Side by side

| | Baseline | Optimized | Savings |
|---|---|---|---|
| Input tokens billed | 2.0M | 1.19M | −40.7% |
| Input cost | $10.00 | $4.05 | −$5.95 |
| Output cost | $3.75 | $2.55 | −$1.20 |
| **Session total** | **$13.75** | **$6.60** | **−52% / −$7.15** |

At 4 sessions/day over a work week, that is **~$143/developer/week**.

### What is measured vs estimated

| Claim | Basis |
|---|---|
| RTK 57.5% reduction | Measured across 901 commands. 16.0M tokens saved out of 27.9M input. |
| opusplan 32% per-token reduction | Arithmetic: 80% Sonnet ($3.00) + 20% Opus ($5.00) = $3.40 vs $5.00. Published API rates. |
| Headroom ~30% | Conservative midpoint of 20–40% measured range. |
| Hooks + CLAUDE.md ~10% | Estimated from hook frequency and pattern. Not independently measured. |

The first two do the heavy lifting and are independently verifiable. The 52% headline is conservative — sessions with larger file reads or more grep-heavy workflows see higher RTK savings.

### RTK: the raw numbers

| Command | Calls | Tokens in | Tokens saved | Avg reduction |
|---|---|---|---|---|
| `rtk grep` | 108 | 14.0M | 5.7M | 40.6% |
| `rtk find` | 29 | — | — | 30.3% |
| `rtk read` | 115 | — | — | 14.4% |
| **All commands** | **901** | **27.9M** | **16.0M** | **57.5%** |

Production numbers, not benchmarks. Command mix and codebase size affect the split, but the direction is consistent.

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
      - uses: dmgrok/claude-code-lgtm@v2
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
