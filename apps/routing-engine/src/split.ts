// Split-across-pools routing: computes the optimal split of input across
// parallel pools for best net output (marginal-output greedy allocation).
import type { PoolLiquidity, Route } from "./types.js";

function marginalOutput(pool: PoolLiquidity, inputAsset: string, allocated: number): number {
  const forward = pool.tokenA === inputAsset;
  const reserveIn = forward ? pool.reserveA : pool.reserveB;
  const reserveOut = forward ? pool.reserveB : pool.reserveA;
  const feeFactor = 1 - pool.feeBps / 10_000;
  const x = allocated * feeFactor;
  return ((x + 1) * reserveOut) / (reserveIn + x + 1) - (x * reserveOut) / (reserveIn + x);
}

function legOutput(pool: PoolLiquidity, inputAsset: string, amount: number): number {
  const forward = pool.tokenA === inputAsset;
  const reserveIn = forward ? pool.reserveA : pool.reserveB;
  const reserveOut = forward ? pool.reserveB : pool.reserveA;
  const feeFactor = 1 - pool.feeBps / 10_000;
  const x = amount * feeFactor;
  return (x * reserveOut) / (reserveIn + x);
}

export function findSplitRoute(
  inputAsset: string,
  outputAsset: string,
  inputAmount: number,
  pools: PoolLiquidity[],
  steps = 20,
): Route | null {
  const eligible = pools.filter(
    (p) =>
      (p.tokenA === inputAsset && p.tokenB === outputAsset) ||
      (p.tokenB === inputAsset && p.tokenA === outputAsset),
  );
  if (eligible.length < 2 || !(inputAmount > 0)) return null;
  const allocation = new Map<string, number>(eligible.map((p) => [p.poolId, 0]));
  const chunk = inputAmount / steps;
  for (let i = 0; i < steps; i += 1) {
    let best: PoolLiquidity | null = null;
    let bestMarginal = -Infinity;
    for (const pool of eligible) {
      const m = marginalOutput(pool, inputAsset, allocation.get(pool.poolId) ?? 0);
      if (m > bestMarginal) {
        bestMarginal = m;
        best = pool;
      }
    }
    if (!best) break;
    allocation.set(best.poolId, (allocation.get(best.poolId) ?? 0) + chunk);
  }
  let totalOutput = 0;
  const legs: Route["legs"] = [];
  for (const pool of eligible) {
    const amount = allocation.get(pool.poolId) ?? 0;
    if (amount <= 0) continue;
    const output = legOutput(pool, inputAsset, amount);
    totalOutput += output;
    legs.push({
      poolId: pool.poolId,
      protocol: pool.protocol,
      inputAsset,
      outputAsset,
      inputAmount: String(amount),
      outputAmount: String(output),
      feeBps: pool.feeBps,
      priceImpactPct: "0",
    });
  }
  if (legs.length === 0) return null;
  return {
    id: `split:${legs.map((l) => `${l.protocol}:${l.poolId}`).join("+")}`,
    legs,
    inputAmount: String(inputAmount),
    outputAmount: String(totalOutput),
    totalFeeBps: Math.max(...legs.map((l) => l.feeBps)),
    priceImpactPct: "0",
    netOutput: String(totalOutput),
  };
}
