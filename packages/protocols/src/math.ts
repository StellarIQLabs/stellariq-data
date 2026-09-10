// Shared constant-product AMM math used by Soroswap/Phoenix/Aquarius adapters.
import type { PoolInfo, Quote, QuoteRequest } from "../../adapters/src/adapter.js";
import { assetId } from "../../adapters/src/adapter.js";

export function constantProductQuote(pool: PoolInfo, request: QuoteRequest, protocol: string): Quote | null {
  const inId = assetId(request.inputAsset);
  const outId = assetId(request.outputAsset);
  const aId = assetId(pool.tokenA);
  const bId = assetId(pool.tokenB);
  let reserveIn: number;
  let reserveOut: number;
  if (inId === aId && outId === bId) {
    reserveIn = Number(pool.reserveA);
    reserveOut = Number(pool.reserveB);
  } else if (inId === bId && outId === aId) {
    reserveIn = Number(pool.reserveB);
    reserveOut = Number(pool.reserveA);
  } else {
    return null;
  }
  const amountIn = Number(request.inputAmount);
  if (!(reserveIn > 0) || !(reserveOut > 0) || !(amountIn > 0)) return null;
  const feeFactor = 1 - pool.feeBps / 10_000;
  const amountInWithFee = amountIn * feeFactor;
  const output = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);
  const spot = reserveOut / reserveIn;
  const impact = spot > 0 ? ((spot * amountIn - output) / (spot * amountIn)) * 100 : 0;
  return {
    protocol,
    poolId: pool.id,
    inputAmount: request.inputAmount,
    outputAmount: String(output),
    priceImpactPct: impact.toFixed(4),
    feeBps: pool.feeBps,
  };
}
