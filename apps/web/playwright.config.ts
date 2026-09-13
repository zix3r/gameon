import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineConfig({
  testDir: "./e2e",
  outputDir: join(tmpdir(), "gameon-browser-results"),
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://localhost:8080",
    headless: true,
    actionTimeout: 10000,
  },
});
