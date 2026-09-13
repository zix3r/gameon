import "reflect-metadata";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { NestFactory } from "@nestjs/core";
import { ThrottlerStorage } from "@nestjs/throttler";
import { Prisma } from "@prisma/client";
import { AppModule } from "../../src/app.module";
import { configureApp } from "../../src/configure-app";
import { DatabaseService } from "../../src/database/database.service";
import { hashPassword } from "../../src/auth/password";
import { type AuthView } from "../../src/auth/auth.dto";
import {
  type CategoryView,
  type GameView,
  type ReviewView,
} from "../../src/common/views";

test("every documented operation/status pair has an executable response contract", async (t) => {
  assert.match(
    new URL(process.env.DATABASE_URL!).pathname,
    /^\/gameon_test_[a-f0-9]{12}$/,
  );
  const app = await NestFactory.create(AppModule, { logger: false });
  const specification = configureApp(app);
  const db = app.get(DatabaseService);
  const covered = new Set<string>();
  const suffix = randomUUID();
  const email = `status-${suffix}@example.test`;
  const password = "Demo1234";
  const adminEmail = `admin-${email}`;
  const missing = 2147483647;
  let cookie = "";
  let token = "";
  try {
    await db.user.create({
      data: {
        email: adminEmail,
        displayName: "Status administrator",
        role: "ADMIN",
        passwordHash: await hashPassword(password),
      },
    });
    t.mock.method(
      app.get<ThrottlerStorage>(ThrottlerStorage),
      "increment",
      async () => ({
        totalHits: 1,
        timeToExpire: 60,
        isBlocked: false,
        timeToBlockExpire: 0,
      }),
    );
    await app.listen(0, "127.0.0.1");
    const base = `${await app.getUrl()}/api`;
    async function send<T = unknown>(
      method: string,
      path: string,
      status: number,
      options: {
        body?: unknown;
        raw?: string;
        token?: string;
        headers?: Record<string, string>;
      } = {},
    ): Promise<T> {
      const response = await fetch(base + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-GameON-CSRF": "1",
          ...(cookie ? { Cookie: cookie } : {}),
          ...(options.token
            ? { Authorization: `Bearer ${options.token}` }
            : {}),
          ...options.headers,
        },
        body:
          options.raw ??
          (options.body === undefined
            ? undefined
            : JSON.stringify(options.body)),
      });
      const text = await response.text();
      assert.equal(response.status, status, `${method} ${path}: ${text}`);
      if (status === 204) {
        assert.equal(text, "");
        assert.equal(response.headers.get("content-type"), null);
      } else {
        assert.match(
          response.headers.get("content-type") ?? "",
          /application\/json/,
        );
      }
      const body = text ? JSON.parse(text) : undefined;
      if (status >= 400) {
        assert.equal(body.statusCode, status);
        assert.ok(
          typeof body.message === "string" || Array.isArray(body.message),
        );
        assert.deepEqual(Object.keys(body).sort(), ["message", "statusCode"]);
        assert.doesNotMatch(
          text,
          /Prisma|SELECT|passwordHash|private fault details/,
        );
      }
      if (status === 401)
        assert.equal(response.headers.get("www-authenticate"), "Bearer");
      if (status === 429)
        assert.ok(Number(response.headers.get("retry-after")) > 0);
      const route = Object.keys(specification.paths).find((route) =>
        new RegExp(`^${route.replace(/\{[^}]+\}/g, "[^/]+")}$`).test(
          `/api${path.split("?")[0]}`,
        ),
      );
      if (route) {
        const operation =
          specification.paths[route]?.[method.toLowerCase() as "get"];
        assert.ok(
          operation?.responses[String(status)],
          `Undocumented ${method} ${route}: ${status}`,
        );
        covered.add(`${method.toLowerCase()} ${route} ${status}`);
      }
      const setCookie = response.headers.get("set-cookie");
      if (response.ok && setCookie) cookie = setCookie.split(";")[0]!;
      return body as T;
    }

    const registration = { email, password, displayName: "Status player" };
    const owner = await send<AuthView>("POST", "/auth/register", 201, {
      body: registration,
    });
    await send("POST", "/auth/register", 409, { body: registration });
    const ownerToken = owner.accessToken;
    const other = await send<AuthView>("POST", "/auth/register", 201, {
      body: { ...registration, email: `other-${email}` },
    });
    const admin = await send<AuthView>("POST", "/auth/login", 200, {
      body: { email: adminEmail, password },
    });
    token = admin.accessToken;
    await send("GET", "/auth/me", 200, { token });
    await send("POST", "/auth/refresh", 200);
    await send("POST", "/auth/login", 401, {
      body: { email: adminEmail, password: "incorrect" },
    });
    await send("POST", "/auth/refresh", 401, {
      headers: { Cookie: "gameon_refresh=invalid" },
    });

    const categoryBody = {
      name: `Status ${suffix}`,
      description: "Status response fixtures",
    };
    const category = await send<CategoryView>("POST", "/categories", 201, {
      token,
      body: categoryBody,
    });
    const collision = await db.category.create({
      data: { name: `Collision ${suffix}`, description: "Conflict fixture" },
    });
    const gameBody = {
      categoryId: category.id,
      title: "Contract game",
      description: "A game for API verification",
      platform: "PC",
    };
    const game = await send<GameView>("POST", "/games", 201, {
      token,
      body: gameBody,
    });
    const reviewBody = { text: "Useful feedback", rating: 4 };
    const review = await send<ReviewView>(
      "POST",
      `/games/${game.id}/reviews`,
      201,
      { token: ownerToken, body: reviewBody },
    );
    const cp = `/categories/${category.id}`;
    const gp = `/games/${game.id}`;
    const rp = `${gp}/reviews/${review.id}`;
    const nested = `${cp}/games/${game.id}/reviews`;
    const operations = [
      ["GET", "/health"],
      ["POST", "/auth/register"],
      ["POST", "/auth/login"],
      ["POST", "/auth/refresh"],
      ["POST", "/auth/logout"],
      ["GET", "/auth/me"],
      ["GET", "/categories"],
      ["POST", "/categories"],
      ["GET", cp],
      ["PATCH", cp],
      ["DELETE", cp],
      ["GET", "/games"],
      ["POST", "/games"],
      ["GET", gp],
      ["PATCH", gp],
      ["DELETE", gp],
      ["GET", `${gp}/reviews`],
      ["POST", `${gp}/reviews`],
      ["GET", rp],
      ["PATCH", rp],
      ["DELETE", rp],
      ["GET", nested],
    ] as const;

    await t.test(
      "successful reads, updates, conflicts and ownership",
      async () => {
        for (const path of [
          "/health",
          "/categories",
          cp,
          "/games",
          gp,
          `${gp}/reviews`,
          rp,
          nested,
        ])
          await send("GET", path, 200);
        await send("PATCH", cp, 200, {
          token,
          body: { description: "Updated category" },
        });
        await send("PATCH", gp, 200, {
          token,
          body: { description: "Updated game" },
        });
        await send("PATCH", rp, 200, {
          token: ownerToken,
          body: { rating: 5 },
        });
        await send("POST", "/categories", 409, { token, body: categoryBody });
        await send("PATCH", cp, 409, { token, body: { name: collision.name } });
        await send("DELETE", cp, 409, { token });
        await send("DELETE", gp, 409, { token });
        await send("POST", `${gp}/reviews`, 409, {
          token: ownerToken,
          body: reviewBody,
        });
        await send("PATCH", rp, 403, { token, body: { text: "Not mine" } });
        await send("DELETE", rp, 403, { token: other.accessToken });
      },
    );

    await t.test(
      "concurrent parent deletion produces a documented conflict",
      async () => {
        const conflict = () => {
          throw new Prisma.PrismaClientKnownRequestError(
            "private fault details",
            {
              code: "P2003",
              clientVersion: Prisma.prismaVersion.client,
            },
          );
        };
        const create = db.game.create;
        const update = db.game.update;
        Reflect.set(db.game, "create", conflict);
        Reflect.set(db.game, "update", conflict);
        try {
          await send("POST", "/games", 409, { token, body: gameBody });
          await send("PATCH", gp, 409, {
            token,
            body: { categoryId: category.id },
          });
        } finally {
          Reflect.set(db.game, "create", create);
          Reflect.set(db.game, "update", update);
        }
      },
    );

    await t.test("missing authentication and role restrictions", async () => {
      for (const [method, path] of operations) {
        if (
          path === "/auth/me" ||
          (!path.startsWith("/auth/") && method !== "GET")
        )
          await send(method, path, 401);
        if (
          ["POST", "PATCH", "DELETE"].includes(method) &&
          !path.includes("reviews") &&
          !path.startsWith("/auth/")
        )
          await send(method, path, 403, { token: ownerToken });
        if (path.startsWith("/auth/") && method === "POST")
          await send(method, path, 403, { headers: { "X-GameON-CSRF": "0" } });
      }
    });

    await t.test("missing resources and mismatched hierarchy", async () => {
      for (const method of ["GET", "PATCH", "DELETE"])
        for (const path of [
          `/categories/${missing}`,
          `/games/${missing}`,
          `${gp}/reviews/${missing}`,
        ])
          await send(method, path, 404, {
            token,
            ...(method === "PATCH"
              ? {
                  body: path.includes("reviews")
                    ? { rating: 3 }
                    : { description: "Missing" },
                }
              : {}),
          });
      await send("GET", `/games/${missing}/reviews`, 404);
      await send(
        "GET",
        `/categories/${collision.id}/games/${game.id}/reviews`,
        404,
      );
      await send("POST", "/games", 404, {
        token,
        body: { ...gameBody, categoryId: missing },
      });
      await send("PATCH", gp, 404, { token, body: { categoryId: missing } });
      await send("POST", `/games/${missing}/reviews`, 404, {
        token,
        body: reviewBody,
      });
      await send("GET", "/orders", 404);
      assert.ok(
        !Object.keys(specification.paths).some((path) =>
          path.includes("orders"),
        ),
      );
      assert.deepEqual(
        await db.$queryRaw`SELECT to_regclass('public."Order"')::text AS name`,
        [{ name: null }],
      );
    });

    await t.test(
      "validation, malformed JSON, oversized bodies and content types",
      async () => {
        for (const [method, path] of operations) {
          if (method === "POST" || method === "PATCH") {
            await send(method, path, 400, { token, raw: "{" });
            await send(method, path, 413, {
              token,
              body: { text: "a".repeat(110000) },
            });
            await send(method, path, 415, {
              token,
              raw: "text",
              headers: { "Content-Type": "text/plain" },
            });
          }
          if (method === "DELETE")
            await send(method, path.replace(/[^/]+$/, "invalid"), 400, {
              token,
            });
          if (method === "GET" && !["/health", "/auth/me"].includes(path)) {
            const bad =
              path === "/categories" ||
              path === "/games" ||
              path.endsWith("/reviews")
                ? `${path}?page=0`
                : path.replace(/[^/]+$/, "invalid");
            await send(method, bad, 400);
          }
        }
        for (const path of [cp, gp, rp]) {
          await send("PATCH", path, 400, {
            token: path === rp ? ownerToken : token,
            body: {},
          });
          await send("PATCH", path, 400, {
            token: path === rp ? ownerToken : token,
            raw:
              '{"text":' +
              "[".repeat(3000) +
              '"nested"' +
              "]".repeat(3000) +
              "}",
          });
        }
        for (const path of [
          "/auth/register",
          "/auth/login",
          "/categories",
          "/games",
          `${gp}/reviews`,
        ])
          await send("POST", path, 400, {
            token,
            raw:
              '{"text":' +
              '{"nested":'.repeat(1000) +
              '"value"' +
              "}".repeat(1000) +
              "}",
          });
        for (const value of ["\u0000", "abc\u0000def", "\ud800", "\udfff"]) {
          if (value.isWellFormed())
            for (const path of ["/categories", "/games"])
              await send(
                "GET",
                `${path}?search=${encodeURIComponent(value)}`,
                400,
              );
          for (const [path, body] of [
            ["/categories", { ...categoryBody, name: value }],
            ["/categories", { ...categoryBody, description: value }],
            ["/games", { ...gameBody, title: value }],
            ["/games", { ...gameBody, description: value }],
            ["/games", { ...gameBody, platform: value }],
            [
              "/games",
              { ...gameBody, imageUrl: `https://example.test/${value}` },
            ],
            [`${gp}/reviews`, { ...reviewBody, text: value }],
            ["/auth/register", { ...registration, displayName: value }],
            ["/auth/login", { email: adminEmail, password: value }],
          ] as const)
            await send("POST", path, 400, { token, body });
          await send("PATCH", rp, 400, {
            token: ownerToken,
            body: { text: value },
          });
        }
        for (const path of ["/categories", "/games"])
          for (const query of [
            "pageSize=101",
            "page=1000001",
            "search[x]=bad",
            "search=a&search=b",
            "unknown=x",
          ])
            await send("GET", `${path}?${query}`, 400);
        for (const body of [
          { rating: null },
          { rating: 0 },
          { rating: 6 },
          { rating: "5" },
          { authorId: missing },
        ])
          await send("PATCH", rp, 400, { token: ownerToken, body });
        for (const body of [
          { price: "19.99" },
          { title: null },
          { title: "x".repeat(201) },
        ])
          await send("PATCH", gp, 400, { token, body });
        await send("PATCH", rp, 200, {
          token: ownerToken,
          body: { text: "Puikus žaidimas 🎮 日本語" },
        });
      },
    );

    await t.test(
      "shared rate-limit and internal-error contracts on every route",
      async () => {
        const storage = app.get<ThrottlerStorage>(ThrottlerStorage);
        const blocked = t.mock.method(storage, "increment", async () => ({
          totalHits: 201,
          timeToExpire: 60,
          isBlocked: true,
          timeToBlockExpire: 60,
        }));
        try {
          for (const [method, path] of operations)
            await send(method, path, 429, { token });
        } finally {
          blocked.mock.restore();
        }
        const broken = t.mock.method(storage, "increment", async () => {
          throw new Error("private fault details");
        });
        try {
          for (const [method, path] of operations)
            await send(method, path, 500, { token });
        } finally {
          broken.mock.restore();
        }
      },
    );

    await t.test(
      "database outages return 503 instead of accidental 500",
      async () => {
        const unavailable = () => {
          throw new Prisma.PrismaClientInitializationError(
            "private fault details",
            Prisma.prismaVersion.client,
            "P1001",
          );
        };
        function replace<T extends object>(target: T, key: keyof T) {
          const original = target[key];
          Reflect.set(target, key, unavailable);
          return () => {
            Reflect.set(target, key, original);
          };
        }
        const restore = [
          replace(db, "$transaction"),
          replace(db, "$queryRaw"),
          replace(db.category, "findUniqueOrThrow"),
          replace(db.game, "findUniqueOrThrow"),
          replace(db.review, "findUniqueOrThrow"),
          replace(db.refreshSession, "findFirst"),
          replace(db.refreshSession, "findUnique"),
          replace(db.user, "findUnique"),
        ];
        try {
          for (const [method, path] of operations)
            await send(method, path, 503, {
              token,
              ...(path === "/auth/register"
                ? { body: { ...registration, email: `offline-${email}` } }
                : path === "/auth/login"
                  ? { body: { email: adminEmail, password } }
                  : {}),
            });
        } finally {
          restore.forEach((restore) => restore());
        }
      },
    );

    await send("DELETE", rp, 204, { token: ownerToken });
    await send("DELETE", gp, 204, { token });
    await send("DELETE", cp, 204, { token });
    await send("POST", "/auth/logout", 204);
    await send("GET", "/auth/me", 401, { token });
    const missingCoverage = Object.entries(specification.paths)
      .flatMap(([path, operations]) =>
        Object.entries(operations).flatMap(([method, operation]) =>
          Object.keys((operation as { responses: object }).responses).map(
            (status) => `${method} ${path} ${status}`,
          ),
        ),
      )
      .filter((key) => !covered.has(key));
    assert.deepEqual(
      missingCoverage,
      [],
      "Every documented response must be exercised",
    );
    t.diagnostic(
      `${covered.size} documented operation/status pairs verified across ${operations.length} operations`,
    );
  } finally {
    await app.close();
  }
});
