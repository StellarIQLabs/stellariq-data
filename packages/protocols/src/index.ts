export const SUPPORTED_PROTOCOLS = ["stellar-dex", "soroswap", "phoenix", "aquarius"] as const;
export type ProtocolId = (typeof SUPPORTED_PROTOCOLS)[number];
