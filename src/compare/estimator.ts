import type { SessionMetrics, EstimatedCompareResult, TokenUsage } from './types.js';
import { calculateCost } from './pricing.js';

const REDUCTION = {
  // Permission pre-approval eliminates roundtrip input tokens
  permissionRoundtrip: 0.05,
  // Concise-read hook nudges targeted reads over full-file reads
  readOptimization: 0.20,
  // More cache hits from stable, pre-approved permission config
  cacheHitImprovement: 0.15,
};

export function estimateSavings(actual: SessionMetrics): EstimatedCompareResult {
  const assumptions: string[] = [];

  const inputReduction = REDUCTION.permissionRoundtrip + REDUCTION.readOptimization;

  const estimatedUsage: TokenUsage = {
    input_tokens: Math.round(actual.totalUsage.input_tokens * (1 - inputReduction)),
    output_tokens: actual.totalUsage.output_tokens,
    cache_creation_input_tokens: Math.round(
      actual.totalUsage.cache_creation_input_tokens * (1 - REDUCTION.cacheHitImprovement)
    ),
    cache_read_input_tokens: Math.round(
      actual.totalUsage.cache_read_input_tokens * (1 + REDUCTION.cacheHitImprovement)
    ),
  };

  const estimatedModel = 'opusplan';
  const estimatedCost = calculateCost(estimatedUsage, estimatedModel);

  assumptions.push(
    `Input tokens reduced ${(inputReduction * 100).toFixed(0)}% — permission pre-approval (${(REDUCTION.permissionRoundtrip * 100).toFixed(0)}%) + targeted reads (${(REDUCTION.readOptimization * 100).toFixed(0)}%)`,
  );
  assumptions.push(
    `Cache hit rate improved ${(REDUCTION.cacheHitImprovement * 100).toFixed(0)}% from stable permission config`,
  );
  assumptions.push(`Model: ${actual.model} → opusplan (80% Sonnet + 20% Opus, $3.40/MTok vs $3.00–$5.00)`);
  assumptions.push('Output tokens unchanged — optimization targets input, not generated content');

  const estimated: SessionMetrics = {
    sessionId: `${actual.sessionId} (estimated)`,
    model: estimatedModel,
    turns: actual.turns,
    totalUsage: estimatedUsage,
    costUsd: estimatedCost,
  };

  const totalActualInput =
    actual.totalUsage.input_tokens +
    actual.totalUsage.cache_creation_input_tokens +
    actual.totalUsage.cache_read_input_tokens;
  const totalEstimatedInput =
    estimatedUsage.input_tokens +
    estimatedUsage.cache_creation_input_tokens +
    estimatedUsage.cache_read_input_tokens;

  return {
    actual,
    estimated,
    savings: {
      totalInputDelta: totalActualInput - totalEstimatedInput,
      totalInputDeltaPct:
        totalActualInput > 0
          ? ((totalActualInput - totalEstimatedInput) / totalActualInput) * 100
          : 0,
      costDelta: actual.costUsd - estimatedCost,
      costDeltaPct:
        actual.costUsd > 0 ? ((actual.costUsd - estimatedCost) / actual.costUsd) * 100 : 0,
    },
    assumptions,
  };
}
