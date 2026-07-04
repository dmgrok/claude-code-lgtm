import { Rule, RuleContext, Finding } from './types.js';
export declare class SkillSecurityRule implements Rule {
    id: string;
    name: string;
    description: string;
    category: "skills";
    private scanner;
    check(context: RuleContext): Promise<Finding[]>;
    private parseSkillFile;
}
//# sourceMappingURL=skill-security.d.ts.map