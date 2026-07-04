import { Rule, RuleContext, Finding } from './types.js';
export declare class SettingsLintRule implements Rule {
    id: string;
    name: string;
    description: string;
    category: "settings";
    check(context: RuleContext): Promise<Finding[]>;
    private validateHooks;
    private validateHookEntry;
}
//# sourceMappingURL=settings-lint.d.ts.map