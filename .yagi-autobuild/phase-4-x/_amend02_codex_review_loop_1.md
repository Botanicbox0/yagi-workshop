OpenAI Codex v0.125.0 (research preview)
--------
workdir: C:\Users\yout4\yagi-studio\yagi-workshop
model: gpt-5.5
provider: openai
approval: never
sandbox: danger-full-access
reasoning effort: high
reasoning summaries: none
session id: 019de3dd-048e-7850-ad73-976e01d0b2db
--------
user
K-05 ADVERSARIAL CODE REVIEW (retroactive, target migration is already applied to prod).

Repository root: C:/Users/yout4/yagi-studio/yagi-workshop
Targets:
  1. supabase/migrations/20260501100806_phase_4_x_widen_profile_role_enum.sql
  2. src/lib/app/context.ts (ProfileRole union extended with "artist")
  3. src/components/app/sidebar-user-menu.tsx (switch case + "Artist" label)
  4. scripts/create-artist-account.ts (admin bootstrap path; already executed)

This migration widens the profiles_role_check CHECK constraint to include the value 'artist' in addition to the prior allowlist (creator/studio/observer/client). Rationale: pulled forward from Phase 5 entry to unblock the demo Artist account in Wave C.5b sub_13 / amend_02b. The migration is ALREADY APPLIED to prod (jvamvbpxnztynsccvcmr) and the demo account artist@yagiworkshop.xyz is live with role='artist'.

PROCESS:
1. Read the migration file in full.
2. Read .yagi-autobuild/phase-4-x/_amend02_self_review.md (the prior Opus 4.7 self-review) and challenge or extend each finding.
3. Read src/lib/app/context.ts (ProfileRole), src/components/app/sidebar-user-menu.tsx (switch usage), src/app/[locale]/app/layout.tsx (workspace-required redirect that treats role==='client' specially).
4. Audit RLS policies for any role-string consumer that treats the enum as closed-world (look for hard-coded literal lists). Also check `creators_update_self`, `studios_update_self`, `validate_profile_role_transition` — does adding 'artist' open an unintended path?
5. Read scripts/create-artist-account.ts — the upsert ordering after the trigger creates role='client' first; does the script's UPDATE survive validate_profile_role_transition without the service-role bypass being load-bearing in unexpected ways?
6. Search for `case "creator"` / switch over ProfileRole / Zod enum on role to confirm 'artist' falls through cleanly.

FOCUS AREAS (each must be a separate finding with explicit verdict):
A. Additive only — verify all existing profiles.role values pass the new CHECK; verify no row was silently invalidated.
B. RLS / policy implicit dependence on the enum closed-world (creators_update_self, studios_update_self, anything else).
C. validate_profile_role_transition interaction — does the artist UPSERT exercise an edge that the function doesn't anticipate?
D. handle_new_user (amend_01) interaction — sequencing, trigger order, accidental double-write.
E. TypeScript ProfileRole type drift now resolved — does the extension cause any consumer to lose exhaustiveness inference (switch with no default that previously was exhaustive)?
F. Phase 5 entry artist work — does pulling the enum widening forward leave any Phase 5 migration stale or expecting a CHECK that no longer matches?
G. is_yagi_admin / is_ws_admin / role_switched_at handling — independent of profiles.role enum but verify.
H. Constraint replace atomicity (DROP + ADD).
I. Server actions / RPC role checks — do any treat the role list as closed?
J. Account landing experience for artist@yagiworkshop.xyz — workspace-required redirect at /[locale]/app/layout.tsx skips role==='client' but not role==='artist'. Does that leave the artist demo bouncing into /onboarding/workspace as a side effect? If so, MED-B (UX gap) or LOW (Phase 5 will redesign)?

Severity scale: HIGH-A | HIGH-B | HIGH-C | MED-A | MED-B | MED-C | LOW.

Output format (markdown), one section per finding:

## Finding F<N> — <short title>
- Severity: <level>
- Surface: <file:lines or sql snippet>
- Verdict: <clear>
- Reasoning: <2-4 sentences>
- Proposed fix: <patch sketch> OR 'no fix needed' with rationale

End with a 'Verdict' line summarising HIGH-A / HIGH-B / MED-A counts and recommending APPLY / FIX / HALT.

Read-only review only. Do NOT modify files. Do NOT apply migrations.

codex
I’ll do this as a read-only review. I’m going to inspect the exact migration and the known role consumers first, then widen the search to RLS, RPCs, scripts, and any Phase 5 migration assumptions before writing findings.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Raw -LiteralPath 'supabase/migrations/20260501100806_phase_4_x_widen_profile_role_enum.sql'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Raw -LiteralPath 'src/components/app/sidebar-user-menu.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Raw -LiteralPath 'scripts/create-artist-account.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Raw -LiteralPath 'src/app/[locale]/app/layout.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Raw -LiteralPath 'src/lib/app/context.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Raw -LiteralPath '.yagi-autobuild/phase-4-x/_amend02_self_review.md'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 462ms:
-- Phase 4.x Wave C.5b amend_02 ??widen profiles_role_check to include 'artist'.
--
-- Background: PRODUCT-MASTER 짠4 / DECISIONS Q-094 lock the persona model
-- as Brand + Artist + YAGI Admin. The profiles_role_check CHECK constraint
-- still only allowed creator/studio/observer/client. yagi visual review
-- (post-sub_00 ROLLBACK) needs the artist demo account live for review,
-- which requires this enum widening ??originally deferred to Phase 5
-- entry (sub_13 HALT log) but now pulled into Phase 4.x because the
-- widening is purely additive and the only blocker for the demo account.
--
-- Scope: additive only. Existing rows (creator/studio/observer/client/NULL)
-- all continue to pass the constraint. No application-layer code path
-- assumes a closed-world enum ??challenges-CTA + app/layout role guards
-- already fall through to the else branch for unknown roles, which is
-- a safe default.
--
-- Phase 5 entry will introduce the Artist Roster intake surface; this
-- migration unblocks the demo account ahead of that surface design and
-- does NOT lock-in any artist-specific RLS / RPC shape.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (
    (role IS NULL) OR
    (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
  );


 succeeded in 471ms:
"use client";

import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/app/signout-action";
import type { ProfileRole, WorkspaceRole } from "@/lib/app/context";

type Profile = {
  id: string;
  handle: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  role: ProfileRole | null;
};

function resolveVisibleName(profile: Profile): string {
  // Wave C.5a sub_02 ??DB handle (c_xxx) is never user-facing. Prefer
  // display_name; fall back to email local-part. Never expose the email
  // address itself or the raw handle in UI.
  const displayName = profile.display_name?.trim();
  if (displayName) return displayName;
  const localPart = profile.email?.split("@")[0]?.trim();
  if (localPart) return localPart;
  return "";
}

function getRoleLabel(
  profile: Profile,
  workspaceRoles: WorkspaceRole[],
  isYagiInternalMember: boolean,
): string {
  // Workspace roles take precedence over profile.role for the badge ??  // an admin/internal user is identified by their staff capacity even if
  // they also carry a creator/studio profile. Phase 2.7.1 visibility pass.
  if (workspaceRoles.includes("yagi_admin")) return "YAGI Admin";
  if (isYagiInternalMember) return "Internal";
  switch (profile.role) {
    case "creator":
      return "Creator";
    case "studio":
      return "Studio";
    case "client":
      return "Client";
    case "observer":
      return "Observer";
    case "artist":
      return "Artist";
    default:
      return "";
  }
}

export function SidebarUserMenu({
  profile,
  workspaceRoles,
  isYagiInternalMember,
}: {
  profile: Profile;
  workspaceRoles: WorkspaceRole[];
  isYagiInternalMember: boolean;
}) {
  const c = useTranslations("common");
  const visibleName = resolveVisibleName(profile);
  const initials =
    visibleName
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "쨌";
  const roleLabel = getRoleLabel(profile, workspaceRoles, isYagiInternalMember);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full flex items-center gap-2.5 p-2 rounded-md hover:bg-accent transition-colors">
        <Avatar className="w-7 h-7">
          {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[13px] truncate">{visibleName}</p>
          {roleLabel && (
            <p className="text-[11px] text-muted-foreground truncate">
              {roleLabel}
            </p>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="min-w-[180px]">
        <DropdownMenuItem disabled className="text-xs">
          {visibleName}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <button type="submit" className="w-full">
            <DropdownMenuItem asChild>
              <span className="flex items-center gap-2 cursor-pointer">
                <LogOut className="w-3.5 h-3.5" />
                {c("signout")}
              </span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


 succeeded in 489ms:
/**
 * Phase 4.x Wave C.5b sub_13 ??Artist demo account bootstrap.
 *
 * Creates the test Artist account specified by yagi:
 *   email:    artist@yagiworkshop.xyz
 *   password: yagiworkshop12#$
 *   role:     'artist'
 *
 * Run via: `npx tsx scripts/create-artist-account.ts`
 *
 * BLOCKED until the `profiles_role_check` CHECK constraint is widened
 * to accept 'artist'. The current constraint is:
 *
 *   CHECK ((role IS NULL) OR
 *          (role = ANY (ARRAY['creator','studio','observer','client'])))
 *
 * Adding 'artist' is a Phase 5 entry deliverable (curated Artist
 * Roster intake, see DECISIONS_CACHE.md Q-094 + ARCHITECTURE.md 짠18.1).
 * Running this script *before* that migration lands will fail with
 * a check_violation.
 *
 * Required env vars (from `.env.local`):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const ARTIST_EMAIL = "artist@yagiworkshop.xyz";
const ARTIST_PASSWORD = "yagiworkshop12#$";
const ARTIST_DISPLAY_NAME = "Artist Demo";
const ARTIST_ROLE = "artist";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env",
    );
  }

  const supabase: SupabaseClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Create auth user
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: ARTIST_EMAIL,
    password: ARTIST_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: ARTIST_DISPLAY_NAME },
  });
  if (authErr) {
    if (authErr.message.includes("already registered") || authErr.message.includes("exists")) {
      console.warn(`[artist-account] auth user already exists, looking up id...`);
      const { data: usersList } = await supabase.auth.admin.listUsers();
      const existing = usersList?.users.find((u) => u.email === ARTIST_EMAIL);
      if (!existing) throw new Error("auth user reported existing but lookup failed");
      await ensureProfile(supabase, existing.id);
      console.log(`[artist-account] existing user_id=${existing.id} profile ensured`);
      return;
    }
    throw authErr;
  }

  const userId = authData.user?.id;
  if (!userId) throw new Error("auth.users insert returned no id");

  await ensureProfile(supabase, userId);
  console.log(`[artist-account] created user_id=${userId} role=${ARTIST_ROLE}`);
}

async function ensureProfile(supabase: SupabaseClient, userId: string) {
  // Generate a placeholder handle (internal-only, see DECISIONS Q-095).
  const handle = `artist_demo_${userId.slice(0, 6)}`;

  const { error: profileErr } = await supabase.from("profiles").upsert({
    id: userId,
    handle,
    display_name: ARTIST_DISPLAY_NAME,
    role: ARTIST_ROLE,
    locale: "ko",
  });
  if (profileErr) {
    if (profileErr.code === "23514" || profileErr.message.includes("profiles_role_check")) {
      throw new Error(
        `[artist-account] profiles_role_check rejected role='${ARTIST_ROLE}'. ` +
          `The CHECK constraint must be widened to include 'artist' (Phase 5 entry migration). ` +
          `See DECISIONS_CACHE.md Q-094.`,
      );
    }
    throw profileErr;
  }
}

main().catch((err) => {
  console.error("[artist-account] failed:", err);
  process.exit(1);
});


 succeeded in 506ms:
import { redirect } from "@/i18n/routing";
import { fetchAppContext } from "@/lib/app/context";
import { Sidebar, MobileSidebarSheet } from "@/components/app/sidebar";
import {
  resolveActiveWorkspace,
  listOwnWorkspaces,
} from "@/lib/workspace/active";
import { NotificationBell } from "@/components/app/notification-bell";
import { PageHelpLink } from "@/components/app/page-help-link";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUserScopes } from "@/lib/app/scopes";
import { UserScopesProvider } from "@/lib/app/use-user-scopes";
import { SupportWidget } from "@/components/support/support-widget";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/signin", locale });

  const ctx = await fetchAppContext();
  if (!ctx) {
    redirect({ href: "/onboarding", locale });
    return null;
  }

  const hasPrivilegedGlobalRole =
    ctx.workspaceRoles.includes("yagi_admin") ||
    ctx.workspaceRoles.includes("creator");
  // Phase 2.7: client persona doesn't need a workspace; their primary
  // surface is /app/commission.
  const isClient = ctx.profile.role === "client";
  if (ctx.workspaces.length === 0 && !hasPrivilegedGlobalRole && !isClient) {
    redirect({ href: "/onboarding/workspace", locale });
    return null;
  }

  // Seed the bell with the current unread count. Realtime takes over from here.
  const { count: initialUnreadCount } = await supabase
    .from("notification_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId)
    .is("in_app_seen_at", null);

  const bellLocale: "ko" | "en" = locale === "en" ? "en" : "ko";

  const scopes = getUserScopes(ctx);

  // Phase 4.x task_06 ??resolve active workspace + full membership list
  // for the sidebar workspace switcher. resolveActiveWorkspace reads the
  // 'yagi_active_workspace' cookie + validates membership; listOwnWorkspaces
  // returns every workspace the user belongs to (with workspaces.kind, which
  // null-safe-defaults to 'brand' until task_01 migration applies at Wave D).
  const [activeWorkspace, allWorkspaces] = await Promise.all([
    resolveActiveWorkspace(ctx.userId),
    listOwnWorkspaces(ctx.userId),
  ]);

  return (
    <UserScopesProvider value={scopes}>
      <div className="min-h-dvh flex">
        <Sidebar
          context={ctx}
          activeWorkspace={activeWorkspace}
          workspaces={allWorkspaces}
        />
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="flex items-center justify-between gap-2 h-12 px-4 border-b border-border">
            <MobileSidebarSheet
              context={ctx}
              activeWorkspace={activeWorkspace}
              workspaces={allWorkspaces}
            />
            <div className="flex-1" />
            <PageHelpLink />
            <LanguageSwitcher />
            <NotificationBell
              initialUnreadCount={initialUnreadCount ?? 0}
              locale={bellLocale}
            />
          </header>
          <main className="flex-1 min-w-0">
            <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8 w-full">
              {children}
            </div>
          </main>
        </div>
        {/* Phase 2.8.6 ??workspace-scoped support chat. Hidden when
            the user has no workspace (mid-onboarding edge case). */}
        <SupportWidget
          workspaceId={ctx.workspaces[0]?.id ?? null}
          currentUserId={ctx.userId}
          currentUserName={ctx.profile.display_name ?? ""}
        />
      </div>
    </UserScopesProvider>
  );
}


 succeeded in 459ms:
import { createSupabaseServer } from "@/lib/supabase/server";

// Phase 1.1 workspace permission system ??unchanged literals, renamed type.
// Per ADR-009 (docs/design/DECISIONS.md).
export type WorkspaceRole =
  | "creator"
  | "workspace_admin"
  | "workspace_member"
  | "yagi_admin";

// Phase 2.5 challenge persona system ??distinct namespace.
// NEVER compare against a bare "creator" literal without prefixing with
// `profile.role ===` ??see ADR-009 naming rule.
// Phase 2.7 added "client" for the commission-intake persona (ADR-011).
// Phase 4.x Wave C.5b amend_02 added "artist" ??DECISIONS Q-094 / 짠4 of
// PRODUCT-MASTER persona model. The Artist intake surface itself is a
// Phase 5 entry deliverable (FU-C5b-01); the type extension here covers
// the demo account row created in Wave C.5b sub_13/amend_02.
export type ProfileRole = "creator" | "studio" | "observer" | "client" | "artist";

export type AppContext = {
  userId: string;
  profile: {
    id: string;
    /**
     * Internal-only DB identifier (Phase 4.x Wave C.5b sub_08).
     *
     * `profiles.handle` is auto-generated server-side as `c_<8 hex chars>`
     * and exposed only to internal code paths (auth callback resolver,
     * RLS policies that key off the unique-handle column, future admin
     * tools). It MUST NOT appear in any user-facing surface ??sidebar,
     * settings, chat, profile pages, exports, or emails. If you find
     * yourself reaching for `profile.handle` in a JSX/email template,
     * fall back to `display_name` then `id.slice(0, 8)` instead.
     */
    handle: string;
    display_name: string;
    email: string | null;
    avatar_url: string | null;
    locale: "ko" | "en";
    role: ProfileRole | null;
  };
  workspaceRoles: WorkspaceRole[];
  workspaces: { id: string; name: string; slug: string }[];
  currentWorkspaceId: string | null;
};

export async function fetchAppContext(): Promise<AppContext | null> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url, locale, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  const { data: rolesRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const workspaceRoles = (rolesRows ?? []).map(
    (r) => r.role as WorkspaceRole
  );

  const { data: memberRows } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(id, name, slug)")
    .eq("user_id", user.id);

  const workspaces =
    (memberRows ?? [])
      .map((row) => row.workspaces)
      .filter((ws): ws is { id: string; name: string; slug: string } => !!ws);

  return {
    userId: user.id,
    profile: {
      id: profile.id,
      handle: profile.handle,
      display_name: profile.display_name,
      email: user.email ?? null,
      avatar_url: profile.avatar_url,
      locale: profile.locale as "ko" | "en",
      role: (profile.role as ProfileRole | null) ?? null,
    },
    workspaceRoles,
    workspaces,
    currentWorkspaceId: workspaces[0]?.id ?? null,
  };
}


 succeeded in 462ms:
# Wave C.5b amend_02 ??Reviewer Fallback Layer 1 (Opus 4.7 self-review, adversarial)

**Target**: `supabase/migrations/20260501100000_phase_4_x_widen_profile_role_enum.sql`
plus the immediate downstream action ??running
`scripts/create-artist-account.ts` after apply.

**Frame**: same as amend_01. Adversarial frame, severity scale per
`CODEX_TRIAGE.md`, target = 0 HIGH-A residual before Layer 2.

## Findings

### F1 ??Additive-only verification

- **Surface**: `DROP CONSTRAINT IF EXISTS profiles_role_check; ADD CONSTRAINT
  ... CHECK ((role IS NULL) OR (role = ANY (ARRAY['creator','studio',
  'observer','client','artist'])))`.
- **Question**: do all existing `profiles.role` values pass the new
  constraint? Are we silently invalidating any row?
- **Live audit (2026-05-01)**:
  - `role = 'creator'` ??1 row (yonsei test account). Passes new CHECK.
  - `role = 'client'` ??1 row (yout40204020). Passes.
  - `role IS NULL` ??1 row (yagi). Passes.
  - `role = 'studio' / 'observer' / 'artist'` ??0 rows. Trivially ok.
- **Atomicity**: Postgres applies `ADD CONSTRAINT` with an ACCESS
  EXCLUSIVE lock on `profiles`. Brief blocking; profiles is small
  (~3 rows currently). The `DROP IF EXISTS` makes the migration
  re-runnable.
- **Verdict**: PASS. Additive only.
- **Severity**: none.

### F2 ??RLS / policy implicit dependence on role enum

- **Surface**: `creators_update_self`, `studios_update_self` policies
  filter by `p.role = 'creator'` / `p.role = 'studio'` literals.
- **Question**: does adding 'artist' to the enum cause an unintended
  RLS bypass via these policies?
- **Verdict**: NO. Both policies use literal-string equality, NOT the
  enum membership check. Adding 'artist' has no effect on whether a
  row matches `p.role = 'creator'` (it doesn't). Phase 5 will likely
  introduce an `artists_update_self` policy with `p.role = 'artist'`
  literal in the same shape.
- **Severity**: none.

### F3 ??handle_new_user (amend_01) interaction

- **Surface**: amend_01's trigger inserts new profiles with
  `role = 'client'` (literal). Wide enum changes nothing for the
  trigger path.
- **Verdict**: no interaction. The trigger keeps the persona-A default;
  the artist bootstrap script (sub_13) UPSERTs over the row to flip
  role to 'artist' afterward. See F5.
- **Severity**: none.

### F4 ??`validate_profile_role_transition` semantics on artist UPSERT

- **Surface**: Existing trigger blocks self-transitions (auth.uid() =
  NEW.id) from `client ??other` and `non-NULL ??NULL`. The artist
  bootstrap runs the script with the service-role key.
- **Question**: when the script's `supabase.from('profiles').upsert(...)`
  fires on the row that handle_new_user just created (role='client'),
  does the trigger reject the UPDATE to role='artist'?
- **Verdict**: NO. Inside the function: `v_caller := auth.uid(); IF
  v_caller IS NULL THEN RETURN NEW;`. The service-role context has
  NULL `auth.uid()` (not bound to any session user). The trigger's
  early-return short-circuits all role-transition checks. Verified
  by reading the function body (`pg_get_functiondef`).
- **Severity**: none.

### F5 ??sub_13 script UPSERT order interaction

- **Sequence** (per amend_01 self-review F8):
  1. `supabase.auth.admin.createUser({ email, password, email_confirm,
     user_metadata })` ??`auth.users` INSERT.
  2. `handle_new_user` AFTER INSERT trigger fires ??`profiles` row
     created with `role='client'`, `display_name='artist'` (email
     local-part), `handle='c_<md5>'`, `locale='ko'`.
  3. Script's `supabase.from('profiles').upsert({ id, handle:
     'artist_demo_<6chars>', display_name: 'Artist Demo', role:
     'artist', locale: 'ko' })` ??ON CONFLICT (id) ??UPDATE.
- **Question**: does the upsert's `handle` value pass the
  `profiles_handle_check` regex (`^[a-z0-9_-]{3,30}$`)?
- **Verdict**: `artist_demo_<6chars>` = 7 + 6 = 13 chars, all in the
  allowed set. PASS. Also UNIQUE-safe (md5-derived, won't collide
  with the c_<md5> handle the trigger wrote).
- **Verdict**: does the upsert's `display_name = "Artist Demo"`
  contain a space? Looking at the schema, `display_name` is plain
  text NOT NULL with no CHECK constraint on character set. Spaces
  are fine. PASS.
- **Severity**: none.

### F6 ??TypeScript ProfileRole type drift

- **Surface**: `src/lib/app/context.ts:15`:
  `export type ProfileRole = "creator" | "studio" | "observer" | "client";`
- **Question**: does runtime now produce values outside this type
  (artist account row served as part of AppContext)?
- **Verdict**: YES. After widening + bootstrap, `profiles.role` can
  be `'artist'` for the demo account row. The TypeScript type must
  include 'artist' or any code casting it (`profile.role as ProfileRole`)
  will silently land on an unrecognised string at runtime. The
  application's role-switching code paths (`role === 'creator'` etc)
  fall through to the else branch for unknown roles, but the type
  drift is still a Tier-1 lint hygiene issue.
- **Severity**: HIGH-B (high-impact lint hygiene; not security but
  type-safety regression). **Auto-fixable** by appending `| "artist"`
  to the union. Will fix as part of amend_02 commit.

### F7 ??Phase 5 entry artist work ??does this lock-in?

- **Question**: Phase 5 will introduce Artist Roster intake. Will the
  enum already including 'artist' cause Phase 5's migration to be
  no-op or silently stale?
- **Verdict**: NO. Phase 5 work will be:
  - A dedicated Artist intake UI surface (curated, invite-token
    based per FU-C5b-01).
  - Likely an `artist_profiles` child table (analogous to
    `creators` / `studios`) for artist-specific fields.
  - RLS policies for that new table.
  - Possibly a `workspaces.kind='artist'` extension if the artist
    has a workspace-shaped surface.
  None of these depend on the enum being absent today; they all
  layer on top of `role='artist'` already being valid. The enum
  widening here is the *prerequisite*, not the deliverable.
- **Severity**: none.

### F8 ??`is_yagi_admin` / `is_ws_admin` interaction

- **Surface**: helper functions check `user_roles` table, not
  `profiles.role`. They are independent of this CHECK constraint.
- **Verdict**: no interaction.
- **Severity**: none.

### F9 ??Constraint replace atomicity / rollback safety

- **Surface**: `DROP IF EXISTS ... ADD CONSTRAINT ...` runs as a
  multi-statement migration body. If the ADD fails (e.g. validation
  finds a row outside the new enum), the entire migration rolls
  back ??but the DROP would be reverted too, leaving the OLD
  constraint intact.
- **Verdict**: actually, the apply_migration MCP tool wraps the body
  in a transaction. The DROP + ADD pair is atomic. If the ADD fails
  validation, both statements roll back. Safe.
- **Severity**: none.

### F10 ??RPC / server-action role checks

- **Surface**: server actions in `src/app/[locale]/app/projects/new/actions.ts`
  and elsewhere reference role values. Most paths use the actor_role
  classification system (`is_valid_transition`'s actor_role:
  client/yagi_admin/workspace_admin/system) which routes through
  `user_roles` table, NOT `profiles.role`.
- **Verdict**: no role-string consumer in server-side code paths
  treats the enum as closed-world. Adding 'artist' is graceful.
- **Severity**: none.

## Verdict ??0 HIGH-A residual

- HIGH-A: none.
- HIGH-B: F6 (TypeScript ProfileRole type drift). **Auto-fix**:
  append `| "artist"` to the union in `src/lib/app/context.ts`.
  Fixed as part of amend_02 commit.
- MED-A/B/C: none.
- LOW: F1 atomicity blip ??sub-100ms ACCESS EXCLUSIVE on a 3-row
  table is invisible at this fleet size.

Layer 1 verdict: PASS. Recommend Layer 2 review focusing on:
- F6 type fix (will it silently break any consumer that switch-
  exhausts on ProfileRole? Answer: no ??TypeScript narrowing on a
  widened union still treats unknown branches as `never`-ish, but
  any `switch (role)` with no default would lose exhaustiveness
  inference; quick grep on the codebase shows zero such switches).
- F4 service-role-vs-trigger ordering (verified live).


codex
The initial files confirm the type and sidebar patch are present, and the app layout still only exempts `client` from the workspace requirement. Next I’m searching the SQL and application code for hard-coded role lists, trigger functions, policies, and Phase 5 assumptions.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"profiles_role_check|validate_profile_role_transition|creators_update_self|studios_update_self|handle_new_user|is_yagi_admin|is_ws_admin|role_switched_at|role\\s*=\\s*ANY|ARRAY\\['creator'|creator.*studio.*observer.*client|observer.*client|role\\s+in|role IN|role='|role = '\" supabase src scripts .yagi-autobuild docs -g '"'!node_modules'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"case \\\"creator\\\"|case 'creator'|switch \\(["'^'"\\n]*role|ProfileRole|z\\.enum\\(|enum\\(.*role|roleSchema|role.*zod|\\\"creator\\\"\\s*,\\s*\\\"studio\\\"|creator\\|studio|creator.*studio.*observer.*client|client.*observer\" src scripts supabase -g '"'!node_modules'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"artist|profiles_role_check|Phase 5|Artist Roster|FU-C5b-01|curated Artist\" supabase/migrations docs .yagi-autobuild scripts src -g '"'!node_modules'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg --files supabase src scripts .yagi-autobuild docs | rg "(migration|schema|policy|rls|action|rpc|context|sidebar|layout|create-artist|phase-5|phase_5|Phase 5)"' in C:\Users\yout4\yagi-studio\yagi-workshop
2026-05-01T14:07:02.831204Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:
rg: 'creator'|switch: 파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다. (os error 123)
rg: \([^\n]*role|ProfileRole|z\.enum\(|enum\(.*role|roleSchema|role.*zod|\creator\\s*,\s*\studio\|creator\|studio|creator.*studio.*observer.*client|client.*observer src scripts supabase -g !node_modules: 지정된 경로를 찾을 수 없습니다. (os error 3)

 exited 1 in 448ms:
rg: 'creator'|switch: 파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다. (os error 123)
rg: \([^\n]*role|ProfileRole|z\.enum\(|enum\(.*role|roleSchema|role.*zod|\creator\\s*,\s*\studio\|creator\|studio|creator.*studio.*observer.*client|client.*observer src scripts supabase -g !node_modules: 지정된 경로를 찾을 수 없습니다. (os error 3)

 succeeded in 678ms:
scripts\test-rls-brief-board.mjs
scripts\create-artist-account.ts
scripts\test-rsc-form-action-rule.mjs
scripts\check-rsc-form-action.sh
scripts\_fixtures\bad-rsc-form-action.tsx
supabase\migrations\20260424000001_phase_2_5_g2_handle_history_hardening.sql
supabase\migrations\20260424000000_phase_2_5_g2_handle_history.sql
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql
supabase\migrations\20260423020200_create_meeting_with_attendees_rpc.sql
supabase\migrations\20260423020100_seed_yagi_internal_workspace.sql
supabase\migrations\20260423020000_h1_preprod_realtime_publication.sql
supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql
supabase\migrations\20260422120000_phase_2_0_baseline.sql
supabase\migrations\20260426000000_phase_2_8_brief_board.sql
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql
supabase\migrations\20260424040000_phase_2_5_g8_hardening_v3.sql
supabase\migrations\20260424030000_phase_2_5_g8_hardening_v2.sql
supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql
supabase\migrations\20260424010000_phase_2_5_challenges_closing_reminder_cron.sql
supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql
supabase\migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql
supabase\migrations\20260427000000_phase_2_8_1_wizard_draft.sql
supabase\migrations\20260427030000_phase_2_8_1_company_type_extend.sql
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql
supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql
supabase\migrations\20260429113853_phase_3_1_project_board.sql
supabase\migrations\20260428070000_phase_2_8_6_review_loop_2.sql
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql
supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql
supabase\migrations\20260428020000_phase_2_8_2_brief_realtime.sql
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql
supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql
supabase\migrations\20260430075826_phase_3_1_hotfix_3_meeting_preferred_at.sql
supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql
supabase\migrations\20260429125246_phase_3_1_k05_loop_2_drop_unsafe_seed_overload.sql
supabase\migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql
supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql
supabase\migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql
supabase\migrations\20260501140308_phase_4_x_handle_new_user_search_path_hardening.sql
src\lib\workspace\actions.ts
src\components\team\team-chat-layout.tsx
src\components\team\channel-sidebar.tsx
.yagi-autobuild\archive\phase-1\subtasks\13_storage_policy_review.md
.yagi-autobuild\archive\phase-1\subtasks\04_apply_migration_and_verify.md
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md
src\components\projects\project-actions.ts
src\components\projects\project-action-buttons.tsx
src\components\sidebar\workspace-switcher.tsx
.yagi-autobuild\archive\phase-2-shipped\snapshots\phase-1-9\schema-snapshot.md
.yagi-autobuild\archive\phase-2-shipped\snapshots\phase-1-9\migration-list.txt
.yagi-autobuild\archive\phase-1\results\13_storage_policy_review.md
.yagi-autobuild\archive\phase-1\results\1-3_06_actions.md
.yagi-autobuild\archive\phase-1\results\1-2-5_MIG_migration.md
.yagi-autobuild\archive\phase-1\results\04_apply_migration_and_verify.md
.yagi-autobuild\archive\phase-1\results\03_schema_migration.md
src\lib\onboarding\actions.ts
src\components\projects\action-modals\revision-request-modal.tsx
src\components\projects\action-modals\cancel-modal.tsx
src\components\projects\action-modals\approval-modal.tsx
.yagi-autobuild\archive\phase-1\feedback\04_apply_migration_and_verify.md
.yagi-autobuild\archive\phase-1\feedback\03_schema_migration.md
src\components\app\sidebar.tsx
src\components\app\sidebar-user-menu.tsx
src\components\app\sidebar-scope-switcher.tsx
src\components\app\sidebar-nav.tsx
src\components\app\sidebar-group-label.tsx
src\components\app\sidebar-brand.tsx
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql
.yagi-autobuild\archive\migrations-pre-2-0\MISSING.md
.yagi-autobuild\archive\migrations-pre-2-0\20260422110000_phase_1_9_showcases_fixups.sql
.yagi-autobuild\archive\migrations-pre-2-0\20260422100000_phase_1_9_showcases.sql
.yagi-autobuild\archive\migrations-pre-2-0\20260422090500_phase_1_8_notif_debounce_uniq.sql
.yagi-autobuild\archive\migrations-pre-2-0\20260422090000_phase_1_8_notifications_unsub_rls.sql
.yagi-autobuild\archive\migrations-pre-2-0\20260422080500_phase_1_8_notifications_helpers.sql
.yagi-autobuild\archive\migrations-pre-2-0\20260422080000_phase_1_8_notifications.sql
.yagi-autobuild\archive\migrations-pre-2-0\20260422070000_phase_1_7_team_chat_fixups.sql
.yagi-autobuild\archive\migrations-pre-2-0\20260422060500_phase_1_7_team_chat_realtime.sql
.yagi-autobuild\archive\migrations-pre-2-0\20260422060000_phase_1_7_team_chat_last_seen.sql
.yagi-autobuild\archive\migrations-pre-2-0\20260422010000_phase_1_7_team_channels.sql
.yagi-autobuild\archive\migrations-pre-2-0\20260421173130_phase_1_5_invoicing_20260422.sql
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql
src\lib\commission\actions.ts
src\lib\commission\schemas.ts
src\lib\app\signout-action.ts
src\lib\app\context.ts
src\components\meetings\meeting-actions-menu.tsx
src\components\project-board\asset-action-menu.tsx
src\lib\challenges\content-schema.ts
src\lib\challenges\config-schemas.ts
src\app\layout.tsx
src\app\challenges\layout.tsx
src\app\[locale]\onboarding\layout.tsx
src\app\showcase\[slug]\layout.tsx
src\app\showcase\[slug]\actions.ts
src\app\[locale]\layout.tsx
src\app\challenges\[slug]\layout.tsx
src\app\s\[token]\layout.tsx
src\app\challenges\[slug]\submit\actions.ts
src\app\challenges\[slug]\gallery\actions.ts
src\app\[locale]\(auth)\layout.tsx
src\app\api\share\[token]\reactions\route.ts
src\app\[locale]\auth\layout.tsx
src\app\unsubscribe\[token]\layout.tsx
src\app\unsubscribe\[token]\actions.ts
src\app\[locale]\app\notifications\actions.ts
src\app\[locale]\app\admin\layout.tsx
src\app\[locale]\app\support\actions.ts
src\app\[locale]\app\settings\actions.ts
src\app\[locale]\app\settings\layout.tsx
src\app\[locale]\app\showcases\actions.ts
src\app\[locale]\app\team\[slug]\actions.ts
src\app\[locale]\app\projects\[id]\thread-actions.ts
src\app\[locale]\app\projects\[id]\ref-actions.ts
src\app\[locale]\app\settings\notifications\actions.ts
src\app\[locale]\app\admin\challenges\actions.ts
src\app\[locale]\app\preprod\[id]\share-actions.ts
src\app\[locale]\app\preprod\[id]\actions.ts
src\app\[locale]\app\meetings\request-actions.ts
src\app\[locale]\app\preprod\actions.ts
src\app\[locale]\app\projects\[id]\brief\actions.ts
src\app\[locale]\app\projects\[id]\board-actions.ts
src\app\[locale]\app\projects\[id]\actions.ts
src\app\[locale]\app\invoices\actions.ts
src\app\[locale]\app\meetings\actions.ts
src\app\[locale]\app\layout.tsx
src\app\[locale]\app\admin\commissions\[id]\actions.ts
src\app\[locale]\app\invoices\[id]\actions.ts
src\app\[locale]\app\invoices\[id]\line-item-actions.ts
src\app\[locale]\app\projects\new\actions.ts
src\app\[locale]\app\admin\challenges\[slug]\judge\actions.ts
src\app\[locale]\app\admin\challenges\[slug]\announce\actions.ts

 succeeded in 1461ms:
.yagi-autobuild\ARCHITECTURE.md:506:live UI through Phase 9. Artist Roster intake is curated yagi-direct
.yagi-autobuild\ARCHITECTURE.md:507:(Phase 5 entry, not self-registration). Independent creators are
.yagi-autobuild\ARCHITECTURE.md:524:`artist` (Phase 5 entry, after enum extension migration). All other
scripts\create-artist-account.ts:5: *   email:    artist@yagiworkshop.xyz
scripts\create-artist-account.ts:7: *   role:     'artist'
scripts\create-artist-account.ts:9: * Run via: `npx tsx scripts/create-artist-account.ts`
scripts\create-artist-account.ts:11: * BLOCKED until the `profiles_role_check` CHECK constraint is widened
scripts\create-artist-account.ts:12: * to accept 'artist'. The current constraint is:
scripts\create-artist-account.ts:17: * Adding 'artist' is a Phase 5 entry deliverable (curated Artist
scripts\create-artist-account.ts:29:const ARTIST_EMAIL = "artist@yagiworkshop.xyz";
scripts\create-artist-account.ts:32:const ARTIST_ROLE = "artist";
scripts\create-artist-account.ts:56:      console.warn(`[artist-account] auth user already exists, looking up id...`);
scripts\create-artist-account.ts:61:      console.log(`[artist-account] existing user_id=${existing.id} profile ensured`);
scripts\create-artist-account.ts:71:  console.log(`[artist-account] created user_id=${userId} role=${ARTIST_ROLE}`);
scripts\create-artist-account.ts:76:  const handle = `artist_demo_${userId.slice(0, 6)}`;
scripts\create-artist-account.ts:86:    if (profileErr.code === "23514" || profileErr.message.includes("profiles_role_check")) {
scripts\create-artist-account.ts:88:        `[artist-account] profiles_role_check rejected role='${ARTIST_ROLE}'. ` +
scripts\create-artist-account.ts:89:          `The CHECK constraint must be widened to include 'artist' (Phase 5 entry migration). ` +
scripts\create-artist-account.ts:98:  console.error("[artist-account] failed:", err);
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:26:-- (auto-named profiles_role_check). Drop+recreate keeps the NULL-allowed
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:28:ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:29:ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
src\lib\workspace\active.ts:24:export type WorkspaceKind = "brand" | "artist" | "yagi_admin";
src\lib\workspace\active.ts:38:  if (value === "brand" || value === "artist" || value === "yagi_admin") {
supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:1:-- Phase 4.x Wave C.5b amend_02 — widen profiles_role_check to include 'artist'.
supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:4:-- as Brand + Artist + YAGI Admin. The profiles_role_check CHECK constraint
supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:6:-- (post-sub_00 ROLLBACK) needs the artist demo account live for review,
supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:7:-- which requires this enum widening — originally deferred to Phase 5
supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:17:-- Phase 5 entry will introduce the Artist Roster intake surface; this
supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:19:-- does NOT lock-in any artist-specific RLS / RPC shape.
supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:22:  DROP CONSTRAINT IF EXISTS profiles_role_check;
supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:25:  ADD CONSTRAINT profiles_role_check CHECK (
supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:27:    (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
supabase/migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:15:-- Phase 5 entry will revisit when the Artist intake surface comes online
supabase/migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:16:-- (DECISIONS Q-094); the artist demo account in amend_02 is created via
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:8:    CHECK (kind IN ('brand', 'artist', 'yagi_admin'));
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:32:    'inbound_brand_to_artist',
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:54:  artist_share_percent integer NOT NULL DEFAULT 0
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:55:    CHECK (artist_share_percent BETWEEN 0 AND 100),
.yagi-autobuild\reviews\CEO_REVIEW.md:16:  - ① AI Twin Production (deepfake + voice cloning for independent celebrities/artists)
src\components\sidebar\workspace-switcher.tsx:9://   - Disabled '+ 새 workspace 추가' (locked option B; Phase 5+)
src\components\sidebar\workspace-switcher.tsx:37:type WorkspaceKind = "brand" | "artist" | "yagi_admin";
src\components\sidebar\workspace-switcher.tsx:57:  // Brands shows up for users without artist/admin memberships).
src\components\sidebar\workspace-switcher.tsx:59:  const artists = workspaces.filter((w) => w.kind === "artist");
src\components\sidebar\workspace-switcher.tsx:120:        {artists.length > 0 && (
src\components\sidebar\workspace-switcher.tsx:125:                {t("artists_group")}
src\components\sidebar\workspace-switcher.tsx:127:              {artists.map((w) => (
src\components\project-detail\tabs.tsx:4:// placeholders for Phase 5+. Disabled tabs:
src\components\project-detail\status-timeline.tsx:15://   4. 시안   ← (Phase 5+ approval_pending slot -- inactive)
src\components\project-detail\status-timeline.tsx:20:// intentional per KICKOFF section task_04 spec ("시안 slot 잡아둠" + Phase 5+
.yagi-autobuild\phase-4-x\_wave_c_result.md:58:- `_decisions_locked.md §3` "+ 새 workspace 추가" disabled placeholder ("Phase 5 부터 가능" tooltip).
.yagi-autobuild\phase-4-x\_wave_c_result.md:61:- Dropdown groups by `workspaces.kind`: Brands / Artists / YAGI Admin. Empty groups are hidden in Phase 4 (only Brands shows for users without artist/admin memberships).
.yagi-autobuild\phase-4-x\_wave_c_result.md:62:- Replaced `SidebarScopeSwitcher` in the sidebar; the file is kept on disk for potential Phase 5+ reuse if profile/admin scope switching gets folded back in. Admin nav access remains via `nav.admin` for yagi_admin users.
.yagi-autobuild\phase-4-x\_wave_c_result.md:75:- The sidebar `SidebarScopeSwitcher` file remains unused but on disk. If Phase 5+ chooses to fold profile/admin scope switching back into the sidebar, it can be re-imported; otherwise it can be deleted in a future cleanup.
.yagi-autobuild\phase-4-x\_wave_c5b_sub10_db_audit.md:90:| `artist` | 1 (artist@yagiworkshop.xyz from amend_02b) |
.yagi-autobuild\phase-4-x\_wave_c5b_result.md:28:| 13 | manual artist account (HALTED on Phase 5 migration) | `6cee030` | 🟡 script ready, _artist_account_created.md halt-log |
.yagi-autobuild\phase-4-x\_wave_c5b_result.md:156:`profiles_role_check` constraint allows `{creator, studio,
.yagi-autobuild\phase-4-x\_wave_c5b_result.md:157:observer, client}` only — no `'artist'`. The Wave C.5b prompt's
.yagi-autobuild\phase-4-x\_wave_c5b_result.md:159:authored `scripts/create-artist-account.ts` (typed, idempotent,
.yagi-autobuild\phase-4-x\_wave_c5b_result.md:160:service-role) and committed `_artist_account_created.md` with the
.yagi-autobuild\phase-4-x\_wave_c5b_result.md:161:path-to-unblock checklist (Phase 5 entry CHECK-widening migration
.yagi-autobuild\phase-4-x\_wave_c5b_result.md:168:- **FU-C5b-01** — Phase 5 Artist Roster intake surface (curated, not
.yagi-autobuild\phase-4-x\_wave_c5b_result.md:169:  self-register). Trigger: Phase 5 entry.
.yagi-autobuild\phase-4-x\_wave_c5b_result.md:239:Email flow (when artist@yagiworkshop.xyz can be created or another
.yagi-autobuild\phase-4-x\_wave_c5b_result.md:317:- ThemeProvider re-enables `enableSystem` so a future Phase 5+
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:17:| 02a | profiles_role_check widened to include 'artist' | `e0400d4` | ✅ migration applied; constraint includes 'artist'; ProfileRole TS type extended; sidebar switch case added |
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:18:| 02b | artist demo account bootstrap (sub_13 unblocked) | `d1d5af1` | ✅ artist@yagiworkshop.xyz / role=artist / handle=artist_demo_2d6a3f / email_confirmed |
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:19:| 03 | yonsei legacy 'creator' → 'client' reclassify | `8dd711f` | ✅ 1 row updated; final distribution artist 1 / client 2 / NULL 1 / 0 of {creator, studio, observer} |
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:65:Pulled forward from Phase 5 entry. `profiles_role_check` widened to
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:66:include `'artist'`. Additive only — all existing rows pass. No RLS
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:71:TypeScript ProfileRole union extended with `"artist"` (HIGH-B fix
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:79:**Bootstrap result** (`scripts/create-artist-account.ts` executed
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:83:[artist-account] created user_id=2d6a3f6f-cd69-4425-93b6-bebd9f4cf434 role=artist
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:91:| auth.users.email | `artist@yagiworkshop.xyz` |
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:93:| profile.handle | `artist_demo_2d6a3f` |
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:95:| profile.role | `artist` |
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:101:3. Script's service-role upsert → ON CONFLICT (id) UPDATE → role='artist', handle='artist_demo_2d6a3f'
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:104:Login test instructions in `_artist_account_created.md`.
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:129:| `artist` | 1 |
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:150:Picked up at Phase 4.x ff-merge → hotfix-1 OR Phase 5 entry IA
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:189:- [ ] Sign in at `/ko/signin` with `artist@yagiworkshop.xyz` /
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:191:      (artist account has no workspace_members row; Phase 5 entry
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:206:| FU-C5b-01 (Phase 5 Artist Roster intake) | open — demo account exists but curated intake flow is Phase 5 |
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:213:| FU-C5b-08 (brand onboarding step rework) | open — Phase 4.x hotfix-1 or Phase 5 |
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:224:2. Sign in as `artist@yagiworkshop.xyz` to confirm the demo flow.
.yagi-autobuild\phase-4-x\_wave_a_result.md:87:Wave B 의 detail page authorization will use `created_by` (BLOCKER 1 consistency). Status timeline 5 stages will map to: 검토 (`in_review`/`draft`) → 라우팅 (`routing`) → 진행 (`in_progress`) → 시안 (`approval_pending`, Phase 5+ inactive slot) → 납품 (`delivered`).
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:145:- "크리에이터/스튜디오" = Phase 2.x 잔재. Artist Roster 영입은 *야기 직접* (Phase 5+).
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:153:6. `_followups.md` 에 기록: "Phase 5 entry 시 Artist Roster 영입 surface 새 설계"
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:416:- Phase 5+ 재설계 가능 상태
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:465:- Artist Roster 영입 = **Phase 5 entry 에서 새 설계** (셀럽/엔터에이전시 — 야기 직접 영입)
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:518:### sub_13 — Artist 계정 manual 생성 (artist@yagiworkshop.xyz)
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:521:- Email: `artist@yagiworkshop.xyz`
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:523:- Role: `artist` (PRODUCT-MASTER §4)
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:524:- Test/demo 계정 (Phase 5 entry 의 Artist Roster 영입 surface 도입 전 manual 생성)
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:528:**먼저 profiles.role enum 에 'artist' 가 있는지 확인 필수**:
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:541:'artist' 가 없으면 야기에게 chat 보고 (Phase 5 의 Artist workspace 작업 의존성).
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:543:**계정 생성** — `scripts/create-artist-account.ts` (NEW):
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:555:    email: 'artist@yagiworkshop.xyz',
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:566:    .update({ role: 'artist' })
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:577:실행: `npx tsx scripts/create-artist-account.ts`
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:580:- artist@yagiworkshop.xyz 생성 + email_confirmed
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:581:- profiles.role = 'artist' (또는 enum 미정 시 야기 보고)
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:583:- `_artist_account_created.md` 작성 (user_id + verify SQL)
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:586:- `scripts/create-artist-account.ts` (NEW)
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:587:- `_artist_account_created.md` (작성 후)
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:590:`chore(phase-4-x): wave-c5b sub_13 — manual artist account created (artist@yagiworkshop.xyz, demo)`
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:616:  - artist@yagiworkshop.xyz 로그인 시 동작
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:648:2. **artist@yagiworkshop.xyz 로그인** → workspace 없는 상태 동작 review (Phase 5 entry signal)
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:677:- `_artist_account_created.md`
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:681:- `_followups.md` (Supabase Dashboard manual sync, Phase 5 Artist Roster 영입, Phase 7+ brand logo 교체 등)
.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:19:   - amend_02: artist enum widening + sub_13 script 실행
.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:24:4. **Meeting type/duration UX 변경 = NOT in scope** — `_followups.md` 의 FU-C5b-09 로 등록만. Phase 4.x hotfix-1 또는 Phase 5 entry 에서 처리.
.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:29:2. `.yagi-autobuild\phase-4-x\_artist_account_created.md` (sub_13 HALT 컨텍스트)
.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:49:   - amend_02 (enum widen): additive only verify / RLS 영향 / TypeScript ProfileRole 타입 sync / Phase 5 entry artist 작업과 일관성
.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:136:- ALTER profiles_role_check: 기존 ['creator', 'studio', 'observer', 'client'] + 'artist' 추가
.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:142:- Focus: additive verify, RLS 영향, ProfileRole TypeScript sync, Phase 5 entry artist 작업과 일관성
.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:151:npx tsx scripts/create-artist-account.ts
.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:159:WHERE u.email = 'artist@yagiworkshop.xyz';
.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:162:`_artist_account_created.md` UPDATE (HALTED → CREATED, user_id 기록).
.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:165:- `feat(phase-4-x): wave-c5b amend_02a — widen profiles_role_check to include 'artist'`
.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:166:- `chore(phase-4-x): wave-c5b amend_02b — bootstrap artist demo account`
.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:241:    "tooltip": "Digital Twin is an AI asset based on real persons (artists, actors, musicians). YAGI may suggest using a Twin from our licensed roster for your project. You can also proceed without a Twin (virtual character / VFX only).",
.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:345:## FU-C5b-09 — Meeting type/duration UX rework (Phase 4.x hotfix-1 또는 Phase 5 entry)
.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:370:Phase 4.x hotfix-1 (FU-C5b-08 brand onboarding 과 함께 묶음 권장) 또는 Phase 5 entry IA 정리 시.
.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:379:<ISO> FU-C5b-09 registered (meeting type/duration UX rework, deferred to hotfix-1 or Phase 5)
.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:409:- `_artist_account_created.md` (UPDATE — HALTED → CREATED)
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:4:> sub_01.amendment (profile auto-trigger) + sub_13.amendment (artist enum widening + 실행) + sub_10.amendment (yonsei creator reclassify) + brand onboarding followup.
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:18:2. **artist enum widening** — Phase 5 까지 안 미룸. Phase 4.x 안에서 처리. 야기가 *지금* artist 시각 review 필요.
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:30:2. `.yagi-autobuild\phase-4-x\_artist_account_created.md` (sub_13 HALT 컨텍스트)
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:60:-- Phase 5 entry will revisit when 'artist' enum + Artist intake surface
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:201:- 기존: 'artist' enum widening = Phase 5 entry migration 에서 처리 (sub_13 HALT)
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:202:- 변경: Phase 4.x 안에서 처리. 야기가 *지금* artist demo 계정으로 시각 review 필요.
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:206:- artist 계정 = visual smoke 의 prerequisite (Phase 5 entry 의 prerequisite 가 아님)
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:216:-- Phase 4.x Wave C.5b amend_02 — widen profiles_role_check to include 'artist'
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:219:-- includes 'artist' as first-class persona. Demo account creation
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:222:-- Phase 5 entry will introduce Artist Roster intake surface; this
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:226:  DROP CONSTRAINT IF EXISTS profiles_role_check;
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:229:  ADD CONSTRAINT profiles_role_check CHECK (
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:231:    (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:244:   ('artist' 추가 시 의도치 않은 RLS bypass?)
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:245:3. Server-side action / RPC 가 role 검증할 때 'artist' 미인지 시 fail-safe?
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:246:4. Application code 의 ProfileRole TypeScript 타입이 'artist' 빠져있으면
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:250:6. Phase 5 entry 의 Artist intake surface 가 별도 migration 으로 enum 추가
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:251:   계획이었는데, 지금 추가하면 Phase 5 의 다른 작업 (예: artist_profiles
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:252:   table 또는 workspaces.kind='artist') 이 stale spec 되지 않나?
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:261:야기 + this-chat 검토. 특히 *Phase 5 entry 의 다른 artist 작업과의 일관성* 확인.
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:273:WHERE conname = 'profiles_role_check';
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:274:-- 결과에 'artist' 포함 확인
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:283:**Step 5 — sub_13 script 실행 (artist 계정 생성)**
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:288:npx tsx scripts/create-artist-account.ts
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:296:WHERE u.email = 'artist@yagiworkshop.xyz';
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:297:-- role='artist', display_name='Artist Demo', handle='artist_demo_<6char>'
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:302:- `scripts/create-artist-account.ts` (이미 있음, 변경 X)
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:304:- `_artist_account_created.md` (UPDATE — HALTED 상태 → CREATED 로 변경, user_id + verify SQL 결과 기록)
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:308:- Migration 적용 + CHECK constraint 'artist' 포함
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:311:- artist@yagiworkshop.xyz 계정 생성 + email_confirmed + role='artist'
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:316:- `feat(phase-4-x): wave-c5b amend_02a — widen profiles_role_check to include 'artist'`
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:317:- `chore(phase-4-x): wave-c5b amend_02b — bootstrap artist demo account (sub_13 unblocked)`
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:389:## FU-C5b-08 — Brand onboarding step model 재검토 (Phase 4.x hotfix-1 또는 Phase 5 entry)
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:396:  Phase 4.x ff-merge 후 hotfix-1 또는 Phase 5 entry 에서 IA 정리와 함께 처리
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:413:Phase 4.x ff-merge 후 hotfix-1 또는 Phase 5 entry (Artist Roster 와 함께 IA 정리)
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:438:- amend_02 의 enum widening + artist 계정 생성 결과
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:472:- `_artist_account_created.md` (UPDATE — HALTED → CREATED)
.yagi-autobuild\phase-4-x\_wave-c5a-prompt.md:363:<ISO> phase-4-x WAVE_C5A_END_BEFORE_ARTIST_REVIEW sha=<latest> awaiting_yagi_artist_review=true
.yagi-autobuild\phase-4-x\_wave-a-prompt.md:172:- Forbidden: Phase 5+ 작업 (Artist workspace, Roster, Approval gate, Inbound routing, License surface, Reveal Layer)
.yagi-autobuild\phase-4-x\_run.log:71:2026-05-01T03:36Z phase-4-x WAVE_C5A_END_BEFORE_ARTIST_REVIEW sha=83e9a39 awaiting_yagi_artist_review=true
.yagi-autobuild\phase-4-x\_run.log:75:2026-05-01T07:30Z sub_13 HALTED on profiles_role_check missing 'artist' enum value — Phase 5 entry migration prerequisite per yagi spec
.yagi-autobuild\phase-4-x\_run.log:79:2026-05-01T10:30Z amend_02a role_enum_widened_artist applied migration=20260501100806 self_review=0_HIGH-A type_drift=fixed
.yagi-autobuild\phase-4-x\_run.log:80:2026-05-01T10:30Z amend_02b artist_demo_account_created user_id=2d6a3f6f-cd69-4425-93b6-bebd9f4cf434 role=artist email_confirmed=true
.yagi-autobuild\phase-4-x\_run.log:81:2026-05-01T10:30Z amend_03 yonsei_reclassify creator_to_client rows_updated=1 final_distribution_artist=1_client=2_null=1_creator=0_studio=0
.yagi-autobuild\phase-4-x\_followups.md:6:## FU-C5b-01 — Phase 5 Artist Roster intake surface
.yagi-autobuild\phase-4-x\_followups.md:8:- **Trigger**: Phase 5 entry (셀럽/엔터에이전시 영입 시작).
.yagi-autobuild\phase-4-x\_followups.md:10:  manually created via `scripts/create-artist-account.ts` (sub_13).
.yagi-autobuild\phase-4-x\_followups.md:14:  Artist Roster is curated, not self-served. Likely a yagi-admin tool
.yagi-autobuild\phase-4-x\_followups.md:54:- **Trigger**: Phase 5+ if yagi changes the canvas-color verdict (e.g.
.yagi-autobuild\phase-4-x\_followups.md:118:- **Trigger**: Phase 4.x ff-merge → hotfix-1, OR Phase 5 entry (when
.yagi-autobuild\phase-4-x\_followups.md:119:  the IA is being re-laid out for Artist Roster anyway).
.yagi-autobuild\phase-4-x\_decisions_locked.md:23:- URL prefix `/app/w/[workspaceId]/*` 패턴은 Phase 5 또는 6 에서 도입 (현 시점 layout 변경 최소화)
.yagi-autobuild\phase-4-x\_decisions_locked.md:28:**LOCKED = B (Disabled placeholder "Phase 5 부터 가능")**
.yagi-autobuild\phase-4-x\_decisions_locked.md:30:- Dropdown 의 "+ 추가" 항목 = disabled state + tooltip "Phase 5 부터 가능"
.yagi-autobuild\phase-4-x\_decisions_locked.md:31:- i18n 키 `workspace.switcher.add_new.disabled` = "Phase 5 부터 가능"
.yagi-autobuild\phase-4-x\_decisions_locked.md:32:- Workspace 생성 surface (별도 form 또는 modal) = Phase 5 작업
.yagi-autobuild\phase-4-x\_autopilot_summary.md:29:- `workspaces.kind` text NOT NULL DEFAULT 'brand' CHECK IN ('brand','artist','yagi_admin') + idx
.yagi-autobuild\phase-4-x\_autopilot_summary.md:139:- [ ] `projects.kind` 6-value enum: non-RPC INSERT of `'inbound_brand_to_artist'` → DENY confirmed
.yagi-autobuild\phase-4-x\_autopilot-prompt.md:138:- 시안: status='approval_pending' (Phase 5+, slot 만)
.yagi-autobuild\phase-4-x\_autopilot-prompt.md:198:- Dropdown groups: Brands / Artists (Phase 5+) / YAGI Admin
.yagi-autobuild\phase-4-x\_autopilot-prompt.md:199:- "+ 새 workspace 추가" disabled tooltip "Phase 5 부터 가능"
.yagi-autobuild\phase-4-x\_autopilot-prompt.md:269:- Forbidden: Phase 5+ 작업, ProfileRole 타입 narrowing, status machine 수정
.yagi-autobuild\phase-4-x\_artist_account_created.md:3:**Status**: ✅ Created 2026-05-01 via `scripts/create-artist-account.ts`
.yagi-autobuild\phase-4-x\_artist_account_created.md:4:after Wave C.5b amend_02 widened `profiles_role_check` to include
.yagi-autobuild\phase-4-x\_artist_account_created.md:5:`'artist'`.
.yagi-autobuild\phase-4-x\_artist_account_created.md:11:- email: `artist@yagiworkshop.xyz`
.yagi-autobuild\phase-4-x\_artist_account_created.md:13:- role: `artist` (PRODUCT-MASTER §4 / DECISIONS Q-094 persona model)
.yagi-autobuild\phase-4-x\_artist_account_created.md:15:  Phase 5 Artist Roster intake surface design
.yagi-autobuild\phase-4-x\_artist_account_created.md:20:`profiles_role_check` constraint reads:
.yagi-autobuild\phase-4-x\_artist_account_created.md:24:       (role = ANY (ARRAY['creator','studio','observer','client','artist'])))
.yagi-autobuild\phase-4-x\_artist_account_created.md:27:`'artist'` is a permitted value. Path-to-unblock from the original
.yagi-autobuild\phase-4-x\_artist_account_created.md:33:> npx tsx scripts/create-artist-account.ts
.yagi-autobuild\phase-4-x\_artist_account_created.md:34:[artist-account] created user_id=2d6a3f6f-cd69-4425-93b6-bebd9f4cf434 role=artist
.yagi-autobuild\phase-4-x\_artist_account_created.md:42:| auth.users.email | `artist@yagiworkshop.xyz` |
.yagi-autobuild\phase-4-x\_artist_account_created.md:45:| profiles.handle | `artist_demo_2d6a3f` |
.yagi-autobuild\phase-4-x\_artist_account_created.md:47:| profiles.role | `artist` |
.yagi-autobuild\phase-4-x\_artist_account_created.md:59:   `handle='c_<md5>'`, `display_name='artist'` (email local-part),
.yagi-autobuild\phase-4-x\_artist_account_created.md:63:   `'artist'`, `handle` to `'artist_demo_2d6a3f'`,
.yagi-autobuild\phase-4-x\_artist_account_created.md:68:   client → artist transition.
.yagi-autobuild\phase-4-x\_artist_account_created.md:70:Net result: account is `role='artist'` end-to-end with the
.yagi-autobuild\phase-4-x\_artist_account_created.md:77:- email: `artist@yagiworkshop.xyz`
.yagi-autobuild\phase-4-x\_artist_account_created.md:81:artist account has no `workspace_members` row. Phase 5 entry will
.yagi-autobuild\phase-4-x\_artist_account_created.md:82:introduce a curated Artist intake / workspace bootstrap path; for
.yagi-autobuild\phase-4-x\_artist_account_created.md:87:- `scripts/create-artist-account.ts` — unchanged from sub_13 commit.
.yagi-autobuild\phase-4-x\_artist_account_created.md:94:- FU-C5b-01 (Phase 5 Artist Roster intake surface) remains open. The
.yagi-autobuild\phase-4-x\_artist_account_created.md:96:  flow it stands in for is still a Phase 5 deliverable.
.yagi-autobuild\phase-4-x\_artist_account_created.md:100:  reachable until Phase 5 either grants the artist a workspace or
.yagi-autobuild\phase-4-x\_amend02_self_review.md:5:`scripts/create-artist-account.ts` after apply.
.yagi-autobuild\phase-4-x\_amend02_self_review.md:14:- **Surface**: `DROP CONSTRAINT IF EXISTS profiles_role_check; ADD CONSTRAINT
.yagi-autobuild\phase-4-x\_amend02_self_review.md:16:  'observer','client','artist'])))`.
.yagi-autobuild\phase-4-x\_amend02_self_review.md:23:  - `role = 'studio' / 'observer' / 'artist'` — 0 rows. Trivially ok.
.yagi-autobuild\phase-4-x\_amend02_self_review.md:35:- **Question**: does adding 'artist' to the enum cause an unintended
.yagi-autobuild\phase-4-x\_amend02_self_review.md:38:  enum membership check. Adding 'artist' has no effect on whether a
.yagi-autobuild\phase-4-x\_amend02_self_review.md:39:  row matches `p.role = 'creator'` (it doesn't). Phase 5 will likely
.yagi-autobuild\phase-4-x\_amend02_self_review.md:40:  introduce an `artists_update_self` policy with `p.role = 'artist'`
.yagi-autobuild\phase-4-x\_amend02_self_review.md:50:  the artist bootstrap script (sub_13) UPSERTs over the row to flip
.yagi-autobuild\phase-4-x\_amend02_self_review.md:51:  role to 'artist' afterward. See F5.
.yagi-autobuild\phase-4-x\_amend02_self_review.md:54:### F4 — `validate_profile_role_transition` semantics on artist UPSERT
.yagi-autobuild\phase-4-x\_amend02_self_review.md:57:  NEW.id) from `client → other` and `non-NULL → NULL`. The artist
.yagi-autobuild\phase-4-x\_amend02_self_review.md:61:  does the trigger reject the UPDATE to role='artist'?
.yagi-autobuild\phase-4-x\_amend02_self_review.md:75:     created with `role='client'`, `display_name='artist'` (email
.yagi-autobuild\phase-4-x\_amend02_self_review.md:78:     'artist_demo_<6chars>', display_name: 'Artist Demo', role:
.yagi-autobuild\phase-4-x\_amend02_self_review.md:79:     'artist', locale: 'ko' })` → ON CONFLICT (id) → UPDATE.
.yagi-autobuild\phase-4-x\_amend02_self_review.md:82:- **Verdict**: `artist_demo_<6chars>` = 7 + 6 = 13 chars, all in the
.yagi-autobuild\phase-4-x\_amend02_self_review.md:96:  (artist account row served as part of AppContext)?
.yagi-autobuild\phase-4-x\_amend02_self_review.md:98:  be `'artist'` for the demo account row. The TypeScript type must
.yagi-autobuild\phase-4-x\_amend02_self_review.md:99:  include 'artist' or any code casting it (`profile.role as ProfileRole`)
.yagi-autobuild\phase-4-x\_amend02_self_review.md:105:  type-safety regression). **Auto-fixable** by appending `| "artist"`
.yagi-autobuild\phase-4-x\_amend02_self_review.md:108:### F7 — Phase 5 entry artist work — does this lock-in?
.yagi-autobuild\phase-4-x\_amend02_self_review.md:110:- **Question**: Phase 5 will introduce Artist Roster intake. Will the
.yagi-autobuild\phase-4-x\_amend02_self_review.md:111:  enum already including 'artist' cause Phase 5's migration to be
.yagi-autobuild\phase-4-x\_amend02_self_review.md:113:- **Verdict**: NO. Phase 5 work will be:
.yagi-autobuild\phase-4-x\_amend02_self_review.md:115:    based per FU-C5b-01).
.yagi-autobuild\phase-4-x\_amend02_self_review.md:116:  - Likely an `artist_profiles` child table (analogous to
.yagi-autobuild\phase-4-x\_amend02_self_review.md:117:    `creators` / `studios`) for artist-specific fields.
.yagi-autobuild\phase-4-x\_amend02_self_review.md:119:  - Possibly a `workspaces.kind='artist'` extension if the artist
.yagi-autobuild\phase-4-x\_amend02_self_review.md:122:  layer on top of `role='artist'` already being valid. The enum
.yagi-autobuild\phase-4-x\_amend02_self_review.md:153:  treats the enum as closed-world. Adding 'artist' is graceful.
.yagi-autobuild\phase-4-x\_amend02_self_review.md:160:  append `| "artist"` to the union in `src/lib/app/context.ts`.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:18:  2. src/lib/app/context.ts (ProfileRole union extended with "artist")
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:20:  4. scripts/create-artist-account.ts (admin bootstrap path; already executed)
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:22:This migration widens the profiles_role_check CHECK constraint to include the value 'artist' in addition to the prior allowlist (creator/studio/observer/client). Rationale: pulled forward from Phase 5 entry to unblock the demo Artist account in Wave C.5b sub_13 / amend_02b. The migration is ALREADY APPLIED to prod (jvamvbpxnztynsccvcmr) and the demo account artist@yagiworkshop.xyz is live with role='artist'.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:28:4. Audit RLS policies for any role-string consumer that treats the enum as closed-world (look for hard-coded literal lists). Also check `creators_update_self`, `studios_update_self`, `validate_profile_role_transition` — does adding 'artist' open an unintended path?
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:29:5. Read scripts/create-artist-account.ts — the upsert ordering after the trigger creates role='client' first; does the script's UPDATE survive validate_profile_role_transition without the service-role bypass being load-bearing in unexpected ways?
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:30:6. Search for `case "creator"` / switch over ProfileRole / Zod enum on role to confirm 'artist' falls through cleanly.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:35:C. validate_profile_role_transition interaction — does the artist UPSERT exercise an edge that the function doesn't anticipate?
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:38:F. Phase 5 entry artist work — does pulling the enum widening forward leave any Phase 5 migration stale or expecting a CHECK that no longer matches?
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:42:J. Account landing experience for artist@yagiworkshop.xyz — workspace-required redirect at /[locale]/app/layout.tsx skips role==='client' but not role==='artist'. Does that leave the artist demo bouncing into /onboarding/workspace as a side effect? If so, MED-B (UX gap) or LOW (Phase 5 will redesign)?
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:60:I’ll do this as a read-only review. I’m going to inspect the exact migration and the known role consumers first, then widen the search to RLS, RPCs, scripts, and any Phase 5 migration assumptions before writing findings.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:66:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Raw -LiteralPath 'scripts/create-artist-account.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:74:-- Phase 4.x Wave C.5b amend_02 ??widen profiles_role_check to include 'artist'.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:77:-- as Brand + Artist + YAGI Admin. The profiles_role_check CHECK constraint
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:79:-- (post-sub_00 ROLLBACK) needs the artist demo account live for review,
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:80:-- which requires this enum widening ??originally deferred to Phase 5
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:90:-- Phase 5 entry will introduce the Artist Roster intake surface; this
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:92:-- does NOT lock-in any artist-specific RLS / RPC shape.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:95:  DROP CONSTRAINT IF EXISTS profiles_role_check;
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:98:  ADD CONSTRAINT profiles_role_check CHECK (
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:100:    (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:158:    case "artist":
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:228: *   email:    artist@yagiworkshop.xyz
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:230: *   role:     'artist'
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:232: * Run via: `npx tsx scripts/create-artist-account.ts`
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:234: * BLOCKED until the `profiles_role_check` CHECK constraint is widened
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:235: * to accept 'artist'. The current constraint is:
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:240: * Adding 'artist' is a Phase 5 entry deliverable (curated Artist
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:252:const ARTIST_EMAIL = "artist@yagiworkshop.xyz";
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:255:const ARTIST_ROLE = "artist";
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:279:      console.warn(`[artist-account] auth user already exists, looking up id...`);
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:284:      console.log(`[artist-account] existing user_id=${existing.id} profile ensured`);
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:294:  console.log(`[artist-account] created user_id=${userId} role=${ARTIST_ROLE}`);
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:299:  const handle = `artist_demo_${userId.slice(0, 6)}`;
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:309:    if (profileErr.code === "23514" || profileErr.message.includes("profiles_role_check")) {
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:311:        `[artist-account] profiles_role_check rejected role='${ARTIST_ROLE}'. ` +
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:312:          `The CHECK constraint must be widened to include 'artist' (Phase 5 entry migration). ` +
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:321:  console.error("[artist-account] failed:", err);
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:452:// Phase 4.x Wave C.5b amend_02 added "artist" ??DECISIONS Q-094 / 짠4 of
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:454:// Phase 5 entry deliverable (FU-C5b-01); the type extension here covers
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:456:export type ProfileRole = "creator" | "studio" | "observer" | "client" | "artist";
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:542:`scripts/create-artist-account.ts` after apply.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:551:- **Surface**: `DROP CONSTRAINT IF EXISTS profiles_role_check; ADD CONSTRAINT
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:553:  'observer','client','artist'])))`.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:560:  - `role = 'studio' / 'observer' / 'artist'` ??0 rows. Trivially ok.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:572:- **Question**: does adding 'artist' to the enum cause an unintended
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:575:  enum membership check. Adding 'artist' has no effect on whether a
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:576:  row matches `p.role = 'creator'` (it doesn't). Phase 5 will likely
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:577:  introduce an `artists_update_self` policy with `p.role = 'artist'`
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:587:  the artist bootstrap script (sub_13) UPSERTs over the row to flip
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:588:  role to 'artist' afterward. See F5.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:591:### F4 ??`validate_profile_role_transition` semantics on artist UPSERT
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:594:  NEW.id) from `client ??other` and `non-NULL ??NULL`. The artist
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:598:  does the trigger reject the UPDATE to role='artist'?
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:612:     created with `role='client'`, `display_name='artist'` (email
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:615:     'artist_demo_<6chars>', display_name: 'Artist Demo', role:
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:616:     'artist', locale: 'ko' })` ??ON CONFLICT (id) ??UPDATE.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:619:- **Verdict**: `artist_demo_<6chars>` = 7 + 6 = 13 chars, all in the
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:633:  (artist account row served as part of AppContext)?
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:635:  be `'artist'` for the demo account row. The TypeScript type must
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:636:  include 'artist' or any code casting it (`profile.role as ProfileRole`)
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:642:  type-safety regression). **Auto-fixable** by appending `| "artist"`
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:645:### F7 ??Phase 5 entry artist work ??does this lock-in?
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:647:- **Question**: Phase 5 will introduce Artist Roster intake. Will the
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:648:  enum already including 'artist' cause Phase 5's migration to be
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:650:- **Verdict**: NO. Phase 5 work will be:
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:652:    based per FU-C5b-01).
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:653:  - Likely an `artist_profiles` child table (analogous to
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:654:    `creators` / `studios`) for artist-specific fields.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:656:  - Possibly a `workspaces.kind='artist'` extension if the artist
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:659:  layer on top of `role='artist'` already being valid. The enum
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:690:  treats the enum as closed-world. Adding 'artist' is graceful.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:697:  append `| "artist"` to the union in `src/lib/app/context.ts`.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:713:The initial files confirm the type and sidebar patch are present, and the app layout still only exempts `client` from the workspace requirement. Next I’m searching the SQL and application code for hard-coded role lists, trigger functions, policies, and Phase 5 assumptions.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:715:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"profiles_role_check|validate_profile_role_transition|creators_update_self|studios_update_self|handle_new_user|is_yagi_admin|is_ws_admin|role_switched_at|role\\s*=\\s*ANY|ARRAY\\['creator'|creator.*studio.*observer.*client|observer.*client|role\\s+in|role IN|role='|role = '\" supabase src scripts .yagi-autobuild docs -g '"'!node_modules'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:719:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"artist|profiles_role_check|Phase 5|Artist Roster|FU-C5b-01|curated Artist\" supabase/migrations docs .yagi-autobuild scripts src -g '"'!node_modules'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:721:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg --files supabase src scripts .yagi-autobuild docs | rg "(migration|schema|policy|rls|action|rpc|context|sidebar|layout|create-artist|phase-5|phase_5|Phase 5)"' in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild\phase-4-x\_amend02_codex_prompt.txt:6:  2. src/lib/app/context.ts (ProfileRole union extended with "artist")
.yagi-autobuild\phase-4-x\_amend02_codex_prompt.txt:8:  4. scripts/create-artist-account.ts (admin bootstrap path; already executed)
.yagi-autobuild\phase-4-x\_amend02_codex_prompt.txt:10:This migration widens the profiles_role_check CHECK constraint to include the value 'artist' in addition to the prior allowlist (creator/studio/observer/client). Rationale: pulled forward from Phase 5 entry to unblock the demo Artist account in Wave C.5b sub_13 / amend_02b. The migration is ALREADY APPLIED to prod (jvamvbpxnztynsccvcmr) and the demo account artist@yagiworkshop.xyz is live with role='artist'.
.yagi-autobuild\phase-4-x\_amend02_codex_prompt.txt:16:4. Audit RLS policies for any role-string consumer that treats the enum as closed-world (look for hard-coded literal lists). Also check `creators_update_self`, `studios_update_self`, `validate_profile_role_transition` — does adding 'artist' open an unintended path?
.yagi-autobuild\phase-4-x\_amend02_codex_prompt.txt:17:5. Read scripts/create-artist-account.ts — the upsert ordering after the trigger creates role='client' first; does the script's UPDATE survive validate_profile_role_transition without the service-role bypass being load-bearing in unexpected ways?
.yagi-autobuild\phase-4-x\_amend02_codex_prompt.txt:18:6. Search for `case "creator"` / switch over ProfileRole / Zod enum on role to confirm 'artist' falls through cleanly.
.yagi-autobuild\phase-4-x\_amend02_codex_prompt.txt:23:C. validate_profile_role_transition interaction — does the artist UPSERT exercise an edge that the function doesn't anticipate?
.yagi-autobuild\phase-4-x\_amend02_codex_prompt.txt:26:F. Phase 5 entry artist work — does pulling the enum widening forward leave any Phase 5 migration stale or expecting a CHECK that no longer matches?
.yagi-autobuild\phase-4-x\_amend02_codex_prompt.txt:30:J. Account landing experience for artist@yagiworkshop.xyz — workspace-required redirect at /[locale]/app/layout.tsx skips role==='client' but not role==='artist'. Does that leave the artist demo bouncing into /onboarding/workspace as a side effect? If so, MED-B (UX gap) or LOW (Phase 5 will redesign)?
.yagi-autobuild\phase-4-x\_amend01_self_review.md:121:  a Brand client by default. The artist bootstrap path (sub_13 script
.yagi-autobuild\phase-4-x\_amend01_self_review.md:122:  via service-role admin) inserts/upserts with `role='artist'`
.yagi-autobuild\phase-4-x\_amend01_self_review.md:127:  3. Script's `supabase.from('profiles').upsert({id, role: 'artist', ...})`
.yagi-autobuild\phase-4-x\_amend01_self_review.md:128:     UPDATEs the just-created row, role flips to 'artist'.
.yagi-autobuild\phase-4-x\_amend01_self_review.md:162:artist bootstrap path's `upsert` runs AFTER the trigger has produced
.yagi-autobuild\phase-4-x\_amend01_self_review.md:164:of N artist accounts, each goes through this trigger first then
.yagi-autobuild\phase-4-x\_amend01_self_review.md:179:- Phase 5 Artist intake design alignment (does the trigger break that?
.yagi-autobuild\phase-4-x\_amend01_self_review.md:180:  Likely no, since the artist bootstrap can override role via upsert
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:239:I. 'client' default role consistency with persona A (DECISIONS_CACHE.md Q-094 = Brand-only Phase 4-9). Interaction with the artist bootstrap path (sub_13 service-role admin upsert) ??does the trigger first creating role='client' then UPDATE to 'artist' work cleanly through validate_profile_role_transition?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:285:// Phase 4.x Wave C.5b amend_02 added "artist" ??DECISIONS Q-094 / 吏? of
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:287:// Phase 5 entry deliverable (FU-C5b-01); the type extension here covers
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:289:export type ProfileRole = "creator" | "studio" | "observer" | "client" | "artist";
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:704:  a Brand client by default. The artist bootstrap path (sub_13 script
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:705:  via service-role admin) inserts/upserts with `role='artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:710:  3. Script's `supabase.from('profiles').upsert({id, role: 'artist', ...})`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:711:     UPDATEs the just-created row, role flips to 'artist'.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:745:artist bootstrap path's `upsert` runs AFTER the trigger has produced
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:747:of N artist accounts, each goes through this trigger first then
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:762:- Phase 5 Artist intake design alignment (does the trigger break that?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:763:  Likely no, since the artist bootstrap can override role via upsert
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:771:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"CREATE TABLE public\\.profiles|profiles_handle_check|handle.*UNIQUE|validate_profile_role_transition|role.*client|role.*artist|raw_user_meta_data|handle_new_user|REVOKE EXECUTE|SECURITY DEFINER|search_path\" supabase/migrations src .yagi-autobuild/phase-4-x -S" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:791:  15: -- Phase 5 entry will revisit when the Artist intake surface comes online
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:792:  16: -- (DECISIONS Q-094); the artist demo account in amend_02 is created via
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:919:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:26:-- (auto-named profiles_role_check). Drop+recreate keeps the NULL-allowed
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:920:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:28:ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:921:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:29:ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:940:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:1:-- Phase 4.x Wave C.5b amend_02 ??widen profiles_role_check to include 'artist'.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:941:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:4:-- as Brand + Artist + YAGI Admin. The profiles_role_check CHECK constraint
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:943:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:22:  DROP CONSTRAINT IF EXISTS profiles_role_check;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:945:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:25:  ADD CONSTRAINT profiles_role_check CHECK (
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1135:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:1:-- Phase 4.x Wave C.5b amend_02 ??widen profiles_role_check to include 'artist'.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1136:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:27:    (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1156:.yagi-autobuild/phase-4-x\_amend01_codex_prompt.txt:23:I. 'client' default role consistency with persona A (DECISIONS_CACHE.md Q-094 = Brand-only Phase 4-9). Interaction with the artist bootstrap path (sub_13 service-role admin upsert) ??does the trigger first creating role='client' then UPDATE to 'artist' work cleanly through validate_profile_role_transition?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1170:.yagi-autobuild/phase-4-x\_amend01_self_review.md:122:  via service-role admin) inserts/upserts with `role='artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1172:.yagi-autobuild/phase-4-x\_amend01_self_review.md:127:  3. Script's `supabase.from('profiles').upsert({id, role: 'artist', ...})`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1173:.yagi-autobuild/phase-4-x\_amend01_self_review.md:128:     UPDATEs the just-created row, role flips to 'artist'.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1188:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:35:I. 'client' default role consistency with persona A (DECISIONS_CACHE.md Q-094 = Brand-only Phase 4-9). Interaction with the artist bootstrap path (sub_13 service-role admin upsert) ??does the trigger first creating role='client' then UPDATE to 'artist' work cleanly through validate_profile_role_transition?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1216:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:536:  via service-role admin) inserts/upserts with `role='artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1218:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:541:  3. Script's `supabase.from('profiles').upsert({id, role: 'artist', ...})`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1219:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:542:     UPDATEs the just-created row, role flips to 'artist'.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1222:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:602:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"CREATE TABLE public\\.profiles|profiles_handle_check|handle.*UNIQUE|validate_profile_role_transition|role.*client|role.*artist|raw_user_meta_data|handle_new_user|REVOKE EXECUTE|SECURITY DEFINER|search_path\" supabase/migrations src .yagi-autobuild/phase-4-x -S" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1255:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:771:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:1:-- Phase 4.x Wave C.5b amend_02 ??widen profiles_role_check to include 'artist'.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1257:.yagi-autobuild/phase-4-x\_amend02_self_review.md:23:  - `role = 'studio' / 'observer' / 'artist'` ??0 rows. Trivially ok.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1258:.yagi-autobuild/phase-4-x\_amend02_self_review.md:40:  introduce an `artists_update_self` policy with `p.role = 'artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1261:.yagi-autobuild/phase-4-x\_amend02_self_review.md:51:  role to 'artist' afterward. See F5.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1262:.yagi-autobuild/phase-4-x\_amend02_self_review.md:54:### F4 ??`validate_profile_role_transition` semantics on artist UPSERT
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1264:.yagi-autobuild/phase-4-x\_amend02_self_review.md:61:  does the trigger reject the UPDATE to role='artist'?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1266:.yagi-autobuild/phase-4-x\_amend02_self_review.md:75:     created with `role='client'`, `display_name='artist'` (email
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1268:.yagi-autobuild/phase-4-x\_amend02_self_review.md:122:  layer on top of `role='artist'` already being valid. The enum
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1269:.yagi-autobuild/phase-4-x\_artist_account_created.md:13:- role: `artist` (PRODUCT-MASTER 짠4 / DECISIONS Q-094 persona model)
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1270:.yagi-autobuild/phase-4-x\_artist_account_created.md:24:       (role = ANY (ARRAY['creator','studio','observer','client','artist'])))
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1271:.yagi-autobuild/phase-4-x\_artist_account_created.md:34:[artist-account] created user_id=2d6a3f6f-cd69-4425-93b6-bebd9f4cf434 role=artist
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1272:.yagi-autobuild/phase-4-x\_artist_account_created.md:44:| auth.users.raw_user_meta_data.display_name | `Artist Demo` |
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1273:.yagi-autobuild/phase-4-x\_artist_account_created.md:47:| profiles.role | `artist` |
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1274:.yagi-autobuild/phase-4-x\_artist_account_created.md:52:This account exercises the `handle_new_user` (amend_01) ??sub_13
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1275:.yagi-autobuild/phase-4-x\_artist_account_created.md:57:2. `handle_new_user` AFTER INSERT trigger fires ??profile row
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1276:.yagi-autobuild/phase-4-x\_artist_account_created.md:58:   inserted with `role='client'` (default per persona A),
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1277:.yagi-autobuild/phase-4-x\_artist_account_created.md:65:4. `validate_profile_role_transition` trigger fires on the UPDATE
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1278:.yagi-autobuild/phase-4-x\_artist_account_created.md:70:Net result: account is `role='artist'` end-to-end with the
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1301:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:216:-- Phase 4.x Wave C.5b amend_02 ??widen profiles_role_check to include 'artist'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1302:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:231:    (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1304:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:245:3. Server-side action / RPC 媛 role 寃利앺븷 ??'artist' 誘몄씤吏 ??fail-safe?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1305:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:297:-- role='artist', display_name='Artist Demo', handle='artist_demo_<6char>'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1306:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:311:- artist@yagiworkshop.xyz 怨꾩젙 ?앹꽦 + email_confirmed + role='artist'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1307:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:316:- `feat(phase-4-x): wave-c5b amend_02a ??widen profiles_role_check to include 'artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1315:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:136:- ALTER profiles_role_check: 湲곗〈 ['creator', 'studio', 'observer', 'client'] + 'artist' 異붽?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1316:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:165:- `feat(phase-4-x): wave-c5b amend_02a ??widen profiles_role_check to include 'artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1318:.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:528:**癒쇱? profiles.role enum ??'artist' 媛 ?덈뒗吏 ?뺤씤 ?꾩닔**:
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1319:.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:566:    .update({ role: 'artist' })
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1320:.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:581:- profiles.role = 'artist' (?먮뒗 enum 誘몄젙 ???쇨린 蹂닿퀬)
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1322:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:17:| 02a | profiles_role_check widened to include 'artist' | `e0400d4` | ??migration applied; constraint includes 'artist'; ProfileRole TS type extended; sidebar switch case added |
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1323:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:18:| 02b | artist demo account bootstrap (sub_13 unblocked) | `d1d5af1` | ??artist@yagiworkshop.xyz / role=artist / handle=artist_demo_2d6a3f / email_confirmed |
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1329:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:83:[artist-account] created user_id=2d6a3f6f-cd69-4425-93b6-bebd9f4cf434 role=artist
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1330:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:95:| profile.role | `artist` |
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1332:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:101:3. Script's service-role upsert ??ON CONFLICT (id) UPDATE ??role='artist', handle='artist_demo_2d6a3f'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1336:.yagi-autobuild/phase-4-x\_wave_c5b_result.md:160:service-role) and committed `_artist_account_created.md` with the
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1354:   1: -- Phase 4.x Wave C.5b amend_02 ??widen profiles_role_check to include 'artist'.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1357:   4: -- as Brand + Artist + YAGI Admin. The profiles_role_check CHECK constraint
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1359:   6: -- (post-sub_00 ROLLBACK) needs the artist demo account live for review,
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1360:   7: -- which requires this enum widening ??originally deferred to Phase 5
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1370:  17: -- Phase 5 entry will introduce the Artist Roster intake surface; this
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1372:  19: -- does NOT lock-in any artist-specific RLS / RPC shape.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1375:  22:   DROP CONSTRAINT IF EXISTS profiles_role_check;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1378:  25:   ADD CONSTRAINT profiles_role_check CHECK (
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1380:  27:     (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1633:  15: // Phase 4.x Wave C.5b amend_02 added "artist" ??DECISIONS Q-094 / 吏? of
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1635:  17: // Phase 5 entry deliverable (FU-C5b-01); the type extension here covers
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1637:  19: export type ProfileRole = "creator" | "studio" | "observer" | "client" | "artist";
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:3833:## Finding F9 ??default role client and artist bootstrap
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:3837:- Reasoning: `client` matches the Phase 4 Brand-only default and is included in `ProfileRole` at `src/lib/app/context.ts:19`. The artist admin path can update `client -> artist` because the role transition trigger bypasses trusted service-role/direct DB contexts when `auth.uid()` is NULL.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:3924:## Finding F9 ??default role client and artist bootstrap
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:3928:- Reasoning: `client` matches the Phase 4 Brand-only default and is included in `ProfileRole` at `src/lib/app/context.ts:19`. The artist admin path can update `client -> artist` because the role transition trigger bypasses trusted service-role/direct DB contexts when `auth.uid()` is NULL.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:35:I. 'client' default role consistency with persona A (DECISIONS_CACHE.md Q-094 = Brand-only Phase 4-9). Interaction with the artist bootstrap path (sub_13 service-role admin upsert) — does the trigger first creating role='client' then UPDATE to 'artist' work cleanly through validate_profile_role_transition?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:81:// Phase 4.x Wave C.5b amend_02 added "artist" ??DECISIONS Q-094 / 짠4 of
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:83:// Phase 5 entry deliverable (FU-C5b-01); the type extension here covers
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:85:export type ProfileRole = "creator" | "studio" | "observer" | "client" | "artist";
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:500:  a Brand client by default. The artist bootstrap path (sub_13 script
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:501:  via service-role admin) inserts/upserts with `role='artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:506:  3. Script's `supabase.from('profiles').upsert({id, role: 'artist', ...})`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:507:     UPDATEs the just-created row, role flips to 'artist'.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:541:artist bootstrap path's `upsert` runs AFTER the trigger has produced
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:543:of N artist accounts, each goes through this trigger first then
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:558:- Phase 5 Artist intake design alignment (does the trigger break that?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:559:  Likely no, since the artist bootstrap can override role via upsert
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:567:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"CREATE TABLE public\\.profiles|profiles_handle_check|handle.*UNIQUE|validate_profile_role_transition|role.*client|role.*artist|raw_user_meta_data|handle_new_user|REVOKE EXECUTE|SECURITY DEFINER|search_path\" supabase/migrations src .yagi-autobuild/phase-4-x -S" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:587:  15: -- Phase 5 entry will revisit when the Artist intake surface comes online
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:588:  16: -- (DECISIONS Q-094); the artist demo account in amend_02 is created via
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:715:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:26:-- (auto-named profiles_role_check). Drop+recreate keeps the NULL-allowed
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:716:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:28:ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:717:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:29:ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:736:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:1:-- Phase 4.x Wave C.5b amend_02 — widen profiles_role_check to include 'artist'.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:737:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:4:-- as Brand + Artist + YAGI Admin. The profiles_role_check CHECK constraint
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:739:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:22:  DROP CONSTRAINT IF EXISTS profiles_role_check;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:741:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:25:  ADD CONSTRAINT profiles_role_check CHECK (
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:931:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:1:-- Phase 4.x Wave C.5b amend_02 — widen profiles_role_check to include 'artist'.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:932:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:27:    (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:952:.yagi-autobuild/phase-4-x\_amend01_codex_prompt.txt:23:I. 'client' default role consistency with persona A (DECISIONS_CACHE.md Q-094 = Brand-only Phase 4-9). Interaction with the artist bootstrap path (sub_13 service-role admin upsert) — does the trigger first creating role='client' then UPDATE to 'artist' work cleanly through validate_profile_role_transition?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:966:.yagi-autobuild/phase-4-x\_amend01_self_review.md:122:  via service-role admin) inserts/upserts with `role='artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:968:.yagi-autobuild/phase-4-x\_amend01_self_review.md:127:  3. Script's `supabase.from('profiles').upsert({id, role: 'artist', ...})`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:969:.yagi-autobuild/phase-4-x\_amend01_self_review.md:128:     UPDATEs the just-created row, role flips to 'artist'.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:984:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:35:I. 'client' default role consistency with persona A (DECISIONS_CACHE.md Q-094 = Brand-only Phase 4-9). Interaction with the artist bootstrap path (sub_13 service-role admin upsert) — does the trigger first creating role='client' then UPDATE to 'artist' work cleanly through validate_profile_role_transition?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1012:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:536:  via service-role admin) inserts/upserts with `role='artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1014:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:541:  3. Script's `supabase.from('profiles').upsert({id, role: 'artist', ...})`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1015:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:542:     UPDATEs the just-created row, role flips to 'artist'.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1018:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:602:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"CREATE TABLE public\\.profiles|profiles_handle_check|handle.*UNIQUE|validate_profile_role_transition|role.*client|role.*artist|raw_user_meta_data|handle_new_user|REVOKE EXECUTE|SECURITY DEFINER|search_path\" supabase/migrations src .yagi-autobuild/phase-4-x -S" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1051:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:771:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:1:-- Phase 4.x Wave C.5b amend_02 — widen profiles_role_check to include 'artist'.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1053:.yagi-autobuild/phase-4-x\_amend02_self_review.md:23:  - `role = 'studio' / 'observer' / 'artist'` — 0 rows. Trivially ok.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1054:.yagi-autobuild/phase-4-x\_amend02_self_review.md:40:  introduce an `artists_update_self` policy with `p.role = 'artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1057:.yagi-autobuild/phase-4-x\_amend02_self_review.md:51:  role to 'artist' afterward. See F5.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1058:.yagi-autobuild/phase-4-x\_amend02_self_review.md:54:### F4 — `validate_profile_role_transition` semantics on artist UPSERT
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1060:.yagi-autobuild/phase-4-x\_amend02_self_review.md:61:  does the trigger reject the UPDATE to role='artist'?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1062:.yagi-autobuild/phase-4-x\_amend02_self_review.md:75:     created with `role='client'`, `display_name='artist'` (email
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1064:.yagi-autobuild/phase-4-x\_amend02_self_review.md:122:  layer on top of `role='artist'` already being valid. The enum
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1065:.yagi-autobuild/phase-4-x\_artist_account_created.md:13:- role: `artist` (PRODUCT-MASTER §4 / DECISIONS Q-094 persona model)
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1066:.yagi-autobuild/phase-4-x\_artist_account_created.md:24:       (role = ANY (ARRAY['creator','studio','observer','client','artist'])))
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1067:.yagi-autobuild/phase-4-x\_artist_account_created.md:34:[artist-account] created user_id=2d6a3f6f-cd69-4425-93b6-bebd9f4cf434 role=artist
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1068:.yagi-autobuild/phase-4-x\_artist_account_created.md:44:| auth.users.raw_user_meta_data.display_name | `Artist Demo` |
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1069:.yagi-autobuild/phase-4-x\_artist_account_created.md:47:| profiles.role | `artist` |
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1070:.yagi-autobuild/phase-4-x\_artist_account_created.md:52:This account exercises the `handle_new_user` (amend_01) ↔ sub_13
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1071:.yagi-autobuild/phase-4-x\_artist_account_created.md:57:2. `handle_new_user` AFTER INSERT trigger fires → profile row
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1072:.yagi-autobuild/phase-4-x\_artist_account_created.md:58:   inserted with `role='client'` (default per persona A),
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1073:.yagi-autobuild/phase-4-x\_artist_account_created.md:65:4. `validate_profile_role_transition` trigger fires on the UPDATE
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1074:.yagi-autobuild/phase-4-x\_artist_account_created.md:70:Net result: account is `role='artist'` end-to-end with the
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1097:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:216:-- Phase 4.x Wave C.5b amend_02 — widen profiles_role_check to include 'artist'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1098:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:231:    (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1100:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:245:3. Server-side action / RPC 가 role 검증할 때 'artist' 미인지 시 fail-safe?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1101:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:297:-- role='artist', display_name='Artist Demo', handle='artist_demo_<6char>'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1102:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:311:- artist@yagiworkshop.xyz 계정 생성 + email_confirmed + role='artist'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1103:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:316:- `feat(phase-4-x): wave-c5b amend_02a — widen profiles_role_check to include 'artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1112:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:136:- ALTER profiles_role_check: 기존 ['creator', 'studio', 'observer', 'client'] + 'artist' 추가
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1113:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:165:- `feat(phase-4-x): wave-c5b amend_02a — widen profiles_role_check to include 'artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1115:.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:528:**먼저 profiles.role enum 에 'artist' 가 있는지 확인 필수**:
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1116:.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:566:    .update({ role: 'artist' })
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1117:.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:581:- profiles.role = 'artist' (또는 enum 미정 시 야기 보고)
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1119:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:17:| 02a | profiles_role_check widened to include 'artist' | `e0400d4` | ✅ migration applied; constraint includes 'artist'; ProfileRole TS type extended; sidebar switch case added |
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1120:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:18:| 02b | artist demo account bootstrap (sub_13 unblocked) | `d1d5af1` | ✅ artist@yagiworkshop.xyz / role=artist / handle=artist_demo_2d6a3f / email_confirmed |
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1126:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:83:[artist-account] created user_id=2d6a3f6f-cd69-4425-93b6-bebd9f4cf434 role=artist
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1127:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:95:| profile.role | `artist` |
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1129:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:101:3. Script's service-role upsert → ON CONFLICT (id) UPDATE → role='artist', handle='artist_demo_2d6a3f'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1133:.yagi-autobuild/phase-4-x\_wave_c5b_result.md:160:service-role) and committed `_artist_account_created.md` with the
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1151:   1: -- Phase 4.x Wave C.5b amend_02 ??widen profiles_role_check to include 'artist'.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1154:   4: -- as Brand + Artist + YAGI Admin. The profiles_role_check CHECK constraint
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1156:   6: -- (post-sub_00 ROLLBACK) needs the artist demo account live for review,
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1157:   7: -- which requires this enum widening ??originally deferred to Phase 5
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1167:  17: -- Phase 5 entry will introduce the Artist Roster intake surface; this
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1169:  19: -- does NOT lock-in any artist-specific RLS / RPC shape.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1172:  22:   DROP CONSTRAINT IF EXISTS profiles_role_check;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1175:  25:   ADD CONSTRAINT profiles_role_check CHECK (
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1177:  27:     (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1430:  15: // Phase 4.x Wave C.5b amend_02 added "artist" ??DECISIONS Q-094 / 짠4 of
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1432:  17: // Phase 5 entry deliverable (FU-C5b-01); the type extension here covers
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1434:  19: export type ProfileRole = "creator" | "studio" | "observer" | "client" | "artist";
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:3630:## Finding F9 — default role client and artist bootstrap
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:3634:- Reasoning: `client` matches the Phase 4 Brand-only default and is included in `ProfileRole` at `src/lib/app/context.ts:19`. The artist admin path can update `client -> artist` because the role transition trigger bypasses trusted service-role/direct DB contexts when `auth.uid()` is NULL.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:3721:## Finding F9 — default role client and artist bootstrap
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:3725:- Reasoning: `client` matches the Phase 4 Brand-only default and is included in `ProfileRole` at `src/lib/app/context.ts:19`. The artist admin path can update `client -> artist` because the role transition trigger bypasses trusted service-role/direct DB contexts when `auth.uid()` is NULL.
.yagi-autobuild\phase-4-x\_amend01_codex_prompt.txt:23:I. 'client' default role consistency with persona A (DECISIONS_CACHE.md Q-094 = Brand-only Phase 4-9). Interaction with the artist bootstrap path (sub_13 service-role admin upsert) — does the trigger first creating role='client' then UPDATE to 'artist' work cleanly through validate_profile_role_transition?
.yagi-autobuild\phase-4-x\task_plan.md:119:- Forbidden: Phase 5+ 작업 (Artist workspace, Roster, Approval gate, Inbound routing, License surface, Reveal Layer)
.yagi-autobuild\phase-4-x\result_07.md:27:The `recommended_artist` disabled placeholder added in task_05 (c) is the only Phase 5+ slot in the WORK group. License is intentionally absent — neither a disabled link nor a hidden entry. Phase 6+ will add it as a normal entry.
src\lib\app\context.ts:15:// Phase 4.x Wave C.5b amend_02 added "artist" — DECISIONS Q-094 / §4 of
src\lib\app\context.ts:17:// Phase 5 entry deliverable (FU-C5b-01); the type extension here covers
src\lib\app\context.ts:19:export type ProfileRole = "creator" | "studio" | "observer" | "client" | "artist";
.yagi-autobuild\phase-4-x\result_04.md:70:| 시안 | (none — Phase 5+ approval_pending slot) |
.yagi-autobuild\phase-4-x\result_03.md:48:| `tooltip` | (full KICKOFF copy) | "Digital Twin is an AI asset based on real persons (artists, actors, singers). YAGI can propose Twins of licensed talents for ads or content production. You can also produce without Twins, using only virtual characters or VFX." |
.yagi-autobuild\phase-4-x\result_01.md:10:1. **workspaces.kind**: ADD COLUMN text NOT NULL DEFAULT 'brand' CHECK IN ('brand','artist','yagi_admin') + UPDATE backfill + idx_workspaces_kind index
.yagi-autobuild\phase-4-x\KICKOFF.md:154:   what if client submits 'inbound_brand_to_artist' as kind?
.yagi-autobuild\phase-4-x\KICKOFF.md:192:3. projects.kind enum: client 가 'inbound_brand_to_artist' 직접 INSERT 시도 → RPC 외부 경로 deny 확인
.yagi-autobuild\phase-4-x\KICKOFF.md:241:    CHECK (kind IN ('brand', 'artist', 'yagi_admin'));
.yagi-autobuild\phase-4-x\KICKOFF.md:265:    'inbound_brand_to_artist',
.yagi-autobuild\phase-4-x\KICKOFF.md:287:  artist_share_percent integer NOT NULL DEFAULT 0
.yagi-autobuild\phase-4-x\KICKOFF.md:288:    CHECK (artist_share_percent BETWEEN 0 AND 100),
.yagi-autobuild\phase-4-x\KICKOFF.md:485:│       (● = Phase 5+ placeholder, disabled)       │
.yagi-autobuild\phase-4-x\KICKOFF.md:500:     - 시안 (status='approval_pending' — Phase 5+, currently inactive but slot 잡아둠)
.yagi-autobuild\phase-4-x\KICKOFF.md:521:   - 코멘트 (Phase 5 placeholder, disabled): "Phase 5+ 부터 사용 가능합니다."
.yagi-autobuild\phase-4-x\KICKOFF.md:522:   - 결과물 (Phase 5 placeholder, disabled): "납품 후 표시됩니다."
.yagi-autobuild\phase-4-x\KICKOFF.md:590:2. Brand sidebar 컴포넌트 갱신 (Phase 5 에서 Artist sidebar 별도 추가됨)
.yagi-autobuild\phase-4-x\KICKOFF.md:623:  - **권장 = B** (Phase 4 에서 layout 변경 최소화; URL prefix 는 Phase 5 또는 6 에서 도입)
.yagi-autobuild\phase-4-x\KICKOFF.md:626:  - 옵션 B: Placeholder (disabled, "Phase 5 부터 가능")
.yagi-autobuild\phase-4-x\KICKOFF.md:627:  - **권장 = B** (Artist onboarding 과 함께 Phase 5 에서 enable)
.yagi-autobuild\phase-4-x\KICKOFF.md:633:  currentWorkspace: { id: string; name: string; kind: 'brand'|'artist'|'yagi_admin' };
.yagi-autobuild\phase-4-x\KICKOFF.md:634:  workspaces: { id: string; name: string; kind: 'brand'|'artist'|'yagi_admin' }[];
.yagi-autobuild\phase-4-x\KICKOFF.md:642://   - "Artists" group: kind='artist' workspaces (Phase 5+ 렌더 — Phase 4 에는 빈 group)
.yagi-autobuild\phase-4-x\KICKOFF.md:661:): Promise<{ id: string; name: string; kind: 'brand'|'artist'|'yagi_admin' } | null> {
.yagi-autobuild\phase-4-x\KICKOFF.md:681:workspace.switcher.artists_group: "Artists"
.yagi-autobuild\phase-4-x\KICKOFF.md:684:workspace.switcher.add_new.disabled: "Phase 5 부터 가능"
.yagi-autobuild\phase-4-x\KICKOFF.md:686:workspace.switcher.add_new.disabled.en: "Available in Phase 5"
.yagi-autobuild\phase-4-x\KICKOFF.md:694:- Workspace switcher 의 group rendering — Phase 4 에 artist workspace 없는데 group 빈 상태 노출은 OK? (선택: 빈 group 숨김)
.yagi-autobuild\phase-4-x\KICKOFF.md:793:3. projects.kind enum — non-RPC 경로로 'inbound_brand_to_artist' INSERT 시도 → deny 확인
.yagi-autobuild\phase-4-x\KICKOFF.md:881:- "+ 새 workspace 추가" disabled tooltip "Phase 5 부터 가능"
.yagi-autobuild\phase-4-x\KICKOFF.md:925:**D.14. memory/HANDOFF.md 갱신** (Phase 5 entry):
.yagi-autobuild\phase-4-x\KICKOFF.md:928:- Phase 5 candidate scope (PRODUCT-MASTER §5):
.yagi-autobuild\phase-4-x\KICKOFF.md:929:  - Artist workspace 도입 (workspaces.kind = 'artist')
.yagi-autobuild\phase-4-x\KICKOFF.md:931:  - artist_profile 테이블 + Twin asset 메타데이터 (R2 prefix + 학습 status)
.yagi-autobuild\phase-4-x\KICKOFF.md:949:- Q-104: Workspace switcher = C (full multi-workspace, cookie resolution, "+ 추가" Phase 5)
.yagi-autobuild\phase-4-x\KICKOFF.md:965:- Phase 5 entry-ready 표시
.yagi-autobuild\phase-4-x\KICKOFF.md:969:- Phase 5.x scope (PRODUCT-MASTER §5 그대로)
.yagi-autobuild\phase-4-x\KICKOFF.md:988:- 야기 chat 보고: "Phase 5 entry-ready"
.yagi-autobuild\phase-4-x\KICKOFF.md:1011:- Phase 5 작업 (Artist workspace, Roster onboarding, artist_profile 테이블, 권한 dial UI, Approval gate)
.yagi-autobuild\phase-4-x\KICKOFF.md:1020:- Workspace switcher 의 "+ 새 workspace 추가" enable (Phase 5)
.yagi-autobuild\phase-4-x\KICKOFF.md:1079:- HANDOFF.md ready for Phase 5 entry
.yagi-autobuild\phase-4-x\KICKOFF.md:1113:- 옵션 B: Disabled placeholder ("Phase 5 부터 가능") — **권장 (Artist onboarding 과 함께 Phase 5)**
src\components\home\commission-cta-block.tsx:36:                : "An AI VFX platform for music labels, agencies, and artists. YAGI reviews each brief personally and responds within 1-2 business days."}
.yagi-autobuild\DECISIONS_CACHE.md:1207:permanently retired from this codebase. Artist Roster intake (셀럽 /
.yagi-autobuild\DECISIONS_CACHE.md:1208:엔터에이전시) is moved to Phase 5 entry as a curated yagi-direct flow,
.yagi-autobuild\DECISIONS_CACHE.md:1219:the future `artist` value to be added in Phase 5) is wired to a live UI
.yagi-autobuild\DECISIONS_CACHE.md:1223:"add a creator portal." Default answer: Phase 4-9 = no. Artist Roster
.yagi-autobuild\DECISIONS_CACHE.md:1224:work belongs to Phase 5 with a curated yagi-admin-issued invite-token
.yagi-autobuild\phase-2-8-1\K-PUX-1_findings.md:41:**Observation:** The home hero says YAGI is "an AI-native entertainment studio for independent artists." The service triad leads with AI Twin, Branding & IP, and Content Production.
src\components\app\sidebar.tsx:55:          Phase 5+ reuse. */}
src\components\app\sidebar-user-menu.tsx:55:    case "artist":
src\components\app\sidebar-nav.tsx:79:        key: "recommended_artist",
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:9486:re is still a director, an artist, and a brand with a particular voice. Our first question on any project is the same: wha
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:9491:messages/en.json:30:    "approach_body_p3": "What we deliver is not a disposable image. It becomes part of an artist's ide
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:9495: still a director, an artist, and a brand with a particular voice. Our first question on any project is the same: what is 
.yagi-autobuild\phase-2-8-1\_codex_kpux_output.txt:26:**Observation:** The home hero says YAGI is an “AI-native entertainment studio for independent artists.” The service triad leads with AI Twin, Branding & IP, and Content Production.
.yagi-autobuild\archive\phase-2-shipped\phase-2-7\SPEC.md:133:ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
.yagi-autobuild\archive\phase-2-shipped\phase-2-7\SPEC.md:134:ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:4514:  36:                 : "An AI VFX platform for music labels, agencies, and artists. YAGI reviews each brief personally an

 succeeded in 1489ms:
docs\design\DECISIONS.md:205:Phase 2.5 G1 introduced `profiles.role IN ('creator','studio','observer')`,
docs\design\DECISIONS.md:208:system `user_roles.role IN ('yagi_admin','workspace_admin','workspace_member','creator')`.
docs\design\DECISIONS.md:212:- `user_roles.role='creator'` (Phase 1.1) — used in `src/app/[locale]/app/layout.tsx`
docs\design\DECISIONS.md:215:- `profiles.role='creator'` (Phase 2.5) — the AI Creator persona who
scripts\create-artist-account.ts:11: * BLOCKED until the `profiles_role_check` CHECK constraint is widened
scripts\create-artist-account.ts:15: *          (role = ANY (ARRAY['creator','studio','observer','client'])))
scripts\create-artist-account.ts:86:    if (profileErr.code === "23514" || profileErr.message.includes("profiles_role_check")) {
scripts\create-artist-account.ts:88:        `[artist-account] profiles_role_check rejected role='${ARTIST_ROLE}'. ` +
.yagi-autobuild\ARCHITECTURE.md:522:The `profiles.role` enum still carries `creator|studio|observer|client`
src\app\auth\callback\route.ts:68:  // handle_new_user DB trigger now guarantees a profiles row materialises
src\app\auth\callback\route.ts:71:  // role instead — the actual constraint that decides whether the user
src\app\api\health\google\route.ts:14:  // yagi_admin gate: check user_roles for role='yagi_admin' with workspace_id IS NULL
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:10:--   5. RLS policies (per §3.6 — using is_ws_member/is_ws_admin via projects join)
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:195:          OR public.is_yagi_admin((select auth.uid()))
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:211:          OR public.is_yagi_admin((select auth.uid()))
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:248:  USING (public.is_yagi_admin((select auth.uid())))
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:249:  WITH CHECK (public.is_yagi_admin((select auth.uid())));
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:265:          OR public.is_yagi_admin((select auth.uid()))
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:286:          OR public.is_yagi_admin((select auth.uid()))
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:307:          OR public.is_yagi_admin((select auth.uid()))
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:324:          OR public.is_yagi_admin((select auth.uid()))
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:337:    OR public.is_yagi_admin((select auth.uid()))
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:390:  v_is_yagi_admin boolean := false;
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:397:  v_is_yagi_admin := public.is_yagi_admin(v_caller);
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:399:  IF v_is_yagi_admin THEN
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:26:-- (auto-named profiles_role_check). Drop+recreate keeps the NULL-allowed
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:28:ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:29:ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:54:  'Phase 2.7 — company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:145:    OR public.is_yagi_admin((select auth.uid()))
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:157:      WHERE p.id = (select auth.uid()) AND p.role = 'client'
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:168:    OR public.is_yagi_admin((select auth.uid()))
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:172:    OR public.is_yagi_admin((select auth.uid()))
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:188:    OR public.is_yagi_admin((select auth.uid()))
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:195:-- validate_profile_role_transition trigger (§9) which prevents self-flipping
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:206:      WHERE p.id = (select auth.uid()) AND p.role = 'client'
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:235:  USING (public.is_yagi_admin((select auth.uid())))
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:236:  WITH CHECK (public.is_yagi_admin((select auth.uid())));
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:263:  v_is_admin := public.is_yagi_admin(v_caller);
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:313:--   1. UPDATE profiles SET role = 'client'
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:314:--   2. INSERT a clients row (passes clients_insert_self because role='client')
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:322:CREATE OR REPLACE FUNCTION public.validate_profile_role_transition()
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:337:  IF public.is_yagi_admin(v_caller) THEN
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:345:    IF NEW.role = 'client' AND OLD.role IS NOT NULL THEN
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:367:    IF OLD.role = 'client' AND NEW.role IS DISTINCT FROM 'client' THEN
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:378:REVOKE ALL ON FUNCTION public.validate_profile_role_transition() FROM PUBLIC;
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:380:DROP TRIGGER IF EXISTS validate_profile_role_transition_trigger
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:383:CREATE TRIGGER validate_profile_role_transition_trigger
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:386:  EXECUTE FUNCTION public.validate_profile_role_transition();
supabase\migrations\20260424040000_phase_2_5_g8_hardening_v3.sql:41:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
supabase\migrations\20260424030000_phase_2_5_g8_hardening_v2.sql:44:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:37:  USING (public.is_yagi_admin((select auth.uid())));
supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:53:  USING (public.is_yagi_admin((select auth.uid())));
supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:123:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
supabase\migrations\20260424000000_phase_2_5_g2_handle_history.sql:53:  USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:37:  USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:42:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:48:  USING (public.is_yagi_admin(auth.uid()))
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:49:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:53:  USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:61:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:67:  USING (public.is_yagi_admin(auth.uid()))
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:68:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:72:  USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:94:  IF public.is_yagi_admin(auth.uid()) THEN
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:11:--        trigger; admin bypasses via is_yagi_admin.
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:18:--        tightens UPDATE policies with role EXISTS + adds dual-role INSERT
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:58:  IF public.is_yagi_admin(auth.uid()) THEN
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:131:DROP POLICY IF EXISTS creators_update_self ON public.creators;
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:132:CREATE POLICY creators_update_self ON public.creators
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:138:      WHERE p.id = auth.uid() AND p.role = 'creator'
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:145:      WHERE p.id = auth.uid() AND p.role = 'creator'
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:149:DROP POLICY IF EXISTS studios_update_self ON public.studios;
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:150:CREATE POLICY studios_update_self ON public.studios
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:156:      WHERE p.id = auth.uid() AND p.role = 'studio'
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:163:      WHERE p.id = auth.uid() AND p.role = 'studio'
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:167:-- 3b. Dual-role INSERT block triggers (defense against race after RLS).
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:263:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:270:  USING (public.is_yagi_admin(auth.uid()))
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:272:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:279:  USING (public.is_yagi_admin(auth.uid()))
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:281:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260501140308_phase_4_x_handle_new_user_search_path_hardening.sql:3:-- transition_project_status / is_valid_transition / validate_profile_role_transition
supabase\migrations\20260501140308_phase_4_x_handle_new_user_search_path_hardening.sql:6:ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:27:--       role consistency EXISTS check. Prevents user with role='studio' from
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:67:  ADD COLUMN role text CHECK (role IS NULL OR role IN ('creator','studio','observer')),
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:69:  ADD COLUMN role_switched_at timestamptz,
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:105:-- Observer: no child table. profiles.role='observer' alone signals the role.
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:240:      WHERE p.id = auth.uid() AND p.role = 'creator'
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:244:CREATE POLICY creators_update_self ON public.creators
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:264:      WHERE p.id = auth.uid() AND p.role = 'studio'
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:268:CREATE POLICY studios_update_self ON public.studios
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:275:  FOR SELECT USING (state <> 'draft' OR public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:278:  FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:281:  FOR UPDATE USING (public.is_yagi_admin(auth.uid()))
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:282:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:285:  FOR DELETE USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:288:-- owner UPDATE until closed; admin read/update via is_yagi_admin.
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:299:      WHERE p.id = auth.uid() AND p.role IN ('creator','studio')
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:323:  FOR UPDATE USING (public.is_yagi_admin(auth.uid()))
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:324:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:345:  FOR ALL USING (public.is_yagi_admin(auth.uid()))
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:346:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:355:  FOR ALL USING (public.is_yagi_admin(auth.uid()))
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:356:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:1:-- Phase 4.x Wave C.5b amend_02 — widen profiles_role_check to include 'artist'.
supabase\migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:4:-- as Brand + Artist + YAGI Admin. The profiles_role_check CHECK constraint
supabase\migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:5:-- still only allowed creator/studio/observer/client. yagi visual review
supabase\migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:11:-- Scope: additive only. Existing rows (creator/studio/observer/client/NULL)
supabase\migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:22:  DROP CONSTRAINT IF EXISTS profiles_role_check;
supabase\migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:25:  ADD CONSTRAINT profiles_role_check CHECK (
supabase\migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:27:    (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
supabase\migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:14:-- Default role = 'client' since persona A = Brand-only active persona.
supabase\migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:19:CREATE OR REPLACE FUNCTION public.handle_new_user()
supabase\migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:76:  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
supabase\migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:81:-- user could call `SELECT public.handle_new_user(forged_record)` and try
supabase\migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:83:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
supabase\migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:84:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
supabase\migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:85:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:75:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:96:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:102:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:33:    public.is_ws_admin(auth.uid(), workspace_id)
supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:34:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:48:        AND public.is_yagi_admin(auth.uid())
supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:62:      public.is_ws_admin(auth.uid(), workspace_id)
supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:63:      OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:85:    AND public.is_yagi_admin(auth.uid())
supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:96:    AND public.is_yagi_admin(auth.uid())
supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:37:  v_is_admin := is_yagi_admin(v_caller_id);
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:41:  v_is_admin := is_yagi_admin(v_caller_id);
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:124:  v_is_admin := is_yagi_admin(v_caller_id);
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:202:  v_is_admin := is_yagi_admin(v_caller_id);
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:269:  v_is_admin := is_yagi_admin(v_caller_id);
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:322:  IF NOT is_yagi_admin(v_caller_id) AND NOT EXISTS (
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:371:    is_yagi_admin(auth.uid())
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:385:    is_yagi_admin(auth.uid())
supabase\migrations\20260422120000_phase_2_0_baseline.sql:151:-- Name: is_ws_admin(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
supabase\migrations\20260422120000_phase_2_0_baseline.sql:154:CREATE FUNCTION public.is_ws_admin(uid uuid, wsid uuid) RETURNS boolean
supabase\migrations\20260422120000_phase_2_0_baseline.sql:160:    where user_id = uid and workspace_id = wsid and role = 'admin'
supabase\migrations\20260422120000_phase_2_0_baseline.sql:178:-- Name: is_yagi_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
supabase\migrations\20260422120000_phase_2_0_baseline.sql:181:CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boolean
supabase\migrations\20260422120000_phase_2_0_baseline.sql:185:  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
supabase\migrations\20260422120000_phase_2_0_baseline.sql:1789:    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['creator'::text, 'workspace_admin'::text, 'workspace_member'::text, 'yagi_admin'::text]))),
supabase\migrations\20260422120000_phase_2_0_baseline.sql:1808:    CONSTRAINT workspace_invitations_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
supabase\migrations\20260422120000_phase_2_0_baseline.sql:1825:    CONSTRAINT workspace_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3715:CREATE POLICY brands_read ON public.brands FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3722:CREATE POLICY brands_write_admin ON public.brands TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3731:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3733:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3740:CREATE POLICY invoice_items_modify ON public.invoice_line_items USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3749:  WHERE ((i.id = invoice_line_items.invoice_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), i.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3768:CREATE POLICY invoices_hide_drafts_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (status <> 'draft'::text)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3775:CREATE POLICY invoices_hide_mocks_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (is_mock = false)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3782:CREATE POLICY invoices_insert ON public.invoices FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3789:CREATE POLICY invoices_select ON public.invoices FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3796:CREATE POLICY invoices_update ON public.invoices FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3811:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_admin(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3820:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_member(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3833:CREATE POLICY meetings_insert ON public.meetings FOR INSERT WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3840:CREATE POLICY meetings_select ON public.meetings FOR SELECT USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3847:CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3856:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3858:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3924:CREATE POLICY preprod_boards_delete ON public.preprod_boards FOR DELETE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3931:CREATE POLICY preprod_boards_insert ON public.preprod_boards FOR INSERT WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3938:CREATE POLICY preprod_boards_select ON public.preprod_boards FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3945:CREATE POLICY preprod_boards_update ON public.preprod_boards FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3954:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3963:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3965:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3992:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4001:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4010:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4019:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4021:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4030:  WHERE ((b.id = preprod_frame_reactions.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4066:  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4068:  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4077:  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4079:  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4116:CREATE POLICY projects_delete_yagi ON public.projects FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4123:CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4130:CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4137:CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4152:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4161:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4170:  WHERE ((s.id = showcase_media.showcase_id) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4181:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4194:CREATE POLICY showcases_delete_internal ON public.showcases FOR DELETE USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4201:CREATE POLICY showcases_insert_internal ON public.showcases FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4208:CREATE POLICY showcases_select_internal ON public.showcases FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4217:CREATE POLICY showcases_update_internal ON public.showcases FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4219:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id)))))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4221:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4234:CREATE POLICY supplier_profile_select ON public.supplier_profile FOR SELECT USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4241:CREATE POLICY supplier_profile_update ON public.supplier_profile FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4260:  WHERE ((m.id = team_channel_message_attachments.message_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4279:CREATE POLICY team_channel_messages_delete ON public.team_channel_messages FOR DELETE USING (((author_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4297:  WHERE ((c.id = team_channel_messages.channel_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4317:CREATE POLICY team_channels_insert ON public.team_channels FOR INSERT WITH CHECK ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4324:CREATE POLICY team_channels_select ON public.team_channels FOR SELECT USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4331:CREATE POLICY team_channels_update ON public.team_channels FOR UPDATE USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4338:CREATE POLICY thread_attachments_hide_internal_from_clients ON public.thread_message_attachments AS RESTRICTIVE FOR SELECT TO authenticated USING ((public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4355:  WHERE ((tm.id = thread_message_attachments.message_id) AND ((tm.author_id = auth.uid()) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4377:  WHERE ((tm.id = thread_message_attachments.message_id) AND public.is_ws_member(auth.uid(), p.workspace_id) AND ((tm.visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4393:  WHERE ((t.id = thread_messages.thread_id) AND public.is_ws_member(auth.uid(), p.workspace_id)))) AND ((visibility = 'shared'::text) OR ((visibility = 'internal'::text) AND public.is_yagi_admin(auth.uid())))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4400:CREATE POLICY thread_msgs_hide_internal_from_clients ON public.thread_messages AS RESTRICTIVE FOR SELECT TO authenticated USING (((visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()) OR (author_id = auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4410:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4413:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4433:CREATE POLICY user_roles_read_self ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4440:CREATE POLICY user_roles_self_insert_creator ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'creator'::text) AND (workspace_id IS NULL)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4447:CREATE POLICY user_roles_self_insert_ws_admin ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4454:CREATE POLICY user_roles_yagi_admin ON public.user_roles TO authenticated USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4486:CREATE POLICY ws_delete_yagi ON public.workspaces FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4493:CREATE POLICY ws_inv_read_admin ON public.workspace_invitations FOR SELECT TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4500:CREATE POLICY ws_inv_write_admin ON public.workspace_invitations TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4507:CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4514:CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4521:CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4523:  WHERE (m.workspace_id = workspace_members.workspace_id))))) OR public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4530:CREATE POLICY ws_read_members ON public.workspaces FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4537:CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4607:  WHERE ((objects.name = ANY (d.storage_paths)) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4626:CREATE POLICY "preprod-frames delete internal" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4628:  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_admin(auth.uid(), b.workspace_id)))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4635:CREATE POLICY "preprod-frames read internal" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4644:CREATE POLICY "preprod-frames write internal" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4646:  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_admin(auth.uid(), b.workspace_id)))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4655:  WHERE (((p.id)::text = (storage.foldername(objects.name))[1]) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4665:  WHERE ((pr.storage_path = objects.name) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4684:CREATE POLICY "showcase-media delete" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4691:CREATE POLICY "showcase-media read" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'showcase-media'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4701:CREATE POLICY "showcase-media update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4708:CREATE POLICY "showcase-media write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4715:CREATE POLICY "showcase-og delete" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4722:CREATE POLICY "showcase-og update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4729:CREATE POLICY "showcase-og write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4752:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4768:CREATE POLICY thread_attachments_objects_hide_internal ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING (((bucket_id <> 'thread-attachments'::text) OR public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:49:  v_is_admin := is_yagi_admin(v_caller_id);
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:144:  v_is_admin := is_yagi_admin(v_caller_id);
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:232:  v_is_admin := is_yagi_admin(v_caller_id);
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:309:  v_is_admin := is_yagi_admin(v_caller_id);
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:58:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:69:      public.is_ws_admin(auth.uid(), workspace_id)
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:72:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:75:    public.is_ws_admin(auth.uid(), workspace_id)
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:76:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:4:-- Finding: projects_insert policy WITH CHECK was (is_ws_admin OR is_yagi_admin)
supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:15:-- In prod today (2026-04-28) workspace_members only has role='admin' rows
supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:17:-- development. A real client (role='member' or 'viewer') would hit RLS
supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:32:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:38:  'project submissions. is_yagi_admin path preserved for admin console creates.';
supabase\migrations\20260429113853_phase_3_1_project_board.sql:47:    is_yagi_admin(auth.uid())
supabase\migrations\20260429113853_phase_3_1_project_board.sql:63:    is_yagi_admin(auth.uid())
supabase\migrations\20260429113853_phase_3_1_project_board.sql:75:    is_yagi_admin(auth.uid())
supabase\migrations\20260429113853_phase_3_1_project_board.sql:95:    is_yagi_admin(auth.uid())
supabase\migrations\20260429113853_phase_3_1_project_board.sql:166:  IF NOT is_yagi_admin(auth.uid()) THEN
supabase\migrations\20260429113853_phase_3_1_project_board.sql:193:  IF NOT is_yagi_admin(auth.uid()) THEN
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:21:--   'yagi_admin'      — user_roles.role = 'yagi_admin'
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:22:--   'workspace_admin' — user_roles.role = 'workspace_admin'
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:144:                                 CHECK (actor_role IN (
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:246:-- actor_role='client':
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:258:-- actor_role IN ('yagi_admin','workspace_admin'):
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:270:-- actor_role='system':
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:289:    WHEN actor_role = 'client' THEN
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:307:    WHEN actor_role IN ('yagi_admin','workspace_admin') THEN
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:321:    WHEN actor_role = 'system' THEN
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:350:--   yagi_admin  → actor_role = 'yagi_admin'
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:382:  v_is_yagi_admin      boolean;
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:383:  v_is_ws_admin        boolean;
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:394:  v_is_yagi_admin := public.is_yagi_admin(v_actor_id);
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:408:  v_is_ws_admin := EXISTS (
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:411:       AND role = 'workspace_admin'
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:416:  IF v_is_yagi_admin THEN
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:418:  ELSIF v_is_ws_admin THEN
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:426:  IF v_actor_role = 'client' AND v_actor_id <> v_created_by THEN
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:503:--   AND NOT is_yagi_admin(auth.uid())  -- yagi_admin admin console escape hatch
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:514:--   - yagi_admin: bypassed via is_yagi_admin() check for emergency fixes.
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:539:  IF public.is_yagi_admin(auth.uid()) THEN
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:584:  USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:628:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:702:      public.is_ws_admin(auth.uid(), workspace_id)
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:706:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:716:      public.is_ws_admin(auth.uid(), workspace_id)
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:720:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260428070000_phase_2_8_6_review_loop_2.sql:33:  USING (public.is_yagi_admin(auth.uid()))
supabase\migrations\20260428070000_phase_2_8_6_review_loop_2.sql:34:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:41:--   gains an is_yagi_admin guard in the same review loop.)
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:88:    public.is_ws_admin(auth.uid(), workspace_id)
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:89:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:97:    public.is_ws_admin(auth.uid(), workspace_id)
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:98:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:113:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:116:      AND NOT public.is_ws_admin(auth.uid(), workspace_id)
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:135:          public.is_yagi_admin(auth.uid())
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:138:            AND NOT public.is_ws_admin(auth.uid(), t.workspace_id)
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:151:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:155:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:178:     AND NOT public.is_yagi_admin(auth.uid())
supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:67:  v_is_admin := public.is_yagi_admin(v_caller);
supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:120:  IF NOT public.is_yagi_admin(v_caller) THEN
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:87:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:89:    OR public.is_ws_admin(auth.uid(), workspace_id)
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:96:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:108:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:112:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:126:          public.is_yagi_admin(auth.uid())
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:128:          OR public.is_ws_admin(auth.uid(), t.workspace_id)
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:143:          public.is_yagi_admin(auth.uid())
supabase\migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:18:-- default in supabase). Explicit auth check via is_ws_member / is_yagi_admin
supabase\migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:72:    public.is_yagi_admin(v_caller)
supabase\migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:110:  'DEFINER with explicit is_ws_member / is_yagi_admin authorization mirroring '
supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:80:    public.is_ws_admin(auth.uid(), workspace_id)
supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:81:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:96:    public.is_ws_admin(auth.uid(), workspace_id)
supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:97:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:104:    public.is_ws_admin(auth.uid(), workspace_id)
supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:105:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:10:--     (is_ws_admin(...) OR is_yagi_admin(...))
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:21:--   is_ws_member / is_yagi_admin without checking projects.deleted_at.
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:40:      public.is_ws_admin(auth.uid(), workspace_id)
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:43:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:47:      public.is_ws_admin(auth.uid(), workspace_id)
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:50:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:97:    public.is_yagi_admin(v_caller)
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:103:  IF v_deleted_at IS NOT NULL AND NOT public.is_yagi_admin(v_caller) THEN
src\lib\team-channels\queries.ts:201:    supabase.rpc("is_yagi_admin", { uid: userId }),
src\lib\team-channels\queries.ts:202:    supabase.rpc("is_ws_admin", {
src\lib\supabase\database.types.ts:1171:          role_switched_at: string | null
src\lib\supabase\database.types.ts:1186:          role_switched_at?: string | null
src\lib\supabase\database.types.ts:1201:          role_switched_at?: string | null
src\lib\supabase\database.types.ts:2664:      is_ws_admin: { Args: { uid: string; wsid: string }; Returns: boolean }
src\lib\supabase\database.types.ts:2666:      is_yagi_admin: { Args: { uid: string }; Returns: boolean }
.yagi-autobuild\archive\transient\checkpoint.md:46:- `refs_insert` policy dropped → `refs_insert_authorized` created (path-prefix + `is_ws_member` / `is_yagi_admin`)
.yagi-autobuild\archive\transient\checkpoint.md:58:- Helper signatures: `is_ws_member(uid uuid, wsid uuid)`, `is_yagi_admin(uid uuid)`, `is_ws_admin(uid uuid, wsid uuid)`
src\app\[locale]\app\team\[slug]\actions.ts:291:    supabase.rpc("is_yagi_admin", { uid: user.id }),
src\app\[locale]\app\team\[slug]\actions.ts:292:    supabase.rpc("is_ws_admin", {
src\app\[locale]\app\team\[slug]\actions.ts:561:      const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\support\actions.ts:144:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\lib\commission\actions.ts:96:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\YAGI-MANUAL-QA-QUEUE.md:104:- **Target**: `/challenges/test-open-1/submit` with `role='creator'` on yagi-admin or a test creator account.
src\app\[locale]\app\showcases\[id]\page.tsx:46:  const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\showcases\[id]\page.tsx:51:    const { data: wsAdmin } = await supabase.rpc("is_ws_admin", {
src\lib\onboarding\role-redirects.ts:4:// creator/studio/observer/client personae. Phase 4.x locks persona A
src\app\[locale]\app\showcases\page.tsx:65:  const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\showcases\actions.ts:72:  const { data } = await supabase.rpc("is_yagi_admin", { uid: userId });
src\app\[locale]\app\showcases\actions.ts:96:  const { data } = await supabase.rpc("is_ws_admin", {
src\app\[locale]\app\meetings\request-actions.ts:100:  const { data } = await supabase.rpc("is_yagi_admin", { uid });
src\app\[locale]\app\meetings\new\page.tsx:55:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:139:    supabase.rpc("is_ws_admin", { uid, wsid: workspaceId }),
src\app\[locale]\app\meetings\actions.ts:140:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:350:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
src\app\[locale]\app\meetings\actions.ts:351:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:411:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
src\app\[locale]\app\meetings\actions.ts:412:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:631:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
src\app\[locale]\app\meetings\actions.ts:632:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:735:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
src\app\[locale]\app\meetings\actions.ts:736:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:807:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
src\app\[locale]\app\meetings\actions.ts:808:    supabase.rpc("is_yagi_admin", { uid }),
src\components\challenges\header-cta-resolver.tsx:29:  // Check is_yagi_admin via user_roles table
.yagi-autobuild\archive\phase-2-shipped\snapshots\phase-1-9\schema-snapshot.md:32:| `is_ws_admin` | `uid uuid, wsid uuid` | boolean | DEFINER |
.yagi-autobuild\archive\phase-2-shipped\snapshots\phase-1-9\schema-snapshot.md:34:| `is_yagi_admin` | `uid uuid` | boolean | DEFINER |
src\app\[locale]\app\invoices\[id]\line-item-actions.ts:46:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\invoices\[id]\actions.ts:42:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\invoices\[id]\actions.ts:213:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\invoices\[id]\actions.ts:254:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\invoices\actions.ts:31:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\projects\[id]\actions.ts:127:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\lib\app\context.ts:19:export type ProfileRole = "creator" | "studio" | "observer" | "client" | "artist";
src\app\[locale]\app\projects\new\actions.ts:652://   2. INSERT project_status_history with actor_role='system' — MUST bypass
src\app\[locale]\app\projects\new\actions.ts:875:  // 2. INSERT project_status_history with actor_role='system'.
src\app\[locale]\app\admin\trash\page.tsx:36:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\preprod\[id]\page.tsx:30:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\preprod\new\page.tsx:29:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\admin\support\page.tsx:35:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
src\app\[locale]\app\preprod\[id]\actions.ts:733:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\preprod\[id]\actions.ts:748:  const { data: isAdmin } = await supabase.rpc("is_ws_admin", {
src\app\[locale]\app\preprod\page.tsx:60:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\archive\migrations-pre-2-0\20260421173130_phase_1_5_invoicing_20260422.sql:131:  using (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260421173130_phase_1_5_invoicing_20260422.sql:133:  using (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\migrations-pre-2-0\20260421173130_phase_1_5_invoicing_20260422.sql:134:  with check (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260421173130_phase_1_5_invoicing_20260422.sql:139:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\archive\migrations-pre-2-0\20260421173130_phase_1_5_invoicing_20260422.sql:143:  with check (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260421173130_phase_1_5_invoicing_20260422.sql:145:  using (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\migrations-pre-2-0\20260421173130_phase_1_5_invoicing_20260422.sql:146:  with check (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260421173130_phase_1_5_invoicing_20260422.sql:151:  using (public.is_yagi_admin(auth.uid()) or status <> 'draft');
.yagi-autobuild\archive\migrations-pre-2-0\20260421173130_phase_1_5_invoicing_20260422.sql:156:  using (public.is_yagi_admin(auth.uid()) or is_mock = false);
.yagi-autobuild\archive\migrations-pre-2-0\20260421173130_phase_1_5_invoicing_20260422.sql:165:          public.is_yagi_admin(auth.uid())
.yagi-autobuild\archive\migrations-pre-2-0\20260421173130_phase_1_5_invoicing_20260422.sql:171:  using (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\migrations-pre-2-0\20260421173130_phase_1_5_invoicing_20260422.sql:172:  with check (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:51:  role text not null check (role in ('creator', 'workspace_admin', 'workspace_member', 'yagi_admin')),
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:65:  role text not null check (role in ('admin', 'member')),
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:79:  role text not null check (role in ('admin', 'member')),
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:213:create or replace function public.is_yagi_admin(uid uuid) returns boolean
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:215:  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:223:create or replace function public.is_ws_admin(uid uuid, wsid uuid) returns boolean
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:227:    where user_id = uid and workspace_id = wsid and role = 'admin'
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:256:  using (user_id = auth.uid() or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:258:  with check (user_id = auth.uid() and role = 'creator' and workspace_id is null);
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:261:    user_id = auth.uid() and role = 'workspace_admin' and workspace_id is not null
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:262:    and public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:265:  using (public.is_yagi_admin(auth.uid())) with check (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:270:  using (public.is_ws_member(auth.uid(), id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:273:  using (public.is_ws_admin(auth.uid(), id) or public.is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:274:  with check (public.is_ws_admin(auth.uid(), id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:276:  using (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:281:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:283:  using (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:284:  with check (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:289:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:292:    (user_id = auth.uid() and role = 'admin'
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:294:    or public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:295:    or public.is_yagi_admin(auth.uid())
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:298:  using (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:303:  using (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:305:  using (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:306:  with check (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:311:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:313:  with check (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:315:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:316:  with check (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:318:  using (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:324:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:326:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:330:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:332:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:336:    where t.id = thread_id and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:338:    where t.id = thread_id and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:341:  using (visibility = 'shared' or public.is_yagi_admin(auth.uid()) or author_id = auth.uid());
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:345:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:347:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:351:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:353:    and (public.is_ws_admin(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:356:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:358:  using (public.is_yagi_admin(auth.uid())) with check (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:386:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\migrations-pre-2-0\20260421094855_phase1_schema.sql:395:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\migrations-pre-2-0\20260422010000_phase_1_7_team_channels.sql:101:    and (is_ws_member(auth.uid(), workspace_id) or is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\migrations-pre-2-0\20260422010000_phase_1_7_team_channels.sql:108:    and (is_ws_admin(auth.uid(), workspace_id) or is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\migrations-pre-2-0\20260422010000_phase_1_7_team_channels.sql:115:    and (is_ws_admin(auth.uid(), workspace_id) or is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\migrations-pre-2-0\20260422010000_phase_1_7_team_channels.sql:126:        and (is_ws_member(auth.uid(), c.workspace_id) or is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\migrations-pre-2-0\20260422010000_phase_1_7_team_channels.sql:156:        and (is_ws_member(auth.uid(), c.workspace_id) or is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\migrations-pre-2-0\20260422070000_phase_1_7_team_chat_fixups.sql:20:    or is_yagi_admin(auth.uid())
.yagi-autobuild\archive\migrations-pre-2-0\20260422100000_phase_1_9_showcases.sql:81:    is_yagi_admin(auth.uid())
.yagi-autobuild\archive\migrations-pre-2-0\20260422100000_phase_1_9_showcases.sql:92:  with check (is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260422100000_phase_1_9_showcases.sql:98:    is_yagi_admin(auth.uid())
.yagi-autobuild\archive\migrations-pre-2-0\20260422100000_phase_1_9_showcases.sql:102:        and is_ws_admin(auth.uid(), p.workspace_id)
.yagi-autobuild\archive\migrations-pre-2-0\20260422100000_phase_1_9_showcases.sql:109:  using (is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\20260422100000_phase_1_9_showcases.sql:119:          is_yagi_admin(auth.uid())
.yagi-autobuild\archive\migrations-pre-2-0\20260422100000_phase_1_9_showcases.sql:136:        and is_yagi_admin(auth.uid())
.yagi-autobuild\archive\migrations-pre-2-0\20260422100000_phase_1_9_showcases.sql:147:        and is_yagi_admin(auth.uid())
.yagi-autobuild\archive\migrations-pre-2-0\20260422100000_phase_1_9_showcases.sql:158:        and is_yagi_admin(auth.uid())
.yagi-autobuild\archive\migrations-pre-2-0\20260422100000_phase_1_9_showcases.sql:183:      is_yagi_admin(auth.uid())
.yagi-autobuild\archive\migrations-pre-2-0\20260422100000_phase_1_9_showcases.sql:199:    and is_yagi_admin(auth.uid())
.yagi-autobuild\archive\migrations-pre-2-0\20260422100000_phase_1_9_showcases.sql:207:    and is_yagi_admin(auth.uid())
.yagi-autobuild\archive\migrations-pre-2-0\20260422100000_phase_1_9_showcases.sql:215:    and is_yagi_admin(auth.uid())
.yagi-autobuild\archive\migrations-pre-2-0\20260422100000_phase_1_9_showcases.sql:225:    and is_yagi_admin(auth.uid())
.yagi-autobuild\archive\migrations-pre-2-0\20260422100000_phase_1_9_showcases.sql:233:    and is_yagi_admin(auth.uid())
.yagi-autobuild\archive\migrations-pre-2-0\20260422100000_phase_1_9_showcases.sql:241:    and is_yagi_admin(auth.uid())
.yagi-autobuild\archive\phase-2-shipped\phase-2-8\_codex_g_b_1_loop2_prompt.md:31:  - Does the early-return "IF v_is_yagi_admin THEN RETURN NEW" open any
.yagi-autobuild\archive\phase-2-shipped\phase-2-8\_codex_g_b_1_loop2_prompt.md:34:    coerce v_is_yagi_admin to true.)
src\app\[locale]\app\admin\commissions\[id]\page.tsx:29:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\commissions\[id]\actions.ts:56:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\commissions\page.tsx:39:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-4-x\_wave_c5b_sub10_db_audit.md:5:**Audit query**: `SELECT id, handle, display_name, role, locale, created_at FROM public.profiles WHERE role IN ('creator','studio')`
.yagi-autobuild\phase-4-x\_wave_c5b_sub10_db_audit.md:12:| `profiles.role = 'creator'` | **1** |
.yagi-autobuild\phase-4-x\_wave_c5b_sub10_db_audit.md:13:| `profiles.role = 'studio'` | 0 |
.yagi-autobuild\phase-4-x\_wave_c5b_sub10_db_audit.md:33:sub_02; the row's `role='creator'` value now points at a persona
.yagi-autobuild\phase-4-x\_wave_c5b_sub10_db_audit.md:43:2. `profiles.role = 'creator'` carries no functional consequence in
.yagi-autobuild\phase-4-x\_wave_c5b_sub10_db_audit.md:55:UPDATE public.profiles SET role = 'client' WHERE id = '73be213d-1306-42f1-bee4-7b77175a6e79';
.yagi-autobuild\phase-4-x\_wave_c5b_sub10_db_audit.md:74:applied via service-role (validate_profile_role_transition trigger
.yagi-autobuild\phase-4-x\_wave_c5b_sub10_db_audit.md:79:SET role = 'client', updated_at = now()
.yagi-autobuild\phase-4-x\_wave_c5b_sub10_db_audit.md:83:-- → 1 row updated. role='client', updated_at='2026-05-01 10:12:33+00'
.yagi-autobuild\phase-4-x\_wave_c5b_sub10_db_audit.md:100:- The `creators_update_self` RLS policy now denies the row owner
.yagi-autobuild\phase-4-x\_wave_c5b_result.md:131:1 row in `public.profiles` with `role='creator'` — clearly a test
.yagi-autobuild\phase-4-x\_wave_c5b_result.md:134:workspace="wefewfef"). 0 rows with `role='studio'`. No DB write
.yagi-autobuild\phase-4-x\_wave_c5b_result.md:156:`profiles_role_check` constraint allows `{creator, studio,
.yagi-autobuild\phase-4-x\_wave_c5b_result.md:157:observer, client}` only — no `'artist'`. The Wave C.5b prompt's
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:17:| 02a | profiles_role_check widened to include 'artist' | `e0400d4` | ✅ migration applied; constraint includes 'artist'; ProfileRole TS type extended; sidebar switch case added |
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:30:auth.users INSERT now triggers `public.handle_new_user()` SECURITY
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:65:Pulled forward from Phase 5 entry. `profiles_role_check` widened to
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:100:2. `handle_new_user` AFTER INSERT → profile inserted role='client', handle='c_<md5>'
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:101:3. Script's service-role upsert → ON CONFLICT (id) UPDATE → role='artist', handle='artist_demo_2d6a3f'
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:102:4. `validate_profile_role_transition` short-circuits at `auth.uid() IS NULL` (service-role context)
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:110:Re-audit confirmed only 1 row with `role IN ('creator','studio')`:
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:117:SET role = 'client', updated_at = now()
.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:187:      row was auto-created (handle `c_<md5>`, role='client',
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:441:1. `profiles` 의 `role='creator'` 또는 `role='studio'` rows 식별
.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:581:- profiles.role = 'artist' (또는 enum 미정 시 야기 보고)
.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:100:- `handle_new_user()` SECURITY DEFINER trigger function
.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:101:- handle = 'c_<8-char-md5>', display_name = email local part, role = 'client', locale = 'ko' default
.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:119:- pg_proc 의 handle_new_user 존재
.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:136:- ALTER profiles_role_check: 기존 ['creator', 'studio', 'observer', 'client'] + 'artist' 추가
.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:165:- `feat(phase-4-x): wave-c5b amend_02a — widen profiles_role_check to include 'artist'`
.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:175:- yonsei (UUID 73be213d-1306-42f1-bee4-7b77175a6e79) role='client'
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:45:- 야기 manual 조치: yout40204020@gmail.com 의 profile SQL INSERT 직접 (handle='c_a2df55bf', role='client')
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:59:-- Default role = 'client' since persona A = Brand-only active persona.
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:63:CREATE OR REPLACE FUNCTION public.handle_new_user()
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:107:  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:112:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:113:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:114:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:161:- `SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';` → 1 row
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:171:  - role = 'client'
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:216:-- Phase 4.x Wave C.5b amend_02 — widen profiles_role_check to include 'artist'
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:226:  DROP CONSTRAINT IF EXISTS profiles_role_check;
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:229:  ADD CONSTRAINT profiles_role_check CHECK (
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:231:    (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:273:WHERE conname = 'profiles_role_check';
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:280:-- 'creator' / 'studio' / 'observer' / 'client' / NULL 분포 확인
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:297:-- role='artist', display_name='Artist Demo', handle='artist_demo_<6char>'
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:311:- artist@yagiworkshop.xyz 계정 생성 + email_confirmed + role='artist'
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:316:- `feat(phase-4-x): wave-c5b amend_02a — widen profiles_role_check to include 'artist'`
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:324:- yout40204020@yonsei.ac.kr (user_id=73be213d-1306-42f1-bee4-7b77175a6e79) profiles.role = 'creator'
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:336:WHERE role IN ('creator', 'studio')
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:342:옵션 A (권장): role = 'client'
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:349:SET role = 'client', updated_at = now()
.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:368:- yonsei 계정 role='client'
src\app\[locale]\app\admin\challenges\[slug]\judge\actions.ts:14:  const { data } = await supabase.rpc("is_yagi_admin", { uid: userId });
.yagi-autobuild\phase-4-x\_run.log:75:2026-05-01T07:30Z sub_13 HALTED on profiles_role_check missing 'artist' enum value — Phase 5 entry migration prerequisite per yagi spec
.yagi-autobuild\phase-4-x\_artist_account_created.md:4:after Wave C.5b amend_02 widened `profiles_role_check` to include
.yagi-autobuild\phase-4-x\_artist_account_created.md:20:`profiles_role_check` constraint reads:
.yagi-autobuild\phase-4-x\_artist_account_created.md:24:       (role = ANY (ARRAY['creator','studio','observer','client','artist'])))
.yagi-autobuild\phase-4-x\_artist_account_created.md:52:This account exercises the `handle_new_user` (amend_01) ↔ sub_13
.yagi-autobuild\phase-4-x\_artist_account_created.md:57:2. `handle_new_user` AFTER INSERT trigger fires → profile row
.yagi-autobuild\phase-4-x\_artist_account_created.md:58:   inserted with `role='client'` (default per persona A),
.yagi-autobuild\phase-4-x\_artist_account_created.md:65:4. `validate_profile_role_transition` trigger fires on the UPDATE
.yagi-autobuild\phase-4-x\_artist_account_created.md:70:Net result: account is `role='artist'` end-to-end with the
.yagi-autobuild\phase-4-x\_amend02_self_review.md:14:- **Surface**: `DROP CONSTRAINT IF EXISTS profiles_role_check; ADD CONSTRAINT
.yagi-autobuild\phase-4-x\_amend02_self_review.md:15:  ... CHECK ((role IS NULL) OR (role = ANY (ARRAY['creator','studio',
.yagi-autobuild\phase-4-x\_amend02_self_review.md:16:  'observer','client','artist'])))`.
.yagi-autobuild\phase-4-x\_amend02_self_review.md:20:  - `role = 'creator'` — 1 row (yonsei test account). Passes new CHECK.
.yagi-autobuild\phase-4-x\_amend02_self_review.md:21:  - `role = 'client'` — 1 row (yout40204020). Passes.
.yagi-autobuild\phase-4-x\_amend02_self_review.md:23:  - `role = 'studio' / 'observer' / 'artist'` — 0 rows. Trivially ok.
.yagi-autobuild\phase-4-x\_amend02_self_review.md:33:- **Surface**: `creators_update_self`, `studios_update_self` policies
.yagi-autobuild\phase-4-x\_amend02_self_review.md:34:  filter by `p.role = 'creator'` / `p.role = 'studio'` literals.
.yagi-autobuild\phase-4-x\_amend02_self_review.md:39:  row matches `p.role = 'creator'` (it doesn't). Phase 5 will likely
.yagi-autobuild\phase-4-x\_amend02_self_review.md:40:  introduce an `artists_update_self` policy with `p.role = 'artist'`
.yagi-autobuild\phase-4-x\_amend02_self_review.md:44:### F3 — handle_new_user (amend_01) interaction
.yagi-autobuild\phase-4-x\_amend02_self_review.md:47:  `role = 'client'` (literal). Wide enum changes nothing for the
.yagi-autobuild\phase-4-x\_amend02_self_review.md:54:### F4 — `validate_profile_role_transition` semantics on artist UPSERT
.yagi-autobuild\phase-4-x\_amend02_self_review.md:60:  fires on the row that handle_new_user just created (role='client'),
.yagi-autobuild\phase-4-x\_amend02_self_review.md:61:  does the trigger reject the UPDATE to role='artist'?
.yagi-autobuild\phase-4-x\_amend02_self_review.md:74:  2. `handle_new_user` AFTER INSERT trigger fires → `profiles` row
.yagi-autobuild\phase-4-x\_amend02_self_review.md:75:     created with `role='client'`, `display_name='artist'` (email
.yagi-autobuild\phase-4-x\_amend02_self_review.md:94:  `export type ProfileRole = "creator" | "studio" | "observer" | "client";`
.yagi-autobuild\phase-4-x\_amend02_self_review.md:122:  layer on top of `role='artist'` already being valid. The enum
.yagi-autobuild\phase-4-x\_amend02_self_review.md:126:### F8 — `is_yagi_admin` / `is_ws_admin` interaction
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:22:This migration widens the profiles_role_check CHECK constraint to include the value 'artist' in addition to the prior allowlist (creator/studio/observer/client). Rationale: pulled forward from Phase 5 entry to unblock the demo Artist account in Wave C.5b sub_13 / amend_02b. The migration is ALREADY APPLIED to prod (jvamvbpxnztynsccvcmr) and the demo account artist@yagiworkshop.xyz is live with role='artist'.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:28:4. Audit RLS policies for any role-string consumer that treats the enum as closed-world (look for hard-coded literal lists). Also check `creators_update_self`, `studios_update_self`, `validate_profile_role_transition` — does adding 'artist' open an unintended path?
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:29:5. Read scripts/create-artist-account.ts — the upsert ordering after the trigger creates role='client' first; does the script's UPDATE survive validate_profile_role_transition without the service-role bypass being load-bearing in unexpected ways?
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:34:B. RLS / policy implicit dependence on the enum closed-world (creators_update_self, studios_update_self, anything else).
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:35:C. validate_profile_role_transition interaction — does the artist UPSERT exercise an edge that the function doesn't anticipate?
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:36:D. handle_new_user (amend_01) interaction — sequencing, trigger order, accidental double-write.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:39:G. is_yagi_admin / is_ws_admin / role_switched_at handling — independent of profiles.role enum but verify.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:74:-- Phase 4.x Wave C.5b amend_02 ??widen profiles_role_check to include 'artist'.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:77:-- as Brand + Artist + YAGI Admin. The profiles_role_check CHECK constraint
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:78:-- still only allowed creator/studio/observer/client. yagi visual review
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:84:-- Scope: additive only. Existing rows (creator/studio/observer/client/NULL)
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:95:  DROP CONSTRAINT IF EXISTS profiles_role_check;
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:98:  ADD CONSTRAINT profiles_role_check CHECK (
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:100:    (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:234: * BLOCKED until the `profiles_role_check` CHECK constraint is widened
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:238: *          (role = ANY (ARRAY['creator','studio','observer','client'])))
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:309:    if (profileErr.code === "23514" || profileErr.message.includes("profiles_role_check")) {
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:311:        `[artist-account] profiles_role_check rejected role='${ARTIST_ROLE}'. ` +
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:456:export type ProfileRole = "creator" | "studio" | "observer" | "client" | "artist";
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:551:- **Surface**: `DROP CONSTRAINT IF EXISTS profiles_role_check; ADD CONSTRAINT
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:552:  ... CHECK ((role IS NULL) OR (role = ANY (ARRAY['creator','studio',
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:553:  'observer','client','artist'])))`.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:557:  - `role = 'creator'` ??1 row (yonsei test account). Passes new CHECK.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:558:  - `role = 'client'` ??1 row (yout40204020). Passes.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:560:  - `role = 'studio' / 'observer' / 'artist'` ??0 rows. Trivially ok.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:570:- **Surface**: `creators_update_self`, `studios_update_self` policies
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:571:  filter by `p.role = 'creator'` / `p.role = 'studio'` literals.
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:576:  row matches `p.role = 'creator'` (it doesn't). Phase 5 will likely
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:577:  introduce an `artists_update_self` policy with `p.role = 'artist'`
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:581:### F3 ??handle_new_user (amend_01) interaction
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:584:  `role = 'client'` (literal). Wide enum changes nothing for the
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:591:### F4 ??`validate_profile_role_transition` semantics on artist UPSERT
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:597:  fires on the row that handle_new_user just created (role='client'),
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:598:  does the trigger reject the UPDATE to role='artist'?
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:611:  2. `handle_new_user` AFTER INSERT trigger fires ??`profiles` row
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:612:     created with `role='client'`, `display_name='artist'` (email
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:631:  `export type ProfileRole = "creator" | "studio" | "observer" | "client";`
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:659:  layer on top of `role='artist'` already being valid. The enum
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:663:### F8 ??`is_yagi_admin` / `is_ws_admin` interaction
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:715:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"profiles_role_check|validate_profile_role_transition|creators_update_self|studios_update_self|handle_new_user|is_yagi_admin|is_ws_admin|role_switched_at|role\\s*=\\s*ANY|ARRAY\\['creator'|creator.*studio.*observer.*client|observer.*client|role\\s+in|role IN|role='|role = '\" supabase src scripts .yagi-autobuild docs -g '"'!node_modules'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:717:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"case \\\"creator\\\"|case 'creator'|switch \\(["'^'"\\n]*role|ProfileRole|z\\.enum\\(|enum\\(.*role|roleSchema|role.*zod|\\\"creator\\\"\\s*,\\s*\\\"studio\\\"|creator\\|studio|creator.*studio.*observer.*client|client.*observer\" src scripts supabase -g '"'!node_modules'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:719:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"artist|profiles_role_check|Phase 5|Artist Roster|FU-C5b-01|curated Artist\" supabase/migrations docs .yagi-autobuild scripts src -g '"'!node_modules'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:726:rg: \([^\n]*role|ProfileRole|z\.enum\(|enum\(.*role|roleSchema|role.*zod|\creator\\s*,\s*\studio\|creator\|studio|creator.*studio.*observer.*client|client.*observer src scripts supabase -g !node_modules: 지정된 경로를 찾을 수 없습니다. (os error 3)
.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:730:rg: \([^\n]*role|ProfileRole|z\.enum\(|enum\(.*role|roleSchema|role.*zod|\creator\\s*,\s*\studio\|creator\|studio|creator.*studio.*observer.*client|client.*observer src scripts supabase -g !node_modules: 지정된 경로를 찾을 수 없습니다. (os error 3)
.yagi-autobuild\phase-4-x\_amend02_codex_prompt.txt:10:This migration widens the profiles_role_check CHECK constraint to include the value 'artist' in addition to the prior allowlist (creator/studio/observer/client). Rationale: pulled forward from Phase 5 entry to unblock the demo Artist account in Wave C.5b sub_13 / amend_02b. The migration is ALREADY APPLIED to prod (jvamvbpxnztynsccvcmr) and the demo account artist@yagiworkshop.xyz is live with role='artist'.
.yagi-autobuild\phase-4-x\_amend02_codex_prompt.txt:16:4. Audit RLS policies for any role-string consumer that treats the enum as closed-world (look for hard-coded literal lists). Also check `creators_update_self`, `studios_update_self`, `validate_profile_role_transition` — does adding 'artist' open an unintended path?
.yagi-autobuild\phase-4-x\_amend02_codex_prompt.txt:17:5. Read scripts/create-artist-account.ts — the upsert ordering after the trigger creates role='client' first; does the script's UPDATE survive validate_profile_role_transition without the service-role bypass being load-bearing in unexpected ways?
.yagi-autobuild\phase-4-x\_amend02_codex_prompt.txt:22:B. RLS / policy implicit dependence on the enum closed-world (creators_update_self, studios_update_self, anything else).
.yagi-autobuild\phase-4-x\_amend02_codex_prompt.txt:23:C. validate_profile_role_transition interaction — does the artist UPSERT exercise an edge that the function doesn't anticipate?
.yagi-autobuild\phase-4-x\_amend02_codex_prompt.txt:24:D. handle_new_user (amend_01) interaction — sequencing, trigger order, accidental double-write.
.yagi-autobuild\phase-4-x\_amend02_codex_prompt.txt:27:G. is_yagi_admin / is_ws_admin / role_switched_at handling — independent of profiles.role enum but verify.
.yagi-autobuild\phase-4-x\_amend01_test_log.md:14:| `pg_proc` has `handle_new_user` | ✅ 1 row |
.yagi-autobuild\phase-4-x\_amend01_test_log.md:19:| security advisor regression introduced by handle_new_user | ✅ 0 (REVOKE EXECUTE suppresses anon/authenticated SECURITY-DEFINER lints; SET search_path suppresses search-path-mutable lint) |
.yagi-autobuild\phase-4-x\_amend01_self_review.md:90:- **Question**: if `handle_new_user` raises, does `auth.users INSERT`
.yagi-autobuild\phase-4-x\_amend01_self_review.md:103:- **Surface**: `REVOKE EXECUTE ON FUNCTION public.handle_new_user()
.yagi-autobuild\phase-4-x\_amend01_self_review.md:109:  blocks direct calls (`SELECT public.handle_new_user(forged_row)` from
.yagi-autobuild\phase-4-x\_amend01_self_review.md:117:- **Surface**: `INSERT ... role='client'`.
.yagi-autobuild\phase-4-x\_amend01_self_review.md:122:  via service-role admin) inserts/upserts with `role='artist'`
.yagi-autobuild\phase-4-x\_amend01_self_review.md:126:  2. Trigger fires → profile row inserted with role='client' (default)
.yagi-autobuild\phase-4-x\_amend01_self_review.md:141:  Supabase pattern for `handle_new_user`-style triggers (it's exactly
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:550:ALTER TABLE ONLY public.user_roles                       ADD CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['creator'::text, 'workspace_admin'::text, 'workspace_member'::text, 'yagi_admin'::text])));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:553:ALTER TABLE ONLY public.workspace_invitations            ADD CONSTRAINT workspace_invitations_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:556:ALTER TABLE ONLY public.workspace_members                ADD CONSTRAINT workspace_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:726:CREATE OR REPLACE FUNCTION public.is_ws_admin(uid uuid, wsid uuid)
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:734:    where user_id = uid and workspace_id = wsid and role = 'admin'
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:747:CREATE OR REPLACE FUNCTION public.is_yagi_admin(uid uuid)
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:753:  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:950:CREATE POLICY brands_read ON public.brands FOR SELECT TO authenticated USING ((is_ws_member(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:951:CREATE POLICY brands_write_admin ON public.brands FOR ALL TO authenticated USING ((is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid()))) WITH CHECK ((is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:954:CREATE POLICY invoice_items_modify ON public.invoice_line_items FOR ALL USING (is_yagi_admin(auth.uid())) WITH CHECK (is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:955:CREATE POLICY invoice_items_select ON public.invoice_line_items FOR SELECT USING ((EXISTS ( SELECT 1 FROM invoices i WHERE ((i.id = invoice_line_items.invoice_id) AND (is_yagi_admin(auth.uid()) OR is_ws_member(auth.uid(), i.workspace_id))))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:958:CREATE POLICY invoices_hide_drafts_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((is_yagi_admin(auth.uid()) OR (status <> 'draft'::text)));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:959:CREATE POLICY invoices_hide_mocks_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((is_yagi_admin(auth.uid()) OR (is_mock = false)));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:960:CREATE POLICY invoices_insert ON public.invoices FOR INSERT WITH CHECK (is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:961:CREATE POLICY invoices_select ON public.invoices FOR SELECT USING ((is_yagi_admin(auth.uid()) OR is_ws_member(auth.uid(), workspace_id)));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:962:CREATE POLICY invoices_update ON public.invoices FOR UPDATE USING (is_yagi_admin(auth.uid())) WITH CHECK (is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:965:CREATE POLICY meeting_attendees_insert ON public.meeting_attendees FOR INSERT WITH CHECK ((EXISTS ( SELECT 1 FROM meetings m WHERE ((m.id = meeting_attendees.meeting_id) AND (is_ws_admin(auth.uid(), m.workspace_id) OR is_yagi_admin(auth.uid()))))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:966:CREATE POLICY meeting_attendees_select ON public.meeting_attendees FOR SELECT USING ((EXISTS ( SELECT 1 FROM meetings m WHERE ((m.id = meeting_attendees.meeting_id) AND (is_ws_member(auth.uid(), m.workspace_id) OR is_yagi_admin(auth.uid()))))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:969:CREATE POLICY meetings_insert ON public.meetings FOR INSERT WITH CHECK ((is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:970:CREATE POLICY meetings_select ON public.meetings FOR SELECT USING ((is_ws_member(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:971:CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING ((is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:986:CREATE POLICY preprod_boards_delete ON public.preprod_boards FOR DELETE USING ((is_yagi_admin(auth.uid()) OR is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:987:CREATE POLICY preprod_boards_insert ON public.preprod_boards FOR INSERT WITH CHECK ((is_yagi_admin(auth.uid()) OR is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:988:CREATE POLICY preprod_boards_select ON public.preprod_boards FOR SELECT USING ((is_yagi_admin(auth.uid()) OR is_ws_member(auth.uid(), workspace_id)));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:989:CREATE POLICY preprod_boards_update ON public.preprod_boards FOR UPDATE USING ((is_yagi_admin(auth.uid()) OR is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((is_yagi_admin(auth.uid()) OR is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:992:CREATE POLICY preprod_comments_select ON public.preprod_frame_comments FOR SELECT USING ((EXISTS ( SELECT 1 FROM preprod_boards b WHERE ((b.id = preprod_frame_comments.board_id) AND (is_yagi_admin(auth.uid()) OR is_ws_member(auth.uid(), b.workspace_id))))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:993:CREATE POLICY preprod_comments_update ON public.preprod_frame_comments FOR UPDATE USING ((EXISTS ( SELECT 1 FROM preprod_boards b WHERE ((b.id = preprod_frame_comments.board_id) AND (is_yagi_admin(auth.uid()) OR is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1 FROM preprod_boards b WHERE ((b.id = preprod_frame_comments.board_id) AND (is_yagi_admin(auth.uid()) OR is_ws_admin(auth.uid(), b.workspace_id))))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:996:CREATE POLICY preprod_reactions_select ON public.preprod_frame_reactions FOR SELECT USING ((EXISTS ( SELECT 1 FROM preprod_boards b WHERE ((b.id = preprod_frame_reactions.board_id) AND (is_yagi_admin(auth.uid()) OR is_ws_member(auth.uid(), b.workspace_id))))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:999:CREATE POLICY preprod_frames_delete ON public.preprod_frames FOR DELETE USING ((EXISTS ( SELECT 1 FROM preprod_boards b WHERE ((b.id = preprod_frames.board_id) AND (is_yagi_admin(auth.uid()) OR is_ws_admin(auth.uid(), b.workspace_id))))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1000:CREATE POLICY preprod_frames_insert ON public.preprod_frames FOR INSERT WITH CHECK ((EXISTS ( SELECT 1 FROM preprod_boards b WHERE ((b.id = preprod_frames.board_id) AND (is_yagi_admin(auth.uid()) OR is_ws_admin(auth.uid(), b.workspace_id))))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1001:CREATE POLICY preprod_frames_select ON public.preprod_frames FOR SELECT USING ((EXISTS ( SELECT 1 FROM preprod_boards b WHERE ((b.id = preprod_frames.board_id) AND (is_yagi_admin(auth.uid()) OR is_ws_member(auth.uid(), b.workspace_id))))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1002:CREATE POLICY preprod_frames_update ON public.preprod_frames FOR UPDATE USING ((EXISTS ( SELECT 1 FROM preprod_boards b WHERE ((b.id = preprod_frames.board_id) AND (is_yagi_admin(auth.uid()) OR is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1 FROM preprod_boards b WHERE ((b.id = preprod_frames.board_id) AND (is_yagi_admin(auth.uid()) OR is_ws_admin(auth.uid(), b.workspace_id))))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1010:CREATE POLICY deliverables_rw ON public.project_deliverables FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = project_deliverables.project_id) AND (is_ws_member(auth.uid(), p.workspace_id) OR is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = project_deliverables.project_id) AND (is_ws_member(auth.uid(), p.workspace_id) OR is_yagi_admin(auth.uid()))))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1013:CREATE POLICY milestones_rw ON public.project_milestones FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = project_milestones.project_id) AND (is_ws_member(auth.uid(), p.workspace_id) OR is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = project_milestones.project_id) AND (is_ws_admin(auth.uid(), p.workspace_id) OR is_yagi_admin(auth.uid()))))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1016:CREATE POLICY proj_refs_rw ON public.project_references FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = project_references.project_id) AND (is_ws_member(auth.uid(), p.workspace_id) OR is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = project_references.project_id) AND (is_ws_member(auth.uid(), p.workspace_id) OR is_yagi_admin(auth.uid()))))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1019:CREATE POLICY proj_threads_rw ON public.project_threads FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = project_threads.project_id) AND (is_ws_member(auth.uid(), p.workspace_id) OR is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = project_threads.project_id) AND (is_ws_member(auth.uid(), p.workspace_id) OR is_yagi_admin(auth.uid()))))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1022:CREATE POLICY projects_delete_yagi ON public.projects FOR DELETE TO authenticated USING (is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1023:CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1024:CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING ((is_ws_member(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1025:CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid()))) WITH CHECK ((is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1028:CREATE POLICY showcase_media_delete ON public.showcase_media FOR DELETE USING ((EXISTS ( SELECT 1 FROM showcases s WHERE ((s.id = showcase_media.showcase_id) AND is_yagi_admin(auth.uid())))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1029:CREATE POLICY showcase_media_insert ON public.showcase_media FOR INSERT WITH CHECK ((EXISTS ( SELECT 1 FROM showcases s WHERE ((s.id = showcase_media.showcase_id) AND is_yagi_admin(auth.uid())))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1030:CREATE POLICY showcase_media_select ON public.showcase_media FOR SELECT USING ((EXISTS ( SELECT 1 FROM showcases s WHERE ((s.id = showcase_media.showcase_id) AND (is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = s.project_id) AND is_ws_member(auth.uid(), p.workspace_id)))))))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1031:CREATE POLICY showcase_media_update ON public.showcase_media FOR UPDATE USING ((EXISTS ( SELECT 1 FROM showcases s WHERE ((s.id = showcase_media.showcase_id) AND is_yagi_admin(auth.uid())))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1034:CREATE POLICY showcases_delete_internal ON public.showcases FOR DELETE USING (is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1035:CREATE POLICY showcases_insert_internal ON public.showcases FOR INSERT WITH CHECK (is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1036:CREATE POLICY showcases_select_internal ON public.showcases FOR SELECT USING ((is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = showcases.project_id) AND is_ws_member(auth.uid(), p.workspace_id))))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1037:CREATE POLICY showcases_update_internal ON public.showcases FOR UPDATE USING ((is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = showcases.project_id) AND is_ws_admin(auth.uid(), p.workspace_id)))))) WITH CHECK ((is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = showcases.project_id) AND is_ws_admin(auth.uid(), p.workspace_id))))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1040:CREATE POLICY supplier_profile_select ON public.supplier_profile FOR SELECT USING (is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1041:CREATE POLICY supplier_profile_update ON public.supplier_profile FOR UPDATE USING (is_yagi_admin(auth.uid())) WITH CHECK (is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1045:CREATE POLICY tc_attachments_select ON public.team_channel_message_attachments FOR SELECT USING ((EXISTS ( SELECT 1 FROM (team_channel_messages m JOIN team_channels c ON ((c.id = m.channel_id))) WHERE ((m.id = team_channel_message_attachments.message_id) AND is_yagi_internal_ws(c.workspace_id) AND (is_ws_member(auth.uid(), c.workspace_id) OR is_yagi_admin(auth.uid()))))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1048:CREATE POLICY team_channel_messages_delete ON public.team_channel_messages FOR DELETE USING (((author_id = auth.uid()) OR is_yagi_admin(auth.uid())));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1050:CREATE POLICY team_channel_messages_select ON public.team_channel_messages FOR SELECT USING ((EXISTS ( SELECT 1 FROM team_channels c WHERE ((c.id = team_channel_messages.channel_id) AND is_yagi_internal_ws(c.workspace_id) AND (is_ws_member(auth.uid(), c.workspace_id) OR is_yagi_admin(auth.uid()))))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1054:CREATE POLICY team_channels_insert ON public.team_channels FOR INSERT WITH CHECK ((is_yagi_internal_ws(workspace_id) AND (is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1055:CREATE POLICY team_channels_select ON public.team_channels FOR SELECT USING ((is_yagi_internal_ws(workspace_id) AND (is_ws_member(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1056:CREATE POLICY team_channels_update ON public.team_channels FOR UPDATE USING ((is_yagi_internal_ws(workspace_id) AND (is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1059:CREATE POLICY thread_attachments_hide_internal_from_clients ON public.thread_message_attachments AS RESTRICTIVE FOR SELECT TO authenticated USING ((is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1 FROM thread_messages tm WHERE ((tm.id = thread_message_attachments.message_id) AND (tm.visibility = 'internal'::text)))))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1060:CREATE POLICY thread_message_attachments_delete ON public.thread_message_attachments FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1 FROM thread_messages tm WHERE ((tm.id = thread_message_attachments.message_id) AND ((tm.author_id = auth.uid()) OR is_yagi_admin(auth.uid()))))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1062:CREATE POLICY thread_message_attachments_select ON public.thread_message_attachments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM ((thread_messages tm JOIN project_threads t ON ((t.id = tm.thread_id))) JOIN projects p ON ((p.id = t.project_id))) WHERE ((tm.id = thread_message_attachments.message_id) AND is_ws_member(auth.uid(), p.workspace_id) AND ((tm.visibility = 'shared'::text) OR is_yagi_admin(auth.uid()))))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1065:CREATE POLICY thread_messages_insert ON public.thread_messages FOR INSERT TO authenticated WITH CHECK (((author_id = auth.uid()) AND (EXISTS ( SELECT 1 FROM (project_threads t JOIN projects p ON ((p.id = t.project_id))) WHERE ((t.id = thread_messages.thread_id) AND is_ws_member(auth.uid(), p.workspace_id)))) AND ((visibility = 'shared'::text) OR ((visibility = 'internal'::text) AND is_yagi_admin(auth.uid())))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1066:CREATE POLICY thread_msgs_hide_internal_from_clients ON public.thread_messages AS RESTRICTIVE FOR SELECT TO authenticated USING (((visibility = 'shared'::text) OR is_yagi_admin(auth.uid()) OR (author_id = auth.uid())));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1067:CREATE POLICY thread_msgs_rw ON public.thread_messages FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM (project_threads t JOIN projects p ON ((p.id = t.project_id))) WHERE ((t.id = thread_messages.thread_id) AND (is_ws_member(auth.uid(), p.workspace_id) OR is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1 FROM (project_threads t JOIN projects p ON ((p.id = t.project_id))) WHERE ((t.id = thread_messages.thread_id) AND (is_ws_member(auth.uid(), p.workspace_id) OR is_yagi_admin(auth.uid()))))));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1070:CREATE POLICY user_roles_read_self ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR is_yagi_admin(auth.uid())));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1071:CREATE POLICY user_roles_self_insert_creator ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'creator'::text) AND (workspace_id IS NULL)));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1072:CREATE POLICY user_roles_self_insert_ws_admin ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1073:CREATE POLICY user_roles_yagi_admin ON public.user_roles FOR ALL TO authenticated USING (is_yagi_admin(auth.uid())) WITH CHECK (is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1076:CREATE POLICY ws_inv_read_admin ON public.workspace_invitations FOR SELECT TO authenticated USING ((is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1077:CREATE POLICY ws_inv_write_admin ON public.workspace_invitations FOR ALL TO authenticated USING ((is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid()))) WITH CHECK ((is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1080:CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1081:CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((is_ws_member(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1082:CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1 FROM workspace_members m WHERE (m.workspace_id = workspace_members.workspace_id))))) OR is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1086:CREATE POLICY ws_delete_yagi ON public.workspaces FOR DELETE TO authenticated USING (is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1087:CREATE POLICY ws_read_members ON public.workspaces FOR SELECT TO authenticated USING ((is_ws_member(auth.uid(), id) OR is_yagi_admin(auth.uid())));
.yagi-autobuild\archive\migrations-pre-2-0\_current_remote_schema_snapshot.sql:1088:CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((is_ws_admin(auth.uid(), id) OR is_yagi_admin(auth.uid()))) WITH CHECK ((is_ws_admin(auth.uid(), id) OR is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:21:   supabase/migrations/20260501140308_phase_4_x_handle_new_user_search_path_hardening.sql
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:22:   ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:29:   - reads workspace_members.count + user_roles where role IN
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:39:   - supabase/migrations/20260501140308_phase_4_x_handle_new_user_search_path_hardening.sql
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:67:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'Get-Content -Raw supabase/migrations/20260501140308_phase_4_x_handle_new_user_search_path_hardening.sql' in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:75:-- transition_project_status / is_valid_transition / validate_profile_role_transition
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:78:ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:149:  // handle_new_user DB trigger now guarantees a profiles row materialises
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:152:  // role instead ??the actual constraint that decides whether the user
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:222:This migration introduces a SECURITY DEFINER trigger function 'public.handle_new_user()' that fires AFTER INSERT on auth.users and auto-creates a public.profiles row. It is ALREADY APPLIED to the prod Supabase project (jvamvbpxnztynsccvcmr). Review is retroactive ??your job is to find anything that warrants a follow-up corrective commit, especially HIGH-A (security-critical) or HIGH-B (high-impact bug) findings.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:238:H. REVOKE EXECUTE FROM PUBLIC/authenticated/anon ??does it block trigger fire? Defense in depth against direct invocation by a user calling SELECT public.handle_new_user(forged_record)?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:239:I. 'client' default role consistency with persona A (DECISIONS_CACHE.md Q-094 = Brand-only Phase 4-9). Interaction with the artist bootstrap path (sub_13 service-role admin upsert) ??does the trigger first creating role='client' then UPDATE to 'artist' work cleanly through validate_profile_role_transition?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:289:export type ProfileRole = "creator" | "studio" | "observer" | "client" | "artist";
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:506:  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:511:-- user could call `SELECT public.handle_new_user(forged_record)` and try
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:513:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:514:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:515:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:673:- **Question**: if `handle_new_user` raises, does `auth.users INSERT`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:686:- **Surface**: `REVOKE EXECUTE ON FUNCTION public.handle_new_user()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:692:  blocks direct calls (`SELECT public.handle_new_user(forged_row)` from
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:700:- **Surface**: `INSERT ... role='client'`.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:705:  via service-role admin) inserts/upserts with `role='artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:709:  2. Trigger fires ??profile row inserted with role='client' (default)
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:724:  Supabase pattern for `handle_new_user`-style triggers (it's exactly
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:771:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"CREATE TABLE public\\.profiles|profiles_handle_check|handle.*UNIQUE|validate_profile_role_transition|role.*client|role.*artist|raw_user_meta_data|handle_new_user|REVOKE EXECUTE|SECURITY DEFINER|search_path\" supabase/migrations src .yagi-autobuild/phase-4-x -S" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:775:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"CREATE TABLE public\\.profiles|ALTER TABLE public\\.profiles|CONSTRAINT.*profiles|CREATE UNIQUE INDEX.*profiles|UNIQUE.*profiles|CHECK.*role|profile.*role|validate_profile_role_transition|CREATE TRIGGER.*profiles|ON public\\.profiles\" supabase/migrations -S" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:790:  14: -- Default role = 'client' since persona A = Brand-only active persona.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:795:  19: CREATE OR REPLACE FUNCTION public.handle_new_user()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:852:  76:   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:857:  81: -- user could call `SELECT public.handle_new_user(forged_record)` and try
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:859:  83: REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:860:  84: REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:861:  85: REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:867:supabase/migrations\20260422120000_phase_2_0_baseline.sql:1789:    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['creator'::text, 'workspace_admin'::text, 'workspace_member'::text, 'yagi_admin'::text]))),
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:869:supabase/migrations\20260422120000_phase_2_0_baseline.sql:1808:    CONSTRAINT workspace_invitations_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:870:supabase/migrations\20260422120000_phase_2_0_baseline.sql:1825:    CONSTRAINT workspace_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:889:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4440:CREATE POLICY user_roles_self_insert_creator ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'creator'::text) AND (workspace_id IS NULL)));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:890:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4447:CREATE POLICY user_roles_self_insert_ws_admin ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:891:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4521:CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:897:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:67:  ADD COLUMN role text CHECK (role IS NULL OR role IN ('creator','studio','observer')),
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:900:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:105:-- Observer: no child table. profiles.role='observer' alone signals the role.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:919:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:26:-- (auto-named profiles_role_check). Drop+recreate keeps the NULL-allowed
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:920:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:28:ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:921:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:29:ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:922:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:923:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:54:  'Phase 2.7 ??company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:926:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:195:-- validate_profile_role_transition trigger (짠9) which prevents self-flipping
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:930:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:313:--   1. UPDATE profiles SET role = 'client'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:931:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:322:CREATE OR REPLACE FUNCTION public.validate_profile_role_transition()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:932:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:378:REVOKE ALL ON FUNCTION public.validate_profile_role_transition() FROM PUBLIC;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:933:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:380:DROP TRIGGER IF EXISTS validate_profile_role_transition_trigger
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:935:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:383:CREATE TRIGGER validate_profile_role_transition_trigger
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:937:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:386:  EXECUTE FUNCTION public.validate_profile_role_transition();
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:938:supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:144:                                 CHECK (actor_role IN (
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:940:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:1:-- Phase 4.x Wave C.5b amend_02 ??widen profiles_role_check to include 'artist'.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:941:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:4:-- as Brand + Artist + YAGI Admin. The profiles_role_check CHECK constraint
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:943:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:22:  DROP CONSTRAINT IF EXISTS profiles_role_check;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:945:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:25:  ADD CONSTRAINT profiles_role_check CHECK (
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1027:supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:246:-- actor_role='client':
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1030:supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:289:    WHEN actor_role = 'client' THEN
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1035:supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:426:  IF v_actor_role = 'client' AND v_actor_id <> v_created_by THEN
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1044:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1045:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:54:  'Phase 2.7 ??company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1046:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:157:      WHERE p.id = (select auth.uid()) AND p.role = 'client'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1047:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:195:-- validate_profile_role_transition trigger (짠9) which prevents self-flipping
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1049:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:206:      WHERE p.id = (select auth.uid()) AND p.role = 'client'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1053:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:313:--   1. UPDATE profiles SET role = 'client'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1054:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:314:--   2. INSERT a clients row (passes clients_insert_self because role='client')
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1056:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:322:CREATE OR REPLACE FUNCTION public.validate_profile_role_transition()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1059:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:345:    IF NEW.role = 'client' AND OLD.role IS NOT NULL THEN
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1060:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:367:    IF OLD.role = 'client' AND NEW.role IS DISTINCT FROM 'client' THEN
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1061:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:378:REVOKE ALL ON FUNCTION public.validate_profile_role_transition() FROM PUBLIC;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1062:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:380:DROP TRIGGER IF EXISTS validate_profile_role_transition_trigger
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1063:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:383:CREATE TRIGGER validate_profile_role_transition_trigger
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1064:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:386:  EXECUTE FUNCTION public.validate_profile_role_transition();
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1120:supabase/migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:14:-- Default role = 'client' since persona A = Brand-only active persona.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1121:supabase/migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:19:CREATE OR REPLACE FUNCTION public.handle_new_user()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1128:supabase/migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:76:  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1130:supabase/migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:81:-- user could call `SELECT public.handle_new_user(forged_record)` and try
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1131:supabase/migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:83:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1132:supabase/migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:84:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1133:supabase/migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:85:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1135:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:1:-- Phase 4.x Wave C.5b amend_02 ??widen profiles_role_check to include 'artist'.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1136:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:27:    (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1150:.yagi-autobuild/phase-4-x\_amend01_codex_prompt.txt:6:This migration introduces a SECURITY DEFINER trigger function 'public.handle_new_user()' that fires AFTER INSERT on auth.users and auto-creates a public.profiles row. It is ALREADY APPLIED to the prod Supabase project (jvamvbpxnztynsccvcmr). Review is retroactive ??your job is to find anything that warrants a follow-up corrective commit, especially HIGH-A (security-critical) or HIGH-B (high-impact bug) findings.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1155:.yagi-autobuild/phase-4-x\_amend01_codex_prompt.txt:22:H. REVOKE EXECUTE FROM PUBLIC/authenticated/anon ??does it block trigger fire? Defense in depth against direct invocation by a user calling SELECT public.handle_new_user(forged_record)?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1156:.yagi-autobuild/phase-4-x\_amend01_codex_prompt.txt:23:I. 'client' default role consistency with persona A (DECISIONS_CACHE.md Q-094 = Brand-only Phase 4-9). Interaction with the artist bootstrap path (sub_13 service-role admin upsert) ??does the trigger first creating role='client' then UPDATE to 'artist' work cleanly through validate_profile_role_transition?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1164:.yagi-autobuild/phase-4-x\_amend01_self_review.md:90:- **Question**: if `handle_new_user` raises, does `auth.users INSERT`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1166:.yagi-autobuild/phase-4-x\_amend01_self_review.md:103:- **Surface**: `REVOKE EXECUTE ON FUNCTION public.handle_new_user()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1168:.yagi-autobuild/phase-4-x\_amend01_self_review.md:109:  blocks direct calls (`SELECT public.handle_new_user(forged_row)` from
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1169:.yagi-autobuild/phase-4-x\_amend01_self_review.md:117:- **Surface**: `INSERT ... role='client'`.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1170:.yagi-autobuild/phase-4-x\_amend01_self_review.md:122:  via service-role admin) inserts/upserts with `role='artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1171:.yagi-autobuild/phase-4-x\_amend01_self_review.md:126:  2. Trigger fires ??profile row inserted with role='client' (default)
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1175:.yagi-autobuild/phase-4-x\_amend01_self_review.md:141:  Supabase pattern for `handle_new_user`-style triggers (it's exactly
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1176:.yagi-autobuild/phase-4-x\_amend01_test_log.md:14:| `pg_proc` has `handle_new_user` | ??1 row |
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1179:.yagi-autobuild/phase-4-x\_amend01_test_log.md:19:| security advisor regression introduced by handle_new_user | ??0 (REVOKE EXECUTE suppresses anon/authenticated SECURITY-DEFINER lints; SET search_path suppresses search-path-mutable lint) |
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1182:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:18:This migration introduces a SECURITY DEFINER trigger function 'public.handle_new_user()' that fires AFTER INSERT on auth.users and auto-creates a public.profiles row. It is ALREADY APPLIED to the prod Supabase project (jvamvbpxnztynsccvcmr). Review is retroactive ??your job is to find anything that warrants a follow-up corrective commit, especially HIGH-A (security-critical) or HIGH-B (high-impact bug) findings.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1187:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:34:H. REVOKE EXECUTE FROM PUBLIC/authenticated/anon ??does it block trigger fire? Defense in depth against direct invocation by a user calling SELECT public.handle_new_user(forged_record)?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1188:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:35:I. 'client' default role consistency with persona A (DECISIONS_CACHE.md Q-094 = Brand-only Phase 4-9). Interaction with the artist bootstrap path (sub_13 service-role admin upsert) ??does the trigger first creating role='client' then UPDATE to 'artist' work cleanly through validate_profile_role_transition?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1190:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:275:-- Default role = 'client' since persona A = Brand-only active persona.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1191:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:280:CREATE OR REPLACE FUNCTION public.handle_new_user()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1198:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:337:  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1200:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:342:-- user could call `SELECT public.handle_new_user(forged_record)` and try
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1201:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:344:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1202:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:345:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1203:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:346:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1210:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:504:- **Question**: if `handle_new_user` raises, does `auth.users INSERT`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1212:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:517:- **Surface**: `REVOKE EXECUTE ON FUNCTION public.handle_new_user()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1214:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:523:  blocks direct calls (`SELECT public.handle_new_user(forged_row)` from
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1215:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:531:- **Surface**: `INSERT ... role='client'`.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1216:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:536:  via service-role admin) inserts/upserts with `role='artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1217:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:540:  2. Trigger fires ??profile row inserted with role='client' (default)
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1221:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:555:  Supabase pattern for `handle_new_user`-style triggers (it's exactly
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1222:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:602:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"CREATE TABLE public\\.profiles|profiles_handle_check|handle.*UNIQUE|validate_profile_role_transition|role.*client|role.*artist|raw_user_meta_data|handle_new_user|REVOKE EXECUTE|SECURITY DEFINER|search_path\" supabase/migrations src .yagi-autobuild/phase-4-x -S" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1223:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:606:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"CREATE TABLE public\\.profiles|ALTER TABLE public\\.profiles|CONSTRAINT.*profiles|CREATE UNIQUE INDEX.*profiles|UNIQUE.*profiles|CHECK.*role|profile.*role|validate_profile_role_transition|CREATE TRIGGER.*profiles|ON public\\.profiles\" supabase/migrations -S" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1224:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:621:  14: -- Default role = 'client' since persona A = Brand-only active persona.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1225:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:626:  19: CREATE OR REPLACE FUNCTION public.handle_new_user()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1232:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:683:  76:   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1234:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:688:  81: -- user could call `SELECT public.handle_new_user(forged_record)` and try
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1235:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:690:  83: REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1236:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:691:  84: REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1237:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:692:  85: REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1245:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:753:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1246:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:754:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:54:  'Phase 2.7 ??company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1247:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:757:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:195:-- validate_profile_role_transition trigger (짠9) which prevents self-flipping
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1249:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:761:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:313:--   1. UPDATE profiles SET role = 'client'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1250:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:762:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:322:CREATE OR REPLACE FUNCTION public.validate_profile_role_transition()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1251:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:763:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:378:REVOKE ALL ON FUNCTION public.validate_profile_role_transition() FROM PUBLIC;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1252:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:764:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:380:DROP TRIGGER IF EXISTS validate_profile_role_transition_trigger
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1253:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:766:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:383:CREATE TRIGGER validate_profile_role_transition_trigger
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1254:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:768:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:386:  EXECUTE FUNCTION public.validate_profile_role_transition();
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1255:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:771:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:1:-- Phase 4.x Wave C.5b amend_02 ??widen profiles_role_check to include 'artist'.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1256:.yagi-autobuild/phase-4-x\_amend02_self_review.md:21:  - `role = 'client'` ??1 row (yout40204020). Passes.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1257:.yagi-autobuild/phase-4-x\_amend02_self_review.md:23:  - `role = 'studio' / 'observer' / 'artist'` ??0 rows. Trivially ok.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1258:.yagi-autobuild/phase-4-x\_amend02_self_review.md:40:  introduce an `artists_update_self` policy with `p.role = 'artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1259:.yagi-autobuild/phase-4-x\_amend02_self_review.md:44:### F3 ??handle_new_user (amend_01) interaction
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1260:.yagi-autobuild/phase-4-x\_amend02_self_review.md:47:  `role = 'client'` (literal). Wide enum changes nothing for the
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1262:.yagi-autobuild/phase-4-x\_amend02_self_review.md:54:### F4 ??`validate_profile_role_transition` semantics on artist UPSERT
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1263:.yagi-autobuild/phase-4-x\_amend02_self_review.md:60:  fires on the row that handle_new_user just created (role='client'),
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1264:.yagi-autobuild/phase-4-x\_amend02_self_review.md:61:  does the trigger reject the UPDATE to role='artist'?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1265:.yagi-autobuild/phase-4-x\_amend02_self_review.md:74:  2. `handle_new_user` AFTER INSERT trigger fires ??`profiles` row
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1266:.yagi-autobuild/phase-4-x\_amend02_self_review.md:75:     created with `role='client'`, `display_name='artist'` (email
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1268:.yagi-autobuild/phase-4-x\_amend02_self_review.md:122:  layer on top of `role='artist'` already being valid. The enum
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1270:.yagi-autobuild/phase-4-x\_artist_account_created.md:24:       (role = ANY (ARRAY['creator','studio','observer','client','artist'])))
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1274:.yagi-autobuild/phase-4-x\_artist_account_created.md:52:This account exercises the `handle_new_user` (amend_01) ??sub_13
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1275:.yagi-autobuild/phase-4-x\_artist_account_created.md:57:2. `handle_new_user` AFTER INSERT trigger fires ??profile row
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1276:.yagi-autobuild/phase-4-x\_artist_account_created.md:58:   inserted with `role='client'` (default per persona A),
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1277:.yagi-autobuild/phase-4-x\_artist_account_created.md:65:4. `validate_profile_role_transition` trigger fires on the UPDATE
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1278:.yagi-autobuild/phase-4-x\_artist_account_created.md:70:Net result: account is `role='artist'` end-to-end with the
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1282:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:45:- ?쇨린 manual 議곗튂: yout40204020@gmail.com ??profile SQL INSERT 吏곸젒 (handle='c_a2df55bf', role='client')
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1283:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:59:-- Default role = 'client' since persona A = Brand-only active persona.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1284:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:63:CREATE OR REPLACE FUNCTION public.handle_new_user()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1290:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:107:  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1292:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:112:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1293:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:113:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1294:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:114:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1299:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:161:- `SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';` ??1 row
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1300:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:171:  - role = 'client'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1301:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:216:-- Phase 4.x Wave C.5b amend_02 ??widen profiles_role_check to include 'artist'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1302:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:231:    (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1305:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:297:-- role='artist', display_name='Artist Demo', handle='artist_demo_<6char>'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1306:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:311:- artist@yagiworkshop.xyz 怨꾩젙 ?앹꽦 + email_confirmed + role='artist'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1307:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:316:- `feat(phase-4-x): wave-c5b amend_02a ??widen profiles_role_check to include 'artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1308:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:342:?듭뀡 A (沅뚯옣): role = 'client'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1309:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:349:SET role = 'client', updated_at = now()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1310:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:368:- yonsei 怨꾩젙 role='client'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1311:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:48:   - amend_01 (profile trigger): SECURITY DEFINER risk / SQL injection in handle gen / citext cast / retry loop / ON CONFLICT semantic / REVOKE EXECUTE ?④낵 / 'client' default ? persona A ?쇨???.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:100:- `handle_new_user()` SECURITY DEFINER trigger function
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1312:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:101:- handle = 'c_<8-char-md5>', display_name = email local part, role = 'client', locale = 'ko' default
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1314:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:119:- pg_proc ??handle_new_user 議댁옱
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1315:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:136:- ALTER profiles_role_check: 湲곗〈 ['creator', 'studio', 'observer', 'client'] + 'artist' 異붽?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1316:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:165:- `feat(phase-4-x): wave-c5b amend_02a ??widen profiles_role_check to include 'artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1317:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:175:- yonsei (UUID 73be213d-1306-42f1-bee4-7b77175a6e79) role='client'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1320:.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:581:- profiles.role = 'artist' (?먮뒗 enum 誘몄젙 ???쇨린 蹂닿퀬)
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1322:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:17:| 02a | profiles_role_check widened to include 'artist' | `e0400d4` | ??migration applied; constraint includes 'artist'; ProfileRole TS type extended; sidebar switch case added |
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1324:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:30:auth.users INSERT now triggers `public.handle_new_user()` SECURITY
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1331:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:100:2. `handle_new_user` AFTER INSERT ??profile inserted role='client', handle='c_<md5>'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1332:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:101:3. Script's service-role upsert ??ON CONFLICT (id) UPDATE ??role='artist', handle='artist_demo_2d6a3f'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1333:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:102:4. `validate_profile_role_transition` short-circuits at `auth.uid() IS NULL` (service-role context)
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1334:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:117:SET role = 'client', updated_at = now()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1335:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:187:      row was auto-created (handle `c_<md5>`, role='client',
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1337:.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md:55:UPDATE public.profiles SET role = 'client' WHERE id = '73be213d-1306-42f1-bee4-7b77175a6e79';
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1338:.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md:74:applied via service-role (validate_profile_role_transition trigger
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1339:.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md:79:SET role = 'client', updated_at = now()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1340:.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md:83:-- ??1 row updated. role='client', updated_at='2026-05-01 10:12:33+00'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1354:   1: -- Phase 4.x Wave C.5b amend_02 ??widen profiles_role_check to include 'artist'.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1357:   4: -- as Brand + Artist + YAGI Admin. The profiles_role_check CHECK constraint
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1358:   5: -- still only allowed creator/studio/observer/client. yagi visual review
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1364:  11: -- Scope: additive only. Existing rows (creator/studio/observer/client/NULL)
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1375:  22:   DROP CONSTRAINT IF EXISTS profiles_role_check;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1378:  25:   ADD CONSTRAINT profiles_role_check CHECK (
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1380:  27:     (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1438: 312: --   1. UPDATE profiles SET role = 'client'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1439: 313: --   2. INSERT a clients row (passes clients_insert_self because role='client')
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1447: 321: CREATE OR REPLACE FUNCTION public.validate_profile_role_transition()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1462: 336:   IF public.is_yagi_admin(v_caller) THEN
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1470: 344:     IF NEW.role = 'client' AND OLD.role IS NOT NULL THEN
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1492: 366:     IF OLD.role = 'client' AND NEW.role IS DISTINCT FROM 'client' THEN
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1503: 377: REVOKE ALL ON FUNCTION public.validate_profile_role_transition() FROM PUBLIC;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1505: 379: DROP TRIGGER IF EXISTS validate_profile_role_transition_trigger
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1508: 382: CREATE TRIGGER validate_profile_role_transition_trigger
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1511: 385:   EXECUTE FUNCTION public.validate_profile_role_transition();
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1637:  19: export type ProfileRole = "creator" | "studio" | "observer" | "client" | "artist";
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1874:  92:   // /role intermediate step).
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1901:   4: // creator/studio/observer/client personae. Phase 4.x locks persona A
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:3109:  67:   ADD COLUMN role text CHECK (role IS NULL OR role IN ('creator','studio','observer')),
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:3111:  69:   ADD COLUMN role_switched_at timestamptz,
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:3781:  ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:3830:- Reasoning: Revoking `EXECUTE` from `PUBLIC`, `authenticated`, and `anon` does not prevent the trigger from firing. The comment?셲 forged-record example is imprecise because this trigger function has no arguments and trigger functions are not normally callable as plain `SELECT public.handle_new_user(...)`.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:3872:  ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:3921:- Reasoning: Revoking `EXECUTE` from `PUBLIC`, `authenticated`, and `anon` does not prevent the trigger from firing. The comment?셲 forged-record example is imprecise because this trigger function has no arguments and trigger functions are not normally callable as plain `SELECT public.handle_new_user(...)`.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:3962:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content supabase/migrations/20260501140308_phase_4_x_handle_new_user_search_path_hardening.sql | ForEach-Object { "{0,4}: {1}" -f $i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:3966:   3: -- transition_project_status / is_valid_transition / validate_profile_role_transition
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:3969:   6: ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4039:  68:   // handle_new_user DB trigger now guarantees a profiles row materialises
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4042:  71:   // role instead ??the actual constraint that decides whether the user
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4104:supabase/migrations\20260422120000_phase_2_0_baseline.sql:185:  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4107:supabase/migrations\20260422120000_phase_2_0_baseline.sql:1789:    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['creator'::text, 'workspace_admin'::text, 'workspace_member'::text, 'yagi_admin'::text]))),
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4110:supabase/migrations\20260422120000_phase_2_0_baseline.sql:1825:    CONSTRAINT workspace_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4147:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3715:CREATE POLICY brands_read ON public.brands FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4149:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3722:CREATE POLICY brands_write_admin ON public.brands TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4153:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3740:CREATE POLICY invoice_items_modify ON public.invoice_line_items USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4157:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3768:CREATE POLICY invoices_hide_drafts_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (status <> 'draft'::text)));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4159:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3775:CREATE POLICY invoices_hide_mocks_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (is_mock = false)));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4161:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3782:CREATE POLICY invoices_insert ON public.invoices FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4163:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3789:CREATE POLICY invoices_select ON public.invoices FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4165:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3796:CREATE POLICY invoices_update ON public.invoices FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4171:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3833:CREATE POLICY meetings_insert ON public.meetings FOR INSERT WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4173:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3840:CREATE POLICY meetings_select ON public.meetings FOR SELECT USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4175:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3847:CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4189:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3924:CREATE POLICY preprod_boards_delete ON public.preprod_boards FOR DELETE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4191:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3931:CREATE POLICY preprod_boards_insert ON public.preprod_boards FOR INSERT WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4193:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3938:CREATE POLICY preprod_boards_select ON public.preprod_boards FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4195:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3945:CREATE POLICY preprod_boards_update ON public.preprod_boards FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4221:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4116:CREATE POLICY projects_delete_yagi ON public.projects FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4223:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4123:CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4225:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4130:CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4227:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4137:CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4237:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4194:CREATE POLICY showcases_delete_internal ON public.showcases FOR DELETE USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4239:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4201:CREATE POLICY showcases_insert_internal ON public.showcases FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4241:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4208:CREATE POLICY showcases_select_internal ON public.showcases FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4243:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4217:CREATE POLICY showcases_update_internal ON public.showcases FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4245:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4234:CREATE POLICY supplier_profile_select ON public.supplier_profile FOR SELECT USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4247:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4241:CREATE POLICY supplier_profile_update ON public.supplier_profile FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4253:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4279:CREATE POLICY team_channel_messages_delete ON public.team_channel_messages FOR DELETE USING (((author_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4261:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4317:CREATE POLICY team_channels_insert ON public.team_channels FOR INSERT WITH CHECK ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4263:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4324:CREATE POLICY team_channels_select ON public.team_channels FOR SELECT USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4265:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4331:CREATE POLICY team_channels_update ON public.team_channels FOR UPDATE USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4267:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4338:CREATE POLICY thread_attachments_hide_internal_from_clients ON public.thread_message_attachments AS RESTRICTIVE FOR SELECT TO authenticated USING ((public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4277:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4400:CREATE POLICY thread_msgs_hide_internal_from_clients ON public.thread_messages AS RESTRICTIVE FOR SELECT TO authenticated USING (((visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()) OR (author_id = auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4285:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4433:CREATE POLICY user_roles_read_self ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4287:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4440:CREATE POLICY user_roles_self_insert_creator ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'creator'::text) AND (workspace_id IS NULL)));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4289:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4447:CREATE POLICY user_roles_self_insert_ws_admin ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4291:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4454:CREATE POLICY user_roles_yagi_admin ON public.user_roles TO authenticated USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4297:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4486:CREATE POLICY ws_delete_yagi ON public.workspaces FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4299:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4493:CREATE POLICY ws_inv_read_admin ON public.workspace_invitations FOR SELECT TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4301:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4500:CREATE POLICY ws_inv_write_admin ON public.workspace_invitations TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4303:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4507:CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4305:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4514:CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4307:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4521:CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4309:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4523:  WHERE (m.workspace_id = workspace_members.workspace_id))))) OR public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4311:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4530:CREATE POLICY ws_read_members ON public.workspaces FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4313:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4537:CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4329:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4626:CREATE POLICY "preprod-frames delete internal" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4331:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4635:CREATE POLICY "preprod-frames read internal" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4333:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4644:CREATE POLICY "preprod-frames write internal" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4339:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4684:CREATE POLICY "showcase-media delete" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4341:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4691:CREATE POLICY "showcase-media read" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'showcase-media'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4343:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4701:CREATE POLICY "showcase-media update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4345:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4708:CREATE POLICY "showcase-media write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4347:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4715:CREATE POLICY "showcase-og delete" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4349:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4722:CREATE POLICY "showcase-og update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4351:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4729:CREATE POLICY "showcase-og write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4361:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4768:CREATE POLICY thread_attachments_objects_hide_internal ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING (((bucket_id <> 'thread-attachments'::text) OR public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4373:src/app\api\health\google\route.ts:14:  // yagi_admin gate: check user_roles for role='yagi_admin' with workspace_id IS NULL
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4455:supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:15:-- In prod today (2026-04-28) workspace_members only has role='admin' rows
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4487:supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:21:--   'yagi_admin'      — user_roles.role = 'yagi_admin'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4488:supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:22:--   'workspace_admin' — user_roles.role = 'workspace_admin'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4537:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:131:DROP POLICY IF EXISTS creators_update_self ON public.creators;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4538:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:132:CREATE POLICY creators_update_self ON public.creators
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4539:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:149:DROP POLICY IF EXISTS studios_update_self ON public.studios;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4540:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:150:CREATE POLICY studios_update_self ON public.studios
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4549:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:244:CREATE POLICY creators_update_self ON public.creators
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4552:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:268:CREATE POLICY studios_update_self ON public.studios
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4668: 151: -- Name: is_ws_admin(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4671: 154: CREATE FUNCTION public.is_ws_admin(uid uuid, wsid uuid) RETURNS boolean
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4677: 160:     where user_id = uid and workspace_id = wsid and role = 'admin'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4695: 178: -- Name: is_yagi_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4698: 181: CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boolean
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4702: 185:   select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4824:4170:   WHERE ((s.id = showcase_media.showcase_id) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4835:4181:   WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4848:4194: CREATE POLICY showcases_delete_internal ON public.showcases FOR DELETE USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4855:4201: CREATE POLICY showcases_insert_internal ON public.showcases FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4862:4208: CREATE POLICY showcases_select_internal ON public.showcases FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4871:4217: CREATE POLICY showcases_update_internal ON public.showcases FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4873:4219:   WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id)))))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4875:4221:   WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id))))));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4888:4234: CREATE POLICY supplier_profile_select ON public.supplier_profile FOR SELECT USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4895:4241: CREATE POLICY supplier_profile_update ON public.supplier_profile FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4914:4260:   WHERE ((m.id = team_channel_message_attachments.message_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4930:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4433:CREATE POLICY user_roles_read_self ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4932:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4440:CREATE POLICY user_roles_self_insert_creator ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'creator'::text) AND (workspace_id IS NULL)));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4934:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4447:CREATE POLICY user_roles_self_insert_ws_admin ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4936:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4454:CREATE POLICY user_roles_yagi_admin ON public.user_roles TO authenticated USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4939:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4507:CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4941:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4514:CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4943:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4521:CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4949:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4433:CREATE POLICY user_roles_read_self ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4951:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4440:CREATE POLICY user_roles_self_insert_creator ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'creator'::text) AND (workspace_id IS NULL)));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4953:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4447:CREATE POLICY user_roles_self_insert_ws_admin ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4955:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4454:CREATE POLICY user_roles_yagi_admin ON public.user_roles TO authenticated USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4958:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4507:CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4960:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4514:CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4962:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4521:CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4966:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4433:CREATE POLICY user_roles_read_self ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4967:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4440:CREATE POLICY user_roles_self_insert_creator ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'creator'::text) AND (workspace_id IS NULL)));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4968:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4447:CREATE POLICY user_roles_self_insert_ws_admin ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4969:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4454:CREATE POLICY user_roles_yagi_admin ON public.user_roles TO authenticated USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4970:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4507:CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4971:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4514:CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4972:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4521:CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4977:- F1: FIXED. The follow-up migration contains the intended hardening: `ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;` at `supabase/migrations/20260501140308_phase_4_x_handle_new_user_search_path_hardening.sql:6`. That is the correct corrective shape for the Loop 1 `pg_temp` ordering concern.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:4999:- F1: FIXED. The follow-up migration contains the intended hardening: `ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;` at `supabase/migrations/20260501140308_phase_4_x_handle_new_user_search_path_hardening.sql:6`. That is the correct corrective shape for the Loop 1 `pg_temp` ordering concern.
.yagi-autobuild\archive\migrations-pre-2-0\20260422110000_phase_1_9_showcases_fixups.sql:15:    is_yagi_admin(auth.uid())
.yagi-autobuild\archive\migrations-pre-2-0\20260422110000_phase_1_9_showcases_fixups.sql:19:        and is_ws_admin(auth.uid(), p.workspace_id)
.yagi-autobuild\archive\migrations-pre-2-0\20260422110000_phase_1_9_showcases_fixups.sql:23:    is_yagi_admin(auth.uid())
.yagi-autobuild\archive\migrations-pre-2-0\20260422110000_phase_1_9_showcases_fixups.sql:27:        and is_ws_admin(auth.uid(), p.workspace_id)
src\app\[locale]\app\admin\challenges\[slug]\announce\actions.ts:30:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:18:This migration introduces a SECURITY DEFINER trigger function 'public.handle_new_user()' that fires AFTER INSERT on auth.users and auto-creates a public.profiles row. It is ALREADY APPLIED to the prod Supabase project (jvamvbpxnztynsccvcmr). Review is retroactive — your job is to find anything that warrants a follow-up corrective commit, especially HIGH-A (security-critical) or HIGH-B (high-impact bug) findings.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:34:H. REVOKE EXECUTE FROM PUBLIC/authenticated/anon — does it block trigger fire? Defense in depth against direct invocation by a user calling SELECT public.handle_new_user(forged_record)?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:35:I. 'client' default role consistency with persona A (DECISIONS_CACHE.md Q-094 = Brand-only Phase 4-9). Interaction with the artist bootstrap path (sub_13 service-role admin upsert) — does the trigger first creating role='client' then UPDATE to 'artist' work cleanly through validate_profile_role_transition?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:85:export type ProfileRole = "creator" | "studio" | "observer" | "client" | "artist";
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:302:  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:307:-- user could call `SELECT public.handle_new_user(forged_record)` and try
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:309:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:310:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:311:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:469:- **Question**: if `handle_new_user` raises, does `auth.users INSERT`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:482:- **Surface**: `REVOKE EXECUTE ON FUNCTION public.handle_new_user()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:488:  blocks direct calls (`SELECT public.handle_new_user(forged_row)` from
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:496:- **Surface**: `INSERT ... role='client'`.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:501:  via service-role admin) inserts/upserts with `role='artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:505:  2. Trigger fires ??profile row inserted with role='client' (default)
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:520:  Supabase pattern for `handle_new_user`-style triggers (it's exactly
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:567:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"CREATE TABLE public\\.profiles|profiles_handle_check|handle.*UNIQUE|validate_profile_role_transition|role.*client|role.*artist|raw_user_meta_data|handle_new_user|REVOKE EXECUTE|SECURITY DEFINER|search_path\" supabase/migrations src .yagi-autobuild/phase-4-x -S" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:571:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"CREATE TABLE public\\.profiles|ALTER TABLE public\\.profiles|CONSTRAINT.*profiles|CREATE UNIQUE INDEX.*profiles|UNIQUE.*profiles|CHECK.*role|profile.*role|validate_profile_role_transition|CREATE TRIGGER.*profiles|ON public\\.profiles\" supabase/migrations -S" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:586:  14: -- Default role = 'client' since persona A = Brand-only active persona.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:591:  19: CREATE OR REPLACE FUNCTION public.handle_new_user()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:648:  76:   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:653:  81: -- user could call `SELECT public.handle_new_user(forged_record)` and try
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:655:  83: REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:656:  84: REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:657:  85: REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:663:supabase/migrations\20260422120000_phase_2_0_baseline.sql:1789:    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['creator'::text, 'workspace_admin'::text, 'workspace_member'::text, 'yagi_admin'::text]))),
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:665:supabase/migrations\20260422120000_phase_2_0_baseline.sql:1808:    CONSTRAINT workspace_invitations_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:666:supabase/migrations\20260422120000_phase_2_0_baseline.sql:1825:    CONSTRAINT workspace_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:685:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4440:CREATE POLICY user_roles_self_insert_creator ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'creator'::text) AND (workspace_id IS NULL)));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:686:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4447:CREATE POLICY user_roles_self_insert_ws_admin ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:687:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4521:CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:693:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:67:  ADD COLUMN role text CHECK (role IS NULL OR role IN ('creator','studio','observer')),
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:696:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:105:-- Observer: no child table. profiles.role='observer' alone signals the role.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:715:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:26:-- (auto-named profiles_role_check). Drop+recreate keeps the NULL-allowed
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:716:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:28:ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:717:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:29:ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:718:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:719:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:54:  'Phase 2.7 — company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:722:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:195:-- validate_profile_role_transition trigger (§9) which prevents self-flipping
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:726:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:313:--   1. UPDATE profiles SET role = 'client'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:727:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:322:CREATE OR REPLACE FUNCTION public.validate_profile_role_transition()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:728:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:378:REVOKE ALL ON FUNCTION public.validate_profile_role_transition() FROM PUBLIC;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:729:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:380:DROP TRIGGER IF EXISTS validate_profile_role_transition_trigger
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:731:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:383:CREATE TRIGGER validate_profile_role_transition_trigger
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:733:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:386:  EXECUTE FUNCTION public.validate_profile_role_transition();
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:734:supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:144:                                 CHECK (actor_role IN (
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:736:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:1:-- Phase 4.x Wave C.5b amend_02 — widen profiles_role_check to include 'artist'.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:737:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:4:-- as Brand + Artist + YAGI Admin. The profiles_role_check CHECK constraint
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:739:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:22:  DROP CONSTRAINT IF EXISTS profiles_role_check;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:741:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:25:  ADD CONSTRAINT profiles_role_check CHECK (
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:823:supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:246:-- actor_role='client':
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:826:supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:289:    WHEN actor_role = 'client' THEN
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:831:supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:426:  IF v_actor_role = 'client' AND v_actor_id <> v_created_by THEN
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:840:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:841:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:54:  'Phase 2.7 — company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:842:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:157:      WHERE p.id = (select auth.uid()) AND p.role = 'client'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:843:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:195:-- validate_profile_role_transition trigger (§9) which prevents self-flipping
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:845:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:206:      WHERE p.id = (select auth.uid()) AND p.role = 'client'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:849:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:313:--   1. UPDATE profiles SET role = 'client'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:850:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:314:--   2. INSERT a clients row (passes clients_insert_self because role='client')
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:852:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:322:CREATE OR REPLACE FUNCTION public.validate_profile_role_transition()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:855:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:345:    IF NEW.role = 'client' AND OLD.role IS NOT NULL THEN
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:856:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:367:    IF OLD.role = 'client' AND NEW.role IS DISTINCT FROM 'client' THEN
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:857:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:378:REVOKE ALL ON FUNCTION public.validate_profile_role_transition() FROM PUBLIC;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:858:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:380:DROP TRIGGER IF EXISTS validate_profile_role_transition_trigger
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:859:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:383:CREATE TRIGGER validate_profile_role_transition_trigger
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:860:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:386:  EXECUTE FUNCTION public.validate_profile_role_transition();
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:916:supabase/migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:14:-- Default role = 'client' since persona A = Brand-only active persona.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:917:supabase/migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:19:CREATE OR REPLACE FUNCTION public.handle_new_user()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:924:supabase/migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:76:  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:926:supabase/migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:81:-- user could call `SELECT public.handle_new_user(forged_record)` and try
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:927:supabase/migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:83:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:928:supabase/migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:84:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:929:supabase/migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:85:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:931:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:1:-- Phase 4.x Wave C.5b amend_02 — widen profiles_role_check to include 'artist'.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:932:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:27:    (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:946:.yagi-autobuild/phase-4-x\_amend01_codex_prompt.txt:6:This migration introduces a SECURITY DEFINER trigger function 'public.handle_new_user()' that fires AFTER INSERT on auth.users and auto-creates a public.profiles row. It is ALREADY APPLIED to the prod Supabase project (jvamvbpxnztynsccvcmr). Review is retroactive — your job is to find anything that warrants a follow-up corrective commit, especially HIGH-A (security-critical) or HIGH-B (high-impact bug) findings.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:951:.yagi-autobuild/phase-4-x\_amend01_codex_prompt.txt:22:H. REVOKE EXECUTE FROM PUBLIC/authenticated/anon — does it block trigger fire? Defense in depth against direct invocation by a user calling SELECT public.handle_new_user(forged_record)?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:952:.yagi-autobuild/phase-4-x\_amend01_codex_prompt.txt:23:I. 'client' default role consistency with persona A (DECISIONS_CACHE.md Q-094 = Brand-only Phase 4-9). Interaction with the artist bootstrap path (sub_13 service-role admin upsert) — does the trigger first creating role='client' then UPDATE to 'artist' work cleanly through validate_profile_role_transition?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:960:.yagi-autobuild/phase-4-x\_amend01_self_review.md:90:- **Question**: if `handle_new_user` raises, does `auth.users INSERT`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:962:.yagi-autobuild/phase-4-x\_amend01_self_review.md:103:- **Surface**: `REVOKE EXECUTE ON FUNCTION public.handle_new_user()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:964:.yagi-autobuild/phase-4-x\_amend01_self_review.md:109:  blocks direct calls (`SELECT public.handle_new_user(forged_row)` from
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:965:.yagi-autobuild/phase-4-x\_amend01_self_review.md:117:- **Surface**: `INSERT ... role='client'`.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:966:.yagi-autobuild/phase-4-x\_amend01_self_review.md:122:  via service-role admin) inserts/upserts with `role='artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:967:.yagi-autobuild/phase-4-x\_amend01_self_review.md:126:  2. Trigger fires → profile row inserted with role='client' (default)
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:971:.yagi-autobuild/phase-4-x\_amend01_self_review.md:141:  Supabase pattern for `handle_new_user`-style triggers (it's exactly
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:972:.yagi-autobuild/phase-4-x\_amend01_test_log.md:14:| `pg_proc` has `handle_new_user` | ✅ 1 row |
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:975:.yagi-autobuild/phase-4-x\_amend01_test_log.md:19:| security advisor regression introduced by handle_new_user | ✅ 0 (REVOKE EXECUTE suppresses anon/authenticated SECURITY-DEFINER lints; SET search_path suppresses search-path-mutable lint) |
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:978:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:18:This migration introduces a SECURITY DEFINER trigger function 'public.handle_new_user()' that fires AFTER INSERT on auth.users and auto-creates a public.profiles row. It is ALREADY APPLIED to the prod Supabase project (jvamvbpxnztynsccvcmr). Review is retroactive — your job is to find anything that warrants a follow-up corrective commit, especially HIGH-A (security-critical) or HIGH-B (high-impact bug) findings.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:983:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:34:H. REVOKE EXECUTE FROM PUBLIC/authenticated/anon — does it block trigger fire? Defense in depth against direct invocation by a user calling SELECT public.handle_new_user(forged_record)?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:984:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:35:I. 'client' default role consistency with persona A (DECISIONS_CACHE.md Q-094 = Brand-only Phase 4-9). Interaction with the artist bootstrap path (sub_13 service-role admin upsert) — does the trigger first creating role='client' then UPDATE to 'artist' work cleanly through validate_profile_role_transition?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:986:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:275:-- Default role = 'client' since persona A = Brand-only active persona.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:987:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:280:CREATE OR REPLACE FUNCTION public.handle_new_user()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:994:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:337:  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:996:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:342:-- user could call `SELECT public.handle_new_user(forged_record)` and try
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:997:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:344:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:998:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:345:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:999:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:346:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1006:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:504:- **Question**: if `handle_new_user` raises, does `auth.users INSERT`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1008:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:517:- **Surface**: `REVOKE EXECUTE ON FUNCTION public.handle_new_user()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1010:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:523:  blocks direct calls (`SELECT public.handle_new_user(forged_row)` from
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1011:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:531:- **Surface**: `INSERT ... role='client'`.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1012:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:536:  via service-role admin) inserts/upserts with `role='artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1013:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:540:  2. Trigger fires ??profile row inserted with role='client' (default)
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1017:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:555:  Supabase pattern for `handle_new_user`-style triggers (it's exactly
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1018:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:602:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"CREATE TABLE public\\.profiles|profiles_handle_check|handle.*UNIQUE|validate_profile_role_transition|role.*client|role.*artist|raw_user_meta_data|handle_new_user|REVOKE EXECUTE|SECURITY DEFINER|search_path\" supabase/migrations src .yagi-autobuild/phase-4-x -S" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1019:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:606:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"CREATE TABLE public\\.profiles|ALTER TABLE public\\.profiles|CONSTRAINT.*profiles|CREATE UNIQUE INDEX.*profiles|UNIQUE.*profiles|CHECK.*role|profile.*role|validate_profile_role_transition|CREATE TRIGGER.*profiles|ON public\\.profiles\" supabase/migrations -S" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1020:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:621:  14: -- Default role = 'client' since persona A = Brand-only active persona.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1021:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:626:  19: CREATE OR REPLACE FUNCTION public.handle_new_user()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1028:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:683:  76:   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1030:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:688:  81: -- user could call `SELECT public.handle_new_user(forged_record)` and try
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1031:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:690:  83: REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1032:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:691:  84: REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1033:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:692:  85: REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1041:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:753:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1042:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:754:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:54:  'Phase 2.7 — company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1043:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:757:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:195:-- validate_profile_role_transition trigger (§9) which prevents self-flipping
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1045:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:761:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:313:--   1. UPDATE profiles SET role = 'client'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1046:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:762:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:322:CREATE OR REPLACE FUNCTION public.validate_profile_role_transition()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1047:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:763:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:378:REVOKE ALL ON FUNCTION public.validate_profile_role_transition() FROM PUBLIC;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1048:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:764:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:380:DROP TRIGGER IF EXISTS validate_profile_role_transition_trigger
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1049:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:766:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:383:CREATE TRIGGER validate_profile_role_transition_trigger
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1050:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:768:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:386:  EXECUTE FUNCTION public.validate_profile_role_transition();
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1051:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:771:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:1:-- Phase 4.x Wave C.5b amend_02 — widen profiles_role_check to include 'artist'.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1052:.yagi-autobuild/phase-4-x\_amend02_self_review.md:21:  - `role = 'client'` — 1 row (yout40204020). Passes.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1053:.yagi-autobuild/phase-4-x\_amend02_self_review.md:23:  - `role = 'studio' / 'observer' / 'artist'` — 0 rows. Trivially ok.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1054:.yagi-autobuild/phase-4-x\_amend02_self_review.md:40:  introduce an `artists_update_self` policy with `p.role = 'artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1055:.yagi-autobuild/phase-4-x\_amend02_self_review.md:44:### F3 — handle_new_user (amend_01) interaction
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1056:.yagi-autobuild/phase-4-x\_amend02_self_review.md:47:  `role = 'client'` (literal). Wide enum changes nothing for the
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1058:.yagi-autobuild/phase-4-x\_amend02_self_review.md:54:### F4 — `validate_profile_role_transition` semantics on artist UPSERT
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1059:.yagi-autobuild/phase-4-x\_amend02_self_review.md:60:  fires on the row that handle_new_user just created (role='client'),
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1060:.yagi-autobuild/phase-4-x\_amend02_self_review.md:61:  does the trigger reject the UPDATE to role='artist'?
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1061:.yagi-autobuild/phase-4-x\_amend02_self_review.md:74:  2. `handle_new_user` AFTER INSERT trigger fires → `profiles` row
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1062:.yagi-autobuild/phase-4-x\_amend02_self_review.md:75:     created with `role='client'`, `display_name='artist'` (email
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1064:.yagi-autobuild/phase-4-x\_amend02_self_review.md:122:  layer on top of `role='artist'` already being valid. The enum
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1066:.yagi-autobuild/phase-4-x\_artist_account_created.md:24:       (role = ANY (ARRAY['creator','studio','observer','client','artist'])))
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1070:.yagi-autobuild/phase-4-x\_artist_account_created.md:52:This account exercises the `handle_new_user` (amend_01) ↔ sub_13
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1071:.yagi-autobuild/phase-4-x\_artist_account_created.md:57:2. `handle_new_user` AFTER INSERT trigger fires → profile row
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1072:.yagi-autobuild/phase-4-x\_artist_account_created.md:58:   inserted with `role='client'` (default per persona A),
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1073:.yagi-autobuild/phase-4-x\_artist_account_created.md:65:4. `validate_profile_role_transition` trigger fires on the UPDATE
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1074:.yagi-autobuild/phase-4-x\_artist_account_created.md:70:Net result: account is `role='artist'` end-to-end with the
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1078:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:45:- 야기 manual 조치: yout40204020@gmail.com 의 profile SQL INSERT 직접 (handle='c_a2df55bf', role='client')
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1079:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:59:-- Default role = 'client' since persona A = Brand-only active persona.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1080:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:63:CREATE OR REPLACE FUNCTION public.handle_new_user()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1086:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:107:  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1088:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:112:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1089:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:113:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1090:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:114:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1095:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:161:- `SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';` → 1 row
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1096:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:171:  - role = 'client'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1097:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:216:-- Phase 4.x Wave C.5b amend_02 — widen profiles_role_check to include 'artist'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1098:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:231:    (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1101:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:297:-- role='artist', display_name='Artist Demo', handle='artist_demo_<6char>'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1102:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:311:- artist@yagiworkshop.xyz 계정 생성 + email_confirmed + role='artist'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1103:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:316:- `feat(phase-4-x): wave-c5b amend_02a — widen profiles_role_check to include 'artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1104:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:342:옵션 A (권장): role = 'client'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1105:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:349:SET role = 'client', updated_at = now()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1106:.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:368:- yonsei 계정 role='client'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1108:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:100:- `handle_new_user()` SECURITY DEFINER trigger function
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1109:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:101:- handle = 'c_<8-char-md5>', display_name = email local part, role = 'client', locale = 'ko' default
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1111:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:119:- pg_proc 의 handle_new_user 존재
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1112:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:136:- ALTER profiles_role_check: 기존 ['creator', 'studio', 'observer', 'client'] + 'artist' 추가
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1113:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:165:- `feat(phase-4-x): wave-c5b amend_02a — widen profiles_role_check to include 'artist'`
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1114:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:175:- yonsei (UUID 73be213d-1306-42f1-bee4-7b77175a6e79) role='client'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1117:.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:581:- profiles.role = 'artist' (또는 enum 미정 시 야기 보고)
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1119:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:17:| 02a | profiles_role_check widened to include 'artist' | `e0400d4` | ✅ migration applied; constraint includes 'artist'; ProfileRole TS type extended; sidebar switch case added |
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1121:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:30:auth.users INSERT now triggers `public.handle_new_user()` SECURITY
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1128:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:100:2. `handle_new_user` AFTER INSERT → profile inserted role='client', handle='c_<md5>'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1129:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:101:3. Script's service-role upsert → ON CONFLICT (id) UPDATE → role='artist', handle='artist_demo_2d6a3f'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1130:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:102:4. `validate_profile_role_transition` short-circuits at `auth.uid() IS NULL` (service-role context)
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1131:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:117:SET role = 'client', updated_at = now()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1132:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:187:      row was auto-created (handle `c_<md5>`, role='client',
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1134:.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md:55:UPDATE public.profiles SET role = 'client' WHERE id = '73be213d-1306-42f1-bee4-7b77175a6e79';
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1135:.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md:74:applied via service-role (validate_profile_role_transition trigger
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1136:.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md:79:SET role = 'client', updated_at = now()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1137:.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md:83:-- → 1 row updated. role='client', updated_at='2026-05-01 10:12:33+00'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1151:   1: -- Phase 4.x Wave C.5b amend_02 ??widen profiles_role_check to include 'artist'.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1154:   4: -- as Brand + Artist + YAGI Admin. The profiles_role_check CHECK constraint
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1155:   5: -- still only allowed creator/studio/observer/client. yagi visual review
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1161:  11: -- Scope: additive only. Existing rows (creator/studio/observer/client/NULL)
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1172:  22:   DROP CONSTRAINT IF EXISTS profiles_role_check;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1175:  25:   ADD CONSTRAINT profiles_role_check CHECK (
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1177:  27:     (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1235: 312: --   1. UPDATE profiles SET role = 'client'
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1236: 313: --   2. INSERT a clients row (passes clients_insert_self because role='client')
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1244: 321: CREATE OR REPLACE FUNCTION public.validate_profile_role_transition()
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1259: 336:   IF public.is_yagi_admin(v_caller) THEN
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1267: 344:     IF NEW.role = 'client' AND OLD.role IS NOT NULL THEN
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1289: 366:     IF OLD.role = 'client' AND NEW.role IS DISTINCT FROM 'client' THEN
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1300: 377: REVOKE ALL ON FUNCTION public.validate_profile_role_transition() FROM PUBLIC;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1302: 379: DROP TRIGGER IF EXISTS validate_profile_role_transition_trigger
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1305: 382: CREATE TRIGGER validate_profile_role_transition_trigger
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1308: 385:   EXECUTE FUNCTION public.validate_profile_role_transition();
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1434:  19: export type ProfileRole = "creator" | "studio" | "observer" | "client" | "artist";
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1671:  92:   // /role intermediate step).
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1698:   4: // creator/studio/observer/client personae. Phase 4.x locks persona A
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:2906:  67:   ADD COLUMN role text CHECK (role IS NULL OR role IN ('creator','studio','observer')),
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:2908:  69:   ADD COLUMN role_switched_at timestamptz,
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:3578:  ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:3627:- Reasoning: Revoking `EXECUTE` from `PUBLIC`, `authenticated`, and `anon` does not prevent the trigger from firing. The comment’s forged-record example is imprecise because this trigger function has no arguments and trigger functions are not normally callable as plain `SELECT public.handle_new_user(...)`.
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:3669:  ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:3718:- Reasoning: Revoking `EXECUTE` from `PUBLIC`, `authenticated`, and `anon` does not prevent the trigger from firing. The comment’s forged-record example is imprecise because this trigger function has no arguments and trigger functions are not normally callable as plain `SELECT public.handle_new_user(...)`.
.yagi-autobuild\DECISIONS_CACHE.md:84:- Draft/pre-release (challenges draft) → **admin SELECT OR is_yagi_admin bypass**
.yagi-autobuild\DECISIONS_CACHE.md:722:**Question:** 4 roles (creator/studio/observer/client) 선택 UI?
.yagi-autobuild\DECISIONS_CACHE.md:1027:2. TypeScript ProfileRole type은 4개 그대로 유지 (`'creator' | 'studio' | 'observer' | 'client'`) — legacy 프로필 데이터 보호.
.yagi-autobuild\DECISIONS_CACHE.md:1169:4. **Auto-transition `submitted → in_review` is the ONLY system-role transition** (L-015). Client-side `submitProjectAction` writes `status='in_review'` directly via service-role client (which bypasses the trigger guard), and inserts the initial history row with `actor_role='system'`. UX rationale: client must see "검토 중" immediately on submit; the literal `submitted` state is functional metadata only. Implication: the `submitted` row in `project_status_history` is the *from-state* of the system transition, not a user-observable state on `projects`.
.yagi-autobuild\DECISIONS_CACHE.md:1218:`creator|studio|observer|client` for legacy DB rows; only `client` (and
.yagi-autobuild\phase-4-x\_amend01_codex_prompt_loop2.txt:9:   supabase/migrations/20260501140308_phase_4_x_handle_new_user_search_path_hardening.sql
.yagi-autobuild\phase-4-x\_amend01_codex_prompt_loop2.txt:10:   ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
.yagi-autobuild\phase-4-x\_amend01_codex_prompt_loop2.txt:17:   - reads workspace_members.count + user_roles where role IN
.yagi-autobuild\phase-4-x\_amend01_codex_prompt_loop2.txt:27:   - supabase/migrations/20260501140308_phase_4_x_handle_new_user_search_path_hardening.sql
.yagi-autobuild\phase-4-x\_amend01_codex_prompt.txt:6:This migration introduces a SECURITY DEFINER trigger function 'public.handle_new_user()' that fires AFTER INSERT on auth.users and auto-creates a public.profiles row. It is ALREADY APPLIED to the prod Supabase project (jvamvbpxnztynsccvcmr). Review is retroactive — your job is to find anything that warrants a follow-up corrective commit, especially HIGH-A (security-critical) or HIGH-B (high-impact bug) findings.
.yagi-autobuild\phase-4-x\_amend01_codex_prompt.txt:22:H. REVOKE EXECUTE FROM PUBLIC/authenticated/anon — does it block trigger fire? Defense in depth against direct invocation by a user calling SELECT public.handle_new_user(forged_record)?
.yagi-autobuild\phase-4-x\_amend01_codex_prompt.txt:23:I. 'client' default role consistency with persona A (DECISIONS_CACHE.md Q-094 = Brand-only Phase 4-9). Interaction with the artist bootstrap path (sub_13 service-role admin upsert) — does the trigger first creating role='client' then UPDATE to 'artist' work cleanly through validate_profile_role_transition?
src\app\[locale]\app\admin\challenges\actions.ts:68:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
.yagi-autobuild\phase-4-x\result_01.md:26:- profiles.role = 'yagi_admin' check in RLS policies aligns with is_yagi_admin helper pattern used in prior migrations.
.yagi-autobuild\phase-4-x\KICKOFF.md:308:      WHERE id = auth.uid() AND role = 'yagi_admin'
.yagi-autobuild\phase-4-x\KICKOFF.md:329:      WHERE id = auth.uid() AND role = 'yagi_admin'
.yagi-autobuild\phase-4-x\KICKOFF.md:335:      WHERE id = auth.uid() AND role = 'yagi_admin'
.yagi-autobuild\archive\transient\summary.md:85:  - `refs_insert` policy dropped → `refs_insert_authorized` created (path-prefix + `is_ws_member` / `is_yagi_admin`)
.yagi-autobuild\archive\transient\summary.md:132:- RLS helper signatures: `is_ws_member(uid uuid, wsid uuid)`, `is_yagi_admin(uid uuid)`, `is_ws_admin(uid uuid, wsid uuid)`
.yagi-autobuild\archive\transient\MORNING-BRIEF.md:4:**Phase 2.1 SHIPPED ✅.** **Phase 2.5 SPEC revised to v2** addressing all X2 4 CRITICAL + 9 HIGH findings (identity-model collision resolved — uses ALTER `profiles`, reuses `is_yagi_admin`, explicit orthogonality clause, junction-table winner pinning). **X1 design-audit cluster closed** for every `[BLOCKS 2.5]` item — share surface retoken'd with semantic tokens, raw `<input>`/`<textarea>` replaced by COMPONENT_CONTRACTS primitives, `Button size="pill"` variant landed. **Status palette centralized** with new `--success`/`--warning`/`--info` semantic tokens + `src/lib/ui/status-pill.ts` helper (pre-wired for Phase 2.5 challenge states). **Phase 2.5 G1 is now unblocked** to start whenever ready.
.yagi-autobuild\archive\transient\MORNING-BRIEF.md:14:- SPEC **v2** committed `5440954` — applies all X2 findings (4 CRITICAL + 9 HIGH + relevant MEDIUM). §1.2 new orthogonality clause, §3 G1 rewritten to ALTER existing `profiles`, §3 G5 admin gate uses `is_yagi_admin`, §3 G7 adds the 4 new notification kinds + `challenges-closing-reminder` pg_cron scheduler, §6 Q1-Q8 all have proposals, §5 dependencies reorganized.
.yagi-autobuild\archive\transient\hotfix-onboarding-guard.md:24:- `hasGlobalRole`: true if a row exists in `user_roles` with `workspace_id IS NULL` and `role IN ('creator','yagi_admin')`
.yagi-autobuild\archive\transient\contracts.md:45:| `is_ws_admin(uid, wsid)` | Predicate: user is admin in workspace | RLS policies + app-side authorization checks | SECURITY DEFINER, STABLE |
.yagi-autobuild\archive\transient\contracts.md:47:| `is_yagi_admin(uid)` | Predicate: user holds yagi_admin role | Admin gates, nav filters, cross-workspace ops | SECURITY DEFINER, STABLE |
.yagi-autobuild\archive\transient\contracts.md:75:- `is_yagi_admin`, `is_ws_admin`, `is_ws_member`, `is_yagi_internal_ws` RPCs — authorization primitives in almost every RLS policy 1.2+.
.yagi-autobuild\archive\transient\contracts.md:147:- `thread_messages.visibility='internal'` — RESTRICTIVE SELECT policy `thread_msgs_hide_internal_from_clients` hides internal messages from non-privileged workspace members. Specifically: reads are allowed when `visibility='shared' OR is_yagi_admin(auth.uid()) OR author_id = auth.uid()`. Authors can still read their own internal drafts; other workspace members cannot.
.yagi-autobuild\archive\transient\contracts.md:269:- Phase 1.1 `is_yagi_admin` for board creation; the `preprod_boards_set_workspace_id` trigger looks up `workspaces` by `slug='yagi-internal'`. That row is seeded by migration `20260423020100_seed_yagi_internal_workspace` (Phase 2.1 G3) — `id='320c1564-b0e7-481a-871c-be8d9bb605a8'`, `name='YAGI Internal'`, `plan='custom'`, `brand_guide={}`. Insert is idempotent (`ON CONFLICT DO NOTHING`) so clean-clone `supabase db reset` creates the row; live DB (where the row already existed from a Phase 1.1 manual bootstrap) silently no-ops.
.yagi-autobuild\archive\transient\contracts.md:403:- Phase 1.1 `workspaces` (yagi-internal lookup), `profiles` (author + unread map), `is_yagi_internal_ws` / `is_ws_admin` / `is_yagi_admin`.
.yagi-autobuild\archive\transient\contracts.md:543:1. **`is_ws_admin` source.** CONFIRMED — checks only `workspace_members.role='admin'`, not `user_roles`. The `workspace_admin` value in `user_roles` is separately materialized but not consulted by this predicate. (baseline.sql:158-160)
.yagi-autobuild\archive\transient\contracts.md:544:2. **`thread_messages` internal visibility.** CORRECTED — policy `thread_msgs_hide_internal_from_clients` allows `visibility='shared' OR is_yagi_admin OR author_id=auth.uid()`. Message authors can read their own internal messages. Documented above in Phase 1.2 / 1.2.5 sections.
.yagi-autobuild\archive\transient\contracts.md:580:- `profiles` — added: role CHECK ('creator'|'studio'|'observer'), handle citext UNIQUE, instagram_handle, bio CHECK (char_length ≤ 200), avatar_url, role_switched_at, handle_changed_at. (`external_links jsonb` — deferred to Phase 2.6 per FU-19; ULTRA-CHAIN D forbade mid-chain migration.)
.yagi-autobuild\archive\transient\contracts.md:622:- `is_yagi_admin(uid)` — Phase 1.1, reused unchanged for admin gating
.yagi-autobuild\archive\phase-2-shipped\phase-2-8\_codex_review_prompt.md:119:   - Service-role INSERT into notification_events for every yagi_admin.
.yagi-autobuild\archive\phase-2-shipped\phase-2-8\_codex_g_b_1_prompt.md:20:  public.is_ws_admin(uid uuid, wsid uuid)   — workspace_members.role='admin'
.yagi-autobuild\archive\phase-2-shipped\phase-2-8\_codex_g_b_1_prompt.md:21:  public.is_yagi_admin(uid uuid)            — user_roles.role='yagi_admin'
.yagi-autobuild\archive\phase-2-shipped\phase-2-8\_codex_g_b_1_prompt.md:152:is_yagi_admin) themselves. Those are the categories that recur
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:1101:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:1253:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:1378:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:1419:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:1798:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3630:  role text not null check (role in ('creator', 'workspace_admin', 'workspace_member', 'yagi_admin')),
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3644:  role text not null check (role in ('admin', 'member')),
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3658:  role text not null check (role in ('admin', 'member')),
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3792:create or replace function public.is_yagi_admin(uid uuid) returns boolean
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3794:  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3802:create or replace function public.is_ws_admin(uid uuid, wsid uuid) returns boolean
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3806:    where user_id = uid and workspace_id = wsid and role = 'admin'
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3835:  using (user_id = auth.uid() or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3837:  with check (user_id = auth.uid() and role = 'creator' and workspace_id is null);
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3840:    user_id = auth.uid() and role = 'workspace_admin' and workspace_id is not null
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3841:    and public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3844:  using (public.is_yagi_admin(auth.uid())) with check (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3849:  using (public.is_ws_member(auth.uid(), id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3852:  using (public.is_ws_admin(auth.uid(), id) or public.is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3853:  with check (public.is_ws_admin(auth.uid(), id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3855:  using (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3860:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3862:  using (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3863:  with check (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3868:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3871:    (user_id = auth.uid() and role = 'admin'
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3873:    or public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3874:    or public.is_yagi_admin(auth.uid())
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3877:  using (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3882:  using (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3884:  using (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3885:  with check (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3890:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3892:  with check (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3894:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3895:  with check (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3897:  using (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3903:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3905:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3909:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3911:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3915:    where t.id = thread_id and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3917:    where t.id = thread_id and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3920:  using (visibility = 'shared' or public.is_yagi_admin(auth.uid()) or author_id = auth.uid());
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3924:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3926:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3930:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3932:    and (public.is_ws_admin(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3935:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3937:  using (public.is_yagi_admin(auth.uid())) with check (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3965:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:3974:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:5335:336-    where t.id = thread_id and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:5337:338-    where t.id = thread_id and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:5340:341-  using (visibility = 'shared' or public.is_yagi_admin(auth.uid()) or author_id = auth.uid());
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:5345:351-    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:5347:353-    and (public.is_ws_admin(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:5350:356-  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:5352:358-  using (public.is_yagi_admin(auth.uid())) with check (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:5945:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'invoices_read|invoices_yagi_write|using \\(public.is_ws_member\\(auth.uid\\(\\), workspace_id\\) or public.is_yagi_admin\\(auth.uid\\(\\)\\)\\)' 'supabase/migrations/20260421094855_phase1_schema.sql'" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:5957:281:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:5958:289:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:5959:311:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:5960:315:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:5962:356:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:6235:  Fix: Add restrictive `SELECT` RLS so non-yagi users can only see real customer-facing states, and explicitly hide `draft` and `is_mock=true` unless `is_yagi_admin(auth.uid())`.
.yagi-autobuild\archive\phase-1\codex-phase-1-5.md:6283:  Fix: Add restrictive `SELECT` RLS so non-yagi users can only see real customer-facing states, and explicitly hide `draft` and `is_mock=true` unless `is_yagi_admin(auth.uid())`.
.yagi-autobuild\phase-2-8-2\KICKOFF_PROMPT.md:354:- **Q-088** ProfileRole 4→2 — do NOT add new studio/observer branches (G_B2_E role badges use creator/client visible + studio/observer legacy fallback)
.yagi-autobuild\archive\phase-2-shipped\phase-2-0\SPEC.md:225:- functions: 10+ (is_yagi_admin, is_ws_member, is_ws_admin, resolve_user_ids_by_emails, increment_showcase_view, tg_*, etc.)
.yagi-autobuild\archive\phase-2-shipped\phase-2-0\SPEC.md:254:  - RPCs `is_yagi_admin`, `is_ws_member`, `is_ws_admin`, `resolve_user_ids_by_emails`, `increment_showcase_view`
.yagi-autobuild\archive\phase-2-shipped\phase-2-0\G4_TRIAGE.md:47:| 1.4 | M2 | Preprod visibility too loose (any ws_member of yagi-internal) | Design decision: gate to `is_yagi_admin`? |
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:71:    is_yagi_admin(auth.uid())`. Verify:
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:77:2. **Soft-delete write path.** projects_update uses `(is_ws_admin AND
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:78:   deleted_at IS NULL) OR is_yagi_admin` for USING; CHECK is `is_ws_admin
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:79:   OR is_yagi_admin`. Confirm:
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:104:helper ? supabase.rpc("is_yagi_admin", { uid }).
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:859:ELETE|is_yagi_admin|is_ws_member|is_ws_admin\" supabase src" in C:\Users\yout4\yagi-studio\yagi-workshop-g-b-2-redesign
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:921:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:932:      public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:935:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:938:    public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:939:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1017:supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:33:    public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1018:supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:34:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1019:supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:48:        AND public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1020:supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:62:      public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1021:supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:63:      OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1022:supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:85:    AND public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1023:supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:96:    AND public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1026:supabase\migrations\20260422120000_phase_2_0_baseline.sql:151:-- Name: is_ws_admin(uuid, uuid); Type: FUNCTION; Schema: pu
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1028:supabase\migrations\20260422120000_phase_2_0_baseline.sql:154:CREATE FUNCTION public.is_ws_admin(uid uuid, wsid uuid) RETU
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1036:supabase\migrations\20260422120000_phase_2_0_baseline.sql:178:-- Name: is_yagi_admin(uuid); Type: FUNCTION; Schema: public
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1038:supabase\migrations\20260422120000_phase_2_0_baseline.sql:181:CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boole
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1173:thenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1175:ticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1176:ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1180:ic.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1182:ic.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1184:tems USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1188:.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), i.workspace_id))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1190:nvoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (status <> 'draft'::text)));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1192:voices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (is_mock = false)));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1194: WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1196: USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1198: USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1202:is_ws_admin(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1206:is_ws_member(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1208: WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1210: USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1212: USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1216:.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1218:.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1230:s FOR DELETE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1232:s FOR INSERT WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1234:s FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1236:s FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((publi
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1237:c.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1241:ic.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1245:ic.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1247:ic.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1251:gi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1255:gi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1263:gi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1265:gi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1269:lic.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1279:.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1281:.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1285:_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1287:_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1289:ELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1291: TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1295:O authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1299: TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1300:public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1320: FOR DELETE USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1322: FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1324: FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1328: FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1330:in(auth.uid(), p.workspace_id)))))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1334:ofile FOR SELECT USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1336:ofile FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1345:hannel_messages FOR DELETE USING (((author_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1353:ic.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.u
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1358:FOR INSERT WITH CHECK ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR publ
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1359:ic.is_yagi_admin(auth.uid()))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1364:FOR UPDATE USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1367: ON public.thread_message_attachments AS RESTRICTIVE FOR SELECT TO authenticated USING ((public.is_yagi_admin(auth.uid()) 
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1372:D ((tm.author_id = auth.uid()) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1380:D public.is_ws_member(auth.uid(), p.workspace_id) AND ((tm.visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1386:is_yagi_admin(auth.uid())))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1393:ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1395:ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1399: SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1401:_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'creator'::text) AND (workspace_id IS N
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1404:r_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspac
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1405:e_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1407: authenticated USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1411:E TO authenticated USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1413:ions FOR SELECT TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1416:tions TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHE
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1417:CK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1419:embers FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1422:OR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1424:_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SE
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1427:)) OR public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1429:CT TO authenticated USING ((public.is_ws_member(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1431:TE TO authenticated USING ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.i
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1432:s_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1448:.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1450:bjects FOR DELETE TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1453:[1]) AND public.is_ws_admin(auth.uid(), b.workspace_id)))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1455:ects FOR SELECT TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EX
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1460:jects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) 
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1463:[1]) AND public.is_ws_admin(auth.uid(), b.workspace_id)))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1467:[1]) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1471:_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1473:R DELETE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1475:SELECT TO authenticated USING (((bucket_id = 'showcase-media'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SE
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1480:R UPDATE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1482: INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1484:ELETE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1486:PDATE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1488:SERT TO authenticated WITH CHECK (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1498:, 1)) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1547:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:244:CREATE POLICY creators_update_self ON public.creat
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1552:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:268:CREATE POLICY studios_update_self ON public.studio
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1560:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:278:  FOR INSERT WITH CHECK (public.is_yagi_admin(auth
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1564:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:281:  FOR UPDATE USING (public.is_yagi_admin(auth.uid(
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1566:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:282:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1569:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:285:  FOR DELETE USING (public.is_yagi_admin(auth.uid(
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1572:a is_yagi_admin.
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1581:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:323:  FOR UPDATE USING (public.is_yagi_admin(auth.uid(
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1583:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:324:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1590:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:345:  FOR ALL USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1591:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:346:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1596:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:355:  FOR ALL USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1597:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:356:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1606:supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:11:--        trigger; admin bypasses via is_yagi_admin.
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1607:supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:58:  IF public.is_yagi_admin(auth.uid()) THEN
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1613:supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:132:CREATE POLICY creators_update_self ON public.creators
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1614:supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:150:CREATE POLICY studios_update_self ON public.studios
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1619:supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:263:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1622:supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:270:  USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1623:supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:272:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1626:supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:279:  USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1627:supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:281:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1630:supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:37:  USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1633:supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:42:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1636:supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:48:  USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1637:supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:49:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1640:supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:53:  USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1643:supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:61:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1646:supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:67:  USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1647:supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:68:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1650:supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:72:  USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1651:supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:94:  IF public.is_yagi_admin(auth.uid()) THEN
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1658:supabase\migrations\20260424000000_phase_2_5_g2_handle_history.sql:53:  USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1688:supabase\migrations\20260426000000_phase_2_8_brief_board.sql:195:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1692:supabase\migrations\20260426000000_phase_2_8_brief_board.sql:211:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1699:supabase\migrations\20260426000000_phase_2_8_brief_board.sql:248:  USING (public.is_yagi_admin((select auth.uid())))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1700:supabase\migrations\20260426000000_phase_2_8_brief_board.sql:249:  WITH CHECK (public.is_yagi_admin((select auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1704:supabase\migrations\20260426000000_phase_2_8_brief_board.sql:265:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1708:supabase\migrations\20260426000000_phase_2_8_brief_board.sql:286:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1712:supabase\migrations\20260426000000_phase_2_8_brief_board.sql:307:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1716:supabase\migrations\20260426000000_phase_2_8_brief_board.sql:324:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1718:supabase\migrations\20260426000000_phase_2_8_brief_board.sql:337:    OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1721:supabase\migrations\20260426000000_phase_2_8_brief_board.sql:390:  v_is_yagi_admin boolean := false;
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1722:supabase\migrations\20260426000000_phase_2_8_brief_board.sql:397:  v_is_yagi_admin := public.is_yagi_admin(v_caller);
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1723:supabase\migrations\20260426000000_phase_2_8_brief_board.sql:399:  IF v_is_yagi_admin THEN
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1734:supabase\migrations\20260424030000_phase_2_5_g8_hardening_v2.sql:44:    IF NOT public.is_yagi_admin((select auth.uid())) T
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1747:supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:58:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1754:supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:69:      public.is_ws_admin(auth.uid(), workspace_
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1756:supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:72:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1757:supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:75:    public.is_ws_admin(auth.uid(), workspace_id
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1759:supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:76:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1771:supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:145:    OR public.is_yagi_admin((select auth.uid()
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1775:supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:168:    OR public.is_yagi_admin((select auth.uid()
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1777:supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:172:    OR public.is_yagi_admin((select auth.uid()
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1781:supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:188:    OR public.is_yagi_admin((select auth.uid()
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1788:supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:235:  USING (public.is_yagi_admin((select auth.uid
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1790:supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:236:  WITH CHECK (public.is_yagi_admin((select aut
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1793:supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:263:  v_is_admin := public.is_yagi_admin(v_caller)
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1798:supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:337:  IF public.is_yagi_admin(v_caller) THEN
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1809:supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:37:  USING (public.is_yagi_admin((select auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1812:supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:53:  USING (public.is_yagi_admin((select auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1817:supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:123:    IF NOT public.is_yagi_admin((select auth.uid())) THE
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1823:supabase\migrations\20260424040000_phase_2_5_g8_hardening_v3.sql:41:    IF NOT public.is_yagi_admin((select auth.uid())) T
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1834:supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:67:  v_is_admin := public.is_yagi_admin(v_caller);
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1836:supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:120:  IF NOT public.is_yagi_admin(v_caller) THEN
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1840:via is_ws_member / is_yagi_admin
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1842:supabase\migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:72:    public.is_yagi_admin(v_caller)
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1847:src\lib\team-channels\queries.ts:201:    supabase.rpc("is_yagi_admin", { uid: userId }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1848:src\lib\team-channels\queries.ts:202:    supabase.rpc("is_ws_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1849:src\app\[locale]\app\team\[slug]\actions.ts:291:    supabase.rpc("is_yagi_admin", { uid: user.id }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1850:src\app\[locale]\app\team\[slug]\actions.ts:292:    supabase.rpc("is_ws_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1851:src\app\[locale]\app\team\[slug]\actions.ts:561:      const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1854:src\app\[locale]\app\invoices\[id]\actions.ts:42:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1855:src\app\[locale]\app\invoices\[id]\actions.ts:213:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1856:src\app\[locale]\app\invoices\[id]\actions.ts:254:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1857:src\lib\supabase\database.types.ts:2382:      is_ws_admin: { Args: { uid: string; wsid: string }; Returns: boolean }
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1859:src\lib\supabase\database.types.ts:2384:      is_yagi_admin: { Args: { uid: string }; Returns: boolean }
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1860:src\app\[locale]\app\meetings\new\page.tsx:55:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1861:src\app\[locale]\app\showcases\[id]\page.tsx:46:  const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1862:src\app\[locale]\app\showcases\[id]\page.tsx:51:    const { data: wsAdmin } = await supabase.rpc("is_ws_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1863:src\app\[locale]\app\invoices\actions.ts:31:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1864:src\app\[locale]\app\meetings\actions.ts:139:    supabase.rpc("is_ws_admin", { uid, wsid: workspaceId }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1865:src\app\[locale]\app\meetings\actions.ts:140:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1866:src\app\[locale]\app\meetings\actions.ts:348:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1867:src\app\[locale]\app\meetings\actions.ts:349:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1868:src\app\[locale]\app\meetings\actions.ts:409:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1869:src\app\[locale]\app\meetings\actions.ts:410:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1870:src\app\[locale]\app\meetings\actions.ts:623:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1871:src\app\[locale]\app\meetings\actions.ts:624:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1872:src\app\[locale]\app\meetings\actions.ts:727:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1873:src\app\[locale]\app\meetings\actions.ts:728:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1874:src\app\[locale]\app\meetings\actions.ts:799:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1875:src\app\[locale]\app\meetings\actions.ts:800:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1876:src\app\[locale]\app\showcases\page.tsx:65:  const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1877:src\app\[locale]\app\showcases\actions.ts:72:  const { data } = await supabase.rpc("is_yagi_admin", { uid: userId });
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1878:src\app\[locale]\app\showcases\actions.ts:96:  const { data } = await supabase.rpc("is_ws_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1882:src\lib\commission\actions.ts:96:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1883:src\app\[locale]\app\admin\trash\page.tsx:36:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1886:src\app\[locale]\app\projects\[id]\actions.ts:127:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1889:src\components\challenges\header-cta-resolver.tsx:29:  // Check is_yagi_admin via user_roles table
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1890:src\app\[locale]\app\admin\commissions\page.tsx:39:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1893:src\app\[locale]\app\admin\challenges\actions.ts:68:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid:
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1897:src\app\[locale]\app\admin\commissions\[id]\actions.ts:56:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", 
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1899:src\app\[locale]\app\preprod\page.tsx:60:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1901:src\app\[locale]\app\admin\commissions\[id]\page.tsx:29:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1902:src\app\[locale]\app\preprod\[id]\actions.ts:733:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1903:src\app\[locale]\app\preprod\[id]\actions.ts:748:  const { data: isAdmin } = await supabase.rpc("is_ws_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1904:src\app\[locale]\app\preprod\[id]\page.tsx:30:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1906:src\app\[locale]\app\preprod\new\page.tsx:29:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1910:src\app\[locale]\app\admin\challenges\[slug]\judge\actions.ts:14:  const { data } = await supabase.rpc("is_yagi_admin", { 
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1976:ELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1978: TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1980:O authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1982: TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:1983:public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2489:_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2491:_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2515:is_yagi_admin(auth.uid())))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2527:ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2530:ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2608:src\lib\team-channels\queries.ts:201:    supabase.rpc("is_yagi_admin", { uid: userId }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2609:src\lib\team-channels\queries.ts:202:    supabase.rpc("is_ws_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2610:src\lib\commission\actions.ts:96:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2611:src\app\[locale]\app\invoices\actions.ts:31:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2612:src\app\[locale]\app\team\[slug]\actions.ts:291:    supabase.rpc("is_yagi_admin", { uid: user.id }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2613:src\app\[locale]\app\team\[slug]\actions.ts:292:    supabase.rpc("is_ws_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2614:src\app\[locale]\app\team\[slug]\actions.ts:561:      const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2616:src\app\[locale]\app\admin\trash\page.tsx:36:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2624:src\app\[locale]\app\invoices\[id]\actions.ts:42:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2625:src\app\[locale]\app\invoices\[id]\actions.ts:213:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2626:src\app\[locale]\app\invoices\[id]\actions.ts:254:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2629:src\app\[locale]\app\meetings\new\page.tsx:55:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2630:src\app\[locale]\app\meetings\actions.ts:139:    supabase.rpc("is_ws_admin", { uid, wsid: workspaceId }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2631:src\app\[locale]\app\meetings\actions.ts:140:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2633:src\app\[locale]\app\meetings\actions.ts:348:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2634:src\app\[locale]\app\meetings\actions.ts:349:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2635:src\app\[locale]\app\meetings\actions.ts:409:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2636:src\app\[locale]\app\meetings\actions.ts:410:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2638:src\app\[locale]\app\meetings\actions.ts:623:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2639:src\app\[locale]\app\meetings\actions.ts:624:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2640:src\app\[locale]\app\meetings\actions.ts:727:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2641:src\app\[locale]\app\meetings\actions.ts:728:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2642:src\app\[locale]\app\meetings\actions.ts:799:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2643:src\app\[locale]\app\meetings\actions.ts:800:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2644:src\app\[locale]\app\admin\challenges\actions.ts:68:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid:
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2646:src\app\[locale]\app\showcases\[id]\page.tsx:46:  const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2647:src\app\[locale]\app\showcases\[id]\page.tsx:51:    const { data: wsAdmin } = await supabase.rpc("is_ws_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2648:src\app\[locale]\app\showcases\page.tsx:65:  const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2649:src\app\[locale]\app\admin\commissions\[id]\page.tsx:29:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2650:src\app\[locale]\app\showcases\actions.ts:72:  const { data } = await supabase.rpc("is_yagi_admin", { uid: userId });
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2651:src\app\[locale]\app\showcases\actions.ts:96:  const { data } = await supabase.rpc("is_ws_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2654:src\app\[locale]\app\admin\commissions\[id]\actions.ts:56:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", 
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2662:src\app\[locale]\app\admin\commissions\page.tsx:39:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2665:src\app\[locale]\app\preprod\page.tsx:60:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2669:src\app\[locale]\app\admin\challenges\[slug]\judge\actions.ts:14:  const { data } = await supabase.rpc("is_yagi_admin", { 
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2671:src\app\[locale]\app\preprod\[id]\actions.ts:733:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2672:src\app\[locale]\app\preprod\[id]\actions.ts:748:  const { data: isAdmin } = await supabase.rpc("is_ws_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2673:src\app\[locale]\app\preprod\[id]\page.tsx:30:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2683:src\app\[locale]\app\preprod\new\page.tsx:29:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2687:src\app\[locale]\app\projects\[id]\actions.ts:127:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:2879:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:7111:supabase/migrations/20260428000000_phase_2_8_2_projects_soft_delete.sql-58-    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:7123:supabase/migrations/20260428000000_phase_2_8_2_projects_soft_delete.sql-69-      public.is_ws_admin(auth.uid(), workspace_
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:7127:supabase/migrations/20260428000000_phase_2_8_2_projects_soft_delete.sql-72-    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:7130:supabase/migrations/20260428000000_phase_2_8_2_projects_soft_delete.sql-75-    public.is_ws_admin(auth.uid(), workspace_id
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:7132:supabase/migrations/20260428000000_phase_2_8_2_projects_soft_delete.sql-76-    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:7506:_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:7509:_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:7532: ON public.thread_message_attachments AS RESTRICTIVE FOR SELECT TO authenticated USING ((public.is_yagi_admin(auth.uid()) 
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:7546:D ((tm.author_id = auth.uid()) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:7571:D public.is_ws_member(auth.uid(), p.workspace_id) AND ((tm.visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:7594:is_yagi_admin(auth.uid())))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:7617:ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:7621:ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:7980:O authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:7982: TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:7983:public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8001:ELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8003: TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8005:O authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8007: TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8008:public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8126:supabase/migrations/20260426000000_phase_2_8_brief_board.sql:195:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8137:supabase/migrations/20260426000000_phase_2_8_brief_board.sql:211:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8160:supabase/migrations/20260426000000_phase_2_8_brief_board.sql:248:  USING (public.is_yagi_admin((select auth.uid())))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8161:supabase/migrations/20260426000000_phase_2_8_brief_board.sql:249:  WITH CHECK (public.is_yagi_admin((select auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8172:supabase/migrations/20260426000000_phase_2_8_brief_board.sql:265:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8183:supabase/migrations/20260426000000_phase_2_8_brief_board.sql:286:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8194:supabase/migrations/20260426000000_phase_2_8_brief_board.sql:307:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8205:supabase/migrations/20260426000000_phase_2_8_brief_board.sql:324:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8211:supabase/migrations/20260426000000_phase_2_8_brief_board.sql:337:    OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8222:supabase/migrations/20260426000000_phase_2_8_brief_board.sql:390:  v_is_yagi_admin boolean := false;
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8228:supabase/migrations/20260426000000_phase_2_8_brief_board.sql:397:  v_is_yagi_admin := public.is_yagi_admin(v_caller);
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8230:supabase/migrations/20260426000000_phase_2_8_brief_board.sql:399:  IF v_is_yagi_admin THEN
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8257:via is_ws_member / is_yagi_admin
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8275:supabase/migrations/20260427010000_phase_2_8_1_save_brief_version_rpc.sql:72:    public.is_yagi_admin(v_caller)
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8326:-- default in supabase). Explicit auth check via is_ws_member / is_yagi_admin
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8380:    public.is_yagi_admin(v_caller)
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8418:  'DEFINER with explicit is_ws_member / is_yagi_admin authorization mirroring '
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8455:  v_is_yagi_admin boolean := false;
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8462:  v_is_yagi_admin := public.is_yagi_admin(v_caller);
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8464:  IF v_is_yagi_admin THEN
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8922:195-          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8965:286-          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:8985:307-          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:9002:324-          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:9016:ELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:9716: NULL`, but `WITH CHECK` at `:74-77` only checks `is_ws_admin OR is_yagi_admin`. A workspace admin can call Supabase direc
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:9722:t `:67-69`, authorizes only `is_ws_member` / `is_yagi_admin` at `:71-75`, then writes `project_brief_versions` and `projec
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:9770:   `supabase/migrations/20260428000000_phase_2_8_2_projects_soft_delete.sql:65` defines UPDATE `USING` with `deleted_at IS NULL`, but `WITH CHECK` at `:74-77` only checks `is_ws_admin OR is_yagi_admin`. A workspace admin can call Supabase directly with `update({ deleted_at: now })` on an active project. The server action is yagi-only at `src/app/[locale]/app/projects/[id]/actions.ts:134-145`, but RLS is the real floor.
.yagi-autobuild\phase-2-8-2\_codex_review_output.txt:9773:   `supabase/migrations/20260427010000_phase_2_8_1_save_brief_version_rpc.sql:36` runs with BYPASSRLS, reads the project at `:67-69`, authorizes only `is_ws_member` / `is_yagi_admin` at `:71-75`, then writes `project_brief_versions` and `project_briefs` at `:87-99`. It never checks `projects.deleted_at`, so a non-yagi workspace member can still snapshot/bump a trashed project’s brief through the RPC.
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:104:   `is_ws_admin(auth.uid(), workspace_id)` so workspace admins can read
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:189:`requireYagiAdmin()` / inline `is_yagi_admin` RPC for the admin-only
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:1617:  80:     public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:1618:  81:     OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:1633:  96:     public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:1634:  97:     OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:1641: 104:     public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:1642: 105:     OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:1757:  87:     public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:1759:  89:     OR public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:1766:  96:     public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:1778: 108:     public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:1782: 112:     public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:1796: 126:           public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:1798: 128:           OR public.is_ws_admin(auth.uid(), t.workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:1813: 143:           public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:2563: 100:   const { data } = await supabase.rpc("is_yagi_admin", { uid });
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:3770:  35:   const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:4094:icated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:4096:G ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:4104: CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:4108:G ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:4112:G ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:4114: SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:4116:henticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:4121:LECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5760: FUNCTION public\\.is_ws_admin|is_ws_member|is_ws_admin\" supabase/migrations/20260422120000_phase_2_0_baseline.sql supabase/mi
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5770:supabase/migrations/20260422120000_phase_2_0_baseline.sql:151:-- Name: is_ws_admin(uuid, uuid); Type: FUNCTION; Schema: public;
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5772:supabase/migrations/20260422120000_phase_2_0_baseline.sql:154:CREATE FUNCTION public.is_ws_admin(uid uuid, wsid uuid) RETURNS b
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5779:icated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5781:ed USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(a
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5782:uth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5784:_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5786:_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5790:G ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5792:_admin(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5794:_member(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5796: CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5798:G ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5800:G ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5802:s_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5804:s_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5806: DELETE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5808: INSERT WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5810: SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5812: UPDATE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((public.is_yagi_
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5813:admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5817:_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5819:_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5821:min(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5823:min(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5827:min(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5829:min(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5833:s_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5835:s_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5837:ember(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5839:ember(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5841:uthenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5843:henticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5845:uthenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5846:ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5851:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4219:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(au
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5852:th.uid(), p.workspace_id)))))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5853:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4221:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(au
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5856:D public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5861:_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))))
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5864:NSERT WITH CHECK ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5870:PDATE USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admi
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5875:lic.is_ws_member(auth.uid(), p.workspace_id) AND ((tm.visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5880:mber(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5882:mber(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5884:es FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NO
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5885:T NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5887:FOR SELECT TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5889: TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((publi
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5890:c.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5892:s FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5894:LECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5896: public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5898: authenticated USING ((public.is_ws_member(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5900: authenticated USING ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5901:(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5903:s_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5905:AND public.is_ws_admin(auth.uid(), b.workspace_id)))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5909:AND public.is_ws_admin(auth.uid(), b.workspace_id)))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5911:AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5913:er(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5923: AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5928:supabase/migrations\20260422120000_phase_2_0_baseline.sql:151:-- Name: is_ws_admin(uuid, uuid); Type: FUNCTION; Schema: public;
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5930:supabase/migrations\20260422120000_phase_2_0_baseline.sql:154:CREATE FUNCTION public.is_ws_admin(uid uuid, wsid uuid) RETURNS b
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5937:icated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5939:ed USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(a
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5940:uth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5942:_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5944:_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5948:G ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5950:_admin(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5952:_member(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5954: CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5956:G ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5958:G ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5960:s_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5962:s_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5964: DELETE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5966: INSERT WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5968: SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5970: UPDATE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((public.is_yagi_
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5971:admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5975:_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5977:_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5979:min(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5981:min(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5985:min(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5987:min(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5991:s_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5993:s_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5995:ember(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5997:ember(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:5999:uthenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6001:henticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6003:uthenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6004:ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6009:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4219:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(au
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6010:th.uid(), p.workspace_id)))))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6011:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4221:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(au
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6014:D public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6019:_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))))
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6022:NSERT WITH CHECK ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6028:PDATE USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admi
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6033:lic.is_ws_member(auth.uid(), p.workspace_id) AND ((tm.visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6038:mber(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6040:mber(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6042:es FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NO
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6043:T NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6045:FOR SELECT TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6047: TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((publi
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6048:c.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6050:s FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6052:LECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6054: public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6056: authenticated USING ((public.is_ws_member(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6058: authenticated USING ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6059:(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6061:s_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6063:AND public.is_ws_admin(auth.uid(), b.workspace_id)))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6067:AND public.is_ws_admin(auth.uid(), b.workspace_id)))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6069:AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6071:er(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6081: AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6086:supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:33:    public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6087:supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:62:      public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6088:supabase/migrations\20260426000000_phase_2_8_brief_board.sql:10:--   5. RLS policies (per §3.6 — using is_ws_member/is_ws_admin
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6109:s_ws_member / is_yagi_admin
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6115:supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:69:      public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6116:supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:75:    public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6117:supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:10:--     (is_ws_admin(...) OR is_yagi_admin(...))
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6118:supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:21:--   is_ws_member / is_yagi_admin without checking proje
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6120:supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:40:      public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6121:supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:47:      public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6123:supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:89:    OR public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6125:supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:128:          OR public.is_ws_admin(auth.uid(), t.workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6126:supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:80:    public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6128:supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:96:    public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6129:supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:104:    public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6306:+    public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6307:+    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6322:+    public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6323:+    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6330:+    public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6331:+    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6451:+    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6453:+    OR public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6460:+    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6472:+    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6476:+    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6490:+          public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6492:+          OR public.is_ws_admin(auth.uid(), t.workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6507:+          public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6591: 151: -- Name: is_ws_admin(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6594: 154: CREATE FUNCTION public.is_ws_admin(uid uuid, wsid uuid) RETURNS boolean
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6600: 160:     where user_id = uid and workspace_id = wsid and role = 'admin'
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6618: 178: -- Name: is_yagi_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
.yagi-autobuild\phase-2-8-6\_codex_review_output.txt:6621: 181: CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boolean
.yagi-autobuild\archive\phase-2-shipped\phase-2-6\IMPLEMENTATION.md:348:3. As a Creator (profile.role = 'creator'), open scope selector.
.yagi-autobuild\archive\phase-1\phase-1-2-5-spec.md:121:      and (is_ws_member(p.workspace_id) or is_yagi_admin())
.yagi-autobuild\archive\phase-1\phase-1-2-5-spec.md:139:    is_yagi_admin()
.yagi-autobuild\archive\phase-1\phase-1-2-e2e.md:13:  - **Tester B:** yagi_admin role user (account with `user_roles.role = 'yagi_admin'`)
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\DECISION-PACKAGE-AUDIT.md:24:| D3 Workspace-skip privilege for 2.5 Creator/Studio | ⚠ IMPLICIT | §F | DP §F Step 5 redirects to `/u/<handle>` (locale-free, no workspace gate). Implicit decision: 2.5 Creator/Studio do NOT get `user_roles.role='creator'` inserted → no `hasPrivilegedGlobalRole` → redirected to `/onboarding/workspace` if they navigate to `/[locale]/app/*`. **DP does not explicitly document this semantic.** For MVP where their entire surface is locale-free (`/u/<handle>` + `/challenges/*` + `/settings/profile` if also locale-free), this is fine. Worth surfacing. |
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\DECISION-PACKAGE-AUDIT.md:40:| 1 | DP §A implicit semantic "2.5 Creator/Studio get no workspace-skip" not documented. Hidden coupling with layout.tsx:28-29 `hasPrivilegedGlobalRole`. | MED | Add 1-line clarification to DP §A "Decision for 야기" or post-G2 amendment: "Phase 2.5 Creator/Studio do NOT insert `user_roles.role='creator'`. Their product surfaces are locale-free; `/[locale]/app/*` redirects to workspace onboarding remains current behavior." |
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\DECISION-PACKAGE-AUDIT.md:135:| PRE-1 | `Role` in `context.ts` includes 'creator' literal (Phase 1.1); collides with Phase 2.5 `profiles.role='creator'` | ✓ CONFIRMED (side audit earlier this session — `src/lib/app/context.ts:3` + `src/app/[locale]/app/layout.tsx:28-29`) |
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\DECISION-PACKAGE-AUDIT.md:163:| 12 | SPEC v1 §1 scope selector behavior for Observer: "Observers see only their workspace scopes (if any)" — PRE-1 interaction: Observer has `profiles.role='observer'` but may have `user_roles.role='creator'` (legacy Phase 1.1). Double-role consumer would show workspace + hidden profile. Worth clarifying whether legacy 'creator' role grants profile scope visibility. | LOW | SPEC v1.1 amend §1 note: "Observer with legacy user_roles.role='creator' is a hybrid edge case; treat per Phase 1.1 semantics (workspace-skip entitlement only, no profile scope surfaced)." |
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G0_CODEX_REVIEW.md:73:- §159 (G1 Task 1 ALTER profiles): adds `role`, `handle`, `instagram_handle`, `bio`, `avatar_url`, `role_switched_at`. **Missing: `handle_changed_at`.**
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G0_CODEX_REVIEW.md:79:2. Revise Q7 to use `role_switched_at`-style separate column or derive from audit table. Larger SPEC surgery.
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\FOLLOWUPS.md:58:**Risk**: Phase 2.5 `/admin/challenges/*` routes unusable without a live `user_roles` row with `role='yagi_admin'`.
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\FOLLOWUPS.md:137:**Risk**: `auth_rls_initplan` advisor flagged 14 WARNs across Phase 2.5 RLS policies. Each row-eval of `auth.uid()` / `is_yagi_admin(auth.uid())` wastes a function call. At scale (>10k rows scanned per query), the per-row re-evaluation materially degrades p50/p95 latency.
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\FOLLOWUPS.md:140:- creators (`creators_insert_self`, `creators_update_self`)
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\FOLLOWUPS.md:141:- studios (`studios_insert_self`, `studios_update_self`)
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\FOLLOWUPS.md:186:JOIN public.profiles p ON p.id = c.id AND p.role = 'creator';
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\FOLLOWUPS.md:190:JOIN public.profiles p ON p.id = s.id AND p.role = 'studio';
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\FOLLOWUPS.md:203:**Risk**: Phase 2.5 G1 hardening v2 §2 moved `created_at` immutability enforcement to the head of the `tg_challenge_submissions_guard_self_mutation` trigger, applying to ALL roles. Triggers are NOT RLS-bypassable, so service_role INSERTs with arbitrary `created_at` will be silently swallowed by the trigger on any subsequent UPDATE, and backfills that rely on UPDATE paths will be blocked.
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-ENTRY-DECISION-PACKAGE.md:20:Phase 2.5 G1 introduced `profiles.role IN ('creator','studio','observer')`,
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-ENTRY-DECISION-PACKAGE.md:23:`user_roles.role IN ('yagi_admin','workspace_admin','workspace_member','creator')`.
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-ENTRY-DECISION-PACKAGE.md:27:- `user_roles.role='creator'` is currently used in `src/app/[locale]/app/layout.tsx`
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-ENTRY-DECISION-PACKAGE.md:32:- `profiles.role='creator'` (Phase 2.5) is the AI Creator persona who
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-ENTRY-DECISION-PACKAGE.md:126:Phase 2.5 Creator/Studio personas do NOT insert `user_roles.role='creator'`
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-ENTRY-DECISION-PACKAGE.md:132:  `user_roles.role='creator'` will, if they navigate to `/[locale]/app/*`,
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-ENTRY-DECISION-PACKAGE.md:137:- The Phase 1.1 `user_roles.role='creator'` literal remains reserved for the
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-ENTRY-DECISION-PACKAGE.md:141:- A user CAN simultaneously hold Phase 1.1 `user_roles.role='creator'` (legacy
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-ENTRY-DECISION-PACKAGE.md:142:  workspace-skip) AND Phase 2.5 `profiles.role='creator'` (Challenge Platform persona).
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G2-auth-flow.md:70:**Collision:** Phase 1.1 `user_roles.role` uses literal `'creator'` (privileged global role — lets user skip workspace setup). Phase 2.5 G1 (commit 58dbf6e) added `profiles.role IN ('creator','studio','observer')` (challenge persona type). **Same TypeScript literal, two tables, two meanings.**
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G2-auth-flow.md:75:- `src/lib/onboarding/actions.ts:30-34` — signup INSERTs `user_roles` with `role='creator'` for Phase 1.1 creators
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G2-auth-flow.md:81:- `src/lib/onboarding/actions.ts:13` hardcodes `"client" | "creator"` — must be updated to 3-role world, and **must decide: does a Phase 2.5 Creator/Studio/Observer signup ALSO INSERT `user_roles.role='creator'`?** If yes, the `hasPrivilegedGlobalRole` gate now grants workspace-skip to every new 2.5 signup, which may or may not be intended. If no, Phase 1.1 "client" users lose the workspace-skip privilege — breaking change.
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G2-auth-flow.md:94:**Option B — Drop `user_roles.role='creator'` (breaking change)**
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G2-auth-flow.md:95:- Migration: DELETE `user_roles` rows with role='creator', or UPDATE to new literal (`'legacy_global_creator'`?)
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G2-auth-flow.md:100:**Option C — Rename Phase 2.5 `profiles.role='creator'` → `'ai_creator'` (or `'individual'`)**
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G2-auth-flow.md:109:- `src/lib/onboarding/actions.ts:13` — role union `"client" | "creator"` is **already wrong** relative to SPEC §1.2 (no 'client' role in Phase 2.5). G2 fix required.
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G2-auth-flow.md:133:- Existing Phase 1.1 users with `user_roles.role='creator'` must NOT break.
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G2-auth-flow.md:142:3. **Workspace-skip privilege for Phase 2.5 Creator/Studio** — should a fresh Creator sign-up get `hasPrivilegedGlobalRole` treatment (skip workspace onboarding)? Currently the layout redirects to `/onboarding/workspace` unless privileged. If 2.5 Creators/Studios skip workspace onboarding, `user_roles.role='creator'` INSERT must happen alongside `profiles.role` INSERT.
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:30:   `NOT public.is_ws_admin(...)`.
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:38:   `setSupportThreadStatus()` action also gained an is_yagi_admin
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:171:   `is_ws_admin(auth.uid(), workspace_id)` so workspace admins can read
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:256:`requireYagiAdmin()` / inline `is_yagi_admin` RPC for the admin-only
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1175:otification\\|actorId\\|is_yagi_admin\\|notification_events\" g-b-6-features -- src/app/[locale]/app/support/actions.ts" in C:\
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1205:FOR INSERT WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1209:FOR UPDATE USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1272:g-b-6-features:src/app/[locale]/app/support/actions.ts:144:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1373:  88:     public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1374:  89:     OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1382:  97:     public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1383:  98:     OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1398: 113:     public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1401: 116:       AND NOT public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1420: 135:           public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1423: 138:             AND NOT public.is_ws_admin(auth.uid(), t.workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1436: 151:     public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1440: 155:     public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1463: 178:      AND NOT public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1557:  80:     public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1558:  81:     OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1573:  96:     public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1574:  97:     OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1581: 104:     public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1582: 105:     OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1697:  87:     public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1699:  89:     OR public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1706:  96:     public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1718: 108:     public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1722: 112:     public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1736: 126:           public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1738: 128:           OR public.is_ws_admin(auth.uid(), t.workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1753: 143:           public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:1997: 144:   const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:2180: 100:   const { data } = await supabase.rpc("is_yagi_admin", { uid });
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:3316: 139:     supabase.rpc("is_ws_admin", { uid, wsid: workspaceId }),
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:3317: 140:     supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:3716:  35:   const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:4772: 151:     public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:4776: 155:     public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:4799: 178:      AND NOT public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:4816: 135:           public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:4819: 138:             AND NOT public.is_ws_admin(auth.uid(), t.workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:4830:  87:     public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:4832:  89:     OR public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:4839:  96:     public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:4851: 108:     public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:4855: 112:     public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:4869: 126:           public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:4871: 128:           OR public.is_ws_admin(auth.uid(), t.workspace_id)
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:4889: `support_messages_insert` still allows posting because it only checks `t.client_id = auth.uid()` and `NOT is_ws_admin(...)` at
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:4928:A direct authenticated Supabase client can update their own `support_threads.workspace_id` to another workspace id. After that, `support_messages_insert` still allows posting because it only checks `t.client_id = auth.uid()` and `NOT is_ws_admin(...)` at `supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:126-142`, not workspace membership. Target workspace admins can then read that injected thread/messages via the workspace-admin SELECT lane in `supabase/migrations/20260428050000_phase_2_8_6_support_chat.sql:84-90` and `:118-130`.
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop3.txt:30:  USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop3.txt:31:  WITH CHECK (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-2-8-6\_codex_review_output_loop3.txt:41:    is_yagi_admin RPC + RLS yagi_admin lane)
.yagi-autobuild\archive\phase-2-shipped\phase-2-7\REFERENCES.md:30:- `user_roles` (yagi_admin role reused via `is_yagi_admin()`)
.yagi-autobuild\archive\phase-2-shipped\phase-2-7\SPEC.md:133:ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
.yagi-autobuild\archive\phase-2-shipped\phase-2-7\SPEC.md:134:ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
.yagi-autobuild\archive\phase-2-shipped\phase-2-7\SPEC.md:135:  CHECK (role IN ('creator','studio','observer','client'));
.yagi-autobuild\archive\phase-2-shipped\phase-2-7\SPEC.md:210:  USING (id = (select auth.uid()) OR public.is_yagi_admin((select auth.uid())));
.yagi-autobuild\archive\phase-2-shipped\phase-2-7\SPEC.md:216:  USING (id = (select auth.uid()) OR public.is_yagi_admin((select auth.uid())))
.yagi-autobuild\archive\phase-2-shipped\phase-2-7\SPEC.md:217:  WITH CHECK (id = (select auth.uid()) OR public.is_yagi_admin((select auth.uid())));
.yagi-autobuild\archive\phase-2-shipped\phase-2-7\SPEC.md:225:    OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\archive\phase-2-shipped\phase-2-7\SPEC.md:233:      WHERE p.id = (select auth.uid()) AND p.role = 'client'
.yagi-autobuild\archive\phase-2-shipped\phase-2-7\SPEC.md:244:  USING (public.is_yagi_admin((select auth.uid())));
.yagi-autobuild\phase-2-8-6\_codex_review_prompt.md:85:   `is_ws_admin(auth.uid(), workspace_id)` so workspace admins can read
.yagi-autobuild\phase-2-8-6\_codex_review_prompt.md:170:`requireYagiAdmin()` / inline `is_yagi_admin` RPC for the admin-only
.yagi-autobuild\phase-2-8-1\_codex_review_prompt.md:54:   `is_yagi_admin(v_caller)` / `is_ws_member(v_caller, ws_id)` checks
.yagi-autobuild\phase-2-8-1\_codex_review_prompt.md:104:3. **convertCommissionToProject**: server action checks is_yagi_admin
.yagi-autobuild\phase-2-8-6\_codex_review_prompt_loop2.md:11:   `NOT public.is_ws_admin(...)`.
.yagi-autobuild\phase-2-8-6\_codex_review_prompt_loop2.md:19:   `setSupportThreadStatus()` action also gained an is_yagi_admin
.yagi-autobuild\phase-2-8-6\_codex_review_prompt_loop3.md:11:  USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-2-8-6\_codex_review_prompt_loop3.md:12:  WITH CHECK (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-2-8-6\_codex_review_prompt_loop3.md:22:    is_yagi_admin RPC + RLS yagi_admin lane)
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G3-ENTRY-DECISION-PACKAGE.md:100:| Signed in, `profile.role IN (creator,studio)` | **작품 올리기** | first open challenge's submit page, or `/challenges` if none open |
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G3-ENTRY-DECISION-PACKAGE.md:102:| Signed in, `is_yagi_admin` | **새 챌린지** | `/admin/challenges/new` |
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G3-ENTRY-DECISION-PACKAGE.md:263:| `open` + auth + role IN (creator,studio) | **작품 올리기** | → `/challenges/[slug]/submit` |
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G3-ENTRY-DECISION-PACKAGE.md:419:| Signed in, role IN (creator,studio,observer) | Visible, default | API call (RLS allows) |
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:25:   `(is_ws_admin OR is_yagi_admin)`. Tightened to mirror USING:
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:26:   `(is_ws_admin AND deleted_at IS NULL) OR is_yagi_admin`. Migration
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:30:   with an early `IF v_deleted_at IS NOT NULL AND NOT is_yagi_admin
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:129:    is_yagi_admin(auth.uid())`. Verify:
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:135:2. **Soft-delete write path.** projects_update uses `(is_ws_admin AND
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:136:   deleted_at IS NULL) OR is_yagi_admin` for USING; CHECK is `is_ws_admin
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:137:   OR is_yagi_admin`. Confirm:
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:162:helper ??supabase.rpc("is_yagi_admin", { uid }).
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:780:  58:     OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:791:  69:       public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:794:  72:     OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:797:  75:     public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:798:  76:     OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:879:  10: --     (is_ws_admin(...) OR is_yagi_admin(...))
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:890:  21: --   is_ws_member / is_yagi_admin without checking projects.deleted_at.
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:909:  40:       public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:912:  43:     OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:916:  47:       public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:919:  50:     OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:966:  97:     public.is_yagi_admin(v_caller)
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:972: 103:   IF v_deleted_at IS NOT NULL AND NOT public.is_yagi_admin(v_caller) THEN
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1032:OR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1034:rands TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHE
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1035:CK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1039:.invoice_line_items USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1043:nts ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (status <> 'draft'::text)));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1045:ts ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (is_mock = false)));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1047:ices FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1049:ices FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1051:ices FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1057:ings FOR INSERT WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1059:ings FOR SELECT USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1061:ings FOR UPDATE USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1075:c.preprod_boards FOR DELETE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1077:c.preprod_boards FOR INSERT WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id))
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1080:c.preprod_boards FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1082:c.preprod_boards FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id))) WIT
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1083:H CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1109:.projects FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1111:ects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.ui
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1116:ts FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())))
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1121:ects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1122:) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1132:ublic.showcases FOR DELETE USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1134:ublic.showcases FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1136:ublic.showcases FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1138:ublic.showcases FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1140:lic.supplier_profile FOR SELECT USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1142:lic.supplier_profile FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1148:N public.team_channel_messages FOR DELETE USING (((author_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1156:.team_channels FOR INSERT WITH CHECK ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), worksp
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1157:ace_id) OR public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1160:id) OR public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1162:.team_channels FOR UPDATE USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_i
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1163:d) OR public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1177:lic.is_yagi_admin(auth.uid()) OR (author_id = auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1183:.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1185: ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'creator'::text) AND (wo
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1188:n ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1189:) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1191:c.user_roles TO authenticated USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1195:paces FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1197:rkspace_invitations FOR SELECT TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_adm
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1200:orkspace_invitations TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.ui
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1201:d()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1203:lic.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_a
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1206:space_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(au
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1209:ublic.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (N
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1212:spaces FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1214:spaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid()))) WITH C
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1215:HECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1232:l" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(a
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1235: ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(aut
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1245:rage.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1248:ge.objects FOR SELECT TO authenticated USING (((bucket_id = 'showcase-media'::text) AND (public.is_yagi_admin(auth.uid()) 
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1251:rage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1254:age.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.ui
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1257:e.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1259:e.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1261:.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())))
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1276: OR public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1293:g-b-2-redesign:supabase/migrations/20260423030000_phase_2_5_challenge_platform.sql:244:CREATE POLICY creators_update_self 
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1299:g-b-2-redesign:supabase/migrations/20260423030000_phase_2_5_challenge_platform.sql:268:CREATE POLICY studios_update_self O
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1327:g-b-2-redesign:supabase/migrations/20260423030001_phase_2_5_g1_hardening.sql:132:CREATE POLICY creators_update_self ON pub
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1329:g-b-2-redesign:supabase/migrations/20260423030001_phase_2_5_g1_hardening.sql:150:CREATE POLICY studios_update_self ON publ
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:1609: 127:   const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:2880:  36:   const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:5702:g-b-2-redesign:supabase/migrations/20260428030000_phase_2_8_2_hardening_loop_1.sql:21:--   is_ws_member / is_yagi_admin wi
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:5714:OT public.is_yagi_admin(v_caller) THEN
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:6356:.projects FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:6358:ects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.ui
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:6361:ts FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())))
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:6364:ects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:6365:) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:7905: 195:           OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:7921: 211:           OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:7958: 248:   USING (public.is_yagi_admin((select auth.uid())))
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:7959: 249:   WITH CHECK (public.is_yagi_admin((select auth.uid())));
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:7975: 265:           OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:7996: 286:           OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:8975: 307:           OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:8992: 324:           OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:9005: 337:     OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G4-submission-flow.md:87:- Requires `profiles.role IN ('creator','studio')`.
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G4-submission-flow.md:144:| Integration | RLS INSERT policy on `challenge_submissions` — role IN (creator,studio) + challenge state='open' + own submitter_id | Direct supabase anon/authed clients |
.yagi-autobuild\phase-2-8-2\_codex_review_prompt.md:52:    is_yagi_admin(auth.uid())`. Verify:
.yagi-autobuild\phase-2-8-2\_codex_review_prompt.md:58:2. **Soft-delete write path.** projects_update uses `(is_ws_admin AND
.yagi-autobuild\phase-2-8-2\_codex_review_prompt.md:59:   deleted_at IS NULL) OR is_yagi_admin` for USING; CHECK is `is_ws_admin
.yagi-autobuild\phase-2-8-2\_codex_review_prompt.md:60:   OR is_yagi_admin`. Confirm:
.yagi-autobuild\phase-2-8-2\_codex_review_prompt.md:85:helper — supabase.rpc("is_yagi_admin", { uid }).
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G3-TASK-PLAN.md:75:        is_yagi_admin → "새 챌린지" → /admin/challenges/new
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:760:  v_is_admin := is_yagi_admin(v_caller_id);
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:855:  v_is_admin := is_yagi_admin(v_caller_id);
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:943:  v_is_admin := is_yagi_admin(v_caller_id);
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:1582:49:  v_is_admin := is_yagi_admin(v_caller_id);
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:1667:144:  v_is_admin := is_yagi_admin(v_caller_id);
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:1745:232:  v_is_admin := is_yagi_admin(v_caller_id);
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:1815:309:  v_is_admin := is_yagi_admin(v_caller_id);
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2542:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "toggle_project_board_lock|is_yagi_admin|project_boards|owner_id|created_by|CREATE POLICY|POLICY" s
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2705:supabase/migrations\20260422120000_phase_2_0_baseline.sql:178:-- Name: is_yagi_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2706:supabase/migrations\20260422120000_phase_2_0_baseline.sql:181:CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boolean
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2736:ace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2738:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3722:CREATE POLICY brands_write_admin ON public.brands TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_i
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2739:d) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2747:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3740:CREATE POLICY invoice_items_modify ON public.invoice_line_items USING (public.is_yagi_admin(auth.uid())) WITH CHECK (
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2748:public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2751:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3749:  WHERE ((i.id = invoice_line_items.invoice_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2760:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3782:CREATE POLICY invoices_insert ON public.invoices FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2762:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3789:CREATE POLICY invoices_select ON public.invoices FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2765:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3796:CREATE POLICY invoices_update ON public.invoices FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (publ
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2766:ic.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2769:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3811:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_admin(auth.uid(), m.workspace_id) OR public.is_yagi_
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2776:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3833:CREATE POLICY meetings_insert ON public.meetings FOR INSERT WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2777: OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2780:public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2782:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3847:CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING ((public.is_ws_admin(auth.uid(), workspace_id) OR p
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2783:ublic.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2788:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3858:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2803:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3924:CREATE POLICY preprod_boards_delete ON public.preprod_boards FOR DELETE USING ((public.is_yagi_admin(auth.uid()) OR p
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2804:ublic.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2806:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3931:CREATE POLICY preprod_boards_insert ON public.preprod_boards FOR INSERT WITH CHECK ((public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2807: OR public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2809:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3938:CREATE POLICY preprod_boards_select ON public.preprod_boards FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR p
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2812:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3945:CREATE POLICY preprod_boards_update ON public.preprod_boards FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR p
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2813:ublic.is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2816:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3954:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.u
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2820:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3963:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.ui
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2822:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3965:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.ui
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2826:supabase/migrations\20260422120000_phase_2_0_baseline.sql:3992:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.w
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2830:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4001:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.w
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2834:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4010:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2838:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4019:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.w
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2840:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4021:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.w
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2844:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4030:  WHERE ((b.id = preprod_frame_reactions.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2866:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4116:CREATE POLICY projects_delete_yagi ON public.projects FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.ui
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2869:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4123:CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2870:(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2873:rkspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2875:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4137:CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), w
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2876:orkspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2879:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4152:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2882:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4161:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2885:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4170:  WHERE ((s.id = showcase_media.showcase_id) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2888:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4181:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2890:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4194:CREATE POLICY showcases_delete_internal ON public.showcases FOR DELETE USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2892:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4201:CREATE POLICY showcases_insert_internal ON public.showcases FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2894:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4208:CREATE POLICY showcases_select_internal ON public.showcases FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (E
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2897:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4217:CREATE POLICY showcases_update_internal ON public.showcases FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR (E
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2899:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4219:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id)))))) WITH CHECK ((public.is
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2902:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4234:CREATE POLICY supplier_profile_select ON public.supplier_profile FOR SELECT USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2904:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4241:CREATE POLICY supplier_profile_update ON public.supplier_profile FOR UPDATE USING (public.is_yagi_admin(auth.uid())) 
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2905:WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2912:lic.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2915:) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2922:ember(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2928:ce_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2931:) AND (public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2934:) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2938:ELECT TO authenticated USING ((public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2942:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4355:  WHERE ((tm.id = thread_message_attachments.message_id) AND ((tm.author_id = auth.uid()) OR public.is_yagi_admin(aut
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2951:.visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2956: 'shared'::text) OR ((visibility = 'internal'::text) AND public.is_yagi_admin(auth.uid())))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2959:ated USING (((visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()) OR (author_id = auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2970: public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2973: auth.uid()) AND (role = 'creator'::text) AND (workspace_id IS NULL)));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2976:= auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2978:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4454:CREATE POLICY user_roles_yagi_admin ON public.user_roles TO authenticated USING (public.is_yagi_admin(auth.uid())) WI
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2979:TH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2983:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4486:CREATE POLICY ws_delete_yagi ON public.workspaces FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2987:n(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2989:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4500:CREATE POLICY ws_inv_write_admin ON public.workspace_invitations TO authenticated USING ((public.is_ws_admin(auth.uid
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2990:(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2993:min(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2996:h.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:2999:d = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3000:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4523:  WHERE (m.workspace_id = workspace_members.workspace_id))))) OR public.is_ws_admin(auth.uid(), workspace_id) OR publ
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3001:ic.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3004:, id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3006:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4537:CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(),
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3007: id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3031:reprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3034:prod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3037:= 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3042:OR public.is_yagi_admin(auth.uid())))))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3050:edia'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3053:ia'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3056:edia'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3059:se-media'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3062::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3065::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3068:og'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3078:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4752:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND (public.is_ws_admin(auth.uid(), p.workspace_id) 
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3079:OR public.is_yagi_admin(auth.uid())))))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3085:USING (((bucket_id <> 'thread-attachments'::text) OR public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3095:supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:34:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3097:supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:48:        AND public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3099:supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:63:      OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3102:supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:85:    AND public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3104:supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:96:    AND public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3111:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:244:CREATE POLICY creators_update_self ON public.creators
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3114:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:268:CREATE POLICY studios_update_self ON public.studios
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3116:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:275:  FOR SELECT USING (state <> 'draft' OR public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3118:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:278:  FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3120:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:281:  FOR UPDATE USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3121:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:282:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3123:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:285:  FOR DELETE USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3124:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:288:-- owner UPDATE until closed; admin read/update via is_yagi_admin.
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3129:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:323:  FOR UPDATE USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3130:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:324:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3134:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:345:  FOR ALL USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3135:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:346:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3138:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:355:  FOR ALL USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3139:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:356:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3140:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:11:--        trigger; admin bypasses via is_yagi_admin.
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3142:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:58:  IF public.is_yagi_admin(auth.uid()) THEN
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3143:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:131:DROP POLICY IF EXISTS creators_update_self ON public.creators;
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3144:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:132:CREATE POLICY creators_update_self ON public.creators
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3145:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:149:DROP POLICY IF EXISTS studios_update_self ON public.studios;
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3146:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:150:CREATE POLICY studios_update_self ON public.studios
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3149:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:263:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3153:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:270:  USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3154:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:272:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3157:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:279:  USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3158:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:281:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3161:supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:37:  USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3163:supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:42:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3165:supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:48:  USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3166:supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:49:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3168:supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:53:  USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3171:supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:61:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3173:supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:67:  USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3174:supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:68:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3176:supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:72:  USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3177:supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:94:  IF public.is_yagi_admin(auth.uid()) THEN
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3182:supabase/migrations\20260424000000_phase_2_5_g2_handle_history.sql:53:  USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3187:supabase/migrations\20260424020000_phase_2_5_g8_hardening.sql:37:  USING (public.is_yagi_admin((select auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3191:supabase/migrations\20260424020000_phase_2_5_g8_hardening.sql:53:  USING (public.is_yagi_admin((select auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3192:supabase/migrations\20260424020000_phase_2_5_g8_hardening.sql:123:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3198:supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:49:  v_is_admin := is_yagi_admin(v_caller_id);
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3204:supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:144:  v_is_admin := is_yagi_admin(v_caller_id);
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3209:supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:232:  v_is_admin := is_yagi_admin(v_caller_id);
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3214:supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:309:  v_is_admin := is_yagi_admin(v_caller_id);
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3229:supabase/migrations\20260429113853_phase_3_1_project_board.sql:47:    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3232:supabase/migrations\20260429113853_phase_3_1_project_board.sql:63:    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3233:supabase/migrations\20260429113853_phase_3_1_project_board.sql:75:    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3235:supabase/migrations\20260429113853_phase_3_1_project_board.sql:95:    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3239:supabase/migrations\20260429113853_phase_3_1_project_board.sql:166:  IF NOT is_yagi_admin(auth.uid()) THEN
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3243:supabase/migrations\20260429113853_phase_3_1_project_board.sql:193:  IF NOT is_yagi_admin(auth.uid()) THEN
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3251:supabase/migrations\20260428070000_phase_2_8_6_review_loop_2.sql:33:  USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3252:supabase/migrations\20260428070000_phase_2_8_6_review_loop_2.sql:34:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3254:supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:41:--   gains an is_yagi_admin guard in the same review loop.)
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3258:supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:89:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3260:supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:98:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3264:supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:113:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3267:supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:135:          public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3270:supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:151:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3271:supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:155:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3272:supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:178:     AND NOT public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3275:supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:87:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3278:supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:96:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3281:supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:108:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3282:supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:112:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3285:supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:126:          public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3288:supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:143:          public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3289:src\lib\commission\actions.ts:96:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3294:supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:81:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3298:supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:97:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3300:supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:105:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3302:supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:10:--     (is_ws_admin(...) OR is_yagi_admin(...))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3303:supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:21:--   is_ws_member / is_yagi_admin without checking projects.deleted_at.
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3307:supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:43:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3308:supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:50:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3309:supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:97:    public.is_yagi_admin(v_caller)
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3310:supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:103:  IF v_deleted_at IS NOT NULL AND NOT public.is_yagi_admin(v_caller) THEN
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3315:supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:58:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3318:supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:72:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3319:supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:76:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3320:supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:4:-- Finding: projects_insert policy WITH CHECK was (is_ws_admin OR is_yagi_admin)
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3323:supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:32:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3325:supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:38:  'project submissions. is_yagi_admin path preserved for admin console creates.';
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3329:supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:382:  v_is_yagi_admin      boolean;
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3330:supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:394:  v_is_yagi_admin := public.is_yagi_admin(v_actor_id);
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3333:supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:416:  IF v_is_yagi_admin THEN
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3334:supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:426:  IF v_actor_role = 'client' AND v_actor_id <> v_created_by THEN
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3335:supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:503:--   AND NOT is_yagi_admin(auth.uid())  -- yagi_admin admin console escape hatch
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3336:supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:514:--   - yagi_admin: bypassed via is_yagi_admin() check for emergency fixes.
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3337:supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:539:  IF public.is_yagi_admin(auth.uid()) THEN
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3343:supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:584:  USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3354:supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:628:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3369:supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:706:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3371:supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:720:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3373:supabase/migrations\20260427020000_phase_2_8_1_commission_convert.sql:67:  v_is_admin := public.is_yagi_admin(v_caller);
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3374:supabase/migrations\20260427020000_phase_2_8_1_commission_convert.sql:120:  IF NOT public.is_yagi_admin(v_caller) THEN
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3376:supabase/migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:18:-- default in supabase). Explicit auth check via is_ws_member / is_yagi_admin
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3377:supabase/migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:72:    public.is_yagi_admin(v_caller)
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3379:supabase/migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:110:  'DEFINER with explicit is_ws_member / is_yagi_admin authorization mirroring '
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3386:supabase/migrations\20260426000000_phase_2_8_brief_board.sql:195:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3389:supabase/migrations\20260426000000_phase_2_8_brief_board.sql:211:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3394:supabase/migrations\20260426000000_phase_2_8_brief_board.sql:248:  USING (public.is_yagi_admin((select auth.uid())))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3395:supabase/migrations\20260426000000_phase_2_8_brief_board.sql:249:  WITH CHECK (public.is_yagi_admin((select auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3398:supabase/migrations\20260426000000_phase_2_8_brief_board.sql:265:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3403:supabase/migrations\20260426000000_phase_2_8_brief_board.sql:286:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3406:supabase/migrations\20260426000000_phase_2_8_brief_board.sql:307:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3409:supabase/migrations\20260426000000_phase_2_8_brief_board.sql:324:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3412:supabase/migrations\20260426000000_phase_2_8_brief_board.sql:337:    OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3415:supabase/migrations\20260426000000_phase_2_8_brief_board.sql:390:  v_is_yagi_admin boolean := false;
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3416:supabase/migrations\20260426000000_phase_2_8_brief_board.sql:397:  v_is_yagi_admin := public.is_yagi_admin(v_caller);
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3417:supabase/migrations\20260426000000_phase_2_8_brief_board.sql:399:  IF v_is_yagi_admin THEN
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3421:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:145:    OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3426:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:168:    OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3427:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:172:    OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3430:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:188:    OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3437:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:235:  USING (public.is_yagi_admin((select auth.uid())))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3438:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:236:  WITH CHECK (public.is_yagi_admin((select auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3439:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:263:  v_is_admin := public.is_yagi_admin(v_caller);
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3440:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:337:  IF public.is_yagi_admin(v_caller) THEN
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3441:src\components\challenges\header-cta-resolver.tsx:29:  // Check is_yagi_admin via user_roles table
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3442:supabase/migrations\20260424040000_phase_2_5_g8_hardening_v3.sql:41:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3443:supabase/migrations\20260424030000_phase_2_5_g8_hardening_v2.sql:44:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3485:src\lib\supabase\database.types.ts:2663:      is_yagi_admin: { Args: { uid: string }; Returns: boolean }
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3488:src\lib\team-channels\queries.ts:201:    supabase.rpc("is_yagi_admin", { uid: userId }),
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3489:src\app\[locale]\app\invoices\actions.ts:31:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3491:src\app\[locale]\app\meetings\actions.ts:140:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3493:src\app\[locale]\app\meetings\actions.ts:351:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3494:src\app\[locale]\app\meetings\actions.ts:412:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3495:src\app\[locale]\app\meetings\actions.ts:632:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3496:src\app\[locale]\app\meetings\actions.ts:736:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3497:src\app\[locale]\app\meetings\actions.ts:808:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3498:src\app\[locale]\app\meetings\request-actions.ts:100:  const { data } = await supabase.rpc("is_yagi_admin", { uid });
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3504:src\app\[locale]\app\admin\challenges\actions.ts:68:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3506:src\app\[locale]\app\meetings\new\page.tsx:55:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3507:src\app\[locale]\app\admin\trash\page.tsx:36:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3508:src\app\[locale]\app\invoices\[id]\line-item-actions.ts:46:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3509:src\app\[locale]\app\admin\commissions\page.tsx:39:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3510:src\app\[locale]\app\invoices\[id]\actions.ts:42:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3511:src\app\[locale]\app\invoices\[id]\actions.ts:213:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3512:src\app\[locale]\app\invoices\[id]\actions.ts:254:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3519:src\app\[locale]\app\admin\support\page.tsx:35:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3520:src\app\[locale]\app\team\[slug]\actions.ts:291:    supabase.rpc("is_yagi_admin", { uid: user.id }),
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3522:src\app\[locale]\app\team\[slug]\actions.ts:561:      const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3523:src\app\[locale]\app\admin\commissions\[id]\actions.ts:56:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3524:src\app\[locale]\app\support\actions.ts:144:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3531:src\app\[locale]\app\admin\commissions\[id]\page.tsx:29:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3532:src\app\[locale]\app\preprod\page.tsx:60:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3533:src\app\[locale]\app\showcases\actions.ts:72:  const { data } = await supabase.rpc("is_yagi_admin", { uid: userId });
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3535:src\app\[locale]\app\showcases\page.tsx:65:  const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3536:src\app\[locale]\app\admin\challenges\[slug]\announce\actions.ts:30:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3537:src\app\[locale]\app\admin\challenges\[slug]\judge\actions.ts:14:  const { data } = await supabase.rpc("is_yagi_admin", { uid: userId });
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3538:src\app\[locale]\app\preprod\new\page.tsx:29:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3549:src\app\[locale]\app\preprod\[id]\actions.ts:733:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3550:src\app\[locale]\app\projects\[id]\actions.ts:127:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3551:src\app\[locale]\app\preprod\[id]\page.tsx:30:    supabase.rpc("is_yagi_admin", { uid }),
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3552:src\app\[locale]\app\showcases\[id]\page.tsx:46:  const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3591:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -C 8 \"CREATE FUNCTION public.is_yagi_admin|CREATE FUNCTION is_yagi_admin|is_yagi_admin\\(\" supaba
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3878:supabase/migrations/20260422120000_phase_2_0_baseline.sql:178:-- Name: is_yagi_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3881:supabase/migrations/20260422120000_phase_2_0_baseline.sql:181:CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boolean
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3885:supabase/migrations/20260422120000_phase_2_0_baseline.sql-185-  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3900:ace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3907:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3722:CREATE POLICY brands_write_admin ON public.brands TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_i
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3908:d) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3928:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3740:CREATE POLICY invoice_items_modify ON public.invoice_line_items USING (public.is_yagi_admin(auth.uid())) WITH CHECK (
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3929:public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3938:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3749:  WHERE ((i.id = invoice_line_items.invoice_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3973:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3782:CREATE POLICY invoices_insert ON public.invoices FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3980:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3789:CREATE POLICY invoices_select ON public.invoices FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3988:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3796:CREATE POLICY invoices_update ON public.invoices FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (publ
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:3989:ic.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4004:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3811:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_admin(auth.uid(), m.workspace_id) OR public.is_yagi_
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4028:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3833:CREATE POLICY meetings_insert ON public.meetings FOR INSERT WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4029: OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4037:public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4044:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3847:CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING ((public.is_ws_admin(auth.uid(), workspace_id) OR p
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4045:ublic.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4057:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3858:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4076:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3924:CREATE POLICY preprod_boards_delete ON public.preprod_boards FOR DELETE USING ((public.is_yagi_admin(auth.uid()) OR p
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4077:ublic.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4084:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3931:CREATE POLICY preprod_boards_insert ON public.preprod_boards FOR INSERT WITH CHECK ((public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4085: OR public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4092:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3938:CREATE POLICY preprod_boards_select ON public.preprod_boards FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR p
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4101:, id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4108:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4537:CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(),
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4109: id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4148:reprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4150:supabase/migrations/20260422120000_phase_2_0_baseline.sql-4628-  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_admin(auth.uid(), b.workspace_id))))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4159:prod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4170:= 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4172:supabase/migrations/20260422120000_phase_2_0_baseline.sql-4646-  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_admin(auth.uid(), b.workspace_id))))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4184:OR public.is_yagi_admin(auth.uid())))))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4215:edia'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4223:ia'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4235:edia'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4243:se-media'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4251::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4259::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4267:og'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4287:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4752:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND (public.is_ws_admin(auth.uid(), p.workspace_id) 
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4288:OR public.is_yagi_admin(auth.uid())))))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4307:USING (((bucket_id <> 'thread-attachments'::text) OR public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4581:supabase/migrations/20260422120000_phase_2_0_baseline.sql:178:-- Name: is_yagi_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4584:supabase/migrations/20260422120000_phase_2_0_baseline.sql:181:CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boolean
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4588:supabase/migrations/20260422120000_phase_2_0_baseline.sql-185-  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4603:ace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4610:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3722:CREATE POLICY brands_write_admin ON public.brands TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_i
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4611:d) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4631:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3740:CREATE POLICY invoice_items_modify ON public.invoice_line_items USING (public.is_yagi_admin(auth.uid())) WITH CHECK (
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4632:public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4641:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3749:  WHERE ((i.id = invoice_line_items.invoice_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4676:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3782:CREATE POLICY invoices_insert ON public.invoices FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4683:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3789:CREATE POLICY invoices_select ON public.invoices FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4691:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3796:CREATE POLICY invoices_update ON public.invoices FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (publ
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4692:ic.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4707:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3811:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_admin(auth.uid(), m.workspace_id) OR public.is_yagi_
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4731:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3833:CREATE POLICY meetings_insert ON public.meetings FOR INSERT WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4732: OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4740:public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4747:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3847:CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING ((public.is_ws_admin(auth.uid(), workspace_id) OR p
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4748:ublic.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4760:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3858:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4779:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3924:CREATE POLICY preprod_boards_delete ON public.preprod_boards FOR DELETE USING ((public.is_yagi_admin(auth.uid()) OR p
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4780:ublic.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4787:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3931:CREATE POLICY preprod_boards_insert ON public.preprod_boards FOR INSERT WITH CHECK ((public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4788: OR public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4795:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3938:CREATE POLICY preprod_boards_select ON public.preprod_boards FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR p
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4803:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3945:CREATE POLICY preprod_boards_update ON public.preprod_boards FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR p
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4804:ublic.is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4813:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3954:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.u
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4823:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3963:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.ui
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4826:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3965:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.ui
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4845:supabase/migrations/20260422120000_phase_2_0_baseline.sql:3992:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.w
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4855:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4001:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.w
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4865:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4010:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4875:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4019:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.w
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4878:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4021:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.w
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4888:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4030:  WHERE ((b.id = preprod_frame_reactions.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4942:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4116:CREATE POLICY projects_delete_yagi ON public.projects FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.ui
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4950:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4123:CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4951:(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4959:rkspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4966:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4137:CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), w
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4967:orkspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4982:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4152:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:4991:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4161:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5000:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4170:  WHERE ((s.id = showcase_media.showcase_id) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5011:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4181:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5024:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4194:CREATE POLICY showcases_delete_internal ON public.showcases FOR DELETE USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5031:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4201:CREATE POLICY showcases_insert_internal ON public.showcases FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5038:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4208:CREATE POLICY showcases_select_internal ON public.showcases FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (E
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5048:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4217:CREATE POLICY showcases_update_internal ON public.showcases FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR (E
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5051:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4219:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id)))))) WITH CHECK ((public.is
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5054:supabase/migrations/20260422120000_phase_2_0_baseline.sql-4221-  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id))))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5067:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4234:CREATE POLICY supplier_profile_select ON public.supplier_profile FOR SELECT USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5074:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4241:CREATE POLICY supplier_profile_update ON public.supplier_profile FOR UPDATE USING (public.is_yagi_admin(auth.uid())) 
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5075:WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5095:lic.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5114:) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5134:ember(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5154:ce_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5162:) AND (public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5170:) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5179:ELECT TO authenticated USING ((public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5197:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4355:  WHERE ((tm.id = thread_message_attachments.message_id) AND ((tm.author_id = auth.uid()) OR public.is_yagi_admin(aut
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5219:.visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5237: 'shared'::text) OR ((visibility = 'internal'::text) AND public.is_yagi_admin(auth.uid())))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5245:ated USING (((visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()) OR (author_id = auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5279: public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5287: auth.uid()) AND (role = 'creator'::text) AND (workspace_id IS NULL)));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5292:= auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5299:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4454:CREATE POLICY user_roles_yagi_admin ON public.user_roles TO authenticated USING (public.is_yagi_admin(auth.uid())) WI
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5300:TH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5318:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4486:CREATE POLICY ws_delete_yagi ON public.workspaces FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5327:n(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5334:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4500:CREATE POLICY ws_inv_write_admin ON public.workspace_invitations TO authenticated USING ((public.is_ws_admin(auth.uid
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5335:(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5343:min(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5351:h.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5359:d = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5361:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4523:  WHERE (m.workspace_id = workspace_members.workspace_id))))) OR public.is_ws_admin(auth.uid(), workspace_id) OR publ
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5362:ic.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5370:, id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5377:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4537:CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(),
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5378: id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5417:reprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5419:supabase/migrations/20260422120000_phase_2_0_baseline.sql-4628-  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_admin(auth.uid(), b.workspace_id))))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5428:prod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5439:= 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5441:supabase/migrations/20260422120000_phase_2_0_baseline.sql-4646-  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_admin(auth.uid(), b.workspace_id))))
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5453:OR public.is_yagi_admin(auth.uid())))))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5484:edia'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5492:ia'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5504:edia'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5512:se-media'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5520::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5528::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5536:og'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5556:supabase/migrations/20260422120000_phase_2_0_baseline.sql:4752:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND (public.is_ws_admin(auth.uid(), p.workspace_id) 
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5557:OR public.is_yagi_admin(auth.uid())))))));
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5576:USING (((bucket_id <> 'thread-attachments'::text) OR public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5719:supabase/migrations\20260429113853_phase_3_1_project_board.sql-193-  IF NOT is_yagi_admin(auth.uid()) THEN
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5962:supabase/migrations\20260429113853_phase_3_1_project_board.sql-47-    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5978:supabase/migrations\20260429113853_phase_3_1_project_board.sql-63-    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:5985:supabase/migrations\20260429113853_phase_3_1_project_board.sql-95-    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:6007:supabase/migrations\20260429113853_phase_3_1_project_board.sql-166-  IF NOT is_yagi_admin(auth.uid()) THEN
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:6019:supabase/migrations\20260429113853_phase_3_1_project_board.sql-193-  IF NOT is_yagi_admin(auth.uid()) THEN
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:6253:47-    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:6269:63-    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:6281:75-    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:6819:47-    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:6835:63-    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:6847:75-    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:6998:supabase/migrations\20260429113853_phase_3_1_project_board.sql-47-    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:7014:supabase/migrations\20260429113853_phase_3_1_project_board.sql-63-    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:7036:    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1-hotfix-3\_codex_review_loop_1.txt:7048:    is_yagi_admin(auth.uid())
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G5-admin-management.md:16:- `is_yagi_admin(auth.uid())` RPC (Phase 1.1) — 15+ files call it
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G5-admin-management.md:22:- `user_roles` row with `role='yagi_admin'` + `workspace_id IS NULL`
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G5-admin-management.md:48:- `src/app/[locale]/app/admin/challenges/layout.tsx` — layout-level `is_yagi_admin` guard (SPEC §3 G5 Task 6)
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G5-admin-management.md:49:  - Call `is_yagi_admin(auth.uid())` RPC via Server Component
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G5-admin-management.md:85:- SPEC explicitly states admin gate uses `is_yagi_admin(auth.uid())` RPC, not a new `profiles.role='admin'` value
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G5-admin-management.md:130:| Integration | Admin Server Actions enforce `is_yagi_admin` — anon/non-admin call → 403 | Supabase client tests |
.yagi-autobuild\phase-2-8-2\_codex_review_prompt_loop2.md:6:   `(is_ws_admin OR is_yagi_admin)`. Tightened to mirror USING:
.yagi-autobuild\phase-2-8-2\_codex_review_prompt_loop2.md:7:   `(is_ws_admin AND deleted_at IS NULL) OR is_yagi_admin`. Migration
.yagi-autobuild\phase-2-8-2\_codex_review_prompt_loop2.md:11:   with an early `IF v_deleted_at IS NOT NULL AND NOT is_yagi_admin
.yagi-autobuild\phase-2-8-2\_run.log:18:#     (deleted_at IS NULL)) OR is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-2-8-2\_run.log:19:#   projects_update USING ((is_ws_admin(auth.uid(), workspace_id) AND
.yagi-autobuild\phase-2-8-2\_run.log:20:#     (deleted_at IS NULL)) OR is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-2-8-2\_run.log:21:#   projects_update CHECK (is_ws_admin(...) OR is_yagi_admin(...))
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G4-TASK-PLAN.md:137:        * role check (profiles.role IN creator/studio) → wrong_role error
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G8-closeout.md:23:- 2 ALTER contracts (profiles.role/handle/instagram_handle/bio/role_switched_at/handle_changed_at; notification_preferences.challenge_updates_enabled)
.yagi-autobuild\phase-3-1-hotfix-3\_run.log:26:2026-04-30 task_12 H3 RULED OUT: pg_policy projects_insert WITH CHECK = (is_ws_member(uid, workspace_id) OR is_yagi_admin(uid)); Phase 3.0 K-05 LOOP 1 fix L-024 applied; INSERT path RLS not the cause
.yagi-autobuild\phase-3-1\_codex_review_output.txt:49:trust boundary) + 30s-debounced version snapshot via service-role INSERT (because `project_board_versions_insert_trigger` has `WITH CHECK false`) + UPDATE board.
.yagi-autobuild\phase-3-1\_codex_review_output.txt:102:- The RPC has `IF NOT is_yagi_admin(auth.uid()) THEN RAISE`. Is `is_yagi_admin` itself robust (e.g., does it correctly handle anon callers, NULL auth.uid())?
.yagi-autobuild\phase-3-1\_codex_review_output.txt:257:    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:273:    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:285:    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:305:    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:376:  IF NOT is_yagi_admin(auth.uid()) THEN
.yagi-autobuild\phase-3-1\_codex_review_output.txt:403:  IF NOT is_yagi_admin(auth.uid()) THEN
.yagi-autobuild\phase-3-1\_codex_review_output.txt:471:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"CREATE OR REPLACE FUNCTION is_yagi_admin|is_yagi_admin\\(\" supabase src -g \"*.sql\" -g \"*.ts\"
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1264://   2. INSERT project_status_history with actor_role='system' ??MUST bypass
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1427:  // 2. INSERT project_status_history with actor_role='system'.
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1846:supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:34:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1847:supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:48:        AND public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1848:supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:63:      OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1849:supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:85:    AND public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1850:supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:96:    AND public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1851:supabase\migrations\20260422120000_phase_2_0_baseline.sql:178:-- Name: is_yagi_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1852:supabase\migrations\20260422120000_phase_2_0_baseline.sql:181:CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boolean
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1854:ace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1855:supabase\migrations\20260422120000_phase_2_0_baseline.sql:3722:CREATE POLICY brands_write_admin ON public.brands TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_i
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1856:d) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1861:supabase\migrations\20260422120000_phase_2_0_baseline.sql:3740:CREATE POLICY invoice_items_modify ON public.invoice_line_items USING (public.is_yagi_admin(auth.uid())) WITH CHECK (
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1862:public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1863:supabase\migrations\20260422120000_phase_2_0_baseline.sql:3749:  WHERE ((i.id = invoice_line_items.invoice_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1869:supabase\migrations\20260422120000_phase_2_0_baseline.sql:3782:CREATE POLICY invoices_insert ON public.invoices FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1870:supabase\migrations\20260422120000_phase_2_0_baseline.sql:3789:CREATE POLICY invoices_select ON public.invoices FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1872:supabase\migrations\20260422120000_phase_2_0_baseline.sql:3796:CREATE POLICY invoices_update ON public.invoices FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (publ
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1873:ic.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1874:supabase\migrations\20260422120000_phase_2_0_baseline.sql:3811:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_admin(auth.uid(), m.workspace_id) OR public.is_yagi_
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1878:supabase\migrations\20260422120000_phase_2_0_baseline.sql:3833:CREATE POLICY meetings_insert ON public.meetings FOR INSERT WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1879: OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1881:public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1882:supabase\migrations\20260422120000_phase_2_0_baseline.sql:3847:CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING ((public.is_ws_admin(auth.uid(), workspace_id) OR p
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1883:ublic.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1886:supabase\migrations\20260422120000_phase_2_0_baseline.sql:3858:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1888:supabase\migrations\20260422120000_phase_2_0_baseline.sql:3924:CREATE POLICY preprod_boards_delete ON public.preprod_boards FOR DELETE USING ((public.is_yagi_admin(auth.uid()) OR p
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1889:ublic.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1890:supabase\migrations\20260422120000_phase_2_0_baseline.sql:3931:CREATE POLICY preprod_boards_insert ON public.preprod_boards FOR INSERT WITH CHECK ((public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1891: OR public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1892:supabase\migrations\20260422120000_phase_2_0_baseline.sql:3938:CREATE POLICY preprod_boards_select ON public.preprod_boards FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR p
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1894:supabase\migrations\20260422120000_phase_2_0_baseline.sql:3945:CREATE POLICY preprod_boards_update ON public.preprod_boards FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR p
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1895:ublic.is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1896:supabase\migrations\20260422120000_phase_2_0_baseline.sql:3954:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.u
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1898:supabase\migrations\20260422120000_phase_2_0_baseline.sql:3963:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.ui
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1900:supabase\migrations\20260422120000_phase_2_0_baseline.sql:3965:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.ui
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1902:supabase\migrations\20260422120000_phase_2_0_baseline.sql:3992:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.w
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1904:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4001:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.w
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1906:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4010:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1908:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4019:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.w
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1910:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4021:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.w
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1912:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4030:  WHERE ((b.id = preprod_frame_reactions.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1922:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4116:CREATE POLICY projects_delete_yagi ON public.projects FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.ui
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1924:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4123:CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1925:(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1927:rkspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1928:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4137:CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), w
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1929:orkspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1930:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4152:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1931:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4161:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1932:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4170:  WHERE ((s.id = showcase_media.showcase_id) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1933:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4181:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1934:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4194:CREATE POLICY showcases_delete_internal ON public.showcases FOR DELETE USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1935:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4201:CREATE POLICY showcases_insert_internal ON public.showcases FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1936:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4208:CREATE POLICY showcases_select_internal ON public.showcases FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (E
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1938:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4217:CREATE POLICY showcases_update_internal ON public.showcases FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR (E
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1940:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4219:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id)))))) WITH CHECK ((public.is
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1942:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4234:CREATE POLICY supplier_profile_select ON public.supplier_profile FOR SELECT USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1943:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4241:CREATE POLICY supplier_profile_update ON public.supplier_profile FOR UPDATE USING (public.is_yagi_admin(auth.uid())) 
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1944:WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1946:lic.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1948:) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1950:ember(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1952:ce_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1954:) AND (public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1956:) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1958:ELECT TO authenticated USING ((public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1959:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4355:  WHERE ((tm.id = thread_message_attachments.message_id) AND ((tm.author_id = auth.uid()) OR public.is_yagi_admin(aut
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1962:.visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()))))));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1964: 'shared'::text) OR ((visibility = 'internal'::text) AND public.is_yagi_admin(auth.uid())))));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1966:ated USING (((visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()) OR (author_id = auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1972: public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1973:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4454:CREATE POLICY user_roles_yagi_admin ON public.user_roles TO authenticated USING (public.is_yagi_admin(auth.uid())) WI
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1974:TH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1975:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4486:CREATE POLICY ws_delete_yagi ON public.workspaces FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1978:n(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1979:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4500:CREATE POLICY ws_inv_write_admin ON public.workspace_invitations TO authenticated USING ((public.is_ws_admin(auth.uid
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1980:(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1982:min(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1984:h.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1985:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4523:  WHERE (m.workspace_id = workspace_members.workspace_id))))) OR public.is_ws_admin(auth.uid(), workspace_id) OR publ
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1986:ic.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1988:, id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1989:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4537:CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(),
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1990: id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1994:reprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1996:prod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1\_codex_review_output.txt:1998:= 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2000:OR public.is_yagi_admin(auth.uid())))))));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2004:edia'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2006:ia'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2008:edia'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2010:se-media'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2012::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2014::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2016:og'::text) AND public.is_yagi_admin(auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2017:supabase\migrations\20260422120000_phase_2_0_baseline.sql:4752:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND (public.is_ws_admin(auth.uid(), p.workspace_id) 
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2018:OR public.is_yagi_admin(auth.uid())))))));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2020:USING (((bucket_id <> 'thread-attachments'::text) OR public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2021:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:275:  FOR SELECT USING (state <> 'draft' OR public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2022:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:278:  FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2023:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:281:  FOR UPDATE USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2024:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:282:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2025:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:285:  FOR DELETE USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2026:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:323:  FOR UPDATE USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2027:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:324:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2028:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:345:  FOR ALL USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2029:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:346:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2030:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:355:  FOR ALL USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2031:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:356:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2032:supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:58:  IF public.is_yagi_admin(auth.uid()) THEN
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2033:supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:263:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2034:supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:270:  USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2035:supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:272:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2036:supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:279:  USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2037:supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:281:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2038:supabase\migrations\20260424030000_phase_2_5_g8_hardening_v2.sql:44:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2039:supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:37:  USING (public.is_yagi_admin((select auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2040:supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:53:  USING (public.is_yagi_admin((select auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2041:supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:123:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2042:supabase\migrations\20260424000000_phase_2_5_g2_handle_history.sql:53:  USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2043:supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:37:  USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2044:supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:42:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2045:supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:48:  USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2046:supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:49:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2047:supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:53:  USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2048:supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:61:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2049:supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:67:  USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2050:supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:68:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2051:supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:72:  USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2052:supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:94:  IF public.is_yagi_admin(auth.uid()) THEN
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2053:supabase\migrations\20260426000000_phase_2_8_brief_board.sql:195:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2054:supabase\migrations\20260426000000_phase_2_8_brief_board.sql:211:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2055:supabase\migrations\20260426000000_phase_2_8_brief_board.sql:248:  USING (public.is_yagi_admin((select auth.uid())))
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2056:supabase\migrations\20260426000000_phase_2_8_brief_board.sql:249:  WITH CHECK (public.is_yagi_admin((select auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2057:supabase\migrations\20260426000000_phase_2_8_brief_board.sql:265:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2058:supabase\migrations\20260426000000_phase_2_8_brief_board.sql:286:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2059:supabase\migrations\20260426000000_phase_2_8_brief_board.sql:307:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2060:supabase\migrations\20260426000000_phase_2_8_brief_board.sql:324:          OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2061:supabase\migrations\20260426000000_phase_2_8_brief_board.sql:337:    OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2062:supabase\migrations\20260426000000_phase_2_8_brief_board.sql:397:  v_is_yagi_admin := public.is_yagi_admin(v_caller);
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2063:supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:145:    OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2064:supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:168:    OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2065:supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:172:    OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2066:supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:188:    OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2067:supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:235:  USING (public.is_yagi_admin((select auth.uid())))
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2068:supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:236:  WITH CHECK (public.is_yagi_admin((select auth.uid())));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2069:supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:263:  v_is_admin := public.is_yagi_admin(v_caller);
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2070:supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:337:  IF public.is_yagi_admin(v_caller) THEN
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2071:supabase\migrations\20260424040000_phase_2_5_g8_hardening_v3.sql:41:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2072:supabase\migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:72:    public.is_yagi_admin(v_caller)
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2073:supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:67:  v_is_admin := public.is_yagi_admin(v_caller);
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2074:supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:120:  IF NOT public.is_yagi_admin(v_caller) THEN
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2075:supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:58:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2076:supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:72:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2077:supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:76:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2078:supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:32:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2079:supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:394:  v_is_yagi_admin := public.is_yagi_admin(v_actor_id);
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2080:supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:503:--   AND NOT is_yagi_admin(auth.uid())  -- yagi_admin admin console escape hatch
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2081:supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:514:--   - yagi_admin: bypassed via is_yagi_admin() check for emergency fixes.
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2082:supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:539:  IF public.is_yagi_admin(auth.uid()) THEN
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2083:supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:584:  USING (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2084:supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:628:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2085:supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:706:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2086:supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:720:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2087:supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:10:--     (is_ws_admin(...) OR is_yagi_admin(...))
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2088:supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:43:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2089:supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:50:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2090:supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:97:    public.is_yagi_admin(v_caller)
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2091:supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:103:  IF v_deleted_at IS NOT NULL AND NOT public.is_yagi_admin(v_caller) THEN
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2092:supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:81:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2093:supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:97:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2094:supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:105:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2095:supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:87:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2096:supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:96:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2097:supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:108:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2098:supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:112:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2099:supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:126:          public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2100:supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:143:          public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2101:supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:89:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2102:supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:98:    OR public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2103:supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:113:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2104:supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:135:          public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2105:supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:151:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2106:supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:155:    public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2107:supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:178:     AND NOT public.is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2108:supabase\migrations\20260429113853_phase_3_1_project_board.sql:47:    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2109:supabase\migrations\20260429113853_phase_3_1_project_board.sql:63:    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2110:supabase\migrations\20260429113853_phase_3_1_project_board.sql:75:    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2111:supabase\migrations\20260429113853_phase_3_1_project_board.sql:95:    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2112:supabase\migrations\20260429113853_phase_3_1_project_board.sql:166:  IF NOT is_yagi_admin(auth.uid()) THEN
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2113:supabase\migrations\20260429113853_phase_3_1_project_board.sql:193:  IF NOT is_yagi_admin(auth.uid()) THEN
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2114:supabase\migrations\20260428070000_phase_2_8_6_review_loop_2.sql:33:  USING (public.is_yagi_admin(auth.uid()))
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2115:supabase\migrations\20260428070000_phase_2_8_6_review_loop_2.sql:34:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2777:178:-- Name: is_yagi_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2780:181:CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boolean
.yagi-autobuild\phase-3-1\_codex_review_output.txt:2784:185:  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
.yagi-autobuild\phase-3-1\_codex_review_output.txt:6535:47:    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:6551:63:    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:6563:75:    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:6578:95:    is_yagi_admin(auth.uid())
.yagi-autobuild\phase-3-1\_codex_review_output.txt:6632:166:  IF NOT is_yagi_admin(auth.uid()) THEN
.yagi-autobuild\phase-3-1\_codex_review_output.txt:6659:193:  IF NOT is_yagi_admin(auth.uid()) THEN
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\_summary.md:32:- Phase 1.1 `user_roles.role='creator'` — privileged global role (grants workspace-skip)
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\_summary.md:33:- Phase 2.5 `profiles.role='creator'` — challenge persona (alongside studio, observer)
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\_summary.md:41:- `src/lib/onboarding/actions.ts:30-34` — INSERTs `user_roles.role='creator'` on Phase 1.1 signup
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\_summary.md:49:| G5 | None (admin gate is `is_yagi_admin` RPC, Phase 1.1 territory) |
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G5-ENTRY-DECISION-PACKAGE.md:20:Plus: `layout.tsx` with `is_yagi_admin` guard. Server Actions for CRUD + state transition + judgment + announce. Two first-of-kind primitives in codebase: JSONB-building form, state-machine helper.
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G5-ENTRY-DECISION-PACKAGE.md:30:`/[locale]/app/admin/challenges/layout.tsx` Server Component calls `is_yagi_admin(auth.uid())` RPC. 403 redirect to `/app` if false. NOT middleware-based (Phase 1.1 precedent).
.yagi-autobuild\phase-3-1\_codex_review_prompt.md:22:   - `updateProjectBoardAction(projectId, document)` — auth + 5MB cap + RLS-gated SELECT to fetch board + lock check + server-recompute `asset_index` via `extractAssetIndex` (K-05 trust boundary) + 30s-debounced version snapshot via service-role INSERT (because `project_board_versions_insert_trigger` has `WITH CHECK false`) + UPDATE board.
.yagi-autobuild\phase-3-1\_codex_review_prompt.md:70:- The RPC has `IF NOT is_yagi_admin(auth.uid()) THEN RAISE`. Is `is_yagi_admin` itself robust (e.g., does it correctly handle anon callers, NULL auth.uid())?
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G8-ENTRY-DECISION-PACKAGE.md:156:- `profiles` — added: role CHECK ('creator','studio','observer'), handle citext UNIQUE, instagram_handle, bio CHECK char_length<=200, avatar_url, role_switched_at, handle_changed_at, external_links jsonb (if added at G6)
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G8-ENTRY-DECISION-PACKAGE.md:180:- `is_yagi_admin(uid)` — Phase 1.1, reused unchanged
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G8_K05_FINDINGS.md:28:- Admin SELECT `USING (is_yagi_admin(auth.uid()))`
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G8_K05_FINDINGS.md:93:`challenges_admin_update` policy only checks `is_yagi_admin`. No DB trigger enforcing allowed transitions (draft→open→closed_judging→closed_announced→archived). Any admin can skip stages via raw PostgREST PATCH.
.yagi-autobuild\archive\phase-1\phase-1-2-spec.md:48:**User's yagi_admin status:** Verify by querying `user_roles` — expect at least one row with `role='yagi_admin'` AND `workspace_id IS NULL`.
.yagi-autobuild\archive\phase-1\phase-1-2-spec.md:130:**File 1:** `/CLAUDE.md` (project root, auto-loaded by Claude Code) — contents specified in companion doc. Covers: stack (Next.js 15.5 App Router, Tailwind v3, shadcn@2.1.8 strict, Supabase SSR, TanStack v5, RHF+Zod, next-intl ko/en, Sonner, Lucide, pnpm only), commands, architecture rules (Server Components by default, DB mutations via Server Actions, Supabase access only through `lib/supabase/server.ts` or `client.ts`, i18n everywhere, role helpers `is_yagi_admin`/`is_ws_member`/`is_ws_admin`, route structure `/[locale]/app/*` NOT route group), styling tokens (white/black, pill CTAs, Fraunces italic, keep-all Korean, ZERO warm tones).
.yagi-autobuild\archive\phase-1\phase-1-2-spec.md:170:8. Roles: use `user_roles` table. Helpers: `is_yagi_admin`, `is_ws_member`, `is_ws_admin`.
.yagi-autobuild\archive\phase-1\phase-1-2-spec.md:333:- User's role in workspace (for action button filtering)
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC-REVIEW-NOTES.md:13:**Top issue:** SPEC collides with Phase 1.1 identity backbone — it introduces a new `user_profiles` table (1:1 with `auth.users`) while Phase 1.1 already owns `profiles` as that surface (`contracts.md` Phase 1.1). Likewise the new "4th internal admin role" redefines role storage even though Phase 1.1 has `user_roles` with `is_yagi_admin`. G1 as written will break every downstream workspace-scoped RLS policy or produce two parallel identity tables. This must be resolved pre-G1, not mid-G1.
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC-REVIEW-NOTES.md:33:### [CRITICAL_BLOCKING] "Admin role" clashes with Phase 1.1 `user_roles` + `is_yagi_admin` system
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC-REVIEW-NOTES.md:35:- **Current text:** "Admin role gating: middleware check against user_profiles.role = 'admin' (admin role is a 4th internal role, not user-facing)"
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC-REVIEW-NOTES.md:36:- **Issue:** Phase 1.1 already has `user_roles` with `yagi_admin` (global, `workspace_id IS NULL`) and the `is_yagi_admin(uid)` RPC used by every admin-gated surface in 1.2–1.9 (contracts.md §Phase 1.1 RPCs). Introducing a 4th role stored on `user_profiles.role` creates a parallel authorization system — any new admin surface in 2.5 that uses `is_yagi_admin` will diverge from one that uses `.role='admin'`. This is exactly the class of drift ADR-001 rejects at the design-system level and ARCH §11 rejects at the architecture level.
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC-REVIEW-NOTES.md:37:- **Suggested edit:** Replace the 4th-role concept with: "Admin gating uses existing `is_yagi_admin(auth.uid())` RPC from Phase 1.1. The 3 Phase 2.5 roles (Creator/Studio/Observer) live on `profiles.role` and are orthogonal to `user_roles`. Admin = `user_roles.role='yagi_admin'`, not `profiles.role='admin'`." Update §1 role table and Q1 (admin bootstrap) accordingly — Q1 becomes "assign existing `yagi_admin` role via existing seed pattern", not a new promotion path.
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC-REVIEW-NOTES.md:42:- **Issue:** Phase 1.1 `user_roles.role` is workspace-scoped (`workspace_admin`/`workspace_member` with `workspace_id`, plus global `yagi_admin` with `workspace_id IS NULL`). Phase 2.5 introduces a global-only role (Creator/Studio/Observer) with no workspace relation. Not flagged in §5 dependencies. Open risk: a Creator who is also a workspace_admin in a client workspace — which role wins in RLS predicates on `challenge_submissions`? No answer in SPEC. This is not a hypothetical; the B2B Studio role in D3 explicitly targets "potential B2B clients" who will also have workspaces.
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC-REVIEW-NOTES.md:208:2. Uses `is_yagi_admin` instead of a new "admin role".
.yagi-autobuild\archive\phase-1\phase-1-3-spec.md:96:  is_ws_member(workspace_id) or is_yagi_admin()
.yagi-autobuild\archive\phase-1\phase-1-3-spec.md:99:  (is_ws_admin(workspace_id) or is_yagi_admin())
.yagi-autobuild\archive\phase-1\phase-1-3-spec.md:102:  is_ws_admin(workspace_id) or is_yagi_admin()
.yagi-autobuild\archive\phase-1\phase-1-3-spec.md:110:      and (is_ws_member(m.workspace_id) or is_yagi_admin())
.yagi-autobuild\archive\phase-1\phase-1-3-spec.md:117:      and (is_ws_admin(m.workspace_id) or is_yagi_admin())
.yagi-autobuild\archive\phase-1\phase-1-3-spec.md:338:2. **Auth check.** Require `is_ws_admin(project.workspace_id)` OR `is_yagi_admin()`. Fetch project to get workspace_id.
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:45:direction per 30 days — tracked in `profiles.role_switched_at`).
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:55:  `is_ws_admin(uid, wsid)` / `is_ws_member(uid, wsid)`.
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:64:  existing `is_yagi_admin(auth.uid())` RPC from Phase 1.1, NOT a new
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:65:  `profiles.role='admin'` value.** There is no 4th role. See §3 G5 for the
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:163:     ADD COLUMN role text CHECK (role IN ('creator','studio','observer')),
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:168:     ADD COLUMN role_switched_at timestamptz,
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:182:     with `role='observer'` and no `creators`/`studios` child row.
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:224:     UPDATE gated by `is_yagi_admin(auth.uid())` (NOT a new admin role).
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:225:   - `challenge_submissions`: SELECT public; INSERT scoped to own + role IN
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:231:     `is_yagi_admin` (judgment notes contain internal deliberation; public
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:234:     `is_yagi_admin`.
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:405:   `is_yagi_admin(auth.uid())` RPC. Middleware/layout for `/admin/challenges/*`
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:407:   `profiles.role='admin'` value — Phase 2.5 introduces 3 roles only
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:409:   pattern (INSERT INTO `user_roles` (`role='yagi_admin'`, `workspace_id=NULL`)).
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:573:- `user_roles` + `is_yagi_admin(uid)` RPC (Phase 1.1) — admin gate for all
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:613:that INSERTs `user_roles (user_id, role='yagi_admin', workspace_id=NULL)`
.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:668:30-day minimum between role switches; tracked via `profiles.role_switched_at`
.yagi-autobuild\archive\phase-1\phase-1-4-spec.md:150:  is_yagi_admin() or is_ws_member(workspace_id)
.yagi-autobuild\archive\phase-1\phase-1-4-spec.md:153:  is_yagi_admin() or is_ws_admin(workspace_id)
.yagi-autobuild\archive\phase-1\phase-1-4-spec.md:156:  is_yagi_admin() or is_ws_admin(workspace_id)
.yagi-autobuild\archive\phase-1\phase-1-4-spec.md:162:          and (is_yagi_admin() or is_ws_member(b.workspace_id)))
.yagi-autobuild\archive\phase-1\phase-1-4-spec.md:166:          and (is_yagi_admin() or is_ws_admin(b.workspace_id)))
.yagi-autobuild\archive\phase-1\phase-1-4-spec.md:170:          and (is_yagi_admin() or is_ws_admin(b.workspace_id)))
.yagi-autobuild\archive\phase-1\phase-1-4-spec.md:178:          and (is_yagi_admin() or is_ws_member(b.workspace_id)))
.yagi-autobuild\archive\phase-1\phase-1-4-spec.md:182:          and (is_yagi_admin() or is_ws_member(b.workspace_id)))
.yagi-autobuild\archive\phase-1\phase-1-4-spec.md:193:    (is_yagi_admin() or exists (
.yagi-autobuild\archive\phase-1\phase-1-4-spec.md:202:    (is_yagi_admin() or exists (
.yagi-autobuild\archive\phase-1\phase-1-4-spec.md:204:        and is_ws_admin(b.workspace_id)
.yagi-autobuild\archive\phase-1\phase-1-5-spec.md:150:create policy supplier_yagi_only on supplier_profile for select using (is_yagi_admin());
.yagi-autobuild\archive\phase-1\phase-1-5-spec.md:154:  is_ws_member(workspace_id) or is_yagi_admin()
.yagi-autobuild\archive\phase-1\phase-1-5-spec.md:156:create policy invoices_insert on invoices for insert with check (is_yagi_admin());
.yagi-autobuild\archive\phase-1\phase-1-5-spec.md:157:create policy invoices_update on invoices for update using (is_yagi_admin());
.yagi-autobuild\archive\phase-1\phase-1-5-spec.md:161:  is_yagi_admin() or status <> 'draft'
.yagi-autobuild\archive\phase-1\phase-1-5-spec.md:166:          and (is_ws_member(i.workspace_id) or is_yagi_admin()))
.yagi-autobuild\archive\phase-1\phase-1-5-spec.md:168:create policy invoice_items_cud on invoice_line_items for all using (is_yagi_admin());
.yagi-autobuild\archive\phase-1\phase-1-5-spec.md:725:  is_yagi_admin() or is_mock = false
.yagi-autobuild\archive\phase-1\phase-1-7-spec.md:99:  is_yagi_internal_ws(workspace_id) and (is_ws_member(workspace_id) or is_yagi_admin())
.yagi-autobuild\archive\phase-1\phase-1-7-spec.md:103:  is_yagi_internal_ws(workspace_id) and (is_ws_admin(workspace_id) or is_yagi_admin())
.yagi-autobuild\archive\phase-1\phase-1-7-spec.md:107:  is_yagi_internal_ws(workspace_id) and (is_ws_admin(workspace_id) or is_yagi_admin())
.yagi-autobuild\archive\phase-1\phase-1-7-spec.md:113:          and (is_ws_member(c.workspace_id) or is_yagi_admin()))
.yagi-autobuild\archive\phase-1\phase-1-7-spec.md:132:          and (is_ws_member(c.workspace_id) or is_yagi_admin()))
.yagi-autobuild\archive\phase-1\phase-1-9-spec.md:99:  is_yagi_admin() or exists (
.yagi-autobuild\archive\phase-1\phase-1-9-spec.md:105:  is_yagi_admin()
.yagi-autobuild\archive\phase-1\phase-1-9-spec.md:109:  is_yagi_admin() or exists (
.yagi-autobuild\archive\phase-1\phase-1-9-spec.md:110:    select 1 from projects p where p.id = project_id and is_ws_admin(p.workspace_id)
.yagi-autobuild\archive\phase-1\phase-1-9-spec.md:116:          and (is_yagi_admin() or exists (
.yagi-autobuild\archive\phase-1\phase-1-9-spec.md:122:  exists (select 1 from showcases s where s.id = showcase_id and is_yagi_admin())
.yagi-autobuild\archive\phase-1\subtasks\01_conventions.md:61:8. Roles: use `user_roles` table. Helpers: `is_yagi_admin`, `is_ws_member`, `is_ws_admin`.
.yagi-autobuild\archive\phase-1\summary-phase-1-2-5.md:12:  - `phase_1_2_5_video_pdf_intake_attachments_20260422` — `project_references` cols (`media_type`, `duration_seconds`, `page_count`, `thumbnail_path`, `embed_provider`); `projects.intake_mode` + 4 proposal fields; `thread_message_attachments` table + RLS; `thread_messages` insert RLS tightened (visibility='internal' restricted to `is_yagi_admin`).
.yagi-autobuild\archive\phase-1\summary-phase-1-2-5.md:39:- **Fix applied:** migration `phase_1_2_5_thread_attachments_storage_internal_hide_20260422` adds RESTRICTIVE policy `thread_attachments_objects_hide_internal` on `storage.objects`. AND-combined with the existing PERMISSIVE select: bypass requires either `is_yagi_admin` or no matching internal-visibility row for that path. Verified policy active.
.yagi-autobuild\archive\phase-1\summary-phase-1-2.md:41:  USING (is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\phase-1\summary-phase-1-2.md:42:  WITH CHECK (is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\summary-phase-1-2.md:45:**Behaviour change:** A workspace member with `role='member'` can no longer UPDATE arbitrary fields (workspace_id, brand_id, status). Only `ws_admin` and `yagi_admin` may update; status transitions remain gated additionally by `transitionStatus` server action.
.yagi-autobuild\archive\phase-1\summary-phase-1-3.md:17:- **`src/app/api/health/google/route.ts`**: GET-only, `yagi_admin` gate via `user_roles` query (`workspace_id IS NULL AND role='yagi_admin'`). Returns 401/403/200 with `{auth_configured, token_refresh_ok, last_checked_at}`.
.yagi-autobuild\archive\phase-1\summary-phase-1-3.md:22:- **Migration `phase_1_3_meetings_20260422`**: `meetings` table (status enum, calendar_sync_status enum, updated_at trigger via `tg_touch_updated_at()`), `meeting_attendees` table (unique `(meeting_id, email)`). RLS: `is_ws_member(uid, wsid) OR is_yagi_admin(uid)` for select, `is_ws_admin OR is_yagi_admin` for insert/update.
.yagi-autobuild\archive\phase-1\summary-phase-1-3.md:24:- **`src/app/[locale]/app/meetings/actions.ts`** `createMeeting`: Zod validation → auth → fetch project → is_ws_admin check → insert meeting row (pending) → insert attendees → try Google Calendar → on failure try ICS email → update status to synced/fallback_ics/failed. Never throws. Primary meeting row commit protected.
.yagi-autobuild\archive\phase-1\summary-phase-1-3.md:57:   - **Fix applied:** migration `phase_1_3_meetings_workspace_derived_20260422` installs BEFORE INSERT/UPDATE OF project_id trigger `meetings_sync_workspace_id` that derives `workspace_id` from the current `projects.workspace_id` in a single atomic DB read. Server-Action-supplied workspace_id is now irrelevant — DB enforces consistency. Combined with RLS insert policy, any re-parenting race is blocked by `is_ws_admin` check against the current workspace. Triggers verified enabled.
.yagi-autobuild\archive\phase-1\summary-phase-1-4.md:16:  - RLS policies use `is_yagi_admin(auth.uid()) OR is_ws_member(auth.uid(), workspace_id)` for select; `is_ws_admin` for insert/update with WITH CHECK
.yagi-autobuild\archive\phase-1\summary-phase-1-4.md:79:- MEDIUM: `actions.ts:25` (`createBoard`) — `projectId` not authorized against the caller's project visibility before insert. Fix: load project, require `is_yagi_admin` OR `is_ws_admin` of project workspace.
.yagi-autobuild\archive\phase-1\summary-phase-1-4.md:80:- MEDIUM: `preprod/page.tsx:58`, `preprod/[id]/page.tsx:28` — visibility allows any `is_ws_member(uid, yagi-internal)` rather than gating on `is_yagi_admin`. Fix: tighten to `is_yagi_admin` only OR add a dedicated preprod role.
.yagi-autobuild\archive\phase-1\summary-phase-1-5.md:76:| 4 | RLS for `invoice_line_items` CUD not verifiable (migration missing) | **FIXED** (follow-on from CRITICAL-1) — committed migration shows `invoice_items_modify` RESTRICTIVE ALL policy gated on `is_yagi_admin(auth.uid())`. |
.yagi-autobuild\archive\phase-1\summary-phase-1-7.md:79:| HIGH-1 | `deleteMessage` was a silent no-op because no DELETE policy existed on `team_channel_messages` — RLS denied all deletes; UI showed success toast but row remained | Added `team_channel_messages_delete` policy (`author_id = auth.uid() OR is_yagi_admin(auth.uid())`) in `20260422070000_phase_1_7_team_chat_fixups.sql` |
.yagi-autobuild\archive\phase-1\results\05_generate_types.md:23:- Three public RPC functions typed: `is_ws_admin`, `is_ws_member`, `is_yagi_admin`.
.yagi-autobuild\archive\phase-1\summary-phase-1-8.md:26:  - `src/lib/notifications/emit.ts` — service-role insert with locale-aware title/body pre-rendering
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:74:  role text not null check (role in ('creator', 'workspace_admin', 'workspace_member', 'yagi_admin')),
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:88:  role text not null check (role in ('admin', 'member')),
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:102:  role text not null check (role in ('admin', 'member')),
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:236:create or replace function public.is_yagi_admin(uid uuid) returns boolean
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:238:  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:246:create or replace function public.is_ws_admin(uid uuid, wsid uuid) returns boolean
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:250:    where user_id = uid and workspace_id = wsid and role = 'admin'
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:279:  using (user_id = auth.uid() or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:281:  with check (user_id = auth.uid() and role = 'creator' and workspace_id is null);
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:284:    user_id = auth.uid() and role = 'workspace_admin' and workspace_id is not null
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:285:    and public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:288:  using (public.is_yagi_admin(auth.uid())) with check (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:293:  using (public.is_ws_member(auth.uid(), id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:296:  using (public.is_ws_admin(auth.uid(), id) or public.is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:297:  with check (public.is_ws_admin(auth.uid(), id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:299:  using (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:304:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:306:  using (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:307:  with check (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:312:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:315:    (user_id = auth.uid() and role = 'admin'
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:317:    or public.is_ws_admin(auth.uid(), workspace_id)
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:318:    or public.is_yagi_admin(auth.uid())
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:321:  using (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:326:  using (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:328:  using (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:329:  with check (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:334:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:336:  with check (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:338:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:339:  with check (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:341:  using (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:347:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:349:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:353:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:355:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:359:    where t.id = thread_id and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:361:    where t.id = thread_id and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:364:  using (visibility = 'shared' or public.is_yagi_admin(auth.uid()) or author_id = auth.uid());
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:368:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:370:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:374:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:376:    and (public.is_ws_admin(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:379:  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:381:  using (public.is_yagi_admin(auth.uid())) with check (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:409:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\phase-1\subtasks\03_schema_migration.md:418:    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:43:- thread_messages insert RLS tightened: visibility='internal' restricted to is_yagi_admin
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:48:1. **Internal-attachment RLS leakage** — can a workspace_member with role='member' (non-yagi_admin) SELECT a thread_message_attachments row whose parent message has visibility='internal'? The PERMISSIVE select policy + RESTRICTIVE hide-internal policy combine — verify the AND semantics actually exclude internal attachments. Also: does the storage RLS on thread-attachments bucket re-check internal visibility, or only workspace membership? If a member knows the storage_path of an internal attachment (e.g. leaked via timing/error message), can they get a signed URL for it via thread-panel-server.tsx's bulk signed-URL pass?
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3274:341:  using (visibility = 'shared' or public.is_yagi_admin(auth.uid()) or author_id = auth.uid());
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3408:311-  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3410:313-  with check (public.is_ws_admin(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3412:315-  using (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3413:316-  with check (public.is_ws_member(auth.uid(), workspace_id) or public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3415:318-  using (public.is_yagi_admin(auth.uid()));
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3421:324-    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3423:326-    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3427:330-    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3429:332-    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3436:324-    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3438:326-    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3442:330-    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3444:332-    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3448:336-    where t.id = thread_id and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3450:338-    where t.id = thread_id and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3453:341-  using (visibility = 'shared' or public.is_yagi_admin(auth.uid()) or author_id = auth.uid());
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3457:345-    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3463:330-    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3465:332-    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3469:336-    where t.id = thread_id and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3471:338-    where t.id = thread_id and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3474:341-  using (visibility = 'shared' or public.is_yagi_admin(auth.uid()) or author_id = auth.uid());
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3478:345-    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3480:347-    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))));
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_output.txt:3484:351-    and (public.is_ws_member(auth.uid(), p.workspace_id) or public.is_yagi_admin(auth.uid()))))
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_prompt.txt:30:- thread_messages insert RLS tightened: visibility='internal' restricted to is_yagi_admin
.yagi-autobuild\archive\phase-1\_codex_review_1_2_5_prompt.txt:35:1. **Internal-attachment RLS leakage** — can a workspace_member with role='member' (non-yagi_admin) SELECT a thread_message_attachments row whose parent message has visibility='internal'? The PERMISSIVE select policy + RESTRICTIVE hide-internal policy combine — verify the AND semantics actually exclude internal attachments. Also: does the storage RLS on thread-attachments bucket re-check internal visibility, or only workspace membership? If a member knows the storage_path of an internal attachment (e.g. leaked via timing/error message), can they get a signed URL for it via thread-panel-server.tsx's bulk signed-URL pass?
.yagi-autobuild\archive\phase-1\_codex_review_1_2_prompt.txt:19:1. **RLS visibility leaks** — can a workspace_member with role='member' (non-yagi_admin, non-ws_admin) SELECT a thread_message with visibility='internal'? Can they enumerate other workspaces' projects by manipulating the workspace filter on /admin/projects (a regular member should be redirected at the layout, but verify the action layer too)?
.yagi-autobuild\archive\phase-1\_codex_review_1_3_prompt.txt:30:- RLS: meetings_select (is_ws_member OR is_yagi_admin), meetings_insert (is_ws_admin OR is_yagi_admin), meetings_update (same as insert), meeting_attendees_select (via meetings chain), meeting_attendees_insert (via meetings chain)
.yagi-autobuild\archive\phase-1\_codex_review_1_3_prompt.txt:57:   (b) Can they insert a meeting_attendees row for a meeting whose workspace they're not an admin of? The `meeting_attendees_insert` policy uses EXISTS on meetings with is_ws_admin. If the exists subquery returns false, insert blocked. But: is there any SQL-injection or case where the exists subquery could be short-circuited?
.yagi-autobuild\archive\phase-1\_codex_review_1_3_prompt.txt:58:   (c) UPDATE on meetings: policy `meetings_update` uses `is_ws_admin OR is_yagi_admin`. USING clause only — no WITH CHECK. Can a ws_admin of workspace A UPDATE a meeting to move it to workspace B (by changing workspace_id)? The USING allows read, but does PostgreSQL prevent the UPDATE to change workspace_id if there's no WITH CHECK?
.yagi-autobuild\archive\phase-1\_codex_review_1_3_prompt.txt:59:   (d) The Server Actions hit Supabase with the user's session — so RLS applies. But createMeeting does `supabase.from('meetings').insert(...)` with `workspace_id` from the fetched project row. What if a malicious caller's projectId maps to a workspace they're NOT ws_admin of, but the server code still passes auth? The server-side check in actions.ts step 4 does `is_ws_admin OR is_yagi_admin` — verify this can't be bypassed by race condition (project re-parented between steps 3 and 4).
.yagi-autobuild\archive\phase-1\_codex_review_1_4_output.txt:19:Fix: Before insert, load the target project and require the caller to be allowed on that project (or require `is_yagi_admin` explicitly).
.yagi-autobuild\archive\phase-1\_codex_review_1_4_output.txt:22:Exploit: The page guards explicitly allow `is_ws_member(uid, yagi-internal)` rather than `is_yagi_admin`, so adding one non-admin user to `yagi-internal` grants board-list/editor access across all client projects.
.yagi-autobuild\archive\phase-1\_codex_review_1_4_output.txt:23:Fix: Gate preprod pages/actions on `is_yagi_admin` or a dedicated preprod role, not generic membership in the internal workspace.
.yagi-autobuild\archive\phase-1\_codex_review_1_4_prompt.txt:36:- RLS: preprod_boards select uses is_yagi_admin(auth.uid()) OR is_ws_member(auth.uid(), workspace_id); insert/update use is_ws_admin
.yagi-autobuild\archive\phase-1\_codex_review_1_4_prompt.txt:56:   (a) preprod_boards_select policy: is_yagi_admin(auth.uid()) OR is_ws_member(auth.uid(), workspace_id). Since the workspace_id is *yagi-internal*, can a non-yagi-admin who happens to be a workspace_member of yagi-internal see ALL boards across all client projects? Is this intentional? If so, who should be granted yagi-internal membership?
.yagi-autobuild\archive\phase-1\results\1-2-5_MIG_migration.md:15:- `thread_messages` RLS tightened: insert visibility='internal' restricted to `is_yagi_admin`
.yagi-autobuild\archive\phase-1\results\1-3_06_actions.md:24:`is_ws_admin` and `is_yagi_admin` are called in `Promise.all` for parallelism. Both RPCs match the DB types exactly (`{ uid, wsid }` and `{ uid }`).
.yagi-autobuild\archive\phase-1\results\13_storage_policy_review.md:18:- SELECT (`refs_read`): properly joined via project_references + projects with `is_ws_member()` / `is_yagi_admin()`.
.yagi-autobuild\archive\phase-1\results\13_storage_policy_review.md:45:        AND (is_ws_member(auth.uid(), p.workspace_id) OR is_yagi_admin(auth.uid()))
.yagi-autobuild\archive\phase-1\results\13_storage_policy_review.md:50:Helper signatures verified pre-apply: `is_ws_member(uid uuid, wsid uuid)`, `is_yagi_admin(uid uuid)`.

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -e 'case \"creator\"' -e \"case 'creator'\" -e 'switch \\(["'^'"\\r\\n]*role' -e 'ProfileRole' -e 'z\\.enum\\(' -e 'creator.*studio.*observer.*client' -e 'roleSchema' src scripts supabase -g '"'!node_modules'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -e \"profiles\\.role\" -e \"profile\\.role\" -e \"ctx\\.profile\\.role\" -e \"role ===\" -e \"role "'!==" -e "role:.*creator" -e "role:.*studio" -e "role:.*client" -e "role:.*observer" src -g '"'"'!node_modules'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -e \"p\\.role\" -e \"profiles.*role\" -e \"role IN\" -e \"role in\" -e \"role = ANY\" -e \"role = 'creator'\" -e \"role = 'studio'\" -e \"role = 'client'\" -e \"role = 'observer'\" -e \"role='artist'\" supabase/migrations -g '"'!node_modules'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -e \"validate_profile_role_transition\" -e \"CREATE OR REPLACE FUNCTION public\\.validate_profile_role_transition\" -e \"CREATE OR REPLACE FUNCTION public\\.handle_new_user\" -e \"CREATE FUNCTION public\\.is_yagi_admin\" -e \"CREATE FUNCTION public\\.is_ws_admin\" -e \"CREATE OR REPLACE FUNCTION public\\.is_yagi_admin\" -e \"CREATE OR REPLACE FUNCTION public\\.is_ws_admin\" supabase/migrations" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 448ms:
scripts\create-artist-account.ts:15: *          (role = ANY (ARRAY['creator','studio','observer','client'])))
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
src\lib\app\context.ts:19:export type ProfileRole = "creator" | "studio" | "observer" | "client" | "artist";
src\lib\app\context.ts:41:    role: ProfileRole | null;
src\lib\app\context.ts:91:      role: (profile.role as ProfileRole | null) ?? null,
src\components\meetings\new-meeting-form.tsx:42:  durationMinutes: z.enum(["30", "45", "60", "90"]),
src\app\api\share\[token]\reactions\route.ts:9:  reaction: z.enum(["like", "dislike", "needs_change"]),
supabase\migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:5:-- still only allowed creator/studio/observer/client. yagi visual review
supabase\migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:11:-- Scope: additive only. Existing rows (creator/studio/observer/client/NULL)
supabase\migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:27:    (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
src\lib\onboarding\role-redirects.ts:4:// creator/studio/observer/client personae. Phase 4.x locks persona A
src\lib\onboarding\role-redirects.ts:12:import type { ProfileRole } from "@/lib/app/context";
src\lib\onboarding\role-redirects.ts:15:  role: ProfileRole | null;
src\app\[locale]\app\team\[slug]\actions.ts:30:  kind: z.enum(["image", "video", "pdf", "file"]),
src\app\[locale]\app\team\[slug]\actions.ts:38:  locale: z.enum(["ko", "en"]),
src\app\[locale]\app\support\actions.ts:30:  status: z.enum(["open", "closed"]),
src\app\[locale]\app\invoices\[id]\line-item-actions.ts:70:  source_type: z.enum(["meeting", "storyboard"]).optional().nullable(),
src\app\[locale]\app\invoices\[id]\line-item-actions.ts:308:  source_type: z.enum(["meeting", "storyboard"]),
src\app\[locale]\app\projects\[id]\thread-actions.ts:13:  visibility: z.enum(["shared", "internal"]).default("shared"),
src\app\[locale]\app\projects\[id]\thread-actions.ts:123:  kind: z.enum(["image", "video", "pdf", "file"]),
src\app\[locale]\app\projects\[id]\thread-actions.ts:131:    visibility: z.enum(["shared", "internal"]).default("shared"),
src\app\[locale]\app\projects\[id]\ref-actions.ts:9:const embedProviderSchema = z.enum(["youtube", "vimeo", "tiktok", "instagram"]);
src\app\[locale]\app\showcases\actions.ts:705:    mediaType: z.enum(["image", "video_upload", "video_embed"]),
src\app\[locale]\app\settings\profile-form.tsx:20:  locale: z.enum(["ko", "en"]),
src\app\[locale]\app\projects\[id]\actions.ts:9:  newStatus: z.enum([
src\app\[locale]\app\settings\notifications\prefs-form.tsx:26:  timezone: z.enum(TIMEZONES),
src\app\[locale]\app\projects\new\new-project-wizard.tsx:101:  budget_band: z.enum(["under_1m", "1m_to_5m", "5m_to_10m", "negotiable"]),
src\app\[locale]\app\projects\new\new-project-wizard.tsx:121:  twin_intent: z.enum(["undecided", "specific_in_mind", "no_twin"]),
src\app\[locale]\app\projects\new\actions.ts:47:  intent: z.enum(["draft", "submit"]).default("draft"),
src\app\[locale]\app\projects\new\actions.ts:203:  intent: z.enum(["draft", "submit"]),
src\app\[locale]\app\projects\new\actions.ts:718:  provider: z.enum(["youtube", "vimeo", "generic"]),
src\app\[locale]\app\projects\new\actions.ts:729:  budget_band: z.enum(["under_1m", "1m_to_5m", "5m_to_10m", "negotiable"]),
src\app\[locale]\app\settings\notifications\actions.ts:19:  timezone: z.enum(TIMEZONES),
src\lib\commission\schemas.ts:65:  category: z.enum(COMMISSION_CATEGORIES),
src\lib\commission\schemas.ts:66:  budget_range: z.enum(BUDGET_RANGES),
src\lib\commission\schemas.ts:109:  company_type: z.enum(COMPANY_TYPES),
src\app\[locale]\app\settings\actions.ts:26:  locale: z.enum(["ko", "en"]),
src\app\[locale]\app\settings\actions.ts:155:  role: z.enum(["workspace_admin", "workspace_member"]),
src\lib\challenges\config-schemas.ts:7:  formats: z.array(z.enum(["mp4"])).min(1),
src\lib\challenges\config-schemas.ts:14:  formats: z.array(z.enum(["jpg", "png", "jpeg"])).min(1),
src\components\app\sidebar-nav.tsx:29:import type { ProfileRole, WorkspaceRole } from "@/lib/app/context";
src\components\app\sidebar-nav.tsx:42:  profileRoles?: ProfileRole[];
src\components\app\sidebar-nav.tsx:166:  profileRole: ProfileRole | null,
src\components\app\sidebar-nav.tsx:190:  profileRole: ProfileRole | null,
src\components\app\sidebar-nav.tsx:257:  profileRole: ProfileRole | null;
src\components\app\sidebar-user-menu.tsx:14:import type { ProfileRole, WorkspaceRole } from "@/lib/app/context";
src\components\app\sidebar-user-menu.tsx:22:  role: ProfileRole | null;
src\components\app\sidebar-user-menu.tsx:46:  switch (profile.role) {

 succeeded in 392ms:
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1789:    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['creator'::text, 'workspace_admin'::text, 'workspace_member'::text, 'yagi_admin'::text]))),
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1808:    CONSTRAINT workspace_invitations_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1825:    CONSTRAINT workspace_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4440:CREATE POLICY user_roles_self_insert_creator ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'creator'::text) AND (workspace_id IS NULL)));
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:24:--       and orphan showcase winner display. profiles.role flip is the canonical
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:67:  ADD COLUMN role text CHECK (role IS NULL OR role IN ('creator','studio','observer')),
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:105:-- Observer: no child table. profiles.role='observer' alone signals the role.
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:224:-- Note: no DELETE policy. Soft-delete via profiles.role change (set to NULL
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:233:-- their `profiles.role`. Prevents role=studio users from inserting a
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:240:      WHERE p.id = auth.uid() AND p.role = 'creator'
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:248:-- Note: no DELETE policy. Soft-delete via profiles.role change (set to NULL
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:257:-- their `profiles.role`. Prevents role=creator users from inserting a
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:264:      WHERE p.id = auth.uid() AND p.role = 'studio'
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:299:      WHERE p.id = auth.uid() AND p.role IN ('creator','studio')
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:18:--        tightens UPDATE policies with role EXISTS + adds dual-role INSERT
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:22:--        queries in G3/G6 must join profiles.role to surface only active
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:138:      WHERE p.id = auth.uid() AND p.role = 'creator'
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:145:      WHERE p.id = auth.uid() AND p.role = 'creator'
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:156:      WHERE p.id = auth.uid() AND p.role = 'studio'
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:163:      WHERE p.id = auth.uid() AND p.role = 'studio'
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:167:-- 3b. Dual-role INSERT block triggers (defense against race after RLS).
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:211:-- role-match policies. G3/G6 read queries must join profiles.role to
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:216:CREATE OR REPLACE FUNCTION public.tg_profiles_role_flip_cleanup()
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:229:-- current profiles.role.
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:232:  'read queries must filter by current profiles.role.';
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:236:  'queries must filter by current profiles.role.';
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:10:--   N-L2 (LOW) — tg_profiles_role_flip_cleanup scaffold body was RETURN NEW
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:23:--   §3 — tg_profiles_role_flip_cleanup scaffold body changed from RETURN NEW
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:120:-- 3. N-L2 — scaffold guard: tg_profiles_role_flip_cleanup raises loudly
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:123:CREATE OR REPLACE FUNCTION public.tg_profiles_role_flip_cleanup()
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:136:  RAISE EXCEPTION 'tg_profiles_role_flip_cleanup scaffold — implement policy body before attaching trigger'
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:11:--   1. profiles.role enum extension ('client')
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:22:-- 1. profiles role enum — add 'client'
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:26:-- (auto-named profiles_role_check). Drop+recreate keeps the NULL-allowed
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:28:ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:29:ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:54:  'Phase 2.7 — company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:157:      WHERE p.id = (select auth.uid()) AND p.role = 'client'
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:176:-- profiles/auth.users deletion only. Manual delete via DB role for support cases.
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:191:-- INSERT: only the client themselves, and only after their profiles.role is
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:196:-- profiles.role to 'client' from any prior non-null role.
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:206:      WHERE p.id = (select auth.uid()) AND p.role = 'client'
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:307:-- 6b. profiles.role transition guard (K05-001 Finding 1, HIGH-A)
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:313:--   1. UPDATE profiles SET role = 'client'
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:345:    IF NEW.role = 'client' AND OLD.role IS NOT NULL THEN
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:367:    IF OLD.role = 'client' AND NEW.role IS DISTINCT FROM 'client' THEN
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:144:                                 CHECK (actor_role IN (
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:258:-- actor_role IN ('yagi_admin','workspace_admin'):
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:289:    WHEN actor_role = 'client' THEN
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:307:    WHEN actor_role IN ('yagi_admin','workspace_admin') THEN
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:426:  IF v_actor_role = 'client' AND v_actor_id <> v_created_by THEN
supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:1:-- Phase 4.x Wave C.5b amend_02 — widen profiles_role_check to include 'artist'.
supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:4:-- as Brand + Artist + YAGI Admin. The profiles_role_check CHECK constraint
supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:22:  DROP CONSTRAINT IF EXISTS profiles_role_check;
supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:25:  ADD CONSTRAINT profiles_role_check CHECK (
supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:27:    (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
supabase/migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:14:-- Default role = 'client' since persona A = Brand-only active persona.
supabase/migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:64:  INSERT INTO public.profiles (id, handle, display_name, role, locale)

 succeeded in 390ms:
supabase/migrations\20260422120000_phase_2_0_baseline.sql:154:CREATE FUNCTION public.is_ws_admin(uid uuid, wsid uuid) RETURNS boolean
supabase/migrations\20260422120000_phase_2_0_baseline.sql:181:CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boolean
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:195:-- validate_profile_role_transition trigger (§9) which prevents self-flipping
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:322:CREATE OR REPLACE FUNCTION public.validate_profile_role_transition()
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:378:REVOKE ALL ON FUNCTION public.validate_profile_role_transition() FROM PUBLIC;
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:380:DROP TRIGGER IF EXISTS validate_profile_role_transition_trigger
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:383:CREATE TRIGGER validate_profile_role_transition_trigger
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:386:  EXECUTE FUNCTION public.validate_profile_role_transition();
supabase/migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:19:CREATE OR REPLACE FUNCTION public.handle_new_user()
supabase/migrations\20260501140308_phase_4_x_handle_new_user_search_path_hardening.sql:3:-- transition_project_status / is_valid_transition / validate_profile_role_transition

 succeeded in 472ms:
src\components\app\sidebar.tsx:70:          profileRole={context.profile.role}
src\lib\app\context.ts:13:// `profile.role ===` — see ADR-009 naming rule.
src\lib\app\context.ts:91:      role: (profile.role as ProfileRole | null) ?? null,
src\components\app\sidebar-user-menu.tsx:41:  // Workspace roles take precedence over profile.role for the badge —
src\components\app\sidebar-user-menu.tsx:46:  switch (profile.role) {
src\components\app\sidebar-nav.tsx:40:  /** Visible if user's `profile.role` matches one of these. See ADR-009 for why
src\components\challenges\primary-cta-button.tsx:55:      if (role === "creator" || role === "studio") {
src\components\challenges\primary-cta-button.tsx:58:      } else if (role === "observer") {
src\app\challenges\[slug]\submit\page.tsx:87:  if (role === "observer") {
src\app\challenges\[slug]\submit\page.tsx:94:  if (role !== "creator" && role !== "studio") {
src\components\challenges\header-cta-resolver.tsx:54:  if (role === "creator" || role === "studio") {
src\app\challenges\[slug]\submit\actions.ts:73:  if (role !== "creator" && role !== "studio") return { ok: false, error: "wrong_role" };
src\app\challenges\[slug]\submit\actions.ts:159:  if (role !== "creator" && role !== "studio") return { ok: false, error: "wrong_role" };
src\lib\commission\actions.ts:42:  if (!profile || profile.role !== "client") {
src\lib\onboarding\actions.ts:13:  role: "client" | "creator";
src\lib\onboarding\actions.ts:30:  if (formData.role === "creator") {
src\lib\onboarding\actions.ts:33:      .insert({ user_id: user.id, role: "creator", workspace_id: null });
src\lib\onboarding\role-redirects.ts:28:  if (profile.role === null) {
src\components\project\thread-panel-server.tsx:80:          r.role === "yagi_admin"
src\components\project\thread-panel-server.tsx:82:            : r.role === "workspace_admin"
src\components\project\thread-panel-server.tsx:84:              : r.role === "workspace_member"
src\components\projects\status-timeline.tsx:166:                      : row.actor_role === 'system'
src\components\projects\status-timeline.tsx:168:                      : row.actor_role === 'yagi_admin'
src\components\projects\status-timeline.tsx:170:                      : row.actor_role === 'workspace_admin'
src\app\[locale]\app\commission\page.tsx:29:  if (!profile || profile.role !== "client") {
src\app\[locale]\app\layout.tsx:42:  const isClient = ctx.profile.role === "client";
src\app\[locale]\app\settings\team-panel.tsx:43:                  {m.role === "workspace_admin"
src\app\[locale]\app\projects\[id]\thread-actions.ts:407:    if (r.role === "yagi_admin") isYagi.add(r.user_id);
src\app\[locale]\app\projects\[id]\thread-actions.ts:408:    if (r.role === "workspace_admin") isAdmin.add(r.user_id);
src\app\[locale]\app\projects\[id]\board-actions.ts:257:    (r) => (r as { role: string }).role === "yagi_admin"
src\app\[locale]\app\projects\[id]\board-actions.ts:331:    (r) => (r as { role: string }).role === "yagi_admin"
src\app\[locale]\app\admin\projects\[id]\page.tsx:35:  const isYagiAdmin = (roleRows ?? []).some((r) => r.role === "yagi_admin");

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/components/app/sidebar-nav.tsx' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/lib/onboarding/role-redirects.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/components/challenges/primary-cta-button.tsx' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/components/challenges/header-cta-resolver.tsx' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/challenges/[slug]/submit/actions.ts' | ForEach-Object { "'$i++; if ($i -le 190) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/challenges/[slug]/submit/page.tsx' | ForEach-Object { "'$i++; if ($i -le 125) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 433ms:
   1: // Onboarding redirect resolver ??Phase 4.x Wave C.5b sub_01 simplified.
   2: //
   3: // Phase 2.5 introduced a 3-step flow (role ??profile ??/u/<handle>) for
   4: // creator/studio/observer/client personae. Phase 4.x locks persona A
   5: // (Brand only) and retires the role step entirely; first-touch
   6: // onboarding is the workspace form.
   7: //
   8: // This module is retained as a thin compat shim for any caller still
   9: // importing `resolveOnboardingRedirect`. All non-completed flows now
  10: // route to /onboarding/workspace.
  11: 
  12: import type { ProfileRole } from "@/lib/app/context";
  13: 
  14: export type OnboardingProfile = {
  15:   role: ProfileRole | null;
  16:   handle: string | null;
  17:   hasRoleChildRow: boolean;
  18: };
  19: 
  20: export type OnboardingRedirect = {
  21:   href: string;
  22:   reason: "role_missing" | "profile_missing" | "complete";
  23: };
  24: 
  25: export function resolveOnboardingRedirect(
  26:   profile: OnboardingProfile
  27: ): OnboardingRedirect {
  28:   if (profile.role === null) {
  29:     return { href: "/onboarding/workspace", reason: "role_missing" };
  30:   }
  31: 
  32:   if (profile.handle === null || !profile.hasRoleChildRow) {
  33:     return { href: "/onboarding/workspace", reason: "profile_missing" };
  34:   }
  35: 
  36:   return { href: "/app", reason: "complete" };
  37: }

 succeeded in 462ms:
   1: "use client";
   2: 
   3: import { useState, useMemo } from "react";
   4: import { useTranslations } from "next-intl";
   5: import { Link, usePathname } from "@/i18n/routing";
   6: import { useSearchParams } from "next/navigation";
   7: import {
   8:   CalendarDays,
   9:   Receipt,
  10:   Settings,
  11:   ShieldCheck,
  12:   MessageSquare,
  13:   Trophy,
  14:   Briefcase,
  15:   LayoutDashboard,
  16:   Sparkles,
  17:   Mailbox,
  18:   ChevronDown,
  19:   type LucideIcon,
  20: } from "lucide-react";
  21: import { cn } from "@/lib/utils";
  22: import {
  23:   Tooltip,
  24:   TooltipContent,
  25:   TooltipProvider,
  26:   TooltipTrigger,
  27: } from "@/components/ui/tooltip";
  28: import { SidebarGroupLabel } from "./sidebar-group-label";
  29: import type { ProfileRole, WorkspaceRole } from "@/lib/app/context";
  30: 
  31: type NavItem = {
  32:   key: string;
  33:   href?: string;
  34:   icon?: LucideIcon;
  35:   disabled?: boolean;
  36:   /** Visible if user has any of these workspace roles. Combined with `profileRoles`
  37:    *  via OR ??passing either gate makes the item visible. If both are unset, item
  38:    *  is visible to everyone. */
  39:   roles?: WorkspaceRole[];
  40:   /** Visible if user's `profile.role` matches one of these. See ADR-009 for why
  41:    *  profile-role and workspace-role are split. */
  42:   profileRoles?: ProfileRole[];
  43:   children?: NavItem[];
  44: };
  45: 
  46: type NavGroup = {
  47:   key: "work" | "communication" | "billing" | "system";
  48:   items: NavItem[];
  49: };
  50: 
  51: const GROUPS: NavGroup[] = [
  52:   {
  53:     key: "work",
  54:     items: [
  55:       {
  56:         // Phase 4.x task_05: Brand workspace dashboard. First WORK item
  57:         // per KICKOFF section task_05 spec; sits above ?꾨줈?앺듃.
  58:         key: "dashboard",
  59:         href: "/app/dashboard",
  60:         icon: LayoutDashboard,
  61:       },
  62:       {
  63:         // Phase 2.7.2: projects hub restored as the canonical commission
  64:         // surface (Option C ??funnel split). `/commission` stays as the
  65:         // public-facing landing form for anonymous intake; once a user is
  66:         // logged in, `/app/projects` is the hub (full 4-step wizard,
  67:         // references, review). Visible to every authenticated user;
  68:         // admin/internal members rely on this entry to QA the client
  69:         // flow without leaving to the public site.
  70:         key: "projects",
  71:         href: "/app/projects",
  72:         icon: Briefcase,
  73:       },
  74:       {
  75:         // Phase 4.x task_05 + Q-103: 異붿쿇 Artist disabled placeholder
  76:         // for Phase 7+. Renders as a disabled link with 'Coming soon'
  77:         // tooltip. Q-103 option A: ?쇱씠?좎뒪 entry is HIDDEN (Phase 6+),
  78:         // intentionally not added here.
  79:         key: "recommended_artist",
  80:         icon: Sparkles,
  81:         disabled: true,
  82:       },
  83:       {
  84:         // Phase 2.5 admin challenge console ??yagi_admin only.
  85:         key: "challenges",
  86:         icon: Trophy,
  87:         roles: ["yagi_admin"],
  88:         children: [
  89:           { key: "challenges_all", href: "/app/admin/challenges" },
  90:           { key: "challenges_new", href: "/app/admin/challenges/new" },
  91:           { key: "challenges_open", href: "/app/admin/challenges?state=open" },
  92:         ],
  93:       },
  94:       // Phase 2.7.1: preprod / showcases / storyboards / brands removed
  95:       // from the active sidebar. Routes still work for direct navigation;
  96:       // phasing out from primary IA per visibility pass.
  97:     ],
  98:   },
  99:   {
 100:     key: "communication",
 101:     items: [
 102:       {
 103:         key: "meetings",
 104:         href: "/app/meetings",
 105:         icon: CalendarDays,
 106:         roles: ["workspace_admin", "workspace_member"],
 107:       },
 108:       // Phase 2.8.5 ??`notifications` removed from sidebar. Yagi:
 109:       // duplicates the top-right bell + the route surfaced an error.
 110:       // The /app/notifications page itself stays (the bell links to
 111:       // it); only the sidebar entry is gone. The `nav.notifications`
 112:       // i18n key is preserved in messages/* ??the bell's tooltip and
 113:       // the page header still read it.
 114:       // `team` is injected at render time when the user is a yagi-internal member.
 115:     ],
 116:   },
 117:   {
 118:     key: "billing",
 119:     items: [
 120:       {
 121:         key: "billing_group",
 122:         icon: Receipt,
 123:         children: [
 124:           {
 125:             key: "invoices",
 126:             href: "/app/invoices",
 127:             roles: ["yagi_admin", "workspace_admin"],
 128:           },
 129:           { key: "admin_invoices", href: "/app/admin/invoices", roles: ["yagi_admin"] },
 130:         ],
 131:       },
 132:     ],
 133:   },
 134:   {
 135:     key: "system",
 136:     items: [
 137:       { key: "settings", href: "/app/settings", icon: Settings },
 138:       { key: "admin", href: "/app/admin", icon: ShieldCheck, roles: ["yagi_admin"] },
 139:       {
 140:         // G3 lands /app/admin/commissions queue + [id] response form.
 141:         key: "admin_commissions",
 142:         href: "/app/admin/commissions",
 143:         icon: Mailbox,
 144:         roles: ["yagi_admin"],
 145:       },
 146:       {
 147:         // Phase 2.8.2 G_B2_A ??yagi_admin trash console for soft-deleted
 148:         // projects. 3-day undelete window + permanent delete action.
 149:         key: "admin_trash",
 150:         href: "/app/admin/trash",
 151:         roles: ["yagi_admin"],
 152:       },
 153:       {
 154:         // Phase 2.8.6 ??yagi_admin support chat reply surface.
 155:         key: "admin_support",
 156:         href: "/app/admin/support",
 157:         roles: ["yagi_admin"],
 158:       },
 159:     ],
 160:   },
 161: ];
 162: 
 163: function isRoleVisible(
 164:   item: NavItem,
 165:   roles: WorkspaceRole[],
 166:   profileRole: ProfileRole | null,
 167: ): boolean {
 168:   const wsGated = item.roles && item.roles.length > 0;
 169:   const profileGated = item.profileRoles && item.profileRoles.length > 0;
 170:   // Ungated ??visible.
 171:   if (!wsGated && !profileGated) return true;
 172:   // Either gate match makes the item visible (OR semantics).
 173:   const wsMatch = wsGated ? item.roles!.some((r) => roles.includes(r)) : false;
 174:   const profileMatch =
 175:     profileGated && profileRole !== null
 176:       ? item.profileRoles!.includes(profileRole)
 177:       : false;
 178:   return wsMatch || profileMatch;
 179: }
 180: 
 181: /**
 182:  * Filter an item by role.
 183:  * - Leaf: returns self if visible, else null.
 184:  * - Parent (has children): filter children recursively. If 0 ??null. If 1 ??collapse
 185:  *   into the single child so the parent wrapper disappears (IMPLEMENTATION 짠1 rule).
 186:  */
 187: function filterItem(
 188:   item: NavItem,
 189:   roles: WorkspaceRole[],
 190:   profileRole: ProfileRole | null,
 191: ): NavItem | null {
 192:   if (!isRoleVisible(item, roles, profileRole)) return null;
 193:   if (!item.children) return item;
 194:   const kept = item.children
 195:     .map((c) => filterItem(c, roles, profileRole))
 196:     .filter((c): c is NavItem => c !== null);
 197:   if (kept.length === 0) return null;
 198:   if (kept.length === 1) return kept[0];
 199:   return { ...item, children: kept };
 200: }
 201: 
 202: type FlatLeaf = { key: string; href: string };
 203: 
 204: function collectLeaves(items: NavItem[]): FlatLeaf[] {
 205:   const out: FlatLeaf[] = [];
 206:   for (const it of items) {
 207:     if (it.children) {
 208:       out.push(...collectLeaves(it.children));
 209:     } else if (it.href) {
 210:       out.push({ key: it.key, href: it.href });
 211:     }
 212:   }
 213:   return out;
 214: }
 215: 
 216: function computeActiveKey(
 217:   leaves: FlatLeaf[],
 218:   pathname: string,
 219:   search: URLSearchParams,
 220: ): string | null {
 221:   let bestKey: string | null = null;
 222:   let bestLen = -1;
 223:   // Phase 1: exact query-bound matches take precedence on their pathname.
 224:   for (const l of leaves) {
 225:     const [base, query] = l.href.split("?");
 226:     if (!query) continue;
 227:     if (pathname !== base) continue;
 228:     const wanted = new URLSearchParams(query);
 229:     let allMatch = true;
 230:     for (const [k, v] of wanted) {
 231:       if (search.get(k) !== v) {
 232:         allMatch = false;
 233:         break;
 234:       }
 235:     }
 236:     if (allMatch) return l.key;
 237:   }
 238:   // Phase 2: longest-prefix-wins among non-query leaves.
 239:   for (const l of leaves) {
 240:     const [base, query] = l.href.split("?");
 241:     if (query) continue;
 242:     if (pathname !== base && !pathname.startsWith(base + "/")) continue;
 243:     if (base.length > bestLen) {
 244:       bestLen = base.length;
 245:       bestKey = l.key;
 246:     }
 247:   }
 248:   return bestKey;
 249: }
 250: 
 251: export function SidebarNav({
 252:   roles,
 253:   profileRole,
 254:   isYagiInternalMember,
 255: }: {
 256:   roles: WorkspaceRole[];
 257:   profileRole: ProfileRole | null;
 258:   isYagiInternalMember: boolean;
 259: }) {
 260:   const t = useTranslations("nav");
 261:   const pathname = usePathname();
 262:   const searchParams = useSearchParams();
 263: 
 264:   // Runtime-injected `team` item (yagi-internal member only).
 265:   const runtimeGroups: NavGroup[] = useMemo(() => {
 266:     if (!isYagiInternalMember) return GROUPS;
 267:     return GROUPS.map((g) => {
 268:       if (g.key !== "communication") return g;
 269:       return {
 270:         ...g,
 271:         items: [
 272:           ...g.items,
 273:           { key: "team", href: "/app/team", icon: MessageSquare } as NavItem,
 274:         ],
 275:       };
 276:     });
 277:   }, [isYagiInternalMember]);
 278: 
 279:   const visibleGroups = runtimeGroups
 280:     .map((g) => {
 281:       const items = g.items
 282:         .map((it) => filterItem(it, roles, profileRole))
 283:         .filter((it): it is NavItem => it !== null);
 284:       return { ...g, items };
 285:     })
 286:     .filter((g) => g.items.length > 0);
 287: 
 288:   const allLeaves = useMemo(
 289:     () => collectLeaves(visibleGroups.flatMap((g) => g.items)),
 290:     [visibleGroups],
 291:   );
 292:   const activeKey = computeActiveKey(allLeaves, pathname, searchParams);
 293: 
 294:   return (
 295:     <TooltipProvider delayDuration={300}>
 296:       <nav className="flex flex-col px-2 pb-3" aria-label="Operations">
 297:         {visibleGroups.map((group) => {
 298:           const showLabel = group.items.length >= 2;
 299:           return (
 300:             <div
 301:               key={group.key}
 302:               role="group"
 303:               aria-labelledby={showLabel ? `nav-group-${group.key}` : undefined}
 304:             >
 305:               {showLabel && (
 306:                 <SidebarGroupLabel>
 307:                   <span id={`nav-group-${group.key}`}>
 308:                     {t(`groups.${group.key}`)}
 309:                   </span>
 310:                 </SidebarGroupLabel>
 311:               )}
 312:               <div className="flex flex-col gap-0.5">
 313:                 {group.items.map((item) =>
 314:                   item.children ? (
 315:                     <ParentRow
 316:                       key={item.key}
 317:                       item={item}
 318:                       activeKey={activeKey}
 319:                       t={t}
 320:                     />
 321:                   ) : (
 322:                     <NavLink
 323:                       key={item.key}
 324:                       item={item}
 325:                       label={t(item.key)}
 326:                       active={activeKey === item.key}
 327:                       indent={0}
 328:                     />
 329:                   ),
 330:                 )}
 331:               </div>
 332:             </div>
 333:           );
 334:         })}
 335:       </nav>
 336:     </TooltipProvider>
 337:   );
 338: }
 339: 
 340: function ParentRow({
 341:   item,
 342:   activeKey,
 343:   t,
 344: }: {
 345:   item: NavItem;
 346:   activeKey: string | null;
 347:   t: ReturnType<typeof useTranslations>;
 348: }) {
 349:   const hasActiveChild = (item.children ?? []).some(
 350:     (c) => c.key === activeKey,
 351:   );
 352:   const [open, setOpen] = useState(hasActiveChild);
 353:   // Keep open synced with route changes: when a child becomes active, expand.
 354:   // (Initial render + on active change both handled by lifting the initial to useState
 355:   //  + a cheap derived-state pattern below.)
 356:   const effectiveOpen = open || hasActiveChild;
 357: 
 358:   const Icon = item.icon;
 359:   return (
 360:     <div>
 361:       <button
 362:         type="button"
 363:         onClick={() => setOpen((o) => !o)}
 364:         aria-expanded={effectiveOpen}
 365:         className={cn(
 366:           "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors",
 367:           "text-muted-foreground hover:text-foreground",
 368:         )}
 369:       >
 370:         {Icon && <Icon className="w-3.5 h-3.5" />}
 371:         <span className="flex-1 text-left">{t(item.key)}</span>
 372:         <ChevronDown
 373:           className={cn(
 374:             "w-3 h-3 transition-transform",
 375:             effectiveOpen ? "rotate-0" : "-rotate-90",
 376:           )}
 377:         />
 378:       </button>
 379:       {effectiveOpen && (
 380:         <div className="flex flex-col gap-0.5">
 381:           {item.children!.map((child) => (
 382:             <NavLink
 383:               key={child.key}
 384:               item={child}
 385:               label={t(child.key)}
 386:               active={activeKey === child.key}
 387:               indent={1}
 388:             />
 389:           ))}
 390:         </div>
 391:       )}
 392:     </div>
 393:   );
 394: }
 395: 
 396: function NavLink({
 397:   item,
 398:   label,
 399:   active,
 400:   indent,
 401: }: {
 402:   item: NavItem;
 403:   label: string;
 404:   active: boolean;
 405:   indent: 0 | 1;
 406: }) {
 407:   const Icon = item.icon;
 408:   // Phase 2.7.1 P12-3: bumped resting contrast (muted ??85) and active
 409:   // weight (font-semibold) so the active item reads as anchor, not label.
 410:   const base = cn(
 411:     "flex items-center gap-2.5 py-2 rounded-md text-[13px] transition-colors",
 412:     indent === 0 ? "px-3" : "pl-9 pr-3",
 413:     active
 414:       ? "text-foreground bg-accent font-semibold"
 415:       : "text-foreground/85 hover:text-foreground hover:bg-accent/50",
 416:     item.disabled && "opacity-50 cursor-not-allowed pointer-events-none",
 417:   );
 418: 
 419:   const content = (
 420:     <>
 421:       {Icon && indent === 0 && <Icon className="w-3.5 h-3.5" />}
 422:       <span>{label}</span>
 423:     </>
 424:   );
 425: 
 426:   if (item.disabled) {
 427:     return (
 428:       <Tooltip>
 429:         <TooltipTrigger asChild>
 430:           <span className={base}>{content}</span>
 431:         </TooltipTrigger>
 432:         <TooltipContent side="right">Coming soon</TooltipContent>
 433:       </Tooltip>
 434:     );
 435:   }
 436: 
 437:   if (!item.href) {
 438:     return <span className={base}>{content}</span>;
 439:   }
 440: 
 441:   return (
 442:     <Link
 443:       href={item.href}
 444:       className={base}
 445:       aria-current={active ? "page" : undefined}
 446:     >
 447:       {content}
 448:     </Link>
 449:   );
 450: }

 succeeded in 453ms:
   1: import Link from "next/link";
   2: import { headers } from "next/headers";
   3: import { Button } from "@/components/ui/button";
   4: import { createSupabaseServer } from "@/lib/supabase/server";
   5: 
   6: // TODO: Replace literal strings with useTranslations once A2 i18n keys land.
   7: // Awaiting challenges namespace: header_cta_new_challenge, header_cta_submit,
   8: // header_cta_observer, header_cta_signin
   9: 
  10: export async function HeaderCtaResolver() {
  11:   const supabase = await createSupabaseServer();
  12:   const {
  13:     data: { user },
  14:   } = await supabase.auth.getUser();
  15: 
  16:   const headersList = await headers();
  17:   const currentPath = headersList.get("x-pathname") ?? "/challenges";
  18: 
  19:   if (!user) {
  20:     return (
  21:       <Button size="pill" asChild>
  22:         <Link href={`/signin?next=${encodeURIComponent(currentPath)}`}>
  23:           李몄뿬 ?쒖옉?섍린
  24:         </Link>
  25:       </Button>
  26:     );
  27:   }
  28: 
  29:   // Check is_yagi_admin via user_roles table
  30:   const { data: adminRow } = await supabase
  31:     .from("user_roles")
  32:     .select("role")
  33:     .eq("user_id", user.id)
  34:     .eq("role", "yagi_admin")
  35:     .maybeSingle();
  36: 
  37:   if (adminRow) {
  38:     return (
  39:       <Button size="pill" asChild>
  40:         <Link href="/admin/challenges/new">??梨뚮┛吏</Link>
  41:       </Button>
  42:     );
  43:   }
  44: 
  45:   // Fetch profile role
  46:   const { data: profile } = await supabase
  47:     .from("profiles")
  48:     .select("role")
  49:     .eq("id", user.id)
  50:     .maybeSingle();
  51: 
  52:   const role = profile?.role ?? null;
  53: 
  54:   if (role === "creator" || role === "studio") {
  55:     // Find the first open challenge for the submit href
  56:     const { data: openChallenge } = await supabase
  57:       .from("challenges")
  58:       .select("slug")
  59:       .eq("state", "open")
  60:       .order("close_at", { ascending: true, nullsFirst: false })
  61:       .limit(1)
  62:       .maybeSingle();
  63: 
  64:     const submitHref = openChallenge
  65:       ? `/challenges/${openChallenge.slug}/submit`
  66:       : "/challenges";
  67: 
  68:     return (
  69:       <Button size="pill" asChild>
  70:         <Link href={submitHref}>?묓뭹 ?щ━湲?/Link>
  71:       </Button>
  72:     );
  73:   }
  74: 
  75:   // Phase 4.x Wave C.5b sub_01: role selection retired. Legacy observer
  76:   // profiles bounce to sign-in (challenges surface is Phase 3+ deferred).
  77:   return (
  78:     <Button size="pill" asChild>
  79:       <Link href={`/signin?next=${encodeURIComponent(currentPath)}`}>
  80:         李쎌옉?먮줈 李몄뿬?섍린
  81:       </Link>
  82:     </Button>
  83:   );
  84: }

 succeeded in 475ms:
   1: import Link from "next/link";
   2: import { Button } from "@/components/ui/button";
   3: import { createSupabaseServer } from "@/lib/supabase/server";
   4: 
   5: // TODO FU-16: migrate these literals to useTranslations once next-intl
   6: // Server Component pattern is confirmed stable in this route tree.
   7: const LABELS = {
   8:   submit: "?묓뭹 ?щ━湲?,
   9:   upgrade: "李쎌옉?먮줈 李몄뿬?섍린",
  10:   signin: "李몄뿬 ?쒖옉?섍린",
  11:   view_gallery: "?묓뭹 蹂닿린",
  12:   view_winners: "二쇱씤怨?蹂닿린",
  13: } as const;
  14: 
  15: type Challenge = {
  16:   slug: string;
  17:   state: string;
  18: };
  19: 
  20: type Props = { challenge: Challenge };
  21: 
  22: export async function PrimaryCtaButton({ challenge }: Props) {
  23:   const { slug, state } = challenge;
  24: 
  25:   let label: string;
  26:   let href: string;
  27: 
  28:   if (state === "closed_judging") {
  29:     label = LABELS.view_gallery;
  30:     href = `/challenges/${slug}/gallery`;
  31:   } else if (state === "closed_announced") {
  32:     label = LABELS.view_winners;
  33:     href = `/challenges/${slug}/gallery#winners`;
  34:   } else if (state === "archived") {
  35:     label = LABELS.view_gallery;
  36:     href = `/challenges/${slug}/gallery`;
  37:   } else if (state === "open") {
  38:     const supabase = await createSupabaseServer();
  39:     const {
  40:       data: { user },
  41:     } = await supabase.auth.getUser();
  42: 
  43:     if (!user) {
  44:       label = LABELS.signin;
  45:       href = `/signin?next=${encodeURIComponent(`/challenges/${slug}`)}`;
  46:     } else {
  47:       const { data: profile } = await supabase
  48:         .from("profiles")
  49:         .select("role")
  50:         .eq("id", user.id)
  51:         .maybeSingle();
  52: 
  53:       const role = profile?.role ?? null;
  54: 
  55:       if (role === "creator" || role === "studio") {
  56:         label = LABELS.submit;
  57:         href = `/challenges/${slug}/submit`;
  58:       } else if (role === "observer") {
  59:         // Phase 4.x Wave C.5b sub_01: role-upgrade flow retired.
  60:         label = LABELS.signin;
  61:         href = `/signin?next=${encodeURIComponent(`/challenges/${slug}`)}`;
  62:       } else {
  63:         // role is null (profile incomplete) ??treat same as no-auth
  64:         label = LABELS.signin;
  65:         href = `/signin?next=${encodeURIComponent(`/challenges/${slug}`)}`;
  66:       }
  67:     }
  68:   } else {
  69:     // draft or unknown ??no CTA
  70:     return null;
  71:   }
  72: 
  73:   return (
  74:     <Button size="pill" asChild>
  75:       <Link href={href}>{label}</Link>
  76:     </Button>
  77:   );
  78: }

 succeeded in 479ms:
   1: "use server";
   2: 
   3: import {
   4:   CopyObjectCommand,
   5:   DeleteObjectCommand,
   6:   HeadObjectCommand,
   7: } from "@aws-sdk/client-s3";
   8: import { revalidatePath } from "next/cache";
   9: import path from "path";
  10: 
  11: import {
  12:   createPresignedPutUrl,
  13:   getR2Client,
  14:   objectPublicUrl,
  15:   BUCKET,
  16: } from "@/lib/r2/client";
  17: import { buildSubmissionSchema } from "@/lib/challenges/content-schema";
  18: import { getExistingSubmission } from "@/lib/challenges/submissions";
  19: import { createSupabaseServer } from "@/lib/supabase/server";
  20: 
  21: export type UploadSlot = {
  22:   kind: "native_video" | "image" | "pdf";
  23:   filename: string;
  24:   contentType: string;
  25:   size: number;
  26: };
  27: 
  28: export type IssuedUpload = {
  29:   slotKey: string;
  30:   uploadUrl: string;
  31:   objectKey: string;
  32: };
  33: 
  34: function sanitizeFilename(name: string): string {
  35:   return name.replace(/[^A-Za-z0-9._-]/g, "_");
  36: }
  37: 
  38: async function getAuthAndRole(supabase: Awaited<ReturnType<typeof createSupabaseServer>>) {
  39:   const {
  40:     data: { user },
  41:   } = await supabase.auth.getUser();
  42:   if (!user) return { user: null, role: null };
  43: 
  44:   const { data: profile } = await supabase
  45:     .from("profiles")
  46:     .select("role")
  47:     .eq("id", user.id)
  48:     .maybeSingle();
  49: 
  50:   return { user, role: profile?.role ?? null };
  51: }
  52: 
  53: async function fetchChallenge(
  54:   supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  55:   challengeId: string
  56: ) {
  57:   const { data } = await supabase
  58:     .from("challenges")
  59:     .select("id, slug, title, state, submission_requirements")
  60:     .eq("id", challengeId)
  61:     .maybeSingle();
  62:   return data;
  63: }
  64: 
  65: export async function requestUploadUrlsAction(
  66:   challengeId: string,
  67:   slots: UploadSlot[]
  68: ): Promise<{ ok: true; issued: IssuedUpload[] } | { ok: false; error: string }> {
  69:   const supabase = await createSupabaseServer();
  70: 
  71:   const { user, role } = await getAuthAndRole(supabase);
  72:   if (!user) return { ok: false, error: "unauthenticated" };
  73:   if (role !== "creator" && role !== "studio") return { ok: false, error: "wrong_role" };
  74: 
  75:   const challenge = await fetchChallenge(supabase, challengeId);
  76:   if (!challenge) return { ok: false, error: "validation_failed" };
  77:   if (challenge.state !== "open") return { ok: false, error: "not_open" };
  78: 
  79:   const existing = await getExistingSubmission(challengeId, user.id);
  80:   if (existing) return { ok: false, error: "already_submitted" };
  81: 
  82:   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  83:   const req = challenge.submission_requirements as any;
  84: 
  85:   // Slot count validation for images
  86:   if (req?.image?.max_count !== undefined) {
  87:     const imageSlots = slots.filter((s) => s.kind === "image");
  88:     if (imageSlots.length > req.image.max_count) {
  89:       return { ok: false, error: "validation_failed" };
  90:     }
  91:   }
  92: 
  93:   // Per-slot MIME + size validation
  94:   for (const slot of slots) {
  95:     if (slot.kind === "native_video") {
  96:       if (slot.contentType !== "video/mp4") {
  97:         return { ok: false, error: "validation_failed" };
  98:       }
  99:       if (slot.size > 524288000) {
 100:         return { ok: false, error: "validation_failed" };
 101:       }
 102:     } else if (slot.kind === "image") {
 103:       if (slot.contentType !== "image/jpeg" && slot.contentType !== "image/png") {
 104:         return { ok: false, error: "validation_failed" };
 105:       }
 106:       if (slot.size > 10485760) {
 107:         return { ok: false, error: "validation_failed" };
 108:       }
 109:     } else if (slot.kind === "pdf") {
 110:       if (slot.contentType !== "application/pdf") {
 111:         return { ok: false, error: "validation_failed" };
 112:       }
 113:       if (slot.size > 20971520) {
 114:         return { ok: false, error: "validation_failed" };
 115:       }
 116:     }
 117:   }
 118: 
 119:   const issued: IssuedUpload[] = [];
 120:   for (const slot of slots) {
 121:     const slotKey = crypto.randomUUID();
 122:     const safeName = sanitizeFilename(slot.filename);
 123:     const objectKey = `tmp/${challengeId}/${user.id}/${crypto.randomUUID()}/${safeName}`;
 124:     const uploadUrl = await createPresignedPutUrl(objectKey, slot.contentType);
 125:     issued.push({ slotKey, uploadUrl, objectKey });
 126:   }
 127: 
 128:   return { ok: true, issued };
 129: }
 130: 
 131: export async function submitChallengeAction(
 132:   challengeId: string,
 133:   content: {
 134:     text_description: string;
 135:     native_video?: { objectKey: string; poster_url?: string; duration_sec?: number };
 136:     youtube_url?: string;
 137:     images?: { objectKey: string }[];
 138:     pdf?: { objectKey: string };
 139:   }
 140: ): Promise<
 141:   | { ok: true; submissionId: string; redirectTo: string }
 142:   | {
 143:       ok: false;
 144:       error:
 145:         | "unauthenticated"
 146:         | "wrong_role"
 147:         | "not_open"
 148:         | "already_submitted"
 149:         | "validation_failed"
 150:         | "upload_missing"
 151:         | "invalid_object_key_prefix";
 152:       detail?: string;
 153:     }
 154: > {
 155:   const supabase = await createSupabaseServer();
 156: 
 157:   const { user, role } = await getAuthAndRole(supabase);
 158:   if (!user) return { ok: false, error: "unauthenticated" };
 159:   if (role !== "creator" && role !== "studio") return { ok: false, error: "wrong_role" };
 160: 
 161:   const challenge = await fetchChallenge(supabase, challengeId);
 162:   if (!challenge) return { ok: false, error: "validation_failed" };
 163:   if (challenge.state !== "open") return { ok: false, error: "not_open" };
 164: 
 165:   const existing = await getExistingSubmission(challengeId, user.id);
 166:   if (existing) return { ok: false, error: "already_submitted" };
 167: 
 168:   // eslint-disable-next-line @typescript-eslint/no-explicit-any
 169:   const requirements = challenge.submission_requirements as any;
 170:   const parseResult = buildSubmissionSchema(requirements).safeParse(content);
 171:   if (!parseResult.success) {
 172:     const detail = parseResult.error.issues.map((i) => i.message).join("; ");
 173:     return { ok: false, error: "validation_failed", detail };
 174:   }
 175: 
 176:   // Collect all objectKeys referenced in content
 177:   const referencedKeys: string[] = [];
 178:   if (content.native_video?.objectKey) referencedKeys.push(content.native_video.objectKey);
 179:   if (content.pdf?.objectKey) referencedKeys.push(content.pdf.objectKey);
 180:   for (const img of content.images ?? []) referencedKeys.push(img.objectKey);
 181: 
 182:   // Enforce ownership: every key must have been issued under the caller's tmp prefix
 183:   const allowedPrefix = `tmp/${challengeId}/${user.id}/`;
 184:   for (const key of referencedKeys) {
 185:     if (!key.startsWith(allowedPrefix)) {
 186:       console.error("[submitChallengeAction] key outside allowed prefix", { key, allowedPrefix });
 187:       return { ok: false, error: "invalid_object_key_prefix" };
 188:     }
 189:   }
 190: 

 succeeded in 477ms:
   1: import { notFound, redirect } from "next/navigation";
   2: import type { Metadata } from "next";
   3: import Link from "next/link";
   4: import { getChallengeBySlug } from "@/lib/challenges/queries";
   5: import { getExistingSubmission } from "@/lib/challenges/submissions";
   6: import { createSupabaseServer } from "@/lib/supabase/server";
   7: import { PublicChrome } from "@/components/challenges/public-chrome";
   8: import { SubmissionForm } from "@/components/challenges/submission-form";
   9: import { Button } from "@/components/ui/button";
  10: import { statusPillClass } from "@/lib/ui/status-pill";
  11: import { statusLabel } from "@/lib/ui/status-labels";
  12: import type { ChallengeState } from "@/lib/challenges/types";
  13: import type { Database } from "@/lib/supabase/database.types";
  14: 
  15: export const dynamic = "force-dynamic";
  16: 
  17: type Props = { params: Promise<{ slug: string }> };
  18: 
  19: type ChallengeRow = Database["public"]["Tables"]["challenges"]["Row"];
  20: 
  21: export async function generateMetadata({ params }: Props): Promise<Metadata> {
  22:   const { slug } = await params;
  23:   const challenge = await getChallengeBySlug(slug);
  24:   if (!challenge) return {};
  25:   return {
  26:     title: `?묓뭹 ?щ━湲?쨌 ${challenge.title} 쨌 YAGI`,
  27:     robots: { index: false, follow: false },
  28:   };
  29: }
  30: 
  31: export default async function SubmitPage({ params }: Props) {
  32:   const { slug } = await params;
  33:   const challenge = await getChallengeBySlug(slug);
  34:   if (!challenge) notFound();
  35: 
  36:   const state = challenge.state as ChallengeState;
  37:   const pillClass = statusPillClass("challenge", state);
  38:   const label = statusLabel("challenge", state);
  39: 
  40:   if (state !== "open") {
  41:     return (
  42:       <PublicChrome>
  43:         <div className="max-w-2xl mx-auto px-6 md:px-8 py-16 space-y-6">
  44:           <div className="flex items-center gap-3">
  45:             <span
  46:               className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${pillClass}`}
  47:             >
  48:               {label}
  49:             </span>
  50:           </div>
  51:           <h1 className="font-display italic text-2xl">
  52:             ??梨뚮┛吏??吏湲??묓뭹??諛쏆쓣 ???놁뼱??          </h1>
  53:           <p className="text-muted-foreground text-sm">
  54:             梨뚮┛吏媛 醫낅즺?먭굅???ъ궗 以묒씠?먯슂.
  55:           </p>
  56:           <div className="flex flex-wrap gap-3">
  57:             <Button size="pill" variant="outline" asChild>
  58:               <Link href={`/challenges/${slug}`}>梨뚮┛吏 蹂닿린</Link>
  59:             </Button>
  60:             <Button size="pill" variant="ghost" asChild>
  61:               <Link href="/challenges">紐⑤뱺 梨뚮┛吏</Link>
  62:             </Button>
  63:           </div>
  64:         </div>
  65:       </PublicChrome>
  66:     );
  67:   }
  68: 
  69:   const supabase = await createSupabaseServer();
  70:   const {
  71:     data: { user },
  72:   } = await supabase.auth.getUser();
  73: 
  74:   if (!user) {
  75:     redirect(`/signin?next=${encodeURIComponent(`/challenges/${slug}/submit`)}`);
  76:   }
  77: 
  78:   const { data: profile } = await supabase
  79:     .from("profiles")
  80:     .select("role")
  81:     .eq("id", user.id)
  82:     .maybeSingle();
  83: 
  84:   const role = profile?.role ?? null;
  85: 
  86:   if (role === "observer") {
  87:     // Phase 4.x Wave C.5b sub_01: role-selection retired. Observer-role
  88:     // legacy profiles can no longer "upgrade" via UI; bounce to sign-in
  89:     // and let yagi handle these cases manually if they surface.
  90:     redirect(`/signin?next=${encodeURIComponent(`/challenges/${slug}/submit`)}`);
  91:   }
  92: 
  93:   if (role !== "creator" && role !== "studio") {
  94:     return (
  95:       <PublicChrome>
  96:         <div className="max-w-2xl mx-auto px-6 md:px-8 py-16 space-y-6">
  97:           <h1 className="font-display italic text-2xl">
  98:             ?꾨줈?꾩쓣 癒쇱? ?꾩꽦?댁＜?몄슂
  99:           </h1>
 100:           <p className="text-muted-foreground text-sm">
 101:             梨뚮┛吏???묓뭹???щ━?ㅻ㈃ ?꾨줈???ㅼ젙???꾩슂?댁슂.
 102:           </p>
 103:           <Button size="pill" asChild>
 104:             <Link href="/onboarding/profile">?꾨줈???ㅼ젙?섍린</Link>
 105:           </Button>
 106:         </div>
 107:       </PublicChrome>
 108:     );
 109:   }
 110: 
 111:   const existing = await getExistingSubmission(challenge.id, user.id);
 112:   if (existing) {
 113:     return (
 114:       <PublicChrome>
 115:         <div className="max-w-2xl mx-auto px-6 md:px-8 py-16 space-y-6">
 116:           <h1 className="font-display italic text-2xl">
 117:             ?대? ?묓뭹 ?щ졇?댁슂
 118:           </h1>
 119:           <p className="text-muted-foreground text-sm">
 120:             ??梨뚮┛吏?먮뒗 ?묓뭹???섎굹留??щ┫ ???덉뼱??
 121:           </p>
 122:           <Button size="pill" variant="outline" asChild>
 123:             <Link href={`/challenges/${slug}/gallery#submission-${existing.id}`}>
 124:               ???묓뭹 蹂닿린
 125:             </Link>

codex
The code search shows no Zod enum for `profiles.role` and only one switch on `ProfileRole`, but there are several legacy challenge paths that intentionally admit only `creator|studio`. I’m checking the SQL trigger bodies and RLS definitions now to distinguish deliberate denial from unintended enum dependence.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260425000000_phase_2_7_commission_soft_launch.sql' | ForEach-Object { "'$i++; if (($i -ge 22 -and $i -le 38) -or ($i -ge 140 -and $i -le 215) -or ($i -ge 255 -and $i -le 388)) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260423030001_phase_2_5_g1_hardening.sql' | ForEach-Object { "'$i++; if (($i -ge 120 -and $i -le 185) -or ($i -ge 210 -and $i -le 245)) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260423030000_phase_2_5_challenge_platform.sql' | ForEach-Object { "'$i++; if (($i -ge 60 -and $i -le 75) -or ($i -ge 225 -and $i -le 306)) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260501095935_phase_4_x_auto_profile_on_signup.sql' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260422120000_phase_2_0_baseline.sql' | ForEach-Object { "'$i++; if (($i -ge 145 -and $i -le 190) -or ($i -ge 4434 -and $i -le 4445)) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql' | ForEach-Object { "'$i++; if ($i -le 115) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 496ms:
 120:   ADD CONSTRAINT showcase_challenge_winners_submission_challenge_consistency_fkey
 121:   FOREIGN KEY (challenge_id, submission_id)
 122:   REFERENCES public.challenge_submissions (challenge_id, id)
 123:   ON DELETE CASCADE;
 124: 
 125: 
 126: -- ===========================================================================
 127: -- 3. H4 ??creators/studios role exclusivity + role-flip cleanup
 128: -- ===========================================================================
 129: 
 130: -- 3a. Tighten UPDATE policies ??role must match at mutation time.
 131: DROP POLICY IF EXISTS creators_update_self ON public.creators;
 132: CREATE POLICY creators_update_self ON public.creators
 133:   FOR UPDATE
 134:   USING (
 135:     id = auth.uid()
 136:     AND EXISTS (
 137:       SELECT 1 FROM public.profiles p
 138:       WHERE p.id = auth.uid() AND p.role = 'creator'
 139:     )
 140:   )
 141:   WITH CHECK (
 142:     id = auth.uid()
 143:     AND EXISTS (
 144:       SELECT 1 FROM public.profiles p
 145:       WHERE p.id = auth.uid() AND p.role = 'creator'
 146:     )
 147:   );
 148: 
 149: DROP POLICY IF EXISTS studios_update_self ON public.studios;
 150: CREATE POLICY studios_update_self ON public.studios
 151:   FOR UPDATE
 152:   USING (
 153:     id = auth.uid()
 154:     AND EXISTS (
 155:       SELECT 1 FROM public.profiles p
 156:       WHERE p.id = auth.uid() AND p.role = 'studio'
 157:     )
 158:   )
 159:   WITH CHECK (
 160:     id = auth.uid()
 161:     AND EXISTS (
 162:       SELECT 1 FROM public.profiles p
 163:       WHERE p.id = auth.uid() AND p.role = 'studio'
 164:     )
 165:   );
 166: 
 167: -- 3b. Dual-role INSERT block triggers (defense against race after RLS).
 168: CREATE OR REPLACE FUNCTION public.tg_creators_block_dual_role()
 169: RETURNS trigger
 170: LANGUAGE plpgsql
 171: SECURITY INVOKER
 172: SET search_path = public, pg_temp
 173: AS $$
 174: BEGIN
 175:   IF EXISTS (SELECT 1 FROM public.studios WHERE id = NEW.id) THEN
 176:     RAISE EXCEPTION 'user % already has a studios row ??role exclusivity', NEW.id
 177:       USING ERRCODE = '23505';
 178:   END IF;
 179:   RETURN NEW;
 180: END;
 181: $$;
 182: 
 183: CREATE TRIGGER tg_creators_block_dual_role
 184: BEFORE INSERT ON public.creators
 185: FOR EACH ROW
 210: -- Stale creators/studios rows preserved by design. UPDATE blocked by 3a
 211: -- role-match policies. G3/G6 read queries must join profiles.role to
 212: -- display correct active persona. Historical attribution preserved for
 213: -- showcase winners + submissions. Function retained as scaffold for
 214: -- future re-introduction if persona retirement policy reverses; NO
 215: -- TRIGGER is attached. SECURITY INVOKER (no DELETE, no privilege need).
 216: CREATE OR REPLACE FUNCTION public.tg_profiles_role_flip_cleanup()
 217: RETURNS trigger
 218: LANGUAGE plpgsql
 219: SECURITY INVOKER
 220: SET search_path = public, pg_temp
 221: AS $$
 222: BEGIN
 223:   -- Intentionally no-op. See migration header 짠3c design note.
 224:   RETURN NEW;
 225: END;
 226: $$;
 227: 
 228: -- Historical-record COMMENTs so G3/G6 query authors don't assume 1:1 with
 229: -- current profiles.role.
 230: COMMENT ON TABLE public.creators IS
 231:   'Phase 2.5 ??AI creator persona. Row may persist after role flip; G3/G6 '
 232:   'read queries must filter by current profiles.role.';
 233: 
 234: COMMENT ON TABLE public.studios IS
 235:   'Phase 2.5 ??AI studio org. Row may persist after role flip; G3/G6 read '
 236:   'queries must filter by current profiles.role.';
 237: 
 238: 
 239: -- ===========================================================================
 240: -- 4. M1 ??slug citext case-insensitive regex bypass
 241: -- ===========================================================================
 242: 
 243: ALTER TABLE public.challenges
 244:   DROP CONSTRAINT challenges_slug_check;
 245: 

 succeeded in 499ms:
  60: -- citext's case-insensitive equality ??no separate ADD CONSTRAINT needed.
  61: -- Safe: pre-flight confirmed 0 case-duplicate handles.
  62: ALTER TABLE public.profiles
  63:   ALTER COLUMN handle TYPE citext USING handle::citext;
  64: 
  65: -- New columns for Phase 2.5 identity model.
  66: ALTER TABLE public.profiles
  67:   ADD COLUMN role text CHECK (role IS NULL OR role IN ('creator','studio','observer')),
  68:   ADD COLUMN instagram_handle text,
  69:   ADD COLUMN role_switched_at timestamptz,
  70:   ADD COLUMN handle_changed_at timestamptz;
  71: 
  72: -- Enforce 200-char bio cap per SPEC v2 짠3 G1 Task 1. Column pre-exists.
  73: ALTER TABLE public.profiles
  74:   ADD CONSTRAINT profiles_bio_length_check
  75:   CHECK (bio IS NULL OR char_length(bio) <= 200);
 225: -- referential integrity for showcase_challenge_winners + challenge_submissions
 226: -- that may reference this row's submissions.
 227: 
 228: CREATE POLICY creators_select ON public.creators
 229:   FOR SELECT USING (true);
 230: 
 231: -- Role consistency: a user can only create the `creators` row matching
 232: -- their `profiles.role`. Prevents role=studio users from inserting a
 233: -- creators row (or vice versa). Enforces SPEC 짠1 "one user = one role".
 234: CREATE POLICY creators_insert_self ON public.creators
 235:   FOR INSERT WITH CHECK (
 236:     id = auth.uid()
 237:     AND EXISTS (
 238:       SELECT 1 FROM public.profiles p
 239:       WHERE p.id = auth.uid() AND p.role = 'creator'
 240:     )
 241:   );
 242: 
 243: CREATE POLICY creators_update_self ON public.creators
 244:   FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
 245: 
 246: ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;
 247: -- Note: no DELETE policy. Soft-delete via profiles.role change (set to NULL
 248: -- or 'observer'). Hard DELETE not exposed at RLS level ??preserves
 249: -- referential integrity for showcase_challenge_winners + challenge_submissions
 250: -- that may reference this row's submissions.
 251: 
 252: CREATE POLICY studios_select ON public.studios
 253:   FOR SELECT USING (true);
 254: 
 255: -- Role consistency: a user can only create the `studios` row matching
 256: -- their `profiles.role`. Prevents role=creator users from inserting a
 257: -- studios row (or vice versa). Enforces SPEC 짠1 "one user = one role".
 258: CREATE POLICY studios_insert_self ON public.studios
 259:   FOR INSERT WITH CHECK (
 260:     id = auth.uid()
 261:     AND EXISTS (
 262:       SELECT 1 FROM public.profiles p
 263:       WHERE p.id = auth.uid() AND p.role = 'studio'
 264:     )
 265:   );
 266: 
 267: CREATE POLICY studios_update_self ON public.studios
 268:   FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
 269: 
 270: -- challenges: public SELECT on non-draft states; admin-gated write.
 271: ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
 272: 
 273: CREATE POLICY challenges_select_public ON public.challenges
 274:   FOR SELECT USING (state <> 'draft' OR public.is_yagi_admin(auth.uid()));
 275: 
 276: CREATE POLICY challenges_admin_insert ON public.challenges
 277:   FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
 278: 
 279: CREATE POLICY challenges_admin_update ON public.challenges
 280:   FOR UPDATE USING (public.is_yagi_admin(auth.uid()))
 281:   WITH CHECK (public.is_yagi_admin(auth.uid()));
 282: 
 283: CREATE POLICY challenges_admin_delete ON public.challenges
 284:   FOR DELETE USING (public.is_yagi_admin(auth.uid()));
 285: 
 286: -- challenge_submissions: public SELECT; creator/studio INSERT own during open;
 287: -- owner UPDATE until closed; admin read/update via is_yagi_admin.
 288: ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;
 289: 
 290: CREATE POLICY challenge_submissions_select ON public.challenge_submissions
 291:   FOR SELECT USING (true);
 292: 
 293: CREATE POLICY challenge_submissions_insert_self ON public.challenge_submissions
 294:   FOR INSERT WITH CHECK (
 295:     submitter_id = auth.uid()
 296:     AND EXISTS (
 297:       SELECT 1 FROM public.profiles p
 298:       WHERE p.id = auth.uid() AND p.role IN ('creator','studio')
 299:     )
 300:     AND EXISTS (
 301:       SELECT 1 FROM public.challenges c
 302:       WHERE c.id = challenge_id AND c.state = 'open'
 303:     )
 304:   );
 305: 
 306: CREATE POLICY challenge_submissions_update_self ON public.challenge_submissions

 succeeded in 503ms:
   1: -- Phase 4.x Wave C.5b amend_01 ??auto-create profiles row on auth.users INSERT.
   2: --
   3: -- Background: Wave C.5b sub_01 retired the `/onboarding/role` selection page
   4: -- as part of the persona-A lock (DECISIONS Q-094, Brand-only). The legacy
   5: -- profile-creation step lived inside `completeProfileAction` driven by that
   6: -- page; deleting it left signup flow with no profile creation. Result:
   7: -- new users land on `/onboarding/workspace` and the bootstrap_workspace RPC
   8: -- raises `profile_required`. Manual SQL was used as a stop-gap once.
   9: --
  10: -- This migration moves profile creation to a database trigger so the
  11: -- application surface no longer carries the responsibility. New auth.users
  12: -- INSERT ??profiles row materialises in the same transaction.
  13: --
  14: -- Default role = 'client' since persona A = Brand-only active persona.
  15: -- Phase 5 entry will revisit when the Artist intake surface comes online
  16: -- (DECISIONS Q-094); the artist demo account in amend_02 is created via
  17: -- the service-role admin path which can override the default role.
  18: 
  19: CREATE OR REPLACE FUNCTION public.handle_new_user()
  20: RETURNS trigger
  21: LANGUAGE plpgsql
  22: SECURITY DEFINER
  23: SET search_path = public
  24: AS $$
  25: DECLARE
  26:   v_handle citext;
  27:   v_display_name text;
  28:   v_locale text;
  29:   v_attempt int := 0;
  30: BEGIN
  31:   -- handle: c_<8-char-md5> (matches profiles_handle_check ^[a-z0-9_-]{3,30}$).
  32:   -- md5() returns lowercase hex, so the result is always [a-f0-9] ??no
  33:   -- escaping needed and no SQL injection vector despite the concatenation
  34:   -- of NEW.email (md5 of any input is sanitised hex).
  35:   -- Retry on collision: the handle UNIQUE constraint has its own backstop,
  36:   -- but pre-checking lets us surface a clear error before INSERT.
  37:   LOOP
  38:     v_handle := ('c_' || substr(md5(NEW.id::text || COALESCE(NEW.email, '') || v_attempt::text), 1, 8))::citext;
  39:     EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE handle = v_handle);
  40:     v_attempt := v_attempt + 1;
  41:     IF v_attempt > 5 THEN
  42:       RAISE EXCEPTION 'profile handle generation failed after 6 attempts for user_id=%', NEW.id;
  43:     END IF;
  44:   END LOOP;
  45: 
  46:   -- display_name: email local part fallback. Guard against empty local part
  47:   -- (an email like "@example.com" ??invalid but defensible on insert path)
  48:   -- and against a NULL email entirely.
  49:   v_display_name := NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), '');
  50:   IF v_display_name IS NULL THEN
  51:     v_display_name := 'user';
  52:   END IF;
  53: 
  54:   -- locale: prefer raw_user_meta_data (signup may set this), fall back to 'ko'.
  55:   -- profiles.locale CHECK only allows 'ko' or 'en'; coerce anything else.
  56:   v_locale := COALESCE(NEW.raw_user_meta_data->>'locale', 'ko');
  57:   IF v_locale NOT IN ('ko', 'en') THEN
  58:     v_locale := 'ko';
  59:   END IF;
  60: 
  61:   -- Idempotent on profiles.id (the PK). Handle collision is guarded by the
  62:   -- retry loop above; the application layer (sub_13 admin-create path)
  63:   -- separately upserts and can override role on conflict.
  64:   INSERT INTO public.profiles (id, handle, display_name, role, locale)
  65:   VALUES (NEW.id, v_handle, v_display_name, 'client', v_locale)
  66:   ON CONFLICT (id) DO NOTHING;
  67: 
  68:   RETURN NEW;
  69: END;
  70: $$;
  71: 
  72: DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  73: 
  74: CREATE TRIGGER on_auth_user_created
  75:   AFTER INSERT ON auth.users
  76:   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  77: 
  78: -- Defense in depth: SECURITY DEFINER functions don't need EXECUTE granted
  79: -- to be called by the trigger system, but blocking direct invocation by
  80: -- authenticated/anon roles closes a privilege-escalation surface where a
  81: -- user could call `SELECT public.handle_new_user(forged_record)` and try
  82: -- to create a profile for an arbitrary uuid.
  83: REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
  84: REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
  85: REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

 succeeded in 531ms:
  22: -- 1. profiles role enum ??add 'client'
  23: -- =============================================================================
  24: 
  25: -- The existing constraint was added inline with ADD COLUMN in Phase 2.5
  26: -- (auto-named profiles_role_check). Drop+recreate keeps the NULL-allowed
  27: -- semantic from Phase 2.5 (mid-onboarding users may still have role IS NULL).
  28: ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  29: ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  30:   CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
  31: 
  32: 
  33: -- =============================================================================
  34: -- 2. clients table ??company info for the 'client' persona (1:1 with profiles)
  35: -- =============================================================================
  36: 
  37: CREATE TABLE IF NOT EXISTS public.clients (
  38:   id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 140:   ON public.clients
 141:   FOR SELECT
 142:   TO authenticated
 143:   USING (
 144:     id = (select auth.uid())
 145:     OR public.is_yagi_admin((select auth.uid()))
 146:   );
 147: 
 148: DROP POLICY IF EXISTS clients_insert_self ON public.clients;
 149: CREATE POLICY clients_insert_self
 150:   ON public.clients
 151:   FOR INSERT
 152:   TO authenticated
 153:   WITH CHECK (
 154:     id = (select auth.uid())
 155:     AND EXISTS (
 156:       SELECT 1 FROM public.profiles p
 157:       WHERE p.id = (select auth.uid()) AND p.role = 'client'
 158:     )
 159:   );
 160: 
 161: DROP POLICY IF EXISTS clients_update_self_or_admin ON public.clients;
 162: CREATE POLICY clients_update_self_or_admin
 163:   ON public.clients
 164:   FOR UPDATE
 165:   TO authenticated
 166:   USING (
 167:     id = (select auth.uid())
 168:     OR public.is_yagi_admin((select auth.uid()))
 169:   )
 170:   WITH CHECK (
 171:     id = (select auth.uid())
 172:     OR public.is_yagi_admin((select auth.uid()))
 173:   );
 174: 
 175: -- DELETE policy intentionally absent for clients: removal cascades from
 176: -- profiles/auth.users deletion only. Manual delete via DB role for support cases.
 177: 
 178: 
 179: -- ----- commission_intakes -----
 180: 
 181: DROP POLICY IF EXISTS commission_intakes_select_owner_or_admin ON public.commission_intakes;
 182: CREATE POLICY commission_intakes_select_owner_or_admin
 183:   ON public.commission_intakes
 184:   FOR SELECT
 185:   TO authenticated
 186:   USING (
 187:     client_id = (select auth.uid())
 188:     OR public.is_yagi_admin((select auth.uid()))
 189:   );
 190: 
 191: -- INSERT: only the client themselves, and only after their profiles.role is
 192: -- 'client'. Defense-in-depth: app layer also gates, but the role check here
 193: -- prevents creators/studios/observers from creating commission_intakes by
 194: -- spoofing client_id = own uid. Also paired with the
 195: -- validate_profile_role_transition trigger (짠9) which prevents self-flipping
 196: -- profiles.role to 'client' from any prior non-null role.
 197: DROP POLICY IF EXISTS commission_intakes_insert_self_client ON public.commission_intakes;
 198: CREATE POLICY commission_intakes_insert_self_client
 199:   ON public.commission_intakes
 200:   FOR INSERT
 201:   TO authenticated
 202:   WITH CHECK (
 203:     client_id = (select auth.uid())
 204:     AND EXISTS (
 205:       SELECT 1 FROM public.profiles p
 206:       WHERE p.id = (select auth.uid()) AND p.role = 'client'
 207:     )
 208:   );
 209: 
 210: -- Owner can edit their own form only while still in 'submitted' state.
 211: -- Once admin responds, edits are locked (admin-only updates after that).
 212: -- Column-level enforcement (no admin_* tampering) lives in the
 213: -- validate_commission_intake_state_transition trigger (짠6) ??RLS WITH CHECK
 214: -- alone cannot block targeted column writes.
 215: DROP POLICY IF EXISTS commission_intakes_update_owner_pre_response ON public.commission_intakes;
 255: BEGIN
 256:   -- Caller resolution. NULL caller (service_role / direct DB session) bypasses
 257:   -- both checks below ??those paths are trusted (they require service-role key
 258:   -- or direct DB access, both of which represent a total compromise anyway).
 259:   IF v_caller IS NULL THEN
 260:     RETURN NEW;
 261:   END IF;
 262: 
 263:   v_is_admin := public.is_yagi_admin(v_caller);
 264: 
 265:   -- Column guard (K05-001 Finding 2): a non-admin owner UPDATE must not
 266:   -- modify the admin response columns. RLS WITH CHECK cannot enforce
 267:   -- per-column constraints, so we enforce here.
 268:   IF TG_OP = 'UPDATE' AND NOT v_is_admin THEN
 269:     IF NEW.admin_response_md   IS DISTINCT FROM OLD.admin_response_md
 270:        OR NEW.admin_responded_at IS DISTINCT FROM OLD.admin_responded_at
 271:        OR NEW.admin_responded_by IS DISTINCT FROM OLD.admin_responded_by THEN
 272:       RAISE EXCEPTION
 273:         'only admin may modify admin response columns'
 274:         USING ERRCODE = '42501'; -- insufficient_privilege
 275:     END IF;
 276:   END IF;
 277: 
 278:   -- State transition validation (applies to all callers including admin ??  -- the trigger is the source of truth on legal transitions).
 279:   IF TG_OP = 'UPDATE' AND OLD.state IS DISTINCT FROM NEW.state THEN
 280:     IF NOT (
 281:       (OLD.state = 'submitted'       AND NEW.state IN ('admin_responded', 'archived'))
 282:       OR (OLD.state = 'admin_responded' AND NEW.state IN ('closed', 'archived'))
 283:       OR (OLD.state = 'closed'        AND NEW.state = 'archived')
 284:     ) THEN
 285:       RAISE EXCEPTION
 286:         'invalid commission_intake state transition: % -> %',
 287:         OLD.state, NEW.state
 288:         USING ERRCODE = '23514';
 289:     END IF;
 290:   END IF;
 291:   RETURN NEW;
 292: END $$;
 293: 
 294: REVOKE ALL ON FUNCTION public.validate_commission_intake_state_transition() FROM PUBLIC;
 295: 
 296: DROP TRIGGER IF EXISTS validate_commission_intake_state_transition_trigger
 297:   ON public.commission_intakes;
 298: 
 299: CREATE TRIGGER validate_commission_intake_state_transition_trigger
 300:   BEFORE UPDATE ON public.commission_intakes
 301:   FOR EACH ROW
 302:   EXECUTE FUNCTION public.validate_commission_intake_state_transition();
 303: 
 304: 
 305: -- =============================================================================
 306: -- 6b. profiles.role transition guard (K05-001 Finding 1, HIGH-A)
 307: -- =============================================================================
 308: -- Phase 2.7 specifically calls out "signup role 'client' bypass" as
 309: -- a no-downgrade vigilance area. Existing Phase 2.5 RLS allows users to
 310: -- self-UPDATE their profile, including the `role` column. Without this
 311: -- trigger an authenticated creator/studio/observer could:
 312: --   1. UPDATE profiles SET role = 'client'
 313: --   2. INSERT a clients row (passes clients_insert_self because role='client')
 314: --   3. INSERT commission_intakes (passes self-client gate)
 315: -- effectively spoofing the client persona to access the commission surface.
 316: --
 317: -- This trigger blocks any role transition involving 'client' from a
 318: -- non-NULL prior role for non-admin callers. Admin-driven role changes
 319: -- (yagi_admin) and service-role direct writes bypass.
 320: 
 321: CREATE OR REPLACE FUNCTION public.validate_profile_role_transition()
 322: RETURNS TRIGGER
 323: LANGUAGE plpgsql
 324: SECURITY DEFINER
 325: SET search_path = public, pg_temp
 326: AS $$
 327: DECLARE
 328:   v_caller uuid := auth.uid();
 329: BEGIN
 330:   -- service_role / direct DB sessions bypass ??trusted contexts.
 331:   IF v_caller IS NULL THEN
 332:     RETURN NEW;
 333:   END IF;
 334: 
 335:   -- yagi_admin can change roles freely (e.g., support migrations).
 336:   IF public.is_yagi_admin(v_caller) THEN
 337:     RETURN NEW;
 338:   END IF;
 339: 
 340:   IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
 341:     -- Cannot self-assign 'client' from a prior non-null role. Fresh signup
 342:     -- writes profiles via INSERT (which this trigger does not fire on), so
 343:     -- the only legitimate UPDATE path to 'client' is admin-driven.
 344:     IF NEW.role = 'client' AND OLD.role IS NOT NULL THEN
 345:       RAISE EXCEPTION
 346:         'cannot self-assign client role from existing role: %',
 347:         OLD.role
 348:         USING ERRCODE = '42501';
 349:     END IF;
 350: 
 351:     -- K05-002 hardening v2 (Loop 2 finding): also block non-NULL -> NULL
 352:     -- transitions for non-admin callers. Without this, an attacker could
 353:     -- two-step their way around the previous check:
 354:     --   creator -> NULL (allowed before)  -> client (allowed because OLD IS NULL).
 355:     -- Self-clearing role serves no legitimate user-driven flow today;
 356:     -- soft-retirement / role removal is admin-only via the bypass branch.
 357:     IF NEW.role IS NULL AND OLD.role IS NOT NULL THEN
 358:       RAISE EXCEPTION
 359:         'cannot self-clear role from existing role: %',
 360:         OLD.role
 361:         USING ERRCODE = '42501';
 362:     END IF;
 363: 
 364:     -- Once a client, cannot self-change to another role. Admin migration
 365:     -- is required (and goes through the bypass branch above).
 366:     IF OLD.role = 'client' AND NEW.role IS DISTINCT FROM 'client' THEN
 367:       RAISE EXCEPTION
 368:         'cannot self-change client role to: %',
 369:         NEW.role
 370:         USING ERRCODE = '42501';
 371:     END IF;
 372:   END IF;
 373: 
 374:   RETURN NEW;
 375: END $$;
 376: 
 377: REVOKE ALL ON FUNCTION public.validate_profile_role_transition() FROM PUBLIC;
 378: 
 379: DROP TRIGGER IF EXISTS validate_profile_role_transition_trigger
 380:   ON public.profiles;
 381: 
 382: CREATE TRIGGER validate_profile_role_transition_trigger
 383:   BEFORE UPDATE ON public.profiles
 384:   FOR EACH ROW
 385:   EXECUTE FUNCTION public.validate_profile_role_transition();
 386: 
 387: 
 388: -- =============================================================================

 succeeded in 532ms:
   1: -- Phase 4.x -- task_01 -- workspace.kind + projects.twin_intent + projects.kind enum + project_licenses
   2: 
   3: -- ============================================================
   4: -- 1. workspaces.kind
   5: -- ============================================================
   6: ALTER TABLE workspaces
   7:   ADD COLUMN kind text NOT NULL DEFAULT 'brand'
   8:     CHECK (kind IN ('brand', 'artist', 'yagi_admin'));
   9: 
  10: -- Existing rows = 'brand' (rational default at this stage)
  11: -- yagi_admin workspace requires a MANUAL UPDATE after verify
  12: UPDATE workspaces SET kind = 'brand' WHERE kind IS NULL;
  13: 
  14: CREATE INDEX idx_workspaces_kind ON workspaces(kind);
  15: 
  16: -- ============================================================
  17: -- 2. projects.twin_intent
  18: -- ============================================================
  19: ALTER TABLE projects
  20:   ADD COLUMN twin_intent text NOT NULL DEFAULT 'undecided'
  21:     CHECK (twin_intent IN ('undecided', 'specific_in_mind', 'no_twin'));
  22: 
  23: -- ============================================================
  24: -- 3. projects.kind enum expansion
  25: -- ============================================================
  26: ALTER TABLE projects
  27:   DROP CONSTRAINT IF EXISTS projects_kind_check;
  28: 
  29: ALTER TABLE projects
  30:   ADD CONSTRAINT projects_kind_check CHECK (kind IN (
  31:     'direct',
  32:     'inbound_brand_to_artist',
  33:     'talent_initiated_creative',
  34:     'talent_initiated_self_ad',
  35:     'talent_initiated_brand_passthrough',
  36:     'talent_initiated_footage_upgrade'
  37:   ));
  38: 
  39: -- Existing data stays 'direct' (NOT NULL, no backfill needed)
  40: 
  41: -- ============================================================
  42: -- 4. project_licenses (Phase 6 fills in; Phase 4 = schema + RLS only)
  43: -- ============================================================
  44: CREATE TABLE project_licenses (
  45:   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  46:   project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  47:   campaign_name text NOT NULL,
  48:   region text NOT NULL DEFAULT 'KR'
  49:     CHECK (region IN ('KR', 'JP', 'US', 'EU', 'ASIA', 'GLOBAL')),
  50:   start_date date NOT NULL,
  51:   end_date date,  -- NULL allowed (perpetual; explicit end is the default)
  52:   fee_amount_krw bigint NOT NULL DEFAULT 0,
  53:   fee_currency text NOT NULL DEFAULT 'KRW',
  54:   artist_share_percent integer NOT NULL DEFAULT 0
  55:     CHECK (artist_share_percent BETWEEN 0 AND 100),
  56:   status text NOT NULL DEFAULT 'draft'
  57:     CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
  58:   created_at timestamptz NOT NULL DEFAULT now(),
  59:   updated_at timestamptz NOT NULL DEFAULT now(),
  60:   created_by uuid NOT NULL REFERENCES profiles(id)
  61: );
  62: 
  63: CREATE INDEX idx_project_licenses_project ON project_licenses(project_id);
  64: CREATE INDEX idx_project_licenses_status ON project_licenses(status);
  65: 
  66: -- RLS
  67: ALTER TABLE project_licenses ENABLE ROW LEVEL SECURITY;
  68: 
  69: -- SELECT: yagi_admin (all rows) + project owner client (own rows)
  70: CREATE POLICY "project_licenses_select_admin" ON project_licenses
  71:   FOR SELECT TO authenticated
  72:   USING (
  73:     EXISTS (
  74:       SELECT 1 FROM profiles
  75:       WHERE id = auth.uid() AND role = 'yagi_admin'
  76:     )
  77:   );
  78: 
  79: -- Phase 4.x BLOCKER 1 fix (2026-05-01): KICKOFF spec referenced
  80: -- projects.owner_id but the actual ownership column is created_by.
  81: -- yagi confirmed option B: amend the policy to match the schema.
  82: CREATE POLICY "project_licenses_select_owner" ON project_licenses
  83:   FOR SELECT TO authenticated
  84:   USING (
  85:     project_id IN (
  86:       SELECT id FROM projects WHERE created_by = auth.uid()
  87:     )
  88:   );
  89: 
  90: -- INSERT/UPDATE/DELETE: yagi_admin only (Phase 4 stage)
  91: CREATE POLICY "project_licenses_write_admin" ON project_licenses
  92:   FOR ALL TO authenticated
  93:   USING (
  94:     EXISTS (
  95:       SELECT 1 FROM profiles
  96:       WHERE id = auth.uid() AND role = 'yagi_admin'
  97:     )
  98:   )
  99:   WITH CHECK (
 100:     EXISTS (
 101:       SELECT 1 FROM profiles
 102:       WHERE id = auth.uid() AND role = 'yagi_admin'
 103:     )
 104:   );
 105: 
 106: -- updated_at trigger
 107: -- NOTE: KICKOFF spec references update_updated_at_column() but that function
 108: -- only exists in the storage schema. The public equivalent in this codebase
 109: -- is public.tg_touch_updated_at() -- using that here.
 110: CREATE TRIGGER project_licenses_updated_at_trigger
 111:   BEFORE UPDATE ON project_licenses
 112:   FOR EACH ROW
 113:   EXECUTE FUNCTION public.tg_touch_updated_at();

 succeeded in 540ms:
 145:      and status = 'published'
 146:    returning view_count;
 147: $$;
 148: 
 149: 
 150: --
 151: -- Name: is_ws_admin(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
 152: --
 153: 
 154: CREATE FUNCTION public.is_ws_admin(uid uuid, wsid uuid) RETURNS boolean
 155:     LANGUAGE sql STABLE SECURITY DEFINER
 156:     SET search_path TO 'public'
 157:     AS $$
 158:   select exists(
 159:     select 1 from workspace_members
 160:     where user_id = uid and workspace_id = wsid and role = 'admin'
 161:   );
 162: $$;
 163: 
 164: 
 165: --
 166: -- Name: is_ws_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
 167: --
 168: 
 169: CREATE FUNCTION public.is_ws_member(uid uuid, wsid uuid) RETURNS boolean
 170:     LANGUAGE sql STABLE SECURITY DEFINER
 171:     SET search_path TO 'public'
 172:     AS $$
 173:   select exists(select 1 from workspace_members where user_id = uid and workspace_id = wsid);
 174: $$;
 175: 
 176: 
 177: --
 178: -- Name: is_yagi_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
 179: --
 180: 
 181: CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boolean
 182:     LANGUAGE sql STABLE SECURITY DEFINER
 183:     SET search_path TO 'public'
 184:     AS $$
 185:   select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
 186: $$;
 187: 
 188: 
 189: --
 190: -- Name: is_yagi_internal_ws(uuid); Type: FUNCTION; Schema: public; Owner: -
4434: 
4435: 
4436: --
4437: -- Name: user_roles user_roles_self_insert_creator; Type: POLICY; Schema: public; Owner: -
4438: --
4439: 
4440: CREATE POLICY user_roles_self_insert_creator ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'creator'::text) AND (workspace_id IS NULL)));
4441: 
4442: 
4443: --
4444: -- Name: user_roles user_roles_self_insert_ws_admin; Type: POLICY; Schema: public; Owner: -
4445: --

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -e \"redirect\\(.*app\" -e \"onboarding/workspace\" -e \"bootstrap_workspace\" -e \"workspace_required\" -e \"profile_required\" src/app src/lib -g '"'!node_modules'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/lib/onboarding/actions.ts' | ForEach-Object { "'$i++; if ($i -le 220) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -e \"CREATE OR REPLACE FUNCTION public\\.bootstrap_workspace\" -e \"bootstrap_workspace\" -e \"profile_required\" supabase/migrations src/lib src/app" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/lib/workspace/active.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 487ms:
src/app\auth\callback\route.ts:46:  // the user arrives at /onboarding/workspace already authenticated.
src/app\auth\callback\route.ts:110:      ? `${origin}/${locale}/onboarding/workspace?next=${encodeURIComponent(safeNext)}`
src/app\auth\callback\route.ts:111:      : `${origin}/${locale}/onboarding/workspace`;
src/app\auth\callback\route.ts:119:  return NextResponse.redirect(`${origin}/${locale}/app`);
src/lib\onboarding\role-redirects.ts:10:// route to /onboarding/workspace.
src/lib\onboarding\role-redirects.ts:29:    return { href: "/onboarding/workspace", reason: "role_missing" };
src/lib\onboarding\role-redirects.ts:33:    return { href: "/onboarding/workspace", reason: "profile_missing" };
src/lib\onboarding\actions.ts:50:  // Use bootstrap_workspace RPC to atomically create workspace + admin member + role.
src/lib\onboarding\actions.ts:57:    "bootstrap_workspace",
src/lib\supabase\database.types.ts:2628:      bootstrap_workspace: {
src/app\[locale]\onboarding\page.tsx:22:    redirect({ href: "/app", locale });
src/app\[locale]\onboarding\page.tsx:26:  redirect({ href: "/onboarding/workspace", locale });
src/app\[locale]\app\layout.tsx:44:    redirect({ href: "/onboarding/workspace", locale });
src/app\[locale]\onboarding\profile\page.tsx:11:  redirect({ href: "/onboarding/workspace", locale });
src/app\[locale]\app\page.tsx:19:  redirect(`/${locale}/app/dashboard`);
src/app\[locale]\app\commission\page.tsx:30:    redirect({ href: "/app", locale });
src/app\[locale]\app\admin\layout.tsx:13:  if (!ctx!.workspaceRoles.includes("yagi_admin")) redirect({ href: "/app", locale });
src/app\[locale]\(auth)\signup\page.tsx:83:      router.push((next ?? "/onboarding/workspace") as "/onboarding/workspace");
src/app\[locale]\app\admin\trash\page.tsx:40:    redirect({ href: "/app", locale });
src/app\[locale]\app\settings\page.tsx:51:    redirect({ href: "/app/settings", locale });
src/app\[locale]\app\settings\page.tsx:55:  if (!workspaceId) redirect({ href: "/app", locale });
src/app\[locale]\app\settings\page.tsx:64:    if (!ws) redirect({ href: "/app", locale });
src/app\[locale]\app\team\page.tsx:20:  redirect(`/${locale}/app/team/${target.slug}`);
src/app\[locale]\app\admin\support\page.tsx:37:    redirect({ href: "/app", locale });
src/app\[locale]\app\admin\commissions\page.tsx:43:    redirect({ href: "/app", locale });
src/app\[locale]\app\admin\commissions\[id]\page.tsx:33:    redirect({ href: "/app", locale });
src/app\[locale]\app\admin\challenges\[slug]\announce\page.tsx:26:    redirect({ href: "/app/admin/challenges", locale });
src/app\[locale]\app\admin\challenges\[slug]\announce\page.tsx:32:    redirect({ href: `/app/admin/challenges/${slug}/judge`, locale });

 succeeded in 494ms:
   1: "use server";
   2: 
   3: import { createSupabaseServer } from "@/lib/supabase/server";
   4: import crypto from "node:crypto";
   5: 
   6: type Result = { error?: string };
   7: 
   8: export async function createProfileAction(formData: {
   9:   handle: string;
  10:   displayName: string;
  11:   bio: string;
  12:   locale: "ko" | "en";
  13:   role: "client" | "creator";
  14: }): Promise<Result> {
  15:   const supabase = await createSupabaseServer();
  16:   const {
  17:     data: { user },
  18:   } = await supabase.auth.getUser();
  19:   if (!user) return { error: "not_authenticated" };
  20: 
  21:   const { error: profileError } = await supabase.from("profiles").insert({
  22:     id: user.id,
  23:     handle: formData.handle,
  24:     display_name: formData.displayName,
  25:     bio: formData.bio || null,
  26:     locale: formData.locale,
  27:   });
  28:   if (profileError) return { error: profileError.message };
  29: 
  30:   if (formData.role === "creator") {
  31:     const { error: roleError } = await supabase
  32:       .from("user_roles")
  33:       .insert({ user_id: user.id, role: "creator", workspace_id: null });
  34:     if (roleError) return { error: roleError.message };
  35:   }
  36: 
  37:   return {};
  38: }
  39: 
  40: export async function createWorkspaceAction(formData: {
  41:   name: string;
  42:   slug: string;
  43: }): Promise<Result & { workspaceId?: string }> {
  44:   const supabase = await createSupabaseServer();
  45:   const {
  46:     data: { user },
  47:   } = await supabase.auth.getUser();
  48:   if (!user) return { error: "not_authenticated" };
  49: 
  50:   // Use bootstrap_workspace RPC to atomically create workspace + admin member + role.
  51:   // This avoids the RLS SELECT-after-INSERT issue where the ws_read_members policy
  52:   // would reject reading the just-inserted workspace row (user is not yet a member).
  53:   const { data, error } = await (supabase.rpc as unknown as (
  54:     fn: string,
  55:     args: Record<string, unknown>
  56:   ) => Promise<{ data: string | null; error: { message: string } | null }>)(
  57:     "bootstrap_workspace",
  58:     {
  59:       p_name: formData.name,
  60:       p_slug: formData.slug,
  61:       p_logo_url: null,
  62:     }
  63:   );
  64: 
  65:   if (error) return { error: error.message };
  66:   if (!data) return { error: "workspace_insert_failed" };
  67: 
  68:   return { workspaceId: data };
  69: }
  70: 
  71: export async function createBrandAction(formData: {
  72:   workspaceId: string;
  73:   name: string;
  74:   slug: string;
  75: }): Promise<Result> {
  76:   const supabase = await createSupabaseServer();
  77:   const { error } = await supabase.from("brands").insert({
  78:     workspace_id: formData.workspaceId,
  79:     name: formData.name,
  80:     slug: formData.slug,
  81:   });
  82:   if (error) return { error: error.message };
  83:   return {};
  84: }
  85: 
  86: export async function sendInvitationsAction(formData: {
  87:   workspaceId: string;
  88:   emails: string[];
  89:   role: "admin" | "member";
  90: }): Promise<Result> {
  91:   if (formData.emails.length === 0) return {};
  92:   const supabase = await createSupabaseServer();
  93:   const {
  94:     data: { user },
  95:   } = await supabase.auth.getUser();
  96:   if (!user) return { error: "not_authenticated" };
  97: 
  98:   const rows = formData.emails.map((email) => ({
  99:     workspace_id: formData.workspaceId,
 100:     email,
 101:     role: formData.role,
 102:     token: crypto.randomBytes(24).toString("hex"),
 103:     invited_by: user.id,
 104:   }));
 105: 
 106:   const { error } = await supabase.from("workspace_invitations").insert(rows);
 107:   if (error) return { error: error.message };
 108: 
 109:   // TODO Phase 1.2: send actual email via Resend. For now, log to server console.
 110:   console.log("[invitations] staged", rows.map((r) => r.email).join(", "));
 111:   return {};
 112: }

 succeeded in 506ms:
supabase/migrations\20260422120000_phase_2_0_baseline.sql:89:-- Name: bootstrap_workspace(text, text, text); Type: FUNCTION; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:92:CREATE FUNCTION public.bootstrap_workspace(p_name text, p_slug text, p_logo_url text DEFAULT NULL::text) RETURNS uuid
supabase/migrations\20260422120000_phase_2_0_baseline.sql:106:    raise exception 'profile_required';
supabase/migrations\20260422120000_phase_2_0_baseline.sql:128:-- Name: FUNCTION bootstrap_workspace(p_name text, p_slug text, p_logo_url text); Type: COMMENT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:131:COMMENT ON FUNCTION public.bootstrap_workspace(p_name text, p_slug text, p_logo_url text) IS 'Atomically bootstraps a new workspace with the caller as admin. Bypasses RLS via security definer; enforces auth.uid() check internally.';
supabase/migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:7:-- new users land on `/onboarding/workspace` and the bootstrap_workspace RPC
supabase/migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:8:-- raises `profile_required`. Manual SQL was used as a stop-gap once.
src/lib\onboarding\actions.ts:50:  // Use bootstrap_workspace RPC to atomically create workspace + admin member + role.
src/lib\onboarding\actions.ts:57:    "bootstrap_workspace",
src/lib\supabase\database.types.ts:2628:      bootstrap_workspace: {

 succeeded in 505ms:
   1: // Phase 4.x task_06 ??Active workspace resolver.
   2: //
   3: // Decision lock-in (_decisions_locked.md section 2): cookie-based.
   4: // The cookie 'yagi_active_workspace' carries a uuid. Every server-side
   5: // page render that needs the active workspace must validate the
   6: // cookie's uuid against workspace_members for the current user, then
   7: // fall back to the first membership if invalid or absent.
   8: //
   9: // Cookie tampering is fully defended:
  10: //   1. The cookie value is not trusted -- we always re-check
  11: //      workspace_members membership on the server.
  12: //   2. If the cookie's uuid is not a valid membership for this user,
  13: //      we ignore it and use first-member fallback. (We do NOT trust
  14: //      the cookie even for read-only display.)
  15: //
  16: // Phase 4 caveat: workspaces.kind column is added by task_01 migration
  17: // (Wave D D.1 apply). Until apply, the SELECT returns undefined for
  18: // kind; we coerce to 'brand' (matches task_01 UPDATE that sets every
  19: // existing row to 'brand'). Post-apply, kind is one of 3 enum values.
  20: 
  21: import { cookies } from "next/headers";
  22: import { createSupabaseServer } from "@/lib/supabase/server";
  23: 
  24: export type WorkspaceKind = "brand" | "artist" | "yagi_admin";
  25: 
  26: export type ActiveWorkspaceMembership = {
  27:   id: string;
  28:   name: string;
  29:   kind: WorkspaceKind;
  30: };
  31: 
  32: export const ACTIVE_WORKSPACE_COOKIE = "yagi_active_workspace";
  33: 
  34: const UUID_RE =
  35:   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  36: 
  37: function narrowKind(value: unknown): WorkspaceKind {
  38:   if (value === "brand" || value === "artist" || value === "yagi_admin") {
  39:     return value;
  40:   }
  41:   return "brand";
  42: }
  43: 
  44: /**
  45:  * Returns the user's workspace memberships, joined with workspace name + kind.
  46:  * Used by the workspace switcher dropdown to render full lists. The active
  47:  * one is found by `id === activeWorkspaceId`.
  48:  *
  49:  * Cross-tenant guard: the SELECT joins through workspace_members for the
  50:  * caller's user_id, so RLS scopes naturally. workspaces RLS already gates
  51:  * SELECT to members.
  52:  */
  53: export async function listOwnWorkspaces(
  54:   userId: string,
  55: ): Promise<ActiveWorkspaceMembership[]> {
  56:   const supabase = await createSupabaseServer();
  57:   // workspaces.kind not in generated types yet (Wave D D.1 apply -> regen).
  58:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind not in generated types yet
  59:   const sb = supabase as any;
  60:   const { data: rows } = (await sb
  61:     .from("workspace_members")
  62:     .select(
  63:       `
  64:       workspace_id,
  65:       created_at,
  66:       workspace:workspaces ( id, name, kind )
  67:     `,
  68:     )
  69:     .eq("user_id", userId)
  70:     .order("created_at", { ascending: true })) as {
  71:     data:
  72:       | {
  73:           workspace_id: string;
  74:           workspace: { id: string; name: string; kind?: string } | null;
  75:         }[]
  76:       | null;
  77:   };
  78: 
  79:   const list: ActiveWorkspaceMembership[] = [];
  80:   for (const r of rows ?? []) {
  81:     if (!r.workspace) continue;
  82:     list.push({
  83:       id: r.workspace.id,
  84:       name: r.workspace.name,
  85:       kind: narrowKind(r.workspace.kind),
  86:     });
  87:   }
  88:   return list;
  89: }
  90: 
  91: /**
  92:  * Resolve the user's currently-active workspace. Reads the
  93:  * 'yagi_active_workspace' cookie, validates membership against
  94:  * workspace_members, and falls back to the first membership when
  95:  * the cookie is absent, malformed, or doesn't correspond to a
  96:  * valid membership for this user.
  97:  *
  98:  * Returns null when the user has no workspace memberships at all
  99:  * (caller should redirect to /onboarding).
 100:  */
 101: export async function resolveActiveWorkspace(
 102:   userId: string,
 103: ): Promise<ActiveWorkspaceMembership | null> {
 104:   const memberships = await listOwnWorkspaces(userId);
 105:   if (memberships.length === 0) return null;
 106: 
 107:   const cookieStore = await cookies();
 108:   const cookieValue = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
 109: 
 110:   if (cookieValue && UUID_RE.test(cookieValue)) {
 111:     const match = memberships.find((m) => m.id === cookieValue);
 112:     if (match) return match;
 113:     // Fall through to first-membership fallback. We deliberately do NOT
 114:     // attempt to clear the cookie here -- this resolver is read-only
 115:     // (cookies() in next/headers is read in server components). The
 116:     // setActiveWorkspace server action is the only writer; if a stale
 117:     // cookie keeps arriving here, the resolver silently falls back
 118:     // without leaking which workspace_id the user does NOT belong to.
 119:   }
 120: 
 121:   return memberships[0];
 122: }

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260422120000_phase_2_0_baseline.sql' | ForEach-Object { "'$i++; if ($i -ge 85 -and $i -le 132) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/auth/callback/route.ts' | ForEach-Object { "'$i++; if ($i -le 135) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/onboarding/page.tsx' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -e \"workspace\" src/app/[locale]/onboarding -g '"'!node_modules'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 357ms:
   1: import { redirect } from "@/i18n/routing";
   2: import { getOnboardingState } from "@/lib/onboarding/state";
   3: 
   4: export default async function OnboardingEntryPage({
   5:   params,
   6: }: {
   7:   params: Promise<{ locale: string }>;
   8: }) {
   9:   const { locale } = await params;
  10:   const state = await getOnboardingState();
  11: 
  12:   if (!state) {
  13:     redirect({ href: "/signin", locale });
  14:     return null;
  15:   }
  16: 
  17:   // Phase 4.x Wave C.5b sub_01 ??persona A locked (Brand only). Role
  18:   // selection flow retired; first-touch onboarding is the workspace
  19:   // (= company) form regardless of profile state. Users who already
  20:   // have a workspace go straight to /app.
  21:   if (state.workspaceMembershipCount >= 1 || state.hasGlobalRole) {
  22:     redirect({ href: "/app", locale });
  23:     return null;
  24:   }
  25: 
  26:   redirect({ href: "/onboarding/workspace", locale });
  27:   return null;
  28: }

 succeeded in 367ms:
   1: import { NextRequest, NextResponse } from "next/server";
   2: import { createSupabaseServer } from "@/lib/supabase/server";
   3: 
   4: // Phase 4.x Wave C.5b sub_04 ??expired-OTP detection. Supabase reports
   5: // expiry via either the `error_description` query param on the redirect
   6: // (PKCE error path) or as `exchangeCodeForSession` failure with a
   7: // message containing one of these markers.
   8: const EXPIRY_MARKERS = ["otp_expired", "otp expired", "code expired", "expired", "invalid_grant"];
   9: function isExpiryError(message: string): boolean {
  10:   const lower = message.toLowerCase();
  11:   return EXPIRY_MARKERS.some((marker) => lower.includes(marker));
  12: }
  13: 
  14: export async function GET(request: NextRequest) {
  15:   const { searchParams, origin } = new URL(request.url);
  16:   const code = searchParams.get("code");
  17:   const next = searchParams.get("next");
  18:   const type = searchParams.get("type");
  19:   const errorParam = searchParams.get("error");
  20:   const errorCodeParam = searchParams.get("error_code");
  21:   const errorDescParam = searchParams.get("error_description");
  22: 
  23:   // Supabase Auth redirects expired/invalid links here with the failure
  24:   // surfaced as query params instead of a `code`. Bounce to /auth/expired
  25:   // before doing any other work.
  26:   if (errorParam || errorCodeParam) {
  27:     const blob = `${errorParam ?? ""} ${errorCodeParam ?? ""} ${errorDescParam ?? ""}`;
  28:     if (isExpiryError(blob)) {
  29:       return NextResponse.redirect(`${origin}/ko/auth/expired`);
  30:     }
  31:     return NextResponse.redirect(
  32:       `${origin}/ko/signin?error=${encodeURIComponent(errorDescParam ?? errorCodeParam ?? errorParam ?? "auth_failed")}`,
  33:     );
  34:   }
  35: 
  36:   if (!code) {
  37:     return NextResponse.redirect(`${origin}/ko/signin?error=missing_code`);
  38:   }
  39: 
  40:   const supabase = await createSupabaseServer();
  41:   // Phase 4.x Wave C.5b sub_05 ??exchangeCodeForSession persists the
  42:   // authenticated session via the @supabase/ssr cookie adapter wired in
  43:   // createSupabaseServer (server.ts setAll ??cookieStore.set). Inside a
  44:   // Route Handler, next/headers cookies() is mutable, so those Set-Cookie
  45:   // entries land on the eventual NextResponse.redirect below ??meaning
  46:   // the user arrives at /onboarding/workspace already authenticated.
  47:   // No follow-up signIn() / refresh() call is required.
  48:   const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  49: 
  50:   if (exchangeError) {
  51:     if (isExpiryError(exchangeError.message)) {
  52:       return NextResponse.redirect(`${origin}/ko/auth/expired`);
  53:     }
  54:     return NextResponse.redirect(
  55:       `${origin}/ko/signin?error=${encodeURIComponent(exchangeError.message)}`
  56:     );
  57:   }
  58: 
  59:   const {
  60:     data: { user },
  61:   } = await supabase.auth.getUser();
  62: 
  63:   if (!user) {
  64:     return NextResponse.redirect(`${origin}/ko/signin?error=no_user`);
  65:   }
  66: 
  67:   // Phase 4.x Wave C.5b amend_01 LOOP 1 fix (Codex F12): the
  68:   // handle_new_user DB trigger now guarantees a profiles row materialises
  69:   // in the same transaction as auth.users INSERT, so `!profile` is no
  70:   // longer the right onboarding gate. Use workspace membership + global
  71:   // role instead ??the actual constraint that decides whether the user
  72:   // can land on /app surfaces.
  73:   const { data: profile } = await supabase
  74:     .from("profiles")
  75:     .select("id, locale")
  76:     .eq("id", user.id)
  77:     .maybeSingle();
  78: 
  79:   const locale = profile?.locale ?? "ko";
  80: 
  81:   // Password recovery flow: send to reset-password regardless of state.
  82:   if (type === "recovery") {
  83:     return NextResponse.redirect(`${origin}/${locale}/reset-password`);
  84:   }
  85: 
  86:   // Phase 2.8.1 G_B1-H (F-PUX-003): preserve the commission intent across
  87:   // the entire signup ??confirm ??onboarding chain.
  88:   const safeNext =
  89:     next && next.startsWith("/") && !next.startsWith("//")
  90:       ? next
  91:       : null;
  92: 
  93:   const { count: workspaceMembershipCount } = await supabase
  94:     .from("workspace_members")
  95:     .select("workspace_id", { count: "exact", head: true })
  96:     .eq("user_id", user.id);
  97: 
  98:   const { data: globalRoles } = await supabase
  99:     .from("user_roles")
 100:     .select("role")
 101:     .eq("user_id", user.id)
 102:     .is("workspace_id", null)
 103:     .in("role", ["creator", "yagi_admin"]);
 104: 
 105:   const hasWorkspace = (workspaceMembershipCount ?? 0) > 0;
 106:   const hasGlobalRole = (globalRoles?.length ?? 0) > 0;
 107: 
 108:   if (!hasWorkspace && !hasGlobalRole) {
 109:     const onboardingUrl = safeNext
 110:       ? `${origin}/${locale}/onboarding/workspace?next=${encodeURIComponent(safeNext)}`
 111:       : `${origin}/${locale}/onboarding/workspace`;
 112:     return NextResponse.redirect(onboardingUrl);
 113:   }
 114: 
 115:   if (safeNext) {
 116:     return NextResponse.redirect(`${origin}${safeNext}`);
 117:   }
 118: 
 119:   return NextResponse.redirect(`${origin}/${locale}/app`);
 120: }

 succeeded in 346ms:
src/app/[locale]/onboarding\page.tsx:18:  // selection flow retired; first-touch onboarding is the workspace
src/app/[locale]/onboarding\page.tsx:20:  // have a workspace go straight to /app.
src/app/[locale]/onboarding\page.tsx:21:  if (state.workspaceMembershipCount >= 1 || state.hasGlobalRole) {
src/app/[locale]/onboarding\page.tsx:26:  redirect({ href: "/onboarding/workspace", locale });
src/app/[locale]/onboarding\invite\page.tsx:20:  const workspaceId = search.get("ws");
src/app/[locale]/onboarding\invite\page.tsx:42:    if (!workspaceId) {
src/app/[locale]/onboarding\invite\page.tsx:43:      toast.error("missing_workspace");
src/app/[locale]/onboarding\invite\page.tsx:47:    const res = await sendInvitationsAction({ workspaceId, emails, role: "member" });
src/app/[locale]/onboarding\profile\page.tsx:4:// entry now bounces to workspace creation (Brand persona's only step).
src/app/[locale]/onboarding\profile\page.tsx:11:  redirect({ href: "/onboarding/workspace", locale });
src/app/[locale]/onboarding\brand\page.tsx:32:  const workspaceId = search.get("ws");
src/app/[locale]/onboarding\brand\page.tsx:48:    if (!workspaceId) {
src/app/[locale]/onboarding\brand\page.tsx:49:      toast.error("missing_workspace");
src/app/[locale]/onboarding\brand\page.tsx:53:    const res = await createBrandAction({ workspaceId, name: values.name, slug: values.slug });
src/app/[locale]/onboarding\brand\page.tsx:59:    router.push(`/${locale}/onboarding/invite?ws=${workspaceId}`);
src/app/[locale]/onboarding\brand\page.tsx:76:            onClick={() => router.push(`/${locale}/onboarding/invite?ws=${workspaceId ?? ""}`)}
src/app/[locale]/onboarding\brand\page.tsx:94:            <Label htmlFor="slug">{t("workspace_slug")}</Label>
src/app/[locale]/onboarding\workspace\page.tsx:16:// workspace name. Pure Roman names produce a kebab-case slug; non-ASCII
src/app/[locale]/onboarding\workspace\page.tsx:18:// `workspace_slug_korean_warning` nudge below.
src/app/[locale]/onboarding\workspace\page.tsx:72:    if (res.error || !res.workspaceId) {
src/app/[locale]/onboarding\workspace\page.tsx:73:      toast.error(res.error ?? "workspace_failed");
src/app/[locale]/onboarding\workspace\page.tsx:76:    router.push(`/${locale}/onboarding/brand?ws=${res.workspaceId}`);
src/app/[locale]/onboarding\workspace\page.tsx:82:        <h1 className="font-display text-3xl tracking-tight keep-all">{t("workspace_title")}</h1>
src/app/[locale]/onboarding\workspace\page.tsx:83:        <p className="text-sm text-muted-foreground keep-all">{t("workspace_sub")}</p>
src/app/[locale]/onboarding\workspace\page.tsx:87:          <Label htmlFor="name">{t("workspace_name")}</Label>
src/app/[locale]/onboarding\workspace\page.tsx:88:          <Input id="name" {...register("name")} placeholder={t("workspace_name_ph")} />
src/app/[locale]/onboarding\workspace\page.tsx:92:          <Label htmlFor="slug">{t("workspace_slug")}</Label>
src/app/[locale]/onboarding\workspace\page.tsx:96:            placeholder={t("workspace_slug_ph")}
src/app/[locale]/onboarding\workspace\page.tsx:103:            {t("workspace_slug_help")}
src/app/[locale]/onboarding\workspace\page.tsx:108:              {t("workspace_slug_korean_warning")}

 succeeded in 387ms:
  85: );
  86: 
  87: 
  88: --
  89: -- Name: bootstrap_workspace(text, text, text); Type: FUNCTION; Schema: public; Owner: -
  90: --
  91: 
  92: CREATE FUNCTION public.bootstrap_workspace(p_name text, p_slug text, p_logo_url text DEFAULT NULL::text) RETURNS uuid
  93:     LANGUAGE plpgsql SECURITY DEFINER
  94:     SET search_path TO 'public'
  95:     AS $$
  96: declare
  97:   v_user_id uuid := auth.uid();
  98:   v_workspace_id uuid;
  99: begin
 100:   if v_user_id is null then
 101:     raise exception 'not_authenticated';
 102:   end if;
 103: 
 104:   -- Must have a profile first
 105:   if not exists (select 1 from public.profiles where id = v_user_id) then
 106:     raise exception 'profile_required';
 107:   end if;
 108: 
 109:   -- Create workspace
 110:   insert into public.workspaces (name, slug, logo_url)
 111:   values (p_name, p_slug, p_logo_url)
 112:   returning id into v_workspace_id;
 113: 
 114:   -- Add creator as admin member
 115:   insert into public.workspace_members (workspace_id, user_id, role, joined_at)
 116:   values (v_workspace_id, v_user_id, 'admin', now());
 117: 
 118:   -- Grant workspace_admin role
 119:   insert into public.user_roles (user_id, role, workspace_id)
 120:   values (v_user_id, 'workspace_admin', v_workspace_id);
 121: 
 122:   return v_workspace_id;
 123: end;
 124: $$;
 125: 
 126: 
 127: --
 128: -- Name: FUNCTION bootstrap_workspace(p_name text, p_slug text, p_logo_url text); Type: COMMENT; Schema: public; Owner: -
 129: --
 130: 
 131: COMMENT ON FUNCTION public.bootstrap_workspace(p_name text, p_slug text, p_logo_url text) IS 'Atomically bootstraps a new workspace with the caller as admin. Bypasses RLS via security definer; enforces auth.uid() check internally.';
 132: 

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260501100806_phase_4_x_widen_profile_role_enum.sql' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/lib/app/context.ts' | ForEach-Object { "'$i++; if ($i -le 100) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/components/app/sidebar-user-menu.tsx' | ForEach-Object { "'$i++; if ($i -le 70) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/layout.tsx' | ForEach-Object { "'$i++; if ($i -le 55) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'scripts/create-artist-account.ts' | ForEach-Object { "'$i++; if ($i -le 105) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 370ms:
   1: -- Phase 4.x Wave C.5b amend_02 ??widen profiles_role_check to include 'artist'.
   2: --
   3: -- Background: PRODUCT-MASTER 짠4 / DECISIONS Q-094 lock the persona model
   4: -- as Brand + Artist + YAGI Admin. The profiles_role_check CHECK constraint
   5: -- still only allowed creator/studio/observer/client. yagi visual review
   6: -- (post-sub_00 ROLLBACK) needs the artist demo account live for review,
   7: -- which requires this enum widening ??originally deferred to Phase 5
   8: -- entry (sub_13 HALT log) but now pulled into Phase 4.x because the
   9: -- widening is purely additive and the only blocker for the demo account.
  10: --
  11: -- Scope: additive only. Existing rows (creator/studio/observer/client/NULL)
  12: -- all continue to pass the constraint. No application-layer code path
  13: -- assumes a closed-world enum ??challenges-CTA + app/layout role guards
  14: -- already fall through to the else branch for unknown roles, which is
  15: -- a safe default.
  16: --
  17: -- Phase 5 entry will introduce the Artist Roster intake surface; this
  18: -- migration unblocks the demo account ahead of that surface design and
  19: -- does NOT lock-in any artist-specific RLS / RPC shape.
  20: 
  21: ALTER TABLE public.profiles
  22:   DROP CONSTRAINT IF EXISTS profiles_role_check;
  23: 
  24: ALTER TABLE public.profiles
  25:   ADD CONSTRAINT profiles_role_check CHECK (
  26:     (role IS NULL) OR
  27:     (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
  28:   );

 succeeded in 383ms:
   1: import { createSupabaseServer } from "@/lib/supabase/server";
   2: 
   3: // Phase 1.1 workspace permission system ??unchanged literals, renamed type.
   4: // Per ADR-009 (docs/design/DECISIONS.md).
   5: export type WorkspaceRole =
   6:   | "creator"
   7:   | "workspace_admin"
   8:   | "workspace_member"
   9:   | "yagi_admin";
  10: 
  11: // Phase 2.5 challenge persona system ??distinct namespace.
  12: // NEVER compare against a bare "creator" literal without prefixing with
  13: // `profile.role ===` ??see ADR-009 naming rule.
  14: // Phase 2.7 added "client" for the commission-intake persona (ADR-011).
  15: // Phase 4.x Wave C.5b amend_02 added "artist" ??DECISIONS Q-094 / 짠4 of
  16: // PRODUCT-MASTER persona model. The Artist intake surface itself is a
  17: // Phase 5 entry deliverable (FU-C5b-01); the type extension here covers
  18: // the demo account row created in Wave C.5b sub_13/amend_02.
  19: export type ProfileRole = "creator" | "studio" | "observer" | "client" | "artist";
  20: 
  21: export type AppContext = {
  22:   userId: string;
  23:   profile: {
  24:     id: string;
  25:     /**
  26:      * Internal-only DB identifier (Phase 4.x Wave C.5b sub_08).
  27:      *
  28:      * `profiles.handle` is auto-generated server-side as `c_<8 hex chars>`
  29:      * and exposed only to internal code paths (auth callback resolver,
  30:      * RLS policies that key off the unique-handle column, future admin
  31:      * tools). It MUST NOT appear in any user-facing surface ??sidebar,
  32:      * settings, chat, profile pages, exports, or emails. If you find
  33:      * yourself reaching for `profile.handle` in a JSX/email template,
  34:      * fall back to `display_name` then `id.slice(0, 8)` instead.
  35:      */
  36:     handle: string;
  37:     display_name: string;
  38:     email: string | null;
  39:     avatar_url: string | null;
  40:     locale: "ko" | "en";
  41:     role: ProfileRole | null;
  42:   };
  43:   workspaceRoles: WorkspaceRole[];
  44:   workspaces: { id: string; name: string; slug: string }[];
  45:   currentWorkspaceId: string | null;
  46: };
  47: 
  48: export async function fetchAppContext(): Promise<AppContext | null> {
  49:   const supabase = await createSupabaseServer();
  50:   const {
  51:     data: { user },
  52:   } = await supabase.auth.getUser();
  53:   if (!user) return null;
  54: 
  55:   const { data: profile } = await supabase
  56:     .from("profiles")
  57:     .select("id, handle, display_name, avatar_url, locale, role")
  58:     .eq("id", user.id)
  59:     .maybeSingle();
  60: 
  61:   if (!profile) return null;
  62: 
  63:   const { data: rolesRows } = await supabase
  64:     .from("user_roles")
  65:     .select("role")
  66:     .eq("user_id", user.id);
  67: 
  68:   const workspaceRoles = (rolesRows ?? []).map(
  69:     (r) => r.role as WorkspaceRole
  70:   );
  71: 
  72:   const { data: memberRows } = await supabase
  73:     .from("workspace_members")
  74:     .select("workspace_id, workspaces(id, name, slug)")
  75:     .eq("user_id", user.id);
  76: 
  77:   const workspaces =
  78:     (memberRows ?? [])
  79:       .map((row) => row.workspaces)
  80:       .filter((ws): ws is { id: string; name: string; slug: string } => !!ws);
  81: 
  82:   return {
  83:     userId: user.id,
  84:     profile: {
  85:       id: profile.id,
  86:       handle: profile.handle,
  87:       display_name: profile.display_name,
  88:       email: user.email ?? null,
  89:       avatar_url: profile.avatar_url,
  90:       locale: profile.locale as "ko" | "en",
  91:       role: (profile.role as ProfileRole | null) ?? null,
  92:     },
  93:     workspaceRoles,
  94:     workspaces,
  95:     currentWorkspaceId: workspaces[0]?.id ?? null,
  96:   };
  97: }

 succeeded in 380ms:
   1: "use client";
   2: 
   3: import { useTranslations } from "next-intl";
   4: import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
   5: import {
   6:   DropdownMenu,
   7:   DropdownMenuContent,
   8:   DropdownMenuItem,
   9:   DropdownMenuSeparator,
  10:   DropdownMenuTrigger,
  11: } from "@/components/ui/dropdown-menu";
  12: import { LogOut } from "lucide-react";
  13: import { signOutAction } from "@/lib/app/signout-action";
  14: import type { ProfileRole, WorkspaceRole } from "@/lib/app/context";
  15: 
  16: type Profile = {
  17:   id: string;
  18:   handle: string;
  19:   display_name: string;
  20:   email: string | null;
  21:   avatar_url: string | null;
  22:   role: ProfileRole | null;
  23: };
  24: 
  25: function resolveVisibleName(profile: Profile): string {
  26:   // Wave C.5a sub_02 ??DB handle (c_xxx) is never user-facing. Prefer
  27:   // display_name; fall back to email local-part. Never expose the email
  28:   // address itself or the raw handle in UI.
  29:   const displayName = profile.display_name?.trim();
  30:   if (displayName) return displayName;
  31:   const localPart = profile.email?.split("@")[0]?.trim();
  32:   if (localPart) return localPart;
  33:   return "";
  34: }
  35: 
  36: function getRoleLabel(
  37:   profile: Profile,
  38:   workspaceRoles: WorkspaceRole[],
  39:   isYagiInternalMember: boolean,
  40: ): string {
  41:   // Workspace roles take precedence over profile.role for the badge ??  // an admin/internal user is identified by their staff capacity even if
  42:   // they also carry a creator/studio profile. Phase 2.7.1 visibility pass.
  43:   if (workspaceRoles.includes("yagi_admin")) return "YAGI Admin";
  44:   if (isYagiInternalMember) return "Internal";
  45:   switch (profile.role) {
  46:     case "creator":
  47:       return "Creator";
  48:     case "studio":
  49:       return "Studio";
  50:     case "client":
  51:       return "Client";
  52:     case "observer":
  53:       return "Observer";
  54:     case "artist":
  55:       return "Artist";
  56:     default:
  57:       return "";
  58:   }
  59: }
  60: 
  61: export function SidebarUserMenu({
  62:   profile,
  63:   workspaceRoles,
  64:   isYagiInternalMember,
  65: }: {
  66:   profile: Profile;
  67:   workspaceRoles: WorkspaceRole[];
  68:   isYagiInternalMember: boolean;
  69: }) {
  70:   const c = useTranslations("common");

 succeeded in 387ms:
   1: import { redirect } from "@/i18n/routing";
   2: import { fetchAppContext } from "@/lib/app/context";
   3: import { Sidebar, MobileSidebarSheet } from "@/components/app/sidebar";
   4: import {
   5:   resolveActiveWorkspace,
   6:   listOwnWorkspaces,
   7: } from "@/lib/workspace/active";
   8: import { NotificationBell } from "@/components/app/notification-bell";
   9: import { PageHelpLink } from "@/components/app/page-help-link";
  10: import { LanguageSwitcher } from "@/components/app/language-switcher";
  11: import { createSupabaseServer } from "@/lib/supabase/server";
  12: import { getUserScopes } from "@/lib/app/scopes";
  13: import { UserScopesProvider } from "@/lib/app/use-user-scopes";
  14: import { SupportWidget } from "@/components/support/support-widget";
  15: 
  16: export default async function AppLayout({
  17:   children,
  18:   params,
  19: }: {
  20:   children: React.ReactNode;
  21:   params: Promise<{ locale: string }>;
  22: }) {
  23:   const { locale } = await params;
  24: 
  25:   const supabase = await createSupabaseServer();
  26:   const {
  27:     data: { user },
  28:   } = await supabase.auth.getUser();
  29:   if (!user) redirect({ href: "/signin", locale });
  30: 
  31:   const ctx = await fetchAppContext();
  32:   if (!ctx) {
  33:     redirect({ href: "/onboarding", locale });
  34:     return null;
  35:   }
  36: 
  37:   const hasPrivilegedGlobalRole =
  38:     ctx.workspaceRoles.includes("yagi_admin") ||
  39:     ctx.workspaceRoles.includes("creator");
  40:   // Phase 2.7: client persona doesn't need a workspace; their primary
  41:   // surface is /app/commission.
  42:   const isClient = ctx.profile.role === "client";
  43:   if (ctx.workspaces.length === 0 && !hasPrivilegedGlobalRole && !isClient) {
  44:     redirect({ href: "/onboarding/workspace", locale });
  45:     return null;
  46:   }
  47: 
  48:   // Seed the bell with the current unread count. Realtime takes over from here.
  49:   const { count: initialUnreadCount } = await supabase
  50:     .from("notification_events")
  51:     .select("id", { count: "exact", head: true })
  52:     .eq("user_id", ctx.userId)
  53:     .is("in_app_seen_at", null);
  54: 
  55:   const bellLocale: "ko" | "en" = locale === "en" ? "en" : "ko";

 succeeded in 409ms:
   1: /**
   2:  * Phase 4.x Wave C.5b sub_13 ??Artist demo account bootstrap.
   3:  *
   4:  * Creates the test Artist account specified by yagi:
   5:  *   email:    artist@yagiworkshop.xyz
   6:  *   password: yagiworkshop12#$
   7:  *   role:     'artist'
   8:  *
   9:  * Run via: `npx tsx scripts/create-artist-account.ts`
  10:  *
  11:  * BLOCKED until the `profiles_role_check` CHECK constraint is widened
  12:  * to accept 'artist'. The current constraint is:
  13:  *
  14:  *   CHECK ((role IS NULL) OR
  15:  *          (role = ANY (ARRAY['creator','studio','observer','client'])))
  16:  *
  17:  * Adding 'artist' is a Phase 5 entry deliverable (curated Artist
  18:  * Roster intake, see DECISIONS_CACHE.md Q-094 + ARCHITECTURE.md 짠18.1).
  19:  * Running this script *before* that migration lands will fail with
  20:  * a check_violation.
  21:  *
  22:  * Required env vars (from `.env.local`):
  23:  *   NEXT_PUBLIC_SUPABASE_URL
  24:  *   SUPABASE_SERVICE_ROLE_KEY
  25:  */
  26: 
  27: import { createClient, type SupabaseClient } from "@supabase/supabase-js";
  28: 
  29: const ARTIST_EMAIL = "artist@yagiworkshop.xyz";
  30: const ARTIST_PASSWORD = "yagiworkshop12#$";
  31: const ARTIST_DISPLAY_NAME = "Artist Demo";
  32: const ARTIST_ROLE = "artist";
  33: 
  34: async function main() {
  35:   const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  36:   const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  37:   if (!url || !key) {
  38:     throw new Error(
  39:       "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env",
  40:     );
  41:   }
  42: 
  43:   const supabase: SupabaseClient = createClient(url, key, {
  44:     auth: { autoRefreshToken: false, persistSession: false },
  45:   });
  46: 
  47:   // Create auth user
  48:   const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
  49:     email: ARTIST_EMAIL,
  50:     password: ARTIST_PASSWORD,
  51:     email_confirm: true,
  52:     user_metadata: { display_name: ARTIST_DISPLAY_NAME },
  53:   });
  54:   if (authErr) {
  55:     if (authErr.message.includes("already registered") || authErr.message.includes("exists")) {
  56:       console.warn(`[artist-account] auth user already exists, looking up id...`);
  57:       const { data: usersList } = await supabase.auth.admin.listUsers();
  58:       const existing = usersList?.users.find((u) => u.email === ARTIST_EMAIL);
  59:       if (!existing) throw new Error("auth user reported existing but lookup failed");
  60:       await ensureProfile(supabase, existing.id);
  61:       console.log(`[artist-account] existing user_id=${existing.id} profile ensured`);
  62:       return;
  63:     }
  64:     throw authErr;
  65:   }
  66: 
  67:   const userId = authData.user?.id;
  68:   if (!userId) throw new Error("auth.users insert returned no id");
  69: 
  70:   await ensureProfile(supabase, userId);
  71:   console.log(`[artist-account] created user_id=${userId} role=${ARTIST_ROLE}`);
  72: }
  73: 
  74: async function ensureProfile(supabase: SupabaseClient, userId: string) {
  75:   // Generate a placeholder handle (internal-only, see DECISIONS Q-095).
  76:   const handle = `artist_demo_${userId.slice(0, 6)}`;
  77: 
  78:   const { error: profileErr } = await supabase.from("profiles").upsert({
  79:     id: userId,
  80:     handle,
  81:     display_name: ARTIST_DISPLAY_NAME,
  82:     role: ARTIST_ROLE,
  83:     locale: "ko",
  84:   });
  85:   if (profileErr) {
  86:     if (profileErr.code === "23514" || profileErr.message.includes("profiles_role_check")) {
  87:       throw new Error(
  88:         `[artist-account] profiles_role_check rejected role='${ARTIST_ROLE}'. ` +
  89:           `The CHECK constraint must be widened to include 'artist' (Phase 5 entry migration). ` +
  90:           `See DECISIONS_CACHE.md Q-094.`,
  91:       );
  92:     }
  93:     throw profileErr;
  94:   }
  95: }
  96: 
  97: main().catch((err) => {
  98:   console.error("[artist-account] failed:", err);
  99:   process.exit(1);
 100: });

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -e \"profiles: \\{\" -e \"role:\" src/lib/supabase/database.types.ts" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 303ms:
1159:      profiles: {
1170:          role: string | null
1633:          actor_role: string
1643:          actor_role: string
2408:          role: string
2415:          role: string
2451:          role: string
2462:          role: string
2501:          role: string
2511:          role: string
2661:        Args: { actor_role: string; from_status: string; to_status: string }

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql' | ForEach-Object { "'$i++; if (($i -ge 136 -and $i -le 152) -or ($i -ge 250 -and $i -le 318) -or ($i -ge 390 -and $i -le 438)) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -e \"actor_role\" -e \"profiles.*role\" -e \"profile\\.role\" -e \"user_roles\" src/app/[locale]/app src/lib src/components/projects src/components/project-board -g '"'!node_modules'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -e \"\\.rpc\\(\" -e \"is_yagi_admin\" -e \"is_ws_admin\" -e \"workspace_admin\" -e \"yagi_admin\" src/app/[locale]/app src/lib -g '"'!node_modules'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 384ms:
 136:   id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
 137:   project_id       uuid        NOT NULL
 138:                                  REFERENCES public.projects(id) ON DELETE CASCADE,
 139:   from_status      text        NULL,
 140:   to_status        text        NOT NULL,
 141:   actor_id         uuid        NULL
 142:                                  REFERENCES auth.users(id) ON DELETE SET NULL,
 143:   actor_role       text        NOT NULL
 144:                                  CHECK (actor_role IN (
 145:                                    'client', 'yagi_admin', 'workspace_admin', 'system'
 146:                                  )),
 147:   comment          text        NULL,
 148:   transitioned_at  timestamptz NOT NULL DEFAULT now()
 149: );
 150: 
 151: CREATE INDEX IF NOT EXISTS project_status_history_project_id_idx
 152:   ON public.project_status_history (project_id, transitioned_at DESC);
 250: --   in_review   ??in_progress        ??--   in_revision ??in_progress        ??--   in_progress ??delivered          ??--   draft       ??cancelled          ??--   submitted   ??cancelled          ??--   in_review   ??cancelled          ??--   in_progress ??cancelled          ??--   in_revision ??cancelled          ??--   delivered   ??cancelled          ??--   approved    ??archived           ??--
 251: -- actor_role='system':
 252: --   submitted   ??in_review          ?? (the ONLY system transition ??L-015)
 253: --
 254: -- All other combinations ??FALSE.
 255: 
 256: CREATE OR REPLACE FUNCTION public.is_valid_transition(
 257:   from_status text,
 258:   to_status   text,
 259:   actor_role  text
 260: )
 261: RETURNS boolean
 262: LANGUAGE sql
 263: IMMUTABLE
 264: SECURITY DEFINER
 265: SET search_path = public
 266: AS $$
 267:   SELECT CASE
 268: 
 269:     -- ---- client transitions ----
 270:     WHEN actor_role = 'client' THEN
 271:       CASE
 272:         -- draft ??submitted
 273:         WHEN from_status = 'draft'        AND to_status = 'submitted'   THEN true
 274:         -- in_progress ??in_revision
 275:         WHEN from_status = 'in_progress'  AND to_status = 'in_revision' THEN true
 276:         -- delivered ??in_revision
 277:         WHEN from_status = 'delivered'    AND to_status = 'in_revision' THEN true
 278:         -- delivered ??approved  (client-ONLY; this pair intentionally absent from admin block)
 279:         WHEN from_status = 'delivered'    AND to_status = 'approved'    THEN true
 280:         -- [pre-approved states] ??cancelled
 281:         WHEN to_status = 'cancelled' AND from_status = ANY (ARRAY[
 282:           'draft','submitted','in_review','in_progress','in_revision','delivered'
 283:         ]) THEN true
 284:         ELSE false
 285:       END
 286: 
 287:     -- ---- admin transitions (yagi_admin OR workspace_admin) ----
 288:     WHEN actor_role IN ('yagi_admin','workspace_admin') THEN
 289:       CASE
 290:         WHEN from_status = 'in_review'    AND to_status = 'in_progress' THEN true
 291:         WHEN from_status = 'in_revision'  AND to_status = 'in_progress' THEN true
 292:         WHEN from_status = 'in_progress'  AND to_status = 'delivered'   THEN true
 293:         WHEN from_status = 'approved'     AND to_status = 'archived'    THEN true
 294:         -- NOTE: admin may NOT set delivered?뭓pproved (that is client-only above)
 295:         WHEN to_status = 'cancelled' AND from_status = ANY (ARRAY[
 296:           'draft','submitted','in_review','in_progress','in_revision','delivered'
 297:         ]) THEN true
 298:         ELSE false
 299:       END
 300: 
 301:     -- ---- system transition ----
 302:     WHEN actor_role = 'system' THEN
 303:       -- The ONLY system transition: submitted ??in_review (L-015 auto-transition)
 304:       CASE
 305:         WHEN from_status = 'submitted' AND to_status = 'in_review' THEN true
 306:         ELSE false
 307:       END
 308: 
 309:     ELSE false
 310:   END;
 311: $$;
 312: 
 313: COMMENT ON FUNCTION public.is_valid_transition(text, text, text) IS
 314:   'Phase 3.0 ??pure truth-table guard for project state machine. IMMUTABLE. '
 315:   'Called by transition_project_status() before any write. '
 316:   'See migration header for full allowed-transition table.';
 317: 
 318: REVOKE ALL ON FUNCTION public.is_valid_transition(text, text, text) FROM PUBLIC;
 390:     SELECT 1 FROM public.user_roles
 391:      WHERE user_id = v_actor_id
 392:        AND role = 'workspace_admin'
 393:        AND workspace_id = v_workspace_id
 394:   );
 395: 
 396:   -- 5. Assign actor_role string
 397:   IF v_is_yagi_admin THEN
 398:     v_actor_role := 'yagi_admin';
 399:   ELSIF v_is_ws_admin THEN
 400:     v_actor_role := 'workspace_admin';
 401:   ELSE
 402:     -- Default to client; authorization gate below ensures they own the project
 403:     v_actor_role := 'client';
 404:   END IF;
 405: 
 406:   -- 6. Authorization gate
 407:   IF v_actor_role = 'client' AND v_actor_id <> v_created_by THEN
 408:     RAISE EXCEPTION 'forbidden: client may only transition own projects'
 409:       USING ERRCODE = '42501';
 410:   END IF;
 411:   -- Admin roles have no per-project ownership restriction; they operate
 412:   -- on any project in the workspace (or any project for yagi_admin).
 413: 
 414:   -- 7. Comment requirement: in_revision transitions need ??10 non-whitespace chars
 415:   IF p_to_status = 'in_revision' THEN
 416:     IF p_comment IS NULL OR length(trim(p_comment)) < 10 THEN
 417:       RAISE EXCEPTION 'comment_required_min_10_chars'
 418:         USING ERRCODE = '22023';
 419:     END IF;
 420:   END IF;
 421: 
 422:   -- 8. Validate transition via truth table
 423:   IF NOT public.is_valid_transition(v_from_status, p_to_status, v_actor_role) THEN
 424:     RAISE EXCEPTION 'invalid_transition: % -> % for role %',
 425:       v_from_status, p_to_status, v_actor_role
 426:       USING ERRCODE = '23514';
 427:   END IF;
 428: 
 429:   -- 9. Signal trigger guard to allow status column write
 430:   PERFORM set_config('local.transition_rpc_active', 'true', true);
 431: 
 432:   -- 10. UPDATE projects
 433:   UPDATE public.projects
 434:      SET status       = p_to_status,
 435:          updated_at   = now(),
 436:          submitted_at = CASE
 437:                           WHEN p_to_status = 'submitted' THEN now()
 438:                           ELSE submitted_at

 succeeded in 408ms:
src/components/projects\status-timeline.tsx:19:  actor_role: string;
src/components/projects\status-timeline.tsx:74:          'id, project_id, from_status, to_status, actor_id, actor_role, comment, transitioned_at'
src/components/projects\status-timeline.tsx:162:                {(row.actor_display_name || row.actor_role) && (
src/components/projects\status-timeline.tsx:166:                      : row.actor_role === 'system'
src/components/projects\status-timeline.tsx:168:                      : row.actor_role === 'yagi_admin'
src/components/projects\status-timeline.tsx:170:                      : row.actor_role === 'workspace_admin'
src/lib\onboarding\state.ts:30:    .from("user_roles")
src/lib\onboarding\role-redirects.ts:28:  if (profile.role === null) {
src/lib\onboarding\actions.ts:32:      .from("user_roles")
src/lib\commission\actions.ts:42:  if (!profile || profile.role !== "client") {
src/lib\email\new-message.ts:92:        .from("user_roles")
src/lib\app\context.ts:13:// `profile.role ===` — see ADR-009 naming rule.
src/lib\app\context.ts:64:    .from("user_roles")
src/lib\app\context.ts:91:      role: (profile.role as ProfileRole | null) ?? null,
src/lib\supabase\database.types.ts:1633:          actor_role: string
src/lib\supabase\database.types.ts:1643:          actor_role: string
src/lib\supabase\database.types.ts:1653:          actor_role?: string
src/lib\supabase\database.types.ts:2404:      user_roles: {
src/lib\supabase\database.types.ts:2428:            foreignKeyName: "user_roles_user_id_fkey"
src/lib\supabase\database.types.ts:2435:            foreignKeyName: "user_roles_workspace_id_fkey"
src/lib\supabase\database.types.ts:2661:        Args: { actor_role: string; from_status: string; to_status: string }
src/app/[locale]/app\layout.tsx:42:  const isClient = ctx.profile.role === "client";
src/app/[locale]/app\support\actions.ts:195:      .from("user_roles")
src/app/[locale]/app\invoices\new\page.tsx:22:    .from("user_roles")
src/app/[locale]/app\invoices\page.tsx:72:    .from("user_roles")
src/app/[locale]/app\commission\page.tsx:29:  if (!profile || profile.role !== "client") {
src/app/[locale]/app\meetings\request-actions.ts:126:    .from("user_roles")
src/app/[locale]/app\meetings\request-actions.ts:352:    .from("user_roles")
src/app/[locale]/app\meetings\request-actions.ts:472:      .from("user_roles")
src/app/[locale]/app\invoices\[id]\actions.ts:168:      .from("user_roles")
src/app/[locale]/app\preprod\[id]\share-actions.ts:296:      .from("user_roles")
src/app/[locale]/app\invoices\[id]\page.tsx:62:    .from("user_roles")
src/app/[locale]/app\admin\page.tsx:47:    .from("user_roles")
src/app/[locale]/app\meetings\new\page.tsx:51:      .from("user_roles")
src/app/[locale]/app\admin\invoices\page.tsx:108:    .from("user_roles")
src/app/[locale]/app\projects\new\actions.ts:652://   2. INSERT project_status_history with actor_role='system' — MUST bypass
src/app/[locale]/app\projects\new\actions.ts:875:  // 2. INSERT project_status_history with actor_role='system'.
src/app/[locale]/app\projects\new\actions.ts:890:      actor_role: "system",
src/app/[locale]/app\projects\[id]\actions.ts:65:    .from("user_roles")
src/app/[locale]/app\projects\[id]\board-actions.ts:253:    .from("user_roles")
src/app/[locale]/app\projects\[id]\board-actions.ts:327:    .from("user_roles")
src/app/[locale]/app\admin\projects\[id]\page.tsx:2:// Auth: yagi_admin only (user_roles check; non-admin → notFound).
src/app/[locale]/app\admin\projects\[id]\page.tsx:32:    .from("user_roles")
src/app/[locale]/app\projects\[id]\page.tsx:152:    .from("user_roles")
src/app/[locale]/app\projects\[id]\thread-actions.ts:30:      .from("user_roles")
src/app/[locale]/app\projects\[id]\thread-actions.ts:183:      .from("user_roles")
src/app/[locale]/app\projects\[id]\thread-actions.ts:397:    .from("user_roles")
src/app/[locale]/app\projects\[id]\brief\actions.ts:403:    .from("user_roles")
src/app/[locale]/app\projects\[id]\brief\actions.ts:444:    .from("user_roles")
src/app/[locale]/app\projects\[id]\brief\actions.ts:978:  // Enumerate yagi_admin recipients via service role (user_roles SELECT
src/app/[locale]/app\projects\[id]\brief\actions.ts:984:    .from("user_roles")

 succeeded in 401ms:
src/lib\app\context.ts:7:  | "workspace_admin"
src/lib\app\context.ts:9:  | "yagi_admin";
src/lib\app\scopes.ts:30:  if (ctx.workspaceRoles.includes("yagi_admin")) {
src/lib\email\new-message.ts:95:        .eq("role", "yagi_admin"),
src/lib\commission\actions.ts:96:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src/app/[locale]/app\layout.tsx:38:    ctx.workspaceRoles.includes("yagi_admin") ||
src/lib\onboarding\state.ts:34:    .in("role", ["creator", "yagi_admin"]);
src/lib\supabase\database.types.ts:2664:      is_ws_admin: { Args: { uid: string; wsid: string }; Returns: boolean }
src/lib\supabase\database.types.ts:2666:      is_yagi_admin: { Args: { uid: string }; Returns: boolean }
src/lib\team-channels\queries.ts:201:    supabase.rpc("is_yagi_admin", { uid: userId }),
src/lib\team-channels\queries.ts:202:    supabase.rpc("is_ws_admin", {
src/app/[locale]/app\page.tsx:8:// yagi_admin / creator / etc. can navigate to their persona-specific
src/app/[locale]/app\meetings\new\page.tsx:48:  // Check which workspaces the user is an admin of (or is yagi_admin)
src/app/[locale]/app\meetings\new\page.tsx:54:      .eq("role", "workspace_admin"),
src/app/[locale]/app\meetings\new\page.tsx:55:    supabase.rpc("is_yagi_admin", { uid }),
src/app/[locale]/app\meetings\new\page.tsx:62:  // If yagi_admin, all workspaces are accessible
src/lib\workspace\active.ts:24:export type WorkspaceKind = "brand" | "artist" | "yagi_admin";
src/lib\workspace\active.ts:38:  if (value === "brand" || value === "artist" || value === "yagi_admin") {
src/app/[locale]/app\meetings\request-actions.ts:11://   confirmMeetingAction()    — yagi_admin picks a time → status='scheduled'
src/app/[locale]/app\meetings\request-actions.ts:100:  const { data } = await supabase.rpc("is_yagi_admin", { uid });
src/app/[locale]/app\meetings\request-actions.ts:129:    .eq("role", "yagi_admin");
src/app/[locale]/app\meetings\request-actions.ts:176:  // Fan-out to yagi_admins. Fire-and-forget — caller does not wait.
src/app/[locale]/app\meetings\request-actions.ts:225:// confirmMeetingAction (yagi_admin only)
src/app/[locale]/app\meetings\request-actions.ts:348:  // notification_events for every yagi_admin user (excluding the actor
src/app/[locale]/app\meetings\request-actions.ts:350:  // hold yagi_admin globally, in which case they would self-ping).
src/app/[locale]/app\meetings\request-actions.ts:355:    .eq("role", "yagi_admin");
src/app/[locale]/app\meetings\request-actions.ts:460:  // notification_events to the counterparty (client or yagi_admin)
src/app/[locale]/app\meetings\request-actions.ts:475:      .eq("role", "yagi_admin");
src/app/[locale]/app\meetings\actions.ts:139:    supabase.rpc("is_ws_admin", { uid, wsid: workspaceId }),
src/app/[locale]/app\meetings\actions.ts:140:    supabase.rpc("is_yagi_admin", { uid }),
src/app/[locale]/app\meetings\actions.ts:161:  const { data: rpcMeetingId, error: rpcError } = await supabase.rpc(
src/app/[locale]/app\meetings\actions.ts:350:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
src/app/[locale]/app\meetings\actions.ts:351:    supabase.rpc("is_yagi_admin", { uid }),
src/app/[locale]/app\meetings\actions.ts:411:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
src/app/[locale]/app\meetings\actions.ts:412:    supabase.rpc("is_yagi_admin", { uid }),
src/app/[locale]/app\meetings\actions.ts:494:  const { data, error } = await svc.rpc("resolve_user_ids_by_emails", {
src/app/[locale]/app\meetings\actions.ts:631:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
src/app/[locale]/app\meetings\actions.ts:632:    supabase.rpc("is_yagi_admin", { uid }),
src/app/[locale]/app\meetings\actions.ts:735:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
src/app/[locale]/app\meetings\actions.ts:736:    supabase.rpc("is_yagi_admin", { uid }),
src/app/[locale]/app\meetings\actions.ts:807:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
src/app/[locale]/app\meetings\actions.ts:808:    supabase.rpc("is_yagi_admin", { uid }),
src/app/[locale]/app\team\[slug]\actions.ts:291:    supabase.rpc("is_yagi_admin", { uid: user.id }),
src/app/[locale]/app\team\[slug]\actions.ts:292:    supabase.rpc("is_ws_admin", {
src/app/[locale]/app\team\[slug]\actions.ts:369:// createChannel — yagi_admin OR ws_admin only
src/app/[locale]/app\team\[slug]\actions.ts:434:// updateChannel — yagi_admin OR ws_admin only
src/app/[locale]/app\team\[slug]\actions.ts:528:// deleteMessage — author OR yagi_admin only
src/app/[locale]/app\team\[slug]\actions.ts:561:      const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src/app/[locale]/app\admin\layout.tsx:13:  if (!ctx!.workspaceRoles.includes("yagi_admin")) redirect({ href: "/app", locale });
src/app/[locale]/app\invoices\page.tsx:70:  // Detect yagi_admin (controls "+ New invoice" button)
src/app/[locale]/app\invoices\page.tsx:76:    .eq("role", "yagi_admin");
src/app/[locale]/app\support\actions.ts:12://   - workspace_admins read but cannot reply
src/app/[locale]/app\support\actions.ts:13://   - yagi_admin reads + replies anywhere
src/app/[locale]/app\support\actions.ts:140:  // Phase 2.8.6 K-05 LOOP 1 — yagi_admin gate. The DB trigger
src/app/[locale]/app\support\actions.ts:144:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src/app/[locale]/app\support\actions.ts:189:  // Counterparty: if the actor is the client, notify yagi_admins; if
src/app/[locale]/app\support\actions.ts:190:  // actor is a yagi_admin, notify the client. (Workspace admins are
src/app/[locale]/app\support\actions.ts:198:      .eq("role", "yagi_admin");
src/app/[locale]/app\support\actions.ts:201:      // are also a global yagi_admin (would self-ping otherwise).
src/app/[locale]/app\invoices\actions.ts:30:  // yagi_admin gate
src/app/[locale]/app\invoices\actions.ts:31:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src/app/[locale]/app\invoices\[id]\line-item-actions.ts:46:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src/app/[locale]/app\invoices\[id]\actions.ts:42:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src/app/[locale]/app\invoices\[id]\actions.ts:171:      .eq("role", "workspace_admin");
src/app/[locale]/app\invoices\[id]\actions.ts:213:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src/app/[locale]/app\invoices\[id]\actions.ts:254:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src/app/[locale]/app\admin\trash\page.tsx:36:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src/app/[locale]/app\admin\invoices\page.tsx:112:    .eq("role", "yagi_admin");
src/app/[locale]/app\invoices\[id]\page.tsx:60:  // yagi_admin detection (matches list page pattern)
src/app/[locale]/app\invoices\[id]\page.tsx:66:    .eq("role", "yagi_admin");
src/app/[locale]/app\invoices\new\page.tsx:20:  // yagi_admin only
src/app/[locale]/app\invoices\new\page.tsx:26:    .eq("role", "yagi_admin");
src/app/[locale]/app\settings\actions.ts:137:  // RLS enforces workspace_admin — no explicit role check here.
src/app/[locale]/app\settings\actions.ts:155:  role: z.enum(["workspace_admin", "workspace_member"]),
src/app/[locale]/app\settings\invite-form.tsx:67:          <option value="workspace_admin">{t("team_role_admin")}</option>
src/app/[locale]/app\admin\commissions\page.tsx:39:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src/app/[locale]/app\settings\layout.tsx:18:  const isWsAdmin = ctx!.workspaceRoles.includes("workspace_admin");
src/app/[locale]/app\projects\new\actions.ts:142:      // non-yagi_admin INSERT.
src/app/[locale]/app\projects\new\actions.ts:152:    // projects_delete_yagi RLS which only permits yagi_admin DELETEs;
src/app/[locale]/app\projects\new\actions.ts:153:    // a non-yagi workspace_admin's rollback would be silently denied
src/app/[locale]/app\projects\new\actions.ts:924:  const { error: seedErr } = await (supabase as any).rpc(
src/app/[locale]/app\preprod\page.tsx:58:  // Visibility: yagi_admin OR member of yagi-internal workspace
src/app/[locale]/app\preprod\page.tsx:60:    supabase.rpc("is_yagi_admin", { uid }),
src/app/[locale]/app\preprod\page.tsx:70:    const { data: isMember } = await supabase.rpc("is_ws_member", {
src/app/[locale]/app\projects\[id]\thread-actions.ts:26:  // If visibility=internal, enforce server-side that the user has yagi_admin role.
src/app/[locale]/app\projects\[id]\thread-actions.ts:34:      .eq("role", "yagi_admin");
src/app/[locale]/app\projects\[id]\thread-actions.ts:187:      .eq("role", "yagi_admin");
src/app/[locale]/app\projects\[id]\thread-actions.ts:309:  // Phase 2.0 G4 #2 — drop the global yagi_admin fan-out. Previously every
src/app/[locale]/app\projects\[id]\thread-actions.ts:310:  // yagi_admin received notifications for every workspace's thread messages,
src/app/[locale]/app\projects\[id]\thread-actions.ts:394:  // Fetch role rows scoped to this workspace (or null = global yagi_admin)
src/app/[locale]/app\projects\[id]\thread-actions.ts:407:    if (r.role === "yagi_admin") isYagi.add(r.user_id);
src/app/[locale]/app\projects\[id]\thread-actions.ts:408:    if (r.role === "workspace_admin") isAdmin.add(r.user_id);
src/app/[locale]/app\showcases\[id]\page.tsx:45:  // Access: yagi_admin OR workspace_admin of the showcase's workspace.
src/app/[locale]/app\showcases\[id]\page.tsx:46:  const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
src/app/[locale]/app\showcases\[id]\page.tsx:51:    const { data: wsAdmin } = await supabase.rpc("is_ws_admin", {
src/app/[locale]/app\settings\page.tsx:49:  // workspace + team tabs require workspace_admin
src/app/[locale]/app\settings\page.tsx:50:  if (!ctx!.workspaceRoles.includes("workspace_admin")) {
src/app/[locale]/app\showcases\page.tsx:64:  // Access control: yagi_admin OR any workspace admin.
src/app/[locale]/app\showcases\page.tsx:65:  const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
src/app/[locale]/app\showcases\page.tsx:85:  // Scope showcases: yagi_admin sees all; workspace admin sees only their
src/app/[locale]/app\showcases\page.tsx:170:  // Candidate boards for "Create from Board" dialog (yagi_admin only).
src/app/[locale]/app\projects\[id]\page.tsx:9://   6. Admin actions row (yagi_admin only)
src/app/[locale]/app\projects\[id]\page.tsx:12://   - viewer must be project.created_by OR yagi_admin
src/app/[locale]/app\projects\[id]\page.tsx:13://   - workspace_admin from same workspace also allowed for backwards compat
src/app/[locale]/app\projects\[id]\page.tsx:165:  const isYagiAdmin = roles.has("yagi_admin");
src/app/[locale]/app\projects\[id]\page.tsx:166:  const isWsAdmin = roles.has("workspace_admin");
src/app/[locale]/app\projects\[id]\page.tsx:322:                yagi_admin: tDetail("actor.yagi_admin"),
src/app/[locale]/app\projects\[id]\page.tsx:323:                workspace_admin: tDetail("actor.workspace_admin"),
src/app/[locale]/app\showcases\actions.ts:72:  const { data } = await supabase.rpc("is_yagi_admin", { uid: userId });
src/app/[locale]/app\showcases\actions.ts:96:  const { data } = await supabase.rpc("is_ws_admin", {
src/app/[locale]/app\showcases\actions.ts:479:  // retention is acceptable for this surface (infrequent yagi_admin /
src/app/[locale]/app\showcases\actions.ts:658:  // workspace_admin cannot toggle made_with_yagi; only yagi_admin can.
src/app/[locale]/app\admin\support\page.tsx:35:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
src/app/[locale]/app\settings\team-panel.tsx:43:                  {m.role === "workspace_admin"
src/app/[locale]/app\admin\page.tsx:51:    .eq("role", "yagi_admin");
src/app/[locale]/app\admin\challenges\actions.ts:68:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
src/app/[locale]/app\admin\commissions\[id]\page.tsx:29:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src/app/[locale]/app\preprod\[id]\actions.ts:733:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src/app/[locale]/app\preprod\[id]\actions.ts:748:  const { data: isAdmin } = await supabase.rpc("is_ws_admin", {
src/app/[locale]/app\preprod\new\page.tsx:27:  // Visibility: yagi_admin OR member of yagi-internal workspace
src/app/[locale]/app\preprod\new\page.tsx:29:    supabase.rpc("is_yagi_admin", { uid }),
src/app/[locale]/app\preprod\new\page.tsx:39:    const { data: isMember } = await supabase.rpc("is_ws_member", {
src/app/[locale]/app\admin\projects\[id]\page.tsx:2:// Auth: yagi_admin only (user_roles check; non-admin → notFound).
src/app/[locale]/app\admin\projects\[id]\page.tsx:30:  // yagi_admin role check
src/app/[locale]/app\admin\projects\[id]\page.tsx:35:  const isYagiAdmin = (roleRows ?? []).some((r) => r.role === "yagi_admin");
src/app/[locale]/app\projects\[id]\board-actions.ts:15: *       Wraps toggle_project_board_lock RPC (SECURITY DEFINER, yagi_admin only).
src/app/[locale]/app\projects\[id]\board-actions.ts:208:  // RPC enforces yagi_admin internally (RAISE EXCEPTION if not admin).
src/app/[locale]/app\projects\[id]\board-actions.ts:210:  const { error } = await (supabase as any).rpc("toggle_project_board_lock", {
src/app/[locale]/app\projects\[id]\board-actions.ts:223:// Defense-in-depth: action verifies yagi_admin role + RPC verifies.
src/app/[locale]/app\projects\[id]\board-actions.ts:257:    (r) => (r as { role: string }).role === "yagi_admin"
src/app/[locale]/app\projects\[id]\board-actions.ts:262:  const { error } = await (supabase as any).rpc("toggle_project_board_lock", {
src/app/[locale]/app\projects\[id]\board-actions.ts:331:    (r) => (r as { role: string }).role === "yagi_admin"
src/app/[locale]/app\projects\[id]\board-actions.ts:500:  const { data: attachmentId, error: rpcErr } = await (supabase as any).rpc(
src/app/[locale]/app\projects\[id]\board-actions.ts:540:  const { error: rpcErr } = await (supabase as any).rpc(
src/app/[locale]/app\projects\[id]\board-actions.ts:614:  const { data: attachmentId, error: rpcErr } = await (supabase as any).rpc(
src/app/[locale]/app\projects\[id]\board-actions.ts:656:  const { error: rpcErr } = await (supabase as any).rpc(
src/app/[locale]/app\projects\[id]\board-actions.ts:694:  const { error: rpcErr } = await (supabase as any).rpc(
src/app/[locale]/app\preprod\[id]\page.tsx:28:  // Visibility: yagi_admin OR member of yagi-internal workspace
src/app/[locale]/app\preprod\[id]\page.tsx:30:    supabase.rpc("is_yagi_admin", { uid }),
src/app/[locale]/app\preprod\[id]\page.tsx:40:    const { data: isMember } = await supabase.rpc("is_ws_member", {
src/app/[locale]/app\projects\[id]\brief\actions.ts:386:// 4. lockBrief — yagi_admin-only, status='editing' → 'locked'
src/app/[locale]/app\projects\[id]\brief\actions.ts:401:  // also enforces yagi_admin-only status flips).
src/app/[locale]/app\projects\[id]\brief\actions.ts:406:    .eq("role", "yagi_admin")
src/app/[locale]/app\projects\[id]\brief\actions.ts:410:    return { error: "forbidden", reason: "yagi_admin required" };
src/app/[locale]/app\projects\[id]\brief\actions.ts:429:// 5. unlockBrief — yagi_admin-only, status='locked' → 'editing' (no snapshot)
src/app/[locale]/app\projects\[id]\brief\actions.ts:447:    .eq("role", "yagi_admin")
src/app/[locale]/app\projects\[id]\brief\actions.ts:451:    return { error: "forbidden", reason: "yagi_admin required" };
src/app/[locale]/app\projects\[id]\brief\actions.ts:558:// RLS (caller must be a project member or yagi_admin). On success the
src/app/[locale]/app\projects\[id]\brief\actions.ts:935:// notification to every yagi_admin so they can pick up the request.
src/app/[locale]/app\projects\[id]\brief\actions.ts:978:  // Enumerate yagi_admin recipients via service role (user_roles SELECT
src/app/[locale]/app\projects\[id]\brief\actions.ts:986:    .eq("role", "yagi_admin");
src/app/[locale]/app\preprod\[id]\share-actions.ts:298:      .eq("role", "yagi_admin")
src/app/[locale]/app\projects\[id]\actions.ts:25:  "workspace_admin" | "yagi_admin",
src/app/[locale]/app\projects\[id]\actions.ts:28:  workspace_admin: {
src/app/[locale]/app\projects\[id]\actions.ts:32:  yagi_admin: {
src/app/[locale]/app\projects\[id]\actions.ts:80:    roles.has("workspace_admin") &&
src/app/[locale]/app\projects\[id]\actions.ts:81:    (ALLOWED.workspace_admin[project.status] ?? []).includes(
src/app/[locale]/app\projects\[id]\actions.ts:85:    roles.has("yagi_admin") &&
src/app/[locale]/app\projects\[id]\actions.ts:86:    (ALLOWED.yagi_admin[project.status] ?? []).includes(parsed.data.newStatus);
src/app/[locale]/app\projects\[id]\actions.ts:114:// row from ws_member reads automatically (yagi_admin still sees it for the
src/app/[locale]/app\projects\[id]\actions.ts:127:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src/app/[locale]/app\admin\commissions\[id]\actions.ts:14:// RLS: RPC is yagi_admin only. Authorization is double-checked at the
src/app/[locale]/app\admin\commissions\[id]\actions.ts:54:  // Double-check yagi_admin so the action path doesn't leak the RPC
src/app/[locale]/app\admin\commissions\[id]\actions.ts:56:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src/app/[locale]/app\admin\challenges\[slug]\announce\actions.ts:30:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src/app/[locale]/app\admin\challenges\[slug]\announce\page.tsx:59:    const { data: voteRows } = await (supabase as any).rpc(
src/app/[locale]/app\admin\challenges\[slug]\judge\actions.ts:14:  const { data } = await supabase.rpc("is_yagi_admin", { uid: userId });

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'.yagi-autobuild/phase-4-x/_artist_account_created.md' | ForEach-Object { "'$i++; if ($i -le 95) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 308ms:
   1: # Wave C.5b sub_13 + amend_02 ??Artist demo account (CREATED)
   2: 
   3: **Status**: ??Created 2026-05-01 via `scripts/create-artist-account.ts`
   4: after Wave C.5b amend_02 widened `profiles_role_check` to include
   5: `'artist'`.
   6: 
   7: ## Spec recap
   8: 
   9: yagi-locked spec for the demo Artist account:
  10: 
  11: - email: `artist@yagiworkshop.xyz`
  12: - password: `yagiworkshop12#$`
  13: - role: `artist` (PRODUCT-MASTER 짠4 / DECISIONS Q-094 persona model)
  14: - purpose: test/demo account for yagi visual review ahead of the
  15:   Phase 5 Artist Roster intake surface design
  16: 
  17: ## Pre-flight (after amend_02)
  18: 
  19: After Wave C.5b amend_02 (commit pending), the
  20: `profiles_role_check` constraint reads:
  21: 
  22: ```sql
  23: CHECK ((role IS NULL) OR
  24:        (role = ANY (ARRAY['creator','studio','observer','client','artist'])))
  25: ```
  26: 
  27: `'artist'` is a permitted value. Path-to-unblock from the original
  28: sub_13 halt log is satisfied.
  29: 
  30: ## Bootstrap result
  31: 
  32: ```
  33: > npx tsx scripts/create-artist-account.ts
  34: [artist-account] created user_id=2d6a3f6f-cd69-4425-93b6-bebd9f4cf434 role=artist
  35: ```
  36: 
  37: Live verification (joined `auth.users` + `public.profiles`):
  38: 
  39: | field | value |
  40: |---|---|
  41: | auth.users.id | `2d6a3f6f-cd69-4425-93b6-bebd9f4cf434` |
  42: | auth.users.email | `artist@yagiworkshop.xyz` |
  43: | auth.users.email_confirmed | `true` |
  44: | auth.users.raw_user_meta_data.display_name | `Artist Demo` |
  45: | profiles.handle | `artist_demo_2d6a3f` |
  46: | profiles.display_name | `Artist Demo` |
  47: | profiles.role | `artist` |
  48: | profiles.locale | `ko` |
  49: 
  50: ## Trigger / script ordering verification
  51: 
  52: This account exercises the `handle_new_user` (amend_01) ??sub_13
  53: script interaction documented in amend_01 self-review F8 and
  54: amend_02 self-review F4/F5:
  55: 
  56: 1. `auth.admin.createUser` ??`auth.users` INSERT.
  57: 2. `handle_new_user` AFTER INSERT trigger fires ??profile row
  58:    inserted with `role='client'` (default per persona A),
  59:    `handle='c_<md5>'`, `display_name='artist'` (email local-part),
  60:    `locale='ko'`.
  61: 3. Script's `supabase.from('profiles').upsert({...})` runs as
  62:    service-role ??ON CONFLICT (id) ??UPDATE. `role` flips to
  63:    `'artist'`, `handle` to `'artist_demo_2d6a3f'`,
  64:    `display_name` to `'Artist Demo'`.
  65: 4. `validate_profile_role_transition` trigger fires on the UPDATE
  66:    but short-circuits at `IF auth.uid() IS NULL THEN RETURN NEW`
  67:    (service-role context has no session uid). Allows
  68:    client ??artist transition.
  69: 
  70: Net result: account is `role='artist'` end-to-end with the
  71: expected handle / display_name / locale.
  72: 
  73: ## Login test
  74: 
  75: yagi can sign in at `/ko/signin` with:
  76: 
  77: - email: `artist@yagiworkshop.xyz`
  78: - password: `yagiworkshop12#$`
  79: 
  80: Post-signin, the user lands on `/onboarding/workspace` because the
  81: artist account has no `workspace_members` row. Phase 5 entry will
  82: introduce a curated Artist intake / workspace bootstrap path; for
  83: Wave C.5b visual review this bounce is expected (not a bug).
  84: 
  85: ## Artifacts
  86: 
  87: - `scripts/create-artist-account.ts` ??unchanged from sub_13 commit.
  88: - `supabase/migrations/20260501100806_phase_4_x_widen_profile_role_enum.sql` ??committed in amend_02a.
  89: - `_amend02_self_review.md` ??Layer 1 review pre-apply.
  90: - This file ??bootstrap result log.
  91: 
  92: ## Followups
  93: 
  94: - FU-C5b-01 (Phase 5 Artist Roster intake surface) remains open. The
  95:   demo account now exists for visual review but the curated intake

codex
The account landing behavior is documented in `_artist_account_created.md`: the live artist account has no workspace membership and is expected to land on `/onboarding/workspace` until Phase 5. I’m consolidating that with the code-level redirect path so the final verdict calls out whether it is a bug or a known gap.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'.yagi-autobuild/ARCHITECTURE.md' | ForEach-Object { "'$i++; if ($i -ge 500 -and $i -le 530) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'.yagi-autobuild/DECISIONS_CACHE.md' | ForEach-Object { "'$i++; if ($i -ge 1200 -and $i -le 1226) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'.yagi-autobuild/phase-4-x/_wave_c5b_amendments_result.md' | ForEach-Object { "'$i++; if (($i -ge 60 -and $i -le 105) -or ($i -ge 185 -and $i -le 207)) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 376ms:
 500: | shadcn HSL channel | `--background`, `--foreground`, `--accent`, ... | shadcn-component compat |
 501: | v1.0 raw | `--ds-bg-base`, `--ds-ink-primary`, `--ds-sage`, ... | rgba-aware utilities |
 502: 
 503: Tailwind config extends with non-overlapping families: `sage`, `ink`,
 504: `surface`, `edge`, `inverse`, type scale 11..80, motion (400ms /
 505: cubic-bezier(0.45, 0, 0, 1) defaults), radius scale (pill / card /
 506: button), maxWidth (narrow / content / cinema).
 507: 
 508: **Hard rules** (yagi-design-system v1.0 SKILL.md 짠"Hard Rules"):
 509: 
 510: 1. No additional accent colors. Sage `#71D083` is sole.
 511: 2. No shadows by default. Border + backdrop blur for elevation.
 512: 3. No legacy `#C8FF8C` lime ??fully retired; replace with sage.
 513: 4. No EN tracking on KO text. KO body `0`, KO display `-0.01em`.
 514: 5. No lh 1.0 on KO display. Minimum 1.15 to avoid jamo clipping.
 515: 6. No Mona12 / Redaction Italic for body (accent-only, max 2 words).
 516: 7. No uniform grids for media (mixed-size asymmetric is the language).
 517: 8. No bold (700+) in body (Pretendard/Geist body 400??00).
 518: 
 519: Wave C.5c is reserved for the visual-breakage sweep flagged by
 520: `_sub00_breakage_log.md` after yagi review.
 521: 
 522: ### 18.3 sub_00 ROLLBACK amendment (2026-05-01)
 523: 
 524: 짠18.2 above describes the dark editorial flip that landed in Wave
 525: C.5b sub_00. yagi's visual review of that flip returned a verdict
 526: of "too heavy on light pages, roll back." The amendment:
 527: 
 528: - `:root` returned to Phase 2.7.1 P12 light tokens (off-white
 529:   background, near-black ink). `next-themes` `defaultTheme="light"`
 530:   + `enableSystem` restored.

 succeeded in 375ms:
1200: permanently retired from this codebase. Artist Roster intake (???/
1201: ?뷀꽣?먯씠?꾩떆) is moved to Phase 5 entry as a curated yagi-direct flow,
1202: NOT a self-registration form. Independent creator self-registration is
1203: deferred to Phase 9+ or permanently dropped.
1204: 
1205: Wave C.5b sub_01..02 executed the cleanup: deleted `/onboarding/role`,
1206: `/onboarding/profile/{client,creator,observer,studio}/`, the
1207: `completeProfileAction` server action, the entire `/u/<handle>` tree
1208: (layout + page + queries), email templates `signup-welcome.ts` and
1209: `role-confirmation.ts`, and narrowed `lib/app/scopes.ts` Scope union to
1210: {workspace, admin}. The `profiles.role` enum still carries
1211: `creator|studio|observer|client` for legacy DB rows; only `client` (and
1212: the future `artist` value to be added in Phase 5) is wired to a live UI
1213: in current code.
1214: 
1215: **Applies when:** Any future request to "let creators sign up" or
1216: "add a creator portal." Default answer: Phase 4-9 = no. Artist Roster
1217: work belongs to Phase 5 with a curated yagi-admin-issued invite-token
1218: flow, not a self-registration form. Independent creator self-service
1219: is the kind of decision that needs an explicit reversal ??do not
1220: quietly re-add `/onboarding/role`.
1221: 
1222: **Confidence:** HIGH (yagi explicit 5-decision lock chat 2026-05-01,
1223: recorded in `_decisions_locked.md` + `_wave-c5b-prompt.md`)
1224: 
1225: **Registered:** 2026-05-01 (Wave C.5b sub_11)
1226: 

 succeeded in 355ms:
  60: 
  61: ## amend_02 ??Artist enum widening + demo account bootstrap
  62: 
  63: **Migration**: `supabase/migrations/20260501100806_phase_4_x_widen_profile_role_enum.sql`
  64: 
  65: Pulled forward from Phase 5 entry. `profiles_role_check` widened to
  66: include `'artist'`. Additive only ??all existing rows pass. No RLS
  67: or RPC consumer treats the role enum as closed-world; the change
  68: is semantically a no-op for existing flows and a prerequisite for
  69: the demo account.
  70: 
  71: TypeScript ProfileRole union extended with `"artist"` (HIGH-B fix
  72: from self-review F6); sidebar switch case added so the dropdown
  73: header shows "Artist" for the demo account.
  74: 
  75: Reviewer Fallback Layer 1: 10 findings audited, 0 HIGH-A residual,
  76: 1 HIGH-B auto-fixed in the same commit. Full audit in
  77: `_amend02_self_review.md`.
  78: 
  79: **Bootstrap result** (`scripts/create-artist-account.ts` executed
  80: via `npx tsx`):
  81: 
  82: ```
  83: [artist-account] created user_id=2d6a3f6f-cd69-4425-93b6-bebd9f4cf434 role=artist
  84: ```
  85: 
  86: Live verification (auth.users + profiles join):
  87: 
  88: | field | value |
  89: |---|---|
  90: | auth.users.id | `2d6a3f6f-cd69-4425-93b6-bebd9f4cf434` |
  91: | auth.users.email | `artist@yagiworkshop.xyz` |
  92: | email_confirmed | `true` |
  93: | profile.handle | `artist_demo_2d6a3f` |
  94: | profile.display_name | `Artist Demo` |
  95: | profile.role | `artist` |
  96: | profile.locale | `ko` |
  97: 
  98: **Trigger ??script ordering verified live**:
  99: 1. `auth.admin.createUser` ??auth.users INSERT
 100: 2. `handle_new_user` AFTER INSERT ??profile inserted role='client', handle='c_<md5>'
 101: 3. Script's service-role upsert ??ON CONFLICT (id) UPDATE ??role='artist', handle='artist_demo_2d6a3f'
 102: 4. `validate_profile_role_transition` short-circuits at `auth.uid() IS NULL` (service-role context)
 103: 
 104: Login test instructions in `_artist_account_created.md`.
 105: 
 185:       confirm + `/auth/callback` ??`/ko/onboarding/workspace`,
 186:       open Supabase Dashboard ??`public.profiles` and confirm a
 187:       row was auto-created (handle `c_<md5>`, role='client',
 188:       display_name=email-local-part).
 189: - [ ] Sign in at `/ko/signin` with `artist@yagiworkshop.xyz` /
 190:       `yagiworkshop12#$`. Should land on `/ko/onboarding/workspace`
 191:       (artist account has no workspace_members row; Phase 5 entry
 192:       will introduce a non-workspace landing surface). Sidebar
 193:       user-menu badge should read "Artist".
 194: - [ ] No `creator` / `studio` profile rows visible anywhere in the
 195:       app surfaces.
 196: - [ ] All Wave C.5b sub_03..12 surfaces still render correctly on
 197:       the post-rollback light editorial canvas (this is a
 198:       regression check; nothing changed there in amendments).
 199: 
 200: ---
 201: 
 202: ## Followups status snapshot
 203: 
 204: | ID | Status |
 205: |---|---|
 206: | FU-C5b-01 (Phase 5 Artist Roster intake) | open ??demo account exists but curated intake flow is Phase 5 |
 207: | FU-C5b-02 (Supabase Dashboard email template paste) | open ??yagi action |

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -C 2 \"profiles\\.role|creator\\|studio\\|observer\\|client|future "'`artist`|Artist Roster" .yagi-autobuild/ARCHITECTURE.md .yagi-autobuild/DECISIONS_CACHE.md .yagi-autobuild/phase-4-x -g '"'"'!*.txt'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 414ms:
.yagi-autobuild/ARCHITECTURE.md-504-The 3-persona model (Brand / Artist / YAGI Admin) introduced by the
.yagi-autobuild/ARCHITECTURE.md-505-PRODUCT-MASTER concept holds, but with **Brand only** wired to a
.yagi-autobuild/ARCHITECTURE.md:506:live UI through Phase 9. Artist Roster intake is curated yagi-direct
.yagi-autobuild/ARCHITECTURE.md-507-(Phase 5 entry, not self-registration). Independent creators are
.yagi-autobuild/ARCHITECTURE.md-508-permanently deferred.
--
.yagi-autobuild/ARCHITECTURE.md-520-  `src/components/app/sidebar-scope-switcher.tsx`
.yagi-autobuild/ARCHITECTURE.md-521-
.yagi-autobuild/ARCHITECTURE.md:522:The `profiles.role` enum still carries `creator|studio|observer|client`
.yagi-autobuild/ARCHITECTURE.md-523-for legacy DB rows. Code reads `client` (active) and will read
.yagi-autobuild/ARCHITECTURE.md-524-`artist` (Phase 5 entry, after enum extension migration). All other
--
.yagi-autobuild/DECISIONS_CACHE.md-42-
.yagi-autobuild/DECISIONS_CACHE.md-43-**Asked context:** Phase 2.5 G1 hardening v1 (H4)
.yagi-autobuild/DECISIONS_CACHE.md:44:**Question:** `profiles.role` 이 flip되면 (creator → studio) 기존 `creators` row는? Hard delete? Soft delete? 유지?
.yagi-autobuild/DECISIONS_CACHE.md:45:**Answer:** 유지 (soft-delete 개념). 근거: Showcase winner display / submission history attribution에 이 row가 참조됨. Hard delete면 historical attribution 깨짐. UPDATE는 role-match RLS로 차단 (stale row는 read-only 상태). G3/G6 read query는 profiles.role 기준으로 active persona만 필터.
.yagi-autobuild/DECISIONS_CACHE.md-46-**Applies when:** 다른 persona table (예: future translator, curator role) 도입 시 동일 패턴 — "persona retire ≠ persona row delete".
.yagi-autobuild/DECISIONS_CACHE.md-47-**Confidence:** HIGH
--
.yagi-autobuild/DECISIONS_CACHE.md-1030-   - 기존 `observer` profile: `/challenges` 로 redirect (legacy escape hatch).
.yagi-autobuild/DECISIONS_CACHE.md-1031-   - 새 가입자는 `creator` 또는 `client` 만 선택 가능.
.yagi-autobuild/DECISIONS_CACHE.md:1032:4. DB migration 안 함 — `profiles.role` text column 그대로, legacy 값 보존.
.yagi-autobuild/DECISIONS_CACHE.md-1033-5. Type narrow 는 Phase 3.0 진입 시 — 그 시점에 challenges surface 재구성과 함께 cleanup. 그때까지 challenges/sidebar/email template 등 기존 `studio`/`observer` 분기 코드 12개 파일 그대로 작동.
.yagi-autobuild/DECISIONS_CACHE.md-1034-
--
.yagi-autobuild/DECISIONS_CACHE.md-1049-**Answer:** Anonymous OTP 패턴:
.yagi-autobuild/DECISIONS_CACHE.md-1050-- 투표 시 이메일 입력 → 6자리 OTP 코드 링크 발송 → 투표
.yagi-autobuild/DECISIONS_CACHE.md:1051:- profile 생성 안 함, `profiles.role` 값 안 넘김
.yagi-autobuild/DECISIONS_CACHE.md-1052-- 대신 `contest_voters` 테이블 도입 예정 (Phase 3.0 SPEC 도입)
.yagi-autobuild/DECISIONS_CACHE.md-1053-  - 필수 컬럼: `email`, `verified_at`, `ip_hash` (rate limit)
--
.yagi-autobuild/DECISIONS_CACHE.md-1147-2. **Three actor_role classes** (resolved server-side, never trusted from client):
.yagi-autobuild/DECISIONS_CACHE.md-1148-   - `client` — workspace member who created the project. Resolved when `user_roles.role NOT IN ('yagi_admin','workspace_admin')`.
.yagi-autobuild/DECISIONS_CACHE.md:1149:   - `yagi_admin` / `workspace_admin` — admin classes; resolved from `user_roles` table (NOT `profiles.role` — that column does not exist).
.yagi-autobuild/DECISIONS_CACHE.md-1150-   - `system` — server-only role assigned by `submitProjectAction` via service-role client for the single auto-transition. Never assignable through the public RPC.
.yagi-autobuild/DECISIONS_CACHE.md-1151-
--
.yagi-autobuild/DECISIONS_CACHE.md-1205-**Answer:** Lock persona model A — **Brand only** (의뢰인 / `client` role)
.yagi-autobuild/DECISIONS_CACHE.md-1206-plus YAGI Admin (internal). Self-registration as creator/studio is
.yagi-autobuild/DECISIONS_CACHE.md:1207:permanently retired from this codebase. Artist Roster intake (셀럽 /
.yagi-autobuild/DECISIONS_CACHE.md-1208-엔터에이전시) is moved to Phase 5 entry as a curated yagi-direct flow,
.yagi-autobuild/DECISIONS_CACHE.md-1209-NOT a self-registration form. Independent creator self-registration is
--
.yagi-autobuild/DECISIONS_CACHE.md-1215-(layout + page + queries), email templates `signup-welcome.ts` and
.yagi-autobuild/DECISIONS_CACHE.md-1216-`role-confirmation.ts`, and narrowed `lib/app/scopes.ts` Scope union to
.yagi-autobuild/DECISIONS_CACHE.md:1217:{workspace, admin}. The `profiles.role` enum still carries
.yagi-autobuild/DECISIONS_CACHE.md:1218:`creator|studio|observer|client` for legacy DB rows; only `client` (and
.yagi-autobuild/DECISIONS_CACHE.md-1219-the future `artist` value to be added in Phase 5) is wired to a live UI
.yagi-autobuild/DECISIONS_CACHE.md-1220-in current code.
.yagi-autobuild/DECISIONS_CACHE.md-1221-
.yagi-autobuild/DECISIONS_CACHE.md-1222-**Applies when:** Any future request to "let creators sign up" or
.yagi-autobuild/DECISIONS_CACHE.md:1223:"add a creator portal." Default answer: Phase 4-9 = no. Artist Roster
.yagi-autobuild/DECISIONS_CACHE.md-1224-work belongs to Phase 5 with a curated yagi-admin-issued invite-token
.yagi-autobuild/DECISIONS_CACHE.md-1225-flow, not a self-registration form. Independent creator self-service
--
.yagi-autobuild/phase-4-x\KICKOFF.md-347-- workspaces.kind 'brand' backfill 의 cross-tenant 영향 없음 검증 (kind 는 ux discriminator, RLS namespace 아님)
.yagi-autobuild/phase-4-x\KICKOFF.md-348-- projects.kind enum 확장이 기존 RLS 와 호환 (RLS 는 kind 값 사용 안 함; transition_project_status RPC 무영향)
.yagi-autobuild/phase-4-x\KICKOFF.md:349:- project_licenses RLS — auth.uid() 와 profiles.role check 정확 (auth.jwt 의 role claim 형식 가정 확인)
.yagi-autobuild/phase-4-x\KICKOFF.md-350-- project_licenses INSERT 가 yagi_admin only — Phase 4 에서 client 노출 0
.yagi-autobuild/phase-4-x\KICKOFF.md-351-- ON DELETE CASCADE: project 삭제 시 license 삭제 의도? (Phase 6 검토 필요 — 일단 CASCADE 유지하되 Q-108 deferred)
--
.yagi-autobuild/phase-4-x\KICKOFF.md-725-
.yagi-autobuild/phase-4-x\KICKOFF.md-726-**Self-review focus**:
.yagi-autobuild/phase-4-x\KICKOFF.md:727:- /app/admin/* routes 의 yagi_admin role gating (auth.uid() + profiles.role check)
.yagi-autobuild/phase-4-x\KICKOFF.md-728-- License surface 가 client 에게 leak 안 됨 (Phase 4 에서 surface 자체 없음)
.yagi-autobuild/phase-4-x\KICKOFF.md-729-
--
.yagi-autobuild/phase-4-x\result_01.md-15-## Dependencies verified
.yagi-autobuild/phase-4-x\result_01.md-16-
.yagi-autobuild/phase-4-x\result_01.md:17:- **profiles.role column**: EXISTS -- confirmed in database.types.ts line 1170 (`role: string | null`)
.yagi-autobuild/phase-4-x\result_01.md-18-- **update_updated_at_column() function (public schema)**: DOES NOT EXIST in public schema. The public equivalent used across this codebase is `public.tg_touch_updated_at()` (defined in baseline at line 304). KICKOFF spec references `update_updated_at_column()` but this is a spec error -- the migration file uses `public.tg_touch_updated_at()` instead. This deviation is intentional and safe; noted here for Codex K-05 review.
.yagi-autobuild/phase-4-x\result_01.md-19-- **projects.kind column existence**: EXISTS -- confirmed in database.types.ts line 1722 (`kind: string`). DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT is safe.
--
.yagi-autobuild/phase-4-x\result_01.md-24-- DROP CONSTRAINT IF EXISTS is idempotent: no error if constraint absent.
.yagi-autobuild/phase-4-x\result_01.md-25-- idx_workspaces_kind, idx_project_licenses_project, idx_project_licenses_status -- no name conflicts with existing migrations (grepped all .sql files).
.yagi-autobuild/phase-4-x\result_01.md:26:- profiles.role = 'yagi_admin' check in RLS policies aligns with is_yagi_admin helper pattern used in prior migrations.
.yagi-autobuild/phase-4-x\result_01.md-27-- NOT NULL DEFAULT columns (kind, twin_intent) on ALTER TABLE backfill all existing rows automatically; explicit UPDATE on workspaces.kind is a no-op after ADD COLUMN but matches KICKOFF spec exactly.
.yagi-autobuild/phase-4-x\result_01.md-28-
--
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-686-supabase/migrations\20260422120000_phase_2_0_baseline.sql:4447:CREATE POLICY user_roles_self_insert_ws_admin ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-687-supabase/migrations\20260422120000_phase_2_0_baseline.sql:4521:CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:688:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:24:--       and orphan showcase winner display. profiles.role flip is the canonical
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-689-supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:44:--       `ADD CONSTRAINT profiles_handle_key UNIQUE (handle)` block was
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-690-supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:58:-- Convert handle to citext. Pre-existing UNIQUE index `profiles_handle_key`
--
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-694-supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:73:ALTER TABLE public.profiles
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-695-supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:74:  ADD CONSTRAINT profiles_bio_length_check
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:696:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:105:-- Observer: no child table. profiles.role='observer' alone signals the role.
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:697:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:224:-- Note: no DELETE policy. Soft-delete via profiles.role change (set to NULL
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:698:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:233:-- their `profiles.role`. Prevents role=studio users from inserting a
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:699:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:248:-- Note: no DELETE policy. Soft-delete via profiles.role change (set to NULL
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:700:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:257:-- their `profiles.role`. Prevents role=creator users from inserting a
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:701:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:22:--        queries in G3/G6 must join profiles.role to surface only active
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:702:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:211:-- role-match policies. G3/G6 read queries must join profiles.role to
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-703-supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:216:CREATE OR REPLACE FUNCTION public.tg_profiles_role_flip_cleanup()
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:704:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:229:-- current profiles.role.
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:705:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:232:  'read queries must filter by current profiles.role.';
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:706:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:236:  'queries must filter by current profiles.role.';
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-707-supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:10:--   N-L2 (LOW) — tg_profiles_role_flip_cleanup scaffold body was RETURN NEW
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-708-supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:23:--   §3 — tg_profiles_role_flip_cleanup scaffold body changed from RETURN NEW
--
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-711-supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:136:  RAISE EXCEPTION 'tg_profiles_role_flip_cleanup scaffold — implement policy body before attaching trigger'
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-712-supabase/migrations\20260424000001_phase_2_5_g2_handle_history_hardening.sql:22:--            callers remain granted (all onboarding/profile/<role> pages are
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:713:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:11:--   1. profiles.role enum extension ('client')
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-714-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:22:-- 1. profiles role enum — add 'client'
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-715-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:26:-- (auto-named profiles_role_check). Drop+recreate keeps the NULL-allowed
--
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-717-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:29:ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-718-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:719:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:54:  'Phase 2.7 — company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-720-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:176:-- profiles/auth.users deletion only. Manual delete via DB role for support cases.
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:721:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:191:-- INSERT: only the client themselves, and only after their profiles.role is
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-722-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:195:-- validate_profile_role_transition trigger (§9) which prevents self-flipping
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:723:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:196:-- profiles.role to 'client' from any prior non-null role.
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:724:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:307:-- 6b. profiles.role transition guard (K05-001 Finding 1, HIGH-A)
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-725-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:311:-- self-UPDATE their profile, including the `role` column. Without this
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-726-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:313:--   1. UPDATE profiles SET role = 'client'
--
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-836-supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:533:  -- Allow if the SECURITY DEFINER RPC set the session flag
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-837-supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:586:-- INSERT: deny all direct inserts — only SECURITY DEFINER RPC may insert
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:838:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:11:--   1. profiles.role enum extension ('client')
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-839-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:22:-- 1. profiles role enum — add 'client'
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-840-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:841:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:54:  'Phase 2.7 — company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-842-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:157:      WHERE p.id = (select auth.uid()) AND p.role = 'client'
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-843-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:195:-- validate_profile_role_transition trigger (§9) which prevents self-flipping
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:844:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:196:-- profiles.role to 'client' from any prior non-null role.
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-845-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:206:      WHERE p.id = (select auth.uid()) AND p.role = 'client'
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-846-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:249:SECURITY DEFINER
--
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-1037-.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:724:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:44:--       `ADD CONSTRAINT profiles_handle_key UNIQUE (handle)` block was
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-1038-.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:725:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:58:-- Convert handle to citext. Pre-existing UNIQUE index `profiles_handle_key`
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:1039:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:748:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:11:--   1. profiles.role enum extension ('client')
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-1040-.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:749:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:22:-- 1. profiles role enum — add 'client'
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-1041-.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:753:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:1042:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:754:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:54:  'Phase 2.7 — company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-1043-.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:757:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:195:-- validate_profile_role_transition trigger (§9) which prevents self-flipping
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:1044:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:758:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:196:-- profiles.role to 'client' from any prior non-null role.
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-1045-.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:761:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:313:--   1. UPDATE profiles SET role = 'client'
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-1046-.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:762:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:322:CREATE OR REPLACE FUNCTION public.validate_profile_role_transition()
--
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-1067-.yagi-autobuild/phase-4-x\_artist_account_created.md:34:[artist-account] created user_id=2d6a3f6f-cd69-4425-93b6-bebd9f4cf434 role=artist
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-1068-.yagi-autobuild/phase-4-x\_artist_account_created.md:44:| auth.users.raw_user_meta_data.display_name | `Artist Demo` |
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:1069:.yagi-autobuild/phase-4-x\_artist_account_created.md:47:| profiles.role | `artist` |
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-1070-.yagi-autobuild/phase-4-x\_artist_account_created.md:52:This account exercises the `handle_new_user` (amend_01) ↔ sub_13
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-1071-.yagi-autobuild/phase-4-x\_artist_account_created.md:57:2. `handle_new_user` AFTER INSERT trigger fires → profile row
--
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-1113-.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:165:- `feat(phase-4-x): wave-c5b amend_02a — widen profiles_role_check to include 'artist'`
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-1114-.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:175:- yonsei (UUID 73be213d-1306-42f1-bee4-7b77175a6e79) role='client'
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:1115:.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:528:**먼저 profiles.role enum 에 'artist' 가 있는지 확인 필수**:
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-1116-.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:566:    .update({ role: 'artist' })
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:1117:.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:581:- profiles.role = 'artist' (또는 enum 미정 시 야기 보고)
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-1118-.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:16:| 01 | Profile auto-create DB trigger | `5105033` | ✅ migration applied; SECURITY DEFINER + search_path locked; Test 1 (synthetic INSERT) + Test 3 (existing rows preserved) PASS; advisor 0 new |
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-1119-.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:17:| 02a | profiles_role_check widened to include 'artist' | `e0400d4` | ✅ migration applied; constraint includes 'artist'; ProfileRole TS type extended; sidebar switch case added |
--
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-1165-  15: -- a safe default.
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-1166-  16: --
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:1167:  17: -- Phase 5 entry will introduce the Artist Roster intake surface; this
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-1168-  18: -- migration unblocks the demo account ahead of that surface design and
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md-1169-  19: -- does NOT lock-in any artist-specific RLS / RPC shape.
--
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-890-supabase/migrations\20260422120000_phase_2_0_baseline.sql:4447:CREATE POLICY user_roles_self_insert_ws_admin ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-891-supabase/migrations\20260422120000_phase_2_0_baseline.sql:4521:CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:892:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:24:--       and orphan showcase winner display. profiles.role flip is the canonical
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-893-supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:44:--       `ADD CONSTRAINT profiles_handle_key UNIQUE (handle)` block was
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-894-supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:58:-- Convert handle to citext. Pre-existing UNIQUE index `profiles_handle_key`
--
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-898-supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:73:ALTER TABLE public.profiles
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-899-supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:74:  ADD CONSTRAINT profiles_bio_length_check
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:900:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:105:-- Observer: no child table. profiles.role='observer' alone signals the role.
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:901:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:224:-- Note: no DELETE policy. Soft-delete via profiles.role change (set to NULL
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:902:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:233:-- their `profiles.role`. Prevents role=studio users from inserting a
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:903:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:248:-- Note: no DELETE policy. Soft-delete via profiles.role change (set to NULL
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:904:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:257:-- their `profiles.role`. Prevents role=creator users from inserting a
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:905:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:22:--        queries in G3/G6 must join profiles.role to surface only active
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:906:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:211:-- role-match policies. G3/G6 read queries must join profiles.role to
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-907-supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:216:CREATE OR REPLACE FUNCTION public.tg_profiles_role_flip_cleanup()
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:908:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:229:-- current profiles.role.
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:909:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:232:  'read queries must filter by current profiles.role.';
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:910:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:236:  'queries must filter by current profiles.role.';
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-911-supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:10:--   N-L2 (LOW) ??tg_profiles_role_flip_cleanup scaffold body was RETURN NEW
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-912-supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:23:--   짠3 ??tg_profiles_role_flip_cleanup scaffold body changed from RETURN NEW
--
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-915-supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:136:  RAISE EXCEPTION 'tg_profiles_role_flip_cleanup scaffold ??implement policy body before attaching trigger'
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-916-supabase/migrations\20260424000001_phase_2_5_g2_handle_history_hardening.sql:22:--            callers remain granted (all onboarding/profile/<role> pages are
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:917:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:11:--   1. profiles.role enum extension ('client')
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-918-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:22:-- 1. profiles role enum ??add 'client'
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-919-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:26:-- (auto-named profiles_role_check). Drop+recreate keeps the NULL-allowed
--
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-921-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:29:ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-922-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:923:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:54:  'Phase 2.7 ??company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-924-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:176:-- profiles/auth.users deletion only. Manual delete via DB role for support cases.
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:925:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:191:-- INSERT: only the client themselves, and only after their profiles.role is
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-926-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:195:-- validate_profile_role_transition trigger (짠9) which prevents self-flipping
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:927:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:196:-- profiles.role to 'client' from any prior non-null role.
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:928:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:307:-- 6b. profiles.role transition guard (K05-001 Finding 1, HIGH-A)
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-929-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:311:-- self-UPDATE their profile, including the `role` column. Without this
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-930-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:313:--   1. UPDATE profiles SET role = 'client'
--
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1040-supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:533:  -- Allow if the SECURITY DEFINER RPC set the session flag
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1041-supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:586:-- INSERT: deny all direct inserts ??only SECURITY DEFINER RPC may insert
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:1042:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:11:--   1. profiles.role enum extension ('client')
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1043-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:22:-- 1. profiles role enum ??add 'client'
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1044-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:1045:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:54:  'Phase 2.7 ??company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1046-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:157:      WHERE p.id = (select auth.uid()) AND p.role = 'client'
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1047-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:195:-- validate_profile_role_transition trigger (짠9) which prevents self-flipping
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:1048:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:196:-- profiles.role to 'client' from any prior non-null role.
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1049-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:206:      WHERE p.id = (select auth.uid()) AND p.role = 'client'
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1050-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:249:SECURITY DEFINER
--
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1241-.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:724:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:44:--       `ADD CONSTRAINT profiles_handle_key UNIQUE (handle)` block was
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1242-.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:725:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:58:-- Convert handle to citext. Pre-existing UNIQUE index `profiles_handle_key`
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:1243:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:748:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:11:--   1. profiles.role enum extension ('client')
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1244-.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:749:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:22:-- 1. profiles role enum ??add 'client'
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1245-.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:753:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:1246:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:754:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:54:  'Phase 2.7 ??company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1247-.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:757:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:195:-- validate_profile_role_transition trigger (짠9) which prevents self-flipping
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:1248:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:758:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:196:-- profiles.role to 'client' from any prior non-null role.
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1249-.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:761:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:313:--   1. UPDATE profiles SET role = 'client'
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1250-.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:762:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:322:CREATE OR REPLACE FUNCTION public.validate_profile_role_transition()
--
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1271-.yagi-autobuild/phase-4-x\_artist_account_created.md:34:[artist-account] created user_id=2d6a3f6f-cd69-4425-93b6-bebd9f4cf434 role=artist
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1272-.yagi-autobuild/phase-4-x\_artist_account_created.md:44:| auth.users.raw_user_meta_data.display_name | `Artist Demo` |
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:1273:.yagi-autobuild/phase-4-x\_artist_account_created.md:47:| profiles.role | `artist` |
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1274-.yagi-autobuild/phase-4-x\_artist_account_created.md:52:This account exercises the `handle_new_user` (amend_01) ??sub_13
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1275-.yagi-autobuild/phase-4-x\_artist_account_created.md:57:2. `handle_new_user` AFTER INSERT trigger fires ??profile row
--
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1316-.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:165:- `feat(phase-4-x): wave-c5b amend_02a ??widen profiles_role_check to include 'artist'`
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1317-.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:175:- yonsei (UUID 73be213d-1306-42f1-bee4-7b77175a6e79) role='client'
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:1318:.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:528:**癒쇱? profiles.role enum ??'artist' 媛 ?덈뒗吏 ?뺤씤 ?꾩닔**:
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1319-.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:566:    .update({ role: 'artist' })
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:1320:.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:581:- profiles.role = 'artist' (?먮뒗 enum 誘몄젙 ???쇨린 蹂닿퀬)
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1321-.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:16:| 01 | Profile auto-create DB trigger | `5105033` | ??migration applied; SECURITY DEFINER + search_path locked; Test 1 (synthetic INSERT) + Test 3 (existing rows preserved) PASS; advisor 0 new |
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1322-.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:17:| 02a | profiles_role_check widened to include 'artist' | `e0400d4` | ??migration applied; constraint includes 'artist'; ProfileRole TS type extended; sidebar switch case added |
--
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1368-  15: -- a safe default.
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1369-  16: --
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md:1370:  17: -- Phase 5 entry will introduce the Artist Roster intake surface; this
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1371-  18: -- migration unblocks the demo account ahead of that surface design and
.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_2.md-1372-  19: -- does NOT lock-in any artist-specific RLS / RPC shape.
--
.yagi-autobuild/phase-4-x\_amend02_self_review.md-15-  ... CHECK ((role IS NULL) OR (role = ANY (ARRAY['creator','studio',
.yagi-autobuild/phase-4-x\_amend02_self_review.md-16-  'observer','client','artist'])))`.
.yagi-autobuild/phase-4-x\_amend02_self_review.md:17:- **Question**: do all existing `profiles.role` values pass the new
.yagi-autobuild/phase-4-x\_amend02_self_review.md-18-  constraint? Are we silently invalidating any row?
.yagi-autobuild/phase-4-x\_amend02_self_review.md-19-- **Live audit (2026-05-01)**:
--
.yagi-autobuild/phase-4-x\_amend02_self_review.md-95-- **Question**: does runtime now produce values outside this type
.yagi-autobuild/phase-4-x\_amend02_self_review.md-96-  (artist account row served as part of AppContext)?
.yagi-autobuild/phase-4-x\_amend02_self_review.md:97:- **Verdict**: YES. After widening + bootstrap, `profiles.role` can
.yagi-autobuild/phase-4-x\_amend02_self_review.md-98-  be `'artist'` for the demo account row. The TypeScript type must
.yagi-autobuild/phase-4-x\_amend02_self_review.md-99-  include 'artist' or any code casting it (`profile.role as ProfileRole`)
--
.yagi-autobuild/phase-4-x\_amend02_self_review.md-108-### F7 — Phase 5 entry artist work — does this lock-in?
.yagi-autobuild/phase-4-x\_amend02_self_review.md-109-
.yagi-autobuild/phase-4-x\_amend02_self_review.md:110:- **Question**: Phase 5 will introduce Artist Roster intake. Will the
.yagi-autobuild/phase-4-x\_amend02_self_review.md-111-  enum already including 'artist' cause Phase 5's migration to be
.yagi-autobuild/phase-4-x\_amend02_self_review.md-112-  no-op or silently stale?
--
.yagi-autobuild/phase-4-x\_amend02_self_review.md-127-
.yagi-autobuild/phase-4-x\_amend02_self_review.md-128-- **Surface**: helper functions check `user_roles` table, not
.yagi-autobuild/phase-4-x\_amend02_self_review.md:129:  `profiles.role`. They are independent of this CHECK constraint.
.yagi-autobuild/phase-4-x\_amend02_self_review.md-130-- **Verdict**: no interaction.
.yagi-autobuild/phase-4-x\_amend02_self_review.md-131-- **Severity**: none.
--
.yagi-autobuild/phase-4-x\_amend02_self_review.md-149-  classification system (`is_valid_transition`'s actor_role:
.yagi-autobuild/phase-4-x\_amend02_self_review.md-150-  client/yagi_admin/workspace_admin/system) which routes through
.yagi-autobuild/phase-4-x\_amend02_self_review.md:151:  `user_roles` table, NOT `profiles.role`.
.yagi-autobuild/phase-4-x\_amend02_self_review.md-152-- **Verdict**: no role-string consumer in server-side code paths
.yagi-autobuild/phase-4-x\_amend02_self_review.md-153-  treats the enum as closed-world. Adding 'artist' is graceful.
--
.yagi-autobuild/phase-4-x\_artist_account_created.md-13-- role: `artist` (PRODUCT-MASTER §4 / DECISIONS Q-094 persona model)
.yagi-autobuild/phase-4-x\_artist_account_created.md-14-- purpose: test/demo account for yagi visual review ahead of the
.yagi-autobuild/phase-4-x\_artist_account_created.md:15:  Phase 5 Artist Roster intake surface design
.yagi-autobuild/phase-4-x\_artist_account_created.md-16-
.yagi-autobuild/phase-4-x\_artist_account_created.md-17-## Pre-flight (after amend_02)
--
.yagi-autobuild/phase-4-x\_artist_account_created.md-45-| profiles.handle | `artist_demo_2d6a3f` |
.yagi-autobuild/phase-4-x\_artist_account_created.md-46-| profiles.display_name | `Artist Demo` |
.yagi-autobuild/phase-4-x\_artist_account_created.md:47:| profiles.role | `artist` |
.yagi-autobuild/phase-4-x\_artist_account_created.md-48-| profiles.locale | `ko` |
.yagi-autobuild/phase-4-x\_artist_account_created.md-49-
--
.yagi-autobuild/phase-4-x\_artist_account_created.md-92-## Followups
.yagi-autobuild/phase-4-x\_artist_account_created.md-93-
.yagi-autobuild/phase-4-x\_artist_account_created.md:94:- FU-C5b-01 (Phase 5 Artist Roster intake surface) remains open. The
.yagi-autobuild/phase-4-x\_artist_account_created.md-95-  demo account now exists for visual review but the curated intake
.yagi-autobuild/phase-4-x\_artist_account_created.md-96-  flow it stands in for is still a Phase 5 deliverable.
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-31-
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-32-FOCUS AREAS (each must be a separate finding with explicit verdict):
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:33:A. Additive only — verify all existing profiles.role values pass the new CHECK; verify no row was silently invalidated.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-34-B. RLS / policy implicit dependence on the enum closed-world (creators_update_self, studios_update_self, anything else).
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-35-C. validate_profile_role_transition interaction — does the artist UPSERT exercise an edge that the function doesn't anticipate?
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-37-E. TypeScript ProfileRole type drift now resolved — does the extension cause any consumer to lose exhaustiveness inference (switch with no default that previously was exhaustive)?
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-38-F. Phase 5 entry artist work — does pulling the enum widening forward leave any Phase 5 migration stale or expecting a CHECK that no longer matches?
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:39:G. is_yagi_admin / is_ws_admin / role_switched_at handling — independent of profiles.role enum but verify.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-40-H. Constraint replace atomicity (DROP + ADD).
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-41-I. Server actions / RPC role checks — do any treat the role list as closed?
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-88--- a safe default.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-89---
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:90:-- Phase 5 entry will introduce the Artist Roster intake surface; this
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-91--- migration unblocks the demo account ahead of that surface design and
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-92--- does NOT lock-in any artist-specific RLS / RPC shape.
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-552-  ... CHECK ((role IS NULL) OR (role = ANY (ARRAY['creator','studio',
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-553-  'observer','client','artist'])))`.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:554:- **Question**: do all existing `profiles.role` values pass the new
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-555-  constraint? Are we silently invalidating any row?
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-556-- **Live audit (2026-05-01)**:
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-632-- **Question**: does runtime now produce values outside this type
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-633-  (artist account row served as part of AppContext)?
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:634:- **Verdict**: YES. After widening + bootstrap, `profiles.role` can
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-635-  be `'artist'` for the demo account row. The TypeScript type must
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-636-  include 'artist' or any code casting it (`profile.role as ProfileRole`)
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-645-### F7 ??Phase 5 entry artist work ??does this lock-in?
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-646-
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:647:- **Question**: Phase 5 will introduce Artist Roster intake. Will the
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-648-  enum already including 'artist' cause Phase 5's migration to be
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-649-  no-op or silently stale?
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-664-
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-665-- **Surface**: helper functions check `user_roles` table, not
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:666:  `profiles.role`. They are independent of this CHECK constraint.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-667-- **Verdict**: no interaction.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-668-- **Severity**: none.
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-686-  classification system (`is_valid_transition`'s actor_role:
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-687-  client/yagi_admin/workspace_admin/system) which routes through
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:688:  `user_roles` table, NOT `profiles.role`.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-689-- **Verdict**: no role-string consumer in server-side code paths
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-690-  treats the enum as closed-world. Adding 'artist' is graceful.
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-717-"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"case \\\"creator\\\"|case 'creator'|switch \\(["'^'"\\n]*role|ProfileRole|z\\.enum\\(|enum\\(.*role|roleSchema|role.*zod|\\\"creator\\\"\\s*,\\s*\\\"studio\\\"|creator\\|studio|creator.*studio.*observer.*client|client.*observer\" src scripts supabase -g '"'!node_modules'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-718-exec
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:719:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"artist|profiles_role_check|Phase 5|Artist Roster|FU-C5b-01|curated Artist\" supabase/migrations docs .yagi-autobuild scripts src -g '"'!node_modules'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-720-exec
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-721-"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg --files supabase src scripts .yagi-autobuild docs | rg "(migration|schema|policy|rls|action|rpc|context|sidebar|layout|create-artist|phase-5|phase_5|Phase 5)"' in C:\Users\yout4\yagi-studio\yagi-workshop
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-870-
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-871- succeeded in 1461ms:
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:872:.yagi-autobuild\ARCHITECTURE.md:506:live UI through Phase 9. Artist Roster intake is curated yagi-direct
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-873-.yagi-autobuild\ARCHITECTURE.md:507:(Phase 5 entry, not self-registration). Independent creators are
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-874-.yagi-autobuild\ARCHITECTURE.md:524:`artist` (Phase 5 entry, after enum extension migration). All other
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-898-supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:6:-- (post-sub_00 ROLLBACK) needs the artist demo account live for review,
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-899-supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:7:-- which requires this enum widening — originally deferred to Phase 5
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:900:supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:17:-- Phase 5 entry will introduce the Artist Roster intake surface; this
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-901-supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:19:-- does NOT lock-in any artist-specific RLS / RPC shape.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-902-supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:22:  DROP CONSTRAINT IF EXISTS profiles_role_check;
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-931-.yagi-autobuild\phase-4-x\_wave_c5b_result.md:160:service-role) and committed `_artist_account_created.md` with the
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-932-.yagi-autobuild\phase-4-x\_wave_c5b_result.md:161:path-to-unblock checklist (Phase 5 entry CHECK-widening migration
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:933:.yagi-autobuild\phase-4-x\_wave_c5b_result.md:168:- **FU-C5b-01** — Phase 5 Artist Roster intake surface (curated, not
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-934-.yagi-autobuild\phase-4-x\_wave_c5b_result.md:169:  self-register). Trigger: Phase 5 entry.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-935-.yagi-autobuild\phase-4-x\_wave_c5b_result.md:239:Email flow (when artist@yagiworkshop.xyz can be created or another
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-952-.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:189:- [ ] Sign in at `/ko/signin` with `artist@yagiworkshop.xyz` /
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-953-.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:191:      (artist account has no workspace_members row; Phase 5 entry
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:954:.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:206:| FU-C5b-01 (Phase 5 Artist Roster intake) | open — demo account exists but curated intake flow is Phase 5 |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-955-.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:213:| FU-C5b-08 (brand onboarding step rework) | open — Phase 4.x hotfix-1 or Phase 5 |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-956-.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:224:2. Sign in as `artist@yagiworkshop.xyz` to confirm the demo flow.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-957-.yagi-autobuild\phase-4-x\_wave_a_result.md:87:Wave B 의 detail page authorization will use `created_by` (BLOCKER 1 consistency). Status timeline 5 stages will map to: 검토 (`in_review`/`draft`) → 라우팅 (`routing`) → 진행 (`in_progress`) → 시안 (`approval_pending`, Phase 5+ inactive slot) → 납품 (`delivered`).
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:958:.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:145:- "크리에이터/스튜디오" = Phase 2.x 잔재. Artist Roster 영입은 *야기 직접* (Phase 5+).
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:959:.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:153:6. `_followups.md` 에 기록: "Phase 5 entry 시 Artist Roster 영입 surface 새 설계"
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-960-.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:416:- Phase 5+ 재설계 가능 상태
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:961:.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:465:- Artist Roster 영입 = **Phase 5 entry 에서 새 설계** (셀럽/엔터에이전시 — 야기 직접 영입)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-962-.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:518:### sub_13 — Artist 계정 manual 생성 (artist@yagiworkshop.xyz)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-963-.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:521:- Email: `artist@yagiworkshop.xyz`
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-964-.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:523:- Role: `artist` (PRODUCT-MASTER §4)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:965:.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:524:- Test/demo 계정 (Phase 5 entry 의 Artist Roster 영입 surface 도입 전 manual 생성)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:966:.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:528:**먼저 profiles.role enum 에 'artist' 가 있는지 확인 필수**:
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-967-.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:541:'artist' 가 없으면 야기에게 chat 보고 (Phase 5 의 Artist workspace 작업 의존성).
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-968-.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:543:**계정 생성** — `scripts/create-artist-account.ts` (NEW):
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-971-.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:577:실행: `npx tsx scripts/create-artist-account.ts`
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-972-.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:580:- artist@yagiworkshop.xyz 생성 + email_confirmed
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:973:.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:581:- profiles.role = 'artist' (또는 enum 미정 시 야기 보고)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-974-.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:583:- `_artist_account_created.md` 작성 (user_id + verify SQL)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-975-.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:586:- `scripts/create-artist-account.ts` (NEW)
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-979-.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:648:2. **artist@yagiworkshop.xyz 로그인** → workspace 없는 상태 동작 review (Phase 5 entry signal)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-980-.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:677:- `_artist_account_created.md`
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:981:.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:681:- `_followups.md` (Supabase Dashboard manual sync, Phase 5 Artist Roster 영입, Phase 7+ brand logo 교체 등)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-982-.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:19:   - amend_02: artist enum widening + sub_13 script 실행
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-983-.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:24:4. **Meeting type/duration UX 변경 = NOT in scope** — `_followups.md` 의 FU-C5b-09 로 등록만. Phase 4.x hotfix-1 또는 Phase 5 entry 에서 처리.
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1005-.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:216:-- Phase 4.x Wave C.5b amend_02 — widen profiles_role_check to include 'artist'
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1006-.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:219:-- includes 'artist' as first-class persona. Demo account creation
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1007:.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:222:-- Phase 5 entry will introduce Artist Roster intake surface; this
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1008-.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:226:  DROP CONSTRAINT IF EXISTS profiles_role_check;
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1009-.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:229:  ADD CONSTRAINT profiles_role_check CHECK (
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1030-.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:389:## FU-C5b-08 — Brand onboarding step model 재검토 (Phase 4.x hotfix-1 또는 Phase 5 entry)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1031-.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:396:  Phase 4.x ff-merge 후 hotfix-1 또는 Phase 5 entry 에서 IA 정리와 함께 처리
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1032:.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:413:Phase 4.x ff-merge 후 hotfix-1 또는 Phase 5 entry (Artist Roster 와 함께 IA 정리)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1033-.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:438:- amend_02 의 enum widening + artist 계정 생성 결과
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1034-.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:472:- `_artist_account_created.md` (UPDATE — HALTED → CREATED)
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1040-.yagi-autobuild\phase-4-x\_run.log:80:2026-05-01T10:30Z amend_02b artist_demo_account_created user_id=2d6a3f6f-cd69-4425-93b6-bebd9f4cf434 role=artist email_confirmed=true
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1041-.yagi-autobuild\phase-4-x\_run.log:81:2026-05-01T10:30Z amend_03 yonsei_reclassify creator_to_client rows_updated=1 final_distribution_artist=1_client=2_null=1_creator=0_studio=0
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1042:.yagi-autobuild\phase-4-x\_followups.md:6:## FU-C5b-01 — Phase 5 Artist Roster intake surface
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1043-.yagi-autobuild\phase-4-x\_followups.md:8:- **Trigger**: Phase 5 entry (셀럽/엔터에이전시 영입 시작).
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1044-.yagi-autobuild\phase-4-x\_followups.md:10:  manually created via `scripts/create-artist-account.ts` (sub_13).
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1045:.yagi-autobuild\phase-4-x\_followups.md:14:  Artist Roster is curated, not self-served. Likely a yagi-admin tool
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1046-.yagi-autobuild\phase-4-x\_followups.md:54:- **Trigger**: Phase 5+ if yagi changes the canvas-color verdict (e.g.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1047-.yagi-autobuild\phase-4-x\_followups.md:118:- **Trigger**: Phase 4.x ff-merge → hotfix-1, OR Phase 5 entry (when
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1048:.yagi-autobuild\phase-4-x\_followups.md:119:  the IA is being re-laid out for Artist Roster anyway).
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1049-.yagi-autobuild\phase-4-x\_decisions_locked.md:23:- URL prefix `/app/w/[workspaceId]/*` 패턴은 Phase 5 또는 6 에서 도입 (현 시점 layout 변경 최소화)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1050-.yagi-autobuild\phase-4-x\_decisions_locked.md:28:**LOCKED = B (Disabled placeholder "Phase 5 부터 가능")**
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1063-.yagi-autobuild\phase-4-x\_artist_account_created.md:11:- email: `artist@yagiworkshop.xyz`
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1064-.yagi-autobuild\phase-4-x\_artist_account_created.md:13:- role: `artist` (PRODUCT-MASTER §4 / DECISIONS Q-094 persona model)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1065:.yagi-autobuild\phase-4-x\_artist_account_created.md:15:  Phase 5 Artist Roster intake surface design
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1066-.yagi-autobuild\phase-4-x\_artist_account_created.md:20:`profiles_role_check` constraint reads:
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1067-.yagi-autobuild\phase-4-x\_artist_account_created.md:24:       (role = ANY (ARRAY['creator','studio','observer','client','artist'])))
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1071-.yagi-autobuild\phase-4-x\_artist_account_created.md:42:| auth.users.email | `artist@yagiworkshop.xyz` |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1072-.yagi-autobuild\phase-4-x\_artist_account_created.md:45:| profiles.handle | `artist_demo_2d6a3f` |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1073:.yagi-autobuild\phase-4-x\_artist_account_created.md:47:| profiles.role | `artist` |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1074-.yagi-autobuild\phase-4-x\_artist_account_created.md:59:   `handle='c_<md5>'`, `display_name='artist'` (email local-part),
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1075-.yagi-autobuild\phase-4-x\_artist_account_created.md:63:   `'artist'`, `handle` to `'artist_demo_2d6a3f'`,
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1080-.yagi-autobuild\phase-4-x\_artist_account_created.md:82:introduce a curated Artist intake / workspace bootstrap path; for
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1081-.yagi-autobuild\phase-4-x\_artist_account_created.md:87:- `scripts/create-artist-account.ts` — unchanged from sub_13 commit.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1082:.yagi-autobuild\phase-4-x\_artist_account_created.md:94:- FU-C5b-01 (Phase 5 Artist Roster intake surface) remains open. The
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1083-.yagi-autobuild\phase-4-x\_artist_account_created.md:96:  flow it stands in for is still a Phase 5 deliverable.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1084-.yagi-autobuild\phase-4-x\_artist_account_created.md:100:  reachable until Phase 5 either grants the artist a workspace or
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1105-.yagi-autobuild\phase-4-x\_amend02_self_review.md:105:  type-safety regression). **Auto-fixable** by appending `| "artist"`
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1106-.yagi-autobuild\phase-4-x\_amend02_self_review.md:108:### F7 — Phase 5 entry artist work — does this lock-in?
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1107:.yagi-autobuild\phase-4-x\_amend02_self_review.md:110:- **Question**: Phase 5 will introduce Artist Roster intake. Will the
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1108-.yagi-autobuild\phase-4-x\_amend02_self_review.md:111:  enum already including 'artist' cause Phase 5's migration to be
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1109-.yagi-autobuild\phase-4-x\_amend02_self_review.md:113:- **Verdict**: NO. Phase 5 work will be:
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1130-.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:79:-- (post-sub_00 ROLLBACK) needs the artist demo account live for review,
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1131-.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:80:-- which requires this enum widening ??originally deferred to Phase 5
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1132:.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:90:-- Phase 5 entry will introduce the Artist Roster intake surface; this
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1133-.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:92:-- does NOT lock-in any artist-specific RLS / RPC shape.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1134-.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:95:  DROP CONSTRAINT IF EXISTS profiles_role_check;
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1177-.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:642:  type-safety regression). **Auto-fixable** by appending `| "artist"`
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1178-.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:645:### F7 ??Phase 5 entry artist work ??does this lock-in?
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1179:.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:647:- **Question**: Phase 5 will introduce Artist Roster intake. Will the
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1180-.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:648:  enum already including 'artist' cause Phase 5's migration to be
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1181-.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:650:- **Verdict**: NO. Phase 5 work will be:
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1189-.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:713:The initial files confirm the type and sidebar patch are present, and the app layout still only exempts `client` from the workspace requirement. Next I’m searching the SQL and application code for hard-coded role lists, trigger functions, policies, and Phase 5 assumptions.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1190-.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:715:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"profiles_role_check|validate_profile_role_transition|creators_update_self|studios_update_self|handle_new_user|is_yagi_admin|is_ws_admin|role_switched_at|role\\s*=\\s*ANY|ARRAY\\['creator'|creator.*studio.*observer.*client|observer.*client|role\\s+in|role IN|role='|role = '\" supabase src scripts .yagi-autobuild docs -g '"'!node_modules'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1191:.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:719:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"artist|profiles_role_check|Phase 5|Artist Roster|FU-C5b-01|curated Artist\" supabase/migrations docs .yagi-autobuild scripts src -g '"'!node_modules'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1192-.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:721:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg --files supabase src scripts .yagi-autobuild docs | rg "(migration|schema|policy|rls|action|rpc|context|sidebar|layout|create-artist|phase-5|phase_5|Phase 5)"' in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1193-.yagi-autobuild\phase-4-x\_amend02_codex_prompt.txt:6:  2. src/lib/app/context.ts (ProfileRole union extended with "artist")
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1253-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1271:.yagi-autobuild/phase-4-x\_artist_account_created.md:34:[artist-account] created user_id=2d6a3f6f-cd69-4425-93b6-bebd9f4cf434 role=artist
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1254-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1272:.yagi-autobuild/phase-4-x\_artist_account_created.md:44:| auth.users.raw_user_meta_data.display_name | `Artist Demo` |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1255:.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1273:.yagi-autobuild/phase-4-x\_artist_account_created.md:47:| profiles.role | `artist` |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1256-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1274:.yagi-autobuild/phase-4-x\_artist_account_created.md:52:This account exercises the `handle_new_user` (amend_01) ??sub_13
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1257-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1275:.yagi-autobuild/phase-4-x\_artist_account_created.md:57:2. `handle_new_user` AFTER INSERT trigger fires ??profile row
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1267-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1315:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:136:- ALTER profiles_role_check: 湲곗〈 ['creator', 'studio', 'observer', 'client'] + 'artist' 異붽?
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1268-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1316:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:165:- `feat(phase-4-x): wave-c5b amend_02a ??widen profiles_role_check to include 'artist'`
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1269:.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1318:.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:528:**癒쇱? profiles.role enum ??'artist' 媛 ?덈뒗吏 ?뺤씤 ?꾩닔**:
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1270-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1319:.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:566:    .update({ role: 'artist' })
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1271:.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1320:.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:581:- profiles.role = 'artist' (?먮뒗 enum 誘몄젙 ???쇨린 蹂닿퀬)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1272-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1322:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:17:| 02a | profiles_role_check widened to include 'artist' | `e0400d4` | ??migration applied; constraint includes 'artist'; ProfileRole TS type extended; sidebar switch case added |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1273-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1323:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:18:| 02b | artist demo account bootstrap (sub_13 unblocked) | `d1d5af1` | ??artist@yagiworkshop.xyz / role=artist / handle=artist_demo_2d6a3f / email_confirmed |
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1280-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1359:   6: -- (post-sub_00 ROLLBACK) needs the artist demo account live for review,
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1281-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1360:   7: -- which requires this enum widening ??originally deferred to Phase 5
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1282:.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1370:  17: -- Phase 5 entry will introduce the Artist Roster intake surface; this
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1283-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1372:  19: -- does NOT lock-in any artist-specific RLS / RPC shape.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1284-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1375:  22:   DROP CONSTRAINT IF EXISTS profiles_role_check;
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1337-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1067:.yagi-autobuild/phase-4-x\_artist_account_created.md:34:[artist-account] created user_id=2d6a3f6f-cd69-4425-93b6-bebd9f4cf434 role=artist
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1338-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1068:.yagi-autobuild/phase-4-x\_artist_account_created.md:44:| auth.users.raw_user_meta_data.display_name | `Artist Demo` |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1339:.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1069:.yagi-autobuild/phase-4-x\_artist_account_created.md:47:| profiles.role | `artist` |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1340-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1070:.yagi-autobuild/phase-4-x\_artist_account_created.md:52:This account exercises the `handle_new_user` (amend_01) ↔ sub_13
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1341-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1071:.yagi-autobuild/phase-4-x\_artist_account_created.md:57:2. `handle_new_user` AFTER INSERT trigger fires → profile row
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1351-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1112:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:136:- ALTER profiles_role_check: 기존 ['creator', 'studio', 'observer', 'client'] + 'artist' 추가
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1352-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1113:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:165:- `feat(phase-4-x): wave-c5b amend_02a — widen profiles_role_check to include 'artist'`
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1353:.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1115:.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:528:**먼저 profiles.role enum 에 'artist' 가 있는지 확인 필수**:
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1354-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1116:.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:566:    .update({ role: 'artist' })
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1355:.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1117:.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:581:- profiles.role = 'artist' (또는 enum 미정 시 야기 보고)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1356-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1119:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:17:| 02a | profiles_role_check widened to include 'artist' | `e0400d4` | ✅ migration applied; constraint includes 'artist'; ProfileRole TS type extended; sidebar switch case added |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1357-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1120:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:18:| 02b | artist demo account bootstrap (sub_13 unblocked) | `d1d5af1` | ✅ artist@yagiworkshop.xyz / role=artist / handle=artist_demo_2d6a3f / email_confirmed |
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1364-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1156:   6: -- (post-sub_00 ROLLBACK) needs the artist demo account live for review,
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1365-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1157:   7: -- which requires this enum widening ??originally deferred to Phase 5
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1366:.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1167:  17: -- Phase 5 entry will introduce the Artist Roster intake surface; this
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1367-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1169:  19: -- does NOT lock-in any artist-specific RLS / RPC shape.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1368-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1172:  22:   DROP CONSTRAINT IF EXISTS profiles_role_check;
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1422-.yagi-autobuild\phase-4-x\KICKOFF.md:1113:- 옵션 B: Disabled placeholder ("Phase 5 부터 가능") — **권장 (Artist onboarding 과 함께 Phase 5)**
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1423-src\components\home\commission-cta-block.tsx:36:                : "An AI VFX platform for music labels, agencies, and artists. YAGI reviews each brief personally and responds within 1-2 business days."}
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1424:.yagi-autobuild\DECISIONS_CACHE.md:1207:permanently retired from this codebase. Artist Roster intake (셀럽 /
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1425-.yagi-autobuild\DECISIONS_CACHE.md:1208:엔터에이전시) is moved to Phase 5 entry as a curated yagi-direct flow,
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1426-.yagi-autobuild\DECISIONS_CACHE.md:1219:the future `artist` value to be added in Phase 5) is wired to a live UI
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1427:.yagi-autobuild\DECISIONS_CACHE.md:1223:"add a creator portal." Default answer: Phase 4-9 = no. Artist Roster
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1428-.yagi-autobuild\DECISIONS_CACHE.md:1224:work belongs to Phase 5 with a curated yagi-admin-issued invite-token
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1429-.yagi-autobuild\phase-2-8-1\K-PUX-1_findings.md:41:**Observation:** The home hero says YAGI is "an AI-native entertainment studio for independent artists." The service triad leads with AI Twin, Branding & IP, and Content Production.
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1440-
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1441- succeeded in 1489ms:
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1442:docs\design\DECISIONS.md:205:Phase 2.5 G1 introduced `profiles.role IN ('creator','studio','observer')`,
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1443-docs\design\DECISIONS.md:208:system `user_roles.role IN ('yagi_admin','workspace_admin','workspace_member','creator')`.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1444-docs\design\DECISIONS.md:212:- `user_roles.role='creator'` (Phase 1.1) — used in `src/app/[locale]/app/layout.tsx`
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1445:docs\design\DECISIONS.md:215:- `profiles.role='creator'` (Phase 2.5) — the AI Creator persona who
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1446-scripts\create-artist-account.ts:11: * BLOCKED until the `profiles_role_check` CHECK constraint is widened
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1447-scripts\create-artist-account.ts:15: *          (role = ANY (ARRAY['creator','studio','observer','client'])))
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1448-scripts\create-artist-account.ts:86:    if (profileErr.code === "23514" || profileErr.message.includes("profiles_role_check")) {
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1449-scripts\create-artist-account.ts:88:        `[artist-account] profiles_role_check rejected role='${ARTIST_ROLE}'. ` +
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1450:.yagi-autobuild\ARCHITECTURE.md:522:The `profiles.role` enum still carries `creator|studio|observer|client`
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1451-src\app\auth\callback\route.ts:68:  // handle_new_user DB trigger now guarantees a profiles row materialises
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1452-src\app\auth\callback\route.ts:71:  // role instead — the actual constraint that decides whether the user
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1469-supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:29:ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1470-supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1471:supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:54:  'Phase 2.7 — company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1472-supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:145:    OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1473-supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:157:      WHERE p.id = (select auth.uid()) AND p.role = 'client'
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1528-supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:67:  ADD COLUMN role text CHECK (role IS NULL OR role IN ('creator','studio','observer')),
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1529-supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:69:  ADD COLUMN role_switched_at timestamptz,
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1530:supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:105:-- Observer: no child table. profiles.role='observer' alone signals the role.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1531-supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:240:      WHERE p.id = auth.uid() AND p.role = 'creator'
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1532-supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:244:CREATE POLICY creators_update_self ON public.creators
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1910-src\app\[locale]\app\admin\commissions\page.tsx:39:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1911-.yagi-autobuild\phase-4-x\_wave_c5b_sub10_db_audit.md:5:**Audit query**: `SELECT id, handle, display_name, role, locale, created_at FROM public.profiles WHERE role IN ('creator','studio')`
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1912:.yagi-autobuild\phase-4-x\_wave_c5b_sub10_db_audit.md:12:| `profiles.role = 'creator'` | **1** |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1913:.yagi-autobuild\phase-4-x\_wave_c5b_sub10_db_audit.md:13:| `profiles.role = 'studio'` | 0 |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1914-.yagi-autobuild\phase-4-x\_wave_c5b_sub10_db_audit.md:33:sub_02; the row's `role='creator'` value now points at a persona
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1915:.yagi-autobuild\phase-4-x\_wave_c5b_sub10_db_audit.md:43:2. `profiles.role = 'creator'` carries no functional consequence in
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1916-.yagi-autobuild\phase-4-x\_wave_c5b_sub10_db_audit.md:55:UPDATE public.profiles SET role = 'client' WHERE id = '73be213d-1306-42f1-bee4-7b77175a6e79';
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1917-.yagi-autobuild\phase-4-x\_wave_c5b_sub10_db_audit.md:74:applied via service-role (validate_profile_role_transition trigger
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1933-.yagi-autobuild\phase-4-x\_wave_c5b_amendments_result.md:187:      row was auto-created (handle `c_<md5>`, role='client',
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1934-.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:441:1. `profiles` 의 `role='creator'` 또는 `role='studio'` rows 식별
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1935:.yagi-autobuild\phase-4-x\_wave-c5b-prompt.md:581:- profiles.role = 'artist' (또는 enum 미정 시 야기 보고)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1936-.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:100:- `handle_new_user()` SECURITY DEFINER trigger function
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1937-.yagi-autobuild\phase-4-x\_wave-c5b-codex-amendments-prompt.md:101:- handle = 'c_<8-char-md5>', display_name = email local part, role = 'client', locale = 'ko' default
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1958-.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:311:- artist@yagiworkshop.xyz 계정 생성 + email_confirmed + role='artist'
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1959-.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:316:- `feat(phase-4-x): wave-c5b amend_02a — widen profiles_role_check to include 'artist'`
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:1960:.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:324:- yout40204020@yonsei.ac.kr (user_id=73be213d-1306-42f1-bee4-7b77175a6e79) profiles.role = 'creator'
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1961-.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:336:WHERE role IN ('creator', 'studio')
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1962-.yagi-autobuild\phase-4-x\_wave-c5b-amendments-prompt.md:342:옵션 A (권장): role = 'client'
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-1999-.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:35:C. validate_profile_role_transition interaction — does the artist UPSERT exercise an edge that the function doesn't anticipate?
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2000-.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:36:D. handle_new_user (amend_01) interaction — sequencing, trigger order, accidental double-write.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:2001:.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:39:G. is_yagi_admin / is_ws_admin / role_switched_at handling — independent of profiles.role enum but verify.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2002-.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:74:-- Phase 4.x Wave C.5b amend_02 ??widen profiles_role_check to include 'artist'.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2003-.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:77:-- as Brand + Artist + YAGI Admin. The profiles_role_check CHECK constraint
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2034-.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:715:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"profiles_role_check|validate_profile_role_transition|creators_update_self|studios_update_self|handle_new_user|is_yagi_admin|is_ws_admin|role_switched_at|role\\s*=\\s*ANY|ARRAY\\['creator'|creator.*studio.*observer.*client|observer.*client|role\\s+in|role IN|role='|role = '\" supabase src scripts .yagi-autobuild docs -g '"'!node_modules'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2035-.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:717:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"case \\\"creator\\\"|case 'creator'|switch \\(["'^'"\\n]*role|ProfileRole|z\\.enum\\(|enum\\(.*role|roleSchema|role.*zod|\\\"creator\\\"\\s*,\\s*\\\"studio\\\"|creator\\|studio|creator.*studio.*observer.*client|client.*observer\" src scripts supabase -g '"'!node_modules'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:2036:.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:719:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"artist|profiles_role_check|Phase 5|Artist Roster|FU-C5b-01|curated Artist\" supabase/migrations docs .yagi-autobuild scripts src -g '"'!node_modules'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2037-.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:726:rg: \([^\n]*role|ProfileRole|z\.enum\(|enum\(.*role|roleSchema|role.*zod|\creator\\s*,\s*\studio\|creator\|studio|creator.*studio.*observer.*client|client.*observer src scripts supabase -g !node_modules: 지정된 경로를 찾을 수 없습니다. (os error 3)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2038-.yagi-autobuild\phase-4-x\_amend02_codex_review_loop_1.md:730:rg: \([^\n]*role|ProfileRole|z\.enum\(|enum\(.*role|roleSchema|role.*zod|\creator\\s*,\s*\studio\|creator\|studio|creator.*studio.*observer.*client|client.*observer src scripts supabase -g !node_modules: 지정된 경로를 찾을 수 없습니다. (os error 3)
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2043-.yagi-autobuild\phase-4-x\_amend02_codex_prompt.txt:23:C. validate_profile_role_transition interaction — does the artist UPSERT exercise an edge that the function doesn't anticipate?
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2044-.yagi-autobuild\phase-4-x\_amend02_codex_prompt.txt:24:D. handle_new_user (amend_01) interaction — sequencing, trigger order, accidental double-write.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:2045:.yagi-autobuild\phase-4-x\_amend02_codex_prompt.txt:27:G. is_yagi_admin / is_ws_admin / role_switched_at handling — independent of profiles.role enum but verify.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2046-.yagi-autobuild\phase-4-x\_amend01_test_log.md:14:| `pg_proc` has `handle_new_user` | ✅ 1 row |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2047-.yagi-autobuild\phase-4-x\_amend01_test_log.md:19:| security advisor regression introduced by handle_new_user | ✅ 0 (REVOKE EXECUTE suppresses anon/authenticated SECURITY-DEFINER lints; SET search_path suppresses search-path-mutable lint) |
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2168-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:891:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4521:CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2169-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:897:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:67:  ADD COLUMN role text CHECK (role IS NULL OR role IN ('creator','studio','observer')),
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:2170:.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:900:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:105:-- Observer: no child table. profiles.role='observer' alone signals the role.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2171-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:919:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:26:-- (auto-named profiles_role_check). Drop+recreate keeps the NULL-allowed
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2172-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:920:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:28:ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2173-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:921:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:29:ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2174-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:922:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:2175:.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:923:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:54:  'Phase 2.7 ??company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2176-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:926:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:195:-- validate_profile_role_transition trigger (짠9) which prevents self-flipping
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2177-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:930:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:313:--   1. UPDATE profiles SET role = 'client'
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2190-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1035:supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:426:  IF v_actor_role = 'client' AND v_actor_id <> v_created_by THEN
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2191-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1044:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:2192:.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1045:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:54:  'Phase 2.7 ??company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2193-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1046:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:157:      WHERE p.id = (select auth.uid()) AND p.role = 'client'
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2194-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1047:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:195:-- validate_profile_role_transition trigger (짠9) which prevents self-flipping
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2251-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1237:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:692:  85: REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2252-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1245:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:753:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:2253:.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1246:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:754:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:54:  'Phase 2.7 ??company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2254-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1247:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:757:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:195:-- validate_profile_role_transition trigger (짠9) which prevents self-flipping
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2255-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1249:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:761:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:313:--   1. UPDATE profiles SET role = 'client'
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2300-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1316:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:165:- `feat(phase-4-x): wave-c5b amend_02a ??widen profiles_role_check to include 'artist'`
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2301-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1317:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:175:- yonsei (UUID 73be213d-1306-42f1-bee4-7b77175a6e79) role='client'
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:2302:.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1320:.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:581:- profiles.role = 'artist' (?먮뒗 enum 誘몄젙 ???쇨린 蹂닿퀬)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2303-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1322:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:17:| 02a | profiles_role_check widened to include 'artist' | `e0400d4` | ??migration applied; constraint includes 'artist'; ProfileRole TS type extended; sidebar switch case added |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2304-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_2.md:1324:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:30:auth.users INSERT now triggers `public.handle_new_user()` SECURITY
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2488-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:687:supabase/migrations\20260422120000_phase_2_0_baseline.sql:4521:CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2489-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:693:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:67:  ADD COLUMN role text CHECK (role IS NULL OR role IN ('creator','studio','observer')),
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:2490:.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:696:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:105:-- Observer: no child table. profiles.role='observer' alone signals the role.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2491-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:715:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:26:-- (auto-named profiles_role_check). Drop+recreate keeps the NULL-allowed
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2492-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:716:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:28:ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2493-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:717:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:29:ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2494-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:718:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:2495:.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:719:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:54:  'Phase 2.7 — company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2496-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:722:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:195:-- validate_profile_role_transition trigger (§9) which prevents self-flipping
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2497-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:726:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:313:--   1. UPDATE profiles SET role = 'client'
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2510-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:831:supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:426:  IF v_actor_role = 'client' AND v_actor_id <> v_created_by THEN
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2511-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:840:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:2512:.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:841:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:54:  'Phase 2.7 — company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2513-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:842:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:157:      WHERE p.id = (select auth.uid()) AND p.role = 'client'
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2514-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:843:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:195:-- validate_profile_role_transition trigger (§9) which prevents self-flipping
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2571-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1033:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:692:  85: REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2572-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1041:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:753:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:2573:.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1042:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:754:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:54:  'Phase 2.7 — company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2574-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1043:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:757:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:195:-- validate_profile_role_transition trigger (§9) which prevents self-flipping
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2575-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1045:.yagi-autobuild/phase-4-x\_amend01_codex_review_loop_1.md:761:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:313:--   1. UPDATE profiles SET role = 'client'
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2620-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1113:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:165:- `feat(phase-4-x): wave-c5b amend_02a — widen profiles_role_check to include 'artist'`
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2621-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1114:.yagi-autobuild/phase-4-x\_wave-c5b-codex-amendments-prompt.md:175:- yonsei (UUID 73be213d-1306-42f1-bee4-7b77175a6e79) role='client'
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:2622:.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1117:.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:581:- profiles.role = 'artist' (또는 enum 미정 시 야기 보고)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2623-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1119:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:17:| 02a | profiles_role_check widened to include 'artist' | `e0400d4` | ✅ migration applied; constraint includes 'artist'; ProfileRole TS type extended; sidebar switch case added |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2624-.yagi-autobuild\phase-4-x\_amend01_codex_review_loop_1.md:1121:.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:30:auth.users INSERT now triggers `public.handle_new_user()` SECURITY
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2662-.yagi-autobuild\DECISIONS_CACHE.md:1027:2. TypeScript ProfileRole type은 4개 그대로 유지 (`'creator' | 'studio' | 'observer' | 'client'`) — legacy 프로필 데이터 보호.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2663-.yagi-autobuild\DECISIONS_CACHE.md:1169:4. **Auto-transition `submitted → in_review` is the ONLY system-role transition** (L-015). Client-side `submitProjectAction` writes `status='in_review'` directly via service-role client (which bypasses the trigger guard), and inserts the initial history row with `actor_role='system'`. UX rationale: client must see "검토 중" immediately on submit; the literal `submitted` state is functional metadata only. Implication: the `submitted` row in `project_status_history` is the *from-state* of the system transition, not a user-observable state on `projects`.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:2664:.yagi-autobuild\DECISIONS_CACHE.md:1218:`creator|studio|observer|client` for legacy DB rows; only `client` (and
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2665-.yagi-autobuild\phase-4-x\_amend01_codex_prompt_loop2.txt:9:   supabase/migrations/20260501140308_phase_4_x_handle_new_user_search_path_hardening.sql
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2666-.yagi-autobuild\phase-4-x\_amend01_codex_prompt_loop2.txt:10:   ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2671-.yagi-autobuild\phase-4-x\_amend01_codex_prompt.txt:23:I. 'client' default role consistency with persona A (DECISIONS_CACHE.md Q-094 = Brand-only Phase 4-9). Interaction with the artist bootstrap path (sub_13 service-role admin upsert) — does the trigger first creating role='client' then UPDATE to 'artist' work cleanly through validate_profile_role_transition?
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2672-src\app\[locale]\app\admin\challenges\actions.ts:68:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:2673:.yagi-autobuild\phase-4-x\result_01.md:26:- profiles.role = 'yagi_admin' check in RLS policies aligns with is_yagi_admin helper pattern used in prior migrations.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2674-.yagi-autobuild\phase-4-x\KICKOFF.md:308:      WHERE id = auth.uid() AND role = 'yagi_admin'
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-2675-.yagi-autobuild\phase-4-x\KICKOFF.md:329:      WHERE id = auth.uid() AND role = 'yagi_admin'
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3278-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\DECISION-PACKAGE-AUDIT.md:24:| D3 Workspace-skip privilege for 2.5 Creator/Studio | ⚠ IMPLICIT | §F | DP §F Step 5 redirects to `/u/<handle>` (locale-free, no workspace gate). Implicit decision: 2.5 Creator/Studio do NOT get `user_roles.role='creator'` inserted → no `hasPrivilegedGlobalRole` → redirected to `/onboarding/workspace` if they navigate to `/[locale]/app/*`. **DP does not explicitly document this semantic.** For MVP where their entire surface is locale-free (`/u/<handle>` + `/challenges/*` + `/settings/profile` if also locale-free), this is fine. Worth surfacing. |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3279-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\DECISION-PACKAGE-AUDIT.md:40:| 1 | DP §A implicit semantic "2.5 Creator/Studio get no workspace-skip" not documented. Hidden coupling with layout.tsx:28-29 `hasPrivilegedGlobalRole`. | MED | Add 1-line clarification to DP §A "Decision for 야기" or post-G2 amendment: "Phase 2.5 Creator/Studio do NOT insert `user_roles.role='creator'`. Their product surfaces are locale-free; `/[locale]/app/*` redirects to workspace onboarding remains current behavior." |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:3280:.yagi-autobuild\archive\phase-2-shipped\phase-2-5\DECISION-PACKAGE-AUDIT.md:135:| PRE-1 | `Role` in `context.ts` includes 'creator' literal (Phase 1.1); collides with Phase 2.5 `profiles.role='creator'` | ✓ CONFIRMED (side audit earlier this session — `src/lib/app/context.ts:3` + `src/app/[locale]/app/layout.tsx:28-29`) |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:3281:.yagi-autobuild\archive\phase-2-shipped\phase-2-5\DECISION-PACKAGE-AUDIT.md:163:| 12 | SPEC v1 §1 scope selector behavior for Observer: "Observers see only their workspace scopes (if any)" — PRE-1 interaction: Observer has `profiles.role='observer'` but may have `user_roles.role='creator'` (legacy Phase 1.1). Double-role consumer would show workspace + hidden profile. Worth clarifying whether legacy 'creator' role grants profile scope visibility. | LOW | SPEC v1.1 amend §1 note: "Observer with legacy user_roles.role='creator' is a hybrid edge case; treat per Phase 1.1 semantics (workspace-skip entitlement only, no profile scope surfaced)." |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3282-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G0_CODEX_REVIEW.md:73:- §159 (G1 Task 1 ALTER profiles): adds `role`, `handle`, `instagram_handle`, `bio`, `avatar_url`, `role_switched_at`. **Missing: `handle_changed_at`.**
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3283-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G0_CODEX_REVIEW.md:79:2. Revise Q7 to use `role_switched_at`-style separate column or derive from audit table. Larger SPEC surgery.
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3289-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\FOLLOWUPS.md:190:JOIN public.profiles p ON p.id = s.id AND p.role = 'studio';
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3290-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\FOLLOWUPS.md:203:**Risk**: Phase 2.5 G1 hardening v2 §2 moved `created_at` immutability enforcement to the head of the `tg_challenge_submissions_guard_self_mutation` trigger, applying to ALL roles. Triggers are NOT RLS-bypassable, so service_role INSERTs with arbitrary `created_at` will be silently swallowed by the trigger on any subsequent UPDATE, and backfills that rely on UPDATE paths will be blocked.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:3291:.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-ENTRY-DECISION-PACKAGE.md:20:Phase 2.5 G1 introduced `profiles.role IN ('creator','studio','observer')`,
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3292-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-ENTRY-DECISION-PACKAGE.md:23:`user_roles.role IN ('yagi_admin','workspace_admin','workspace_member','creator')`.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3293-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-ENTRY-DECISION-PACKAGE.md:27:- `user_roles.role='creator'` is currently used in `src/app/[locale]/app/layout.tsx`
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:3294:.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-ENTRY-DECISION-PACKAGE.md:32:- `profiles.role='creator'` (Phase 2.5) is the AI Creator persona who
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3295-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-ENTRY-DECISION-PACKAGE.md:126:Phase 2.5 Creator/Studio personas do NOT insert `user_roles.role='creator'`
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3296-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-ENTRY-DECISION-PACKAGE.md:132:  `user_roles.role='creator'` will, if they navigate to `/[locale]/app/*`,
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3297-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-ENTRY-DECISION-PACKAGE.md:137:- The Phase 1.1 `user_roles.role='creator'` literal remains reserved for the
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3298-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-ENTRY-DECISION-PACKAGE.md:141:- A user CAN simultaneously hold Phase 1.1 `user_roles.role='creator'` (legacy
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:3299:.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-ENTRY-DECISION-PACKAGE.md:142:  workspace-skip) AND Phase 2.5 `profiles.role='creator'` (Challenge Platform persona).
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:3300:.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G2-auth-flow.md:70:**Collision:** Phase 1.1 `user_roles.role` uses literal `'creator'` (privileged global role — lets user skip workspace setup). Phase 2.5 G1 (commit 58dbf6e) added `profiles.role IN ('creator','studio','observer')` (challenge persona type). **Same TypeScript literal, two tables, two meanings.**
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3301-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G2-auth-flow.md:75:- `src/lib/onboarding/actions.ts:30-34` — signup INSERTs `user_roles` with `role='creator'` for Phase 1.1 creators
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3302-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G2-auth-flow.md:81:- `src/lib/onboarding/actions.ts:13` hardcodes `"client" | "creator"` — must be updated to 3-role world, and **must decide: does a Phase 2.5 Creator/Studio/Observer signup ALSO INSERT `user_roles.role='creator'`?** If yes, the `hasPrivilegedGlobalRole` gate now grants workspace-skip to every new 2.5 signup, which may or may not be intended. If no, Phase 1.1 "client" users lose the workspace-skip privilege — breaking change.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3303-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G2-auth-flow.md:94:**Option B — Drop `user_roles.role='creator'` (breaking change)**
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3304-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G2-auth-flow.md:95:- Migration: DELETE `user_roles` rows with role='creator', or UPDATE to new literal (`'legacy_global_creator'`?)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:3305:.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G2-auth-flow.md:100:**Option C — Rename Phase 2.5 `profiles.role='creator'` → `'ai_creator'` (or `'individual'`)**
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3306-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G2-auth-flow.md:109:- `src/lib/onboarding/actions.ts:13` — role union `"client" | "creator"` is **already wrong** relative to SPEC §1.2 (no 'client' role in Phase 2.5). G2 fix required.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3307-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G2-auth-flow.md:133:- Existing Phase 1.1 users with `user_roles.role='creator'` must NOT break.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:3308:.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G2-auth-flow.md:142:3. **Workspace-skip privilege for Phase 2.5 Creator/Studio** — should a fresh Creator sign-up get `hasPrivilegedGlobalRole` treatment (skip workspace onboarding)? Currently the layout redirects to `/onboarding/workspace` unless privileged. If 2.5 Creators/Studios skip workspace onboarding, `user_roles.role='creator'` INSERT must happen alongside `profiles.role` INSERT.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3309-.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:30:   `NOT public.is_ws_admin(...)`.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3310-.yagi-autobuild\phase-2-8-6\_codex_review_output_loop2.txt:38:   `setSupportThreadStatus()` action also gained an is_yagi_admin
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3488-.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:8992: 324:           OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3489-.yagi-autobuild\phase-2-8-2\_codex_review_output_loop2.txt:9005: 337:     OR public.is_yagi_admin((select auth.uid()))
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:3490:.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G4-submission-flow.md:87:- Requires `profiles.role IN ('creator','studio')`.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3491-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G4-submission-flow.md:144:| Integration | RLS INSERT policy on `challenge_submissions` — role IN (creator,studio) + challenge state='open' + own submitter_id | Direct supabase anon/authed clients |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3492-.yagi-autobuild\phase-2-8-2\_codex_review_prompt.md:52:    is_yagi_admin(auth.uid())`. Verify:
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3922-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G5-admin-management.md:48:- `src/app/[locale]/app/admin/challenges/layout.tsx` — layout-level `is_yagi_admin` guard (SPEC §3 G5 Task 6)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3923-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G5-admin-management.md:49:  - Call `is_yagi_admin(auth.uid())` RPC via Server Component
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:3924:.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G5-admin-management.md:85:- SPEC explicitly states admin gate uses `is_yagi_admin(auth.uid())` RPC, not a new `profiles.role='admin'` value
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3925-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G5-admin-management.md:130:| Integration | Admin Server Actions enforce `is_yagi_admin` — anon/non-admin call → 403 | Supabase client tests |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3926-.yagi-autobuild\phase-2-8-2\_codex_review_prompt_loop2.md:6:   `(is_ws_admin OR is_yagi_admin)`. Tightened to mirror USING:
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3931-.yagi-autobuild\phase-2-8-2\_run.log:20:#     (deleted_at IS NULL)) OR is_yagi_admin(auth.uid()))
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3932-.yagi-autobuild\phase-2-8-2\_run.log:21:#   projects_update CHECK (is_ws_admin(...) OR is_yagi_admin(...))
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:3933:.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G4-TASK-PLAN.md:137:        * role check (profiles.role IN creator/studio) → wrong_role error
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:3934:.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\G8-closeout.md:23:- 2 ALTER contracts (profiles.role/handle/instagram_handle/bio/role_switched_at/handle_changed_at; notification_preferences.challenge_updates_enabled)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3935-.yagi-autobuild\phase-3-1-hotfix-3\_run.log:26:2026-04-30 task_12 H3 RULED OUT: pg_policy projects_insert WITH CHECK = (is_ws_member(uid, workspace_id) OR is_yagi_admin(uid)); Phase 3.0 K-05 LOOP 1 fix L-024 applied; INSERT path RLS not the cause
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-3936-.yagi-autobuild\phase-3-1\_codex_review_output.txt:49:trust boundary) + 30s-debounced version snapshot via service-role INSERT (because `project_board_versions_insert_trigger` has `WITH CHECK false`) + UPDATE board.
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4147-.yagi-autobuild\phase-3-1\_codex_review_output.txt:6659:193:  IF NOT is_yagi_admin(auth.uid()) THEN
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4148-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\_summary.md:32:- Phase 1.1 `user_roles.role='creator'` — privileged global role (grants workspace-skip)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4149:.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\_summary.md:33:- Phase 2.5 `profiles.role='creator'` — challenge persona (alongside studio, observer)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4150-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\_summary.md:41:- `src/lib/onboarding/actions.ts:30-34` — INSERTs `user_roles.role='creator'` on Phase 1.1 signup
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4151-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\G2-G8-PRE-AUDIT\_summary.md:49:| G5 | None (admin gate is `is_yagi_admin` RPC, Phase 1.1 territory) |
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4164-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC-REVIEW-NOTES.md:13:**Top issue:** SPEC collides with Phase 1.1 identity backbone — it introduces a new `user_profiles` table (1:1 with `auth.users`) while Phase 1.1 already owns `profiles` as that surface (`contracts.md` Phase 1.1). Likewise the new "4th internal admin role" redefines role storage even though Phase 1.1 has `user_roles` with `is_yagi_admin`. G1 as written will break every downstream workspace-scoped RLS policy or produce two parallel identity tables. This must be resolved pre-G1, not mid-G1.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4165-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC-REVIEW-NOTES.md:33:### [CRITICAL_BLOCKING] "Admin role" clashes with Phase 1.1 `user_roles` + `is_yagi_admin` system
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4166:.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC-REVIEW-NOTES.md:35:- **Current text:** "Admin role gating: middleware check against user_profiles.role = 'admin' (admin role is a 4th internal role, not user-facing)"
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4167:.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC-REVIEW-NOTES.md:36:- **Issue:** Phase 1.1 already has `user_roles` with `yagi_admin` (global, `workspace_id IS NULL`) and the `is_yagi_admin(uid)` RPC used by every admin-gated surface in 1.2–1.9 (contracts.md §Phase 1.1 RPCs). Introducing a 4th role stored on `user_profiles.role` creates a parallel authorization system — any new admin surface in 2.5 that uses `is_yagi_admin` will diverge from one that uses `.role='admin'`. This is exactly the class of drift ADR-001 rejects at the design-system level and ARCH §11 rejects at the architecture level.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4168:.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC-REVIEW-NOTES.md:37:- **Suggested edit:** Replace the 4th-role concept with: "Admin gating uses existing `is_yagi_admin(auth.uid())` RPC from Phase 1.1. The 3 Phase 2.5 roles (Creator/Studio/Observer) live on `profiles.role` and are orthogonal to `user_roles`. Admin = `user_roles.role='yagi_admin'`, not `profiles.role='admin'`." Update §1 role table and Q1 (admin bootstrap) accordingly — Q1 becomes "assign existing `yagi_admin` role via existing seed pattern", not a new promotion path.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4169-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC-REVIEW-NOTES.md:42:- **Issue:** Phase 1.1 `user_roles.role` is workspace-scoped (`workspace_admin`/`workspace_member` with `workspace_id`, plus global `yagi_admin` with `workspace_id IS NULL`). Phase 2.5 introduces a global-only role (Creator/Studio/Observer) with no workspace relation. Not flagged in §5 dependencies. Open risk: a Creator who is also a workspace_admin in a client workspace — which role wins in RLS predicates on `challenge_submissions`? No answer in SPEC. This is not a hypothetical; the B2B Studio role in D3 explicitly targets "potential B2B clients" who will also have workspaces.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4170-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC-REVIEW-NOTES.md:208:2. Uses `is_yagi_admin` instead of a new "admin role".
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4175-.yagi-autobuild\archive\phase-1\phase-1-3-spec.md:117:      and (is_ws_admin(m.workspace_id) or is_yagi_admin())
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4176-.yagi-autobuild\archive\phase-1\phase-1-3-spec.md:338:2. **Auth check.** Require `is_ws_admin(project.workspace_id)` OR `is_yagi_admin()`. Fetch project to get workspace_id.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4177:.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:45:direction per 30 days — tracked in `profiles.role_switched_at`).
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4178-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:55:  `is_ws_admin(uid, wsid)` / `is_ws_member(uid, wsid)`.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4179-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:64:  existing `is_yagi_admin(auth.uid())` RPC from Phase 1.1, NOT a new
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4180:.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:65:  `profiles.role='admin'` value.** There is no 4th role. See §3 G5 for the
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4181-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:163:     ADD COLUMN role text CHECK (role IN ('creator','studio','observer')),
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4182-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:168:     ADD COLUMN role_switched_at timestamptz,
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4187-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:234:     `is_yagi_admin`.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4188-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:405:   `is_yagi_admin(auth.uid())` RPC. Middleware/layout for `/admin/challenges/*`
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4189:.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:407:   `profiles.role='admin'` value — Phase 2.5 introduces 3 roles only
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4190-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:409:   pattern (INSERT INTO `user_roles` (`role='yagi_admin'`, `workspace_id=NULL`)).
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4191-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:573:- `user_roles` + `is_yagi_admin(uid)` RPC (Phase 1.1) — admin gate for all
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4192-.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:613:that INSERTs `user_roles (user_id, role='yagi_admin', workspace_id=NULL)`
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4193:.yagi-autobuild\archive\phase-2-shipped\phase-2-5\SPEC.md:668:30-day minimum between role switches; tracked via `profiles.role_switched_at`
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4194-.yagi-autobuild\archive\phase-1\phase-1-4-spec.md:150:  is_yagi_admin() or is_ws_member(workspace_id)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4195-.yagi-autobuild\archive\phase-1\phase-1-4-spec.md:153:  is_yagi_admin() or is_ws_admin(workspace_id)
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4395-supabase/migrations\20260422120000_phase_2_0_baseline.sql:1825:    CONSTRAINT workspace_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4396-supabase/migrations\20260422120000_phase_2_0_baseline.sql:4440:CREATE POLICY user_roles_self_insert_creator ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'creator'::text) AND (workspace_id IS NULL)));
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4397:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:24:--       and orphan showcase winner display. profiles.role flip is the canonical
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4398-supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:67:  ADD COLUMN role text CHECK (role IS NULL OR role IN ('creator','studio','observer')),
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4399:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:105:-- Observer: no child table. profiles.role='observer' alone signals the role.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4400:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:224:-- Note: no DELETE policy. Soft-delete via profiles.role change (set to NULL
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4401:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:233:-- their `profiles.role`. Prevents role=studio users from inserting a
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4402-supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:240:      WHERE p.id = auth.uid() AND p.role = 'creator'
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4403:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:248:-- Note: no DELETE policy. Soft-delete via profiles.role change (set to NULL
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4404:supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:257:-- their `profiles.role`. Prevents role=creator users from inserting a
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4405-supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:264:      WHERE p.id = auth.uid() AND p.role = 'studio'
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4406-supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:299:      WHERE p.id = auth.uid() AND p.role IN ('creator','studio')
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4407-supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:18:--        tightens UPDATE policies with role EXISTS + adds dual-role INSERT
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4408:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:22:--        queries in G3/G6 must join profiles.role to surface only active
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4409-supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:138:      WHERE p.id = auth.uid() AND p.role = 'creator'
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4410-supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:145:      WHERE p.id = auth.uid() AND p.role = 'creator'
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4412-supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:163:      WHERE p.id = auth.uid() AND p.role = 'studio'
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4413-supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:167:-- 3b. Dual-role INSERT block triggers (defense against race after RLS).
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4414:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:211:-- role-match policies. G3/G6 read queries must join profiles.role to
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4415-supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:216:CREATE OR REPLACE FUNCTION public.tg_profiles_role_flip_cleanup()
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4416:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:229:-- current profiles.role.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4417:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:232:  'read queries must filter by current profiles.role.';
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4418:supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:236:  'queries must filter by current profiles.role.';
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4419-supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:10:--   N-L2 (LOW) — tg_profiles_role_flip_cleanup scaffold body was RETURN NEW
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4420-supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:23:--   §3 — tg_profiles_role_flip_cleanup scaffold body changed from RETURN NEW
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4422-supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:123:CREATE OR REPLACE FUNCTION public.tg_profiles_role_flip_cleanup()
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4423-supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:136:  RAISE EXCEPTION 'tg_profiles_role_flip_cleanup scaffold — implement policy body before attaching trigger'
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4424:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:11:--   1. profiles.role enum extension ('client')
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4425-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:22:-- 1. profiles role enum — add 'client'
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4426-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:26:-- (auto-named profiles_role_check). Drop+recreate keeps the NULL-allowed
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4428-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:29:ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4429-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:30:  CHECK (role IS NULL OR role IN ('creator', 'studio', 'observer', 'client'));
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4430:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:54:  'Phase 2.7 — company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4431-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:157:      WHERE p.id = (select auth.uid()) AND p.role = 'client'
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4432-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:176:-- profiles/auth.users deletion only. Manual delete via DB role for support cases.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4433:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:191:-- INSERT: only the client themselves, and only after their profiles.role is
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4434:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:196:-- profiles.role to 'client' from any prior non-null role.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4435-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:206:      WHERE p.id = (select auth.uid()) AND p.role = 'client'
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:4436:supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:307:-- 6b. profiles.role transition guard (K05-001 Finding 1, HIGH-A)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4437-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:313:--   1. UPDATE profiles SET role = 'client'
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-4438-supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:345:    IF NEW.role = 'client' AND OLD.role IS NOT NULL THEN
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5486-
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5487-codex
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:5488:The code search shows no Zod enum for `profiles.role` and only one switch on `ProfileRole`, but there are several legacy challenge paths that intentionally admit only `creator|studio`. I’m checking the SQL trigger bodies and RLS definitions now to distinguish deliberate denial from unintended enum dependence.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5489-exec
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5490-"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260425000000_phase_2_7_commission_soft_launch.sql' | ForEach-Object { "'$i++; if (($i -ge 22 -and $i -le 38) -or ($i -ge 140 -and $i -le 215) -or ($i -ge 255 -and $i -le 388)) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5567- 185: FOR EACH ROW
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5568- 210: -- Stale creators/studios rows preserved by design. UPDATE blocked by 3a
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:5569: 211: -- role-match policies. G3/G6 read queries must join profiles.role to
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5570- 212: -- display correct active persona. Historical attribution preserved for
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5571- 213: -- showcase winners + submissions. Function retained as scaffold for
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5585- 227: 
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5586- 228: -- Historical-record COMMENTs so G3/G6 query authors don't assume 1:1 with
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:5587: 229: -- current profiles.role.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5588- 230: COMMENT ON TABLE public.creators IS
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5589- 231:   'Phase 2.5 ??AI creator persona. Row may persist after role flip; G3/G6 '
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:5590: 232:   'read queries must filter by current profiles.role.';
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5591- 233: 
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5592- 234: COMMENT ON TABLE public.studios IS
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5593- 235:   'Phase 2.5 ??AI studio org. Row may persist after role flip; G3/G6 read '
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:5594: 236:   'queries must filter by current profiles.role.';
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5595- 237: 
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5596- 238: 
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5627- 230: 
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5628- 231: -- Role consistency: a user can only create the `creators` row matching
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:5629: 232: -- their `profiles.role`. Prevents role=studio users from inserting a
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5630- 233: -- creators row (or vice versa). Enforces SPEC 짠1 "one user = one role".
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5631- 234: CREATE POLICY creators_insert_self ON public.creators
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5642- 245: 
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5643- 246: ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:5644: 247: -- Note: no DELETE policy. Soft-delete via profiles.role change (set to NULL
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5645- 248: -- or 'observer'). Hard DELETE not exposed at RLS level ??preserves
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5646- 249: -- referential integrity for showcase_challenge_winners + challenge_submissions
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5651- 254: 
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5652- 255: -- Role consistency: a user can only create the `studios` row matching
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:5653: 256: -- their `profiles.role`. Prevents role=creator users from inserting a
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5654- 257: -- studios row (or vice versa). Enforces SPEC 짠1 "one user = one role".
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5655- 258: CREATE POLICY studios_insert_self ON public.studios
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5859- 189:   );
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5860- 190: 
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:5861: 191: -- INSERT: only the client themselves, and only after their profiles.role is
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5862- 192: -- 'client'. Defense-in-depth: app layer also gates, but the role check here
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5863- 193: -- prevents creators/studios/observers from creating commission_intakes by
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5864- 194: -- spoofing client_id = own uid. Also paired with the
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5865- 195: -- validate_profile_role_transition trigger (짠9) which prevents self-flipping
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:5866: 196: -- profiles.role to 'client' from any prior non-null role.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5867- 197: DROP POLICY IF EXISTS commission_intakes_insert_self_client ON public.commission_intakes;
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5868- 198: CREATE POLICY commission_intakes_insert_self_client
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5935- 304: 
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5936- 305: -- =============================================================================
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:5937: 306: -- 6b. profiles.role transition guard (K05-001 Finding 1, HIGH-A)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5938- 307: -- =============================================================================
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-5939- 308: -- Phase 2.7 specifically calls out "signup role 'client' bypass" as
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-6751-  15: -- a safe default.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-6752-  16: --
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:6753:  17: -- Phase 5 entry will introduce the Artist Roster intake surface; this
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-6754-  18: -- migration unblocks the demo account ahead of that surface design and
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-6755-  19: -- does NOT lock-in any artist-specific RLS / RPC shape.
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7491-  13: - role: `artist` (PRODUCT-MASTER 짠4 / DECISIONS Q-094 persona model)
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7492-  14: - purpose: test/demo account for yagi visual review ahead of the
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:7493:  15:   Phase 5 Artist Roster intake surface design
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7494-  16: 
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7495-  17: ## Pre-flight (after amend_02)
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7523-  45: | profiles.handle | `artist_demo_2d6a3f` |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7524-  46: | profiles.display_name | `Artist Demo` |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:7525:  47: | profiles.role | `artist` |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7526-  48: | profiles.locale | `ko` |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7527-  49: 
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7570-  92: ## Followups
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7571-  93: 
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:7572:  94: - FU-C5b-01 (Phase 5 Artist Roster intake surface) remains open. The
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7573-  95:   demo account now exists for visual review but the curated intake
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7574-
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7615-
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7616- succeeded in 375ms:
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:7617:1200: permanently retired from this codebase. Artist Roster intake (???/
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7618-1201: ?뷀꽣?먯씠?꾩떆) is moved to Phase 5 entry as a curated yagi-direct flow,
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7619-1202: NOT a self-registration form. Independent creator self-registration is
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7625-1208: (layout + page + queries), email templates `signup-welcome.ts` and
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7626-1209: `role-confirmation.ts`, and narrowed `lib/app/scopes.ts` Scope union to
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:7627:1210: {workspace, admin}. The `profiles.role` enum still carries
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:7628:1211: `creator|studio|observer|client` for legacy DB rows; only `client` (and
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7629-1212: the future `artist` value to be added in Phase 5) is wired to a live UI
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7630-1213: in current code.
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7631-1214: 
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7632-1215: **Applies when:** Any future request to "let creators sign up" or
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:7633:1216: "add a creator portal." Default answer: Phase 4-9 = no. Artist Roster
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7634-1217: work belongs to Phase 5 with a curated yagi-admin-issued invite-token
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7635-1218: flow, not a self-registration form. Independent creator self-service
--
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7711- 204: | ID | Status |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7712- 205: |---|---|
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:7713: 206: | FU-C5b-01 (Phase 5 Artist Roster intake) | open ??demo account exists but curated intake flow is Phase 5 |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7714- 207: | FU-C5b-02 (Supabase Dashboard email template paste) | open ??yagi action |
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7715-
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md-7716-exec
.yagi-autobuild/phase-4-x\_amend02_codex_review_loop_1.md:7717:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -C 2 \"profiles\\.role|creator\\|studio\\|observer\\|client|future "'`artist`|Artist Roster" .yagi-autobuild/ARCHITECTURE.md .yagi-autobuild/DECISIONS_CACHE.md .yagi-autobuild/phase-4-x -g '"'"'!*.txt'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
--
.yagi-autobuild/phase-4-x\_followups.md-4-action, and the trigger that should pull it back into scope.
.yagi-autobuild/phase-4-x\_followups.md-5-
.yagi-autobuild/phase-4-x\_followups.md:6:## FU-C5b-01 — Phase 5 Artist Roster intake surface
.yagi-autobuild/phase-4-x\_followups.md-7-
.yagi-autobuild/phase-4-x\_followups.md-8-- **Trigger**: Phase 5 entry (셀럽/엔터에이전시 영입 시작).
--
.yagi-autobuild/phase-4-x\_followups.md-12-- **Action**: Design a separate Artist intake / invite-link flow. Do
.yagi-autobuild/phase-4-x\_followups.md-13-  NOT reuse the retired `/onboarding/role` self-registration shape —
.yagi-autobuild/phase-4-x\_followups.md:14:  Artist Roster is curated, not self-served. Likely a yagi-admin tool
.yagi-autobuild/phase-4-x\_followups.md-15-  that issues one-shot signup tokens.
.yagi-autobuild/phase-4-x\_followups.md-16-- **Owner**: yagi (product) + Builder (implementation when greenlit).
--
.yagi-autobuild/phase-4-x\_followups.md-117-
.yagi-autobuild/phase-4-x\_followups.md-118-- **Trigger**: Phase 4.x ff-merge → hotfix-1, OR Phase 5 entry (when
.yagi-autobuild/phase-4-x\_followups.md:119:  the IA is being re-laid out for Artist Roster anyway).
.yagi-autobuild/phase-4-x\_followups.md-120-- **Risk**: yagi visual review (post-sub_00 rollback, 2026-05-01)
.yagi-autobuild/phase-4-x\_followups.md-121-  flagged the `/onboarding/brand` step as a Phase 2.x leftover. It
--
.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md-220--- (sub_13) requires this enum value.
.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md-221---
.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:222:-- Phase 5 entry will introduce Artist Roster intake surface; this
.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md-223--- migration unblocks the demo account ahead of that surface design.
.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md-224-
--
.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md-322-
.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md-323-#### 현상
.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:324:- yout40204020@yonsei.ac.kr (user_id=73be213d-1306-42f1-bee4-7b77175a6e79) profiles.role = 'creator'
.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md-325-- 야기 결정 A (persona model) = 'client' / 'observer' 만 active. 'creator' / 'studio' deprecated.
.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md-326-- yonsei 계정은 야기 본인의 testing 계정 (메모리 + chat 컨텍스트)
--
.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md-411-
.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md-412-### 처리 시점
.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md:413:Phase 4.x ff-merge 후 hotfix-1 또는 Phase 5 entry (Artist Roster 와 함께 IA 정리)
.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md-414-```
.yagi-autobuild/phase-4-x\_wave-c5b-amendments-prompt.md-415-
--
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-143-- Image 4: `/role` 에서 "크리에이터/스튜디오" + "의뢰인" 2 카드 노출
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-144-- PRODUCT-MASTER §4 = Brand + Artist + YAGI Admin 의 3-persona model
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:145:- "크리에이터/스튜디오" = Phase 2.x 잔재. Artist Roster 영입은 *야기 직접* (Phase 5+).
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-146-
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-147-#### 작업
--
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-151-4. Signup form 후 자동 sign-in 시 navigate target 도 `/onboarding/workspace`
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-152-5. 이미 가입한 user 가 `/role` 직접 접근 시 → `/app/dashboard` 또는 `/onboarding/workspace`
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:153:6. `_followups.md` 에 기록: "Phase 5 entry 시 Artist Roster 영입 surface 새 설계"
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-154-
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-155-#### Files in scope
--
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-463-  - Phase 2.x 에서 도입된 self-registration flow (`/role` + `/u/handle`) 폐기
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-464-  - 이유: 큐레이션 부티크 positioning 과 self-registration 양립 X
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:465:- Artist Roster 영입 = **Phase 5 entry 에서 새 설계** (셀럽/엔터에이전시 — 야기 직접 영입)
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-466-- Independent creator 자체-등록 = **Phase 9+ 또는 영구 deferred**
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-467-
--
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-522-- Password: `yagiworkshop12#$`
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-523-- Role: `artist` (PRODUCT-MASTER §4)
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:524:- Test/demo 계정 (Phase 5 entry 의 Artist Roster 영입 surface 도입 전 manual 생성)
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-525-
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-526-#### 작업
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-527-
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:528:**먼저 profiles.role enum 에 'artist' 가 있는지 확인 필수**:
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-529-```sql
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-530-SELECT column_name, data_type, udt_name
--
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-579-#### Acceptance
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-580-- artist@yagiworkshop.xyz 생성 + email_confirmed
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:581:- profiles.role = 'artist' (또는 enum 미정 시 야기 보고)
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-582-- Login test 가능
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-583-- `_artist_account_created.md` 작성 (user_id + verify SQL)
--
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-679-- `_run.log` 추가 라인
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-680-- `_hold/issues_c5b.md` (MINOR 발생 시)
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md:681:- `_followups.md` (Supabase Dashboard manual sync, Phase 5 Artist Roster 영입, Phase 7+ brand logo 교체 등)
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-682-
.yagi-autobuild/phase-4-x\_wave-c5b-prompt.md-683-## 시작
--
.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md-204-| ID | Status |
.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md-205-|---|---|
.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md:206:| FU-C5b-01 (Phase 5 Artist Roster intake) | open — demo account exists but curated intake flow is Phase 5 |
.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md-207-| FU-C5b-02 (Supabase Dashboard email template paste) | open — yagi action |
.yagi-autobuild/phase-4-x\_wave_c5b_amendments_result.md-208-| FU-C5b-03 (Phase 7+ "+50개 이상" placeholder → real client logos) | open |
--
.yagi-autobuild/phase-4-x\_wave_c5b_result.md-166-## Followups registered (in `_followups.md`)
.yagi-autobuild/phase-4-x\_wave_c5b_result.md-167-
.yagi-autobuild/phase-4-x\_wave_c5b_result.md:168:- **FU-C5b-01** — Phase 5 Artist Roster intake surface (curated, not
.yagi-autobuild/phase-4-x\_wave_c5b_result.md-169-  self-register). Trigger: Phase 5 entry.
.yagi-autobuild/phase-4-x\_wave_c5b_result.md-170-- **FU-C5b-02** — yagi pastes branded email templates into Supabase
--
.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md-10-|---|---|
.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md-11-| `profiles` rows total | 2 |
.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md:12:| `profiles.role = 'creator'` | **1** |
.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md:13:| `profiles.role = 'studio'` | 0 |
.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md:14:| `profiles.role IS NULL` | 1 |
.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md-15-| `creators` table rows | 1 |
.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md-16-| `studios` table rows | 0 |
--
.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md-41-   Codex K-05 adversarial review before any prod DB write. A single
.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md-42-   test-row reclassification does not warrant a Codex spin.
.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md:43:2. `profiles.role = 'creator'` carries no functional consequence in
.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md-44-   the current code — sub_02 dropped the only consumers of that
.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md-45-   role (the /u/<handle> page and /onboarding/profile/creator form).
--
.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md-99-
.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md-100-- The `creators_update_self` RLS policy now denies the row owner
.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md:101:  (their `profiles.role != 'creator'` post-reclassify), so the row
.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md-102-  is effectively read-only-from-server-perspective.
.yagi-autobuild/phase-4-x\_wave_c5b_sub10_db_audit.md-103-- No UI surface in the codebase queries the `creators` table after

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"export default|fetchAppContext|workspace|currentWorkspace|workspaces|redirect\" src/app/[locale]/app/dashboard src/app/[locale]/app/page.tsx -g '"'!node_modules'"'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 289ms:
src/app/[locale]/app/page.tsx:1:// Phase 4.x task_05 — /app default landing redirect to /app/dashboard.
src/app/[locale]/app/page.tsx:3:// Phase 2 routed clients to /app/commission (now redirected to /app/projects)
src/app/[locale]/app/page.tsx:4:// and other workspace members to a Projects empty-state. Phase 4
src/app/[locale]/app/page.tsx:6:// (Brand workspace dashboard with count cards + recent RFPs).
src/app/[locale]/app/page.tsx:11:import { redirect } from "next/navigation";
src/app/[locale]/app/page.tsx:17:export default async function AppLandingPage({ params }: Props) {
src/app/[locale]/app/page.tsx:19:  redirect(`/${locale}/app/dashboard`);
src/app/[locale]/app/dashboard\page.tsx:1:// Phase 4.x task_05 — Brand workspace dashboard (/app/dashboard).
src/app/[locale]/app/dashboard\page.tsx:4:// recent RFPs scoped to the active workspace via workspace_members
src/app/[locale]/app/dashboard\page.tsx:7:// Authorization: any workspace member can view their own workspace's
src/app/[locale]/app/dashboard\page.tsx:8:// dashboard. Cross-workspace SELECT is blocked by projects RLS (the
src/app/[locale]/app/dashboard\page.tsx:9:// SELECT policy already enforces workspace_member). The workspace_id
src/app/[locale]/app/dashboard\page.tsx:10:// comes from the user's first workspace membership (Phase 4 has
src/app/[locale]/app/dashboard\page.tsx:11:// single active workspace via cookie in task_06; for now Phase 4
src/app/[locale]/app/dashboard\page.tsx:20:// other workspaces.
src/app/[locale]/app/dashboard\page.tsx:23:import { redirect } from "next/navigation";
src/app/[locale]/app/dashboard\page.tsx:59:export default async function DashboardPage({ params }: Props) {
src/app/[locale]/app/dashboard\page.tsx:68:  if (!user) redirect(`/${locale}/signin`);
src/app/[locale]/app/dashboard\page.tsx:70:  // Resolve active workspace: Phase 4 uses the user's first membership
src/app/[locale]/app/dashboard\page.tsx:71:  // as the implicit active workspace. task_06 introduces an explicit
src/app/[locale]/app/dashboard\page.tsx:74:    .from("workspace_members")
src/app/[locale]/app/dashboard\page.tsx:75:    .select("workspace_id")
src/app/[locale]/app/dashboard\page.tsx:80:  if (!membership?.workspace_id) {
src/app/[locale]/app/dashboard\page.tsx:81:    redirect(`/${locale}/onboarding`);
src/app/[locale]/app/dashboard\page.tsx:83:  const workspaceId = membership!.workspace_id;
src/app/[locale]/app/dashboard\page.tsx:95:        .eq("workspace_id", workspaceId)
src/app/[locale]/app/dashboard\page.tsx:100:        .eq("workspace_id", workspaceId)
src/app/[locale]/app/dashboard\page.tsx:105:        .eq("workspace_id", workspaceId)
src/app/[locale]/app/dashboard\page.tsx:119:    .eq("workspace_id", workspaceId)

codex
## Finding F1 — Additive CHECK Widening
- Severity: LOW
- Surface: `supabase/migrations/20260501100806_phase_4_x_widen_profile_role_enum.sql:21-28`
- Verdict: PASS.
- Reasoning: The new constraint is a strict superset of the prior `creator/studio/observer/client/NULL` allowlist, so existing valid rows remain valid. Since the migration already applied in prod, PostgreSQL necessarily validated the table at `ADD CONSTRAINT` time; no existing row was silently invalidated.
- Proposed fix: no fix needed.

## Finding F2 — RLS Literal Role Consumers
- Severity: LOW
- Surface: `supabase/migrations/20260423030001_phase_2_5_g1_hardening.sql:131-165`, `supabase/migrations/20260425000000_phase_2_7_commission_soft_launch.sql:148-207`
- Verdict: PASS for artist widening; one unrelated stale admin-policy smell.
- Reasoning: `creators_update_self`, `studios_update_self`, client insert policies, and challenge submission policies use exact literals, so `artist` does not inherit creator/studio/client capabilities. Challenge/commission paths fail closed for `artist`. Separate from this migration, `project_licenses` checks `profiles.role = 'yagi_admin'` instead of `is_yagi_admin()` even though yagi admin lives in `user_roles`; that denies admin license access but does not create an artist bypass.
- Proposed fix: before Phase 6 license work, replace `profiles.role = 'yagi_admin'` checks in `supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:73-103` with `public.is_yagi_admin(auth.uid())`.

## Finding F3 — Role Transition Trigger
- Severity: LOW
- Surface: `supabase/migrations/20260425000000_phase_2_7_commission_soft_launch.sql:321-375`
- Verdict: PASS, with expected service-role dependency.
- Reasoning: `validate_profile_role_transition` blocks user-driven `client -> artist` because any `OLD.role = 'client'` change is rejected for non-admin callers. The bootstrap succeeds because service-role writes have `auth.uid() IS NULL` and return before transition checks; that is an intentional trusted-context bypass, not an unintended public path.
- Proposed fix: no fix needed; document future artist admin tools must use yagi-admin/service-role paths.

## Finding F4 — Signup Trigger Sequencing
- Severity: LOW
- Surface: `supabase/migrations/20260501095935_phase_4_x_auto_profile_on_signup.sql:19-66`, `scripts/create-artist-account.ts:47-84`
- Verdict: PASS.
- Reasoning: `auth.admin.createUser` fires `handle_new_user`, creating a `profiles` row with `role='client'`; the script then upserts the same `id` to `role='artist'`. Because the second write is service-role, it survives the transition trigger as designed. The double-write is observable but deterministic.
- Proposed fix: no fix needed.

## Finding F5 — ProfileRole Exhaustiveness
- Severity: LOW
- Surface: `src/lib/app/context.ts:19`, `src/components/app/sidebar-user-menu.tsx:45-57`
- Verdict: PASS.
- Reasoning: `ProfileRole` now includes `"artist"`, and the only `switch (profile.role)` has an `"artist"` case plus `default`. Grep found no Zod enum for `profiles.role` and no no-default exhaustive switch that lost compile-time coverage.
- Proposed fix: no fix needed.

## Finding F6 — Phase 5 Staleness
- Severity: LOW
- Surface: `.yagi-autobuild/ARCHITECTURE.md:522-524`, `.yagi-autobuild/DECISIONS_CACHE.md:1217-1219`
- Verdict: MINOR STALE DOCS, no stale migration found.
- Reasoning: I found no Phase 5 migration file that would re-add the old CHECK. Some planning docs still say `artist` is “future” or “after enum extension migration,” which is now stale after the Phase 4.x pull-forward.
- Proposed fix: patch the Phase 5 notes to say `profiles.role='artist'` was already widened in `20260501100806`; Phase 5 should add intake/workspace/profile surfaces only.

## Finding F7 — Admin Helper Independence
- Severity: LOW
- Surface: `supabase/migrations/20260422120000_phase_2_0_baseline.sql:154-185`
- Verdict: PASS for helpers.
- Reasoning: `is_yagi_admin` reads `user_roles.role='yagi_admin'`; `is_ws_admin` reads `workspace_members.role='admin'`. Neither depends on `profiles.role`, so adding `artist` does not affect those helpers or `role_switched_at`.
- Proposed fix: no fix needed for helpers.

## Finding F8 — DROP + ADD Atomicity
- Severity: LOW
- Surface: `supabase/migrations/20260501100806_phase_4_x_widen_profile_role_enum.sql:21-28`
- Verdict: PASS.
- Reasoning: Supabase migrations are applied transactionally; if `ADD CONSTRAINT` had failed validation, the preceding `DROP CONSTRAINT` would roll back too. The only operational cost is a brief `ACCESS EXCLUSIVE` lock on `profiles`.
- Proposed fix: no fix needed.

## Finding F9 — Server Actions And RPC Checks
- Severity: LOW
- Surface: `src/lib/commission/actions.ts:42`, `src/app/challenges/[slug]/submit/actions.ts:71-74`, `supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:256-310`
- Verdict: PASS, fail-closed.
- Reasoning: Commission actions require `profile.role === 'client'`; challenge submit paths require `creator|studio`; project transition RPC actor roles are `client/yagi_admin/workspace_admin/system` and are derived from ownership/user_roles, not `profiles.role`. `artist` therefore receives no unintended server-action or RPC privilege.
- Proposed fix: no fix needed.

## Finding F10 — Artist Demo Landing
- Severity: LOW
- Surface: `src/app/[locale]/app/layout.tsx:37-45`, `.yagi-autobuild/phase-4-x/_artist_account_created.md:80-83`
- Verdict: KNOWN UX GAP.
- Reasoning: `artist@yagiworkshop.xyz` has no workspace membership and `role==='artist'` is not exempt like `client`, so app entry redirects to `/onboarding/workspace`. This is documented as expected until Phase 5, but it means the `"Artist"` sidebar badge is not visible unless the account first creates or receives a workspace.
- Proposed fix: no prod migration fix needed. Phase 5 should add an artist holding surface or create an artist workspace/member bootstrap path.

Verdict: HIGH-A 0 / HIGH-B 0 / MED-A 0. Recommend APPLY/KEEP APPLIED; only LOW followups remain.
2026-05-01T14:09:14.217128Z ERROR codex_core::session: failed to record rollout items: thread 019de3dd-048e-7850-ad73-976e01d0b2db not found
tokens used
119,971
## Finding F1 — Additive CHECK Widening
- Severity: LOW
- Surface: `supabase/migrations/20260501100806_phase_4_x_widen_profile_role_enum.sql:21-28`
- Verdict: PASS.
- Reasoning: The new constraint is a strict superset of the prior `creator/studio/observer/client/NULL` allowlist, so existing valid rows remain valid. Since the migration already applied in prod, PostgreSQL necessarily validated the table at `ADD CONSTRAINT` time; no existing row was silently invalidated.
- Proposed fix: no fix needed.

## Finding F2 — RLS Literal Role Consumers
- Severity: LOW
- Surface: `supabase/migrations/20260423030001_phase_2_5_g1_hardening.sql:131-165`, `supabase/migrations/20260425000000_phase_2_7_commission_soft_launch.sql:148-207`
- Verdict: PASS for artist widening; one unrelated stale admin-policy smell.
- Reasoning: `creators_update_self`, `studios_update_self`, client insert policies, and challenge submission policies use exact literals, so `artist` does not inherit creator/studio/client capabilities. Challenge/commission paths fail closed for `artist`. Separate from this migration, `project_licenses` checks `profiles.role = 'yagi_admin'` instead of `is_yagi_admin()` even though yagi admin lives in `user_roles`; that denies admin license access but does not create an artist bypass.
- Proposed fix: before Phase 6 license work, replace `profiles.role = 'yagi_admin'` checks in `supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:73-103` with `public.is_yagi_admin(auth.uid())`.

## Finding F3 — Role Transition Trigger
- Severity: LOW
- Surface: `supabase/migrations/20260425000000_phase_2_7_commission_soft_launch.sql:321-375`
- Verdict: PASS, with expected service-role dependency.
- Reasoning: `validate_profile_role_transition` blocks user-driven `client -> artist` because any `OLD.role = 'client'` change is rejected for non-admin callers. The bootstrap succeeds because service-role writes have `auth.uid() IS NULL` and return before transition checks; that is an intentional trusted-context bypass, not an unintended public path.
- Proposed fix: no fix needed; document future artist admin tools must use yagi-admin/service-role paths.

## Finding F4 — Signup Trigger Sequencing
- Severity: LOW
- Surface: `supabase/migrations/20260501095935_phase_4_x_auto_profile_on_signup.sql:19-66`, `scripts/create-artist-account.ts:47-84`
- Verdict: PASS.
- Reasoning: `auth.admin.createUser` fires `handle_new_user`, creating a `profiles` row with `role='client'`; the script then upserts the same `id` to `role='artist'`. Because the second write is service-role, it survives the transition trigger as designed. The double-write is observable but deterministic.
- Proposed fix: no fix needed.

## Finding F5 — ProfileRole Exhaustiveness
- Severity: LOW
- Surface: `src/lib/app/context.ts:19`, `src/components/app/sidebar-user-menu.tsx:45-57`
- Verdict: PASS.
- Reasoning: `ProfileRole` now includes `"artist"`, and the only `switch (profile.role)` has an `"artist"` case plus `default`. Grep found no Zod enum for `profiles.role` and no no-default exhaustive switch that lost compile-time coverage.
- Proposed fix: no fix needed.

## Finding F6 — Phase 5 Staleness
- Severity: LOW
- Surface: `.yagi-autobuild/ARCHITECTURE.md:522-524`, `.yagi-autobuild/DECISIONS_CACHE.md:1217-1219`
- Verdict: MINOR STALE DOCS, no stale migration found.
- Reasoning: I found no Phase 5 migration file that would re-add the old CHECK. Some planning docs still say `artist` is “future” or “after enum extension migration,” which is now stale after the Phase 4.x pull-forward.
- Proposed fix: patch the Phase 5 notes to say `profiles.role='artist'` was already widened in `20260501100806`; Phase 5 should add intake/workspace/profile surfaces only.

## Finding F7 — Admin Helper Independence
- Severity: LOW
- Surface: `supabase/migrations/20260422120000_phase_2_0_baseline.sql:154-185`
- Verdict: PASS for helpers.
- Reasoning: `is_yagi_admin` reads `user_roles.role='yagi_admin'`; `is_ws_admin` reads `workspace_members.role='admin'`. Neither depends on `profiles.role`, so adding `artist` does not affect those helpers or `role_switched_at`.
- Proposed fix: no fix needed for helpers.

## Finding F8 — DROP + ADD Atomicity
- Severity: LOW
- Surface: `supabase/migrations/20260501100806_phase_4_x_widen_profile_role_enum.sql:21-28`
- Verdict: PASS.
- Reasoning: Supabase migrations are applied transactionally; if `ADD CONSTRAINT` had failed validation, the preceding `DROP CONSTRAINT` would roll back too. The only operational cost is a brief `ACCESS EXCLUSIVE` lock on `profiles`.
- Proposed fix: no fix needed.

## Finding F9 — Server Actions And RPC Checks
- Severity: LOW
- Surface: `src/lib/commission/actions.ts:42`, `src/app/challenges/[slug]/submit/actions.ts:71-74`, `supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:256-310`
- Verdict: PASS, fail-closed.
- Reasoning: Commission actions require `profile.role === 'client'`; challenge submit paths require `creator|studio`; project transition RPC actor roles are `client/yagi_admin/workspace_admin/system` and are derived from ownership/user_roles, not `profiles.role`. `artist` therefore receives no unintended server-action or RPC privilege.
- Proposed fix: no fix needed.

## Finding F10 — Artist Demo Landing
- Severity: LOW
- Surface: `src/app/[locale]/app/layout.tsx:37-45`, `.yagi-autobuild/phase-4-x/_artist_account_created.md:80-83`
- Verdict: KNOWN UX GAP.
- Reasoning: `artist@yagiworkshop.xyz` has no workspace membership and `role==='artist'` is not exempt like `client`, so app entry redirects to `/onboarding/workspace`. This is documented as expected until Phase 5, but it means the `"Artist"` sidebar badge is not visible unless the account first creates or receives a workspace.
- Proposed fix: no prod migration fix needed. Phase 5 should add an artist holding surface or create an artist workspace/member bootstrap path.

Verdict: HIGH-A 0 / HIGH-B 0 / MED-A 0. Recommend APPLY/KEEP APPLIED; only LOW followups remain.
