# Phase 4.x — Wave C.5b Codex K-05 amendments result

**Window**: 2026-05-01 (lead Builder direct, no spawn). Codex 5.5
K-05 reviewer (gpt-5.5, reasoning=high) ran on amend_01 + amend_02.
**Branch**: `g-b-9-phase-4` (NOT pushed; NOT ff-merged to main)
**HEAD before this wave**: `0b21218` (post-rollback amendments
result)
**HEAD after final commit**: tracked at the bottom of this doc.
**Verify**: `pnpm exec tsc --noEmit` exit 0 / `pnpm lint`
baseline-pinned (3155 errors, identical to Wave C.5a baseline) /
`pnpm build` exit 0 (middleware 162 kB, +1kB vs sub_14 from auth
callback workspace lookups in F12 fix).

---

## Codex 5.5 K-05 reviewer activated

`~/.codex/config.toml` confirms `model = "gpt-5.5"` + `model_reasoning_effort = "high"`. Codex CLI v0.125.0. The retroactive review of the
already-applied amend_01 + amend_02 migrations replaces the prior
Opus 4.7 self-review fallback path; Opus self-review is now reserved
for Codex token / binary unavailable scenarios only.

---

## Amend summary (6 amends, 4 net-new commits + verification + result)

| amend | Subject | Commit | Codex verdict | Acceptance |
|---|---|---|---|---|
| 01 | Profile auto-create trigger — Codex LOOP 1+2 fix | `d28a006` | LOOP 1: HIGH-A 0 / HIGH-B 0 / **MED-A 2** (F1 search_path, F12 callback gate); both fixed inline. LOOP 2: 0/0/0, APPLY clean. | ✅ search_path now `public, pg_temp`; callback gate uses workspace state |
| 02 | Artist enum widening — Codex LOOP 1 only | `62b7586` | LOOP 1: 10 findings, all LOW. **HIGH-A 0 / HIGH-B 0 / MED-A 0**. APPLY/KEEP APPLIED clean. | ✅ no fixes needed |
| 03 | Yonsei creator → client reclassify (already done) | `8dd711f` (prior) | SKIP — data correction only | ✅ done in prior turn |
| 04 | FU-C5b-08 brand onboarding (already done) | `12e8c95` (prior) | SKIP — doc only | ✅ done in prior turn |
| 05 | wizard.step3.twin_intent.* i18n keys | `2ac49fc` | SKIP — i18n only | ✅ KO+EN keys added; tsc / JSON parse / build clean |
| 06 | Submit broken — provisional auto-resolution by amend_05 | `39048c5` | SKIP — diagnostic only | 🟡 awaiting yagi retest; 2 priors documented |
| Final | FU-C5b-09 meeting type/duration UX | (this commit) | SKIP — doc only | ✅ FU-C5b-09 registered |

Net-new for this wave (over the prior 0b21218):
- `d28a006` amend_01 Codex fixes (search_path migration + callback gate)
- `62b7586` amend_02 Codex review record
- `2ac49fc` amend_05 i18n keys
- `39048c5` amend_06 diagnostic
- (this commit) FU-C5b-09 + result doc

---

## amend_01 — Codex K-05 LOOP 1 → 2 fix path (the "real" review)

**LOOP 1 raw output**: `_amend01_codex_review_loop_1.md` (~227 KB,
12 findings audited).

The two MED-A findings the Opus self-review missed:

### F1 — search_path hardening (MED-A → FIXED)

- **Original migration**: `SET search_path = public`.
- **Codex objection**: PostgreSQL leaves `pg_temp` searchable before
  `public` unless `pg_temp` is explicitly listed last
  (https://www.postgresql.org/docs/current/sql-createfunction.html).
  The repo's stronger convention used by
  `transition_project_status` / `is_valid_transition` /
  `validate_profile_role_transition` is `search_path = public, pg_temp`.
  Not a live HIGH-A (no attacker-controlled execution path), but
  fails the convention bar.
- **Fix**: follow-up migration
  `supabase/migrations/20260501140308_phase_4_x_handle_new_user_search_path_hardening.sql`:

  ```sql
  ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
  ```

  Applied via Supabase MCP. Verified: `pg_proc.proconfig` now reads
  `[search_path=public, pg_temp]`.

### F12 — auth callback profile-existence gate stale (MED-A → FIXED)

- **Surface**: `src/app/auth/callback/route.ts:67-104` (pre-fix).
- **Codex objection**: with the new `handle_new_user` trigger,
  `profile` exists immediately after `exchangeCodeForSession`. The
  callback's `if (!profile) → /onboarding/workspace` gate no longer
  maps to "needs onboarding"; it maps to "DB schema corrupted". Real
  onboarding state should be checked against `workspace_members`
  count + global `user_roles`. With `?next=` flows, a freshly-
  confirmed user with no workspace could land on `/app` surfaces
  via `next` and hit `no_workspace` on project create.
- **Fix**: `src/app/auth/callback/route.ts` rewritten to query
  `workspace_members` count + `user_roles` (creator/yagi_admin with
  `workspace_id IS NULL`). Profile lookup retained only for locale
  resolution. RLS verified by Codex LOOP 2: own-membership SELECT
  satisfies `ws_members_read` (`is_ws_member`); `user_roles_read_self`
  covers the `user_id = auth.uid()` probe. No service-role
  requirement.

### LOOP 2 — verifier pass

`_amend01_codex_review_loop_2.md` confirmed:
- F1 fix correct.
- F12 fix correct, RLS-compatible, query semantics sound.
- No new findings introduced.
- **Final verdict: HIGH-A 0 / HIGH-B 0 / MED-A 0. APPLY (clean).**

---

## amend_02 — Codex K-05 LOOP 1 (no LOOP 2 needed)

**LOOP 1 raw output**: `_amend02_codex_review_loop_1.md` (~993 KB,
10 findings).

All 10 findings LOW. Verdict: APPLY/KEEP APPLIED.

Notable verifications:
- `creators_update_self` / `studios_update_self` policies use
  literal-string equality, NOT closed-world enum membership. Adding
  'artist' has no effect on whether a row matches `p.role = 'creator'`.
- `validate_profile_role_transition` short-circuits at `auth.uid()
  IS NULL` for service-role contexts; the artist UPSERT exercises
  that path cleanly.
- `handle_new_user` trigger writes `role='client'` first; the
  service-role admin upsert flips to `'artist'` afterward via PK
  conflict UPDATE. Sequence verified live by amend_02b bootstrap.
- `ProfileRole` TypeScript union extension to include `"artist"`
  doesn't break any switch — the only switch-on-role
  (`sidebar-user-menu.tsx`) already had a `default` arm and gained
  an explicit `case "artist"` branch.
- Phase 5 entry artist work won't be made stale; the enum widening
  is the prerequisite, not the deliverable.

---

## amend_05 — i18n drift fix

**Surface**: `messages/{ko,en}.json` `projects.wizard.step3` block.

The wizard component (`new-project-wizard.tsx:715` and nearby) reads
`wizard.step3.twin_intent.{label,tooltip,tooltip_aria,option.*}` —
keys that didn't exist. Existing copy lived under
`wizard.field.twin_intent.*`.

Fix: copy the existing field-namespace values into the step3
namespace. `field.twin_intent.*` block left in place (deferred
audit; cleanup belongs to a future sub_09-shape pass).

Codex review skipped per wave prompt — i18n only, no schema or
runtime behaviour change.

---

## amend_06 — Submit broken provisional auto-resolution

Static analysis of the submit chain
(`new-project-wizard.tsx:820-866` + `actions.ts:724-808`) found no
always-rejecting path. Most likely the submit appeared broken
because Step 3 was rendering raw i18n key strings (amend_05 surface),
making the form unreadable / radio labels cryptic.

amend_06 = **no-op** pending yagi retest on the post-amend_05 build.
Two priors logged in `_amend06_submit_diagnostic.md`:

A. Silent `validateStep3Fields` failure with inline-only errors
   (would benefit from a toast + scroll-to-error).
B. Server zod / RPC rejection — yagi can copy
   `[wizard.submit] failed:` from DevTools console for diagnosis.

If yagi retests and submit works → this commit closes amend_06.
If still broken → follow-up amend with the precise fix (no Codex
required unless RLS / RPC / migration is implicated).

---

## FU-C5b-09 registration

Added to `_followups.md` (top of file, ahead of FU-C5b-01..08). Spec
covered in the followup entry: replace meeting-duration radio with
meeting-type radio (online/offline) + optional location preference
field; new `meeting_type` + `location_preference` columns;
`duration_minutes` retained admin-side with server-default 60. Bundle
with FU-C5b-08 brand onboarding rework at Phase 4.x hotfix-1 or
Phase 5 entry IA cleanup.

---

## Verify (final)

```
pnpm exec tsc --noEmit  → exit 0
pnpm lint               → exit 1 baseline (3155 errors, identical to Wave C.5a)
pnpm build              → exit 0 (middleware 162 kB, +1kB vs sub_14 from
                                  auth callback workspace lookups)
```

Schema migrations recorded post-this-wave:

```
20260501095935  phase_4_x_auto_profile_on_signup           (prior wave)
20260501100806  phase_4_x_widen_profile_role_enum          (prior wave)
20260501140308  phase_4_x_handle_new_user_search_path_hardening   (this wave, amend_01 LOOP 1 fix)
```

---

## Followups status snapshot

| ID | Status |
|---|---|
| FU-C5b-01 (Phase 5 Artist Roster intake) | open |
| FU-C5b-02 (Supabase Dashboard email template paste) | open |
| FU-C5b-03 (Phase 7+ "+50개 이상" placeholder → real client logos) | open |
| FU-C5b-04 (Redaction font self-host) | open |
| FU-C5b-05 (border-border sweep) | ✅ closed (sub_00 ROLLBACK obsolete) |
| FU-C5b-06 (Supabase Dashboard redirect URLs allowlist) | open |
| FU-C5b-07 (dark editorial canvas as future option) | open |
| FU-C5b-08 (brand onboarding step rework) | open — Phase 4.x hotfix-1 or Phase 5 |
| FU-C5b-09 (meeting type/duration UX rework) | **NEW** open — bundle with FU-C5b-08 |

---

## Visual review checklist for yagi (post-Codex-amendments)

When `pnpm dev` resumes:

- [ ] Sign up at `/ko/signup` with a fresh email. Confirm the auth
      callback redirects to `/onboarding/workspace` (workspace gate)
      and that `public.profiles` shows a row auto-created (handle
      `c_<8 hex>`, role='client'). The post-amend_01-Codex-fix path
      no longer relies on `!profile` for routing.
- [ ] Walk `/ko/app/projects/new` Step 3 and confirm the Korean
      labels render (no raw `wizard.step3.twin_intent.*` keys).
- [ ] Click 의뢰 보내기 with all required fields filled. Expected:
      redirect to project detail page. If still broken, capture
      DevTools console output and post per
      `_amend06_submit_diagnostic.md`.
- [ ] Sign in as `artist@yagiworkshop.xyz` / `yagiworkshop12#$`.
      Sidebar user-menu badge should still read "Artist".
- [ ] No `creator` / `studio` profile rows visible anywhere in the
      app surfaces.

---

## STOP — Wave D not entered

Wave C.5b Codex K-05 amendments are COMPLETE per the prompt's STOP
point. **Wave D is NOT entered**. yagi must:

1. Re-walk every surface (post-rollback + post-amendments +
   post-Codex-fixes) per the checklist above.
2. Confirm the wizard submit path (amend_05/06).
3. Decide between Wave C.5d (more fixes), Wave D (K-05 + manual
   SQL verify + browser smoke + ff-merge), or stop here.
4. Trigger the chosen wave via Telegram / chat — Builder will not
   self-trigger.

`push 절대 X. ff-merge 절대 X.` (L-027 BROWSER_REQUIRED gate)
