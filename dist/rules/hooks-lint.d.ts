import { Rule, RuleContext, Finding } from './types.js';
export declare class HooksLintRule implements Rule {
    id: string;
    name: string;
    description: string;
    category: "hooks";
    check(context: RuleContext): Promise<Finding[]>;
    private checkExecutable;
    private checkStdinUsage;
    private checkDangerousPatterns;
    private checkSecrets;
}
//# sourceMappingURL=hooks-lint.d.ts.map