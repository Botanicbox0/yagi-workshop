import { expect, test } from "@playwright/test";

const hasAuthEnv =
  Boolean(process.env.E2E_CLIENT_EMAIL) &&
  Boolean(process.env.E2E_CLIENT_PASSWORD);

test.describe("authenticated app shell smoke", () => {
  test.skip(!hasAuthEnv, "E2E_CLIENT_EMAIL / E2E_CLIENT_PASSWORD missing");

  for (const viewport of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "mobile", width: 375, height: 900 },
  ] as const) {
    test(`§AP top-nav and Americano render on ${viewport.name}`, async ({
      page,
    }) => {
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
      await expect(page).toHaveURL(/\/ko\/app\/projects/);
      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByText("Marketing Studio")).toHaveCount(0);

      if (viewport.name === "mobile") {
        await page.getByRole("button", { name: /메뉴 열기|open menu/i }).click();
        const americanoLink = page
          .getByRole("dialog")
          .getByRole("link", { name: /Americano/i });
        await expect(americanoLink).toBeVisible();
        await americanoLink.click();
      } else {
        await expect(page.getByRole("link", { name: /Americano/i })).toBeVisible();
        await page.getByRole("link", { name: /Americano/i }).click();
      }

      await expect(page).toHaveURL(/\/ko\/app\/americano/);
      await expect(
        page.getByRole("heading", { name: "Americano", level: 1 }),
      ).toBeVisible();
      await expect(page.getByText("기능 준비 중").first()).toBeVisible();
      expect(consoleErrors).toEqual([]);

      await page.screenshot({
        path: `test-results/app-americano-${viewport.name}.png`,
        fullPage: true,
      });
    });
  }
});
