// Direct route discovery: finds single-pool routes for a pair across protocols.
import type { PoolLiquidity, Route } from "./types.js";

export function findDirectRoutes(
  inputAsset: string,
  outputAsset: string,
  inputAmount: number,
  pools: PoolLiquidity[],
): Route[] {
  const routes: Route[] = [];
  for (const pool of pools) {
    const forward = pool.tokenA === inputAsset && pool.tokenB === outputAsset;
    const backward = pool.tokenB === inputAsset && pool.tokenA === outputAsset;
    if (!forward && !backward) continue;
    const reserveIn = forward ? pool.reserveA : pool.reserveB;
    const reserveOut = forward ? pool.reserveB : pool.reserveA;
    if (!(reserveIn > 0) || !(reserveOut > 0) || !(inputAmount > 0)) continue;
    const feeFactor = 1 - pool.feeBps / 10_000;
    const output = ((inputAmount * feeFactor) * reserveOut) / (reserveIn + inputAmount * feeFactor);
    routes.push({
      id: `direct:${pool.protocol}:${pool.poolId}`,
      legs: [
        {
          poolId: pool.poolId,
          protocol: pool.protocol,
          inputAsset,
          outputAsset,
          inputAmount: String(inputAmount),
          outputAmount: String(output),
          feeBps: pool.feeBps,
          priceImpactPct: "0",
        },
      ],
      inputAmount: String(inputAmount),
      outputAmount: String(output),
      totalFeeBps: pool.feeBps,
      priceImpactPct: "0",
      netOutput: String(output),
    });
  }
  return routes.sort((a, b) => Number(b.outputAmount) - Number(a.outputAmount));
}
