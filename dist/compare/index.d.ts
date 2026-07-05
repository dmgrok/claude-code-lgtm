import type { CompareOptions, CompareResult } from './types.js';
import { parseSession } from './session-parser.js';
import { estimateSavings } from './estimator.js';
export declare function compareCommand(options: CompareOptions): Promise<number>;
export { estimateSavings, parseSession };
export type { CompareOptions, CompareResult };
//# sourceMappingURL=index.d.ts.map