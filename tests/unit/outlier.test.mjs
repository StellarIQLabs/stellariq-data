import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filterOutliers, aggregatePrice } from "../../dist/apps/price-engine/src/outlier.js";

describe("outlier filter", () => {
  it("rejects anomalous sources", () => {
    const obs = [
      { source: "a", price: 0.237, volume: 100, liquidity: 1000 },
      { source: "b", price: 0.238, volume: 100, liquidity: 1000 },
      { source: "rug", price: 2.37, volume: 1, liquidity: 1 },
    ];
    const { kept, rejected } = filterOutliers(obs);
    assert.equal(kept.length, 2);
    assert.equal(rejected.length, 1);
  });
  it("emits confidence between zero and one", () => {
    const result = aggregatePrice([
      { source: "a", price: 0.237, volume: 100, liquidity: 1000 },
      { source: "b", price: 0.238, volume: 200, liquidity: 2000 },
    ]);
    assert.ok(result.confidence >= 0 && result.confidence <= 1);
    assert.equal(result.sourcesUsed, 2);
  });
});
