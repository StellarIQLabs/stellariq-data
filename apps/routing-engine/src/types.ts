// Shared routing engine types.
export interface RouteLeg {
  poolId: string | null;
  protocol: string;
  inputAsset: string;
  outputAsset: string;
  inputAmount: string;
  outputAmount: string;
  feeBps: number;
  priceImpactPct: string;
}

export interface Route {
  id: string;
  legs: RouteLeg[];
  inputAmount: string;
  outputAmount: string;
  totalFeeBps: number;
  priceImpactPct: string;
  netOutput: string;
}

export interface PoolLiquidity {
  poolId: string;
  protocol: string;
  tokenA: string;
  tokenB: string;
  reserveA: number;
  reserveB: number;
  feeBps: number;
}
