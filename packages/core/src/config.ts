// Central environment configuration for the data layer.
// Connection strings for Postgres/Redis are provisioned by stellariq-infra;
// the data layer only reads them from the environment.
export interface DataLayerConfig {
  databaseUrl: string;
  redisUrl: string;
  stellarRpcUrl: string;
  horizonUrl: string;
  networkPassphrase: string;
  indexerPort: number;
  priceEnginePort: number;
  analyticsEnginePort: number;
  routingEnginePort: number;
  internalApiPort: number;
  logLevel: string;
}

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export function getConfig(): DataLayerConfig {
  return {
    databaseUrl: required("DATABASE_URL", "postgres://stellariq:stellariq@localhost:5432/stellariq"),
    redisUrl: required("REDIS_URL", "redis://localhost:6379"),
    stellarRpcUrl: required("STELLAR_RPC_URL", "https://soroban-testnet.stellar.org"),
    horizonUrl: required("HORIZON_URL", "https://horizon-testnet.stellar.org"),
    networkPassphrase: required("NETWORK_PASSPHRASE", "Test SDF Network ; September 2015"),
    indexerPort: Number(required("INDEXER_PORT", "4101")),
    priceEnginePort: Number(required("PRICE_ENGINE_PORT", "4102")),
    analyticsEnginePort: Number(required("ANALYTICS_ENGINE_PORT", "4103")),
    routingEnginePort: Number(required("ROUTING_ENGINE_PORT", "4104")),
    internalApiPort: Number(required("INTERNAL_API_PORT", "4110")),
    logLevel: required("LOG_LEVEL", "info"),
  };
}
