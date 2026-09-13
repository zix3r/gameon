import assert from "node:assert/strict";
import { test } from "node:test";
import { scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import {
  categories,
  catalogue,
  demoReviews,
  demoUsers,
} from "../../src/seed/catalogue";
import { fetchGames } from "../../src/seed/igdb";
import {
  demoPassword,
  persistSeed,
  runSeed,
  seedId,
} from "../../src/seed/seed";
import { mockIgdb } from "../fixtures/igdb";

const env = {
  NODE_ENV: "development",
  IGDB_CLIENT_ID: "test",
  IGDB_CLIENT_SECRET: "test",
};

test("Seeding: atomic, repeatable, non-destructive and usable in production", async () => {
  assert.match(
    new URL(process.env.DATABASE_URL ?? "").pathname,
    /^\/gameon_test_[a-f0-9]{12}$/,
  );
  const db = new PrismaClient();
  const userIds = demoUsers.map((user) => seedId(`user:${user.email}`));
  const gameIds = catalogue.map((game) => seedId(`game:${game.slug}`));
  const categoryIds = categories.map((category) =>
    seedId(`category:${category.name}`),
  );
  async function counts() {
    return Promise.all([
      db.category.count({ where: { id: { in: categoryIds } } }),
      db.game.count({ where: { id: { in: gameIds } } }),
      db.user.count({ where: { id: { in: userIds } } }),
      db.review.count({ where: { authorId: { in: userIds } } }),
    ]);
  }
  async function clear() {
    await db.review.deleteMany({ where: { authorId: { in: userIds } } });
    await db.game.deleteMany({ where: { id: { in: gameIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.category.deleteMany({ where: { id: { in: categoryIds } } });
  }
  try {
    assert.deepEqual(await counts(), [0, 0, 0, 0]);
    await assert.rejects(
      runSeed(db, env, async (input) =>
        String(input).includes("oauth2")
          ? Response.json({ access_token: "test" })
          : Response.json([]),
      ),
      /IGDB/,
    );
    assert.deepEqual(await counts(), [0, 0, 0, 0]);
    const imported = await fetchGames(
      { clientId: "test", clientSecret: "test" },
      mockIgdb,
    );
    await assert.rejects(
      persistSeed(
        db,
        imported.map((game) => ({ ...game, category: "Not a seed category" })),
      ),
      /Unknown seed category/,
    );
    assert.deepEqual(await counts(), [0, 0, 0, 0]);

    const first = await runSeed(db, env, mockIgdb);
    assert.equal(first.games, 12);
    assert.deepEqual(await counts(), [6, 12, 3, demoReviews.length]);
    const playerId = seedId("user:demo@gameon.test");
    const player = await db.user.findUniqueOrThrow({ where: { id: playerId } });
    assert.equal(player.displayName, "Demo");
    assert.notEqual(player.passwordHash, demoPassword);
    const [algorithm, cost, r, p, salt, key] = player.passwordHash.split("$");
    assert.equal(algorithm, "scrypt");
    assert.equal(
      scryptSync(demoPassword, salt!, 64, {
        N: Number(cost),
        r: Number(r),
        p: Number(p),
        maxmem: 64 * 1024 * 1024,
      }).toString("hex"),
      key,
    );
    assert.equal(
      await db.game.count({ where: { id: { in: gameIds }, imageUrl: null } }),
      0,
    );
    assert.equal(
      await db.game.count({ where: { categoryId: seedId("category:Racing") } }),
      0,
    );
    assert.equal(
      await db.review.count({ where: { gameId: seedId("game:factorio") } }),
      0,
    );

    const gameId = seedId("game:hades");
    await db.game.update({
      where: { id: gameId },
      data: { title: "Edited title" },
    });
    const second = await runSeed(db, env, mockIgdb);
    assert.deepEqual(second.users, first.users);
    assert.deepEqual(await counts(), [6, 12, 3, demoReviews.length]);
    assert.equal(
      (await db.game.findUniqueOrThrow({ where: { id: gameId } })).title,
      "Edited title",
    );
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: playerId } }))
        .passwordHash,
      player.passwordHash,
    );

    await clear();
    await runSeed(db, { ...env, NODE_ENV: "production" }, mockIgdb);
    assert.deepEqual(await counts(), [6, 12, 3, demoReviews.length]);
    const productionHash = (
      await db.user.findUniqueOrThrow({ where: { id: playerId } })
    ).passwordHash.split("$");
    assert.equal(
      scryptSync(demoPassword, productionHash[4]!, 64, {
        N: 32768,
        r: 8,
        p: 3,
        maxmem: 64 * 1024 * 1024,
      }).toString("hex"),
      productionHash[5],
    );
  } finally {
    await clear();
    await db.$disconnect();
  }
});
