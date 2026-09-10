// Swap indexing: persists every normalized trade from all adapters into Swap
// rows with protocol and pool links.
import type { NormalizedSwap } from "../../../../packages/adapters/src/decoder.js";
import { assetId } from "../../../../packages/adapters/src/adapter.js";

export interface SwapRow {
  id: string;
  txHash: string;
  protocol: string;
  poolId: string | null;
  userAddress: string | null;
  inputAssetId: string;
  inputAmount: string;
  outputAssetId: string;
  outputAmount: string;
  ledger: number | null;
  occurredAt: string;
}

export function swapToRow(swap: NormalizedSwap): SwapRow {
  return {
    id: swap.id,
    txHash: swap.txHash,
    protocol: swap.protocol,
    poolId: swap.poolId,
    userAddress: swap.userAddress,
    inputAssetId: assetId(swap.inputAsset),
    inputAmount: swap.inputAmount,
    outputAssetId: assetId(swap.outputAsset),
    outputAmount: swap.outputAmount,
    ledger: swap.ledger,
    occurredAt: swap.occurredAt,
  };
}

export class SwapIndexer {
  private seen = new Set<string>();

  normalize(swaps: NormalizedSwap[]): SwapRow[] {
    const rows: SwapRow[] = [];
    for (const swap of swaps) {
      if (this.seen.has(swap.id)) continue;
      this.seen.add(swap.id);
      rows.push(swapToRow(swap));
    }
    return rows;
  }
}
