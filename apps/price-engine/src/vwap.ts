// Volume-weighted average price: the primary pricing method.
export interface PriceObservation {
  source: string;
  price: number;
  volume: number;
  liquidity: number;
}

export function computeVwap(observations: PriceObservation[]): number | null {
  let weightedSum = 0;
  let totalVolume = 0;
  for (const obs of observations) {
    if (!(obs.price > 0) || !(obs.volume >= 0)) continue;
    weightedSum += obs.price * obs.volume;
    totalVolume += obs.volume;
  }
  if (totalVolume <= 0) return null;
  return weightedSum / totalVolume;
}
