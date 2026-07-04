import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { SecurityScanner } from '../scanners/security-scanner.js';
const SEVERITY_MAP = {
    CRITICAL: 'error',
    HIGH: 'error',
    MEDIUM: 'warning',
    LOW: 'info',
    SAFE: 'info',
};
export class SkillSecurityRule {
    id = 'skills/security';
    name = 'Skill Security';
    description = 'Scans SKILL.md files for security threats';
    category = 'skills';
    scanner = new SecurityScanner({ skipSecretDetection: false });
    async check(context) {
        const findings = [];
        for (const skillPath of context.files.skillFiles) {
            if (!fs.existsSync(skillPath))
                continue;
            const content = fs.readFileSync(skillPath, 'utf-8');
            const skill = this.parseSkillFile(skillPath, content);
            if (!skill)
                continue;
            const result = await this.scanner.scan(skill);
            for (const secFinding of result.findings) {
                findings.push({
                    ruleId: `${this.id}/${secFinding.category.toLowerCase()}`,
                    severity: SEVERITY_MAP[secFinding.severity] || 'warning',
                    message: `${secFinding.description}: "${secFinding.match}"`,
                    file: skillPath,
                    line: secFinding.line,
                });
            }
        }
        return findings;
    }
    parseSkillFile(filePath, content) {
        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        let frontmatter = {};
        let body = content;
        if (fmMatch) {
            try {
                frontmatter = yaml.load(fmMatch[1]) || {};
            }
            catch {
                frontmatter = {};
            }
            body = content.slice(fmMatch[0].length).trim();
        }
        const dirName = path.basename(path.dirname(filePath));
        return {
            name: frontmatter.name || dirName,
            description: frontmatter.description || '',
            content: body,
            source: { repo: '', provider: 'local', priority: 0 },
            path: filePath,
            directoryName: dirName,
            frontmatter,
            filePath,
        };
    }
}
//# sourceMappingURL=skill-security.js.map