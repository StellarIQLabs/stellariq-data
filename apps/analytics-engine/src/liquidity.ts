// Liquidity analytics: per-pool and per-market TVL, reserve changes and trend.
export interface LiquiditySnapshot {
  poolId: string;
  marketId: string;
  tvlUsd: number;
  reserveA: number;
  reserveB: number;
  capturedAt: number;
}

export interface LiquidityTrend {
  poolId: string;
  tvlUsd: number;
  tvlChangePct: number | null;
  trend: "up" | "down" | "flat";
}

export function computeLiquidityTrend(current: LiquiditySnapshot, previous: LiquiditySnapshot | null): LiquidityTrend {
  if (!previous || previous.tvlUsd <= 0) {
    return { poolId: current.poolId, tvlUsd: current.tvlUsd, tvlChangePct: null, trend: "flat" };
  }
  const changePct = ((current.tvlUsd - previous.tvlUsd) / previous.tvlUsd) * 100;
  return {
    poolId: current.poolId,
    tvlUsd: current.tvlUsd,
    tvlChangePct: changePct,
    trend: changePct > 1 ? "up" : changePct < -1 ? "down" : "flat",
  };
}

export function aggregateMarketLiquidity(snapshots: LiquiditySnapshot[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const snapshot of snapshots) {
    totals.set(snapshot.marketId, (totals.get(snapshot.marketId) ?? 0) + snapshot.tvlUsd);
  }
  return totals;
}
