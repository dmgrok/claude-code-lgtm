import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { calculateCost, resolveModel } from './pricing.js';
export async function parseSession(sessionId) {
    const jsonlPath = await findSessionFile(sessionId);
    const content = await fs.readFile(jsonlPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const totalUsage = {
        input_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        output_tokens: 0,
    };
    let turns = 0;
    let model = 'unknown';
    for (const line of lines) {
        try {
            const obj = JSON.parse(line);
            const msg = obj.message;
            if (msg?.role === 'assistant' && msg.usage) {
                turns++;
                totalUsage.input_tokens += msg.usage.input_tokens ?? 0;
                totalUsage.cache_creation_input_tokens += msg.usage.cache_creation_input_tokens ?? 0;
                totalUsage.cache_read_input_tokens += msg.usage.cache_read_input_tokens ?? 0;
                totalUsage.output_tokens += msg.usage.output_tokens ?? 0;
                if (msg.model)
                    model = msg.model;
            }
        }
        catch {
            // skip malformed lines
        }
    }
    const resolvedModel = resolveModel(model);
    const costUsd = calculateCost(totalUsage, resolvedModel);
    return { sessionId, model: resolvedModel, turns, totalUsage, costUsd };
}
export async function findMostRecentSession(projectPath) {
    const projectsDir = path.join(os.homedir(), '.claude', 'projects');
    try {
        await fs.access(projectsDir);
    }
    catch {
        return null;
    }
    const targetDir = projectPath
        ? encodeProjectPath(projectPath)
        : encodeProjectPath(process.cwd());
    const dirs = [];
    if (projectPath || true) {
        // Try the current project first
        const encoded = encodeProjectPath(process.cwd());
        const projectDir = path.join(projectsDir, encoded);
        try {
            await fs.access(projectDir);
            dirs.push(projectDir);
        }
        catch {
            // fall through to all projects
        }
    }
    if (dirs.length === 0) {
        const entries = await fs.readdir(projectsDir);
        for (const e of entries) {
            dirs.push(path.join(projectsDir, e));
        }
    }
    let newest = null;
    for (const dir of dirs) {
        try {
            const files = await fs.readdir(dir);
            for (const f of files) {
                if (!f.endsWith('.jsonl'))
                    continue;
                const uuid = f.slice(0, -'.jsonl'.length);
                const stat = await fs.stat(path.join(dir, f));
                if (!newest || stat.mtimeMs > newest.mtime) {
                    newest = { mtime: stat.mtimeMs, uuid };
                }
            }
        }
        catch {
            // skip unreadable dirs
        }
    }
    return newest?.uuid ?? null;
}
async function findSessionFile(sessionId) {
    const projectsDir = path.join(os.homedir(), '.claude', 'projects');
    const entries = await fs.readdir(projectsDir);
    for (const dir of entries) {
        const candidate = path.join(projectsDir, dir, `${sessionId}.jsonl`);
        try {
            await fs.access(candidate);
            return candidate;
        }
        catch {
            // not here
        }
    }
    throw new Error(`Session "${sessionId}" not found in ~/.claude/projects/`);
}
function encodeProjectPath(absPath) {
    // Claude encodes /Users/foo/bar as -Users-foo-bar
    return absPath.replace(/\//g, '-');
}
export { findSessionFile };
//# sourceMappingURL=session-parser.js.map