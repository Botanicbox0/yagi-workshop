# Phase 2.5 Launchpad X3 — Pre-flight findings

**Date:** 2026-04-23
**Scope:** investigation only — no migrations or code changes.
**Verdict:** 🟡 **PROCEED WITH CAVEATS** — no blocking unknowns; 3 items need resolution before or during G1/G3/G4.

---

## §1 — DB name collisions (PASS)

Queried `information_schema.tables` for all 9 Phase 2.5 G1 target table names against live `jvamvbpxnztynsccvcmr`:

```
user_profiles, creators, studios, challenges,
challenge_submissions, challenge_votes, challenge_judgments,
challenge_winners, reserved_handles
```

**Result: 0 collisions.** All names are free. G1 migration can create them without needing `DROP IF EXISTS` defensive clauses.

---

## §2 — Middleware routing (PASS with 1 addition needed during G6)

Current `src/middleware.ts` matcher:
```ts
"/((?!api|_next|_vercel|auth/callback|showcase|challenges|.*\\..*).*)"
```

| Route | Exclusion status | Notes |
|-------|------------------|-------|
| `/challenges/*` | ✅ excluded | Phase 2.1 G6 preemptive add |
| `/showcase/*` | ✅ excluded | Phase 2.1 G6 |
| `/u/<handle>` | ❌ **NOT excluded** | SPEC §3 G6 describes `/u/<handle>` as locale-free public profile. Without exclusion, next-intl will redirect `/u/yagi` → `/ko/u/yagi`, same symptom as the Phase 2.1 G6 showcase regression. |

**Action during G6 (profile surface build):** add `u` to the matcher exclusion list. One-line change; same pattern as Phase 2.1 G6 fix (`5855dd0`). Update matcher to:
```ts
"/((?!api|_next|_vercel|auth/callback|showcase|challenges|u|.*\\..*).*)"
```

This is documented here so the builder doesn't miss it during G6 and repeat the Phase 2.0 G6 L5 discovery pattern.

---

## §3 — R2 bucket state (CAVEAT — external prereq)

Searched `.env.local` + `.env.local.example` + `src/lib/`:

- No `R2_*` or `CLOUDFLARE_*` env vars present.
- No existing Cloudflare R2 client code in `src/lib/`.
- SPEC §6 Q2 and user's overnight kickoff both flag this as a known gap:
  - Q2 asks for CORS policy ownership.
  - Kickoff notes `yagi-challenge-submissions` bucket "needs manual provisioning + CORS config — Yagi handles post-wake (non-blocking)."
  - Kickoff fallback: "use yagi-models existing Cloudflare binding as reference pattern. New bucket yagi-challenge-submissions — if bucket not provisioned yet, use yagi-models temporarily with prefix..."

**Finding:** **there is no `yagi-models` binding in THIS repo.** The fallback reference pattern assumes an R2 client implementation that does not exist in `src/lib/`. Builder cannot "use yagi-models as reference" because yagi-models is external.

**Consequence:** G4 (submission flow) needs a full R2 client implementation, not just a configuration. This is a net-new integration, larger than the SPEC G4 "Direct-to-R2 upload via signed URL" line implies. Budget increase likely: G4 2-3h → 4-5h.

**Mitigation options (G4-time decisions):**
1. **Build minimal R2 client in Phase 2.5 G4** using `@aws-sdk/client-s3` (R2 speaks S3 API) — introduces one new dependency.
2. **Use Supabase Storage temporarily** — already configured, no new deps; migrate to R2 in Phase 2.6 when 야기 provisions the bucket properly.
3. **Stub the submission flow** at G4 — UI complete but submit is gated behind a TODO toast. Real upload wires in Phase 2.6.

Option 2 is the cleanest for this expedited phase. Documented for G4 decision time.

---

## §4 — `notification_events` schema adequacy (PASS)

Table definition checked via `pg_constraint`:

- `kind` column: `text NOT NULL`, **no CHECK constraint**. New kinds can be inserted freely without a migration.
- `severity` column: CHECK against `['high', 'medium', 'low']` — all 3 Phase 2.5 notifications (submission confirmed, closing-in-24h, announced) fit within this enum.
- FK relationships: `user_id → auth.users`, `workspace_id → workspaces`, `project_id → projects`. Phase 2.5 challenges aren't scoped to a project or workspace — `project_id` + `workspace_id` will be NULL for challenge-related events. All three FKs are nullable. ✓

**Finding:** No DB migration needed for new notification kinds. BUT the TypeScript side has a closed type union:

```ts
// src/lib/notifications/kinds.ts
export type NotificationKind =
  | "meeting_scheduled"
  | "meeting_summary_sent"
  | ...
  | "team_channel_mention";
```

And a `SEVERITY_BY_KIND` registry. Phase 2.5 G7 must extend both:
- Add 3 new kinds: `challenge_submission_confirmed`, `challenge_closing_soon`, `challenge_winner_announced`
- Add severity mapping per kind
- Add bilingual i18n keys in `messages/{ko,en}.json` for title/body templates

Listed here so G7 Builder doesn't miss it. This is 5-10 lines in kinds.ts + 6 lines across both messages files.

---

## §5 — Minor observations (non-blocking)

### §5.1 — User role 4-value extension
SPEC §1 lists 3 user-facing roles (Creator/Studio/Observer) plus §3 G5 references a 4th internal `admin` role. The existing `user_roles` table already has `yagi_admin`, `workspace_admin`, `workspace_member`, `creator` values (per Phase 2.0 contracts.md). Phase 2.5 G1 new `user_profiles` table must coordinate with this. Recommended: keep role-assignment authority in `user_roles` (auth/RLS consumes it); `user_profiles.role` is a denormalized display column for signup flow UX, with a trigger keeping it in sync. (Or don't duplicate — use `user_roles` directly with a computed getter. G1 design-time decision.)

### §5.2 — Handle uniqueness scope
SPEC §3 G2 says handles are "globally unique". Reserved list (Q4 proposal) covers system names. But the existing `workspaces.slug` has its own uniqueness — could a workspace ever collide with a user handle if the URL shapes are similar (`/u/<handle>` vs `/app/...` via locale prefix)? Routes don't collide directly. But if a user picks handle `ko` or `en` (locale codes), that's a route-parsing headache. Suggest adding `ko`, `en`, plus the routing locales, to the Q4 reserved list.

### §5.3 — Video size
SPEC §1 says mp4 up to 500MB. Supabase Storage (if fallback per §3 mitigation 2) has a default per-project bucket object limit of 50MB on Free plan. If submissions flow to Supabase Storage instead of R2, that's a hard cap far below spec. Either increase bucket limit (Pro plan required) or enforce 50MB in-app (which breaks the 500MB SPEC commitment). Worth calling out to CEO before G4.

---

## Summary for CEO (morning check)

- **No blocking unknowns.** Phase 2.5 launchpad green-lights G1 start.
- **Known gaps:**
  - `/u/<handle>` middleware exclusion needed during G6 (trivial, documented).
  - R2 bucket external prereq unresolved; recommend Option 2 (Supabase Storage with migration-to-R2 in 2.6) during G4 if bucket not provisioned by then.
  - `notification_events` DB schema is fine; TS kinds.ts + i18n messages need extension in G7.
  - Video size 500MB claim in SPEC §1 may conflict with Supabase Storage fallback — 야기 decision during G4 on size cap if R2 not ready.
- **Recommended pre-kickoff edits to SPEC:**
  - §3 G4: note R2 fallback option + size reconsideration.
  - §3 G6: note `/u/` middleware exclusion as explicit step.
  - §3 G7: note `kinds.ts` + i18n messages as part of "Notification events for..." task.
  - §6 Q4 (reserved handles): add `ko`, `en`, `ko-kr`, `en-us` to the proposed list.
