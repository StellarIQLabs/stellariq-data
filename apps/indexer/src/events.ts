// Soroban event ingestion: pulls contract events from RPC per ledger window
// and forwards raw envelopes to protocol decoders via the swaps queue.
import type { StellarRpcClient } from "./rpc.js";
import { CheckpointStore } from "./checkpoint.js";
import { createLogger } from "../../../packages/core/src/logger.js";
import { createQueue, QUEUES, type JobQueue } from "../../../packages/core/src/queue.js";

export interface RawContractEvent {
  contractId: string;
  topics: string[];
  data: unknown;
  ledger: number;
  txHash: string;
}

export class EventIngestor {
  private rpc: StellarRpcClient;
  private checkpoints: CheckpointStore;
  private queue: JobQueue;
  private logger = createLogger("event-ingestor");
  private batchSize: number;

  constructor(rpc: StellarRpcClient, batchSize = 100) {
    this.rpc = rpc;
    this.checkpoints = new CheckpointStore();
    this.queue = createQueue(process.env["REDIS_URL"]);
    this.batchSize = batchSize;
  }

  static toRawEvent(envelope: Record<string, unknown>, fallbackLedger: number): RawContractEvent | null {
    const contractId = envelope["contractId"];
    const topics = envelope["topics"];
    if (typeof contractId !== "string" || !Array.isArray(topics)) return null;
    return {
      contractId,
      topics: topics.map((t) => String(t)),
      data: envelope["data"] ?? null,
      ledger: typeof envelope["ledger"] === "number" ? envelope["ledger"] : fallbackLedger,
      txHash: typeof envelope["txHash"] === "string" ? envelope["txHash"] : "",
    };
  }

  async ingestRange(fromLedger: number, toLedger: number): Promise<number> {
    const cursor = await this.checkpoints.get("events");
    const start = Math.max(fromLedger, cursor + 1);
    let ingested = 0;
    for (let ledger = start; ledger <= toLedger; ledger += 1) {
      const raw = await this.rpc.getEvents(ledger, this.batchSize);
      for (const envelope of raw) {
        const event = EventIngestor.toRawEvent(envelope as Record<string, unknown>, ledger);
        if (!event) continue;
        await this.queue.push(QUEUES.swaps, event);
        ingested += 1;
      }
      await this.checkpoints.set("events", ledger);
    }
    this.logger.info(`ingested ${ingested} events for ledgers ${start}..${toLedger}`);
    return ingested;
  }
}
