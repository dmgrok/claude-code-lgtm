# cc-tricks — Claude Code Tricks Cookbook

A CLI toolkit and preset registry for making Claude Code cheaper, faster, and safer. Install battle-tested configurations in one command, or publish your own.

```bash
npm install -g github:dmgrok/claude-code-tricks-cookbook
cc-tricks preset install token-optimizer
```

## Built-in presets

### `token-optimizer` — reduce token usage by ~30%

```bash
cc-tricks preset install token-optimizer
```

Writes a complete `.claude/` configuration:

| What | Effect |
|------|--------|
| `model: opusplan` | Opus plans, Sonnet executes — 32% cheaper than pure Opus |
| 14 pre-approved tools | Eliminates permission roundtrip tokens (`git *`, `grep *`, `find *`, etc.) |
| PreToolUse hook | Nudges Claude toward targeted line-range reads |
| PostToolUse hook | Warns when tool output exceeds 50K chars |
| Auto-compact nudge | Injects `/compact` reminder at 70% context capacity |
| CLAUDE.md snippet | Behavioral rules: grep before read, batch calls, no re-reads |
| `/token-status` command | Check optimization config is active |

### `budget-guard` — hard cost limit per session

```bash
cc-tricks preset install budget-guard --set budget=20
```

Fires a PreToolUse hook before every tool call. Warns at 80%, blocks at 100%. Model-aware pricing (opus, opusplan, sonnet). Incremental JSONL parsing — <50ms per call after warmup.

```bash
cc-tricks preset install budget-guard                    # default $10
cc-tricks preset install budget-guard --set budget=50    # custom limit
cc-tricks preset install budget-guard --set warn_at=0.7  # warn at 70%
```

### `safe-mode` — guardrails against destructive operations

```bash
cc-tricks preset install safe-mode
```

Three hooks covering:
- **Bash**: blocks `rm -rf /`, `git push --force`, `curl | bash`, fork bombs; warns on `sudo`
- **Files**: blocks reads of `.env`, SSH keys, AWS credentials; blocks writes to `/etc`, system dirs
- **Agents**: rate-limits agent spawning (default 5/session) to prevent runaway loops

```bash
cc-tricks preset install safe-mode --set agent_limit=10
cc-tricks preset install safe-mode --set allow_force_push=true
cc-tricks preset install safe-mode --set allow_env_read=true
```

All presets stack cleanly — no conflicts. Remove any with `cc-tricks preset remove <name>`.

---

## Prove it works

```bash
cc-tricks compare
```

Runs the same benchmark prompt twice — once without config (`--safe-mode`), once with — and prints the diff:

```
                      Baseline        Optimized       Delta
  ────────────────────────────────────────────────────────────────
  Model               sonnet-4-6      opusplan
  Turns                      3               2              -1
  Input tokens          24,312          18,104         -25.5%
  Cache hit rate          0.0%           24.5%         +24.5%
  Cost                 $0.0312         $0.0198         -36.5%
  ────────────────────────────────────────────────────────────────
```

Or analyze a past session without re-running:

```bash
cc-tricks compare --session <uuid>
```

---

## Community presets

Install any GitHub repo that contains a `preset.json`:

```bash
cc-tricks preset install github:user/their-recipe
cc-tricks preset install github:corp/monorepo/presets/fast-mode   # subpath
cc-tricks preset install github:user/recipe#v2                    # specific ref
```

Downloads, caches at `~/.cc-tricks/cache/`, installs like a built-in. To publish: create a repo with `preset.json` at root and share the install command.

---

## Install

```bash
npm install -g github:dmgrok/claude-code-tricks-cookbook
# or run once:
npx github:dmgrok/claude-code-tricks-cookbook
```

Requires Node >= 18. Optional: `jq` (required by preset hooks).

---

## Linting

`cc-tricks` also validates your `.claude/` folder — catching misconfigurations before they silently break things.

```bash
cc-tricks
```

```
  CC-Tricks — Claude Code Cookbook
  ──────────────────────────────────────────────────

  .claude/settings.json
    ✓ Valid schema
    ✓ Hook events are valid

  .claude/hooks/
    ✓ cct-validate.sh is executable
    ✓ token-optimizer-concise.sh is executable

  .claude/commands/
    ✓ cc-tricks.md has description frontmatter

  ──────────────────────────────────────────────────
  0 errors, 0 warnings  ✓
```

| Rule | What it validates |
|------|-------------------|
| **Settings** | Valid hook event names, matcher syntax, timeouts (1–600s), command paths exist |
| **Hooks** | Executable bit, stdin handling, dangerous patterns (`curl \| bash`, `rm -rf /`), secrets |
| **Commands** | Frontmatter present, `description` field, prompt injection patterns |
| **Skill spec** | [Agent Skills spec](https://agentskills.io/specification) compliance |
| **Skill security** | Prompt injection, code injection, data exfiltration (Cisco AI Defense taxonomy) |

## CLI reference

```bash
cc-tricks                              # Lint everything in the current directory
cc-tricks check [path]                 # Check a specific path
cc-tricks check --rule hooks           # Only run hooks rules
cc-tricks check --format json          # Machine-readable output
cc-tricks check --format github        # GitHub Actions annotations
cc-tricks scan <path>                  # Security scan only
cc-tricks init                         # Install cc-tricks hooks into project
cc-tricks preset install <name>                    # Install a built-in preset
cc-tricks preset install <name> --set key=value    # Install with config
cc-tricks preset install github:user/repo          # Install from GitHub
cc-tricks preset install github:user/repo#v2       # Specific ref
cc-tricks preset install github:user/repo/subpath  # Subpath in monorepo
cc-tricks preset remove <name>                     # Remove a preset (clean undo)
cc-tricks preset list                              # Show available presets
cc-tricks compare                                  # Benchmark baseline vs optimized
cc-tricks compare --session <uuid>                 # Analyze a past session
cc-tricks compare --prompt "..."                   # Custom benchmark prompt
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

## GitHub Action

```yaml
name: cc-tricks
on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dmgrok/claude-code-tricks-cookbook@main
        with:
          path: '.'
          fail-on-error: true
```

| Input | Default | Description |
|-------|---------|-------------|
| `path` | `.` | Path to SKILL.md file or directory |
| `min-score` | `70` | Minimum score to pass (0–100) |
| `fail-on-error` | `true` | Fail the action if validation fails |
| `skip-duplicates` | `false` | Skip duplicate check against public registries |
| `lakera-api-key` | `''` | Lakera Guard API key for ML-based prompt injection |

| Output | Description |
|--------|-------------|
| `score` | Global validation score (0–100) |
| `passed` | Whether validation passed (true/false) |
| `spec-compliance` | Spec compliance KPI score |
| `security` | Security KPI score |
| `content` | Content quality KPI score |
| `testing` | Testing & dependencies KPI score |
| `results-file` | Path to JSON results file for artifact upload |

## Programmatic API

```typescript
import { scanProject, runRules, formatResults, ALL_RULES } from 'cc-tricks';
import { compareCommand, parseSession, estimateSavings } from 'cc-tricks';

const files = await scanProject({ path: './my-project' });
const result = await runRules({ files }, ALL_RULES);
console.log(formatResults(result, files, 'cli'));

const metrics = await parseSession('f88a77db-...');
const estimate = estimateSavings(metrics);
```

## License

MIT
