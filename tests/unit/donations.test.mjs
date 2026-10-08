import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DonationsDecoder, aggregateDonations } from "../../dist/packages/protocols/src/donations.js";

const CONTRACT = "CBCHKIDRFJ4KO2DGJEP75NJPYN65YVD6QOVVHC5IU7PRTHGHW75OF2KX";
const ev = (topics, data, contractId = CONTRACT) => ({ contractId, topics, data, ledger: 42, txHash: "tx1" });

describe("donations decoder", () => {
  const decoder = new DonationsDecoder(CONTRACT);

  it("decodes campaign_created", () => {
    const res = decoder.decode(ev(["campaign_created", 1], {
      creator: "GA", beneficiary: "GB", token: "CT", goal: 50000000000n, deadline: 1801855462, version: 1,
    }));
    assert.equal(res.kind, "campaign_created");
    assert.equal(res.record.goal, "50000000000");
    assert.equal(res.record.campaignId, 1);
  });

  it("decodes donation_made with donor topic", () => {
    const res = decoder.decode(ev(["donation_made", 1, "GDONOR"], {
      receipt_id: 7n, amount: 1500000000n, raised: 1500000000n, version: 1,
    }));
    assert.equal(res.kind, "donation");
    assert.equal(res.record.donor, "GDONOR");
    assert.equal(res.record.id, `${CONTRACT}:7`);
    assert.equal(res.record.amount, "1500000000");
  });

  it("decodes campaign_closed", () => {
    const res = decoder.decode(ev(["campaign_closed", 3], { raised: "0", version: 1 }));
    assert.equal(res.kind, "campaign_closed");
    assert.equal(res.record.campaignId, 3);
  });

  it("ignores other contracts, unknown and malformed events", () => {
    assert.equal(decoder.decode(ev(["donation_made", 1, "G"], {}, "COTHER")).kind, "ignored");
    assert.equal(decoder.decode(ev(["swap"], {})).kind, "ignored");
    const bad = decoder.decode(ev(["donation_made", 1, "G"], { amount: "abc", receipt_id: 1, raised: 1 }));
    assert.equal(bad.kind, "ignored");
    assert.match(bad.reason, /malformed/);
  });

  it("aggregates totals with unique donors per campaign", () => {
    const mk = (campaignId, donor, amount, receiptId) => ({
      id: String(receiptId), receiptId, campaignId, donor, amount, raisedAfter: "0", ledger: 1, txHash: "t",
    });
    const totals = aggregateDonations([mk(1, "A", "10", 1), mk(1, "A", "5", 2), mk(1, "B", "1", 3), mk(2, "A", "2", 4)]);
    assert.equal(totals.get(1).raised, 16n);
    assert.equal(totals.get(1).donors, 2);
    assert.equal(totals.get(1).donations, 3);
    assert.equal(totals.get(2).donors, 1);
  });
});
