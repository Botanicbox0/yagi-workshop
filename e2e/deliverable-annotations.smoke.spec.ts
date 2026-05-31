import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

const runPassword = `AnnotationSmoke-${Date.now()}-Aa1!`;
const brandEmail = "e2e-annotation-brand@yagiworkshop.xyz";
const adminEmail = "e2e-annotation-admin@yagiworkshop.xyz";

type FixtureState = {
  brandUserId: string;
  adminUserId: string;
  workspaceId: string;
  projectId: string;
  deliverableId: string;
};

let state: FixtureState | null = null;

test.describe("deliverable image annotations smoke", () => {
  test.skip(!hasSupabaseEnv, "Supabase env is required for annotation smoke");
  test.use({ storageState: undefined, viewport: { width: 1280, height: 900 } });

  test.beforeAll(async () => {
    state = await ensureFixtures();
  });

  test("brand can create, inspect, resolve, and keep internal pins hidden", async ({
    page,
  }) => {
    const s = requireState();
    const consoleErrors = collectConsoleErrors(page);
    await mockDeliverableImage(page);
    await signInAs(page, brandEmail);

    await page.goto(`/ko/app/projects/${s.projectId}?tab=deliverables`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByRole("main")).toBeVisible();

    const image = page.getByTestId("annotation-image-0").first();
    await expect(image).toBeVisible();
    await image.click({ position: { x: 160, y: 110 }, force: true });
    await expect(page.getByTestId("annotation-draft")).toBeVisible();
    await page
      .getByPlaceholder("이 부분을 어떻게 수정하면 좋을지 적어주세요.")
      .fill("E2E 핀: 모델 손 위치를 조금 더 자연스럽게");
    await page.getByRole("button", { name: "핀 저장" }).click();

    const marker = page.getByTestId("annotation-marker-1");
    await expect(marker).toBeVisible();
    await marker.hover();
    await expect(page.getByText("E2E 핀: 모델 손 위치").first()).toBeVisible();

    await marker.click();
    await expect(page.getByText("핀 대화 #1")).toBeVisible();
    await page.getByRole("button", { name: "해결 처리" }).click();
    await expect(page.getByRole("button", { name: "다시 열기" })).toBeVisible();

    await createInternalAnnotation(
      adminClient(),
      s.projectId,
      s.deliverableId,
      s.adminUserId,
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("annotation-marker-9")).toHaveCount(0);

    await page.goto(
      `/ko/app/projects/${s.projectId}?tab=comments&feedback=${s.deliverableId}`,
      { waitUntil: "domcontentloaded" },
    );
    await expect(page.getByText(/V1 피드백|Version 1 feedback/).first()).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test("mobile tap creates a pin draft", async ({ page }) => {
    const s = requireState();
    const consoleErrors = collectConsoleErrors(page);
    await page.setViewportSize({ width: 375, height: 900 });
    await mockDeliverableImage(page);
    await signInAs(page, brandEmail);

    await page.goto(`/ko/app/projects/${s.projectId}?tab=deliverables`, {
      waitUntil: "domcontentloaded",
    });
    const image = page.getByTestId("annotation-image-0").first();
    await expect(image).toBeVisible();
    await image.click({ position: { x: 150, y: 95 }, force: true });
    await expect(page.getByTestId("annotation-draft")).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
});

async function mockDeliverableImage(page: Page) {
  await page.route("**/*e2e-annotation-smoke.png*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="#161616"/><rect x="80" y="60" width="640" height="330" rx="20" fill="#2A2A2A"/><circle cx="400" cy="215" r="92" fill="#ED1E1E"/><rect x="345" y="300" width="110" height="35" rx="10" fill="#FAD204"/></svg>`,
    });
  });
}

async function signInAs(page: Page, email: string) {
  await page.goto("about:blank");
  await page.context().clearCookies();
  await page.goto("/ko/signin", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/이메일|email/i).fill(email);
  await page.getByLabel(/비밀번호|password/i).fill(runPassword);
  await page.getByRole("button", { name: /로그인|sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/signin"), {
    timeout: 20_000,
  });
}

function collectConsoleErrors(page: Page): string[] {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  return consoleErrors;
}

function requireState(): FixtureState {
  if (!state) throw new Error("annotation smoke fixtures are not initialized");
  return state;
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
  const brandUserId = await ensureAuthUser(admin, brandEmail, "E2E Annotation Brand");
  const adminUserId = await ensureAuthUser(admin, adminEmail, "E2E Annotation Admin");
  await ensureProfile(admin, brandUserId, "e2e_annotation_brand", "E2E Annotation Brand");
  await ensureProfile(admin, adminUserId, "e2e_annotation_admin", "E2E Annotation Admin");

  const workspaceId = await ensureWorkspace(admin);
  await ensureMembership(admin, brandUserId, workspaceId);
  await resetRoles(admin, brandUserId, workspaceId, false);
  await resetRoles(admin, adminUserId, null, true);

  const projectId = await createProject(admin, workspaceId, brandUserId);
  const deliverableId = await createDeliverable(admin, projectId, brandUserId);

  return { brandUserId, adminUserId, workspaceId, projectId, deliverableId };
}

async function ensureAuthUser(
  admin: SupabaseClient,
  email: string,
  name: string,
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
      user_metadata: { name },
    });
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: runPassword,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error) throw error;
  if (!data.user) throw new Error(`missing created user for ${email}`);
  return data.user.id;
}

async function ensureProfile(
  admin: SupabaseClient,
  userId: string,
  handle: string,
  displayName: string,
) {
  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      handle,
      display_name: displayName,
      locale: "ko",
      role: "client",
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

async function ensureWorkspace(admin: SupabaseClient): Promise<string> {
  const slug = "e2e-annotation-brand";
  const { data: existing, error: lookupError } = await admin
    .from("workspaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing?.id) return existing.id;

  const { data, error } = await admin
    .from("workspaces")
    .insert({
      name: "E2E Annotation Brand",
      slug,
      kind: "brand",
      brand_guide: {},
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
  const { error } = await admin.from("workspace_members").upsert(
    {
      user_id: userId,
      workspace_id: workspaceId,
      role: "admin",
      invited_at: new Date().toISOString(),
      joined_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,user_id" },
  );
  if (error) throw error;
}

async function resetRoles(
  admin: SupabaseClient,
  userId: string,
  workspaceId: string | null,
  yagiAdmin: boolean,
) {
  const { error: deleteError } = await admin
    .from("user_roles")
    .delete()
    .eq("user_id", userId);
  if (deleteError) throw deleteError;

  const { error } = await admin.from("user_roles").insert({
    user_id: userId,
    role: yagiAdmin ? "yagi_admin" : "workspace_admin",
    workspace_id: yagiAdmin ? null : workspaceId,
  });
  if (error) throw error;
}

async function createProject(
  admin: SupabaseClient,
  workspaceId: string,
  createdBy: string,
): Promise<string> {
  const { data, error } = await admin
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      created_by: createdBy,
      title: `E2E Annotation Smoke ${Date.now()}`,
      brief: "Annotation smoke fixture",
      status: "delivered",
      project_type: "direct_commission",
      deliverable_types: ["image"],
      intake_mode: "brief",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function createDeliverable(
  admin: SupabaseClient,
  projectId: string,
  submittedBy: string,
): Promise<string> {
  const { data, error } = await admin
    .from("project_deliverables")
    .insert({
      project_id: projectId,
      submitted_by: submittedBy,
      version: 1,
      storage_paths: [`project-deliverables/${projectId}/e2e-annotation-smoke.png`],
      external_urls: [],
      note: "E2E annotation fixture",
      status: "submitted",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function createInternalAnnotation(
  admin: SupabaseClient,
  projectId: string,
  deliverableId: string,
  adminUserId: string,
) {
  const { data: thread, error: threadError } = await admin
    .from("project_threads")
    .insert({
      project_id: projectId,
      title: "Annotation #9",
      created_by: adminUserId,
    })
    .select("id")
    .single();
  if (threadError) throw threadError;

  const { data: annotation, error: annotationError } = await admin
    .from("deliverable_annotations")
    .insert({
      project_id: projectId,
      deliverable_id: deliverableId,
      asset_index: 0,
      seq: 9,
      shape: "pin",
      coords: { x: 0.18, y: 0.2 },
      thread_id: thread.id,
      visibility: "internal",
      status: "open",
      created_by: adminUserId,
    })
    .select("id")
    .single();
  if (annotationError) throw annotationError;

  const { error: updateError } = await admin
    .from("project_threads")
    .update({ annotation_id: annotation.id })
    .eq("id", thread.id);
  if (updateError) throw updateError;

  const { error: messageError } = await admin.from("thread_messages").insert({
    thread_id: thread.id,
    author_id: adminUserId,
    body: "E2E internal annotation must stay hidden from brand",
    visibility: "internal",
  });
  if (messageError) throw messageError;
}
