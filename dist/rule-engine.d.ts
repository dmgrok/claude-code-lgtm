import type { Finding, Rule, RuleContext, Severity } from './rules/types.js';
export interface EngineOptions {
    rules?: string[];
    severity?: Severity;
}
export interface EngineResult {
    findings: Finding[];
    errors: number;
    warnings: number;
    infos: number;
    passed: boolean;
}
export declare function runRules(context: RuleContext, rules: Rule[], options?: EngineOptions): Promise<EngineResult>;
//# sourceMappingURL=rule-engine.d.ts.map