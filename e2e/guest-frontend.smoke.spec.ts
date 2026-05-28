import { expect, test } from "@playwright/test";

const hasAuthEnv =
  Boolean(process.env.E2E_CLIENT_EMAIL) &&
  Boolean(process.env.E2E_CLIENT_PASSWORD);

const viewports = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 375, height: 900 },
] as const;

test.describe("Phase 8 A.2.b guest accept frontend smoke", () => {
  test.use({ storageState: undefined });

  for (const viewport of viewports) {
    test(`guest accept page renders on ${viewport.name}`, async ({ browser }) => {
      const context = await browser.newContext({
        baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3003",
        locale: "ko-KR",
        storageState: { cookies: [], origins: [] },
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (error) => consoleErrors.push(error.message));

      await page.goto(
        "/ko/auth/accept-guest/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        { waitUntil: "domcontentloaded" },
      );

      await expect(
        page.getByRole("heading", { name: "게스트 초대 수락", level: 1 }),
      ).toBeVisible();
      await expect(page.getByLabel("초대받은 이메일")).toBeVisible();
      expect(consoleErrors).toEqual([]);

      await page.screenshot({
        path: `test-results/guest-accept-${viewport.name}.png`,
        fullPage: true,
      });
      await context.close();
    });
  }
});

test.describe("Phase 8 A.2.b authenticated project detail smoke", () => {
  for (const viewport of viewports) {
    test(`project detail guest invite surface smoke on ${viewport.name}`, async ({
      page,
    }) => {
      test.skip(!hasAuthEnv, "E2E_CLIENT_EMAIL / E2E_CLIENT_PASSWORD missing");

      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (error) => consoleErrors.push(error.message));

      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto("/ko/app/projects", { waitUntil: "domcontentloaded" });

      const detailHref = await page
        .locator('a[href*="/app/projects/"]')
        .evaluateAll((anchors) => {
          for (const anchor of anchors) {
            const href = anchor.getAttribute("href") ?? "";
            if (/\/app\/projects\/[0-9a-f-]{36}(?:$|[?#])/.test(href)) {
              return href;
            }
          }
          return null;
        });
      test.skip(!detailHref, "No project detail link available for E2E user");

      await page.goto(detailHref!, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/ko\/app\/projects\/[0-9a-f-]{36}/);
      await expect(page.getByRole("main")).toBeVisible();
      expect(consoleErrors).toEqual([]);

      await page.screenshot({
        path: `test-results/project-detail-guest-invite-surface-${viewport.name}.png`,
        fullPage: true,
      });
    });
  }
});
