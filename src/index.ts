export { scanProject } from './project-scanner.js';
export { runRules } from './rule-engine.js';
export { formatResults } from './reporter.js';
export { ALL_RULES } from './rules/index.js';
export type { Rule, Finding, Severity, DiscoveredFiles, RuleContext } from './rules/types.js';
export type { EngineResult, EngineOptions } from './rule-engine.js';
export type { OutputFormat } from './reporter.js';
export type { ScanOptions } from './project-scanner.js';

export { SecurityScanner } from './scanners/index.js';
export { SpecValidator } from './scanners/index.js';

export { installPreset, uninstallPreset, listAvailable, resolvePreset } from './presets/index.js';
export type { PresetManifest, PresetsLock, InstalledPreset } from './presets/index.js';

export { compareCommand } from './compare/index.js';
export { calculateCost, cacheHitRate, MODEL_PRICING } from './compare/pricing.js';
export { parseSession } from './compare/session-parser.js';
export { estimateSavings } from './compare/estimator.js';
export type { TokenUsage, SessionMetrics, CompareResult, EstimatedCompareResult, CompareOptions } from './compare/types.js';
