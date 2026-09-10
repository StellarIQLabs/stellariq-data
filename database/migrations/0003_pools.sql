CREATE TABLE IF NOT EXISTS pools (
  id TEXT PRIMARY KEY,
  protocol TEXT NOT NULL,
  token_a_id TEXT NOT NULL,
  token_b_id TEXT NOT NULL,
  reserve_a NUMERIC(38, 12) NOT NULL DEFAULT 0,
  reserve_b NUMERIC(38, 12) NOT NULL DEFAULT 0,
  tvl_usd NUMERIC(30, 2),
  fee_bps INTEGER NOT NULL DEFAULT 30,
  volume_24h_usd NUMERIC(30, 2),
  updated_ledger INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
