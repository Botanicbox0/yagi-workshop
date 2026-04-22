# Subtask 12 — Settings pages (profile / workspace / team) + avatar uploader + sidebar enable

**status:** pending
**assigned_to:** executor_sonnet_46
**created:** 2026-04-21
**parallel_group:** — (sequential after 11 — both edited `sidebar-nav.tsx`; 11 is complete)
**spec source:** `.yagi-autobuild/phase-1-2-spec.md` §"Subtask Breakdown / 12"

---

## Executor preamble

1. Read ONLY this file for scope. Also load `/CLAUDE.md` and `.claude/skills/yagi-nextjs-conventions/SKILL.md`.
2. Do NOT read `task_plan.md`, `phase-1-2-spec.md`, or any other subtask file.
3. Read existing shape as needed:
   - `src/lib/app/context.ts` — `fetchAppContext`, `Role` type
   - `src/lib/supabase/{server,client,database.types}.ts` — `profiles`, `workspaces`, `workspace_members` columns
   - `src/components/project/reference-uploader.tsx` — mirror the upload + Supabase browser client pattern
   - `src/components/app/sidebar-nav.tsx` — flip `items[]`'s `settings` entry `disabled: true` → false. Do NOT touch `adminItems` (subtask 11 already enabled it).
   - `src/app/[locale]/app/projects/page.tsx` — mirror URL-based tab pattern (shadcn `<Tabs>` with searchParam as source of truth)
   - `messages/{ko,en}.json` `settings` namespace (15 keys already present: `title, profile_tab, workspace_tab, team_tab, billing_tab, profile_save, avatar_upload, workspace_logo_upload, tax_id_label, tax_id_ph, tax_invoice_email_label, team_invite, team_remove, team_role_admin, team_role_member`)
4. Working directory: `C:\Users\yout4\yagi-studio\yagi-workshop`.
5. Pre-flight:
   - Avatars bucket: **DO NOT ASSUME public reads**. Always use `createSignedUrl(path, 3600)` to display avatars. This is forward-compatible with a pending policy change (avatars may flip to private).
   - Avatar storage path convention: `{userId}/{uuid}.{ext}`. Matches existing RLS that restricts INSERT to `(storage.foldername(name))[1] = auth.uid()::text`.
   - Workspace logo bucket: check if a `workspace-logos` bucket exists. If not → DO NOT create one. Defer workspace-logo upload to a follow-up and leave the logo UI as read-only "coming soon" placeholder. Document the deferral in the result file.
6. If blocked (e.g., `avatars` bucket absent), write `BLOCKED: <reason>` to `results/12_settings_pages.md` and stop.

## Task — multiple new files + one surgical edit

### Route structure

```
src/app/[locale]/app/settings/
  layout.tsx              (Server — fetch app context; renders Tabs nav + children)
  page.tsx                (Server — profile tab default; reads searchParam ?tab=)
  profile-form.tsx        (Client — RHF + avatar uploader)
  workspace-form.tsx      (Client — workspace-admin only; name, tax fields)
  team-panel.tsx          (Server — member list + invite form shell)
  invite-form.tsx         (Client — email input + role select + submit)
  actions.ts              (Server Actions — updateProfile, updateWorkspace, inviteMember, removeMember)
```

### File 1 (new) — `src/app/[locale]/app/settings/layout.tsx`

Server Component. Renders a shadcn `<Tabs>` header (using URL param `?tab=profile|workspace|team`) and the child route content.

```tsx
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { fetchAppContext } from "@/lib/app/context";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function SettingsLayout({ children, params }: Props) {
  const { locale } = await params;
  const ctx = await fetchAppContext();
  if (!ctx) redirect({ href: "/", locale });
  const t = await getTranslations("settings");

  // Tab availability — workspace + team require workspace_admin
  const isWsAdmin = ctx!.roles.includes("workspace_admin");

  const tabs = [
    { key: "profile", label: t("profile_tab"), href: "/app/settings" },
    ...(isWsAdmin
      ? [
          { key: "workspace", label: t("workspace_tab"), href: "/app/settings?tab=workspace" },
          { key: "team", label: t("team_tab"), href: "/app/settings?tab=team" },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-serif italic keep-all mb-6">{t("title")}</h1>
      <div className="border-b border-border mb-8 flex gap-6">
        {tabs.map((tab) => (
          <Link key={tab.key} href={tab.href as "/app/settings"} className="pb-3 text-sm text-muted-foreground hover:text-foreground">
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
```

Note: shadcn `<Tabs>` is already installed. Either use `<Tabs>` with a client wrapper for the indicator state (URL-synced) OR render static `<Link>` headers (simpler — chosen above). Pick whichever is cleaner.

### File 2 (new) — `src/app/[locale]/app/settings/page.tsx`

Server Component. Dispatches to the correct tab panel based on `searchParams.tab`.

```tsx
import { fetchAppContext } from "@/lib/app/context";
import { redirect } from "@/i18n/routing";
import { getLocale } from "next-intl/server";
import { ProfileForm } from "./profile-form";
import { WorkspaceForm } from "./workspace-form";
import { TeamPanel } from "./team-panel";
import { createSupabaseServer } from "@/lib/supabase/server";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const locale = await getLocale();
  const ctx = await fetchAppContext();
  if (!ctx) redirect({ href: "/", locale });
  const tab = sp.tab === "workspace" || sp.tab === "team" ? sp.tab : "profile";

  if (tab === "profile") {
    // Generate a signed avatar URL if present
    const supabase = await createSupabaseServer();
    let avatarSignedUrl: string | null = null;
    if (ctx!.profile.avatar_url) {
      const { data } = await supabase.storage
        .from("avatars")
        .createSignedUrl(ctx!.profile.avatar_url, 3600);
      avatarSignedUrl = data?.signedUrl ?? null;
    }
    return <ProfileForm profile={ctx!.profile} avatarSignedUrl={avatarSignedUrl} userId={ctx!.userId} />;
  }

  // workspace + team tabs require workspace_admin
  if (!ctx!.roles.includes("workspace_admin")) redirect({ href: "/app/settings", locale });
  const workspaceId = ctx!.currentWorkspaceId;
  if (!workspaceId) redirect({ href: "/app", locale });

  if (tab === "workspace") {
    const supabase = await createSupabaseServer();
    const { data: ws } = await supabase
      .from("workspaces")
      .select("id, name, slug, tax_id, tax_invoice_email")
      .eq("id", workspaceId)
      .maybeSingle();
    if (!ws) redirect({ href: "/app", locale });
    return <WorkspaceForm workspace={ws!} />;
  }

  // tab === "team"
  return <TeamPanel workspaceId={workspaceId} />;
}
```

### File 3 (new) — `src/app/[locale]/app/settings/profile-form.tsx`

Client Component (`"use client"`). RHF + Zod. Fields: `display_name`, `handle`, `locale` (ko|en). Avatar upload via browser Supabase client. Submit calls `updateProfile` Server Action.

**Avatar upload flow:**
1. User clicks avatar → hidden file input opens (accept image/jpeg, image/png, image/webp; ≤5MB).
2. On file selected: client uploads to `avatars` bucket at path `${userId}/${crypto.randomUUID()}.${ext}`.
3. On upload success: call `updateProfile` with just `{ avatar_url: <new path> }`.
4. Old avatar path is orphaned (cleanup deferred — Phase 1.3).
5. Display: use the passed `avatarSignedUrl` prop on initial render. After upload succeeds, optimistically re-render with local blob URL OR trigger a router refresh to fetch a new signed URL.

**Submit fields:** Show inline validation errors (Zod), toast on success/error via Sonner.

i18n: all labels via `useTranslations("settings")` + field labels via existing `auth` keys if needed (`auth.display_name_label`, `auth.handle_label` — check if they exist; if not, use `settings.profile_save` button label and plain `<Label>` elements with i18n keys from the `settings` namespace only).

### File 4 (new) — `src/app/[locale]/app/settings/workspace-form.tsx`

Client Component. RHF + Zod. Fields: `name`, `tax_id` (optional), `tax_invoice_email` (optional). Submit calls `updateWorkspace`. Labels from `settings.tax_id_label`, `settings.tax_id_ph`, `settings.tax_invoice_email_label`.

Workspace logo: if a `workspace-logos` bucket does NOT exist, render a disabled "coming soon" placeholder (reuse `dashboard.coming_soon` key). If it exists, mirror the avatar upload flow. Check via `supabase.storage.getBucket('workspace-logos')` — if this errors, treat as absent.

### File 5 (new) — `src/app/[locale]/app/settings/team-panel.tsx`

Server Component. Lists workspace members:

```tsx
type TeamPanelProps = { workspaceId: string };

export async function TeamPanel({ workspaceId }: TeamPanelProps) {
  const supabase = await createSupabaseServer();
  const { data: members } = await supabase
    .from("workspace_members")
    .select(`
      user_id, role, joined_at,
      profile:profiles!user_id(id, display_name, handle, avatar_url)
    `)
    .eq("workspace_id", workspaceId)
    .order("joined_at", { ascending: true });

  // Fetch emails via service client? NO — keep RLS-respecting. Display name + handle only.
  // (Email display would require service role — defer until admin-specific view.)

  return (
    <div className="space-y-4">
      <InviteForm workspaceId={workspaceId} />
      <ul className="divide-y divide-border border border-border rounded-lg">
        {(members ?? []).map((m) => {
          const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
          return (
            <li key={m.user_id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{profile?.display_name ?? profile?.handle ?? m.user_id.slice(0, 8)}</div>
                <div className="text-xs text-muted-foreground">@{profile?.handle ?? "—"}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {m.role === "workspace_admin" ? tSettings("team_role_admin") : tSettings("team_role_member")}
                </span>
                <form action={removeMember}>
                  <input type="hidden" name="workspaceId" value={workspaceId} />
                  <input type="hidden" name="userId" value={m.user_id} />
                  <button type="submit" className="text-xs text-muted-foreground hover:text-foreground">
                    {tSettings("team_remove")}
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

Use `getTranslations("settings")` for labels. Avatar thumbnails omitted from the row for simplicity (can add later).

### File 6 (new) — `src/app/[locale]/app/settings/invite-form.tsx`

Client Component. Minimal form — email + role select + submit. Submit calls `inviteMember(formData)` server action.

### File 7 (new) — `src/app/[locale]/app/settings/actions.ts`

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";

const profileSchema = z.object({
  display_name: z.string().trim().min(1).max(80),
  handle: z.string().trim().min(2).max(40).regex(/^[a-z0-9_]+$/),
  locale: z.enum(["ko", "en"]),
  avatar_url: z.string().optional().nullable(),
});

export async function updateProfile(input: unknown) {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { error: "validation" as const };
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" as const };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
      handle: parsed.data.handle,
      locale: parsed.data.locale,
      ...(parsed.data.avatar_url !== undefined ? { avatar_url: parsed.data.avatar_url } : {}),
    })
    .eq("id", user.id);
  if (error) return { error: "db" as const, message: error.message };
  revalidatePath(`/[locale]/app/settings`, "page");
  return { ok: true as const };
}

const workspaceSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  tax_id: z.string().trim().optional().nullable(),
  tax_invoice_email: z.string().email().optional().nullable(),
});

export async function updateWorkspace(input: unknown) {
  const parsed = workspaceSchema.safeParse(input);
  if (!parsed.success) return { error: "validation" as const };
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" as const };

  // RLS enforces workspace_admin — no explicit role check here.
  const { error } = await supabase
    .from("workspaces")
    .update({
      name: parsed.data.name,
      tax_id: parsed.data.tax_id ?? null,
      tax_invoice_email: parsed.data.tax_invoice_email ?? null,
    })
    .eq("id", parsed.data.workspaceId);
  if (error) return { error: "db" as const, message: error.message };
  revalidatePath(`/[locale]/app/settings`, "page");
  return { ok: true as const };
}

const inviteSchema = z.object({
  workspaceId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["workspace_admin", "workspace_member"]),
});

export async function inviteMember(formData: FormData) {
  const parsed = inviteSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: "validation" as const };
  // For Phase 1.2 — we DO NOT send an actual invite email yet; we insert a pending row
  // if an `workspace_invites` table exists, else return a placeholder error.
  // Inspect database.types.ts — if `workspace_invites` table is absent, return { error: "not_implemented" }.
  // This is acceptable for Phase 1.2; full flow lives in Phase 1.3.
  return { error: "not_implemented" as const };
}

export async function removeMember(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const userId = formData.get("userId");
  if (typeof workspaceId !== "string" || typeof userId !== "string") {
    return { error: "validation" as const };
  }
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" as const };
  if (user.id === userId) return { error: "self_remove" as const };

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);
  if (error) return { error: "db" as const, message: error.message };
  revalidatePath(`/[locale]/app/settings`, "page");
  return { ok: true as const };
}
```

### File 8 (modify) — `src/components/app/sidebar-nav.tsx`

**Surgical edit.** Flip `items` entry for `settings`:

- OLD (line ~32):
  ```ts
  { key: "settings", href: "/app/settings", icon: Settings, disabled: true, roles: ["workspace_admin", "workspace_member"] },
  ```
- NEW:
  ```ts
  { key: "settings", href: "/app/settings", icon: Settings, roles: ["workspace_admin", "workspace_member"] },
  ```

**Do NOT touch:**
- `adminItems` (subtask 11 already enabled it).
- Other `items[]` entries (`storyboards`, `brands`, `team`, `billing` stay disabled — Phase 1.3+).
- `NavLink` component.

## Non-negotiables

- Server Components by default; Client Components only where interactivity is needed (profile-form, workspace-form, invite-form).
- `createSupabaseBrowser` only for the avatar upload (inside client component). `createSupabaseServer` everywhere else.
- Avatar display uses signed URLs with 3600s expiry. Forward-compatible with pending policy change to make avatars private.
- No new i18n keys — use existing `settings` namespace keys only.
- Phase 1.0.6 tokens. No warm tones.
- `pnpm tsc --noEmit` clean.
- Never-throw action pattern.
- Defense-in-depth: layout redirects non-auth + non-ws-admin, page re-checks per-tab.

## Acceptance criteria

1. `/app/settings` loads for any authenticated user → profile tab rendered.
2. workspace_member (non-admin) does NOT see workspace or team tabs; direct URL `?tab=workspace` redirects back to `/app/settings`.
3. Profile form: edit display_name, handle, locale → submit → DB updates → re-render shows new values.
4. Avatar upload: file picker → uploaded to `avatars/${userId}/{uuid}.ext` → `profiles.avatar_url` updated → signed URL displayed.
5. Workspace form (workspace_admin only): edit name + tax fields → submit → DB updates.
6. Team panel: members listed. Remove button deletes the row (cannot self-remove).
7. Invite form currently returns `{ error: "not_implemented" }` — OK for Phase 1.2.
8. Sidebar settings item is clickable for any authenticated user.
9. `pnpm tsc --noEmit` clean.
10. No new i18n keys.
11. No warm tones.

## Result file (`results/12_settings_pages.md`)

```markdown
# Subtask 12 result
status: complete
files_created:
  - src/app/[locale]/app/settings/layout.tsx (NN bytes)
  - src/app/[locale]/app/settings/page.tsx (NN bytes)
  - src/app/[locale]/app/settings/profile-form.tsx (NN bytes)
  - src/app/[locale]/app/settings/workspace-form.tsx (NN bytes)
  - src/app/[locale]/app/settings/team-panel.tsx (NN bytes)
  - src/app/[locale]/app/settings/invite-form.tsx (NN bytes)
  - src/app/[locale]/app/settings/actions.ts (NN bytes)
files_modified:
  - src/components/app/sidebar-nav.tsx (items[0].settings disabled flag removed)
avatar_url_strategy: signed URL with 3600s expiry  # forward-compat with pending avatars-private migration
workspace_logo: deferred  # bucket absent OR confirmed present — whichever applies
invite_implementation: not_implemented (stub returns error — Phase 1.3 will wire email)
shadcn_components_added: none
tsc_check: clean
acceptance: PASS — all tabs render, profile edit + avatar upload wired, workspace edit + team remove wired, role gating enforced in layout + page dispatcher.
```

If blocked: `status: blocked` + `reason: <one line>`.
