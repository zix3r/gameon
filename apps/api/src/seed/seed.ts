import { hashPassword } from "../auth/password";
import { type PrismaClient } from "@prisma/client";
import { categories, demoReviews, demoUsers } from "./catalogue";
import { fetchGames, type ImportedGame } from "./igdb";

export const demoPassword = "Demo1234";

export async function persistSeed(db: PrismaClient, games: ImportedGame[]) {
  const users: Array<(typeof demoUsers)[number] & { passwordHash: string }> =
    [];
  for (const user of demoUsers)
    users.push({ ...user, passwordHash: await hashPassword(demoPassword) });
  return db.$transaction(
    async (tx) => {
      const categoryIds = new Map<string, number>();
      for (const category of categories) {
        const saved = await tx.category.upsert({
          where: { name: category.name },
          update: {},
          create: category,
        });
        categoryIds.set(category.name, saved.id);
      }
      const userIds = new Map<string, number>();
      for (const user of users) {
        const saved = await tx.user.upsert({
          where: { email: user.email },
          update: {},
          create: user,
        });
        userIds.set(user.email, saved.id);
      }
      const gameIds = new Map<string, number>();
      for (const imported of games) {
        const { slug, category, ...game } = imported;
        const categoryId = categoryIds.get(category);
        if (!categoryId) throw new Error(`Unknown seed category: ${category}`);
        const saved = await tx.game.upsert({
          where: { igdbId: game.igdbId },
          update: {},
          create: { categoryId, ...game },
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
            gameId,
            authorId,
            text: review.text,
            rating: review.rating,
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
