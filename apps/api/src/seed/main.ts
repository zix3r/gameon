import { PrismaClient } from "@prisma/client";
import { runSeed } from "./seed";

const db = new PrismaClient();
runSeed(db)
  .then((result) => {
    console.log(
      `Seed complete: ${result.games} games. Existing records were preserved.`,
    );
    console.table(result.users);
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Seed failed");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
