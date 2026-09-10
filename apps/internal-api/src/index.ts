export * from "./server.js";
import { getConfig } from "../../../packages/core/src/config.js";
import { InternalApiServer } from "./server.js";

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = getConfig();
  new InternalApiServer({ port: config.internalApiPort }).listen();
}
