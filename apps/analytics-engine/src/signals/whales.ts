// Large-swap (whale) detection: flags trades above a threshold (e.g. 125,000
// XLM notional) for the feed and signals.
export interface SwapObservation {
  swapId: string;
  protocol: string;
  poolId: string | null;
  amountXlm: number;
  volumeUsd: number;
  occurredAt: string;
}

export interface WhaleSignal {
  type: "large-swap";
  swapId: string;
  protocol: string;
  poolId: string | null;
  amountXlm: number;
  volumeUsd: number;
  detectedAt: string;
}

export const DEFAULT_WHALE_THRESHOLD_XLM = 125_000;

export function detectWhaleSwaps(
  swaps: SwapObservation[],
  thresholdXlm = DEFAULT_WHALE_THRESHOLD_XLM,
): WhaleSignal[] {
  return swaps
    .filter((swap) => swap.amountXlm >= thresholdXlm)
    .map((swap) => ({
      type: "large-swap" as const,
      swapId: swap.swapId,
      protocol: swap.protocol,
      poolId: swap.poolId,
      amountXlm: swap.amountXlm,
      volumeUsd: swap.volumeUsd,
      detectedAt: new Date().toISOString(),
    }));
}
