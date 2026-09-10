CREATE TABLE IF NOT EXISTS markets (
  id TEXT PRIMARY KEY,
  base_asset_id TEXT NOT NULL,
  quote_asset_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  price NUMERIC(30, 12),
  price_change_24h_pct NUMERIC(10, 4),
  volume_24h_usd NUMERIC(30, 2),
  liquidity_usd NUMERIC(30, 2),
  trade_count_24h TEXT NOT NULL DEFAULT '0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
