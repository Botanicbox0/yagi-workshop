import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import crypto from "node:crypto";

const ENV_PATH = ".env.local";
const DEFAULT_EMAIL = "test-e2e@yagiworkshop.xyz";
const WORKSPACE_SLUG = "yagi-e2e-smoke";
const WORKSPACE_NAME = "YAGI E2E Smoke";
const DISPLAY_NAME = "YAGI E2E";

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const env = {};
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

function appendMissingE2eEnv(email, password) {
  const env = parseEnvFile(ENV_PATH);
  const rows = [];
  if (!env.E2E_CLIENT_EMAIL) rows.push(`E2E_CLIENT_EMAIL=${email}`);
  if (!env.E2E_CLIENT_PASSWORD) rows.push(`E2E_CLIENT_PASSWORD=${password}`);
  if (rows.length === 0) return;
  appendFileSync(ENV_PATH, `\n# Playwright authenticated smoke account\n${rows.join("\n")}\n`, {
    mode: 0o600,
  });
}

async function findUserByEmail(supabase, email) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    const found = data.users.find((user) => user.email === email);
    if (found) return found;
    if (data.users.length < 1000) return null;
    page += 1;
  }
}

async function main() {
  const fileEnv = parseEnvFile(ENV_PATH);
  const env = { ...process.env, ...fileEnv };
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const email = env.E2E_CLIENT_EMAIL || DEFAULT_EMAIL;
  const password =
    env.E2E_CLIENT_PASSWORD || crypto.randomBytes(24).toString("base64url");

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  appendMissingE2eEnv(email, password);

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let user = await findUserByEmail(supabase, email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: DISPLAY_NAME, purpose: "e2e_smoke" },
    });
    if (error) throw error;
    user = data.user;
  } else {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { display_name: DISPLAY_NAME, purpose: "e2e_smoke" },
    });
    if (error) throw error;
  }

  if (!user?.id) throw new Error("E2E auth user id missing");

  const handle = `e2e_${user.id.slice(0, 8)}`;
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    handle,
    display_name: DISPLAY_NAME,
    role: null,
    locale: "ko",
  });
  if (profileError) throw profileError;

  const { data: existingWorkspace, error: existingWorkspaceError } =
    await supabase
      .from("workspaces")
      .select("id")
      .eq("slug", WORKSPACE_SLUG)
      .maybeSingle();
  if (existingWorkspaceError) throw existingWorkspaceError;

  let workspaceId = existingWorkspace?.id;
  if (!workspaceId) {
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .insert({
        name: WORKSPACE_NAME,
        slug: WORKSPACE_SLUG,
        kind: "brand",
        plan: "starter",
      })
      .select("id")
      .single();
    if (workspaceError) throw workspaceError;
    workspaceId = workspace.id;
  }

  const { data: existingMember, error: existingMemberError } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingMemberError) throw existingMemberError;

  if (!existingMember) {
    const { error: memberError } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        role: "member",
        joined_at: new Date().toISOString(),
      });
    if (memberError) throw memberError;
  }

  console.log("[e2e account] ensured test account, isolated workspace, and local env keys.");
}

main().catch((error) => {
  console.error("[e2e account] failed:", error.message);
  process.exit(1);
});
