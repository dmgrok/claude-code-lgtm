import { ALL_RULES } from './rules/index.js';
import { SkillSecurityRule } from './rules/skill-security.js';
import type { Finding, Rule } from './rules/types.js';

export interface FindingSummary {
  specFindings: number;
  securityFindings: number;
}

export function summarizeFindings(findings: Finding[]): FindingSummary {
  return {
    specFindings: findings.filter(f => f.ruleId.startsWith('skills/spec')).length,
    securityFindings: findings.filter(f => f.ruleId.startsWith('skills/security')).length,
  };
}

export interface ActionRuleOptions {
  lakeraApiKey?: string;
}

export function createActionRules(options: ActionRuleOptions): Rule[] {
  if (!options.lakeraApiKey) return ALL_RULES;
  return ALL_RULES.map(rule =>
    rule instanceof SkillSecurityRule ? new SkillSecurityRule({ lakeraApiKey: options.lakeraApiKey }) : rule,
  );
}
