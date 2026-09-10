// Asset discovery: scans ledgers and pool registries for new assets, stores
// issuer/decimals and marks verification status.
import type { AssetRef } from "../../../../packages/adapters/src/types.js";

export interface DiscoveredAsset extends AssetRef {
  decimals: number;
  verificationStatus: "verified" | "unverified" | "suspicious";
  firstSeenLedger: number;
}

export function assetRecordId(asset: AssetRef): string {
  return asset.issuer ? `${asset.code}:${asset.issuer}` : `${asset.code}:native`;
}

const KNOWN_VERIFIED = new Set([
  "XLM:native",
  "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
  "EURC:GDHUJ6C4B2K5M5Q2W3L5QK2Q3J5X5X5X5X5X5X5X5X5X5X5X5X5",
]);

export class AssetDiscoveryService {
  private seen = new Map<string, DiscoveredAsset>();

  discover(assets: AssetRef[], ledger: number): DiscoveredAsset[] {
    const fresh: DiscoveredAsset[] = [];
    for (const asset of assets) {
      const id = assetRecordId(asset);
      if (this.seen.has(id)) continue;
      const record: DiscoveredAsset = {
        ...asset,
        decimals: 7,
        verificationStatus: KNOWN_VERIFIED.has(id) ? "verified" : "unverified",
        firstSeenLedger: ledger,
      };
      this.seen.set(id, record);
      fresh.push(record);
    }
    return fresh;
  }

  toInsert(record: DiscoveredAsset): Record<string, unknown> {
    return {
      id: assetRecordId(record),
      code: record.code,
      issuer: record.issuer,
      decimals: record.decimals,
      verified: record.verificationStatus === "verified",
      verificationStatus: record.verificationStatus,
    };
  }

  count(): number {
    return this.seen.size;
  }
}
