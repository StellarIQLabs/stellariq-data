// Pool financial metrics: fees, volume/TVL ratio and estimated price impact.
export interface PoolFinancialInput {
  poolId: string;
  tvlUsd: number;
  volume24hUsd: number;
  feeBps: number;
  reserveIn: number;
  tradeSize: number;
}

export interface PoolFinancialMetrics {
  poolId: string;
  fees24hUsd: number;
  volumeToTvl: number | null;
  estimatedPriceImpactPct: number | null;
}

export function computePoolMetrics(input: PoolFinancialInput): PoolFinancialMetrics {
  const fees24hUsd = input.volume24hUsd * (input.feeBps / 10_000);
  const volumeToTvl = input.tvlUsd > 0 ? input.volume24hUsd / input.tvlUsd : null;
  const estimatedPriceImpactPct =
    input.reserveIn > 0 && input.tradeSize >= 0
      ? (input.tradeSize / (input.reserveIn + input.tradeSize)) * 100
      : null;
  return { poolId: input.poolId, fees24hUsd, volumeToTvl, estimatedPriceImpactPct };
}
