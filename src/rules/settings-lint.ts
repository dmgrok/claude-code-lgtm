import * as fs from 'fs';
import * as path from 'path';
import { Rule, RuleContext, Finding } from './types.js';

const VALID_HOOK_EVENTS = [
  'PreToolUse', 'PostToolUse', 'Notification', 'Stop',
  'SubagentStop', 'SessionStart', 'SessionEnd', 'ToolError'
];

const RECOGNIZED_TOOL_NAMES = [
  'Bash', 'Edit', 'Write', 'Read', 'Agent', 'WebFetch',
  'Workflow', 'Skill', 'NotebookEdit'
];

const VALID_HOOK_TYPES = ['command', 'http', 'mcp_tool', 'prompt', 'agent'];

export class SettingsLintRule implements Rule {
  id = 'settings/lint';
  name = 'Settings Lint';
  description = 'Validates .claude/settings.json structure and values';
  category = 'settings' as const;

  async check(context: RuleContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const filePath = context.files.settingsJson;

    if (!filePath) return findings;
    if (!fs.existsSync(filePath)) return findings;

    let raw: string;
    try {
      raw = fs.readFileSync(filePath, 'utf-8');
    } catch {
      findings.push({ ruleId: this.id, severity: 'error', message: 'Cannot read settings.json', file: filePath });
      return findings;
    }

    let config: Record<string, unknown>;
    try {
      config = JSON.parse(raw);
    } catch (e) {
      findings.push({
        ruleId: this.id,
        severity: 'error',
        message: `Invalid JSON: ${(e as Error).message}`,
        file: filePath,
      });
      return findings;
    }

    this.validateHooks(config, filePath, context, findings);
    return findings;
  }

  private validateHooks(
    config: Record<string, unknown>,
    filePath: string,
    context: RuleContext,
    findings: Finding[]
  ): void {
    const hooks = config.hooks as Record<string, unknown> | undefined;
    if (!hooks || typeof hooks !== 'object') return;

    for (const [eventName, hookList] of Object.entries(hooks)) {
      if (!VALID_HOOK_EVENTS.includes(eventName)) {
        findings.push({
          ruleId: this.id,
          severity: 'error',
          message: `Invalid hook event name "${eventName}". Valid events: ${VALID_HOOK_EVENTS.join(', ')}`,
          file: filePath,
        });
      }

      if (!Array.isArray(hookList)) continue;

      for (const hookEntry of hookList as Record<string, unknown>[]) {
        this.validateHookEntry(hookEntry, eventName, filePath, context, findings);
      }
    }
  }

  private validateHookEntry(
    entry: Record<string, unknown>,
    eventName: string,
    filePath: string,
    context: RuleContext,
    findings: Finding[]
  ): void {
    // Validate matcher tool names (supports pipe-separated like "Edit|Write" and parens like "Bash(git *)")
    const matcher = entry.matcher as string | undefined;
    if (matcher) {
      const parts = matcher.split('|');
      for (const part of parts) {
        const toolName = part.replace(/\(.*\)$/, '').trim();
        if (toolName && !RECOGNIZED_TOOL_NAMES.includes(toolName)) {
          findings.push({
            ruleId: this.id,
            severity: 'warning',
            message: `Unrecognized tool name "${toolName}" in hook matcher for event "${eventName}"`,
            file: filePath,
          });
        }
      }
    }

    // Validate nested hooks array
    const hooks = entry.hooks as Record<string, unknown>[] | undefined;
    if (!Array.isArray(hooks)) return;

    for (const hook of hooks) {
      const hookType = hook.type as string | undefined;
      if (hookType && !VALID_HOOK_TYPES.includes(hookType)) {
        findings.push({
          ruleId: this.id,
          severity: 'error',
          message: `Invalid hook type "${hookType}". Valid types: ${VALID_HOOK_TYPES.join(', ')}`,
          file: filePath,
        });
      }

      const timeout = hook.timeout as number | undefined;
      if (timeout !== undefined) {
        if (typeof timeout !== 'number' || timeout < 1 || timeout > 600) {
          findings.push({
            ruleId: this.id,
            severity: 'error',
            message: `Hook timeout must be 1-600 seconds, got ${timeout}`,
            file: filePath,
          });
        }
      }

      if (hookType === 'command') {
        const command = hook.command as string | undefined;
        if (command) {
          const cmdParts = command.split(/\s+/);
          const executable = cmdParts[0];
          if (executable && !executable.startsWith('/') && !executable.startsWith('$')) {
            const resolved = path.resolve(context.files.projectRoot, executable);
            if (!fs.existsSync(resolved)) {
              findings.push({
                ruleId: this.id,
                severity: 'warning',
                message: `Hook command "${executable}" does not exist relative to project root`,
                file: filePath,
                fix: `Ensure "${executable}" exists at ${resolved}`,
              });
            }
          }
        }
      }
    }
  }
}
