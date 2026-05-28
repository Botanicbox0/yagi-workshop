import { chromium, type FullConfig } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const STORAGE_STATE = path.join(process.cwd(), ".auth", "e2e-client.json");

export default async function globalSetup(config: FullConfig) {
  const email = process.env.E2E_CLIENT_EMAIL;
  const password = process.env.E2E_CLIENT_PASSWORD;
  if (!email || !password) {
    console.warn(
      "[e2e auth] E2E_CLIENT_EMAIL / E2E_CLIENT_PASSWORD missing; authenticated storageState not refreshed.",
    );
    return;
  }

  const baseURL =
    process.env.E2E_BASE_URL ??
    String(config.projects[0]?.use.baseURL ?? "http://localhost:3003");

  await mkdir(path.dirname(STORAGE_STATE), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL, locale: "ko-KR" });
  try {
    await page.goto("/ko/signin", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.getByLabel(/이메일|email/i).fill(email);
    await page.getByLabel(/비밀번호|password/i).fill(password);
    await page.getByRole("button", { name: /로그인|sign in/i }).click();
    await page.waitForURL((url) => !url.pathname.includes("/signin"), {
      timeout: 20_000,
    });

    await page.goto("/ko/app/projects", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForURL(/\/ko\/app\/projects/, { timeout: 30_000 });
    await page.context().storageState({ path: STORAGE_STATE });
  } finally {
    await browser.close();
  }
}
