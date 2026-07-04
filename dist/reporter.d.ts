import type { DiscoveredFiles } from './rules/types.js';
import type { EngineResult } from './rule-engine.js';
export type OutputFormat = 'cli' | 'json' | 'github';
export declare function formatResults(result: EngineResult, files: DiscoveredFiles, format: OutputFormat): string;
//# sourceMappingURL=reporter.d.ts.map