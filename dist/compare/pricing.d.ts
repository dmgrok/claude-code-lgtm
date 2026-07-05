import type { TokenUsage } from './types.js';
interface PricingTier {
    input_per_mtok: number;
    output_per_mtok: number;
    cache_create_per_mtok: number;
    cache_read_per_mtok: number;
}
export declare const MODEL_PRICING: Record<string, PricingTier>;
export declare function resolveModel(rawModel: string): string;
export declare function calculateCost(usage: TokenUsage, model: string): number;
export declare function cacheHitRate(usage: TokenUsage): number;
export {};
//# sourceMappingURL=pricing.d.ts.map