import { Rule, RuleContext, Finding } from './types.js';
export declare class CommandsLintRule implements Rule {
    id: string;
    name: string;
    description: string;
    category: "commands";
    check(context: RuleContext): Promise<Finding[]>;
    private checkFrontmatter;
    private checkBody;
    private checkInjectionPatterns;
}
//# sourceMappingURL=commands-lint.d.ts.map