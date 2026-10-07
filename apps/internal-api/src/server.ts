// Internal data API: the REST contract consumed by stellariq-app through its
// RemoteDataSource (DATA_API_URL). Every response is computed by the engines in
// this repo over seeded testnet reserves — see dataset.ts.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createLogger } from "../../../packages/core/src/logger.js";
import { dataset } from "./dataset.js";
import type { Protocol, Timeframe } from "./contract.js";

export interface InternalApiOptions {
  port: number;
  host?: string;
}

type Result = { status: number; body: unknown };

const PROTOCOLS: Protocol[] = ["stellar-dex", "soroswap", "phoenix", "aqua"];
const TIMEFRAMES: Timeframe[] = ["1H", "4H", "1D", "1W", "1M"];

function asProtocol(v: string | null): Protocol | undefined {
  return v && (PROTOCOLS as string[]).includes(v) ? (v as Protocol) : undefined;
}

function asTimeframe(v: string | null): Timeframe {
  return v && (TIMEFRAMES as string[]).includes(v) ? (v as Timeframe) : "1D";
}

function asInt(v: string | null, fallback: number): number {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export class InternalApiServer {
  private logger = createLogger("internal-api");

  constructor(private options: InternalApiOptions) {}

  // Routes a single request. Exposed for tests without opening a socket.
  handle(method: string, rawUrl: string): Result {
    if (method !== "GET") return { status: 405, body: { error: "method_not_allowed" } };
    const url = new URL(rawUrl, "http://internal");
    const q = url.searchParams;
    const seg = url.pathname.split("/").filter(Boolean).map((s) => decodeURIComponent(s));

    // health
    if (eq(seg, ["health"])) return ok({ status: "ok", service: "internal-api", timestamp: Date.now() });
    if (eq(seg, ["ready"])) return ok({ ready: true });

    if (seg[0] !== "v1") return notFound(url.pathname);
    const r = seg.slice(1);

    // assets
    if (eq(r, ["assets"]))
      return ok(
        dataset.listAssets({
          search: q.get("search") ?? undefined,
          verifiedOnly: q.get("verified") === "true",
          page: asInt(q.get("page"), 1),
          limit: asInt(q.get("limit"), 50),
        }),
      );
    if (r.length === 2 && r[0] === "assets") {
      const a = dataset.getAsset(r[1]!);
      return a ? ok(a) : notFound(url.pathname);
    }

    // markets
    if (eq(r, ["markets"]))
      return ok(
        dataset.listMarkets({
          protocol: asProtocol(q.get("protocol")),
          sort: (q.get("sort") as "volume" | "liquidity" | "change") || "volume",
          page: asInt(q.get("page"), 1),
          limit: asInt(q.get("limit"), 50),
        }),
      );
    if (r.length === 2 && r[0] === "markets") {
      const m = dataset.getMarket(r[1]!);
      return m ? ok(m) : notFound(url.pathname);
    }

    // pools
    if (eq(r, ["pools"]))
      return ok(
        dataset.listPools({
          protocol: asProtocol(q.get("protocol")),
          sort: (q.get("sort") as "tvl" | "volume") || "tvl",
          page: asInt(q.get("page"), 1),
          limit: asInt(q.get("limit"), 50),
        }),
      );
    if (r.length === 2 && r[0] === "pools") {
      const p = dataset.getPool(r[1]!);
      return p ? ok(p) : notFound(url.pathname);
    }

    // swaps
    if (eq(r, ["swaps", "recent"]))
      return ok(
        dataset.recentSwaps(asInt(q.get("limit"), 20), {
          asset: q.get("asset") ?? undefined,
          protocol: asProtocol(q.get("protocol")),
        }),
      );
    if (eq(r, ["swaps"]))
      return ok(
        dataset.listSwaps({
          asset: q.get("asset") ?? undefined,
          pool: q.get("pool") ?? undefined,
          protocol: asProtocol(q.get("protocol")),
          page: asInt(q.get("page"), 1),
          limit: asInt(q.get("limit"), 50),
        }),
      );

    // prices
    if (r.length === 3 && r[0] === "prices" && r[2] === "history")
      return ok(dataset.priceHistory(r[1]!, asTimeframe(q.get("timeframe"))));
    if (r.length === 2 && r[0] === "prices") {
      const p = dataset.getPrice(r[1]!);
      return p ? ok(p) : notFound(url.pathname);
    }

    // analytics
    if (eq(r, ["analytics", "volume"])) return ok(dataset.volumeSeries(asTimeframe(q.get("timeframe"))));
    if (eq(r, ["analytics", "liquidity"]))
      return ok(dataset.liquiditySeries(q.get("asset") ?? undefined, asTimeframe(q.get("timeframe"))));

    // routes (pool reserves for a pair)
    if (eq(r, ["routes"])) {
      const from = q.get("from");
      const to = q.get("to");
      if (!from || !to) return { status: 400, body: { error: "missing_from_or_to" } };
      return ok(dataset.routesFor(from, to));
    }

    return notFound(url.pathname);
  }

  listen(): void {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      let result: Result;
      try {
        result = this.handle(req.method ?? "GET", req.url ?? "/");
      } catch (error) {
        this.logger.error(`request failed: ${String(error)}`);
        result = { status: 500, body: { error: "internal", message: String(error) } };
      }
      res.writeHead(result.status, {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "cache-control": "no-store",
      });
      res.end(JSON.stringify(result.body));
    });
    server.listen(this.options.port, this.options.host ?? "0.0.0.0", () => {
      this.logger.info(`internal data api listening on ${this.options.host ?? "0.0.0.0"}:${this.options.port}`);
    });
  }
}

function ok(body: unknown): Result {
  return { status: 200, body };
}
function notFound(path: string): Result {
  return { status: 404, body: { error: "not_found", path } };
}
function eq(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
