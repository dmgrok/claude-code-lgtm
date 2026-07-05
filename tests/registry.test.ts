import { describe, it, expect } from 'vitest';
import { parseRemoteSpec } from '../src/presets/registry.js';

describe('parseRemoteSpec', () => {
  it('parses basic owner/repo', () => {
    const spec = parseRemoteSpec('github:alice/my-preset');
    expect(spec.owner).toBe('alice');
    expect(spec.repo).toBe('my-preset');
    expect(spec.ref).toBe('main');
    expect(spec.subpath).toBe('');
  });

  it('parses owner/repo with subpath', () => {
    const spec = parseRemoteSpec('github:corp/monorepo/presets/fast-mode');
    expect(spec.owner).toBe('corp');
    expect(spec.repo).toBe('monorepo');
    expect(spec.subpath).toBe('presets/fast-mode');
    expect(spec.ref).toBe('main');
  });

  it('parses owner/repo with ref', () => {
    const spec = parseRemoteSpec('github:alice/my-preset#v2');
    expect(spec.ref).toBe('v2');
    expect(spec.subpath).toBe('');
  });

  it('parses owner/repo with subpath and ref', () => {
    const spec = parseRemoteSpec('github:corp/monorepo/presets/fast-mode#v1.2.0');
    expect(spec.owner).toBe('corp');
    expect(spec.repo).toBe('monorepo');
    expect(spec.subpath).toBe('presets/fast-mode');
    expect(spec.ref).toBe('v1.2.0');
  });

  it('throws on missing repo', () => {
    expect(() => parseRemoteSpec('github:alice')).toThrow('Invalid remote specifier');
  });

  it('throws on empty specifier', () => {
    expect(() => parseRemoteSpec('github:')).toThrow('Invalid remote specifier');
  });
});
