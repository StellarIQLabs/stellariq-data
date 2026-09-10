// Ledger polling loop with cursor persistence and exponential-backoff retry.
// Guarantees at-least-once, gap-free processing: the checkpoint advances only
// after a ledger batch has been fully enqueued.
import type { StellarRpcClient } from "./rpc.js";
import { CheckpointStore } from "./checkpoint.js";
import { createLogger } from "../../../packages/core/src/logger.js";
import { createQueue, QUEUES, type JobQueue } from "../../../packages/core/src/queue.js";

export interface PollerOptions {
  consumer: string;
  batchSize: number;
  pollIntervalMs: number;
  maxRetries: number;
  baseBackoffMs: number;
}

export const DEFAULT_POLLER_OPTIONS: PollerOptions = {
  consumer: "indexer",
  batchSize: 10,
  pollIntervalMs: 5000,
  maxRetries: 8,
  baseBackoffMs: 500,
};

export function backoffDelayMs(attempt: number, baseMs: number): number {
  return Math.min(baseMs * 2 ** attempt, 60_000);
}

export class LedgerPoller {
  private rpc: StellarRpcClient;
  private checkpoints: CheckpointStore;
  private queue: JobQueue;
  private options: PollerOptions;
  private logger = createLogger("ledger-poller");
  private running = false;

  constructor(rpc: StellarRpcClient, options: Partial<PollerOptions> = {}) {
    this.rpc = rpc;
    this.checkpoints = new CheckpointStore();
    this.queue = createQueue(process.env["REDIS_URL"]);
    this.options = { ...DEFAULT_POLLER_OPTIONS, ...options };
  }

  async pollOnce(): Promise<number> {
    const cursor = await this.checkpoints.get(this.options.consumer);
    const latest = await this.withRetry(() => this.rpc.getLatestLedger());
    if (latest.sequence <= cursor) return cursor;
    const end = Math.min(cursor + this.options.batchSize, latest.sequence);
    const ledgers = await this.withRetry(() => this.rpc.getLedgers(cursor + 1, end - cursor));
    for (const ledger of ledgers) {
      await this.queue.push(QUEUES.ledgers, ledger);
    }
    await this.checkpoints.set(this.options.consumer, end);
    this.logger.info(`processed ledgers ${cursor + 1}..${end}`);
    return end;
  }

  async start(): Promise<void> {
    this.running = true;
    while (this.running) {
      await this.pollOnce();
      await new Promise((resolve) => setTimeout(resolve, this.options.pollIntervalMs));
    }
  }

  stop(): void {
    this.running = false;
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0;
    for (;;) {
      try {
        return await fn();
      } catch (error) {
        attempt += 1;
        if (attempt > this.options.maxRetries) throw error;
        const delay = backoffDelayMs(attempt, this.options.baseBackoffMs);
        this.logger.warn(`rpc failed (attempt ${attempt}), retrying in ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}
