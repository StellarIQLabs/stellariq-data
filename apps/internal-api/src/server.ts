// Internal data API: REST contract consumed by stellariq-app for assets,
// prices, markets, pools and quotes.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createLogger } from "../../../packages/core/src/logger.js";

export interface InternalApiOptions {
  port: number;
}

export type RouteHandler = (params: Record<string, string>) => Promise<unknown>;

export class InternalApiServer {
  private routes = new Map<string, RouteHandler>();
  private logger = createLogger("internal-api");

  constructor(private options: InternalApiOptions) {
    this.register("GET /v1/assets", async () => ({ data: [], note: "backed by assets table" }));
    this.register("GET /v1/prices", async () => ({ data: [], note: "backed by price engine" }));
    this.register("GET /v1/markets", async () => ({ data: [], note: "backed by markets table" }));
    this.register("GET /v1/pools", async () => ({ data: [], note: "backed by pools table" }));
    this.register("GET /v1/quotes", async () => ({ data: [], note: "backed by routing engine" }));
  }

  register(route: string, handler: RouteHandler): void {
    this.routes.set(route, handler);
  }

  async handle(method: string, url: string): Promise<{ status: number; body: unknown }> {
    const path = url.split("?")[0] ?? url;
    const handler = this.routes.get(`${method} ${path}`);
    if (!handler) return { status: 404, body: { error: "not_found", path } };
    try {
      return { status: 200, body: await handler({}) };
    } catch (error) {
      return { status: 500, body: { error: "internal", message: String(error) } };
    }
  }

  listen(): void {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      void (async () => {
        const result = await this.handle(req.method ?? "GET", req.url ?? "/");
        res.writeHead(result.status, { "content-type": "application/json" });
        res.end(JSON.stringify(result.body));
      })();
    });
    server.listen(this.options.port, () => {
      this.logger.info(`internal data api listening on :${this.options.port}`);
    });
  }
}
