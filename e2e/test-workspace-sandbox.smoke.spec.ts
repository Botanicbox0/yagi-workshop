import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

const adminEmail = "e2e-sandbox-admin@yagiworkshop.xyz";
const nonAdminEmail = "e2e-sandbox-non-admin@yagiworkshop.xyz";
const runPassword = `Sandbox-${Date.now()}-Aa1!`;
const testProjectTitle = `E2E Sandbox Test Project ${Date.now()}`;

type SandboxState = {
  adminUserId: string;
  workspaces: Record<"internal" | "brand" | "creator" | "artist", string>;
  testProjectId: string;
};

let state: SandboxState | null = null;

test.describe("test workspace sandbox smoke", () => {
  test.skip(!hasSupabaseEnv, "Supabase env is required for sandbox smoke fixtures");
  test.use({ storageState: undefined, viewport: { width: 1280, height: 900 } });

  test.beforeAll(async () => {
    state = await ensureSandboxFixtures();
  });

  test("admin can switch sandbox workspaces and each kind routes correctly", async ({
    page,
  }) => {
    const consoleErrors = collectConsoleErrors(page);
    await signInAsSandboxAdmin(page);

    await page.goto("/ko/app", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/ko\/app\/admin$/);
    await expectHeaderLink(page, "/app/admin", true);

    await selectWorkspace(page, "Test Brand");
    await expect(page.getByRole("button", { name: /Test Brand/ })).toBeVisible();
    await expect(page.getByText("TEST").first()).toBeVisible();
    await expectHeaderLink(page, "/app/projects", true);
    await expectHeaderLink(page, "/app/admin", false);
    await expectHeaderLink(page, "/app/billing", false);
    await page.goto("/ko/app/admin", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "YAGI Internal로 전환하세요" })).toBeVisible();
    const switchButton = page.getByRole("button", { name: "YAGI Internal로 전환" });
    await expect(switchButton).toBeEnabled();
    await switchButton.click();
    await expect(page).toHaveURL(/\/ko\/app\/admin$/);
    await expect(page.getByRole("heading", { name: "관리자 대시보드" })).toBeVisible();

    await selectWorkspace(page, "Test Brand");
    await page.goto("/ko/app", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/ko\/app\/explore$/);

    await selectWorkspace(page, "Test Creator");
    await expect(page.getByRole("button", { name: /Test Creator/ })).toBeVisible();
    await expect(page.getByText("TEST").first()).toBeVisible();
    await page.goto("/ko/app", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/ko\/app\/campaigns$/);
    await expectHeaderLink(page, "/app/my-submissions", true);
    await expectHeaderLink(page, "/app/billing", false);

    await selectWorkspace(page, "Test Artist");
    await expect(page.getByRole("button", { name: /Test Artist/ })).toBeVisible();
    await expect(page.getByText("TEST").first()).toBeVisible();
    await page.goto("/ko/app", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/ko\/app\/deals$/);
    await expectHeaderLink(page, "/app/twins", true);
    await expectHeaderLink(page, "/app/projects", false);

    await selectWorkspace(page, "YAGI Internal");
    await expect(page.getByRole("banner").getByText("TEST 워크스페이스")).toHaveCount(0);
    await page.goto("/ko/app", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/ko\/app\/admin$/);
    await expectHeaderLink(page, "/app/admin", true);

    expect(consoleErrors).toEqual([]);
  });

  test("admin operations exclude sandbox projects unless explicitly included", async ({
    page,
  }) => {
    const consoleErrors = collectConsoleErrors(page);
    await signInAsSandboxAdmin(page);
    await page.goto("/ko/app/admin/projects", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(testProjectTitle)).toHaveCount(0);
    await expect(page.getByText("실데이터만")).toBeVisible();

    await page.goto("/ko/app/admin/projects?includeTest=1", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText(testProjectTitle)).toBeVisible();
    await expect(page.getByText("TEST").first()).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test("admin invoice operations load with the sandbox data toggle", async ({
    page,
  }) => {
    const consoleErrors = collectConsoleErrors(page);
    await signInAsSandboxAdmin(page);

    await page.goto("/ko/app/admin/invoices", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("실데이터만")).toBeVisible();

    await page.goto("/ko/app/admin/invoices?includeTest=1", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText("테스트 포함")).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test("non-admin users cannot be attached to test workspaces", async () => {
    const s = requireState();
    const admin = adminClient();
    const nonAdminUserId = await ensureAuthUser(admin, nonAdminEmail);
    await ensureProfile(admin, nonAdminUserId, "E2E Sandbox Non Admin");
    await admin.from("user_roles").delete().eq("user_id", nonAdminUserId);
    await admin
      .from("workspace_members")
      .delete()
      .eq("workspace_id", s.workspaces.brand)
      .eq("user_id", nonAdminUserId);

    const result = await admin.from("workspace_members").insert({
      workspace_id: s.workspaces.brand,
      user_id: nonAdminUserId,
      role: "admin",
      invited_at: new Date().toISOString(),
      joined_at: new Date().toISOString(),
    });

    expect(result.error?.message).toContain(
      "test_workspace_membership_requires_yagi_admin",
    );
  });
});

async function signInAsSandboxAdmin(page: Page) {
  await page.goto("about:blank");
  await page.context().clearCookies();
  await page.goto("/ko/signin", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/이메일|email/i).fill(adminEmail);
  await page.getByLabel(/비밀번호|password/i).fill(runPassword);
  await page.getByRole("button", { name: /로그인|sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/signin"), {
    timeout: 20_000,
  });
}

async function selectWorkspace(page: Page, name: string) {
  await page
    .getByRole("banner")
    .getByRole("button", { name: /YAGI Internal|Test Brand|Test Creator|Test Artist/ })
    .click();
  await page.getByRole("menuitem", { name: new RegExp(name) }).click();
  await page.keyboard.press("Escape");
  await page.waitForLoadState("networkidle");
}

async function expectHeaderLink(page: Page, href: string, visible: boolean) {
  const header = page.getByRole("banner").locator('nav[aria-label="Primary"]');
  const link = header.locator(`a[href$="${href}"]`);
  if (visible) {
    await expect(link).toBeVisible();
  } else {
    await expect(link).toHaveCount(0);
  }
}

function collectConsoleErrors(page: Page): string[] {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  return consoleErrors;
}

function requireState(): SandboxState {
  if (!state) throw new Error("sandbox fixtures are not initialized");
  return state;
}

function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function ensureSandboxFixtures(): Promise<SandboxState> {
  const admin = adminClient();
  const adminUserId = await ensureAuthUser(admin, adminEmail);
  await ensureProfile(admin, adminUserId, "E2E Sandbox Admin");

  await admin.from("user_roles").delete().eq("user_id", adminUserId);
  const { error: roleError } = await admin.from("user_roles").insert({
    user_id: adminUserId,
    role: "yagi_admin",
    workspace_id: null,
  });
  if (roleError) throw roleError;

  const workspaces = await loadSandboxWorkspaces(admin);
  for (const workspaceId of Object.values(workspaces)) {
    await ensureMembership(admin, adminUserId, workspaceId);
  }
  await ensureTestArtistProfile(admin, adminUserId, workspaces.artist);
  const testProjectId = await ensureTestProject(admin, adminUserId, workspaces.brand);

  return { adminUserId, workspaces, testProjectId };
}

async function ensureAuthUser(
  admin: SupabaseClient,
  email: string,
): Promise<string> {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;
  const existing = listed.users.find((user) => user.email === email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: runPassword,
      user_metadata: { name: email },
    });
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: runPassword,
    email_confirm: true,
    user_metadata: { name: email },
  });
  if (error) throw error;
  if (!data.user) throw new Error(`missing created user for ${email}`);
  return data.user.id;
}

async function ensureProfile(
  admin: SupabaseClient,
  userId: string,
  displayName: string,
) {
  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      handle: `e2e_sandbox_${userId.slice(0, 8)}`,
      display_name: displayName,
      locale: "ko",
      role: "client",
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

async function loadSandboxWorkspaces(admin: SupabaseClient) {
  const { data, error } = await admin
    .from("workspaces")
    .select("id, slug")
    .in("slug", [
      "yagi-internal",
      "yagi-test-brand",
      "yagi-test-creator",
      "yagi-test-artist",
    ]);
  if (error) throw error;
  const bySlug = new Map((data ?? []).map((row) => [row.slug, row.id]));
  return {
    internal: requireWorkspace(bySlug, "yagi-internal"),
    brand: requireWorkspace(bySlug, "yagi-test-brand"),
    creator: requireWorkspace(bySlug, "yagi-test-creator"),
    artist: requireWorkspace(bySlug, "yagi-test-artist"),
  };
}

function requireWorkspace(map: Map<string, string>, slug: string): string {
  const id = map.get(slug);
  if (!id) throw new Error(`missing sandbox workspace ${slug}`);
  return id;
}

async function ensureMembership(
  admin: SupabaseClient,
  userId: string,
  workspaceId: string,
) {
  const { error } = await admin.from("workspace_members").upsert(
    {
      workspace_id: workspaceId,
      user_id: userId,
      role: "admin",
      invited_at: new Date().toISOString(),
      joined_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,user_id" },
  );
  if (error) throw error;
}

async function ensureTestArtistProfile(
  admin: SupabaseClient,
  userId: string,
  workspaceId: string,
) {
  const { error } = await admin.from("artist_profile").upsert(
    {
      workspace_id: workspaceId,
      owner_user_id: userId,
      display_name: "Test Artist",
      instagram_handle: "yagi_test_artist",
      visibility_mode: "open",
      twin_status: "active",
      auto_decline_categories: [],
      bypass_brand_ids: [],
    },
    { onConflict: "workspace_id" },
  );
  if (error) throw error;
}

async function ensureTestProject(
  admin: SupabaseClient,
  userId: string,
  workspaceId: string,
): Promise<string> {
  const { data: existing, error: lookupError } = await admin
    .from("projects")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("created_by", userId)
    .eq("status", "draft")
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing?.id) {
    const { error } = await admin
      .from("projects")
      .update({ title: testProjectTitle, brief: "Sandbox isolation fixture" })
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await admin
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      created_by: userId,
      title: testProjectTitle,
      brief: "Sandbox isolation fixture",
      status: "draft",
      project_type: "direct_commission",
      deliverable_types: ["image"],
      intake_mode: "brief",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
