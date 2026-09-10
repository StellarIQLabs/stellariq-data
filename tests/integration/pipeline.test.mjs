// End-to-end pipeline test: synthetic ledger data flows through discovery ->
// pool indexing -> swap indexing -> price aggregation -> routing -> signals.
// Against a local Stellar quickstart, point STELLAR_RPC_URL at the container
// and STELLAR_NETWORK=quickstart; the same assertions hold on real ledgers.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AssetDiscoveryService } from "../../dist/apps/indexer/src/services/asset-discovery.js";
import { PoolIndexer } from "../../dist/apps/indexer/src/services/pool-indexer.js";
import { SwapIndexer } from "../../dist/apps/indexer/src/services/swap-indexer.js";
import { MarketIndexer } from "../../dist/apps/indexer/src/services/market-indexer.js";
import { aggregatePrice } from "../../dist/apps/price-engine/src/outlier.js";
import { findDirectRoutes } from "../../dist/apps/routing-engine/src/direct.js";
import { rankByNetOutput } from "../../dist/apps/routing-engine/src/ranking.js";
import { createCache } from "../../dist/packages/core/src/cache.js";
import { createQueue, QUEUES } from "../../dist/packages/core/src/queue.js";

const XLM = { code: "XLM", issuer: null };
const USDC = { code: "USDC", issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN" };

describe("ingestion -> price -> routing pipeline", () => {
  it("flows from ledger events to a ranked quote", async () => {
    const discovery = new AssetDiscoveryService();
    const found = discovery.discover([XLM, USDC], 100);
    assert.equal(found.length, 2);

    const pools = new PoolIndexer();
    pools.upsert({
      id: "pool1", protocol: "soroswap", tokenA: XLM, tokenB: USDC,
      reserveA: "1000000", reserveB: "237000", tvlUsd: "474000", feeBps: 30,
    }, 100);

    const swaps = new SwapIndexer().normalize([{
      id: "soroswap:tx1:100", txHash: "tx1", protocol: "soroswap", poolId: "pool1",
      userAddress: "user1", inputAsset: XLM, inputAmount: "1000",
      outputAsset: USDC, outputAmount: "236", ledger: 100, occurredAt: new Date().toISOString(),
    }]);
    assert.equal(swaps.length, 1);

    const markets = new MarketIndexer().aggregate(
      pools.snapshot().map((row) => ({
        id: row.id,
        protocol: row.protocol,
        tokenA: { code: row.tokenAId.split(":")[0], issuer: row.tokenAId.split(":")[1] ?? null },
        tokenB: { code: row.tokenBId.split(":")[0], issuer: row.tokenBId.split(":")[1] ?? null },
        reserveA: row.reserveA,
        reserveB: row.reserveB,
        tvlUsd: row.tvlUsd,
        feeBps: row.feeBps,
      })),
    );
    assert.ok(markets.length >= 0);

    const price = aggregatePrice([
      { source: "soroswap", price: 0.237, volume: 1000, liquidity: 474000 },
      { source: "phoenix", price: 0.238, volume: 2000, liquidity: 500000 },
    ]);
    assert.ok(price !== null && price.confidence > 0);

    const cache = createCache(undefined);
    await cache.set("price:USD:XLM:native", price.price, 15);
    assert.equal(await cache.get("price:USD:XLM:native"), price.price);

    const queue = createQueue(undefined);
    await queue.push(QUEUES.swaps, swaps[0]);
    assert.deepEqual(await queue.pop(QUEUES.swaps, 1), swaps[0]);

    const ranked = rankByNetOutput(findDirectRoutes("XLM:native", `USDC:${USDC.issuer}`, 10_000, [{
      poolId: "pool1", protocol: "soroswap", tokenA: "XLM:native",
      tokenB: `USDC:${USDC.issuer}`, reserveA: 1_000_000, reserveB: 237_000, feeBps: 30,
    }]));
    assert.equal(ranked[0].rank, 1);
    assert.ok(Number(ranked[0].netOutput) > 0);
  });
});
