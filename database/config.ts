// Migration runner configuration (points at database/migrations).
export const drizzleConfig = {
  schema: "./packages/models/src/*.ts",
  out: "./database/migrations",
  dialect: "postgresql" as const,
};
