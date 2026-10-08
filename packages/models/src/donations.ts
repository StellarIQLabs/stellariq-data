// StellarIQ Give tables: campaigns and the donation receipts indexed from the
// donations contract. Amounts are stored in stroops (7 decimals) as numerics.
import { pgTable, text, numeric, integer, bigint, boolean, timestamp } from "drizzle-orm/pg-core";

export const campaigns = pgTable("campaigns", {
  id: integer("id").primaryKey(),
  contractId: text("contract_id").notNull(),
  creator: text("creator").notNull(),
  beneficiary: text("beneficiary").notNull(),
  token: text("token").notNull(),
  goal: numeric("goal", { precision: 38, scale: 0 }).notNull(),
  raised: numeric("raised", { precision: 38, scale: 0 }).notNull().default("0"),
  deadline: bigint("deadline", { mode: "number" }).notNull(),
  open: boolean("open").notNull().default(true),
  createdLedger: integer("created_ledger").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const donations = pgTable("donations", {
  id: text("id").primaryKey(),
  receiptId: integer("receipt_id").notNull(),
  campaignId: integer("campaign_id").notNull(),
  donor: text("donor").notNull(),
  amount: numeric("amount", { precision: 38, scale: 0 }).notNull(),
  ledger: integer("ledger").notNull(),
  txHash: text("tx_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type Donation = typeof donations.$inferSelect;
export type NewDonation = typeof donations.$inferInsert;
