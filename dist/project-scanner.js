import * as fs from 'fs/promises';
import * as path from 'path';
async function exists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
async function walkDirectory(dir, maxDepth, skipDirs, currentDepth = 0) {
    if (currentDepth > maxDepth)
        return [];
    const results = [];
    let entries;
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    }
    catch {
        return results;
    }
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (!skipDirs.has(entry.name)) {
                const nested = await walkDirectory(fullPath, maxDepth, skipDirs, currentDepth + 1);
                results.push(...nested);
            }
        }
        else if (entry.isFile()) {
            results.push(fullPath);
        }
    }
    return results;
}
export async function scanProject(options) {
    const projectRoot = options?.path ?? process.cwd();
    const claudeDir = path.join(projectRoot, '.claude');
    const result = {
        projectRoot,
        hookScripts: [],
        commandFiles: [],
        skillFiles: [],
    };
    const claudeDirExists = await exists(claudeDir);
    if (!claudeDirExists) {
        const allFiles = await walkDirectory(projectRoot, 3, new Set(['node_modules', '.git', 'dist']));
        result.skillFiles = allFiles.filter(f => path.basename(f) === 'SKILL.md');
        return result;
    }
    result.claudeDir = claudeDir;
    const settingsPath = path.join(claudeDir, 'settings.json');
    if (await exists(settingsPath)) {
        result.settingsJson = settingsPath;
    }
    const settingsLocalPath = path.join(claudeDir, 'settings.local.json');
    if (await exists(settingsLocalPath)) {
        result.settingsLocalJson = settingsLocalPath;
    }
    const hooksDir = path.join(claudeDir, 'hooks');
    if (await exists(hooksDir)) {
        try {
            const hookEntries = await fs.readdir(hooksDir, { withFileTypes: true });
            result.hookScripts = hookEntries
                .filter(e => e.isFile() && e.name.endsWith('.sh'))
                .map(e => path.join(hooksDir, e.name));
        }
        catch {
            // ignore read errors
        }
    }
    const commandsDir = path.join(claudeDir, 'commands');
    if (await exists(commandsDir)) {
        try {
            const commandEntries = await fs.readdir(commandsDir, { withFileTypes: true });
            result.commandFiles = commandEntries
                .filter(e => e.isFile() && e.name.endsWith('.md'))
                .map(e => path.join(commandsDir, e.name));
        }
        catch {
            // ignore read errors
        }
    }
    const mcpConfigPath = path.join(claudeDir, 'managed-mcp.json');
    if (await exists(mcpConfigPath)) {
        result.mcpConfig = mcpConfigPath;
    }
    const presetsLockPath = path.join(claudeDir, 'presets.lock.json');
    if (await exists(presetsLockPath)) {
        result.presetsLock = presetsLockPath;
    }
    const allFiles = await walkDirectory(projectRoot, 3, new Set(['node_modules', '.git', 'dist']));
    result.skillFiles = allFiles.filter(f => path.basename(f) === 'SKILL.md');
    return result;
}
//# sourceMappingURL=project-scanner.js.map