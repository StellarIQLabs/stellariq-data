// Price impact + slippage estimation: models execution cost from reserves and
// liquidity so quotes reflect real execution.
import type { PoolLiquidity, Route } from "./types.js";

export interface ImpactEstimate {
  priceImpactPct: number;
  slippagePct: number;
  executionPrice: number;
  spotPrice: number;
}

export function estimateLegImpact(
  pool: PoolLiquidity,
  inputAsset: string,
  inputAmount: number,
  outputAmount: number,
): ImpactEstimate {
  const forward = pool.tokenA === inputAsset;
  const reserveIn = forward ? pool.reserveA : pool.reserveB;
  const reserveOut = forward ? pool.reserveB : pool.reserveA;
  const spotPrice = reserveIn > 0 ? reserveOut / reserveIn : 0;
  const executionPrice = inputAmount > 0 ? outputAmount / inputAmount : 0;
  const priceImpactPct = spotPrice > 0 ? ((spotPrice - executionPrice) / spotPrice) * 100 : 0;
  const depthRatio = reserveIn > 0 ? inputAmount / reserveIn : 0;
  const slippagePct = depthRatio * 100 * 0.5;
  return { priceImpactPct, slippagePct, executionPrice, spotPrice };
}

export function applyImpactEstimates(route: Route, pools: PoolLiquidity[]): Route {
  let worstImpact = 0;
  const legs = route.legs.map((leg) => {
    const pool = pools.find((p) => p.poolId === leg.poolId);
    if (!pool) return leg;
    const estimate = estimateLegImpact(pool, leg.inputAsset, Number(leg.inputAmount), Number(leg.outputAmount));
    worstImpact = Math.max(worstImpact, estimate.priceImpactPct);
    return { ...leg, priceImpactPct: estimate.priceImpactPct.toFixed(4) };
  });
  return { ...route, legs, priceImpactPct: worstImpact.toFixed(4) };
}
