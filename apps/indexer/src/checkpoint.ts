// Persistent ledger cursor: remembers the last fully-processed ledger per
// consumer so ingestion resumes without gaps after a restart.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

export class CheckpointStore {
  private dir: string;
  private memory = new Map<string, number>();

  constructor(dir = "./data/checkpoints") {
    this.dir = dir;
  }

  private fileFor(consumer: string): string {
    return join(this.dir, `${consumer}.json`);
  }

  async get(consumer: string): Promise<number> {
    if (this.memory.has(consumer)) return this.memory.get(consumer) as number;
    try {
      const raw = await readFile(this.fileFor(consumer), "utf8");
      const parsed = JSON.parse(raw) as { ledger: number };
      this.memory.set(consumer, parsed.ledger);
      return parsed.ledger;
    } catch {
      return 0;
    }
  }

  async set(consumer: string, ledger: number): Promise<void> {
    this.memory.set(consumer, ledger);
    await mkdir(dirname(this.fileFor(consumer)), { recursive: true });
    await writeFile(this.fileFor(consumer), JSON.stringify({ ledger }), "utf8");
  }
}
