import type { PresetManifest } from './types.js';
export declare function resolvePreset(nameOrPath: string, options?: {
    force?: boolean;
}): Promise<{
    manifest: PresetManifest;
    baseDir: string;
}>;
export declare function listAvailable(): Promise<string[]>;
//# sourceMappingURL=resolver.d.ts.map