import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
const execFileAsync = promisify(execFile);
// Parse "github:owner/repo[/subpath...][#ref]"
// Ref is after #, subpath is any path segments after owner/repo
export function parseRemoteSpec(specifier) {
    const withoutScheme = specifier.slice('github:'.length);
    // Split ref off first (everything after #)
    const hashIdx = withoutScheme.indexOf('#');
    let ref = 'main';
    let withoutRef = withoutScheme;
    if (hashIdx !== -1) {
        ref = withoutScheme.slice(hashIdx + 1) || 'main';
        withoutRef = withoutScheme.slice(0, hashIdx);
    }
    const parts = withoutRef.split('/').filter(Boolean);
    if (parts.length < 2) {
        throw new Error(`Invalid remote specifier "${specifier}". Expected format: github:owner/repo[/subpath][#ref]`);
    }
    const owner = parts[0];
    const repo = parts[1];
    const subpath = parts.slice(2).join('/');
    return { owner, repo, ref, subpath };
}
export async function fetchPreset(spec, force = false) {
    const cacheDir = path.join(os.homedir(), '.lgtm', 'cache', 'github', spec.owner, spec.repo, spec.ref);
    const presetDir = spec.subpath ? path.join(cacheDir, spec.subpath) : cacheDir;
    const presetJson = path.join(presetDir, 'preset.json');
    // Return cached if it exists and force is not set
    if (!force) {
        try {
            await fs.access(presetJson);
            return presetDir;
        }
        catch { /* not cached, fall through */ }
    }
    // Verify tar is available
    try {
        await execFileAsync('tar', ['--version']);
    }
    catch {
        throw new Error('tar command not found. Install tar to use remote presets.');
    }
    const url = `https://api.github.com/repos/${spec.owner}/${spec.repo}/tarball/${spec.ref}`;
    let res;
    try {
        res = await fetch(url, {
            headers: { 'User-Agent': 'lgtm-cli', 'Accept': 'application/vnd.github+json' },
            redirect: 'follow',
        });
    }
    catch (err) {
        throw new Error(`Network error fetching ${spec.owner}/${spec.repo}. Check your connection.\n${err.message}`);
    }
    if (res.status === 404) {
        throw new Error(`Repository not found: ${spec.owner}/${spec.repo}`);
    }
    if (res.status === 403) {
        throw new Error(`GitHub API rate limited for ${spec.owner}/${spec.repo}. Try again in a few minutes or use a local path.`);
    }
    if (!res.ok) {
        throw new Error(`GitHub returned HTTP ${res.status} for ${spec.owner}/${spec.repo}`);
    }
    const tmpFile = path.join(tmpdir(), `lgtm-${Date.now()}.tar.gz`);
    try {
        const buf = Buffer.from(await res.arrayBuffer());
        await fs.writeFile(tmpFile, buf);
        // Clear and recreate cache dir
        await fs.rm(cacheDir, { recursive: true, force: true });
        await fs.mkdir(cacheDir, { recursive: true });
        await execFileAsync('tar', ['xzf', tmpFile, '-C', cacheDir, '--strip-components=1']);
    }
    finally {
        await fs.unlink(tmpFile).catch(() => { });
    }
    try {
        await fs.access(presetJson);
    }
    catch {
        const hint = spec.subpath ? `/${spec.subpath}` : '';
        throw new Error(`No preset.json found in ${spec.owner}/${spec.repo}${hint}. ` +
            `Make sure the repo contains a preset.json at the root${spec.subpath ? ` or in "${spec.subpath}"` : ''}.`);
    }
    return presetDir;
}
//# sourceMappingURL=registry.js.map