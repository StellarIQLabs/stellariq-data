// Market indexing: groups pools by (base, quote) into markets and computes
// market-level aggregates (price, volume, liquidity).
import type { PoolInfo } from "../../../../packages/adapters/src/adapter.js";
import { tokenId } from "./pool-indexer.js";

export interface MarketRow {
  id: string;
  baseAssetId: string;
  quoteAssetId: string;
  symbol: string;
  poolCount: number;
  liquidityUsd: string | null;
}

export function marketIdFor(baseAssetId: string, quoteAssetId: string): string {
  return `${baseAssetId}<>${quoteAssetId}`;
}

export function marketSymbolFor(baseAssetId: string, quoteAssetId: string): string {
  const code = (id: string): string => id.split(":")[0] ?? id;
  return `${code(baseAssetId)}/${code(quoteAssetId)}`;
}

export class MarketIndexer {
  aggregate(pools: PoolInfo[]): MarketRow[] {
    const groups = new Map<string, { base: string; quote: string; liquidity: number; count: number }>();
    for (const pool of pools) {
      const a = tokenId(pool.tokenA);
      const b = tokenId(pool.tokenB);
      const [base, quote] = a < b ? [a, b] : [b, a];
      const key = marketIdFor(base, quote);
      const group = groups.get(key) ?? { base, quote, liquidity: 0, count: 0 };
      group.liquidity += Number(pool.tvlUsd ?? 0);
      group.count += 1;
      groups.set(key, group);
    }
    return [...groups.entries()].map(([id, group]) => ({
      id,
      baseAssetId: group.base,
      quoteAssetId: group.quote,
      symbol: marketSymbolFor(group.base, group.quote),
      poolCount: group.count,
      liquidityUsd: group.liquidity > 0 ? String(group.liquidity) : null,
    }));
  }
}
