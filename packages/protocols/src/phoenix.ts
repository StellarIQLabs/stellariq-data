// Phoenix AMM adapter: XYK pools with configurable fee; swap events carry
// sender/receiver and offer/ask asset amounts with 7-decimal fixed precision.
import type { DexAdapter, PoolInfo, Quote, QuoteRequest } from "../../adapters/src/adapter.js";
import type { DecodeResult, NormalizedSwap, PoolUpdate, RawEvent } from "../../adapters/src/decoder.js";
import { ignored } from "../../adapters/src/decoder.js";
import { constantProductQuote } from "./math.js";

export const PHOENIX_DECIMALS = 7;

export function fromStroops(amount: string, decimals = PHOENIX_DECIMALS): string {
  return String(Number(amount) / 10 ** decimals);
}

export class PhoenixAdapter implements DexAdapter {
  readonly protocol = "phoenix";
  private pools: Map<string, PoolInfo>;

  constructor(pools: PoolInfo[] = []) {
    this.pools = new Map(pools.map((p) => [p.id, p]));
  }

  async getPools(): Promise<PoolInfo[]> {
    return [...this.pools.values()];
  }

  async getPool(poolId: string): Promise<PoolInfo | null> {
    return this.pools.get(poolId) ?? null;
  }

  parseSwap(event: RawEvent): NormalizedSwap | null {
    const decoded = this.decode(event);
    return decoded.kind === "swap" ? decoded.swap : null;
  }

  parsePoolUpdate(event: RawEvent): PoolUpdate | null {
    const decoded = this.decode(event);
    return decoded.kind === "pool" ? decoded.update : null;
  }

  decode(event: RawEvent): DecodeResult {
    if (event.topics[0] !== "phoenix-swap" && !event.contractId.startsWith("phoenix")) {
      return ignored("not a phoenix event");
    }
    const data = event.data as Record<string, string>;
    if (event.topics[0] === "phoenix-provide" || event.topics[0] === "phoenix-sync") {
      return {
        kind: "pool",
        update: {
          poolId: event.topics[1] ?? event.contractId,
          protocol: this.protocol,
          reserveA: fromStroops(data["reserve_a"] ?? "0"),
          reserveB: fromStroops(data["reserve_b"] ?? "0"),
          ledger: event.ledger,
        },
      };
    }
    return {
      kind: "swap",
      swap: {
        id: `phoenix:${event.txHash}:${event.ledger}`,
        txHash: event.txHash,
        protocol: this.protocol,
        poolId: event.topics[1] ?? event.contractId,
        userAddress: data["sender"] ?? event.topics[2] ?? null,
        inputAsset: PhoenixAdapter.parseToken(data["offer_asset"] ?? ""),
        inputAmount: fromStroops(data["offer_amount"] ?? "0"),
        outputAsset: PhoenixAdapter.parseToken(data["ask_asset"] ?? ""),
        outputAmount: fromStroops(data["ask_amount"] ?? "0", Number(data["ask_decimals"] ?? PHOENIX_DECIMALS)),
        ledger: event.ledger,
        occurredAt: new Date().toISOString(),
      },
    };
  }

  async getQuote(request: QuoteRequest): Promise<Quote | null> {
    for (const pool of this.pools.values()) {
      const quote = constantProductQuote(pool, request, this.protocol);
      if (quote) return quote;
    }
    return null;
  }

  static parseToken(token: string): { code: string; issuer: string | null } {
    if (!token || token === "native" || token === "XLM") return { code: "XLM", issuer: null };
    const [code, issuer] = token.split(":");
    if (!code || !issuer) return { code: token, issuer: null };
    return { code, issuer };
  }
}
