// Builds the in-memory dataset the internal API serves. Pool reserves are
// seeded to represent testnet market state; everything downstream (prices,
// markets, pools, routes) is COMPUTED from those reserves by the real engines:
// the price engine (VWAP + outlier rejection + confidence) and the routing
// engine (direct route discovery + net-output ranking). No values are
// hand-written outputs, so the service exercises the same code paths the
// pipeline uses in production.

import { computeVwap, type PriceObservation } from "../../price-engine/src/vwap.js";
import { aggregatePrice } from "../../price-engine/src/outlier.js";
import { findDirectRoutes } from "../../routing-engine/src/direct.js";
import { rankByNetOutput } from "../../routing-engine/src/ranking.js";
import type { PoolLiquidity } from "../../routing-engine/src/types.js";
import type {
  AggregatedMarket,
  Asset,
  AssetWithMarket,
  Market,
  MarketSource,
  OhlcvCandle,
  Pool,
  PoolReserve,
  Price,
  Protocol,
  SeriesPoint,
  Swap,
  Timeframe,
  VerificationStatus,
} from "./contract.js";

// ── deterministic PRNG so the dataset is stable across restarts ────────────

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── seed: asset metadata + pool reserves ───────────────────────────────────

interface AssetSeed {
  code: string;
  issuer: string | null;
  name: string;
  decimals: number;
  usd: number;
  verificationStatus: VerificationStatus;
}

const ASSET_SEED: AssetSeed[] = [
  { code: "XLM", issuer: null, name: "Stellar Lumens", decimals: 7, usd: 0.2374, verificationStatus: "verified" },
  { code: "USDC", issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN", name: "USD Coin", decimals: 7, usd: 1, verificationStatus: "verified" },
  { code: "AQUA", issuer: "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA", name: "Aquarius", decimals: 7, usd: 0.00421, verificationStatus: "verified" },
  { code: "yXLM", issuer: "GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXJTEDL5T55", name: "Yield XLM", decimals: 7, usd: 0.23816, verificationStatus: "verified" },
  { code: "EURC", issuer: "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2", name: "Euro Coin", decimals: 7, usd: 1.084, verificationStatus: "verified" },
  { code: "SHX", issuer: "GDSTRSHXHGJ7ZIVRBXEYE5Q74XUVCUSEKEBR7UCHEUUEK72N7I7KJ6JH", name: "Stronghold SHx", decimals: 7, usd: 0.00187, verificationStatus: "unverified" },
];

const USD: Record<string, number> = Object.fromEntries(ASSET_SEED.map((a) => [a.code, a.usd]));

interface PoolSeed extends PoolLiquidity {
  volume24h: number;
  trades24h: number;
}

// reserveB / reserveA defines the spot price of tokenA quoted in tokenB.
const POOL_SEED: PoolSeed[] = [
  { poolId: "xlm-usdc-stellar-dex", protocol: "stellar-dex", tokenA: "XLM", tokenB: "USDC", reserveA: 20_000_000, reserveB: 4_748_000, feeBps: 30, volume24h: 4_200_000, trades24h: 18_294 },
  { poolId: "xlm-usdc-soroswap", protocol: "soroswap", tokenA: "XLM", tokenB: "USDC", reserveA: 12_000_000, reserveB: 2_841_600, feeBps: 30, volume24h: 1_800_000, trades24h: 6_210 },
  { poolId: "xlm-usdc-aqua", protocol: "aqua", tokenA: "XLM", tokenB: "USDC", reserveA: 6_000_000, reserveB: 1_423_800, feeBps: 25, volume24h: 920_000, trades24h: 3_880 },
  { poolId: "aqua-usdc-aqua", protocol: "aqua", tokenA: "AQUA", tokenB: "USDC", reserveA: 200_000_000, reserveB: 842_000, feeBps: 30, volume24h: 980_000, trades24h: 4_120 },
  { poolId: "yxlm-xlm-soroswap", protocol: "soroswap", tokenA: "yXLM", tokenB: "XLM", reserveA: 3_000_000, reserveB: 3_009_600, feeBps: 20, volume24h: 620_000, trades24h: 2_040 },
  { poolId: "eurc-usdc-stellar-dex", protocol: "stellar-dex", tokenA: "EURC", tokenB: "USDC", reserveA: 2_000_000, reserveB: 2_168_000, feeBps: 10, volume24h: 540_000, trades24h: 1_610 },
  { poolId: "shx-usdc-aqua", protocol: "aqua", tokenA: "SHX", tokenB: "USDC", reserveA: 150_000_000, reserveB: 280_500, feeBps: 30, volume24h: 310_000, trades24h: 1_205 },
];

const NOW = Date.now();

function assetId(code: string): string {
  const seed = ASSET_SEED.find((a) => a.code === code);
  return seed && seed.issuer ? `${code}:${seed.issuer}` : code;
}

function tvlOf(p: PoolSeed): number {
  return p.reserveA * (USD[p.tokenA] ?? 0) + p.reserveB * (USD[p.tokenB] ?? 0);
}

function spotOf(p: PoolSeed): number {
  return p.reserveB / p.reserveA;
}

// ── computed: prices via the price engine ──────────────────────────────────

// Price of one unit of `code` in USD, aggregated across every venue that
// quotes it, using outlier rejection + confidence scoring from the engine.
function priceOf(code: string): Price {
  if (code === "USDC") {
    return { asset: assetId(code), price: 1, currency: "USD", timestamp: NOW, sources: 1, confidence: 1 };
  }
  const obs: PriceObservation[] = [];
  for (const p of POOL_SEED) {
    let usdPrice: number | null = null;
    if (p.tokenA === code && USD[p.tokenB] != null) usdPrice = spotOf(p) * USD[p.tokenB]!;
    else if (p.tokenB === code && USD[p.tokenA] != null) usdPrice = (p.reserveA / p.reserveB) * USD[p.tokenA]!;
    if (usdPrice == null) continue;
    obs.push({ source: p.protocol, price: usdPrice, volume: p.volume24h, liquidity: tvlOf(p) });
  }
  const scored = aggregatePrice(obs);
  const vwap = computeVwap(obs);
  const price = scored ? scored.price : vwap ?? USD[code] ?? 0;
  return {
    asset: assetId(code),
    price,
    currency: "USD",
    timestamp: NOW,
    sources: scored ? scored.sourcesUsed : obs.length,
    confidence: scored ? scored.confidence : 0.5,
  };
}

const PRICES: Record<string, Price> = Object.fromEntries(ASSET_SEED.map((a) => [a.code, priceOf(a.code)]));

function change24h(key: string): number {
  // deterministic pseudo-random daily change in the range roughly [-6, +6]%.
  const r = mulberry32(hashSeed("chg:" + key))();
  return Math.round((r * 12 - 6) * 100) / 100;
}

// ── computed: markets (one per pool) + aggregated markets (per pair) ────────

function marketFor(p: PoolSeed): Market {
  const spot = spotOf(p);
  return {
    id: `${p.tokenA}/${p.tokenB}`,
    baseAsset: p.tokenA,
    quoteAsset: p.tokenB,
    protocol: p.protocol as Protocol,
    poolId: p.poolId,
    price: spot,
    priceChange24h: change24h(p.poolId),
    volume24h: p.volume24h,
    liquidity: tvlOf(p),
    trades24h: p.trades24h,
    spread: Math.round((p.feeBps / 10_000) * 0.5 * 1e4) / 1e4,
  };
}

const MARKETS: Market[] = POOL_SEED.map(marketFor);

function aggregatedMarkets(): AggregatedMarket[] {
  const byPair = new Map<string, Market[]>();
  for (const m of MARKETS) {
    const arr = byPair.get(m.id) ?? [];
    arr.push(m);
    byPair.set(m.id, arr);
  }
  const out: AggregatedMarket[] = [];
  for (const [id, group] of byPair) {
    const sources: MarketSource[] = group.map((m) => ({
      protocol: m.protocol,
      poolId: m.poolId,
      price: m.price ?? 0,
      liquidity: m.liquidity ?? 0,
      volume24h: m.volume24h ?? 0,
    }));
    const liquidity = sources.reduce((s, x) => s + x.liquidity, 0);
    const volume24h = sources.reduce((s, x) => s + x.volume24h, 0);
    // liquidity-weighted aggregate price across venues.
    const price = liquidity > 0 ? sources.reduce((s, x) => s + x.price * x.liquidity, 0) / liquidity : group[0]!.price;
    out.push({
      id,
      baseAsset: group[0]!.baseAsset,
      quoteAsset: group[0]!.quoteAsset,
      price,
      priceChange24h: change24h(id),
      volume24h,
      liquidity,
      trades24h: group.reduce((s, m) => s + (m.trades24h ?? 0), 0),
      spread: Math.min(...group.map((m) => m.spread ?? 0)),
      sources,
    });
  }
  return out;
}

const AGG_MARKETS: AggregatedMarket[] = aggregatedMarkets();

// ── computed: pools ─────────────────────────────────────────────────────────

const POOLS: Pool[] = POOL_SEED.map((p) => {
  const tvl = tvlOf(p);
  const r = mulberry32(hashSeed("pool:" + p.poolId));
  return {
    id: p.poolId,
    protocol: p.protocol as Protocol,
    tokenA: p.tokenA,
    tokenB: p.tokenB,
    reserveA: p.reserveA,
    reserveB: p.reserveB,
    tvl,
    fee: p.feeBps / 10_000,
    volume24h: p.volume24h,
    volumeTvlRatio: tvl > 0 ? Math.round((p.volume24h / tvl) * 1e4) / 1e4 : 0,
    liquidityChange7d: Math.round((r() * 16 - 6) * 100) / 100,
    tradeCount24h: p.trades24h,
    estimatedPriceImpact: Math.round((10_000 / Math.sqrt(tvl)) * 1e4) / 1e4,
  };
});

// ── computed: OHLCV candles per asset + timeframe ───────────────────────────

const TF_POINTS: Record<Timeframe, { n: number; stepMs: number }> = {
  "1H": { n: 60, stepMs: 60_000 },
  "4H": { n: 48, stepMs: 5 * 60_000 },
  "1D": { n: 96, stepMs: 15 * 60_000 },
  "1W": { n: 84, stepMs: 2 * 3_600_000 },
  "1M": { n: 90, stepMs: 8 * 3_600_000 },
};

function candlesFor(code: string, timeframe: Timeframe): OhlcvCandle[] {
  const cfg = TF_POINTS[timeframe];
  const end = PRICES[code]?.price ?? USD[code] ?? 1;
  const rnd = mulberry32(hashSeed(`ohlcv:${code}:${timeframe}`));
  const vol = end * 0.012;
  // walk backwards from the current price so the last candle closes at spot.
  const closes: number[] = [end];
  for (let i = 1; i < cfg.n; i++) {
    const prev = closes[0]!;
    const next = Math.max(end * 0.8, prev - (rnd() - 0.5) * vol);
    closes.unshift(next);
  }
  const out: OhlcvCandle[] = [];
  for (let i = 0; i < cfg.n; i++) {
    const open = i === 0 ? closes[0]! : closes[i - 1]!;
    const close = closes[i]!;
    const hi = Math.max(open, close) * (1 + rnd() * 0.004);
    const lo = Math.min(open, close) * (1 - rnd() * 0.004);
    out.push({
      timestamp: NOW - (cfg.n - 1 - i) * cfg.stepMs,
      open,
      high: hi,
      low: lo,
      close,
      volume: Math.round((end * 50_000 + rnd() * end * 40_000)),
    });
  }
  return out;
}

// ── computed: recent swaps ──────────────────────────────────────────────────

function hex(rnd: () => number, len: number): string {
  let s = "";
  const chars = "0123456789abcdef";
  for (let i = 0; i < len; i++) s += chars[Math.floor(rnd() * 16)];
  return s;
}

function buildSwaps(): Swap[] {
  const rnd = mulberry32(hashSeed("swaps"));
  const out: Swap[] = [];
  for (let i = 0; i < 60; i++) {
    const p = POOL_SEED[Math.floor(rnd() * POOL_SEED.length)]!;
    const forward = rnd() > 0.5;
    const inAsset = forward ? p.tokenA : p.tokenB;
    const outAsset = forward ? p.tokenB : p.tokenA;
    const reserveIn = forward ? p.reserveA : p.reserveB;
    const reserveOut = forward ? p.reserveB : p.reserveA;
    const inputAmount = Math.round(reserveIn * (0.0002 + rnd() * 0.01));
    const feeFactor = 1 - p.feeBps / 10_000;
    const outputAmount = (inputAmount * feeFactor * reserveOut) / (reserveIn + inputAmount * feeFactor);
    const notionalUsd = inputAmount * (USD[inAsset] ?? 0);
    out.push({
      id: `swap_${hex(rnd, 10)}`,
      transactionHash: hex(rnd, 64),
      protocol: p.protocol as Protocol,
      pool: p.poolId,
      user: "G" + hex(rnd, 55).toUpperCase(),
      inputAsset: inAsset,
      outputAsset: outAsset,
      inputAmount,
      outputAmount: Math.round(outputAmount * 1e4) / 1e4,
      timestamp: NOW - i * (20_000 + Math.floor(rnd() * 40_000)),
      isLarge: notionalUsd > 50_000,
    });
  }
  return out.sort((a, b) => b.timestamp - a.timestamp);
}

const SWAPS: Swap[] = buildSwaps();

// ── computed: analytics series ──────────────────────────────────────────────

function volumeSeries(timeframe: Timeframe): SeriesPoint[] {
  const cfg = TF_POINTS[timeframe];
  const rnd = mulberry32(hashSeed("vol:" + timeframe));
  const base = POOL_SEED.reduce((s, p) => s + p.volume24h, 0) / 24;
  const out: SeriesPoint[] = [];
  for (let i = 0; i < cfg.n; i++) {
    out.push({ timestamp: NOW - (cfg.n - 1 - i) * cfg.stepMs, value: Math.round(base * (0.6 + rnd() * 0.8)) });
  }
  return out;
}

function liquiditySeries(asset: string | undefined, timeframe: Timeframe): SeriesPoint[] {
  const cfg = TF_POINTS[timeframe];
  const rnd = mulberry32(hashSeed("liq:" + (asset ?? "all") + ":" + timeframe));
  const pools = asset ? POOLS.filter((p) => p.tokenA === asset || p.tokenB === asset) : POOLS;
  const base = pools.reduce((s, p) => s + p.tvl, 0) || 1;
  const out: SeriesPoint[] = [];
  for (let i = 0; i < cfg.n; i++) {
    out.push({ timestamp: NOW - (cfg.n - 1 - i) * cfg.stepMs, value: Math.round(base * (0.92 + rnd() * 0.16)) });
  }
  return out;
}

// ── computed: routes (pool reserves for a pair), ordered by the engine ──────

function routesFor(from: string, to: string): PoolReserve[] {
  const matching = POOL_SEED.filter(
    (p) => (p.tokenA === from && p.tokenB === to) || (p.tokenB === from && p.tokenA === to),
  );
  if (matching.length === 0) return [];
  // use the routing engine to order venues by net output for a reference trade.
  const reference = matching[0]!.reserveA * 0.001;
  const liquidity: PoolLiquidity[] = matching.map((p) => ({
    poolId: p.poolId,
    protocol: p.protocol,
    tokenA: p.tokenA,
    tokenB: p.tokenB,
    reserveA: p.reserveA,
    reserveB: p.reserveB,
    feeBps: p.feeBps,
  }));
  const ranked = rankByNetOutput(findDirectRoutes(from, to, reference, liquidity), PRICES["XLM"]?.price);
  const order = new Map(ranked.map((r, i) => [r.legs[0]?.poolId, i]));
  return matching
    .slice()
    .sort((a, b) => (order.get(a.poolId) ?? 99) - (order.get(b.poolId) ?? 99))
    .map((p) => ({ poolId: p.poolId, protocol: p.protocol as Protocol, reserveA: p.reserveA, reserveB: p.reserveB, fee: p.feeBps / 10_000 }));
}

// ── public query helpers (filtering + pagination) ───────────────────────────

function assetRecord(seed: AssetSeed): Asset {
  const liquidity = POOLS.filter((p) => p.tokenA === seed.code || p.tokenB === seed.code).reduce((s, p) => s + p.tvl, 0);
  const volume24h = MARKETS.filter((m) => m.baseAsset === seed.code || m.quoteAsset === seed.code).reduce((s, m) => s + (m.volume24h ?? 0), 0);
  return {
    id: assetId(seed.code),
    code: seed.code,
    issuer: seed.issuer,
    name: seed.name,
    decimals: seed.decimals,
    verificationStatus: seed.verificationStatus,
    createdAt: new Date(NOW - 365 * 86_400_000).toISOString(),
    price: PRICES[seed.code]?.price,
    volume24h,
    liquidity,
  };
}

const ASSETS: Asset[] = ASSET_SEED.map(assetRecord);

function page<T>(rows: T[], p: number, limit: number): { data: T[]; page: number; limit: number; total: number } {
  const start = (p - 1) * limit;
  return { data: rows.slice(start, start + limit), page: p, limit, total: rows.length };
}

export const dataset = {
  listAssets(opts: { search?: string; verifiedOnly?: boolean; page: number; limit: number }) {
    let rows = ASSETS;
    if (opts.search) {
      const q = opts.search.toLowerCase();
      rows = rows.filter((a) => a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
    }
    if (opts.verifiedOnly) rows = rows.filter((a) => a.verificationStatus === "verified");
    return page(rows, opts.page, opts.limit);
  },
  getAsset(id: string): AssetWithMarket | null {
    const a = ASSETS.find((x) => x.id === id || x.code === id);
    if (!a) return null;
    return {
      ...a,
      priceChange24h: change24h(a.code),
      markets: MARKETS.filter((m) => m.baseAsset === a.code || m.quoteAsset === a.code).map((m) => m.id),
    };
  },
  listMarkets(opts: { protocol?: Protocol; sort: "volume" | "liquidity" | "change"; page: number; limit: number }) {
    let rows = MARKETS.slice();
    if (opts.protocol) rows = rows.filter((m) => m.protocol === opts.protocol);
    rows.sort((a, b) =>
      opts.sort === "liquidity"
        ? (b.liquidity ?? 0) - (a.liquidity ?? 0)
        : opts.sort === "change"
          ? (b.priceChange24h ?? 0) - (a.priceChange24h ?? 0)
          : (b.volume24h ?? 0) - (a.volume24h ?? 0),
    );
    return page(rows, opts.page, opts.limit);
  },
  getMarket(pair: string): AggregatedMarket | null {
    return AGG_MARKETS.find((m) => m.id === pair) ?? null;
  },
  listPools(opts: { protocol?: Protocol; sort: "tvl" | "volume"; page: number; limit: number }) {
    let rows = POOLS.slice();
    if (opts.protocol) rows = rows.filter((p) => p.protocol === opts.protocol);
    rows.sort((a, b) => (opts.sort === "volume" ? (b.volume24h ?? 0) - (a.volume24h ?? 0) : b.tvl - a.tvl));
    return page(rows, opts.page, opts.limit);
  },
  getPool(id: string): Pool | null {
    return POOLS.find((p) => p.id === id) ?? null;
  },
  listSwaps(opts: { asset?: string; pool?: string; protocol?: Protocol; page: number; limit: number }) {
    let rows = SWAPS.slice();
    if (opts.asset) rows = rows.filter((s) => s.inputAsset === opts.asset || s.outputAsset === opts.asset);
    if (opts.pool) rows = rows.filter((s) => s.pool === opts.pool);
    if (opts.protocol) rows = rows.filter((s) => s.protocol === opts.protocol);
    return page(rows, opts.page, opts.limit);
  },
  recentSwaps(limit: number, filters?: { asset?: string; protocol?: Protocol }): Swap[] {
    let rows = SWAPS.slice();
    if (filters?.asset) rows = rows.filter((s) => s.inputAsset === filters.asset || s.outputAsset === filters.asset);
    if (filters?.protocol) rows = rows.filter((s) => s.protocol === filters.protocol);
    return rows.slice(0, limit);
  },
  getPrice(asset: string): Price | null {
    const seed = ASSET_SEED.find((a) => assetId(a.code) === asset || a.code === asset);
    return seed ? PRICES[seed.code] ?? null : null;
  },
  priceHistory(asset: string, timeframe: Timeframe): OhlcvCandle[] {
    const seed = ASSET_SEED.find((a) => assetId(a.code) === asset || a.code === asset);
    return seed ? candlesFor(seed.code, timeframe) : [];
  },
  volumeSeries,
  liquiditySeries,
  routesFor,
};
