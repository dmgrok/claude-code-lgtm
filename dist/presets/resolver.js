import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
function getBuiltinPresetsDir() {
    // In dist/presets/ after build, or ../../presets/ from src/presets/
    const fromDist = path.resolve(__dirname, '..', '..', 'presets');
    return fromDist;
}
export async function resolvePreset(nameOrPath) {
    // Local path
    if (nameOrPath.startsWith('.') || nameOrPath.startsWith('/')) {
        const absPath = path.resolve(nameOrPath);
        const manifest = await readManifest(absPath);
        return { manifest, baseDir: absPath };
    }
    // Built-in preset
    const builtinDir = path.join(getBuiltinPresetsDir(), nameOrPath);
    try {
        const manifest = await readManifest(builtinDir);
        return { manifest, baseDir: builtinDir };
    }
    catch {
        throw new Error(`Preset "${nameOrPath}" not found. Available presets: ${(await listAvailable()).join(', ')}`);
    }
}
async function readManifest(dir) {
    const manifestPath = path.join(dir, 'preset.json');
    const content = await fs.readFile(manifestPath, 'utf-8');
    return JSON.parse(content);
}
export async function listAvailable() {
    const dir = getBuiltinPresetsDir();
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const presets = [];
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const hasManifest = await fs.access(path.join(dir, entry.name, 'preset.json'))
                    .then(() => true)
                    .catch(() => false);
                if (hasManifest)
                    presets.push(entry.name);
            }
        }
        return presets;
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=resolver.js.map