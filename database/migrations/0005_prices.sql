CREATE TABLE IF NOT EXISTS prices (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  quote_currency TEXT NOT NULL DEFAULT 'USD',
  price NUMERIC(30, 12) NOT NULL,
  source TEXT NOT NULL,
  confidence NUMERIC(5, 4) NOT NULL DEFAULT 1,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prices_asset_time ON prices (asset_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_prices_recorded_at ON prices (recorded_at DESC);
