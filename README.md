# stellariq-contract (stellariq-data) — Data & Intelligence Layer

The core intelligence engine of StellarIQ: Stellar indexing, protocol
adapters, price aggregation, analytics, and route evaluation. It feeds the
public API in `stellariq-app` (which consumes it through its `DataSource` seam
and its internal API).

```
stellariq-contract/
├── apps/
│   ├── indexer/           # Ledger + Soroban event ingest (pollers, RPC, checkpoint resume)
│   ├── price-engine/      # VWAP / median aggregation with outlier rejection
│   ├── analytics-engine/  # Volume, liquidity, pool metrics, OHLCV, market signals
│   ├── routing-engine/    # Direct / multi-hop / split evaluation, impact, ranking
│   └── internal-api/      # Internal REST contract consumed by stellariq-app
├── packages/
│   ├── core/              # Config, logger, Redis cache, queues, key helpers
│   ├── adapters/          # Ledger/event decoding adapters
│   ├── models/            # Asset, market, pool, swap, price, candle models
│   └── protocols/         # Stellar DEX, Soroswap, Phoenix, Aquarius + registry/math
├── database/              # Postgres client, config, drizzle-run migrations
│   └── migrations/        # 0001_assets … 0006_indexes
├── scripts/               # backfill.mjs and ops helpers
├── tests/                 # unit/* + integration/pipeline (node:test)
└── docker-compose.yml     # postgres + redis + engine services for local dev
```

## Prerequisites

| Tool          | Version              | Notes                                                   |
| ------------- | -------------------- | ------------------------------------------------------- |
| Node.js       | ≥ 20                 | npm workspaces (`apps/*`, `packages/*`)                 |
| PostgreSQL 16 | local or provisioned | migrations via `database/migrate.ts` (drizzle migrator) |
| Redis 7       | local or provisioned | queues + price/quote caches                             |
| Docker        | optional             | per-service images + compose stack                      |

## Quickstart (local stack)

```bash
cp .env.example .env   # defaults target localhost postgres/redis + testnet RPC
npm install

# Start dependencies first (healthy), then the data services:
docker compose up -d postgres redis
npm run build
# run migrations, then start services (see Dockerfiles / compose for wiring)
docker compose up -d indexer price-engine analytics-engine routing-engine
```

Service ports (see `.env.example`): indexer `4101`, price-engine `4102`,
analytics-engine `4103`, routing-engine `4104`, internal-api `4110`.

## Services

| App                           | Entry                                | Responsibility                                                                                                                                                                                 |
| ----------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@stellariq/indexer`          | `apps/indexer/src/index.ts`          | Streams ledgers + Soroban events over RPC (`rpc.ts`, `poller.ts`), resumes from checkpoints; services for asset discovery/metadata, market/pool/swap indexing, backfill and consistency checks |
| `@stellariq/price-engine`     | `apps/price-engine/src/index.ts`     | VWAP (`vwap.ts`), median (`median.ts`), outlier rejection (`outlier.ts`) → standardized prices with confidence                                                                                 |
| `@stellariq/analytics-engine` | `apps/analytics-engine/src/index.ts` | Volume, liquidity, per-pool metrics, OHLCV candles, swap stats; signals for whales, price discrepancies and liquidity events                                                                   |
| `@stellariq/routing-engine`   | `apps/routing-engine/src/index.ts`   | Direct / multi-hop / split evaluation (`direct.ts`, `multihop.ts`, `split.ts`), price impact, net-output ranking, route explanations                                                           |
| `@stellariq/internal-api`     | `apps/internal-api/src/index.ts`     | Plain `node:http` REST contract (`server.ts`) for assets, prices, markets, pools and quotes consumed by `stellariq-app`                                                                        |

Cross-package imports are relative (`../../../packages/core/src/…`); compiled
output lands in `dist/` mirroring the repo tree (see `tsconfig.build.json`),
so services run as `node dist/apps/<name>/src/index.js` — exactly what the
per-service Dockerfiles do (multi-stage, non-root `stellariq` user,
file-presence healthcheck).

## Packages

- **`@stellariq/core`** — `getConfig()` (env validation), structured logger,
  Redis cache helpers, queue definitions (`QUEUES.ledgers`, …) + client, key
  helpers.
- **`@stellariq/adapters`** — adapter interface plus ledger/event decoding
  shared by the indexer.
- **`@stellariq/models`** — table models for assets, markets, pools, swaps,
  prices and candles.
- **`@stellariq/protocols`** — per-protocol integrations (Stellar DEX incl.
  trades, Soroswap, Phoenix, Aquarius) behind a registry, with shared AMM math.

## Database

`database/` holds the Postgres client (`client.ts`), config (`config.ts`) and
the migrator (`migrate.ts`, drizzle, lexical order over
`database/migrations/`):

`0001_assets` · `0002_markets` · `0003_pools` · `0004_swaps` · `0005_prices` ·
`0006_indexes`

## Environment reference

| Variable                                                                                                     | Default                                                   | Purpose                                             |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | --------------------------------------------------- |
| `DATABASE_URL`                                                                                               | `postgres://stellariq:stellariq@localhost:5432/stellariq` | Postgres (provisioned by `stellariq-infra` in prod) |
| `REDIS_URL`                                                                                                  | `redis://localhost:6379`                                  | Queues + caches                                     |
| `STELLAR_RPC_URL` / `HORIZON_URL`                                                                            | Soroban/Horizon testnet                                   | Ledger + event sources                              |
| `NETWORK_PASSPHRASE`                                                                                         | `Test SDF Network ; September 2015`                       | Stellar network identity                            |
| `INDEXER_PORT` / `PRICE_ENGINE_PORT` / `ANALYTICS_ENGINE_PORT` / `ROUTING_ENGINE_PORT` / `INTERNAL_API_PORT` | `4101`–`4104`, `4110`                                     | Service ports                                       |

## Scripts

| Script              | What it does                                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build`     | `tsc -p tsconfig.build.json` → `dist/` (no declarations)                                                                                |
| `npm run typecheck` | `tsc --noEmit` over the full workspace                                                                                                  |
| `npm run lint`      | ESLint (flat config)                                                                                                                    |
| `npm test`          | build, then `node --test tests/` — unit suites (`vwap`, `outlier`, `routing`, `adapters`, `signals`) plus the integration pipeline test |

## How stellariq-app consumes this repo

`stellariq-app` never imports this code directly. Its API reads through a
`DataSource` interface backed by a mock seed dataset, and its frontend/SDK hit
the public REST/WS surface. Swap in this layer by pointing the app at the
internal API (`DATA_API_URL`) — the response shapes already match the mock.

## License

See [LICENSE](LICENSE).
