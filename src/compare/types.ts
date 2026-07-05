export interface TokenUsage {
  input_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  output_tokens: number;
}

export interface SessionMetrics {
  sessionId: string;
  model: string;
  turns: number;
  totalUsage: TokenUsage;
  durationMs?: number;
  costUsd: number;
}

export interface CompareResult {
  baseline: SessionMetrics;
  optimized: SessionMetrics;
  savings: {
    inputTokensDelta: number;
    inputTokensDeltaPct: number;
    outputTokensDelta: number;
    outputTokensDeltaPct: number;
    costDelta: number;
    costDeltaPct: number;
    cacheHitRateBaseline: number;
    cacheHitRateOptimized: number;
    durationDeltaPct?: number;
  };
}

export interface EstimatedCompareResult {
  actual: SessionMetrics;
  estimated: SessionMetrics;
  savings: {
    totalInputDelta: number;
    totalInputDeltaPct: number;
    costDelta: number;
    costDeltaPct: number;
  };
  assumptions: string[];
}

export interface CompareOptions {
  session?: string;
  prompt?: string;
  projectPath?: string;
}
