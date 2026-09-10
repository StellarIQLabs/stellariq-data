// Pool indexing: tracks every pool's reserves and TVL per protocol, updating
// Pool rows on every ledger close.
import type { PoolInfo } from "../../../../packages/adapters/src/adapter.js";
import type { PoolUpdate } from "../../../../packages/adapters/src/decoder.js";

export interface PoolRow {
  id: string;
  protocol: string;
  tokenAId: string;
  tokenBId: string;
  reserveA: string;
  reserveB: string;
  tvlUsd: string | null;
  feeBps: number;
  updatedLedger: number | null;
}

export function tokenId(token: { code: string; issuer: string | null }): string {
  return token.issuer ? `${token.code}:${token.issuer}` : `${token.code}:native`;
}

export function poolInfoToRow(pool: PoolInfo, ledger: number | null): PoolRow {
  return {
    id: pool.id,
    protocol: pool.protocol,
    tokenAId: tokenId(pool.tokenA),
    tokenBId: tokenId(pool.tokenB),
    reserveA: pool.reserveA,
    reserveB: pool.reserveB,
    tvlUsd: pool.tvlUsd,
    feeBps: pool.feeBps,
    updatedLedger: ledger,
  };
}

export function applyPoolUpdate(row: PoolRow, update: PoolUpdate): PoolRow {
  return {
    ...row,
    reserveA: update.reserveA,
    reserveB: update.reserveB,
    updatedLedger: update.ledger,
  };
}

export class PoolIndexer {
  private rows = new Map<string, PoolRow>();

  upsert(pool: PoolInfo, ledger: number | null): PoolRow {
    const row = poolInfoToRow(pool, ledger);
    this.rows.set(`${pool.protocol}:${pool.id}`, row);
    return row;
  }

  applyUpdate(update: PoolUpdate): PoolRow | null {
    const key = `${update.protocol}:${update.poolId}`;
    const existing = this.rows.get(key);
    if (!existing) return null;
    const next = applyPoolUpdate(existing, update);
    this.rows.set(key, next);
    return next;
  }

  snapshot(): PoolRow[] {
    return [...this.rows.values()];
  }
}
