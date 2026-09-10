-- Unique constraints: one registry row per code+issuer, pool, swap event.
CREATE UNIQUE INDEX IF NOT EXISTS uq_assets_code_issuer ON assets (code, issuer);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pools_protocol_id ON pools (protocol, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_swaps_tx_hash_id ON swaps (tx_hash, id);
-- Lookup indexes for API hot paths.
CREATE INDEX IF NOT EXISTS idx_pools_tokens ON pools (token_a_id, token_b_id);
CREATE INDEX IF NOT EXISTS idx_pools_protocol ON pools (protocol);
CREATE INDEX IF NOT EXISTS idx_swaps_pool_time ON swaps (pool_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_swaps_protocol_time ON swaps (protocol, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_swaps_pair_time ON swaps (input_asset_id, output_asset_id, occurred_at DESC);
-- Time-partitioning-ready history indexes (native range partitioning can be
-- adopted per-month once volume requires it; BRIN keeps scans cheap).
CREATE INDEX IF NOT EXISTS idx_swaps_occurred_brin ON swaps USING BRIN (occurred_at);
CREATE INDEX IF NOT EXISTS idx_prices_asset_brin ON prices USING BRIN (asset_id, recorded_at);
-- Candles table for OHLCV history (written by the analytics engine).
CREATE TABLE IF NOT EXISTS candles (
  market_id TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  bucket_start TIMESTAMPTZ NOT NULL,
  open NUMERIC(30, 12) NOT NULL,
  high NUMERIC(30, 12) NOT NULL,
  low NUMERIC(30, 12) NOT NULL,
  close NUMERIC(30, 12) NOT NULL,
  volume_usd NUMERIC(30, 2) NOT NULL DEFAULT 0,
  trade_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (market_id, timeframe, bucket_start)
);
CREATE INDEX IF NOT EXISTS idx_candles_market_tf_time ON candles (market_id, timeframe, bucket_start DESC);
