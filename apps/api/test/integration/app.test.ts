import "reflect-metadata";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { NestFactory } from "@nestjs/core";
import { PrismaClient } from "@prisma/client";
import { AppModule } from "../../src/app.module";
import { configureApp } from "../../src/configure-app";
import { hashPassword } from "../../src/auth/password";
import { type AuthView } from "../../src/auth/auth.dto";
import {
  type CategoryView,
  type GameView,
  type ReviewView,
  type OrderView,
} from "../../src/common/views";

type Page<T> = {
  items: T[];
  total: number;
  _links: { self: { href: string }; next?: { href: string } };
};

test("Core application flows", async (t) => {
  assert.match(
    new URL(process.env.DATABASE_URL!).pathname,
    /^\/gameon_test_[a-f0-9]{12}$/,
  );
  const db = new PrismaClient();
  const app = await NestFactory.create(AppModule, { logger: false });
  const specification = configureApp(app);
  const email = `${randomUUID()}@example.test`;
  const adminEmail = `admin-${email}`;
  const password = "Demo1234";
  let owner: AuthView;
  let other: AuthView;
  let category: CategoryView;
  let game: GameView;
  let review: ReviewView;
  let order: OrderView;
  try {
    await db.user.create({
      data: {
        email: adminEmail,
        displayName: "Admin",
        role: "ADMIN",
        passwordHash: await hashPassword(password),
      },
    });
    await app.listen(0, "127.0.0.1");
    const base = `${await app.getUrl()}/api`;
    async function send(
      method: string,
      path: string,
      body?: unknown,
      token?: string,
      cookie?: string,
    ) {
      return fetch(`${base}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-GameON-CSRF": "1",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    }
    async function request<T>(
      method: string,
      path: string,
      status: number,
      body?: unknown,
      token?: string,
    ): Promise<T> {
      const response = await send(method, path, body, token);
      assert.equal(response.status, status, `${method} ${path}`);
      if (status === 204) {
        assert.equal(await response.text(), "");
        return undefined as T;
      }
      assert.match(
        response.headers.get("content-type") ?? "",
        /application\/json/,
      );
      return (await response.json()) as T;
    }
    const admin = await request<AuthView>("POST", "/auth/login", 200, {
      email: adminEmail,
      password,
    });
    const adminToken = admin.accessToken;

    await t.test("registration, login, and role protection", async () => {
      await request("POST", "/auth/register", 400, {
        email,
        password,
        displayName: "Demo",
        role: "ADMIN",
      });
      owner = await request<AuthView>("POST", "/auth/register", 201, {
        email,
        password,
        displayName: "Demo",
      });
      other = await request<AuthView>("POST", "/auth/register", 201, {
        email: `other-${email}`,
        password,
        displayName: "Other",
      });
      assert.equal(owner.user.role, "USER");
      await request("POST", "/auth/login", 401, {
        email,
        password: "WrongPassword",
      });
      await request("POST", "/categories", 401, {});
      await request("POST", "/categories", 403, {}, owner.accessToken);
      await request(
        "GET",
        "/auth/me",
        401,
        undefined,
        `${owner.accessToken}invalid`,
      );
      const csrf = await fetch(`${base}/auth/logout`, { method: "POST" });
      assert.equal(csrf.status, 403);
      assert.equal(
        (
          await fetch(`${base}/auth/logout`, {
            method: "POST",
            headers: {
              "X-GameON-CSRF": "1",
              Origin: "https://untrusted.example",
            },
          })
        ).status,
        403,
      );
      for (const site of ["same-origin", "cross-site"]) {
        const response = await fetch(`${base}/auth/logout`, {
          method: "POST",
          headers: {
            "X-GameON-CSRF": "1",
            "Sec-Fetch-Site": site,
            Origin: "http://127.0.0.1:8080",
          },
        });
        assert.equal(response.status, site === "same-origin" ? 204 : 403);
      }
      await request("GET", "/health", 200);
    });

    await t.test(
      "category and game CRUD, filtering, and validation",
      async () => {
        category = await request<CategoryView>(
          "POST",
          "/categories",
          201,
          { name: `Test ${email}`, description: "Puzzle games" },
          adminToken,
        );
        const categories = await request<Page<CategoryView>>(
          "GET",
          "/categories?pageSize=100",
          200,
        );
        assert.ok(categories.items.some((item) => item.id === category.id));
        const filtered = await request<Page<CategoryView>>(
          "GET",
          `/categories?search=${encodeURIComponent(category.name.toUpperCase())}&pageSize=1`,
          200,
        );
        assert.equal(filtered.total, 1);
        assert.equal(filtered.items[0]?.id, category.id);
        assert.deepEqual(
          (
            await request<Page<CategoryView>>(
              "GET",
              `/categories?search=${randomUUID()}`,
              200,
            )
          ).items,
          [],
        );
        await request("GET", "/categories?search=", 400);
        await request("GET", "/categories?pageSize=101", 400);
        assert.equal(
          (
            await request<CategoryView>(
              "GET",
              `/categories/${category.id}`,
              200,
            )
          ).name,
          category.name,
        );
        await request(
          "PATCH",
          `/categories/${category.id}`,
          200,
          { description: "Updated category" },
          adminToken,
        );
        game = await request<GameView>(
          "POST",
          "/games",
          201,
          {
            categoryId: category.id,
            title: "Test Portal",
            description: "Puzzles",
            price: "12.34",
            platform: "PC",
          },
          adminToken,
        );
        assert.equal(game.averageRating, null);
        assert.equal(game._links.self.href, `/api/games/${game.id}`);
        assert.equal(game._links.category.href, category._links.self.href);
        await request("GET", category._links.games.href.slice(4), 200);
        await request("GET", game._links.reviews.href.slice(4), 200);
        const nested = `/categories/${category.id}/games/${game.id}/reviews`;
        assert.deepEqual(
          (await request<Page<ReviewView>>("GET", nested, 200)).items,
          [],
        );
        await request(
          "GET",
          `/categories/${randomUUID()}/games/${game.id}/reviews`,
          404,
        );
        await request(
          "GET",
          `/categories/${category.id}/games/${randomUUID()}/reviews`,
          404,
        );
        await request(
          "GET",
          `/categories/invalid/games/${game.id}/reviews`,
          400,
        );
        const games = await request<Page<GameView>>(
          "GET",
          `/games?categoryId=${category.id}&search=portal&pageSize=1`,
          200,
        );
        assert.equal(games.total, 1);
        assert.equal(games.items[0]?.id, game.id);
        assert.equal(
          (await request<GameView>("GET", `/games/${game.id}`, 200)).price,
          "12.34",
        );
        await request(
          "PATCH",
          `/games/${game.id}`,
          200,
          { description: "Updated game" },
          adminToken,
        );
        await request(
          "PATCH",
          `/games/${game.id}`,
          400,
          { price: "-1" },
          adminToken,
        );
        await request(
          "PATCH",
          `/games/${game.id}`,
          400,
          { unknown: true },
          adminToken,
        );
        await request("GET", "/games?page=0", 400);
        await request("GET", `/games/${randomUUID()}`, 404);
      },
    );

    await t.test("reviews enforce ownership and update ratings", async () => {
      review = await request<ReviewView>(
        "POST",
        `/games/${game.id}/reviews`,
        201,
        { text: "Excellent puzzles.", rating: 5 },
        owner.accessToken,
      );
      await request(
        "POST",
        `/games/${game.id}/reviews`,
        409,
        { text: "Duplicate", rating: 4 },
        owner.accessToken,
      );
      const path = `/games/${game.id}/reviews/${review.id}`;
      assert.equal(
        (await request<ReviewView>("GET", path, 200)).authorId,
        owner.user.id,
      );
      await request("PATCH", path, 403, { rating: 1 }, other.accessToken);
      await request("PATCH", path, 403, { rating: 1 }, adminToken);
      await request("DELETE", path, 403, undefined, other.accessToken);
      await request("PATCH", path, 200, { rating: 4 }, owner.accessToken);
      const reviews = await request<Page<ReviewView>>(
        "GET",
        `/games/${game.id}/reviews?authorId=${owner.user.id}`,
        200,
      );
      assert.equal(reviews.total, 1);
      const linkedReview = reviews.items[0]!;
      assert.equal(
        linkedReview._links.self.href,
        `/api/games/${game.id}/reviews/${review.id}`,
      );
      await request("GET", linkedReview._links.self.href.slice(4), 200);
      await request("GET", reviews._links.self.href.slice(4), 200);
      const nested = await request<Page<ReviewView>>(
        "GET",
        `/categories/${category.id}/games/${game.id}/reviews?authorId=${owner.user.id}&pageSize=1`,
        200,
      );
      assert.equal(nested.items[0]?.id, review.id);
      const wrongCategory = await request<CategoryView>(
        "POST",
        "/categories",
        201,
        { name: `Wrong ${email}`, description: "Another category" },
        adminToken,
      );
      await request(
        "GET",
        `/categories/${wrongCategory.id}/games/${game.id}/reviews`,
        404,
      );
      await request(
        "DELETE",
        `/categories/${wrongCategory.id}`,
        204,
        undefined,
        adminToken,
      );
      const rated = await request<GameView>("GET", `/games/${game.id}`, 200);
      assert.equal(rated.averageRating, 4);
      assert.equal(rated.reviewCount, 1);
      await request("GET", `/games/${randomUUID()}/reviews/${review.id}`, 404);
    });

    await t.test("input boundaries and hypermedia contracts", async () => {
      const reviewPath = `/games/${game.id}/reviews/${review.id}`;
      for (const body of [
        {},
        { rating: null },
        { rating: 0 },
        { rating: 6 },
        { rating: "5" },
        { authorId: other.user.id },
      ]) {
        await request("PATCH", reviewPath, 400, body, owner.accessToken);
      }
      for (const body of [
        {},
        { price: null },
        { title: null },
        { price: "100000000.00" },
      ]) {
        await request("PATCH", `/games/${game.id}`, 400, body, adminToken);
      }
      await request("PATCH", `/categories/${category.id}`, 400, {}, adminToken);
      await request(
        "PATCH",
        `/categories/${category.id}`,
        400,
        { name: null },
        adminToken,
      );
      await request("GET", "/games?pageSize=1000000", 400);
      const beyond = await request<Page<GameView>>(
        "GET",
        "/games?page=999&pageSize=10",
        200,
      );
      assert.deepEqual(beyond.items, []);
      const noMatch = await request<Page<GameView>>(
        "GET",
        `/games?search=${randomUUID()}`,
        200,
      );
      assert.deepEqual(noMatch.items, []);
      assert.equal(
        (
          await request<AuthView>("POST", "/auth/login", 200, {
            email,
            password,
          })
        ).user._links.self.href,
        "/api/auth/me",
      );
      const nested =
        specification.paths[
          "/api/categories/{categoryId}/games/{gameId}/reviews"
        ];
      assert.ok(nested?.get?.responses["200"]);
      const schema = specification.components?.schemas?.GameView;
      assert.ok(schema && "properties" in schema && schema.properties?._links);
      const categoryPage = await request<Page<CategoryView>>(
        "GET",
        "/categories?pageSize=1",
        200,
      );
      await request("GET", categoryPage._links.self.href.slice(4), 200);
    });

    await t.test(
      "orders are private and preserve their purchase price",
      async () => {
        await request(
          "POST",
          "/orders",
          400,
          { gameId: game.id, userId: other.user.id },
          owner.accessToken,
        );
        order = await request<OrderView>(
          "POST",
          "/orders",
          201,
          { gameId: game.id },
          owner.accessToken,
        );
        assert.equal(order.userId, owner.user.id);
        await request(
          "GET",
          order._links.self.href.slice(4),
          200,
          undefined,
          owner.accessToken,
        );
        await request("GET", order._links.game.href.slice(4), 200);
        await request(
          "GET",
          `/orders/${order.id}`,
          404,
          undefined,
          other.accessToken,
        );
        await request(
          "GET",
          `/orders?userId=${owner.user.id}`,
          403,
          undefined,
          other.accessToken,
        );
        assert.equal(
          (
            await request<Page<OrderView>>(
              "GET",
              "/orders",
              200,
              undefined,
              owner.accessToken,
            )
          ).total,
          1,
        );
        await request("GET", `/orders/${order.id}`, 200, undefined, adminToken);
        await request(
          "PATCH",
          `/games/${game.id}`,
          200,
          { price: "99.99" },
          adminToken,
        );
        assert.equal(
          (
            await request<OrderView>(
              "GET",
              `/orders/${order.id}`,
              200,
              undefined,
              owner.accessToken,
            )
          ).unitPriceAtPurchase,
          "12.34",
        );
      },
    );

    await t.test(
      "deletions respect relationships and review moderation",
      async () => {
        await request(
          "DELETE",
          `/categories/${category.id}`,
          409,
          undefined,
          adminToken,
        );
        await request(
          "DELETE",
          `/games/${game.id}`,
          409,
          undefined,
          adminToken,
        );
        await request(
          "DELETE",
          `/games/${game.id}/reviews/${review.id}`,
          204,
          undefined,
          adminToken,
        );
        assert.equal(
          (await request<GameView>("GET", `/games/${game.id}`, 200))
            .reviewCount,
          0,
        );
        await request(
          "DELETE",
          `/games/${game.id}`,
          409,
          undefined,
          adminToken,
        );
        await db.order.delete({ where: { id: order.id } });
        await request(
          "DELETE",
          `/games/${game.id}`,
          204,
          undefined,
          adminToken,
        );
        await request("GET", `/games/${game.id}`, 404);
        await request(
          "DELETE",
          `/categories/${category.id}`,
          204,
          undefined,
          adminToken,
        );
      },
    );

    await t.test(
      "refresh rotation, replay revocation, and logout",
      async () => {
        const login = await send("POST", "/auth/login", { email, password });
        assert.equal(login.status, 200);
        assert.match(login.headers.get("set-cookie")!, /HttpOnly/);
        const oldCookie = login.headers.get("set-cookie")!.split(";")[0]!;
        const refresh = await send(
          "POST",
          "/auth/refresh",
          undefined,
          undefined,
          oldCookie,
        );
        assert.equal(refresh.status, 200);
        const refreshed = (await refresh.json()) as AuthView;
        await request("GET", "/auth/me", 200, undefined, refreshed.accessToken);
        assert.equal(
          (await send("POST", "/auth/refresh", undefined, undefined, oldCookie))
            .status,
          401,
        );
        await request("GET", "/auth/me", 401, undefined, refreshed.accessToken);
        const again = await send("POST", "/auth/login", { email, password });
        const current = (await again.json()) as AuthView;
        const cookie = again.headers.get("set-cookie")!.split(";")[0]!;
        assert.equal(
          (await send("POST", "/auth/logout", undefined, undefined, cookie))
            .status,
          204,
        );
        await request("GET", "/auth/me", 401, undefined, current.accessToken);
      },
    );
  } finally {
    await app.close();
    await db.$disconnect();
  }
});
