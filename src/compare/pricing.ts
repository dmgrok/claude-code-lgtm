import type { TokenUsage } from './types.js';

interface PricingTier {
  input_per_mtok: number;
  output_per_mtok: number;
  cache_create_per_mtok: number;
  cache_read_per_mtok: number;
}

export const MODEL_PRICING: Record<string, PricingTier> = {
  'claude-sonnet-4-6': {
    input_per_mtok: 3.00,
    output_per_mtok: 15.00,
    cache_create_per_mtok: 3.75,
    cache_read_per_mtok: 0.30,
  },
  'claude-opus-4-8': {
    input_per_mtok: 5.00,
    output_per_mtok: 25.00,
    cache_create_per_mtok: 6.25,
    cache_read_per_mtok: 0.50,
  },
  'claude-opus-4-7': {
    input_per_mtok: 5.00,
    output_per_mtok: 25.00,
    cache_create_per_mtok: 6.25,
    cache_read_per_mtok: 0.50,
  },
  'claude-opus-4-6': {
    input_per_mtok: 5.00,
    output_per_mtok: 25.00,
    cache_create_per_mtok: 6.25,
    cache_read_per_mtok: 0.50,
  },
  'claude-haiku-4-5': {
    input_per_mtok: 1.00,
    output_per_mtok: 5.00,
    cache_create_per_mtok: 1.25,
    cache_read_per_mtok: 0.10,
  },
  // opusplan blended: 80% Sonnet + 20% Opus
  opusplan: {
    input_per_mtok: 3.40,
    output_per_mtok: 17.00,
    cache_create_per_mtok: 4.25,
    cache_read_per_mtok: 0.34,
  },
};

export function resolveModel(rawModel: string): string {
  // Normalize AWS ARN or full model strings to our pricing key
  for (const key of Object.keys(MODEL_PRICING)) {
    if (rawModel.includes(key)) return key;
  }
  return 'claude-sonnet-4-6'; // safe fallback
}

export function calculateCost(usage: TokenUsage, model: string): number {
  const key = resolveModel(model);
  const p = MODEL_PRICING[key] ?? MODEL_PRICING['claude-sonnet-4-6'];
  return (
    (usage.input_tokens * p.input_per_mtok) / 1_000_000 +
    (usage.output_tokens * p.output_per_mtok) / 1_000_000 +
    (usage.cache_creation_input_tokens * p.cache_create_per_mtok) / 1_000_000 +
    (usage.cache_read_input_tokens * p.cache_read_per_mtok) / 1_000_000
  );
}

export function cacheHitRate(usage: TokenUsage): number {
  const total =
    usage.input_tokens +
    usage.cache_creation_input_tokens +
    usage.cache_read_input_tokens;
  if (total === 0) return 0;
  return usage.cache_read_input_tokens / total;
}
