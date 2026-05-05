Phase 6 Wave A — K-05 LOOP-3 (Tier 1 HIGH; second-cycle inline fix).

Re-review after LOOP-2 inline fixes. Per CODEX_TRIAGE.md max 2 auto-fix
cycles before escalating; this is cycle 2.

## LOOP-2 verdict (NEEDS-ATTENTION, 2 MED-A)

- F1 MED-A: owner_user_id FK contradiction — `ON DELETE SET NULL` +
  `NOT NULL` would block auth user deletion with a confusing FK error.
  Recommended fix: align FK action with intent (CASCADE or RESTRICT).
- F2 MED-A: complete-onboarding zod regex `/^[A-Za-z0-9._]+$/` accepts
  `.yagi`, `yagi.`, `ya..gi` — Instagram disallows these. Recommended
  fix: reuse the repo's `validateInstagramHandle()` from
  `src/lib/handles/instagram.ts`.

## LOOP-3 changes

### Migration: `supabase/migrations/20260505123000_phase_6_artist_profile_owner_hardening.sql`
- FK action changed from `ON DELETE SET NULL` to `ON DELETE CASCADE`
  (line 44, formerly line 35). Rationale: CASCADE is the cleaner intent
  given NOT NULL — auth user delete removes the profile row with them.
  The parent workspace remains (orphan workspace garbage collection is
  registered as FU-6-A-orphan-artist-workspace-gc).
- COMMENT ON COLUMN updated to document CASCADE behavior.

### App layer: `src/app/[locale]/onboarding/artist/_actions/complete-onboarding.ts`
- Replaced the local `pipe(min/max/regex)` with two-step validation:
  zod surface check (`z.string().min(1).max(64)`) then
  `validateInstagramHandle(parsed.data.instagramHandle)`.
- Stores the canonical (lowercased, @-stripped) form via
  `handleResult.canonical`.
- Returns `error: "validation"` with `handleResult.error` as the
  message (one of EMPTY / TOO_LONG / INVALID_CHARS / CONSECUTIVE_DOTS
  / STARTS_OR_ENDS_WITH_DOT).

## Adversarial focus areas (LOOP-3 — narrow)

1. **FK action correctness.**
   (a) `ON DELETE CASCADE` on `auth.users(id)` FK — when the auth
       user is deleted, does the cascade fire correctly with no
       constraint conflicts? Specifically: the artist_profile row
       has its OWN cascade chain (workspace_id PK to
       workspaces(id) ON DELETE CASCADE from main migration). If
       we delete the auth user, owner_user_id cascade removes the
       artist_profile row directly — but the workspaces row
       remains. Confirm: does the cascade on owner_user_id correctly
       NOT trigger the workspace cascade? (It shouldn't — the FK
       is uni-directional from artist_profile → auth.users.)
   (b) Confirm: post-cascade, the workspace row remains with
       kind='artist' and 0 artist_profile rows. The
       FU-6-A-orphan-artist-workspace-gc covers eventual cleanup;
       not a blocker here.
   (c) The `NOT NULL` constraint is now consistent with CASCADE
       (deletion fully removes the row, never sets NULL). Confirm.

2. **Instagram validator reuse.**
   (a) `validateInstagramHandle()` strips leading @, validates
       (empty / too-long / invalid chars / consecutive dots /
       leading-or-trailing dot), and returns canonical lowercased
       form. Walk edge cases:
       - "@" → strip → "" → EMPTY ✓
       - ".yagi" → STARTS_OR_ENDS_WITH_DOT ✓
       - "yagi." → STARTS_OR_ENDS_WITH_DOT ✓
       - "ya..gi" → CONSECUTIVE_DOTS ✓
       - "Yagi.Workshop" → valid → canonical "yagi.workshop" ✓
       - "YagI" → valid → canonical "yagi" — the stored form is
         lowercased. Confirm the gate logic
         (`profile.instagram_handle === null`) doesn't care about
         case. It doesn't — gate only checks NULL.
   (b) Surface zod schema is now `z.string().min(1).max(64)` — looser
       than the validator. Confirm this is intentional: the surface
       check accepts up to 64 chars (allows the @-prefix + edge slop)
       so that the validator handles the proper rejection. Validator
       caps at 30 char post-strip. Result: a 64-char input is parsed
       by zod, then rejected by the validator with TOO_LONG. Path is
       coherent, but flag if the surface-vs-validator split feels
       brittle.
   (c) The `handleResult.error` is one of the 5 enum values; surfacing
       it as a free-text message in the action's return is OK for
       LOOP-3 but may be a future i18n concern. Not blocking.

## Already-deferred (do NOT flag again)

(Same list as LOOP-2 prompt, plus:)
- FU-6-A-orphan-artist-workspace-gc (after CASCADE decision)
- All K-06 MED/LOW (F4 disabled affordance, F5 silent redirect toast,
  F6 admin table tonality, F7 instagram input localize, F8 invite
  confirmation highlight, F9 typo, F10 max-width)

## Output format

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each NEW finding:
[FINDING N] CLASS: file:line — short description — recommended fix

If 0 NEW HIGH/MED findings: "VERDICT: CLEAN — Wave A composite ready
for ff-merge to phase branch."

End with one-line summary.
