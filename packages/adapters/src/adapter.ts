// Shared DexAdapter contract every protocol implementation must satisfy.
import type { AssetRef } from "./types.js";
import type { NormalizedSwap, PoolUpdate, RawEvent } from "./decoder.js";

export interface PoolInfo {
  id: string;
  protocol: string;
  tokenA: AssetRef;
  tokenB: AssetRef;
  reserveA: string;
  reserveB: string;
  tvlUsd: string | null;
  feeBps: number;
}

export interface QuoteRequest {
  inputAsset: AssetRef;
  outputAsset: AssetRef;
  inputAmount: string;
}

export interface Quote {
  protocol: string;
  poolId: string | null;
  inputAmount: string;
  outputAmount: string;
  priceImpactPct: string;
  feeBps: number;
}

export interface DexAdapter {
  readonly protocol: string;
  getPools(): Promise<PoolInfo[]>;
  getPool(poolId: string): Promise<PoolInfo | null>;
  parseSwap(event: RawEvent): NormalizedSwap | null;
  getQuote(request: QuoteRequest): Promise<Quote | null>;
  parsePoolUpdate?(event: RawEvent): PoolUpdate | null;
}

export function assetId(asset: AssetRef): string {
  return asset.issuer ? `${asset.code}:${asset.issuer}` : `${asset.code}:native`;
}
