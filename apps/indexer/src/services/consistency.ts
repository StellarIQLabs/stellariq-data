// Data consistency checks: scheduled jobs comparing indexed TVL/volume against
// on-chain state and reporting drift.
export interface ConsistencyInput {
  poolId: string;
  indexedTvlUsd: number;
  onchainTvlUsd: number;
  indexedVolume24hUsd: number;
  onchainVolume24hUsd: number;
}

export interface ConsistencyReport {
  poolId: string;
  tvlDriftPct: number | null;
  volumeDriftPct: number | null;
  healthy: boolean;
  checkedAt: string;
}

export function driftPct(indexed: number, onchain: number): number | null {
  if (onchain <= 0) return null;
  return ((indexed - onchain) / onchain) * 100;
}

export function checkConsistency(input: ConsistencyInput, maxDriftPct = 2): ConsistencyReport {
  const tvlDriftPct = driftPct(input.indexedTvlUsd, input.onchainTvlUsd);
  const volumeDriftPct = driftPct(input.indexedVolume24hUsd, input.onchainVolume24hUsd);
  const healthy =
    (tvlDriftPct === null || Math.abs(tvlDriftPct) <= maxDriftPct) &&
    (volumeDriftPct === null || Math.abs(volumeDriftPct) <= maxDriftPct);
  return { poolId: input.poolId, tvlDriftPct, volumeDriftPct, healthy, checkedAt: new Date().toISOString() };
}

export function summarizeReports(reports: ConsistencyReport[]): { healthy: number; drifted: number } {
  return {
    healthy: reports.filter((r) => r.healthy).length,
    drifted: reports.filter((r) => !r.healthy).length,
  };
}
