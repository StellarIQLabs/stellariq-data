import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SoroswapAdapter } from "../../dist/packages/protocols/src/soroswap.js";
import { PhoenixAdapter, fromStroops } from "../../dist/packages/protocols/src/phoenix.js";
import { AquariusAdapter } from "../../dist/packages/protocols/src/aquarius.js";
import { AdapterRegistry } from "../../dist/packages/protocols/src/registry.js";

const swapEvent = (topics, data, contractId = "soroswap-router") => ({
  contractId, topics, data, ledger: 100, txHash: "abc",
});

describe("protocol adapters", () => {
  it("soroswap decodes swap events", () => {
    const adapter = new SoroswapAdapter();
    const swap = adapter.parseSwap(swapEvent(["swap", "pool1", "user1"], {
      amount_in: "100", amount_out: "23", token_in: "native", token_out: "USDC:issuer",
    }));
    assert.equal(swap.protocol, "soroswap");
    assert.equal(swap.inputAmount, "100");
  });
  it("phoenix converts stroops with decimals", () => {
    assert.equal(fromStroops("10000000"), "1");
    const adapter = new PhoenixAdapter();
    const swap = adapter.parseSwap({
      contractId: "phoenix-pool", topics: ["phoenix-swap", "pool1"],
      data: { offer_asset: "native", offer_amount: "10000000", ask_asset: "USDC:x", ask_amount: "2370000" },
      ledger: 1, txHash: "t",
    });
    assert.equal(swap.inputAmount, "1");
  });
  it("registry loads enabled adapters from config", () => {
    const registry = new AdapterRegistry({ horizonUrl: "http://x", enabled: ["soroswap", "aquarius"] });
    assert.deepEqual(registry.protocols().sort(), ["aquarius", "soroswap"]);
    assert.ok(registry.get("soroswap") instanceof SoroswapAdapter);
    assert.ok(registry.get("aquarius") instanceof AquariusAdapter);
    assert.equal(registry.get("phoenix"), undefined);
  });
});
