export * from "./server.js";
import { getConfig } from "../../../packages/core/src/config.js";
import { InternalApiServer } from "./server.js";

if (import.meta.url === `file://${process.argv[1]}`) {
  // Render and most hosts inject PORT; fall back to the configured dev port.
  const port = Number(process.env["PORT"] ?? getConfig().internalApiPort);
  new InternalApiServer({ port, host: "0.0.0.0" }).listen();
}
