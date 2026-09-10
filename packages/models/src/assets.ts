// Asset registry table (PRD Asset Intelligence).
import { pgTable, text, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";

export const assets = pgTable("assets", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  issuer: text("issuer"),
  name: text("name"),
  homeDomain: text("home_domain"),
  decimals: integer("decimals").notNull().default(7),
  verified: boolean("verified").notNull().default(false),
  verificationStatus: text("verification_status").notNull().default("unverified"),
  priceUsd: numeric("price_usd", { precision: 30, scale: 12 }),
  volume24hUsd: numeric("volume_24h_usd", { precision: 30, scale: 2 }),
  liquidityUsd: numeric("liquidity_usd", { precision: 30, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
