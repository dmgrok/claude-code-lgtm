import { execFile } from 'child_process';
import { promisify } from 'util';
import { calculateCost, resolveModel } from './pricing.js';
const execFileAsync = promisify(execFile);
export const DEFAULT_PROMPT = 'List every file in the current directory (not recursively). For each file, write one sentence describing what it does. Be terse.';
async function runClaude(prompt, extraArgs, label) {
    const { stdout } = await execFileAsync('claude', ['-p', prompt, '--output-format', 'json', '--max-budget-usd', '0.50', ...extraArgs], { timeout: 120_000, maxBuffer: 10 * 1024 * 1024 });
    const data = JSON.parse(stdout);
    const usage = {
        input_tokens: data.usage?.input_tokens ?? 0,
        cache_creation_input_tokens: data.usage?.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: data.usage?.cache_read_input_tokens ?? 0,
        output_tokens: data.usage?.output_tokens ?? 0,
    };
    const model = resolveModel(data.model ?? 'unknown');
    return {
        sessionId: label,
        model,
        turns: data.num_turns ?? 1,
        totalUsage: usage,
        durationMs: data.duration_ms,
        costUsd: data.total_cost_usd ?? calculateCost(usage, model),
    };
}
export async function runBaseline(prompt) {
    return runClaude(prompt ?? DEFAULT_PROMPT, ['--safe-mode'], 'baseline');
}
export async function runOptimized(prompt) {
    return runClaude(prompt ?? DEFAULT_PROMPT, [], 'optimized');
}
export async function isClaudeAvailable() {
    try {
        await execFileAsync('claude', ['--version'], { timeout: 5_000 });
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=runner.js.map