// Trading volume analytics: 24h volume, trade counts and volume history for
// assets, markets and pools.
export interface TradeRecord {
  assetId?: string;
  marketId?: string;
  poolId?: string;
  volumeUsd: number;
  timestamp: number;
}

export interface VolumeSummary {
  volume24hUsd: number;
  tradeCount24h: number;
  volumeHistory: Array<{ bucketStart: string; volumeUsd: number }>;
}

const DAY_MS = 86_400_000;
const BUCKET_MS = 3_600_000;

export function summarizeVolume(trades: TradeRecord[], now = Date.now()): VolumeSummary {
  const cutoff = now - DAY_MS;
  const recent = trades.filter((t) => t.timestamp >= cutoff);
  const buckets = new Map<number, number>();
  for (const trade of recent) {
    const bucket = Math.floor(trade.timestamp / BUCKET_MS) * BUCKET_MS;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + trade.volumeUsd);
  }
  return {
    volume24hUsd: recent.reduce((sum, t) => sum + t.volumeUsd, 0),
    tradeCount24h: recent.length,
    volumeHistory: [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([bucket, volumeUsd]) => ({ bucketStart: new Date(bucket).toISOString(), volumeUsd })),
  };
}

export function groupBy<T extends TradeRecord>(trades: TradeRecord[], key: (t: TradeRecord) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const trade of trades) {
    const k = key(trade);
    const list = groups.get(k) ?? [];
    list.push(trade as T);
    groups.set(k, list);
  }
  return groups;
}
