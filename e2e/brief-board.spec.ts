// Phase 2.8.1 G_B1-G — Brief Board e2e (wizard draft + Korean IME +
// admin comment + client notification round-trip)
//
// Required env (else suite is SKIPPED):
//   E2E_CLIENT_EMAIL / E2E_CLIENT_PASSWORD
//   E2E_ADMIN_EMAIL  / E2E_ADMIN_PASSWORD
//   E2E_BASE_URL (default http://localhost:3003)
//
// Korean IME: Playwright's keyboard.insertText() bypasses OS-level IME
// composition (it inserts the final text directly), which gives ~90%
// coverage of the input pipeline — the editor sees correct Hangul
// codepoints. Real composition (자모 combining mid-typing) cannot be
// fully simulated without OS automation; that gap is documented as
// FU-2.10-ime-composition-coverage.
//
// Scenarios:
//   1. Client signs in → /app/projects/new wizard:
//      - Step 1: title + 한글 description
//      - Continue → ensureDraftProject creates draft project_id
//      - Step 2: BriefBoardEditor mounts; insert paragraph "안녕하세요"
//        + a YouTube embed paste
//      - Step 3: review → submit → /app/projects/[id]?tab=brief
//   2. Admin signs in → opens same project → posts a comment
//   3. Client signs back in → /app/notifications shows the comment
//      notification within ~30s.

import { test, expect } from "@playwright/test";

const skipReason =
  !process.env.E2E_CLIENT_EMAIL || !process.env.E2E_CLIENT_PASSWORD
    ? "E2E_CLIENT_EMAIL / E2E_CLIENT_PASSWORD missing"
    : !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD
      ? "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD missing"
      : null;

test.describe("Brief Board — Phase 2.8.1 wizard draft + Korean IME", () => {
  test.skip(skipReason !== null, skipReason ?? "");

  test("client wizard creates draft, edits brief, admin comments, client notified", async ({
    browser,
  }) => {
    const projectIdMatch = /\/app\/projects\/([^?#/]+)/;

    // ----- Client session 1: wizard create -------------------------------
    const clientCtx = await browser.newContext();
    const clientPage = await clientCtx.newPage();

    await clientPage.goto("/signin");
    await clientPage.getByLabel(/이메일|email/i).fill(process.env.E2E_CLIENT_EMAIL!);
    await clientPage.getByLabel(/비밀번호|password/i).fill(process.env.E2E_CLIENT_PASSWORD!);
    await clientPage.getByRole("button", { name: /로그인|sign in/i }).click();
    await clientPage.waitForURL(/\/app\//, { timeout: 15_000 });

    await clientPage.goto("/app/projects/new");

    const title = `e2e-2.8.1-${Date.now()}`;
    await clientPage.getByLabel(/제목|title/i).first().fill(title);
    // 한글 description: keyboard.insertText preserves the final codepoints.
    const desc = clientPage.getByLabel(/설명|description/i).first();
    await desc.click();
    await clientPage.keyboard.insertText("e2e 자동화 시나리오 — 한국어 입력 검증");

    await clientPage
      .getByRole("button", { name: /계속|continue/i })
      .click();

    // BriefBoardEditor mounts on Step 2. Wait for the editor's prose root.
    const editor = clientPage.locator(".tiptap-prose").first();
    await editor.waitFor({ state: "visible", timeout: 15_000 });
    await editor.click();
    await clientPage.keyboard.insertText("안녕하세요");

    // Paste a YouTube URL on its own line — handlePaste in editor.tsx
    // intercepts and creates an embed block.
    await clientPage.keyboard.press("Enter");
    await clientPage.evaluate(async () => {
      const text = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
      await navigator.clipboard.writeText(text);
    });
    await clientPage.keyboard.press("Control+V");

    // Move to review and submit.
    await clientPage.getByRole("button", { name: /다음|next/i }).click();
    await clientPage
      .getByRole("button", { name: /제출|submit/i })
      .first()
      .click();
    await clientPage
      .getByRole("alertdialog")
      .getByRole("button", { name: /제출|submit/i })
      .click();

    await clientPage.waitForURL(/\/app\/projects\/[^?#/]+\?tab=brief/, {
      timeout: 30_000,
    });
    const m = clientPage.url().match(projectIdMatch);
    expect(m).not.toBeNull();
    const projectId = m![1];

    // 안녕하세요 should be visible in the rendered brief.
    await expect(clientPage.locator(".tiptap-prose").first()).toContainText(
      "안녕하세요",
    );
    await clientCtx.close();

    // ----- Admin session: post a comment ---------------------------------
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await adminPage.goto("/signin");
    await adminPage
      .getByLabel(/이메일|email/i)
      .fill(process.env.E2E_ADMIN_EMAIL!);
    await adminPage
      .getByLabel(/비밀번호|password/i)
      .fill(process.env.E2E_ADMIN_PASSWORD!);
    await adminPage.getByRole("button", { name: /로그인|sign in/i }).click();
    await adminPage.waitForURL(/\/app\//, { timeout: 15_000 });

    await adminPage.goto(`/app/projects/${projectId}?tab=brief`);
    await adminPage.locator(".tiptap-prose").first().waitFor({
      state: "visible",
      timeout: 15_000,
    });

    // Open comment composer (selector intentionally tolerant — the
    // brief-board comment-panel may evolve before Phase 2.8.2 ships).
    const commentTrigger = adminPage.getByRole("button", {
      name: /(코멘트|comment)/i,
    });
    if (await commentTrigger.count()) {
      await commentTrigger.first().click();
    }
    const commentInput = adminPage
      .getByPlaceholder(/(코멘트|comment)/i)
      .first();
    await commentInput.fill("admin reviewed — looks good");
    await adminPage.keyboard.press("Control+Enter");
    await adminCtx.close();

    // ----- Client session 2: notification arrived ------------------------
    const client2Ctx = await browser.newContext();
    const client2Page = await client2Ctx.newPage();
    await client2Page.goto("/signin");
    await client2Page
      .getByLabel(/이메일|email/i)
      .fill(process.env.E2E_CLIENT_EMAIL!);
    await client2Page
      .getByLabel(/비밀번호|password/i)
      .fill(process.env.E2E_CLIENT_PASSWORD!);
    await client2Page
      .getByRole("button", { name: /로그인|sign in/i })
      .click();
    await client2Page.waitForURL(/\/app\//, { timeout: 15_000 });

    await client2Page.goto("/app/notifications");
    // Generous timeout — notification fan-out cron may run on a delay.
    await expect(
      client2Page.getByText(new RegExp(title, "i")).first(),
    ).toBeVisible({ timeout: 30_000 });
    await client2Ctx.close();
  });
});
