import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { SpecValidator } from '../scanners/spec-validator.js';
export class SkillSpecRule {
    id = 'skills/spec';
    name = 'Skill Spec Compliance';
    description = 'Validates SKILL.md files against the Agent Skills specification';
    category = 'skills';
    validator = new SpecValidator();
    async check(context) {
        const findings = [];
        for (const skillPath of context.files.skillFiles) {
            if (!fs.existsSync(skillPath))
                continue;
            const content = fs.readFileSync(skillPath, 'utf-8');
            const skill = this.parseSkillFile(skillPath, content);
            if (!skill) {
                findings.push({
                    ruleId: this.id,
                    severity: 'error',
                    message: 'Failed to parse SKILL.md (invalid frontmatter)',
                    file: skillPath,
                });
                continue;
            }
            const result = this.validator.validate(skill);
            for (const violation of result.errors) {
                findings.push({
                    ruleId: `${this.id}/${violation.field}`,
                    severity: 'error',
                    message: `${violation.rule}${violation.actual ? ` (got: ${violation.actual})` : ''}`,
                    file: skillPath,
                });
            }
            for (const violation of result.warnings) {
                findings.push({
                    ruleId: `${this.id}/${violation.field}`,
                    severity: 'warning',
                    message: `${violation.rule}${violation.actual ? ` (got: ${violation.actual})` : ''}`,
                    file: skillPath,
                });
            }
        }
        return findings;
    }
    parseSkillFile(filePath, content) {
        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!fmMatch)
            return null;
        let frontmatter;
        try {
            frontmatter = yaml.load(fmMatch[1]) || {};
        }
        catch {
            return null;
        }
        const body = content.slice(fmMatch[0].length).trim();
        const dirName = path.basename(path.dirname(filePath));
        return {
            name: frontmatter.name || '',
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
//# sourceMappingURL=skill-spec.js.map