import type { PresetManifest } from './types.js';
export interface MergeResult {
    settings: Record<string, unknown>;
    warnings: string[];
}
export declare function mergeSettingsJson(existing: Record<string, unknown>, preset: PresetManifest, presetName: string): MergeResult;
export declare function removePresetFromSettings(existing: Record<string, unknown>, hookCommands: string[]): Record<string, unknown>;
//# sourceMappingURL=composer.d.ts.map