import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

const runPassword = `RoleSmoke-${Date.now()}-Aa1!`;

type Actor = "brand" | "artist" | "creator" | "yagi_admin";

type FixtureUser = {
  actor: Actor;
  email: string;
  workspaceKind: "brand" | "artist" | "creator" | "yagi_admin";
  workspaceSlug: string;
  workspaceName: string;
};

type FixtureState = {
  users: Record<Actor, FixtureUser & { userId: string; workspaceId: string }>;
  adminBrandWorkspaceId: string;
  adminBrandWorkspaceName: string;
  campaignSlug: string;
  campaignId: string;
  categoryId: string;
};

const fixtures: FixtureUser[] = [
  {
    actor: "brand",
    email: "e2e-role-brand@yagiworkshop.xyz",
    workspaceKind: "brand",
    workspaceSlug: "e2e-role-brand",
    workspaceName: "E2E Role Brand",
  },
  {
    actor: "artist",
    email: "e2e-role-artist@yagiworkshop.xyz",
    workspaceKind: "artist",
    workspaceSlug: "e2e-role-artist",
    workspaceName: "E2E Role Artist",
  },
  {
    actor: "creator",
    email: "e2e-role-creator@yagiworkshop.xyz",
    workspaceKind: "creator",
    workspaceSlug: "e2e-role-creator",
    workspaceName: "E2E Role Creator",
  },
  {
    actor: "yagi_admin",
    email: "e2e-role-admin@yagiworkshop.xyz",
    workspaceKind: "yagi_admin",
    workspaceSlug: "e2e-role-yagi-internal",
    workspaceName: "E2E YAGI Internal",
  },
];

let state: FixtureState | null = null;

test.describe("role consistency smoke", () => {
  test.skip(!hasSupabaseEnv, "Supabase env is required for role smoke fixtures");
  test.use({ storageState: undefined, viewport: { width: 1280, height: 900 } });

  test.beforeAll(async () => {
    state = await ensureFixtures();
  });

  test("4 actors land on their product-approved defaults", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    const expected: Record<Actor, RegExp> = {
      brand: /\/ko\/app\/explore$/,
      artist: /\/ko\/app\/explore$/,
      creator: /\/ko\/app\/campaigns$/,
      yagi_admin: /\/ko\/app\/admin$/,
    };

    for (const actor of Object.keys(expected) as Actor[]) {
      await signInAs(page, actor);
      await page.goto("/ko/app", { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(expected[actor]);
    }
    expect(consoleErrors).toEqual([]);
  });

  test("top nav is actor-whitelisted", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    const matrix: Record<
      Actor,
      { visible: string[]; hidden: string[]; start: string }
    > = {
      brand: {
        start: "/ko/app/explore",
        visible: [
          "/app/explore",
          "/app/projects",
          "/app/campaigns",
          "/app/discover",
          "/app/americano",
        ],
        hidden: [
          "/app/twins",
          "/app/deals",
          "/app/my-submissions",
          "/app/billing",
          "/app/admin",
          "/app/assets",
        ],
      },
      artist: {
        start: "/ko/app/explore",
        visible: [
          "/app/explore",
          "/app/studio/new",
          "/app/campaigns",
          "/app/twins",
          "/app/deals",
        ],
        hidden: [
          "/app/projects",
          "/app/my-submissions",
          "/app/billing",
          "/app/admin",
          "/app/americano",
          "/app/assets",
        ],
      },
      creator: {
        start: "/ko/app/campaigns",
        visible: ["/app/campaigns", "/app/my-submissions"],
        hidden: [
          "/app/explore",
          "/app/projects",
          "/app/discover",
          "/app/twins",
          "/app/deals",
          "/app/billing",
          "/app/admin",
          "/app/americano",
          "/app/assets",
        ],
      },
      yagi_admin: {
        start: "/ko/app/admin",
        visible: ["/app/admin", "/app/billing", "/app/americano"],
        hidden: [
          "/app/explore",
          "/app/projects",
          "/app/campaigns",
          "/app/discover",
          "/app/twins",
          "/app/deals",
          "/app/my-submissions",
          "/app/assets",
        ],
      },
    };

    for (const actor of Object.keys(matrix) as Actor[]) {
      await signInAs(page, actor);
      await page.goto(matrix[actor].start, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("banner")).toBeVisible();
      await expectHeaderLinks(page, matrix[actor].visible, matrix[actor].hidden);
      const header = page.getByRole("banner");
      if (actor === "brand") {
        await expect(header.getByText("0 credits")).toBeVisible();
      } else {
        await expect(header.getByText("0 credits")).toHaveCount(0);
      }
    }
    expect(consoleErrors).toEqual([]);
  });

  test("direct URL guards redirect actors out of forbidden surfaces", async ({
    page,
  }) => {
    const consoleErrors = collectConsoleErrors(page);
    await signInAs(page, "creator");
    for (const path of [
      "/ko/app/projects/new",
      "/ko/app/campaigns/new",
      "/ko/app/dashboard",
    ]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/ko\/app\/campaigns$/);
    }

    await signInAs(page, "brand");
    await page.goto("/ko/app/my-submissions", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/ko\/app\/explore$/);
    await page.goto("/ko/app/admin", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/ko\/app\/explore$/);
    await page.goto("/ko/app/notifications", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/ko\/app\/settings\/notifications$/);

    await signInAs(page, "yagi_admin");
    await page.goto("/ko/app/my-submissions", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/ko\/app\/admin$/);
    expect(consoleErrors).toEqual([]);
  });

  test("creator campaign discovery links to the existing submit route", async ({
    page,
  }) => {
    const consoleErrors = collectConsoleErrors(page);
    const s = requireState();
    await signInAs(page, "creator");
    await page.goto("/ko/app/campaigns", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "참여 가능한 콘테스트" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "콘테스트 열기" })).toHaveCount(0);

    const submitLink = page.locator(`a[href="/campaigns/${s.campaignSlug}/submit"]`);
    await expect(submitLink).toBeVisible();
    const response = await page.goto(`/campaigns/${s.campaignSlug}/submit`, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { name: "응모하기" })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test("global admin in a brand workspace sees switch guidance instead of admin surfaces", async ({
    page,
  }) => {
    const consoleErrors = collectConsoleErrors(page);
    const s = requireState();
    await signInAs(page, "yagi_admin");
    await setActiveWorkspaceCookie(page, s.adminBrandWorkspaceId);

    await page.goto("/ko/app/explore", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: new RegExp(s.adminBrandWorkspaceName) })).toBeVisible();
    await expectHeaderLinks(
      page,
      ["/app/explore", "/app/projects", "/app/campaigns", "/app/discover", "/app/americano"],
      ["/app/admin", "/app/billing", "/app/twins", "/app/deals", "/app/my-submissions"],
    );
    await expect(page.getByRole("banner").getByText("워크스페이스 검색")).toHaveCount(0);

    await page.goto("/ko/app/admin", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "YAGI Internal로 전환하세요" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "관리자 대시보드" })).toHaveCount(0);
    await page.getByRole("button", { name: "YAGI Internal로 전환" }).click();
    await expect(page).toHaveURL(/\/ko\/app\/admin$/);
    await expect(page.getByRole("heading", { name: "관리자 대시보드" })).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test("admin billing operations are visible only from the internal actor", async ({
    page,
  }) => {
    const consoleErrors = collectConsoleErrors(page);
    const s = requireState();
    await signInAs(page, "yagi_admin");

    await page.goto("/ko/app/billing", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Popbill 서버 연동")).toBeVisible();
    await expect(page.getByRole("link", { name: "청구 작업 콘솔" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "관리자 송장 보기" }).first(),
    ).toBeVisible();
    await expect(page.getByText("정산 내역 준비 중")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "받은 송장" })).toHaveCount(0);

    await setActiveWorkspaceCookie(page, s.adminBrandWorkspaceId);
    await page.goto("/ko/app/billing", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("정산 내역 준비 중")).toBeVisible();
    await expect(page.getByText("Popbill 서버 연동")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "청구 작업 콘솔" })).toHaveCount(0);

    expect(consoleErrors).toEqual([]);
  });

  test("campaign submission duplicate indexes reject repeat creator submissions", async () => {
    const s = requireState();
    const admin = adminClient();
    await admin
      .from("campaign_submissions")
      .delete()
      .eq("campaign_id", s.campaignId)
      .eq("applicant_workspace_id", s.users.creator.workspaceId);

    const first = await admin.from("campaign_submissions").insert({
      campaign_id: s.campaignId,
      category_id: s.categoryId,
      applicant_workspace_id: s.users.creator.workspaceId,
      applicant_email: "e2e-role-creator-duplicate@example.com",
      applicant_name: "E2E Creator",
      applicant_phone: "010-0000-0000",
      title: "E2E duplicate guard first",
      external_url: "https://example.com/e2e-first",
      status: "submitted",
    });
    expect(first.error).toBeNull();

    const duplicate = await admin.from("campaign_submissions").insert({
      campaign_id: s.campaignId,
      category_id: s.categoryId,
      applicant_workspace_id: s.users.creator.workspaceId,
      applicant_email: "e2e-role-creator-duplicate-2@example.com",
      applicant_name: "E2E Creator",
      applicant_phone: "010-0000-0000",
      title: "E2E duplicate guard second",
      external_url: "https://example.com/e2e-second",
      status: "submitted",
    });
    expect(duplicate.error?.code).toBe("23505");
  });
});

async function signInAs(page: Page, actor: Actor) {
  const s = requireState();
  await page.goto("about:blank");
  await page.context().clearCookies();
  await page.goto("/ko/signin", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/이메일|email/i).fill(s.users[actor].email);
  await page.getByLabel(/비밀번호|password/i).fill(runPassword);
  await page.getByRole("button", { name: /로그인|sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/signin"), {
    timeout: 20_000,
  });
}

async function setActiveWorkspaceCookie(page: Page, workspaceId: string) {
  await page.evaluate((id) => {
    document.cookie = `yagi_active_workspace=${id}; path=/; max-age=7776000; SameSite=Lax`;
  }, workspaceId);
}

async function expectHeaderLinks(
  page: Page,
  visible: string[],
  hidden: string[],
) {
  const header = page.getByRole("banner").locator('nav[aria-label="Primary"]');
  for (const href of visible) {
    await expect(header.locator(`a[href$="${href}"]`)).toBeVisible();
  }
  for (const href of hidden) {
    await expect(header.locator(`a[href$="${href}"]`)).toHaveCount(0);
  }
}

function requireState(): FixtureState {
  if (!state) throw new Error("role smoke fixtures are not initialized");
  return state;
}

function collectConsoleErrors(page: Page): string[] {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  return consoleErrors;
}

function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function ensureFixtures(): Promise<FixtureState> {
  const admin = adminClient();
  const users = {} as FixtureState["users"];

  for (const fixture of fixtures) {
    const userId = await ensureAuthUser(admin, fixture);
    await ensureProfile(admin, userId, fixture);
    const workspaceId = await ensureWorkspace(admin, fixture);
    await ensureMembership(admin, userId, workspaceId);
    await ensureRoles(admin, userId, workspaceId, fixture.actor);
    if (fixture.actor === "artist") {
      await ensureArtistProfile(admin, userId, workspaceId, fixture);
    }
    users[fixture.actor] = { ...fixture, userId, workspaceId };
  }

  const campaign = await ensureOpenCampaign(admin, users.brand);
  const adminBrandWorkspaceName = "E2E Admin Active Brand";
  const adminBrandWorkspaceId = await ensureWorkspace(admin, {
    actor: "yagi_admin",
    email: fixtures.find((fixture) => fixture.actor === "yagi_admin")!.email,
    workspaceKind: "brand",
    workspaceSlug: "e2e-role-admin-brand",
    workspaceName: adminBrandWorkspaceName,
  });
  await ensureMembership(admin, users.yagi_admin.userId, adminBrandWorkspaceId);

  await admin
    .from("campaign_submissions")
    .delete()
    .eq("campaign_id", campaign.campaignId)
    .eq("applicant_workspace_id", users.creator.workspaceId);

  return {
    users,
    adminBrandWorkspaceId,
    adminBrandWorkspaceName,
    ...campaign,
  };
}

async function ensureAuthUser(
  admin: SupabaseClient,
  fixture: FixtureUser,
): Promise<string> {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;
  const existing = listed.users.find((user) => user.email === fixture.email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: runPassword,
      user_metadata: { name: fixture.workspaceName },
    });
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: fixture.email,
    password: runPassword,
    email_confirm: true,
    user_metadata: { name: fixture.workspaceName },
  });
  if (error) throw error;
  if (!data.user) throw new Error(`missing created user for ${fixture.actor}`);
  return data.user.id;
}

async function ensureProfile(
  admin: SupabaseClient,
  userId: string,
  fixture: FixtureUser,
) {
  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      handle: `e2e_role_${fixture.actor}`,
      display_name: fixture.workspaceName,
      locale: "ko",
      role:
        fixture.actor === "creator" || fixture.actor === "artist"
          ? fixture.actor
          : "client",
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

async function ensureWorkspace(
  admin: SupabaseClient,
  fixture: FixtureUser,
): Promise<string> {
  const { data: existing, error: lookupError } = await admin
    .from("workspaces")
    .select("id")
    .eq("slug", fixture.workspaceSlug)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (existing?.id) {
    const { error } = await admin
      .from("workspaces")
      .update({
        name: fixture.workspaceName,
        kind: fixture.workspaceKind,
        is_test: false,
      })
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await admin
    .from("workspaces")
    .insert({
      name: fixture.workspaceName,
      slug: fixture.workspaceSlug,
      kind: fixture.workspaceKind,
      brand_guide: {},
      is_test: false,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function ensureMembership(
  admin: SupabaseClient,
  userId: string,
  workspaceId: string,
) {
  const { data: existing, error: lookupError } = await admin
    .from("workspace_members")
    .select("id")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (existing?.id) {
    const { error } = await admin
      .from("workspace_members")
      .update({ role: "admin", joined_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await admin.from("workspace_members").insert({
    user_id: userId,
    workspace_id: workspaceId,
    role: "admin",
    invited_at: new Date().toISOString(),
    joined_at: new Date().toISOString(),
  });
  if (error) throw error;
}

async function ensureRoles(
  admin: SupabaseClient,
  userId: string,
  workspaceId: string,
  actor: Actor,
) {
  if (actor === "yagi_admin") {
    const { error: deleteError } = await admin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .neq("role", "yagi_admin");
    if (deleteError) throw deleteError;

    const { data: existing, error: lookupError } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "yagi_admin")
      .is("workspace_id", null)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (!existing) {
      const { error } = await admin.from("user_roles").insert({
        user_id: userId,
        role: "yagi_admin",
        workspace_id: null,
      });
      if (error) throw error;
    }
    return;
  }

  const { error: deleteError } = await admin
    .from("user_roles")
    .delete()
    .eq("user_id", userId);
  if (deleteError) throw deleteError;

  const { error } = await admin.from("user_roles").insert({
    user_id: userId,
    role: "workspace_admin",
    workspace_id: workspaceId,
  });
  if (error) throw error;
}

async function ensureArtistProfile(
  admin: SupabaseClient,
  userId: string,
  workspaceId: string,
  fixture: FixtureUser,
) {
  const { error } = await admin.from("artist_profile").upsert(
    {
      workspace_id: workspaceId,
      owner_user_id: userId,
      display_name: fixture.workspaceName,
      instagram_handle: "e2e_role_artist",
      visibility_mode: "open",
      twin_status: "active",
      auto_decline_categories: [],
      bypass_brand_ids: [],
    },
    { onConflict: "workspace_id" },
  );
  if (error) throw error;
}

async function ensureOpenCampaign(
  admin: SupabaseClient,
  brand: FixtureState["users"]["brand"],
): Promise<Pick<FixtureState, "campaignSlug" | "campaignId" | "categoryId">> {
  const campaignSlug = "e2e-role-open-campaign";
  const campaignPayload = {
    slug: campaignSlug,
    title: "E2E Role Open Campaign",
    description: "Creator route smoke fixture",
    brief: "Creator route smoke fixture",
    sponsor_workspace_id: brand.workspaceId,
    status: "published",
    submission_open_at: new Date(Date.now() - 60_000).toISOString(),
    submission_close_at: new Date(Date.now() + 86400_000).toISOString(),
    allow_r2_upload: false,
    allow_external_url: true,
    created_by: brand.userId,
    request_metadata: { e2e: true },
    decision_metadata: { e2e: true },
  };

  const { data: existing, error: lookupError } = await admin
    .from("campaigns")
    .select("id")
    .eq("slug", campaignSlug)
    .maybeSingle();
  if (lookupError) throw lookupError;

  let campaignId: string;
  if (existing?.id) {
    const { error } = await admin
      .from("campaigns")
      .update(campaignPayload)
      .eq("id", existing.id);
    if (error) throw error;
    campaignId = existing.id;
  } else {
    const { data, error } = await admin
      .from("campaigns")
      .insert(campaignPayload)
      .select("id")
      .single();
    if (error) throw error;
    campaignId = data.id;
  }

  const { data: category, error: categoryLookupError } = await admin
    .from("campaign_categories")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("name", "E2E Role Category")
    .maybeSingle();
  if (categoryLookupError) throw categoryLookupError;
  if (category?.id) {
    return { campaignSlug, campaignId, categoryId: category.id };
  }

  const { data: createdCategory, error: categoryError } = await admin
    .from("campaign_categories")
    .insert({
      campaign_id: campaignId,
      name: "E2E Role Category",
      description: "E2E role smoke category",
      display_order: 0,
    })
    .select("id")
    .single();
  if (categoryError) throw categoryError;
  return { campaignSlug, campaignId, categoryId: createdCategory.id };
}
