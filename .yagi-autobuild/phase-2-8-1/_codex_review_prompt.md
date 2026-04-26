You are reviewing the Phase 2.8.1 hardening branch of the YAGI Workshop
codebase (Next.js 15 + Supabase + Postgres). The diff under review is
the entire range `main..HEAD` on branch `g-b-1-hardening`. Adopt the
adversarial-reviewer posture from `.yagi-autobuild/codex-review-protocol.md`.

## Review scope (10 gates)

| Gate   | Theme                                                  |
|--------|--------------------------------------------------------|
| G_B1-A | Form-action ESLint rule + CI grep guard                |
| G_B1-B | Wizard Step 2 → BriefBoardEditor draft mode            |
| G_B1-C | SSRF defense-in-depth (redirect / CGN / IPv6-compat)   |
| G_B1-D | Workspace → Workshop terminology sweep                 |
| G_B1-E | Phase 2.7.2 + 2.8 dead-code cleanup                    |
| G_B1-F | Tabs i18n + save_brief_version RPC + R2 round-trip     |
| G_B1-G | Playwright e2e + Korean IME spec                       |
| G_B1-H | ⭐ Commission flow integrity (CTA + intent + convert)   |
| G_B1-I | Projects hub IA (Brief default + contest tab off)      |
| G_B1-J | Wizard polish bundle (deliverable / slash / modal)     |

Migrations added (in order, atomic together):
  - `supabase/migrations/20260427000000_phase_2_8_1_wizard_draft.sql`
  - `supabase/migrations/20260427010000_phase_2_8_1_save_brief_version_rpc.sql`
  - `supabase/migrations/20260427020000_phase_2_8_1_commission_convert.sql`

These are unapplied to prod at review time; this is a composite review.

## Severity classification

Use the YAGI K-05 severity taxonomy (`.yagi-autobuild/CODEX_TRIAGE.md`
shorthand):

- **HIGH-A** : cross-tenant leak, privilege escalation, auth bypass.
  HALT regardless of loop budget — do NOT auto-fix.
- **HIGH-A-SCHEMA-ONLY** (Q-082): privilege escalation isolated to
  schema/RLS layer with no production data exposure AND additive fix.
  Loop 1 auto-fix permitted.
- **HIGH-B** : auth ok but logic flaw producing wrong result. Re-enter
  gate, loop budget 2.
- **HIGH-C** : input-validation gap with app-layer guard. Downgrade to
  MED, log, ship.
- **MED / LOW** : log to FOLLOWUPS, ship.

PASS = 0 HIGH-A AND 0 unhandled HIGH-B AND HIGH-A-SCHEMA-ONLY loop 2 PASS.

## Focus Areas by Gate Type

### Gate type: SECURITY DEFINER RPC (G_B1-F save_brief_version, G_B1-H convert_commission_to_project)

1. **auth.uid() is NULL bypass**. Confirm both RPCs raise on NULL caller
   instead of silently allowing. (Pattern: `IF v_caller IS NULL THEN
   RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501'`.)
2. **Authorization mirror parity**. Verify the explicit
   `is_yagi_admin(v_caller)` / `is_ws_member(v_caller, ws_id)` checks
   inside the RPC body match the RLS policies they replace. Any
   delta = HIGH-A.
3. **GRANT EXECUTE leakage**. Both functions are granted to
   `authenticated, service_role` only. Confirm REVOKE FROM PUBLIC
   precedes the GRANT.
4. **search_path pinning**. Confirm `SET search_path = public, pg_temp`
   in both. Missing pin = HIGH-A.
5. **Trigger interaction**. `validate_project_brief_change` (Phase 2.8)
   still fires on the UPDATE leg of save_brief_version. Confirm:
   - status doesn't change (RPC doesn't touch it)
   - tiptap_schema_version doesn't change
   - current_version increments by exactly 1
   - matching project_brief_versions row exists for the new
     current_version (RPC INSERTs versions BEFORE bumping current)
6. **Race correctness (G_B1-F)**. The RPC uses `FOR UPDATE` on
   project_briefs; concurrent calls serialize. UNIQUE
   (project_id, version_n) is the backstop. Confirm both layers cover
   the race.

### Gate type: Migration / schema (G_B1-B, G_B1-F, G_B1-H)

1. **commission_intakes_state_check**. The new CHECK adds 'converted'
   without losing any existing state value. DROP CONSTRAINT IF EXISTS
   precedes ADD CONSTRAINT — verify no rows would violate the new check
   at apply time (i.e., no row has state outside the union).
2. **Trigger replacement (validate_commission_intake_state_transition)**:
   - Adds submitted→converted, admin_responded→converted.
   - Adds column-guard for converted_to_project_id (non-admin cannot
     mutate). Ensure the convert RPC bypasses correctly via yagi_admin.
3. **Partial unique index (G_B1-B projects_wizard_draft_uniq)**:
   - Pre-INSERT dedup soft-archives older drafts. Verify the dedup
     logic keeps newest per (workspace, user) and the index then
     applies cleanly. CHECK count before/after.
4. **commission_intakes.converted_to_project_id FK**:
   - ON DELETE SET NULL — confirms intake history survives project
     deletion. ON DELETE CASCADE would lose audit history.
5. **Notification kind 'commission_converted'** is a new value. Confirm
   no notification kind enum / CHECK constraint blocks it (the
   `notification_events.kind` is plain text, no constraint).

### Gate type: Server Actions (G_B1-B, G_B1-H)

1. **ensureDraftProject race**: SELECT-then-INSERT with the partial
   unique index as backstop. The 23505 catch path re-SELECTs and
   returns the winning row. Confirm no orphan project_briefs row can
   be created on race.
2. **submitDraftProject ownership**: explicit `created_by = user.id`
   filter on UPDATE. Confirm RLS would also block but the explicit
   filter avoids returning `not_found` vs `forbidden` ambiguity.
3. **convertCommissionToProject**: server action checks is_yagi_admin
   before invoking the RPC. The RPC also checks. Defense-in-depth ok.
4. **revalidatePath calls** match the route shape (`/[locale]/app/...`).
   Stale data after action would be the worst case — no security
   implications, but flag any obvious regressions.

### Gate type: SSRF (G_B1-C)

1. `validateHost` from `src/lib/ip-classify.ts` is reused per redirect
   hop. Confirm fetchOgFallback in
   `src/app/[locale]/app/projects/[id]/brief/actions.ts`:
   - Uses `redirect: 'manual'`.
   - Validates the URL on every hop including hop 0.
   - Caps hops at 5.
   - Resolves `Location` against `currentUrl` (relative redirects).
   - Refuses on missing Location, malformed URL, or fetch throw.
2. The OLD local helpers (isPrivateIp, isPrivateIpv4Octets,
   isHostnameSafe, normalizeIp) are deleted. Confirm no other module
   depends on them.
3. The regression test
   `scripts/test-ssrf-defense.mjs` mirrors the algorithm in
   `src/lib/ip-classify.ts`. Spot-check that the cases cover:
   169.254.169.254 → blocked, 100.65.0.1 → blocked, ::7f00:1 → blocked.

### Gate type: i18n / UI surface (G_B1-D, G_B1-E, G_B1-I, G_B1-J)

1. **Workshop sweep**: any user-facing "Workspace" / "워크스페이스" that
   slipped through. DB column names (workspace_id, workspace_admin)
   MUST stay. i18n key NAMES MUST stay (only values changed).
2. **Dead-code removal**: confirm i18n keys deleted in G_B1-E
   (intake_mode_*, proposal_*, nav.commission) have no remaining
   `t("intake_mode_...")` callers. Runtime error if missed.
3. **Default tab=brief regression**: legacy `?tab=overview` still
   resolves; `searchParams.tab` not a string → default to brief.
4. **Contest tab removal**: i18n keys (`contest_tab`, `empty_contest`)
   are intentionally retained for Phase 3.0+ — flag if removed.

### Gate type: Anonymous → signup intent (G_B1-H F-PUX-003)

1. `sanitizeNext` in signup/page.tsx must reject:
   - any URL not starting with `/`
   - protocol-relative `//`
   - `/auth/callback` (loop)
   - URL > 500 chars
   Cross-origin bypass = HIGH-A (open redirect).
2. Auth callback route honors `next` only when it starts with `/` and
   is not protocol-relative. Confirm the `safeNext` filter in
   `src/app/auth/callback/route.ts` matches.
3. emailRedirectTo is built with `encodeURIComponent(next)` — confirm
   no double-encode and no missing-encode.

### Gate type: ESLint rule (G_B1-A)

1. `no-async-form-action` rule in eslint.config.mjs:
   - Detects `"use client"` directive at file top before classifying.
   - Skips client components (rule scope is RSC files only).
   - Catches both ArrowFunctionExpression(async) and
     FunctionExpression(async) on JSXAttribute name='action'.
2. Test fixture `scripts/_fixtures/bad-rsc-form-action.tsx` deliberately
   triggers the rule. The dedicated config
   `scripts/_fixtures/eslint.fixture.mjs` strips ignores so the rule
   fires under the verify script.
3. Production bundle check: `eslint.config.mjs` cannot leak into the
   prod build. Confirm via Next.js convention (eslint.config.* not
   imported from src/).

## Already-deferred (do NOT raise as findings)

- F-PUX-001 / F-PUX-006 / F-PUX-009 / F-PUX-011 / F-PUX-013 / F-PUX-014
  / F-PUX-018 — Phase 2.10.
- F-PUX-017 — Phase 3.0+.
- Brief Board canvas-mode reevaluation, sidebar chat priority — Phase
  2.8.2 (separate SPEC).
- DECISIONS_CACHE Q-088 ProfileRole 4→2 narrowing of TS type + DB
  migration + studio/observer dead-code cleanup — Phase 3.0+.
- Real-time co-editing, AI-assisted brief generation — Phase 3.1+.
- Brief tab consolidation of references / preprod / threads — Phase
  2.10 (FU-2.10-overview-consolidation, called out in
  G_B1-I commit).
- Real OS-level Korean IME composition coverage in Playwright — Phase
  2.10 (FU-2.10-ime-composition-coverage).
- Live race + R2 round-trip test live runs require env credentials;
  tests skip gracefully when env is absent. This is by design.

## Output format

Return findings as a numbered list. For each finding:

- **Severity**: HIGH-A / HIGH-A-SCHEMA-ONLY / HIGH-B / HIGH-C / MED / LOW
- **Location**: `path/to/file.ts:LINE` (cite specifically)
- **Observation**: what's wrong
- **Exploit / regression scenario**: concrete attacker / user path
- **Proposed fix**: 1–3 lines, plain English

End with a one-line **Verdict**: `CLEAN`, `MEDIUM_ONLY`,
`HIGH_A_SCHEMA_ONLY=N`, `HIGH_A=N`, `HIGH_B=N`, etc.

Be terse. Skip generic "best practice" findings. Cite the diff. Do not
re-run the build / tests.
