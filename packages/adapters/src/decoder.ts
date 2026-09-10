// Decoder abstraction: turns raw Soroban/Horizon events into normalized
// Swap and PoolUpdate records before protocol-specific adapters handle them.
import type { AssetRef } from "./types.js";

export interface NormalizedSwap {
  id: string;
  txHash: string;
  protocol: string;
  poolId: string | null;
  userAddress: string | null;
  inputAsset: AssetRef;
  inputAmount: string;
  outputAsset: AssetRef;
  outputAmount: string;
  ledger: number | null;
  occurredAt: string;
}

export interface PoolUpdate {
  poolId: string;
  protocol: string;
  reserveA: string;
  reserveB: string;
  ledger: number | null;
}

export type DecodeResult =
  | { kind: "swap"; swap: NormalizedSwap }
  | { kind: "pool"; update: PoolUpdate }
  | { kind: "ignored"; reason: string };

export interface RawEvent {
  contractId: string;
  topics: string[];
  data: unknown;
  ledger: number;
  txHash: string;
}

export interface ProtocolDecoder {
  readonly protocol: string;
  canDecode(event: RawEvent): boolean;
  decode(event: RawEvent): DecodeResult;
}

export function ignored(reason: string): DecodeResult {
  return { kind: "ignored", reason };
}
