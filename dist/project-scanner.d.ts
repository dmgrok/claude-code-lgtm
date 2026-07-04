import type { DiscoveredFiles } from './rules/types.js';
export interface ScanOptions {
    path?: string;
}
export declare function scanProject(options?: ScanOptions): Promise<DiscoveredFiles>;
//# sourceMappingURL=project-scanner.d.ts.map