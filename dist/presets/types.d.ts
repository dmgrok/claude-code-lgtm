export interface HookDefinition {
    type: 'command';
    command: string;
    timeout?: number;
}
export interface HookEntry {
    matcher: string;
    hooks: HookDefinition[];
}
export interface PresetManifest {
    name: string;
    version: string;
    description: string;
    author?: string;
    tags?: string[];
    settings?: {
        model?: string;
        effortLevel?: string;
    };
    permissions?: {
        allow?: string[];
    };
    hooks?: {
        [event: string]: HookEntry[];
    };
    commands?: string[];
    snippets?: string[];
    conflicts?: string[];
    requires?: string[];
}
export interface InstalledPreset {
    version: string;
    installedAt: string;
    files: string[];
    hookEntries: string[];
    addedPermissions?: string[];
    addedSettings?: string[];
}
export interface PresetsLock {
    installed: Record<string, InstalledPreset>;
}
//# sourceMappingURL=types.d.ts.map