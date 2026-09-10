// Historical OHLCV builder: aggregates swaps/prices into 1H 4H 1D 1W 1M
// candles stored for market pages.
export type Timeframe = "1H" | "4H" | "1D" | "1W" | "1M";

export const TIMEFRAME_MS: Record<Timeframe, number> = {
  "1H": 3_600_000,
  "4H": 14_400_000,
  "1D": 86_400_000,
  "1W": 604_800_000,
  "1M": 2_592_000_000,
};

export interface Tick {
  marketId: string;
  price: number;
  volumeUsd: number;
  timestamp: number;
}

export interface CandleRow {
  marketId: string;
  timeframe: Timeframe;
  bucketStart: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volumeUsd: string;
  tradeCount: number;
}

export function bucketStartFor(timestamp: number, timeframe: Timeframe): number {
  const size = TIMEFRAME_MS[timeframe];
  return Math.floor(timestamp / size) * size;
}

export function buildCandles(ticks: Tick[], timeframe: Timeframe): CandleRow[] {
  const buckets = new Map<string, Tick[]>();
  for (const tick of ticks) {
    const key = `${tick.marketId}:${bucketStartFor(tick.timestamp, timeframe)}`;
    const list = buckets.get(key) ?? [];
    list.push(tick);
    buckets.set(key, list);
  }
  const candles: CandleRow[] = [];
  for (const [key, list] of buckets) {
    const sorted = [...list].sort((a, b) => a.timestamp - b.timestamp);
    const first = sorted[0] as Tick;
    const last = sorted[sorted.length - 1] as Tick;
    const prices = sorted.map((t) => t.price);
    const [marketId, bucket] = key.split(":") as [string, string];
    candles.push({
      marketId,
      timeframe,
      bucketStart: new Date(Number(bucket)).toISOString(),
      open: String(first.price),
      high: String(Math.max(...prices)),
      low: String(Math.min(...prices)),
      close: String(last.price),
      volumeUsd: String(sorted.reduce((sum, t) => sum + t.volumeUsd, 0)),
      tradeCount: sorted.length,
    });
  }
  return candles.sort((a, b) => a.bucketStart.localeCompare(b.bucketStart));
}
