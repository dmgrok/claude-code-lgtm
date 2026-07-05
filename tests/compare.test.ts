import { describe, it, expect } from 'vitest';
import { calculateCost, cacheHitRate, resolveModel } from '../src/compare/pricing.js';
import { estimateSavings } from '../src/compare/estimator.js';
import type { SessionMetrics, TokenUsage } from '../src/compare/types.js';

describe('pricing — calculateCost', () => {
  it('calculates cost for sonnet with only input tokens', () => {
    const cost = calculateCost(
      { input_tokens: 1_000_000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0 },
      'claude-sonnet-4-6',
    );
    expect(cost).toBeCloseTo(3.0, 5);
  });

  it('calculates cost for opus input', () => {
    const cost = calculateCost(
      { input_tokens: 1_000_000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0 },
      'claude-opus-4-8',
    );
    expect(cost).toBeCloseTo(5.0, 5);
  });

  it('applies cheaper cache read rate', () => {
    const costCache = calculateCost(
      { input_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 1_000_000, output_tokens: 0 },
      'claude-sonnet-4-6',
    );
    const costInput = calculateCost(
      { input_tokens: 1_000_000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0 },
      'claude-sonnet-4-6',
    );
    expect(costCache).toBeLessThan(costInput);
  });

  it('opusplan is cheaper than pure opus for input', () => {
    const usage = { input_tokens: 1_000_000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0 };
    const opus = calculateCost(usage, 'claude-opus-4-8');
    const blended = calculateCost(usage, 'opusplan');
    expect(blended).toBeLessThan(opus);
  });
});

describe('pricing — resolveModel', () => {
  it('extracts known model from AWS ARN', () => {
    const arn = 'arn:aws:bedrock:eu-central-1::foundation-model/claude-sonnet-4-6';
    expect(resolveModel(arn)).toBe('claude-sonnet-4-6');
  });

  it('returns the model string as-is when it is a known key', () => {
    expect(resolveModel('claude-opus-4-8')).toBe('claude-opus-4-8');
  });

  it('falls back to sonnet for unknown models', () => {
    expect(resolveModel('totally-unknown-model')).toBe('claude-sonnet-4-6');
  });
});

describe('pricing — cacheHitRate', () => {
  it('returns 0 when no cache reads', () => {
    expect(cacheHitRate({ input_tokens: 100, cache_creation_input_tokens: 900, cache_read_input_tokens: 0, output_tokens: 0 })).toBe(0);
  });

  it('computes correct cache hit fraction', () => {
    // 500 cache reads out of 1000 total input
    const rate = cacheHitRate({ input_tokens: 200, cache_creation_input_tokens: 300, cache_read_input_tokens: 500, output_tokens: 0 });
    expect(rate).toBeCloseTo(0.5, 5);
  });

  it('returns 0 for empty usage', () => {
    expect(cacheHitRate({ input_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0 })).toBe(0);
  });
});

describe('estimator — estimateSavings', () => {
  // Session dominated by fresh input and output — this is where opusplan saves money.
  // Cache-read-heavy sessions can be a wash due to opusplan's slightly higher cache rate.
  const baseUsage = {
    input_tokens: 500_000,
    cache_creation_input_tokens: 100_000,
    cache_read_input_tokens: 50_000,
    output_tokens: 100_000,
  };
  const baseSession: SessionMetrics = {
    sessionId: 'test-session',
    model: 'claude-sonnet-4-6',
    turns: 10,
    totalUsage: baseUsage,
    costUsd: calculateCost(baseUsage, 'claude-sonnet-4-6'),
  };

  it('estimated cost is less than actual cost', () => {
    const result = estimateSavings(baseSession);
    expect(result.estimated.costUsd).toBeLessThan(result.actual.costUsd);
  });

  it('cost savings are positive', () => {
    const result = estimateSavings(baseSession);
    expect(result.savings.costDelta).toBeGreaterThan(0);
  });

  it('cost savings percentage is between 0 and 60%', () => {
    const result = estimateSavings(baseSession);
    expect(result.savings.costDeltaPct).toBeGreaterThan(0);
    expect(result.savings.costDeltaPct).toBeLessThan(60);
  });

  it('output tokens are unchanged in estimate', () => {
    const result = estimateSavings(baseSession);
    expect(result.estimated.totalUsage.output_tokens).toBe(baseSession.totalUsage.output_tokens);
  });

  it('returns at least 3 assumption strings', () => {
    const result = estimateSavings(baseSession);
    expect(result.assumptions.length).toBeGreaterThanOrEqual(3);
  });

  it('estimated model is opusplan', () => {
    const result = estimateSavings(baseSession);
    expect(result.estimated.model).toBe('opusplan');
  });
});
