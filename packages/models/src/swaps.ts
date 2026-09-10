// Normalized swap (trade) table: every trade from every adapter lands here.
import { pgTable, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";

export const swaps = pgTable("swaps", {
  id: text("id").primaryKey(),
  txHash: text("tx_hash").notNull(),
  protocol: text("protocol").notNull(),
  poolId: text("pool_id"),
  userAddress: text("user_address"),
  inputAssetId: text("input_asset_id").notNull(),
  inputAmount: numeric("input_amount", { precision: 38, scale: 12 }).notNull(),
  outputAssetId: text("output_asset_id").notNull(),
  outputAmount: numeric("output_amount", { precision: 38, scale: 12 }).notNull(),
  ledger: integer("ledger"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Swap = typeof swaps.$inferSelect;
export type NewSwap = typeof swaps.$inferInsert;
