// Aquarius AMM adapter (fourth protocol proving modular addability).
// Isolated: no changes to core or other adapters were needed to add it.
import type { DexAdapter, PoolInfo, Quote, QuoteRequest } from "../../adapters/src/adapter.js";
import type { DecodeResult, NormalizedSwap, PoolUpdate, RawEvent } from "../../adapters/src/decoder.js";
import { ignored } from "../../adapters/src/decoder.js";
import { constantProductQuote } from "./math.js";

export class AquariusAdapter implements DexAdapter {
  readonly protocol = "aquarius";
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
    if (event.topics[0] !== "aqua-swap" && !event.contractId.startsWith("aqua")) {
      return ignored("not an aquarius event");
    }
    const data = event.data as Record<string, string>;
    if (event.topics[0] === "aqua-sync") {
      return {
        kind: "pool",
        update: {
          poolId: event.topics[1] ?? event.contractId,
          protocol: this.protocol,
          reserveA: data["reserve_a"] ?? "0",
          reserveB: data["reserve_b"] ?? "0",
          ledger: event.ledger,
        },
      };
    }
    return {
      kind: "swap",
      swap: {
        id: `aquarius:${event.txHash}:${event.ledger}`,
        txHash: event.txHash,
        protocol: this.protocol,
        poolId: event.topics[1] ?? event.contractId,
        userAddress: data["user"] ?? event.topics[2] ?? null,
        inputAsset: AquariusAdapter.parseToken(data["token_in"] ?? ""),
        inputAmount: data["amount_in"] ?? "0",
        outputAsset: AquariusAdapter.parseToken(data["token_out"] ?? ""),
        outputAmount: data["amount_out"] ?? "0",
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
    if (!token || token === "native") return { code: "XLM", issuer: null };
    const [code, issuer] = token.split(":");
    if (!code || !issuer) return { code: token, issuer: null };
    return { code, issuer };
  }
}
