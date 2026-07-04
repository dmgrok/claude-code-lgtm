import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Rule, RuleContext, Finding } from './types.js';
import { SpecValidator } from '../scanners/spec-validator.js';
import { RawSkill } from '../scanners/types.js';

export class SkillSpecRule implements Rule {
  id = 'skills/spec';
  name = 'Skill Spec Compliance';
  description = 'Validates SKILL.md files against the Agent Skills specification';
  category = 'skills' as const;

  private validator = new SpecValidator();

  async check(context: RuleContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const skillPath of context.files.skillFiles) {
      if (!fs.existsSync(skillPath)) continue;

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

  private parseSkillFile(filePath: string, content: string): RawSkill | null {
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) return null;

    let frontmatter: Record<string, unknown>;
    try {
      frontmatter = (yaml.load(fmMatch[1]) as Record<string, unknown>) || {};
    } catch {
      return null;
    }

    const body = content.slice(fmMatch[0].length).trim();
    const dirName = path.basename(path.dirname(filePath));

    return {
      name: (frontmatter.name as string) || '',
      description: (frontmatter.description as string) || '',
      content: body,
      source: { repo: '', provider: 'local', priority: 0 },
      path: filePath,
      directoryName: dirName,
      frontmatter,
      filePath,
    };
  }
}
