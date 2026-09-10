CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  issuer TEXT,
  name TEXT,
  home_domain TEXT,
  decimals INTEGER NOT NULL DEFAULT 7,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  price_usd NUMERIC(30, 12),
  volume_24h_usd NUMERIC(30, 2),
  liquidity_usd NUMERIC(30, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
