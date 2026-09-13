import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { randomUUID } from "node:crypto";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Demo1234");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/games$/);
}

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function cleanup(request: APIRequestContext, name: string) {
  const response = await request.post("/api/auth/login", {
    headers: { "X-GameON-CSRF": "1" },
    data: { email: "admin@gameon.test", password: "Demo1234" },
  });
  expect(response.ok()).toBe(true);
  const { accessToken } = await response.json();
  const headers = { Authorization: `Bearer ${accessToken}` };
  try {
    const categories = await request.get(
      `/api/categories?search=${encodeURIComponent(name)}`,
    );
    for (const category of (await categories.json()).items) {
      const games = await request.get(category._links.games.href);
      for (const game of (await games.json()).items) {
        const reviews = await request.get(game._links.reviews.href);
        for (const review of (await reviews.json()).items)
          expect(
            (
              await request.delete(review._links.self.href, { headers })
            ).status(),
          ).toBe(204);
        expect(
          (await request.delete(game._links.self.href, { headers })).status(),
        ).toBe(204);
      }
      expect(
        (await request.delete(category._links.self.href, { headers })).status(),
      ).toBe(204);
    }
  } finally {
    await request.post("/api/auth/logout", {
      headers: { "X-GameON-CSRF": "1" },
    });
  }
}

test("guest layouts, navigation, images and access restrictions", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [320, 375, 767, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/games");
    await expect(
      page.getByRole("heading", { name: "Discover games" }),
    ).toBeVisible();
    await expect(page.locator("main article").first()).toBeVisible();
    await noOverflow(page);
    if (width < 768) {
      const toggle = page.getByRole("button", { name: "Open navigation" });
      await toggle.click();
      await expect(
        page.getByRole("navigation", { name: "Main navigation" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(toggle).toBeFocused();
    }
    expect(
      await page
        .locator("main img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              image.getBoundingClientRect().width <=
              image.parentElement!.getBoundingClientRect().width + 1,
          ),
        ),
    ).toBe(true);
  }
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("admin pagination, mobile navigation and failed logout feedback", async ({
  page,
}) => {
  await login(page, "admin@gameon.test");
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin/games");
    await expect(
      page.getByRole("heading", { name: "Games", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await noOverflow(page);
  }
  const next = page.waitForResponse(
    (response) =>
      response.url().includes("/api/games?") &&
      new URL(response.url()).searchParams.get("page") === "2",
  );
  await page.getByRole("button", { name: "Next", exact: true }).click();
  expect((await next).status()).toBe(200);
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "My account" })).toBeVisible();
  await expect(
    page.locator("dd").filter({ hasText: "admin@gameon.test" }),
  ).toBeVisible();
  await page.route("**/api/auth/logout", (route) => route.abort());
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Sign-out could not be confirmed",
  );
  await page.unroute("**/api/auth/logout");
  await page.getByRole("button", { name: "Retry sign out" }).click();
  await expect(page.getByRole("link", { name: "Join GameON" })).toBeVisible();
});

test("category, game and review CRUD through dialogs", async ({
  page,
  request,
}) => {
  const name = `Browser ${randomUUID()}`;
  try {
    await login(page, "admin@gameon.test");
    await page.goto("/admin/categories");
    await page
      .getByRole("button", { name: "New category", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByLabel("Name", { exact: true })
      .fill(name);
    await page
      .getByRole("dialog")
      .getByLabel("Description")
      .fill("Browser verification category");
    await page.getByRole("button", { name: "Save category" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByLabel("Search categories").fill(name.toUpperCase());
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: `Edit ${name}`, exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByLabel("Description")
      .fill("Updated category description");
    await page.getByRole("button", { name: "Save category" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.goto("/admin/games");
    await page.getByRole("button", { name: "New game", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByLabel("Title", { exact: true })
      .fill(name);
    await page
      .getByRole("dialog")
      .getByRole("combobox", { name: "Category", exact: true })
      .selectOption({ label: name });
    await expect(page.getByRole("dialog").getByLabel(/price/i)).toHaveCount(0);
    await page.getByRole("dialog").getByLabel("Platforms").fill("PC");
    await page
      .getByRole("dialog")
      .getByLabel("Description")
      .fill("Browser verification game");
    await page.setViewportSize({ width: 375, height: 667 });
    await noOverflow(page);
    const dialog = page.getByRole("dialog");
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Save game", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByLabel("Search games").fill(name);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page
      .getByRole("button", { name: `Edit ${name}`, exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByLabel("Description")
      .fill("Updated game description");
    await page.getByRole("button", { name: "Save game", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole("link", { name, exact: true }).click();
    const gameUrl = page.url();
    await expect(
      page.getByText("Updated game description", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page.getByRole("link", { name: "Join GameON" })).toBeVisible();
    await login(page, "demo@gameon.test");
    await page.goto(gameUrl);
    await page
      .getByRole("button", { name: "Write a review", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("textbox", { name: /^Your review/ })
      .fill("Helpful review from browser verification");
    await page
      .getByRole("radio", { name: "4 out of 5 stars" })
      .check({ force: true });
    await page.getByRole("button", { name: "Publish review" }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole("link", { name: "View review", exact: true }).click();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("textbox", { name: /^Your review/ })
      .fill("Updated browser review");
    await page
      .getByRole("button", { name: "Save review", exact: true })
      .click();
    await expect(
      page.getByText("Updated browser review", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page
      .getByRole("button", { name: "Delete review", exact: true })
      .click();
    await expect(page).toHaveURL(gameUrl);
    await page
      .getByRole("button", { name: "Write a review", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Write a review", exact: true }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page.getByRole("link", { name: "Join GameON" })).toBeVisible();
    await login(page, "admin@gameon.test");
    await page.goto("/admin/games");
    await page.getByLabel("Search games").fill(name);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page
      .getByRole("button", { name: `Delete ${name}`, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Delete game", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await page.goto("/admin/categories");
    await page.getByLabel("Search categories").fill(name);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page
      .getByRole("button", { name: `Delete ${name}`, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Delete category", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("link", { name, exact: true })).toHaveCount(0);
  } finally {
    await cleanup(request, name);
  }
});
