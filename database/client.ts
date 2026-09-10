// Shared Postgres connection helper (Drizzle ORM over postgres-js).
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

export interface DbHandle {
  db: PostgresJsDatabase;
  client: Sql;
}

export function createDb(connectionString: string): DbHandle {
  const client: Sql = postgres(connectionString, { max: 10, idle_timeout: 30 });
  const db: PostgresJsDatabase = drizzle(client);
  return { db, client };
}

export async function closeDb(handle: DbHandle): Promise<void> {
  await handle.client.end();
}
