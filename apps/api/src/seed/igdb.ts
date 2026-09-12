import { setTimeout as sleep } from "node:timers/promises";
import { catalogue } from "./catalogue";

export interface ImportedGame {
  slug: string;
  igdbId: number;
  title: string;
  description: string;
  imageUrl: string;
  platform: string;
  category: string;
  price: string;
}

export interface IgdbConfig {
  clientId: string;
  clientSecret: string;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid IGDB response");
  return value as Record<string, unknown>;
}

async function requestJson(
  fetcher: typeof fetch,
  pause: (ms: number) => Promise<unknown>,
  url: string,
  init: RequestInit,
): Promise<unknown> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetcher(url, {
      ...init,
      signal: AbortSignal.timeout(20000),
    });
    if (response.ok) return response.json() as Promise<unknown>;
    await response.body?.cancel();
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      await pause(1000 * (attempt + 1));
      continue;
    }
    throw new Error(`IGDB import failed: HTTP ${response.status}`);
  }
  throw new Error("IGDB import failed");
}

export async function fetchGames(
  config: IgdbConfig,
  fetcher: typeof fetch = fetch,
  pause: (ms: number) => Promise<unknown> = sleep,
): Promise<ImportedGame[]> {
  if (!config.clientId.trim() || !config.clientSecret.trim())
    throw new Error("Set IGDB_CLIENT_ID and IGDB_CLIENT_SECRET in .env");
  const token = record(
    await requestJson(fetcher, pause, "https://id.twitch.tv/oauth2/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: "client_credentials",
      }),
    }),
  );
  if (typeof token.access_token !== "string" || !token.access_token)
    throw new Error("Invalid Twitch access token response");
  const slugs = catalogue.map(({ slug }) => JSON.stringify(slug)).join(",");
  const response = await requestJson(
    fetcher,
    pause,
    "https://api.igdb.com/v4/games",
    {
      method: "POST",
      headers: {
        "Client-ID": config.clientId,
        Authorization: `Bearer ${token.access_token}`,
        Accept: "application/json",
        "Content-Type": "text/plain",
      },
      body: `fields id,name,slug,summary,cover.image_id,platforms.name; where slug = (${slugs}); limit 50;`,
    },
  );
  if (!Array.isArray(response)) throw new Error("Invalid IGDB games response");
  const games = response.map(record);
  return catalogue.map((entry) => {
    const matches = games.filter((game) => game.slug === entry.slug);
    if (matches.length !== 1)
      throw new Error(`IGDB must return exactly one game for ${entry.slug}`);
    const game = matches[0]!;
    const cover = record(game.cover);
    const pc =
      Array.isArray(game.platforms) &&
      game.platforms.some(
        (platform: unknown) =>
          record(platform).name === "PC (Microsoft Windows)",
      );
    if (
      typeof game.id !== "number" ||
      !Number.isInteger(game.id) ||
      game.id <= 0 ||
      typeof game.name !== "string" ||
      !game.name.trim() ||
      typeof game.summary !== "string" ||
      !game.summary.trim() ||
      typeof cover.image_id !== "string" ||
      !/^[a-zA-Z0-9_-]+$/.test(cover.image_id) ||
      !pc
    ) {
      throw new Error(`Incomplete IGDB metadata or cover for ${entry.slug}`);
    }
    return {
      ...entry,
      igdbId: game.id,
      title: game.name.trim().slice(0, 200),
      description: game.summary.trim().slice(0, 10000),
      imageUrl: `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${cover.image_id}.jpg`,
      platform: "PC",
    };
  });
}
