// Adapter registry: loads enabled adapters from config and fans out
// indexing calls without touching core logic when protocols are added.
import type { DexAdapter } from "../../adapters/src/adapter.js";
import type { NormalizedSwap, PoolUpdate, RawEvent } from "../../adapters/src/decoder.js";
import { StellarDexAdapter } from "./stellar-dex.js";
import { SoroswapAdapter } from "./soroswap.js";
import { PhoenixAdapter } from "./phoenix.js";
import { AquariusAdapter } from "./aquarius.js";

export interface RegistryConfig {
  horizonUrl: string;
  enabled: string[];
}

export class AdapterRegistry {
  private adapters = new Map<string, DexAdapter>();

  constructor(config: RegistryConfig) {
    const all: DexAdapter[] = [
      new StellarDexAdapter(config.horizonUrl),
      new SoroswapAdapter(),
      new PhoenixAdapter(),
      new AquariusAdapter(),
    ];
    for (const adapter of all) {
      if (config.enabled.includes(adapter.protocol)) this.adapters.set(adapter.protocol, adapter);
    }
  }

  static fromEnv(horizonUrl: string): AdapterRegistry {
    const enabled = (process.env["ENABLED_PROTOCOLS"] ?? "stellar-dex,soroswap,phoenix,aquarius")
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    return new AdapterRegistry({ horizonUrl, enabled });
  }

  protocols(): string[] {
    return [...this.adapters.keys()];
  }

  get(protocol: string): DexAdapter | undefined {
    return this.adapters.get(protocol);
  }

  decodeAll(event: RawEvent): Array<{ protocol: string; swap: NormalizedSwap | null; pool: PoolUpdate | null }> {
    return [...this.adapters.values()].map((adapter) => ({
      protocol: adapter.protocol,
      swap: adapter.parseSwap(event),
      pool: adapter.parsePoolUpdate?.(event) ?? null,
    }));
  }
}
