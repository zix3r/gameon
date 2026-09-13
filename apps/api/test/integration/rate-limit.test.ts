import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../../src/app.module";
import { configureApp } from "../../src/configure-app";

test("real login limiter returns 429 with Retry-After after ten requests", async () => {
  const app = await NestFactory.create(AppModule, { logger: false });
  configureApp(app);
  try {
    await app.listen(0, "127.0.0.1");
    for (let attempt = 1; attempt <= 11; attempt++) {
      const response = await fetch(`${await app.getUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-GameON-CSRF": "1" },
        body: "{}",
      });
      assert.equal(response.status, attempt <= 10 ? 400 : 429);
      const body = (await response.json()) as { statusCode: number };
      assert.equal(body.statusCode, response.status);
      if (attempt === 11)
        assert.ok(Number(response.headers.get("retry-after")) > 0);
    }
  } finally {
    await app.close();
  }
});
