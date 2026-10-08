// StellarIQ Give donations contract decoder. Turns `campaign_created`,
// `donation_made` and `campaign_closed` events into normalized records the
// indexer stores and the analytics engine aggregates per campaign.
//
// Soroban `#[contractevent]` layout: topics[0] is the event name, followed by
// the fields marked `#[topic]`; the remaining fields arrive as a data map.
// Amounts are i128 in stroops (7 decimals) and are kept as integer strings.
import type { RawEvent } from "../../adapters/src/decoder.js";

export const DONATIONS_PROTOCOL = "stellariq-give";

export interface CampaignCreatedRecord {
  campaignId: number;
  creator: string;
  beneficiary: string;
  token: string;
  goal: string;
  deadline: number;
  ledger: number;
  txHash: string;
}

export interface DonationRecord {
  id: string;
  receiptId: number;
  campaignId: number;
  donor: string;
  amount: string;
  raisedAfter: string;
  ledger: number;
  txHash: string;
}

export interface CampaignClosedRecord {
  campaignId: number;
  raised: string;
  ledger: number;
  txHash: string;
}

export type DonationDecodeResult =
  | { kind: "campaign_created"; record: CampaignCreatedRecord }
  | { kind: "donation"; record: DonationRecord }
  | { kind: "campaign_closed"; record: CampaignClosedRecord }
  | { kind: "ignored"; reason: string };

type DataMap = Record<string, unknown>;

function field(data: DataMap, key: string): unknown {
  if (!(key in data)) {
    throw new Error(`missing field "${key}"`);
  }
  return data[key];
}

function intString(value: unknown, key: string): string {
  const s = typeof value === "bigint" ? value.toString() : String(value);
  if (!/^-?\d+$/.test(s)) {
    throw new Error(`field "${key}" is not an integer: ${s}`);
  }
  return s;
}

function toNumber(value: unknown, key: string): number {
  const n = Number(intString(value, key));
  if (!Number.isSafeInteger(n)) {
    throw new Error(`field "${key}" is out of range`);
  }
  return n;
}

export class DonationsDecoder {
  readonly protocol = DONATIONS_PROTOCOL;

  constructor(private readonly contractId: string) {}

  canDecode(event: RawEvent): boolean {
    return event.contractId === this.contractId;
  }

  decode(event: RawEvent): DonationDecodeResult {
    if (!this.canDecode(event)) {
      return { kind: "ignored", reason: "not the donations contract" };
    }
    const [name, ...topics] = event.topics;
    const data = (event.data ?? {}) as DataMap;
    try {
      switch (name) {
        case "campaign_created":
          return {
            kind: "campaign_created",
            record: {
              campaignId: toNumber(topics[0], "campaign_id"),
              creator: String(field(data, "creator")),
              beneficiary: String(field(data, "beneficiary")),
              token: String(field(data, "token")),
              goal: intString(field(data, "goal"), "goal"),
              deadline: toNumber(field(data, "deadline"), "deadline"),
              ledger: event.ledger,
              txHash: event.txHash,
            },
          };
        case "donation_made": {
          const receiptId = toNumber(field(data, "receipt_id"), "receipt_id");
          return {
            kind: "donation",
            record: {
              id: `${this.contractId}:${receiptId}`,
              receiptId,
              campaignId: toNumber(topics[0], "campaign_id"),
              donor: String(topics[1] ?? ""),
              amount: intString(field(data, "amount"), "amount"),
              raisedAfter: intString(field(data, "raised"), "raised"),
              ledger: event.ledger,
              txHash: event.txHash,
            },
          };
        }
        case "campaign_closed":
          return {
            kind: "campaign_closed",
            record: {
              campaignId: toNumber(topics[0], "campaign_id"),
              raised: intString(field(data, "raised"), "raised"),
              ledger: event.ledger,
              txHash: event.txHash,
            },
          };
        default:
          return { kind: "ignored", reason: `unknown event "${String(name)}"` };
      }
    } catch (err) {
      return { kind: "ignored", reason: `malformed ${String(name)}: ${(err as Error).message}` };
    }
  }
}

export interface CampaignTotals {
  campaignId: number;
  raised: bigint;
  donations: number;
  donors: number;
}

/** Folds decoded donations into per-campaign totals (unique donors per campaign). */
export function aggregateDonations(records: DonationRecord[]): Map<number, CampaignTotals> {
  const totals = new Map<number, CampaignTotals>();
  const seen = new Map<number, Set<string>>();
  for (const r of records) {
    const t = totals.get(r.campaignId) ?? { campaignId: r.campaignId, raised: 0n, donations: 0, donors: 0 };
    const donors = seen.get(r.campaignId) ?? new Set<string>();
    t.raised += BigInt(r.amount);
    t.donations += 1;
    if (!donors.has(r.donor)) {
      donors.add(r.donor);
      t.donors += 1;
    }
    totals.set(r.campaignId, t);
    seen.set(r.campaignId, donors);
  }
  return totals;
}
