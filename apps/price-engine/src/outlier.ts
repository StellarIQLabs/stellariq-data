// Outlier detection + confidence scoring: filters anomalous source prices and
// emits a confidence value between zero and one.
import type { PriceObservation } from "./vwap.js";

export interface ScoredPrice {
  price: number;
  confidence: number;
  sourcesUsed: number;
  sourcesRejected: number;
}

export function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] as number;
  return ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

export function filterOutliers(
  observations: PriceObservation[],
  maxDeviationPct = 5,
): { kept: PriceObservation[]; rejected: PriceObservation[] } {
  if (observations.length === 0) return { kept: [], rejected: [] };
  const median = medianOf(observations.map((o) => o.price));
  const kept: PriceObservation[] = [];
  const rejected: PriceObservation[] = [];
  for (const obs of observations) {
    const deviationPct = median > 0 ? (Math.abs(obs.price - median) / median) * 100 : 0;
    if (deviationPct <= maxDeviationPct) kept.push(obs);
    else rejected.push(obs);
  }
  return { kept, rejected };
}

export function scoreConfidence(kept: PriceObservation[], rejectedCount: number): number {
  if (kept.length === 0) return 0;
  const total = kept.length + rejectedCount;
  const agreement = kept.length / total;
  const distinctSources = new Set(kept.map((o) => o.source)).size;
  const sourceBonus = Math.min(distinctSources / 5, 1) * 0.2;
  return Math.max(0, Math.min(1, agreement * 0.8 + sourceBonus));
}

export function aggregatePrice(observations: PriceObservation[]): ScoredPrice | null {
  const { kept, rejected } = filterOutliers(observations);
  if (kept.length === 0) return null;
  let weightedSum = 0;
  let totalVolume = 0;
  for (const obs of kept) {
    weightedSum += obs.price * Math.max(obs.volume, 0);
    totalVolume += Math.max(obs.volume, 0);
  }
  const price = totalVolume > 0 ? weightedSum / totalVolume : medianOf(kept.map((o) => o.price));
  return {
    price,
    confidence: scoreConfidence(kept, rejected.length),
    sourcesUsed: kept.length,
    sourcesRejected: rejected.length,
  };
}
