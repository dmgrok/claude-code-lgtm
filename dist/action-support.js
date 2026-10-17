import { ALL_RULES } from './rules/index.js';
import { SkillSecurityRule } from './rules/skill-security.js';
export function summarizeFindings(findings) {
    return {
        specFindings: findings.filter(f => f.ruleId.startsWith('skills/spec')).length,
        securityFindings: findings.filter(f => f.ruleId.startsWith('skills/security')).length,
    };
}
export function createActionRules(options) {
    if (!options.lakeraApiKey)
        return ALL_RULES;
    return ALL_RULES.map(rule => rule instanceof SkillSecurityRule ? new SkillSecurityRule({ lakeraApiKey: options.lakeraApiKey }) : rule);
}
//# sourceMappingURL=action-support.js.map