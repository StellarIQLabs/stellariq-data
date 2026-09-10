// Fee accounting + net-output ranking: protocol fees and network fees are
// computed per route, and routes rank by net output — never by lowest fee.
import type { Route } from "./types.js";

export const NETWORK_FEE_XLM = 0.00001;

export interface RankedRoute extends Route {
  protocolFeeUsd: number;
  networkFeeUsd: number;
  rank: number;
}

export function protocolFeeFor(route: Route, inputPriceUsd: number): number {
  void inputPriceUsd;
  const notional = Number(route.inputAmount);
  return (notional * route.totalFeeBps) / 10_000;
}

export function rankByNetOutput(routes: Route[], xlmPriceUsd = 0.2374): RankedRoute[] {
  const networkFeeUsd = NETWORK_FEE_XLM * xlmPriceUsd;
  return [...routes]
    .sort((a, b) => Number(b.netOutput) - Number(a.netOutput))
    .map((route, index) => ({
      ...route,
      protocolFeeUsd: protocolFeeFor(route, 1),
      networkFeeUsd,
      rank: index + 1,
    }));
}
