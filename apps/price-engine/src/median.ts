// Fallback pricing: median price plus liquidity-weighted blending.
import type { PriceObservation } from "./vwap.js";

export function computeMedian(prices: number[]): number | null {
  const sorted = prices.filter((p) => p > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] as number;
  return ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

export function computeLiquidityWeightedPrice(observations: PriceObservation[]): number | null {
  let weightedSum = 0;
  let totalLiquidity = 0;
  for (const obs of observations) {
    if (!(obs.price > 0) || !(obs.liquidity >= 0)) continue;
    weightedSum += obs.price * obs.liquidity;
    totalLiquidity += obs.liquidity;
  }
  if (totalLiquidity <= 0) return null;
  return weightedSum / totalLiquidity;
}

export function blendPrices(vwap: number | null, median: number | null, liquidity: number | null): number | null {
  const candidates = [vwap, median, liquidity].filter((p): p is number => p !== null && p > 0);
  if (candidates.length === 0) return null;
  return candidates.reduce((sum, p) => sum + p, 0) / candidates.length;
}
