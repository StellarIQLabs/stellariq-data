// Applies SQL migrations in database/migrations in lexical order.
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb, closeDb } from "./client.js";
import { getConfig } from "../packages/core/src/config.js";
import { createLogger } from "../packages/core/src/logger.js";

const logger = createLogger("migrate");

export async function runMigrations(): Promise<void> {
  const config = getConfig();
  const handle = createDb(config.databaseUrl);
  try {
    await migrate(handle.db, { migrationsFolder: "./database/migrations" });
    logger.info("migrations applied");
  } finally {
    await closeDb(handle);
  }
}
