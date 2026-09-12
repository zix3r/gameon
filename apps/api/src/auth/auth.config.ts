import { randomBytes } from "node:crypto";

export const AUTH_SETTINGS = Symbol("AUTH_SETTINGS");
export const ACCESS_SECONDS = 15 * 60;
export const REFRESH_MS = 30 * 24 * 60 * 60 * 1000;
export const REFRESH_COOKIE = "gameon_refresh";

export function readAuthConfig(env: NodeJS.ProcessEnv = process.env) {
  const secret = env.JWT_SECRET || randomBytes(32).toString("hex");
  if (secret.length < 32)
    throw new Error("JWT_SECRET must contain at least 32 characters");
  const origin = env.APP_ORIGIN || "http://localhost:8080";
  if (!URL.canParse(origin))
    throw new Error("APP_ORIGIN must be an HTTP or HTTPS origin");
  const url = new URL(origin);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("APP_ORIGIN must be an HTTP or HTTPS origin");
  return {
    secret,
    origin: url.origin,
    secureCookies: url.protocol === "https:",
  };
}

export type AuthSettings = ReturnType<typeof readAuthConfig>;
