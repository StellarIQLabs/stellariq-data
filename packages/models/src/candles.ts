// OHLCV candle table model (created by migration 0006, aggregated by analytics).
import { pgTable, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";

export const candles = pgTable("candles", {
  marketId: text("market_id").notNull(),
  timeframe: text("timeframe").notNull(),
  bucketStart: timestamp("bucket_start", { withTimezone: true }).notNull(),
  open: numeric("open", { precision: 30, scale: 12 }).notNull(),
  high: numeric("high", { precision: 30, scale: 12 }).notNull(),
  low: numeric("low", { precision: 30, scale: 12 }).notNull(),
  close: numeric("close", { precision: 30, scale: 12 }).notNull(),
  volumeUsd: numeric("volume_usd", { precision: 30, scale: 2 }).notNull().default("0"),
  tradeCount: integer("trade_count").notNull().default(0),
});

export type Candle = typeof candles.$inferSelect;
export type NewCandle = typeof candles.$inferInsert;
