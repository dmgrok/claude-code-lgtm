import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as yaml from 'js-yaml';
import { summarizeFindings, createActionRules } from '../src/action-support.js';
import { SkillSecurityRule } from '../src/rules/skill-security.js';
import type { Finding, Rule, RuleContext } from '../src/rules/types.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SKILL = path.join(__dirname, 'test-skill-1/SKILL.md');

function skillContext(skillFile: string): RuleContext {
  return {
    files: {
      projectRoot: path.dirname(skillFile),
      hookScripts: [],
      commandFiles: [],
      skillFiles: [skillFile],
    },
  };
}

function securityRule(rules: Rule[]): Rule {
  const rule = rules.find(r => r instanceof SkillSecurityRule);
  if (!rule) throw new Error('SkillSecurityRule missing from action rules');
  return rule;
}

describe('action outputs', () => {
  it('counts skill spec and security findings by their real rule ids', () => {
    const findings: Finding[] = [
      { ruleId: 'skills/spec', severity: 'error', message: 'missing name' },
      { ruleId: 'skills/security/prompt_injection', severity: 'error', message: 'injection' },
      { ruleId: 'skills/security/code_injection', severity: 'warning', message: 'eval' },
      { ruleId: 'settings/lint', severity: 'error', message: 'bad event' },
    ];

    expect(summarizeFindings(findings)).toEqual({ specFindings: 1, securityFindings: 2 });
  });
});

describe('lakera-api-key input', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  const flaggedResponse = () =>
    new Response(
      JSON.stringify({ flagged: true, breakdown: { prompt_injection: { detected: true } } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );

  it('sends SKILL.md content to Lakera Guard when a key is provided', async () => {
    const fetchMock = vi.fn(async () => flaggedResponse());
    vi.stubGlobal('fetch', fetchMock);

    const findings = await securityRule(createActionRules({ lakeraApiKey: 'test-key' })).check(
      skillContext(SKILL),
    );

    expect(fetchMock).toHaveBeenCalledWith('https://api.lakera.ai/v2/guard', expect.anything());
    expect(findings.some(f => f.message.includes('Lakera Guard detected: prompt_injection'))).toBe(true);
  });

  it('does not call Lakera Guard without a key', async () => {
    const fetchMock = vi.fn(async () => flaggedResponse());
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('LAKERA_GUARD_API_KEY', '');

    await securityRule(createActionRules({})).check(skillContext(SKILL));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('action.yml contract', () => {
  type ActionInput = { deprecationMessage?: string };
  type ActionMetadata = {
    inputs: Record<string, ActionInput>;
    outputs: Record<string, unknown>;
    runs: { using: string; main: string };
  };

  const action = yaml.load(fs.readFileSync(path.join(ROOT, 'action.yml'), 'utf-8')) as ActionMetadata;
  const source = fs.readFileSync(path.join(ROOT, 'src/action.ts'), 'utf-8');

  it('reads every input, or marks it deprecated', () => {
    for (const [name, input] of Object.entries(action.inputs)) {
      const read = source.includes(`core.getInput('${name}')`);
      expect(read || Boolean(input.deprecationMessage), `input "${name}"`).toBe(true);
    }
  });

  it('sets every declared output', () => {
    for (const name of Object.keys(action.outputs)) {
      expect(source.includes(`core.setOutput('${name}'`), `output "${name}"`).toBe(true);
    }
  });

  it('runs a self-contained bundle on a supported Node runtime', () => {
    expect(action.runs.using).toBe('node24');
    expect(action.runs.main).toBe('dist/action.cjs');

    const bundle = fs.readFileSync(path.join(ROOT, action.runs.main), 'utf-8');
    expect(bundle).not.toMatch(/require\(["'](@actions\/core|js-yaml)["']\)/);
    expect(bundle).not.toMatch(/from ["'](@actions\/core|js-yaml)["']/);
  });
});
