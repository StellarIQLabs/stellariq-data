// HTTP contract served to stellariq-app (its RemoteDataSource consumes these
// shapes). Kept in sync with @stellariq/types in the app repo; duplicated here
// by necessity because the two repos do not share a package.

export type Protocol = "stellar-dex" | "soroswap" | "phoenix" | "aqua";
export type Timeframe = "1H" | "4H" | "1D" | "1W" | "1M";
export type VerificationStatus = "verified" | "unverified" | "suspicious";

export interface Paged<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export interface Asset {
  id: string;
  code: string;
  issuer: string | null;
  name: string;
  decimals: number;
  verificationStatus: VerificationStatus;
  createdAt: string;
  price?: number;
  volume24h?: number;
  liquidity?: number;
}

export interface AssetWithMarket extends Asset {
  priceChange24h?: number;
  markets?: string[];
}

export interface Market {
  id: string;
  baseAsset: string;
  quoteAsset: string;
  protocol: Protocol;
  poolId: string;
  price?: number;
  priceChange24h?: number;
  volume24h?: number;
  liquidity?: number;
  trades24h?: number;
  spread?: number;
}

export interface MarketSource {
  protocol: Protocol;
  poolId: string;
  price: number;
  liquidity: number;
  volume24h: number;
}

export interface AggregatedMarket extends Omit<Market, "protocol" | "poolId"> {
  sources: MarketSource[];
}

export interface Pool {
  id: string;
  protocol: Protocol;
  tokenA: string;
  tokenB: string;
  reserveA: number;
  reserveB: number;
  tvl: number;
  fee: number;
  volume24h?: number;
  volumeTvlRatio?: number;
  liquidityChange7d?: number;
  tradeCount24h?: number;
  estimatedPriceImpact?: number;
}

export interface Swap {
  id: string;
  transactionHash: string;
  protocol: Protocol;
  pool: string;
  user: string;
  inputAsset: string;
  outputAsset: string;
  inputAmount: number;
  outputAmount: number;
  timestamp: number;
  isLarge?: boolean;
}

export interface Price {
  asset: string;
  price: number;
  currency: string;
  timestamp: number;
  sources: number;
  confidence: number;
}

export interface OhlcvCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SeriesPoint {
  timestamp: number;
  value: number;
}

export interface PoolReserve {
  poolId: string;
  protocol: Protocol;
  reserveA: number;
  reserveB: number;
  fee: number;
}
