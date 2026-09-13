import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const base = "http://localhost:3000/api";
const db = new PrismaClient();
const started = performance.now();
const name = `Smoke ${randomUUID()}`;
const email = `smoke-${randomUUID()}@gameon.test`;
const admin = {};
const player = {};
const covered = new Set();
let specification;
let requests = 0;

function section(title) {
  console.log(`\n${"=".repeat(72)}\n${title}\n${"=".repeat(72)}`);
}

function json(value) {
  return JSON.stringify(
    value,
    (key, value) =>
      ["password", "passwordHash", "accessToken", "refreshToken"].includes(key)
        ? "[hidden]"
        : value,
    2,
  )
    .split("\n")
    .map((line) => `      ${line}`)
    .join("\n");
}

async function call(method, path, status, body, session) {
  requests++;
  console.log(
    `\n[${String(requests).padStart(2, "0")}] ${method} /api${path}\n${"-".repeat(72)}`,
  );
  console.log("  REQUEST");
  if (session)
    console.log(
      `    Account: ${session === admin ? "administrator" : "temporary player"}`,
    );
  if (session?.token) console.log("    Authorization: Bearer [hidden]");
  if (session?.cookie) console.log("    Cookie: gameon_refresh=[hidden]");
  console.log(
    body === undefined ? "    Body: none" : `    Body (JSON):\n${json(body)}`,
  );
  const response = await fetch(`${base}${path}`, {
    method,
    signal: AbortSignal.timeout(10000),
    headers: {
      "Content-Type": "application/json",
      "X-GameON-CSRF": "1",
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(session?.cookie ? { Cookie: session.cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  console.log(
    `\n  RESPONSE\n    Status: ${response.status} ${response.statusText}`,
  );
  console.log(
    `    Content-Type: ${response.headers.get("content-type") ?? "none"}`,
  );
  let result;
  if (text) {
    assert.match(response.headers.get("content-type"), /application\/json/);
    result = JSON.parse(text);
    console.log(`    Body (JSON):\n${json(result)}`);
  } else console.log("    Body: none");
  if (session) {
    const cookie = response.headers.get("set-cookie");
    if (cookie) session.cookie = cookie.split(";")[0];
    if (result?.accessToken) session.token = result.accessToken;
  }
  assert.equal(
    response.status,
    status,
    `${method} ${path}: expected ${status}, received ${response.status}`,
  );
  if (status === 204) assert.equal(text, "");
  else assert.ok(text, "Expected a JSON response body");
  const route = Object.keys(specification.paths).find((route) =>
    new RegExp(`^${route.replace(/\{[^}]+\}/g, "[^/]+")}$`).test(
      `/api${path.split("?")[0]}`,
    ),
  );
  if (response.ok) covered.add(`${method.toLowerCase()} ${route}`);
  console.log(`\n  RESULT: PASS (expected ${status})`);
  return result;
}

async function demonstrate() {
  const response = await fetch(`${base}/docs-json`, {
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, 200, "OpenAPI must be available");
  specification = await response.json();
  console.log("GameON API demonstration");
  section("1. HEALTH");
  await call("GET", "/health", 200);
  section("2. AUTHENTICATION");
  await call(
    "POST",
    "/auth/login",
    200,
    { email: "admin@gameon.test", password: "Demo1234" },
    admin,
  );
  await call(
    "POST",
    "/auth/register",
    201,
    { email, password: "Demo1234", displayName: "Smoke player" },
    player,
  );
  await call("POST", "/auth/refresh", 200, undefined, player);
  await call("GET", "/auth/me", 200, undefined, player);

  section("3. CATEGORIES");
  const category = await call(
    "POST",
    "/categories",
    201,
    { name, description: "Temporary demonstration category" },
    admin,
  );
  await call("GET", "/categories?pageSize=1", 200);
  await call("GET", `/categories/${category.id}`, 200);
  await call(
    "PATCH",
    `/categories/${category.id}`,
    200,
    { description: "Updated demonstration category" },
    admin,
  );

  section("4. GAMES");
  const game = await call(
    "POST",
    "/games",
    201,
    {
      categoryId: category.id,
      title: name,
      description: "Temporary demonstration game",
      platform: "PC",
    },
    admin,
  );
  const games = await call("GET", `/games?categoryId=${category.id}`, 200);
  assert.equal(games.items[0].id, game.id);
  await call("GET", `/games/${game.id}`, 200);
  await call(
    "PATCH",
    `/games/${game.id}`,
    200,
    { description: "Updated demonstration game" },
    admin,
  );

  section("5. REVIEWS");
  const review = await call(
    "POST",
    `/games/${game.id}/reviews`,
    201,
    { rating: 5, text: "Demonstration review" },
    player,
  );
  const reviews = await call("GET", `/games/${game.id}/reviews`, 200);
  assert.equal(reviews.items[0].id, review.id);
  const nested = await call(
    "GET",
    `/categories/${category.id}/games/${game.id}/reviews`,
    200,
  );
  assert.equal(nested.items[0].id, review.id);
  await call(
    "GET",
    `/categories/${randomUUID()}/games/${game.id}/reviews`,
    404,
  );
  await call("GET", `/games/${game.id}/reviews/${review.id}`, 200);
  const updated = await call(
    "PATCH",
    `/games/${game.id}/reviews/${review.id}`,
    200,
    { rating: 4 },
    player,
  );
  assert.equal(updated.rating, 4);

  section("6. EXPECTED ERRORS");
  await call("PATCH", `/games/${game.id}`, 400, { title: "" }, admin);
  await call("GET", `/games/${randomUUID()}`, 404);
  await call("GET", "/categories?search=%00", 400);
  await call("GET", "/games?search=%00", 400);
  await call("GET", "/auth/me", 401);
  await call("POST", "/categories", 403, {}, player);
  await call(
    "POST",
    "/categories",
    409,
    { name, description: "Duplicate category" },
    admin,
  );
  section("7. DELETION AND SIGN-OUT");
  await call(
    "DELETE",
    `/games/${game.id}/reviews/${review.id}`,
    204,
    undefined,
    player,
  );
  await call("DELETE", `/games/${game.id}`, 204, undefined, admin);
  await call("DELETE", `/categories/${category.id}`, 204, undefined, admin);
  await call("POST", "/auth/logout", 204, undefined, player);
  player.cookie = undefined;
  await call("POST", "/auth/logout", 204, undefined, admin);
  admin.cookie = undefined;

  const methods = ["get", "post", "put", "patch", "delete", "head", "options"];
  const operations = Object.entries(specification.paths).flatMap(
    ([path, operations]) =>
      Object.keys(operations)
        .filter((method) => methods.includes(method))
        .map((method) => `${method} ${path}`),
  );
  const missing = operations.filter((operation) => !covered.has(operation));
  assert.equal(
    missing.length,
    0,
    `Undemonstrated methods: ${missing.join(", ")}`,
  );
  return operations.length;
}

async function cleanup() {
  try {
    for (const session of [player, admin]) {
      if (session.cookie)
        await call("POST", "/auth/logout", 204, undefined, session);
    }
  } finally {
    await db.$transaction([
      db.review.deleteMany({ where: { author: { email } } }),
      db.game.deleteMany({ where: { category: { name } } }),
      db.category.deleteMany({ where: { name } }),
      db.user.deleteMany({ where: { email } }),
    ]);
  }
}

try {
  const total = await demonstrate();
  await cleanup();
  section("SUMMARY");
  console.log(
    `  Result:       PASS\n  API methods:  ${total}/${total}\n  HTTP calls:   ${requests}\n  Error cases:  400, 401, 403, 404, 409 verified\n  Cleanup:      Temporary data removed\n  Duration:     ${((performance.now() - started) / 1000).toFixed(2)} s`,
  );
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  try {
    await cleanup();
  } catch (error) {
    console.error(`Cleanup failed for ${name}, ${email}: ${error.message}`);
  }
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
