// Horizon trade ingestion: parses classic DEX fills into normalized swaps and
// prices quotes from orderbook depth.
import type { AssetRef } from "../../adapters/src/types.js";
import type { NormalizedSwap } from "../../adapters/src/decoder.js";

export interface HorizonTrade {
  id: string;
  ledger_close_time: string;
  base_account?: string;
  counter_account?: string;
  base_asset_code?: string;
  base_asset_issuer?: string;
  counter_asset_code?: string;
  counter_asset_issuer?: string;
  base_amount: string;
  counter_amount: string;
  base_is_seller?: boolean;
}

export function horizonAsset(code: string | undefined, issuer: string | undefined): AssetRef {
  if (!code || code === "native" || !issuer) return { code: code ?? "XLM", issuer: null };
  return { code, issuer };
}

export function parseHorizonTrade(trade: HorizonTrade, txHash: string, ledger: number): NormalizedSwap {
  const base = horizonAsset(trade.base_asset_code, trade.base_asset_issuer);
  const counter = horizonAsset(trade.counter_asset_code, trade.counter_asset_issuer);
  const baseIsSeller = trade.base_is_seller ?? true;
  return {
    id: `stellar-dex:${trade.id}`,
    txHash,
    protocol: "stellar-dex",
    poolId: null,
    userAddress: baseIsSeller ? trade.base_account ?? null : trade.counter_account ?? null,
    inputAsset: baseIsSeller ? base : counter,
    inputAmount: baseIsSeller ? trade.base_amount : trade.counter_amount,
    outputAsset: baseIsSeller ? counter : base,
    outputAmount: baseIsSeller ? trade.counter_amount : trade.base_amount,
    ledger,
    occurredAt: trade.ledger_close_time,
  };
}

export async function fetchRecentTrades(
  horizonUrl: string,
  base: AssetRef,
  counter: AssetRef,
  limit = 50,
): Promise<HorizonTrade[]> {
  const params = new URLSearchParams({ limit: String(limit), order: "desc" });
  const encode = (prefix: string, asset: AssetRef): void => {
    if (asset.issuer === null) {
      params.set(`${prefix}_asset_type`, "native");
    } else {
      params.set(`${prefix}_asset_type`, "credit_alphanum4");
      params.set(`${prefix}_asset_code`, asset.code);
      params.set(`${prefix}_asset_issuer`, asset.issuer);
    }
  };
  encode("base", base);
  encode("counter", counter);
  const response = await fetch(`${horizonUrl.replace(/\/$/, "")}/trades?${params.toString()}`);
  if (!response.ok) throw new Error(`Horizon trades failed with HTTP ${response.status}`);
  const body = (await response.json()) as { _embedded?: { records?: HorizonTrade[] } };
  return body._embedded?.records ?? [];
}
