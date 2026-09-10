// Liquidity event detection: watches for sharp TVL drops (e.g. -22% in 30m)
// and emits alerts.
export interface TvlObservation {
  poolId: string;
  tvlUsd: number;
  capturedAt: number;
}

export interface LiquidityEventSignal {
  type: "liquidity-event";
  poolId: string;
  dropPct: number;
  windowMinutes: number;
  detectedAt: string;
}

export function detectLiquidityEvents(
  observations: TvlObservation[],
  dropThresholdPct = 22,
  windowMinutes = 30,
): LiquidityEventSignal[] {
  const byPool = new Map<string, TvlObservation[]>();
  for (const obs of observations) {
    const list = byPool.get(obs.poolId) ?? [];
    list.push(obs);
    byPool.set(obs.poolId, list);
  }
  const signals: LiquidityEventSignal[] = [];
  const windowMs = windowMinutes * 60_000;
  for (const [poolId, list] of byPool) {
    const sorted = [...list].sort((a, b) => a.capturedAt - b.capturedAt);
    for (let i = 0; i < sorted.length; i += 1) {
      const start = sorted[i] as TvlObservation;
      if (start.tvlUsd <= 0) continue;
      for (let j = i + 1; j < sorted.length; j += 1) {
        const end = sorted[j] as TvlObservation;
        if (end.capturedAt - start.capturedAt > windowMs) break;
        const dropPct = ((start.tvlUsd - end.tvlUsd) / start.tvlUsd) * 100;
        if (dropPct >= dropThresholdPct) {
          signals.push({
            type: "liquidity-event",
            poolId,
            dropPct,
            windowMinutes,
            detectedAt: new Date(end.capturedAt).toISOString(),
          });
          break;
        }
      }
    }
  }
  return signals;
}
