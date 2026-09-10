import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectPriceDiscrepancies } from "../../dist/apps/analytics-engine/src/signals/discrepancy.js";
import { detectLiquidityEvents } from "../../dist/apps/analytics-engine/src/signals/liquidity-events.js";
import { detectWhaleSwaps } from "../../dist/apps/analytics-engine/src/signals/whales.js";

describe("signal detection", () => {
  it("flags price spreads with percent", () => {
    const signals = detectPriceDiscrepancies([
      { marketId: "m1", pair: "XLM/USDC", price: 0.237, source: "soroswap" },
      { marketId: "m2", pair: "XLM/USDC", price: 0.245, source: "phoenix" },
    ], 0.5);
    assert.equal(signals.length, 1);
    assert.ok(signals[0].spreadPct > 0.5);
  });
  it("flags sharp tvl drops", () => {
    const now = Date.now();
    const signals = detectLiquidityEvents([
      { poolId: "p1", tvlUsd: 1_000_000, capturedAt: now - 20 * 60_000 },
      { poolId: "p1", tvlUsd: 700_000, capturedAt: now },
    ]);
    assert.equal(signals.length, 1);
    assert.ok(signals[0].dropPct >= 22);
  });
  it("flags whale swaps above threshold", () => {
    const signals = detectWhaleSwaps([
      { swapId: "s1", protocol: "soroswap", poolId: "p1", amountXlm: 125_000, volumeUsd: 29_000, occurredAt: new Date().toISOString() },
      { swapId: "s2", protocol: "phoenix", poolId: "p2", amountXlm: 10, volumeUsd: 2, occurredAt: new Date().toISOString() },
    ]);
    assert.equal(signals.length, 1);
    assert.equal(signals[0].swapId, "s1");
  });
});
