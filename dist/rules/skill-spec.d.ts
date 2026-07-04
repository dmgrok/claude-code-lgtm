import { Rule, RuleContext, Finding } from './types.js';
export declare class SkillSpecRule implements Rule {
    id: string;
    name: string;
    description: string;
    category: "skills";
    private validator;
    check(context: RuleContext): Promise<Finding[]>;
    private parseSkillFile;
}
//# sourceMappingURL=skill-spec.d.ts.map