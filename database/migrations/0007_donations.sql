CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY,
  contract_id TEXT NOT NULL,
  creator TEXT NOT NULL,
  beneficiary TEXT NOT NULL,
  token TEXT NOT NULL,
  goal NUMERIC(38, 0) NOT NULL,
  raised NUMERIC(38, 0) NOT NULL DEFAULT 0,
  deadline BIGINT NOT NULL,
  open BOOLEAN NOT NULL DEFAULT TRUE,
  created_ledger INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS donations (
  id TEXT PRIMARY KEY,
  receipt_id INTEGER NOT NULL,
  campaign_id INTEGER NOT NULL REFERENCES campaigns (id),
  donor TEXT NOT NULL,
  amount NUMERIC(38, 0) NOT NULL,
  ledger INTEGER NOT NULL,
  tx_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS donations_campaign_idx ON donations (campaign_id, receipt_id DESC);
CREATE INDEX IF NOT EXISTS donations_donor_idx ON donations (donor);
