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

const SEVERITY_ORDER: Record<Severity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

function matchesFilter(rule: Rule, filters: string[]): boolean {
  return filters.some(
    filter => rule.id.startsWith(filter) || rule.category === filter
  );
}

function meetsMinimumSeverity(finding: Finding, minimum: Severity): boolean {
  return SEVERITY_ORDER[finding.severity] <= SEVERITY_ORDER[minimum];
}

export async function runRules(
  context: RuleContext,
  rules: Rule[],
  options?: EngineOptions
): Promise<EngineResult> {
  let activeRules = rules;

  if (options?.rules && options.rules.length > 0) {
    activeRules = rules.filter(rule => matchesFilter(rule, options.rules!));
  }

  const results = await Promise.allSettled(
    activeRules.map(rule => rule.check(context))
  );

  let findings: Finding[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      findings.push(...result.value);
    }
  }

  if (options?.severity) {
    findings = findings.filter(f => meetsMinimumSeverity(f, options.severity!));
  }

  const errors = findings.filter(f => f.severity === 'error').length;
  const warnings = findings.filter(f => f.severity === 'warning').length;
  const infos = findings.filter(f => f.severity === 'info').length;

  return {
    findings,
    errors,
    warnings,
    infos,
    passed: errors === 0,
  };
}
