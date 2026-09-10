// Minimal Stellar RPC client (JSON-RPC over fetch) used by the indexer.
export interface RpcClientOptions {
  rpcUrl: string;
  horizonUrl: string;
}

export interface LedgerInfo {
  sequence: number;
  hash: string;
  closedAt: string;
}

export class StellarRpcClient {
  private rpcUrl: string;
  readonly horizonUrl: string;

  constructor(options: RpcClientOptions) {
    this.rpcUrl = options.rpcUrl;
    this.horizonUrl = options.horizonUrl;
  }

  private async rpcCall<T>(method: string, params: Record<string, unknown>): Promise<T> {
    const response = await fetch(this.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    if (!response.ok) throw new Error(`RPC ${method} failed with HTTP ${response.status}`);
    const body = (await response.json()) as { result?: T; error?: { message: string } };
    if (body.error) throw new Error(`RPC ${method} error: ${body.error.message}`);
    return body.result as T;
  }

  async getLatestLedger(): Promise<LedgerInfo> {
    const result = await this.rpcCall<{ sequence: number; hash?: string; closedAt?: string }>(
      "getLatestLedger",
      {},
    );
    return {
      sequence: result.sequence,
      hash: result.hash ?? "",
      closedAt: result.closedAt ?? new Date().toISOString(),
    };
  }

  async getLedgers(startSequence: number, limit = 10): Promise<LedgerInfo[]> {
    const result = await this.rpcCall<{ ledgers?: LedgerInfo[] }>("getLedgers", {
      startLedger: startSequence,
      limit,
    });
    return result.ledgers ?? [];
  }

  async getEvents(startLedger: number, limit = 100): Promise<unknown[]> {
    const result = await this.rpcCall<{ events?: unknown[] }>("getEvents", {
      startLedger,
      filters: [],
      limit,
    });
    return result.events ?? [];
  }
}
