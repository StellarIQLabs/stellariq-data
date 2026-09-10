// Multi-hop route discovery: evaluates XLM -> EURC -> USDC style intermediate
// hops and compares combined output against direct routes.
import type { PoolLiquidity, Route } from "./types.js";
import { findDirectRoutes } from "./direct.js";

export function findMultihopRoutes(
  inputAsset: string,
  outputAsset: string,
  inputAmount: number,
  pools: PoolLiquidity[],
  maxIntermediates = 4,
): Route[] {
  const intermediates = new Set<string>();
  for (const pool of pools) {
    if (pool.tokenA !== inputAsset && pool.tokenB !== inputAsset) continue;
    intermediates.add(pool.tokenA === inputAsset ? pool.tokenB : pool.tokenA);
  }
  const routes: Route[] = [];
  const candidates = [...intermediates].filter((a) => a !== outputAsset).slice(0, maxIntermediates);
  for (const middle of candidates) {
    const firstLegs = findDirectRoutes(inputAsset, middle, inputAmount, pools);
    for (const first of firstLegs.slice(0, 2)) {
      const secondLegs = findDirectRoutes(middle, outputAsset, Number(first.outputAmount), pools);
      for (const second of secondLegs.slice(0, 2)) {
        routes.push({
          id: `multihop:${first.legs[0]?.protocol}+${second.legs[0]?.protocol}:${middle}`,
          legs: [...first.legs, ...second.legs],
          inputAmount: String(inputAmount),
          outputAmount: second.outputAmount,
          totalFeeBps: first.totalFeeBps + second.totalFeeBps,
          priceImpactPct: "0",
          netOutput: second.outputAmount,
        });
      }
    }
  }
  return routes.sort((a, b) => Number(b.outputAmount) - Number(a.outputAmount));
}
