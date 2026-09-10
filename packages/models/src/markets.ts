// Market table: one row per (base asset, quote asset) pair grouping pools.
import { pgTable, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const markets = pgTable("markets", {
  id: text("id").primaryKey(),
  baseAssetId: text("base_asset_id").notNull(),
  quoteAssetId: text("quote_asset_id").notNull(),
  symbol: text("symbol").notNull(),
  price: numeric("price", { precision: 30, scale: 12 }),
  priceChange24hPct: numeric("price_change_24h_pct", { precision: 10, scale: 4 }),
  volume24hUsd: numeric("volume_24h_usd", { precision: 30, scale: 2 }),
  liquidityUsd: numeric("liquidity_usd", { precision: 30, scale: 2 }),
  tradeCount24h: text("trade_count_24h").notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Market = typeof markets.$inferSelect;
export type NewMarket = typeof markets.$inferInsert;
