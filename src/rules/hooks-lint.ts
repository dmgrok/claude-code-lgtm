import * as fs from 'fs';
import { Rule, RuleContext, Finding } from './types.js';

const DANGEROUS_PATTERNS: { pattern: RegExp; description: string }[] = [
  { pattern: /rm\s+-rf\s+\//, description: 'Destructive rm -rf / command' },
  { pattern: /eval\s*\$\(\s*curl/, description: 'Downloading and executing remote code via eval $(curl ...)' },
  { pattern: /curl\s+[^|]*\|\s*(bash|sh|zsh)/, description: 'Piping curl output to shell' },
  { pattern: /wget\s+[^|]*\|\s*(bash|sh|zsh)/, description: 'Piping wget output to shell' },
  { pattern: /curl\s+[^>]*>\s*\/tmp\/[^;]*;\s*(bash|sh|chmod)/, description: 'Download-and-execute pattern' },
];

const SECRET_PATTERNS: { pattern: RegExp; description: string }[] = [
  { pattern: /sk-[a-zA-Z0-9]{20,}/, description: 'Possible OpenAI API key' },
  { pattern: /ghp_[a-zA-Z0-9]{36}/, description: 'GitHub personal access token' },
  { pattern: /gho_[a-zA-Z0-9]{36}/, description: 'GitHub OAuth token' },
  { pattern: /AKIA[0-9A-Z]{16}/, description: 'AWS access key ID' },
  { pattern: /xox[baprs]-[0-9a-zA-Z-]+/, description: 'Slack token' },
  { pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/, description: 'Private key' },
];

export class HooksLintRule implements Rule {
  id = 'hooks/lint';
  name = 'Hooks Lint';
  description = 'Validates .claude/hooks/*.sh scripts for safety and correctness';
  category = 'hooks' as const;

  async check(context: RuleContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const hookPath of context.files.hookScripts) {
      if (!fs.existsSync(hookPath)) continue;

      this.checkExecutable(hookPath, findings);
      const content = fs.readFileSync(hookPath, 'utf-8');
      this.checkStdinUsage(hookPath, content, findings);
      this.checkDangerousPatterns(hookPath, content, findings);
      this.checkSecrets(hookPath, content, findings);
    }

    return findings;
  }

  private checkExecutable(filePath: string, findings: Finding[]): void {
    try {
      const stat = fs.statSync(filePath);
      const isExecutable = (stat.mode & 0o111) !== 0;
      if (!isExecutable) {
        findings.push({
          ruleId: 'hooks/missing-executable',
          severity: 'error',
          message: 'Hook script is not executable',
          file: filePath,
          fix: `chmod +x "${filePath}"`,
        });
      }
    } catch {
      // stat failed, skip
    }
  }

  private checkStdinUsage(filePath: string, content: string, findings: Finding[]): void {
    const readsStdin = /\bcat\b/.test(content) ||
      /\bread\b/.test(content) ||
      /\/dev\/stdin/.test(content) ||
      /\bjq\b/.test(content) ||
      /sys\.stdin/.test(content) ||
      /process\.stdin/.test(content);

    if (!readsStdin) {
      findings.push({
        ruleId: 'hooks/no-stdin',
        severity: 'warning',
        message: 'Hook script does not appear to read from stdin (hooks receive JSON context on stdin)',
        file: filePath,
        fix: 'Add stdin reading, e.g.: INPUT=$(cat) or use jq to parse the JSON input',
      });
    }
  }

  private checkDangerousPatterns(filePath: string, content: string, findings: Finding[]): void {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      for (const { pattern, description } of DANGEROUS_PATTERNS) {
        if (pattern.test(lines[i])) {
          findings.push({
            ruleId: 'hooks/dangerous-pattern',
            severity: 'error',
            message: `Dangerous pattern detected: ${description}`,
            file: filePath,
            line: i + 1,
          });
        }
      }
    }
  }

  private checkSecrets(filePath: string, content: string, findings: Finding[]): void {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      for (const { pattern, description } of SECRET_PATTERNS) {
        if (pattern.test(lines[i])) {
          findings.push({
            ruleId: 'hooks/hardcoded-secret',
            severity: 'error',
            message: `Potential hardcoded secret: ${description}`,
            file: filePath,
            line: i + 1,
            fix: 'Use environment variables or a secrets manager instead of hardcoding credentials',
          });
        }
      }
    }
  }
}
