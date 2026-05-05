Phase 6 Wave A — K-05 LOOP-2 (Tier 1 HIGH; composite review).

Re-review the Wave A surface AFTER inline fixes for the LOOP-1 findings.

## LOOP-1 verdict recap (NEEDS-ATTENTION, 4 findings)

- F1 HIGH-B: artist_profile RLS scoped to "any workspace_member" not the
  owner. Recommended fix: add owner_user_id, RLS keys on it.
- F2 HIGH-B: artist_onboarding_gate.ts let a missing artist_profile row
  pass `/app/*`. Recommended fix: treat `!profile` as also blocked.
- F3 MED-A: invite-artist.ts partial-state cleanup was logging-only.
  Recommended fix: best-effort delete auth user + workspace on insert
  failure.
- F4 MED-A: complete-onboarding.ts schema accepted "@" alone (passed
  min(1) before transform stripped it to ""). Recommended fix: normalize
  first, then validate non-empty + handle-safe regex.

## What changed for LOOP-2

### NEW migration (composite with main)

`supabase/migrations/20260505123000_phase_6_artist_profile_owner_hardening.sql`
- ADD COLUMN owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
- ALTER COLUMN owner_user_id SET NOT NULL (L-019 verified 0 existing rows
  → no backfill needed)
- CREATE INDEX idx_artist_profile_owner ON artist_profile(owner_user_id)
- DROP + recreate artist_profile_select / artist_profile_update policies
  keyed on `owner_user_id = auth.uid() OR is_yagi_admin(auth.uid())`
- Re-asserts column GRANT matrix in DO-block (incl. owner_user_id NOT
  granted to authenticated)

INSERT and DELETE policies (yagi_admin only) are unchanged.

### App-layer changes

1. `src/app/[locale]/app/admin/artists/_actions/invite-artist.ts`
   - artist_profile insert now sets `owner_user_id: invitedUserId`
   - cast through sbAny since types not regenerated yet
   - on workspace insert failure: cleanupAuthUser()
   - on member insert failure: cleanupWorkspace + cleanupAuthUser
     (workspace delete cascades to workspace_members + artist_profile
     via FK ON DELETE CASCADE)
   - on artist_profile insert failure: cleanupWorkspace + cleanupAuthUser
   - cleanup helpers log on cleanup failure but always return original
     error to caller

2. `src/lib/auth/artist-onboarding-gate.ts`
   - Now returns redirect on `!profile || profile.instagram_handle === null`
     (previously only the latter).
   - Also redirects on profile fetch error (previously let user through).

3. `src/app/[locale]/onboarding/artist/_actions/complete-onboarding.ts`
   - Zod schema: trim → max(31) → transform strip leading @ → pipe to
     z.string().min(1).max(30).regex(/^[A-Za-z0-9._]+$/)
   - "@" alone is now rejected (after strip → empty → min(1) fails)
   - Invalid characters (Unicode, spaces, etc.) rejected by regex

## Adversarial focus areas (LOOP-2)

1. **owner_user_id RLS posture (F1 fix).**
   (a) Does the new SELECT/UPDATE predicate (`owner_user_id = auth.uid()
       OR is_yagi_admin(auth.uid())`) leave any path for a non-owner
       workspace_member to read or update the row? Specifically: any
       JOIN/EXISTS/SECURITY DEFINER function that bypasses the
       predicate?
   (b) Is `owner_user_id NOT NULL` correctly enforced post-migration?
       (Defense-in-depth: a NULL owner would be invisible to all
       authenticated users, which is acceptable, but should not happen.)
   (c) The ON DELETE SET NULL on the FK to auth.users — if the auth
       user is deleted (e.g., admin reconciliation), owner_user_id
       becomes NULL. Result: row becomes unreadable to anyone except
       yagi_admin. Is this acceptable, or should it be ON DELETE
       CASCADE so the artist_profile row is also deleted? Note: the
       parent workspace would still exist with a now-orphan
       artist_profile row.
   (d) The DO-block self-asserts the GRANT matrix. Verify:
       - owner_user_id NOT in authenticated UPDATE GRANT (so an Artist
         cannot transfer ownership to themselves on a foreign row)
       - the existing 4 columns (display_name / short_bio /
         instagram_handle / updated_at) still GRANTed
   (e) The new index on owner_user_id — confirm it's not redundant
       with the existing PK on workspace_id. (It isn't — different
       column — but flag if it duplicates a pattern elsewhere.)

2. **inviteArtistAction owner_user_id wiring.**
   (a) The artist_profile insert sets `owner_user_id: invitedUserId`
       (not `user.id` of the caller). Verify this is the invited
       Artist's auth.users.id from `inviteData.user.id`, not the yagi_
       admin caller's id.
   (b) The sbAny cast is acceptable as a temporary measure until types
       are regenerated post-apply. Confirm the cast applies only to
       the artist_profile insert (workspace_members insert remains
       typed via `sbAdmin.from(...)`).

3. **Cleanup chain integrity (F3 fix).**
   (a) On workspace insert failure: cleanupAuthUser() only. Correct —
       no workspace was created.
   (b) On member insert failure: cleanupWorkspace + cleanupAuthUser.
       Verify: cascade delete via FK works for workspace_members. Note
       that the workspace_members row may not have been created (insert
       failed) so the cleanupWorkspace delete has nothing to cascade to
       for that row, which is fine.
   (c) On profile insert failure: cleanupWorkspace + cleanupAuthUser.
       Verify the cascade chain: deleting workspaces row → cascades to
       workspace_members + artist_profile. (Both FKs are ON DELETE
       CASCADE per main migration line 38: artist_profile.workspace_id
       PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE.)
   (d) cleanup helpers swallow their own failures and log only. Confirm
       this is the right tradeoff (vs failing the action with a
       compound error). The original error to the caller is still the
       primary failure cause.
   (e) Race: between cleanupAuthUser deleting the auth user and any
       later code path. The action returns immediately after cleanup,
       so no race within this action. Cross-action races (e.g., the
       invited user clicking the magic link before cleanup completes)
       are theoretically possible but very unlikely; flag if you see
       a tighter ordering.

4. **Onboarding gate (F2 fix).**
   (a) `!profile || profile.instagram_handle === null` — both branches
       redirect. Confirm there is no path where activeWorkspace.kind is
       'artist' AND profile is null AND the user is allowed through.
   (b) On profile fetch error: now redirects (was return null = let
       through). Verify this doesn't create a redirect loop (e.g., if
       /[locale]/onboarding/artist also fails to read the row, does the
       page itself loop?). The /onboarding/artist route is OUTSIDE
       /app/* so the gate doesn't run there, but verify the page's own
       error handling.
   (c) After F1 hardening: if a workspace_member is on an Artist
       workspace where they are NOT the owner (Phase 6 lock prevents
       this but defense-in-depth catches), RLS returns 0 rows. The
       gate sees `!profile` and redirects to /onboarding/artist. There
       the user cannot complete onboarding (RLS denies UPDATE). Result:
       they're locked out of /app/* until they switch workspaces. Is
       this the intended behavior?

5. **Instagram normalize (F4 fix).**
   (a) Schema chain: trim → max(31) → strip @ → pipe(min(1).max(30).
       regex(/^[A-Za-z0-9._]+$/)). Walk edge cases:
       - "@" → trim → "@" → max(31) ok → strip → "" → min(1) FAIL ✓
       - "" → trim → "" → max(31) ok → strip → "" → min(1) FAIL ✓
       - "  " → trim → "" → empty path ✓
       - "@@yagi" → trim → "@@yagi" → max(31) ok → strip → "@yagi" →
         regex FAIL (@ not in charset) ✓
       - "yagi.workshop" → ok
       - "yagi-workshop" → regex FAIL (hyphen not in Instagram charset)
         — confirm Instagram disallows hyphens. (Instagram's actual
         charset is letters, digits, period, underscore — confirmed.)
       - 30-char + 1 @ = 31 chars input → strip → 30-char output ✓
       - 31-char + 1 @ = 32 chars input → max(31) FAIL (could allow 32
         to be lenient, but tight is better). Acceptable.
   (b) Cyrillic / CJK characters: regex restricts to ASCII charset. EN
       Artists and KO Artists with romanized handles only. No CJK in
       Instagram handles per IG TOS.

## Already-deferred

- Twin asset upload pipeline (Phase 7+)
- Permission dial UI (Phase 8 Wave E)
- Admin Queue Layer 2 (Phase 7)
- Match score algorithm (Phase 7+)
- License fee settlement (Phase 8)
- Workspace switcher "+ 새 워크스페이스 만들기" disabled item (K-06 F4
  MED — defer to FU; Phase 7 scope per yagi)
- Onboarding silent-redirect toast (K-06 F5 MED)
- Admin table tonality polish (K-06 F6 MED)
- Instagram placeholder localization + @ prefix slot (K-06 F7 MED)
- Admin invite confirmation row highlight (K-06 F8 MED)
- "No workshop" → "No workspace" typo (K-06 F9 LOW; pre-existing)
- Admin page max-width (K-06 F10 LOW)

## Output format

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each NEW finding (NOT already-deferred):
[FINDING N] CLASS: file:line — short description — recommended fix

Severity guide unchanged from LOOP-1.

If 0 NEW HIGH/MED findings: "VERDICT: CLEAN — Wave A composite ready
for ff-merge to phase branch."

End with one-line summary.
