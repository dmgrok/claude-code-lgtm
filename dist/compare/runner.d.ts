import type { SessionMetrics } from './types.js';
export declare const DEFAULT_PROMPT = "List every file in the current directory (not recursively). For each file, write one sentence describing what it does. Be terse.";
export declare function runBaseline(prompt?: string): Promise<SessionMetrics>;
export declare function runOptimized(prompt?: string): Promise<SessionMetrics>;
export declare function isClaudeAvailable(): Promise<boolean>;
//# sourceMappingURL=runner.d.ts.map