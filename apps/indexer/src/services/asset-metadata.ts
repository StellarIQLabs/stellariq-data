// Asset metadata enrichment: fetches name/home-domain from Horizon and keeps
// the registry row up to date.
export interface HorizonAssetRecord {
  asset_code: string;
  asset_issuer: string;
  asset_type: string;
  num_accounts?: number;
  _links?: { toml?: { href?: string } };
}

export interface EnrichedMetadata {
  name: string | null;
  homeDomain: string | null;
  numAccounts: number | null;
}

export async function fetchAssetMetadata(
  horizonUrl: string,
  code: string,
  issuer: string,
): Promise<EnrichedMetadata> {
  const base = horizonUrl.replace(/\/$/, "");
  const response = await fetch(`${base}/assets?asset_code=${code}&asset_issuer=${issuer}&limit=1`);
  if (!response.ok) throw new Error(`Horizon assets failed with HTTP ${response.status}`);
  const body = (await response.json()) as { _embedded?: { records?: HorizonAssetRecord[] } };
  const record = body._embedded?.records?.[0];
  if (!record) return { name: null, homeDomain: null, numAccounts: null };
  const tomlHref = record._links?.toml?.href;
  let homeDomain: string | null = null;
  if (tomlHref) {
    try {
      homeDomain = new URL(tomlHref).hostname;
    } catch {
      homeDomain = null;
    }
  }
  return {
    name: record.asset_code,
    homeDomain,
    numAccounts: record.num_accounts ?? null,
  };
}

export function applyMetadataEnrichment(
  row: Record<string, unknown>,
  metadata: EnrichedMetadata,
): Record<string, unknown> {
  return {
    ...row,
    name: metadata.name ?? row["name"] ?? null,
    homeDomain: metadata.homeDomain ?? row["homeDomain"] ?? null,
    updatedAt: new Date().toISOString(),
  };
}
