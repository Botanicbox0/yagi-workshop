import { expect, test } from "@playwright/test";

const hasAuthEnv =
  Boolean(process.env.E2E_CLIENT_EMAIL) &&
  Boolean(process.env.E2E_CLIENT_PASSWORD);

test.describe("authenticated app shell smoke", () => {
  test.skip(!hasAuthEnv, "E2E_CLIENT_EMAIL / E2E_CLIENT_PASSWORD missing");

  const viewports = [
    { name: "desktop", width: 1280, height: 900 },
    { name: "mobile", width: 375, height: 900 },
  ] as const;

  for (const viewport of viewports) {
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

  for (const viewport of viewports) {
    test(`Explore dashboard hub renders on ${viewport.name}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (error) => consoleErrors.push(error.message));

      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      await page.goto("/ko/app/explore", { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/ko\/app\/explore/);
      await expect(
        page.getByRole("heading", {
          name: "오늘 진행할 작업을 한 화면에서 확인하세요",
          level: 1,
        }),
      ).toBeVisible();
      await expect(page.getByRole("heading", { name: "최근 프로젝트" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "진행 중 캠페인" })).toBeVisible();
      await expect(page.getByText("크레딧 잔액")).toBeVisible();
      await expect(page.getByRole("heading", { name: "빠른 액션" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "추천 레퍼런스" })).toBeVisible();
      expect(consoleErrors).toEqual([]);

      await page.screenshot({
        path: `test-results/app-explore-dashboard-${viewport.name}.png`,
        fullPage: true,
      });
    });
  }

  for (const viewport of viewports) {
    test(`Campaign request surfaces render on ${viewport.name}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (error) => consoleErrors.push(error.message));

      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      await page.goto("/ko/app/campaigns", { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/ko\/app\/campaigns/);
      await expect(
        page.getByRole("heading", {
          name: "캠페인을 요청하고 진행 상태를 관리하세요",
          level: 1,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "새 캠페인 요청" }),
      ).toBeVisible();

      if ((await page.getByRole("link", { name: "상세 보기" }).count()) === 0) {
        await page.goto("/ko/app/campaigns/new", {
          waitUntil: "domcontentloaded",
        });
        await expect(page.locator("form[data-ready='true']")).toBeVisible();
        const suffix = `${viewport.name}-${Date.now()}`;
        await page.getByLabel("캠페인 제목").fill(`E2E Mass Campaign ${suffix}`);
        await page
          .getByLabel("한 줄 설명")
          .fill("E2E 검증용 Mass AI Campaign request");
        await page
          .getByLabel("Creative brief")
          .fill("아티스트 음악과 뮤직비디오 소스를 여러 크리에이터가 해석하는 E2E 캠페인입니다.");
        await page.getByLabel("담당자 이름").fill("YAGI E2E");
        await page.getByLabel("담당자 이메일").fill("test-e2e@example.com");
        await page.getByLabel("담당자 연락처").fill("010-0000-0000");
        await page.getByRole("button", { name: "캠페인 요청" }).click();
        await expect(page).toHaveURL(/\/ko\/app\/campaigns/);
      }

      await page.goto("/ko/app/campaigns/new", {
        waitUntil: "domcontentloaded",
      });
      await expect(page.locator("form[data-ready='true']")).toBeVisible();
      await expect(page).toHaveURL(/\/ko\/app\/campaigns\/new/);
      await expect(
        page.getByRole("heading", {
          name: "크리에이터가 해석할 campaign brief를 남겨주세요",
          level: 1,
        }),
      ).toBeVisible();
      await expect(page.getByLabel("캠페인 제목")).toBeVisible();
      await expect(page.getByLabel("Creative brief")).toBeVisible();
      await expect(page.getByRole("button", { name: "캠페인 요청" })).toBeVisible();
      expect(consoleErrors).toEqual([]);

      await page.screenshot({
        path: `test-results/app-campaigns-new-${viewport.name}.png`,
        fullPage: true,
      });

      await page.goto("/ko/app/campaigns", { waitUntil: "domcontentloaded" });
      const detailHref = await page
        .getByRole("link", { name: "상세 보기" })
        .first()
        .getAttribute("href");
      expect(detailHref).toBeTruthy();
      await page.goto(detailHref!);
      await expect(page).toHaveURL(/\/ko\/app\/campaigns\/[^/]+$/);
      await expect(
        page.getByRole("heading", { name: "Mass Campaign lifecycle" }),
      ).toBeVisible();
      await expect(page.getByText("Projects와 다른 점")).toBeVisible();
      await expect(page.getByText("BRAND sponsor").first()).toBeVisible();
      expect(consoleErrors).toEqual([]);

      await page.screenshot({
        path: `test-results/app-campaigns-detail-${viewport.name}.png`,
        fullPage: true,
      });
    });
  }
});
