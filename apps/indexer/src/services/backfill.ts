// Retry + backfill: automatic ingestion retries and manual backfill scripts
// for missed ledgers.
import { backoffDelayMs } from "../poller.js";

export interface BackfillRange {
  fromLedger: number;
  toLedger: number;
}

export function planBackfill(lastProcessed: number, latest: number): BackfillRange | null {
  if (latest <= lastProcessed) return null;
  return { fromLedger: lastProcessed + 1, toLedger: latest };
}

export function splitRanges(range: BackfillRange, chunkSize: number): BackfillRange[] {
  const chunks: BackfillRange[] = [];
  for (let start = range.fromLedger; start <= range.toLedger; start += chunkSize) {
    chunks.push({ fromLedger: start, toLedger: Math.min(start + chunkSize - 1, range.toLedger) });
  }
  return chunks;
}

export async function withIngestionRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  baseBackoffMs = 500,
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (attempt > maxRetries) throw error;
      await new Promise((resolve) => setTimeout(resolve, backoffDelayMs(attempt, baseBackoffMs)));
    }
  }
}
