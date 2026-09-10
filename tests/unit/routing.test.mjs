import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findDirectRoutes } from "../../dist/apps/routing-engine/src/direct.js";
import { findSplitRoute } from "../../dist/apps/routing-engine/src/split.js";
import { rankByNetOutput } from "../../dist/apps/routing-engine/src/ranking.js";
import { explainRoutes } from "../../dist/apps/routing-engine/src/explain.js";

const pools = [
  { poolId: "p1", protocol: "soroswap", tokenA: "XLM:native", tokenB: "USDC:issuer", reserveA: 1_000_000, reserveB: 237_000, feeBps: 30 },
  { poolId: "p2", protocol: "phoenix", tokenA: "XLM:native", tokenB: "USDC:issuer", reserveA: 2_000_000, reserveB: 474_000, feeBps: 30 },
];

describe("routing ranking", () => {
  it("ranks direct routes by net output", () => {
    const routes = findDirectRoutes("XLM:native", "USDC:issuer", 10_000, pools);
    assert.equal(routes.length, 2);
    const ranked = rankByNetOutput(routes);
    assert.equal(ranked[0].rank, 1);
    assert.ok(Number(ranked[0].netOutput) >= Number(ranked[1].netOutput));
  });
  it("split route beats single pool on parallel liquidity", () => {
    const split = findSplitRoute("XLM:native", "USDC:issuer", 500_000, pools);
    assert.ok(split !== null);
    const [best] = rankByNetOutput([...findDirectRoutes("XLM:native", "USDC:issuer", 500_000, pools)]);
    assert.ok(Number(split.outputAmount) >= Number(best.outputAmount));
  });
  it("explains the winner", () => {
    const ranked = rankByNetOutput(findDirectRoutes("XLM:native", "USDC:issuer", 1000, pools));
    const explanations = explainRoutes(ranked);
    assert.equal(explanations[0].verdict, "recommended");
    assert.ok(explanations[0].reasons.length > 0);
  });
});
