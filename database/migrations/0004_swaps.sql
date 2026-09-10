CREATE TABLE IF NOT EXISTS swaps (
  id TEXT PRIMARY KEY,
  tx_hash TEXT NOT NULL,
  protocol TEXT NOT NULL,
  pool_id TEXT,
  user_address TEXT,
  input_asset_id TEXT NOT NULL,
  input_amount NUMERIC(38, 12) NOT NULL,
  output_asset_id TEXT NOT NULL,
  output_amount NUMERIC(38, 12) NOT NULL,
  ledger INTEGER,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
