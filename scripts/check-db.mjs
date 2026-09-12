import { randomBytes } from "node:crypto";
import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const name = `gameon_test_${randomBytes(6).toString("hex")}`;
const db = new PrismaClient();
let created = false;
let child;
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    stopping = true;
    child?.kill(signal);
  });
}

function run(args, env) {
  return new Promise((accept, reject) => {
    if (stopping) return reject(new Error("Checks interrupted"));
    child = spawn(process.execPath, args, { env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => {
      child = undefined;
      if (code === 0) accept();
      else reject(new Error("Database checks failed"));
    });
  });
}

async function check() {
  if (!process.env.DATABASE_URL || !URL.canParse(process.env.DATABASE_URL))
    throw new Error("DATABASE_URL is required");
  const url = new URL(process.env.DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("PostgreSQL is required");
  url.pathname = `/${name}`;
  const env = {
    ...process.env,
    DATABASE_URL: url.toString(),
    NODE_ENV: "test",
    APP_ORIGIN: "http://localhost:8080",
    JWT_SECRET: "",
  };
  const directory = resolve(
    process.env.API_TEST_ROOT || "apps/api/dist/test/test/integration",
  );
  const files = (await readdir(directory))
    .filter((file) => file.endsWith(".test.js"))
    .sort();
  if (!files.length) throw new Error("No compiled integration tests found");
  try {
    await db.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
    created = true;
    await run(
      [
        "node_modules/prisma/build/index.js",
        "migrate",
        "deploy",
        "--schema",
        "apps/api/prisma/schema.prisma",
      ],
      env,
    );
    await run(
      ["--test", ...files.map((file) => resolve(directory, file))],
      env,
    );
  } finally {
    if (created)
      await db.$executeRawUnsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
  }
}

check()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
