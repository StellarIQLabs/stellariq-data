// Explainable route selection: every recommended route ships machine-readable
// reasoning so clients can show why the winner was chosen.
import type { RankedRoute } from "./ranking.js";

export interface RouteExplanation {
  routeId: string;
  rank: number;
  verdict: "recommended" | "alternative";
  reasons: string[];
}

export function explainRoutes(ranked: RankedRoute[]): RouteExplanation[] {
  const best = ranked[0];
  return ranked.map((route) => {
    const reasons: string[] = [];
    if (route.rank === 1) {
      reasons.push(`Highest net output of ${route.netOutput} across ${ranked.length} evaluated routes.`);
    } else if (best) {
      const gap = Number(best.netOutput) - Number(route.netOutput);
      reasons.push(`Net output trails the winner by ${gap.toFixed(6)} (${route.netOutput} vs ${best.netOutput}).`);
    }
    if (route.legs.length > 1) {
      reasons.push(`Multi-leg route across ${route.legs.length} pools; extra hop adds execution risk.`);
    } else {
      reasons.push("Single-pool direct route with minimal execution risk.");
    }
    reasons.push(`Total protocol fee ${route.totalFeeBps} bps; price impact ${route.priceImpactPct}%.`);
    return {
      routeId: route.id,
      rank: route.rank,
      verdict: route.rank === 1 ? "recommended" : "alternative",
      reasons,
    };
  });
}
