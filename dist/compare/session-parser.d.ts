import type { SessionMetrics } from './types.js';
export declare function parseSession(sessionId: string): Promise<SessionMetrics>;
export declare function findMostRecentSession(projectPath?: string): Promise<string | null>;
declare function findSessionFile(sessionId: string): Promise<string>;
export { findSessionFile };
//# sourceMappingURL=session-parser.d.ts.map