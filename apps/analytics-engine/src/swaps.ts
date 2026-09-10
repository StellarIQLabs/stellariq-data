// Swap analytics aggregation: recent swaps, volume by protocol, large swaps.
export interface SwapRecord {
  id: string;
  protocol: string;
  poolId: string | null;
  volumeUsd: number;
  occurredAt: number;
}

export function recentSwaps(swaps: SwapRecord[], limit = 50): SwapRecord[] {
  return [...swaps].sort((a, b) => b.occurredAt - a.occurredAt).slice(0, limit);
}

export function volumeByProtocol(swaps: SwapRecord[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const swap of swaps) {
    totals.set(swap.protocol, (totals.get(swap.protocol) ?? 0) + swap.volumeUsd);
  }
  return totals;
}

export function largeSwaps(swaps: SwapRecord[], thresholdUsd: number): SwapRecord[] {
  return swaps
    .filter((swap) => swap.volumeUsd >= thresholdUsd)
    .sort((a, b) => b.volumeUsd - a.volumeUsd);
}
