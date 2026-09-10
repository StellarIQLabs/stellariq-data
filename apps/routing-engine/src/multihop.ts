// Multi-hop route discovery: evaluates XLM -> EURC -> USDC style intermediate
// hops and compares combined output against direct routes.
import type { PoolLiquidity, Route } from "./types.js";
import { findDirectRoutes } from "./direct.js";

function applyHop(pool: PoolLiquidity, inputAsset: string, amountIn: number): { outputAsset: string; output: number } | null {
  const forward = pool.tokenA === inputAsset;
  const backward = pool.tokenB === inputAsset;
  if (!forward && !backward) return null;
  const reserveIn = forward ? pool.reserveA : pool.reserveB;
  const reserveOut = forward ? pool.reserveB : pool.reserveA;
  if (!(reserveIn > 0) || !(reserveOut > 0) || !(amountIn > 0)) return null;
  const feeFactor = 1 - pool.feeBps / 10_000;
  const output = ((amountIn * feeFactor) * reserveOut) / (reserveIn + amountIn * feeFactor);
  return { outputAsset: forward ? pool.tokenB : pool.tokenA, output };
}

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
      const hop = applyHop(
        pools.find((p) => p.poolId === first.legs[0]?.poolId) as PoolLiquidity,
        inputAsset,
        inputAmount,
      );
      void hop;
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
