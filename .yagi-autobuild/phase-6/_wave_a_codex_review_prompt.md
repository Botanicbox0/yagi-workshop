Phase 6 Wave A — K-05 LOOP 1 (Tier 1 HIGH).

Adversarial review of Wave A: artist_profile schema + RLS + column grants (A.1), workspace switcher UI (A.2), Artist invite + 1-step onboarding + admin tool (A.3).

## Files in scope (~13 files)

NEW (server-side / DB):
- `supabase/migrations/20260505000000_phase_6_artist_profile.sql` — table + 4 RLS policies + REVOKE/GRANT column lockdown + DO-block self-asserts
- `src/app/[locale]/app/admin/artists/_actions/invite-artist.ts` — yagi_admin-only server action; service-role for auth.admin.inviteUserByEmail + workspaces/workspace_members/artist_profile INSERTs
- `src/app/[locale]/onboarding/artist/_actions/complete-onboarding.ts` — workspace_member-only; UPDATE artist_profile.instagram_handle (column-grant-permitted)
- `src/lib/auth/artist-onboarding-gate.ts` — helper used in `/[locale]/app/layout.tsx` to redirect Artist users with NULL instagram_handle to /onboarding/artist

NEW (UI):
- `src/app/[locale]/app/admin/artists/page.tsx` + `_components/invite-artist-form.tsx` + `_components/invite-artist-section.tsx`
- `src/app/[locale]/onboarding/artist/page.tsx` + `_components/onboarding-form.tsx`
- `src/components/sidebar/workspace-switcher.tsx` (modified — added isYagiAdmin gate)

MODIFIED:
- `src/components/app/sidebar.tsx` — passes isYagiAdmin prop to switcher
- `src/lib/workspace/active.ts` — Artist workspace default-on-sign-in logic
- `src/app/[locale]/app/layout.tsx` — wired onboarding gate
- `messages/{ko,en}.json` — `workspace_switcher` + `admin_artists` + `onboarding_artist` namespaces

## L-049 Mandatory RLS multi-role audit

For artist_profile, walk USING + WITH CHECK from each role separately:

  1. As `client` (auth.uid() = workspace_member, no admin role):
     - SELECT: USING `EXISTS (workspace_members WHERE user_id = auth.uid())` → permitted for own row only
     - INSERT: WITH CHECK `is_yagi_admin(auth.uid())` → DENIED. Self-invite blocked.
     - UPDATE: USING + WITH CHECK both pass for own row. Column GRANT restricts to (display_name, short_bio, instagram_handle, updated_at).
     - DELETE: USING `is_yagi_admin(auth.uid())` → DENIED.
  2. As `ws_admin` (workspace_admin role for the project's workspace):
     - Same as client (no special policy branch). The ws_admin role has no special INSERT/DELETE on artist_profile — only yagi_admin does.
  3. As `yagi_admin`: full SELECT/INSERT/UPDATE/DELETE permitted. Service-role tooling preferred for column-grant-restricted writes.
  4. As `different-user same-workspace`:
     - workspace_members JOIN fails (not a member of THIS workspace's row)
     - SELECT/UPDATE denied; INSERT blocked by yagi_admin gate; DELETE denied.

Confirm:
- Every column write the action layer performs is permitted by the WITH CHECK + column GRANT for the role making the call.
- No column write depends on `is_yagi_admin` bypass that isn't routed through `createSupabaseService()`.
- Specifically check: completeArtistOnboardingAction's `instagram_handle UPDATE` uses `createSupabaseServer()` (user-scoped) and depends on the column GRANT permitting it. Confirm `instagram_handle` is in the granted column set.

## Adversarial focus areas

1. **inviteArtistAction yagi_admin guard.** Service-role bypasses RLS. The ONLY barrier is the action's own `is_yagi_admin` check. Confirm:
   (a) `auth.getUser()` is called first; null user → unauthenticated.
   (b) The yagi_admin check uses `user_roles` table query (or is_yagi_admin SQL function); the check actually validates the caller is yagi_admin (e.g., not just `role !== 'client'`).
   (c) The check happens BEFORE any service-role write.
   (d) zod input validation is comprehensive (email format, displayName required, shortBio max length).
   (e) If the inviteUserByEmail succeeds but workspaces/workspace_members/artist_profile INSERTs fail, partial state cleanup logic (best-effort).

2. **inviteArtistAction service-role write authorization.** Service-role bypasses RLS but:
   (a) The workspace INSERT must use a deterministic kind='artist' value (not user-controlled).
   (b) The workspace_members INSERT must use the invited user's ID (from inviteUserByEmail return), not the caller's. Confirm the return value is captured correctly.
   (c) The artist_profile INSERT writes the new workspace_id (from the workspaces INSERT return), not a user-supplied ID.

3. **completeArtistOnboardingAction multi-role audit.**
   (a) `auth.getUser()` first; null → unauthenticated.
   (b) Workspace_members JOIN to find the user's Artist workspace. Confirm: what if the user is a member of MULTIPLE Artist workspaces? Does the action handle it (pick first, error, or other)? Phase 6 lock = single Artist workspace per user, but defense-in-depth.
   (c) artist_profile fetch with `instagram_handle IS NULL` check is the idempotency guard. If the row is missing entirely (no artist_profile created — pre-A.3 invite race) → action returns clean error, not crash.
   (d) The UPDATE uses `createSupabaseServer()` (user-scoped). Confirm column GRANT permits the write (instagram_handle is in the granted column set per A.1 migration).
   (e) Trim/normalize Instagram handle (e.g., strip leading @). zod refine? Length check?

4. **Onboarding gate placement.** `src/lib/auth/artist-onboarding-gate.ts` is called from `/[locale]/app/layout.tsx`. Confirm:
   (a) Runs AFTER `resolveActiveWorkspace` so workspace.kind is known.
   (b) Redirects to `/[locale]/onboarding/artist` only when `workspace.kind === 'artist'` AND `artist_profile.instagram_handle IS NULL`.
   (c) The redirect URL uses the user's locale, not a hardcoded one.
   (d) `/onboarding/artist` is OUTSIDE `/app/*` so the redirect doesn't loop.
   (e) Direct URL access to `/[locale]/app/projects` etc. is correctly intercepted by the layout — confirm no other intermediate routes bypass the gate.

5. **/admin/artists page authorization.** Page renders only for yagi_admin viewers. Confirm:
   (a) Defense-in-depth notFound() at the page top (before any DB read or render).
   (b) The status query for the table doesn't leak email_confirmed_at or other sensitive fields beyond what yagi_admin needs.
   (c) The form's shortBio is properly escaped on render (no HTML injection).

6. **Workspace switcher gate.** `+ 새 워크스페이스 만들기` is yagi_admin-only. Confirm:
   (a) The visibility check is server-rendered (passed as prop from a server component) so it can't be bypassed by the client toggling state.
   (b) Even if the client manages to render the item, clicking it calls a server action with its own yagi_admin check (defense-in-depth).
   (c) The Brand/Artist groups list ONLY workspaces the caller is a workspace_member of (RLS scopes the query).

7. **Active workspace resolver Artist preference.** `src/lib/workspace/active.ts` extended to prefer Artist workspace on sign-in. Confirm:
   (a) The resolver returns an Artist workspace ID only if the caller is a workspace_member of that workspace.
   (b) When the cookie points to a workspace the caller is no longer a member of (e.g., removed by admin), the fallback picks a valid membership, not garbage.
   (c) When user has 0 memberships, the resolver returns null cleanly (existing behavior preserved).

8. **Wording cross-check (yagi-wording-rules).** The skill's binding rule: NO internal-only term ("Roster", "Routing", "Inbound", "Talent-Initiated", "RFP", "D2C", "Approval Gate", "Bypass brands", "Auto-decline", "License fee", "Type N", "Curation note") in any KO i18n value or component label. EN "Roster" is allowed per skill.

   Spot-check ko.json + en.json for the new namespaces; flag any KO leakage.

## Already-deferred (do NOT flag again)

- Twin asset upload pipeline (Phase 7+)
- Permission dial UI (Phase 8 Wave E)
- Admin Queue Layer 2 (Phase 7)
- Match score algorithm (Phase 7+)
- License fee settlement (Phase 8)

## Output format

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each NEW finding:
[FINDING N] CLASS: file:line — short description — recommended fix

Severity guide:
- HIGH-A = clear path to anyone-invites-anyone or anyone-deletes-anyone. Inline fix mandatory.
- HIGH-B = subtle gap that gives unauthorized access under specific scenarios. Inline fix mandatory.
- MED-A = auto-fixable issue that doesn't expand attack surface. Builder inline fix.
- MED-B/C = scale-aware (<100 user). FU register acceptable.
- LOW = polish; FU only.

If 0 NEW HIGH/MED findings: "VERDICT: CLEAN — Wave A ready for ff-merge to phase branch."

End with one-line summary.
