// Price observation table: raw per-source ticks feeding VWAP/median.
import { pgTable, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const prices = pgTable("prices", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull(),
  quoteCurrency: text("quote_currency").notNull().default("USD"),
  price: numeric("price", { precision: 30, scale: 12 }).notNull(),
  source: text("source").notNull(),
  confidence: numeric("confidence", { precision: 5, scale: 4 }).notNull().default("1"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PriceTick = typeof prices.$inferSelect;
export type NewPriceTick = typeof prices.$inferInsert;
