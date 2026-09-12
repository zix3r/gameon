export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const databaseUrl = env.DATABASE_URL;
  if (
    !databaseUrl ||
    !URL.canParse(databaseUrl) ||
    !["postgres:", "postgresql:"].includes(new URL(databaseUrl).protocol)
  ) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection URL");
  }
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return { databaseUrl, port };
}
