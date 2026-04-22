# Hotfix — Onboarding Guard Regression

**Date:** 2026-04-21
**Scope:** Phase 1.1 regression (NOT Phase 1.2)
**Trigger:** User stuck after sign-up with profile but no workspace; misdiagnosed as "email auth error".

## Root cause

`src/app/[locale]/onboarding/page.tsx` redirected any user with a profile straight to `/app`, ignoring whether they had completed the workspace step. `src/app/[locale]/app/layout.tsx` then admitted the user (because `fetchAppContext` only requires a profile to return non-null), so the dashboard rendered with an empty sidebar ("No workspace") and a missing workspace name in the header. The user could never reach `/onboarding/workspace` again — clicking back to `/onboarding` always bounced to `/app`.

DB snapshot at time of report:
- `auth.users`: 1 (`yagi@yagiworkshop.xyz`, id `61d191b6-8b65-41b5-84af-72e84c00017a`)
- `profiles`: 1 (`yagi-admin`)
- `workspaces`, `workspace_members`, `user_roles`: **0**

`bootstrap_workspace` RPC verified working in isolation (test insert returned a valid id, rolled back).

## Fixes applied

### 1. `src/lib/onboarding/state.ts` — extend state shape

`OnboardingState` now exposes the two signals the routers need:
- `workspaceMembershipCount`: count from `workspace_members` for the user
- `hasGlobalRole`: true if a row exists in `user_roles` with `workspace_id IS NULL` and `role IN ('creator','yagi_admin')`

Removed the previous `role` / `workspaceId` fields (no other consumers — verified via grep across `src/`).

### 2. `src/app/[locale]/onboarding/page.tsx` — proper gating

```ts
if (!state) → redirect /signin
if (!state.hasProfile) → render <RoleChoice />
if (workspaceMembershipCount >= 1 || hasGlobalRole) → redirect /app
else → redirect /onboarding/workspace
```

Each branch returns `null` after the next-intl `redirect()` call (next-intl's `redirect` is not typed `never`, same workaround already used in `app/layout.tsx`).

### 3. `src/app/[locale]/app/layout.tsx` — guard against empty-workspace entry

After `fetchAppContext()` succeeds, also gate:
```ts
const hasPrivilegedGlobalRole =
  ctx.roles.includes("yagi_admin") || ctx.roles.includes("creator");
if (ctx.workspaces.length === 0 && !hasPrivilegedGlobalRole) {
  redirect({ href: "/onboarding/workspace", locale });
  return null;
}
```

`yagi_admin` and `creator` are global-only roles whose dashboards do not depend on workspaces, so they pass through. Workspace-bound users (`workspace_admin` / `workspace_member` only) must have at least one membership.

## Test plan (browser, dev server already running on :3001)

1. Sign in as `yagi@yagiworkshop.xyz` (existing profile, 0 workspaces).
2. Expect: lands on `/ko/onboarding/workspace` (was: `/ko/app` with broken empty sidebar).
3. Submit workspace name "YAGI Workshop" → should redirect to `/ko/onboarding/brand`.
4. Skip brand → skip invite → land on `/ko/app` with sidebar showing the workspace.
5. Open `/ko/onboarding` directly → should redirect to `/ko/app` (now has membership).
6. Open `/ko/app` directly → should stay (now has workspace).

Verify via SQL after step 4:
```sql
select count(*) from workspaces;          -- 1
select count(*) from workspace_members;   -- 1 (admin)
select count(*) from user_roles;          -- 1 (workspace_admin, workspace_id set)
```

## Build check

Skipped per instruction — Phase 1.2 final build will catch any regression. HMR on the running dev server should reflect the changes immediately. tsc note: `redirect()` from `@/i18n/routing` is not typed as `never`; each branch follows it with `return null;`.

## Next step (deferred, NOT executed by hotfix)

Once user confirms workspace creation succeeded:
1. Run SQL: `insert into user_roles (user_id, role, workspace_id) values ('61d191b6-8b65-41b5-84af-72e84c00017a', 'yagi_admin', null);`
2. Verify count: 2 rows in `user_roles` (1 workspace_admin + 1 yagi_admin global).
3. Then proceed to Phase 1.2 spec ingestion.

---

## Fix 3 — Magic-link → Password auth

### Why

Magic-link emails were not arriving (Supabase free-tier rate limit / Site URL not configured for production). Target users have low technical literacy. Decision: switch to email + password for the dev phase. Google SSO will be added separately right before the Phase 1.6 launch.

### Changes

**`src/app/[locale]/(auth)/signin/page.tsx`** — rewritten
- Schema: `{ email, password (min 8) }`
- `supabase.auth.signInWithPassword(...)` on submit
- On success: `router.push("/onboarding")` (uses `useRouter` from `@/i18n/routing`; locale handled automatically). Onboarding gate (Fix 1) routes to `/app` or `/onboarding/workspace` as appropriate.
- Added "Forgot password?" link → `/forgot-password`
- Submit button label is `common.signin` (not "send link") since it now logs in directly.

**`src/app/[locale]/(auth)/signup/page.tsx`** — rewritten
- Schema: `{ email, password (min 8), passwordConfirm }` with `.refine` enforcing match (message key `password_mismatch`, translated client-side)
- `supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${siteUrl}/auth/callback` } })`
- If `data.session` is non-null (email confirmation disabled in Supabase) → `router.push("/onboarding")`
- Else (email confirmation enabled) → toast `signup_email_sent`. User clicks the confirmation link → callback → onboarding flow.

**`src/app/[locale]/(auth)/forgot-password/page.tsx`** — new
- Email field. Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl}/auth/callback?type=recovery` })`.
- On success: success toast + inline confirmation panel (form replaced).

**`src/app/[locale]/(auth)/reset-password/page.tsx`** — new
- Two password fields with confirmation match.
- Calls `supabase.auth.updateUser({ password })`. On success, signs out (so the recovery session is discarded) and redirects to `/signin`.
- The user must arrive here with a valid recovery session set by the callback.

**`src/app/auth/callback/route.ts`** — extended
- Reads `type` query param.
- After `exchangeCodeForSession`, if `type === "recovery"` → redirect to `/${locale}/reset-password`.
- All other paths unchanged (no profile → onboarding; with profile → optional `next` param or `/app`).

**`messages/ko.json` + `messages/en.json`** — `auth` namespace
- Replaced `signin_sub` / `signup_sub` to drop magic-link wording.
- Added: `password_label`, `password_ph`, `password_confirm_label`, `password_mismatch`, `forgot_password`, `reset_password_title`, `reset_password_sub`, `reset_link_sent`, `new_password_title`, `back_to_signin`, `signup_email_sent`.
- Repurposed `send_link` → "Send reset link" / "재설정 링크 보내기" (only used by the forgot-password page now). `link_sent` left in place but unused after this change; harmless.

**Sweep:** `grep signInWithOtp src/` returns no matches.

### Test plan (browser, dev server :3001)

Pre-conditions (user-driven, NOT executed by Builder):
- In Supabase dashboard, set Site URL to `http://localhost:3001` and toggle Email Confirmation off (or keep on if you want to test the email-confirmation branch).
- Optionally delete the existing `auth.users` row for `yagi@yagiworkshop.xyz` to test fresh signup.

Then:
1. `/ko/signup` → enter email + password (8+) + confirm → submit. Expect either direct redirect to `/ko/onboarding` (confirmation off) or success toast (confirmation on; then click email link).
2. After onboarding (role → profile → workspace) lands on `/ko/app`.
3. `/ko/signin` → email + password → submit → redirect to `/ko/onboarding` → onboarding gate routes you to `/ko/app` (now with workspace + global role if applicable).
4. `/ko/forgot-password` → enter email → success toast → check email → click link → arrives at `/ko/reset-password` with valid session → set new password → signed out + redirected to `/ko/signin` → sign in with new password works.

### Build

Skipped per instruction. HMR on the running dev server reflects the changes.
