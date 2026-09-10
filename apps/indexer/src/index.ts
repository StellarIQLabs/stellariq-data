// @stellariq/indexer entrypoint: streams ledgers + Soroban events via RPC.
import { getConfig } from "../../../packages/core/src/config.js";
import { createLogger } from "../../../packages/core/src/logger.js";
import { createQueue, QUEUES } from "../../../packages/core/src/queue.js";
import { StellarRpcClient } from "./rpc.js";
import { CheckpointStore } from "./checkpoint.js";

export const SERVICE_NAME = "indexer";

export async function runIndexer(): Promise<void> {
  const config = getConfig();
  const logger = createLogger(SERVICE_NAME);
  const queue = createQueue(config.redisUrl);
  const rpc = new StellarRpcClient({ rpcUrl: config.stellarRpcUrl, horizonUrl: config.horizonUrl });
  const checkpoints = new CheckpointStore();
  const cursor = await checkpoints.get("indexer");
  const latest = await rpc.getLatestLedger();
  logger.info(`starting ingest at cursor=${cursor} latest=${latest.sequence}`);
  await queue.push(QUEUES.ledgers, { from: cursor, to: latest.sequence });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runIndexer();
}
