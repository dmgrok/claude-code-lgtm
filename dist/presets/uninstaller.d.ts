export interface UninstallResult {
    success: boolean;
    presetName: string;
    filesRemoved: string[];
}
export declare function uninstallPreset(presetName: string, projectRoot: string): Promise<UninstallResult>;
//# sourceMappingURL=uninstaller.d.ts.map