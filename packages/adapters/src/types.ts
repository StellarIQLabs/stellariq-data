// Shared adapter-level primitive types (decoder-agnostic).
export interface AssetRef {
  code: string;
  issuer: string | null;
}
