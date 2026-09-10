// Stellar classic DEX adapter (orderbook markets via Horizon).
import type { DexAdapter, PoolInfo, Quote, QuoteRequest } from "../../adapters/src/adapter.js";
import type { NormalizedSwap, RawEvent } from "../../adapters/src/decoder.js";
import { assetId } from "../../adapters/src/adapter.js";

export interface HorizonOrderbook {
  base: { asset_code?: string; asset_issuer?: string };
  counter: { asset_code?: string; asset_issuer?: string };
  bids: Array<{ price: string; amount: string }>;
  asks: Array<{ price: string; amount: string }>;
}

export class StellarDexAdapter implements DexAdapter {
  readonly protocol = "stellar-dex";
  private horizonUrl: string;

  constructor(horizonUrl: string) {
    this.horizonUrl = horizonUrl.replace(/\/$/, "");
  }

  private assetParam(prefix: string, code: string, issuer: string | null): string {
    if (issuer === null) return `${prefix}_asset_type=native`;
    return `${prefix}_asset_type=credit_alphanum4&${prefix}_asset_code=${code}&${prefix}_asset_issuer=${issuer}`;
  }

  async getPools(): Promise<PoolInfo[]> {
    // Classic DEX has no pools; orderbook markets are synthesized as pool rows
    // by the market indexer. Returns empty until markets are discovered.
    return [];
  }

  async getPool(poolId: string): Promise<PoolInfo | null> {
    const response = await fetch(`${this.horizonUrl}/liquidity_pools/${poolId}`);
    if (!response.ok) return null;
    const body = (await response.json()) as {
      reserves?: Array<{ asset: string; amount: string }>;
      fee_bp?: number;
    };
    const reserves = body.reserves ?? [];
    if (reserves.length !== 2) return null;
    const [a, b] = reserves as [{ asset: string; amount: string }, { asset: string; amount: string }];
    return {
      id: poolId,
      protocol: this.protocol,
      tokenA: StellarDexAdapter.parsePoolAsset(a.asset),
      tokenB: StellarDexAdapter.parsePoolAsset(b.asset),
      reserveA: a.amount,
      reserveB: b.amount,
      tvlUsd: null,
      feeBps: body.fee_bp ?? 30,
    };
  }

  parseSwap(_event: RawEvent): NormalizedSwap | null {
    // Classic DEX fills arrive via Horizon trade ingestion (see parseTrade).
    return null;
  }

  async getQuote(request: QuoteRequest): Promise<Quote | null> {
    const selling = request.inputAsset.issuer === null ? "selling_asset_type=native" : this.assetParam("selling", request.inputAsset.code, request.inputAsset.issuer);
    const buying = request.outputAsset.issuer === null ? "buying_asset_type=native" : this.assetParam("buying", request.outputAsset.code, request.outputAsset.issuer);
    const response = await fetch(`${this.horizonUrl}/order_book?${selling}&${buying}&limit=20`);
    if (!response.ok) return null;
    const book = (await response.json()) as HorizonOrderbook;
    return StellarDexAdapter.quoteFromOrderbook(assetId(request.inputAsset), book, request.inputAmount, this.protocol);
  }

  static parsePoolAsset(asset: string): { code: string; issuer: string | null } {
    const [code, issuer] = asset.split(":");
    if (!code || code === "native" || !issuer) return { code: code ?? "XLM", issuer: null };
    return { code, issuer };
  }

  static quoteFromOrderbook(
    _base: string,
    book: HorizonOrderbook,
    inputAmount: string,
    protocol: string,
  ): Quote | null {
    const asks = [...book.asks].sort((a, b) => Number(a.price) - Number(b.price));
    let remaining = Number(inputAmount);
    let output = 0;
    for (const ask of asks) {
      const levelAmount = Number(ask.amount);
      const fill = Math.min(remaining, levelAmount);
      output += fill * Number(ask.price);
      remaining -= fill;
      if (remaining <= 0) break;
    }
    if (output <= 0) return null;
    const bestPrice = asks.length > 0 ? Number(asks[0].price) : 0;
    const reference = Number(inputAmount) * bestPrice;
    const impact = reference > 0 ? ((reference - output) / reference) * 100 : 0;
    return {
      protocol,
      poolId: null,
      inputAmount,
      outputAmount: String(output),
      priceImpactPct: impact.toFixed(4),
      feeBps: 0,
    };
  }
}
