// Manual backfill entrypoint: `node scripts/backfill.mjs <fromLedger> <toLedger>`.
// Prints the chunk plan; the indexer consumes each chunk via EventIngestor.
const from = Number(process.argv[2]);
const to = Number(process.argv[3]);
if (!Number.isInteger(from) || !Number.isInteger(to) || to < from) {
  console.error("usage: node scripts/backfill.mjs <fromLedger> <toLedger>");
  process.exit(1);
}
const CHUNK = 50;
for (let start = from; start <= to; start += CHUNK) {
  console.log(`backfill chunk ${start}..${Math.min(start + CHUNK - 1, to)}`);
}
