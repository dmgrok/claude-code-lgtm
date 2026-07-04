const SEVERITY_ORDER = {
    error: 0,
    warning: 1,
    info: 2,
};
function matchesFilter(rule, filters) {
    return filters.some(filter => rule.id.startsWith(filter) || rule.category === filter);
}
function meetsMinimumSeverity(finding, minimum) {
    return SEVERITY_ORDER[finding.severity] <= SEVERITY_ORDER[minimum];
}
export async function runRules(context, rules, options) {
    let activeRules = rules;
    if (options?.rules && options.rules.length > 0) {
        activeRules = rules.filter(rule => matchesFilter(rule, options.rules));
    }
    const results = await Promise.allSettled(activeRules.map(rule => rule.check(context)));
    let findings = [];
    for (const result of results) {
        if (result.status === 'fulfilled') {
            findings.push(...result.value);
        }
    }
    if (options?.severity) {
        findings = findings.filter(f => meetsMinimumSeverity(f, options.severity));
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
//# sourceMappingURL=rule-engine.js.map