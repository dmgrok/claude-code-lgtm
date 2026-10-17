import type { Finding, Rule } from './rules/types.js';
export interface FindingSummary {
    specFindings: number;
    securityFindings: number;
}
export declare function summarizeFindings(findings: Finding[]): FindingSummary;
export interface ActionRuleOptions {
    lakeraApiKey?: string;
}
export declare function createActionRules(options: ActionRuleOptions): Rule[];
//# sourceMappingURL=action-support.d.ts.map