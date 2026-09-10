import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeVwap } from "../../dist/apps/price-engine/src/vwap.js";
import { computeMedian, computeLiquidityWeightedPrice } from "../../dist/apps/price-engine/src/median.js";

describe("vwap", () => {
  it("weights prices by volume", () => {
    const vwap = computeVwap([
      { source: "a", price: 0.24, volume: 100, liquidity: 1000 },
      { source: "b", price: 0.23, volume: 300, liquidity: 1000 },
    ]);
    assert.equal(vwap, (0.24 * 100 + 0.23 * 300) / 400);
  });
  it("returns null without volume", () => {
    assert.equal(computeVwap([]), null);
    assert.equal(computeVwap([{ source: "a", price: 1, volume: 0, liquidity: 0 }]), null);
  });
});

describe("median", () => {
  it("computes odd and even medians", () => {
    assert.equal(computeMedian([3, 1, 2]), 2);
    assert.equal(computeMedian([4, 1, 3, 2]), 2.5);
  });
  it("weights by liquidity", () => {
    const price = computeLiquidityWeightedPrice([
      { source: "a", price: 1, volume: 1, liquidity: 100 },
      { source: "b", price: 3, volume: 1, liquidity: 300 },
    ]);
    assert.equal(price, 2.5);
  });
});
