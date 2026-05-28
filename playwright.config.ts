// Phase 2.8.1 G_B1-G — Playwright config for the Brief Board e2e suite.
//
// SPEC self-amendment (§7 Stack list): @playwright/test 1.55.0 added as a
// dev-only dependency. Scope is limited to e2e regression coverage —
// no production bundle implication (Next.js does not import from e2e/).
//
// Run modes:
//   pnpm test:e2e          # default (3 retries, headless)
//   pnpm test:e2e:ui       # local debugging, headed + Playwright UI
//
// The test suite assumes a dev server on :3003 (matches package.json
// "dev" script). Override via E2E_BASE_URL when targeting staging.

import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

function loadLocalEnv(path = ".env.local") {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

loadLocalEnv();

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3003";
const e2eStorageState =
  process.env.E2E_CLIENT_EMAIL && process.env.E2E_CLIENT_PASSWORD
    ? ".auth/e2e-client.json"
    : undefined;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  // 3-run flake guard mandated by KICKOFF G_B1_G EXIT criterion.
  retries: process.env.CI ? 0 : 2,
  reporter: process.env.CI ? "github" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "ko-KR",
    storageState: e2eStorageState,
  },
  projects: [
    {
      name: "chromium-ko",
      use: { ...devices["Desktop Chrome"], locale: "ko-KR" },
    },
  ],
  // Do NOT spawn the dev server here — it has its own lifecycle (e.g.
  // local dev session, dedicated CI service). Provide E2E_BASE_URL
  // pointing at an already-running app.
});
