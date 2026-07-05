export function mergeSettingsJson(existing, preset, presetName) {
    const warnings = [];
    const result = structuredClone(existing);
    if (preset.settings?.model) {
        if (result.model && result.model !== preset.settings.model) {
            warnings.push(`Overwriting model "${result.model}" with "${preset.settings.model}" (from preset "${presetName}")`);
        }
        result.model = preset.settings.model;
    }
    if (preset.settings?.effortLevel) {
        result.effortLevel = preset.settings.effortLevel;
    }
    if (preset.permissions?.allow) {
        const existingAllow = result.permissions?.allow ?? [];
        const merged = [...new Set([...existingAllow, ...preset.permissions.allow])];
        if (!result.permissions)
            result.permissions = {};
        result.permissions.allow = merged;
    }
    if (preset.hooks) {
        if (!result.hooks)
            result.hooks = {};
        const hooks = result.hooks;
        for (const [event, entries] of Object.entries(preset.hooks)) {
            if (!hooks[event])
                hooks[event] = [];
            for (const entry of entries) {
                const duplicate = hooks[event].some(existing => existing.hooks?.some(h => entry.hooks.some(newH => h.command === newH.command)));
                if (!duplicate) {
                    hooks[event].push(entry);
                }
            }
        }
    }
    return { settings: result, warnings };
}
export function removePresetFromSettings(existing, hookCommands) {
    const result = structuredClone(existing);
    if (result.hooks) {
        const hooks = result.hooks;
        for (const event of Object.keys(hooks)) {
            hooks[event] = hooks[event].filter(entry => !entry.hooks?.some(h => hookCommands.includes(h.command)));
            if (hooks[event].length === 0)
                delete hooks[event];
        }
        if (Object.keys(hooks).length === 0)
            delete result.hooks;
    }
    return result;
}
//# sourceMappingURL=composer.js.map