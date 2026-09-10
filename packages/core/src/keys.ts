// Redis cache key layout + TTLs. Reads hit cache first so the API stays fast;
// writers invalidate on every indexed update.
export const CACHE_TTLS = {
  price: 15,
  market: 30,
  pool: 30,
  candles: 300,
  quote: 10,
} as const;

export const cacheKeys = {
  price: (assetId: string, currency = "USD"): string => `price:${currency}:${assetId}`,
  market: (marketId: string): string => `market:${marketId}`,
  pool: (poolId: string): string => `pool:${poolId}`,
  candles: (marketId: string, timeframe: string): string => `candles:${marketId}:${timeframe}`,
  quote: (input: string, output: string, amount: string): string =>
    `quote:${input}:${output}:${amount}`,
};

export async function cached<T>(
  cache: { get<U>(key: string): Promise<U | null>; set<U>(key: string, value: U, ttl: number): Promise<void> },
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const hit = await cache.get<T>(key);
  if (hit !== null) return hit;
  const value = await loader();
  await cache.set(key, value, ttlSeconds);
  return value;
}
