import { createHash } from "node:crypto";
import { hashPassword } from "../auth/password";
import { type PrismaClient } from "@prisma/client";
import { categories, demoReviews, demoUsers } from "./catalogue";
import { fetchGames, type ImportedGame } from "./igdb";

export const demoPassword = "Demo1234";

export function seedId(key: string) {
  const bytes = createHash("sha256")
    .update(`gameon-seed:${key}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6]! & 15) | 64;
  bytes[8] = (bytes[8]! & 63) | 128;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function persistSeed(db: PrismaClient, games: ImportedGame[]) {
  const users: Array<(typeof demoUsers)[number] & { passwordHash: string }> =
    [];
  for (const user of demoUsers)
    users.push({ ...user, passwordHash: await hashPassword(demoPassword) });
  return db.$transaction(
    async (tx) => {
      const categoryIds = new Map<string, string>();
      for (const category of categories) {
        const saved = await tx.category.upsert({
          where: { name: category.name },
          update: {},
          create: { id: seedId(`category:${category.name}`), ...category },
        });
        categoryIds.set(category.name, saved.id);
      }
      const userIds = new Map<string, string>();
      for (const user of users) {
        const saved = await tx.user.upsert({
          where: { email: user.email },
          update: {},
          create: { id: seedId(`user:${user.email}`), ...user },
        });
        userIds.set(user.email, saved.id);
      }
      const gameIds = new Map<string, string>();
      for (const imported of games) {
        const { slug, category, ...game } = imported;
        const categoryId = categoryIds.get(category);
        if (!categoryId) throw new Error(`Unknown seed category: ${category}`);
        const saved = await tx.game.upsert({
          where: { igdbId: game.igdbId },
          update: {},
          create: { id: seedId(`game:${slug}`), categoryId, ...game },
        });
        gameIds.set(slug, saved.id);
      }
      for (const review of demoReviews) {
        const gameId = gameIds.get(review.slug);
        const authorId = userIds.get(review.email);
        if (!gameId || !authorId)
          throw new Error("Incomplete seed review references");
        await tx.review.upsert({
          where: { gameId_authorId: { gameId, authorId } },
          update: {},
          create: {
            id: seedId(`review:${review.slug}:${review.email}`),
            gameId,
            authorId,
            text: review.text,
            rating: review.rating,
          },
        });
      }
      for (const [email, slug] of [
        ["matas@gameon.test", "hades"],
        ["demo@gameon.test", "the-witcher-3-wild-hunt"],
      ]) {
        const userId = userIds.get(email!);
        const gameId = gameIds.get(slug!);
        if (!userId || !gameId)
          throw new Error("Incomplete seed order references");
        const game = await tx.game.findUniqueOrThrow({ where: { id: gameId } });
        const id = seedId(`order:${email}:${slug}`);
        await tx.order.upsert({
          where: { id },
          update: {},
          create: {
            id,
            userId,
            gameId,
            unitPriceAtPurchase: game.price,
            currency: "EUR",
          },
        });
      }
      return {
        games: games.length,
        users: [...userIds].map(([email, id]) => ({ email, id })),
      };
    },
    { timeout: 15000 },
  );
}

export async function runSeed(
  db: PrismaClient,
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch,
) {
  const games = await fetchGames(
    {
      clientId: env.IGDB_CLIENT_ID ?? "",
      clientSecret: env.IGDB_CLIENT_SECRET ?? "",
    },
    fetcher,
  );
  return persistSeed(db, games);
}
