// Liquidity pool table: one row per protocol pool (AMM + Stellar DEX).
import { pgTable, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";

export const pools = pgTable("pools", {
  id: text("id").primaryKey(),
  protocol: text("protocol").notNull(),
  tokenAId: text("token_a_id").notNull(),
  tokenBId: text("token_b_id").notNull(),
  reserveA: numeric("reserve_a", { precision: 38, scale: 12 }).notNull().default("0"),
  reserveB: numeric("reserve_b", { precision: 38, scale: 12 }).notNull().default("0"),
  tvlUsd: numeric("tvl_usd", { precision: 30, scale: 2 }),
  feeBps: integer("fee_bps").notNull().default(30),
  volume24hUsd: numeric("volume_24h_usd", { precision: 30, scale: 2 }),
  updatedLedger: integer("updated_ledger"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Pool = typeof pools.$inferSelect;
export type NewPool = typeof pools.$inferInsert;
