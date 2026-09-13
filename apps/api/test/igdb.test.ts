import assert from "node:assert/strict";
import { test } from "node:test";
import { catalogue } from "../src/seed/catalogue";
import { fetchGames } from "../src/seed/igdb";
import { igdbFixture, mockIgdb } from "./fixtures/igdb";

const config = { clientId: "test-client", clientSecret: "test-secret" };

test("IGDB import fetches all curated games and builds HTTPS cover URLs", async () => {
  const requests: { url: string; init?: RequestInit }[] = [];
  const games = await fetchGames(config, async (input, init) => {
    requests.push({ url: String(input), init });
    return mockIgdb(input, init);
  });
  assert.equal(games.length, catalogue.length);
  assert.ok(
    games.every(
      (game) =>
        game.platform === "PC" &&
        game.imageUrl.startsWith(
          "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/",
        ),
    ),
  );
  assert.equal(Object.hasOwn(games[0]!, "price"), false);
  assert.equal(requests.length, 2);
  assert.ok(!requests[0]!.url.includes(config.clientSecret));
  assert.equal(
    (requests[0]!.init!.body as URLSearchParams).get("grant_type"),
    "client_credentials",
  );
  assert.equal(
    new Headers(requests[1]!.init!.headers).get("Authorization"),
    "Bearer test-token",
  );
  assert.ok(String(requests[1]!.init!.body).includes("cover.image_id"));
  assert.ok(String(requests[1]!.init!.body).includes("limit 50"));
});

test("IGDB import requires credentials before requesting data", async () => {
  let calls = 0;
  await assert.rejects(
    fetchGames({ clientId: "", clientSecret: "" }, async () => {
      calls++;
      return Response.json({});
    }),
    /IGDB_CLIENT_ID/,
  );
  assert.equal(calls, 0);
});

test("IGDB rejects missing games, missing covers and invalid platform metadata", async () => {
  for (const body of [
    [],
    {},
    igdbFixture().slice(1),
    igdbFixture().map((game) => ({ ...game, cover: null })),
    igdbFixture().map((game) => ({ ...game, platforms: [] })),
  ]) {
    await assert.rejects(
      fetchGames(config, async (input) =>
        String(input).includes("oauth2")
          ? Response.json({ access_token: "test" })
          : Response.json(body),
      ),
      /IGDB/,
    );
  }
});

test("IGDB retries rate limits and transient server failures without logging credentials", async () => {
  let calls = 0;
  const waits: number[] = [];
  const result = await fetchGames(
    config,
    async (input, init) => {
      calls++;
      if (calls === 1) return new Response(null, { status: 429 });
      if (calls === 2) return new Response(null, { status: 503 });
      return mockIgdb(input, init);
    },
    async (ms) => {
      waits.push(ms);
    },
  );
  assert.equal(result.length, 12);
  assert.deepEqual(waits, [1000, 2000]);
  assert.equal(calls, 4);
  await assert.rejects(
    fetchGames(
      config,
      async () => new Response("private details", { status: 401 }),
    ),
    /^Error: IGDB import failed: HTTP 401$/,
  );
});

test("IGDB retries are bounded", async () => {
  let calls = 0;
  await assert.rejects(
    fetchGames(
      config,
      async () => {
        calls++;
        return new Response(null, { status: 503 });
      },
      async () => {},
    ),
    /HTTP 503/,
  );
  assert.equal(calls, 3);
});
