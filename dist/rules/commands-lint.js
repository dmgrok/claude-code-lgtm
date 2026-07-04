import * as fs from 'fs';
const INJECTION_PATTERNS = [
    { pattern: /ignore\s+(previous|all|any)\s+(instructions?|rules?|guidelines?)/i, description: '"ignore previous instructions" injection' },
    { pattern: /you\s+are\s+now/i, description: '"you are now" role override' },
    { pattern: /bypass\s+safety/i, description: '"bypass safety" injection' },
    { pattern: /disregard\s+(previous|all|any)\s+(instructions?|rules?)/i, description: '"disregard instructions" injection' },
    { pattern: /override\s+(your|system)\s+(instructions?|prompt|rules?)/i, description: '"override instructions" injection' },
    { pattern: /pretend\s+(you\s+are|to\s+be)/i, description: '"pretend to be" role manipulation' },
    { pattern: /don['']?t\s+tell\s+(the\s+)?user/i, description: '"don\'t tell the user" deception' },
    { pattern: /hide\s+this\s+from\s+(the\s+)?user/i, description: '"hide from user" deception' },
    { pattern: /enter\s+(unrestricted|jailbreak|developer)\s+mode/i, description: 'Jailbreak mode activation' },
];
const MAX_FILE_SIZE = 50 * 1024; // 50KB
export class CommandsLintRule {
    id = 'commands/lint';
    name = 'Commands Lint';
    description = 'Validates .claude/commands/*.md files for structure and safety';
    category = 'commands';
    async check(context) {
        const findings = [];
        for (const cmdPath of context.files.commandFiles) {
            if (!fs.existsSync(cmdPath))
                continue;
            const stat = fs.statSync(cmdPath);
            if (stat.size > MAX_FILE_SIZE) {
                findings.push({
                    ruleId: 'commands/file-too-large',
                    severity: 'warning',
                    message: `Command file is ${Math.round(stat.size / 1024)}KB, exceeds recommended 50KB limit (token budget concerns)`,
                    file: cmdPath,
                    fix: 'Split large command files or move reference content to separate files',
                });
            }
            const content = fs.readFileSync(cmdPath, 'utf-8');
            this.checkFrontmatter(cmdPath, content, findings);
            this.checkBody(cmdPath, content, findings);
            this.checkInjectionPatterns(cmdPath, content, findings);
        }
        return findings;
    }
    checkFrontmatter(filePath, content, findings) {
        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!fmMatch) {
            findings.push({
                ruleId: 'commands/missing-frontmatter',
                severity: 'error',
                message: 'Command file must have YAML frontmatter (between --- markers)',
                file: filePath,
                fix: 'Add frontmatter: ---\\ndescription: Your description here\\n---',
            });
            return;
        }
        const frontmatterContent = fmMatch[1];
        if (!/\bdescription\s*:/.test(frontmatterContent)) {
            findings.push({
                ruleId: 'commands/missing-description',
                severity: 'error',
                message: 'Command frontmatter must contain a "description" field',
                file: filePath,
                fix: 'Add a description field to the frontmatter',
            });
        }
    }
    checkBody(filePath, content, findings) {
        const fmMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
        const body = fmMatch ? content.slice(fmMatch[0].length).trim() : content.trim();
        if (!body) {
            findings.push({
                ruleId: 'commands/empty-body',
                severity: 'warning',
                message: 'Command file has no body content after frontmatter',
                file: filePath,
            });
        }
    }
    checkInjectionPatterns(filePath, content, findings) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            for (const { pattern, description } of INJECTION_PATTERNS) {
                if (pattern.test(lines[i])) {
                    findings.push({
                        ruleId: 'commands/prompt-injection',
                        severity: 'error',
                        message: `Potential prompt injection pattern: ${description}`,
                        file: filePath,
                        line: i + 1,
                    });
                }
            }
        }
    }
}
//# sourceMappingURL=commands-lint.js.map