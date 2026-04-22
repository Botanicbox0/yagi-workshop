# Phase 2.1 — Operational Tail (Expedited)

**Phase ID**: 2.1
**Mode**: Expedited (ADR-005)
**Duration target**: 1 working day (2026-04-23)
**Owner**: 야기 (CEO) + Builder
**Precedes**: Phase 2.5 (Challenge MVP)

---

## 0. Why this phase

Phase 2.0 shipped 28 commits of technical-debt cleanup and left five operational items unresolved. They are individually small but collectively block Phase 2.5:

1. Resend domain verification hasn't been confirmed.
2. `preprod_frame_reactions` / `preprod_frame_comments` publication membership unknown (Codex H1).
3. `workspaces.slug='yagi-internal'` row exists only in live DB — any `supabase db reset` breaks the app.
4. POPBILL `issueTaxInvoice()` is `NOT_IMPLEMENTED`; current guard depends on `POPBILL_MODE=test`.
5. Phase 2.0 G4 triage deferred 15 findings. Some are trivial; some aren't yet classified.
6. Six browser smoke tests still pending from G4/G5/G6.

None require new UI or design decisions. All can be ADR-005 Expedited.

## 1. Groups

Phase 2.0 used group-gated manual progression. Same here. Groups run in order, but later groups can start while an earlier group blocks on external I/O (e.g., DNS propagation, user inbox check).

### G1 — Resend DNS verify closeout

**In**: Phase 2.0 `G1_SETUP.md` + DNS records added 2026-04-22.
**Out**: `phase-2-1/G1_VERIFIED.md` — screenshot of Resend dashboard "Verified" + inbox screenshot of test row email received.
**Exit**: `notification_events.41251b54-a4ad-47f7-b834-bbdf766375dd`.`email_sent_at` is non-null.
**Est**: 5 min if already propagated; otherwise wait-state.

### G2 — H1 investigation + resolution

**In**: `.yagi-autobuild/phase-2-1/INVESTIGATION-H1-realtime-live.md` (already scaffolded by Phase 2.0 G7).
**Out**: `phase-2-1/G2_H1_RESOLVED.md` with the query result and decision (baseline fix vs. new migration).
**Steps**:
1. Via Supabase MCP `execute_sql` on `jvamvbpxnztynsccvcmr`:
   ```sql
   SELECT schemaname, tablename
   FROM pg_publication_tables
   WHERE pubname = 'supabase_realtime'
     AND tablename IN ('preprod_frame_reactions', 'preprod_frame_comments');
   ```
2. If rows exist → baseline bookkeeping error. Fix: update baseline comment; no schema change. Emit ADR if pattern repeats.
3. If no rows → live state drifted. Fix: `ALTER PUBLICATION supabase_realtime ADD TABLE preprod_frame_reactions, preprod_frame_comments;` via `apply_migration`.
**Est**: 30 min.

### G3 — yagi-internal workspace seed migration

**In**: Known operational fact — `workspaces.slug='yagi-internal'` is external prerequisite.
**Out**: `supabase/migrations/{ts}_seed_yagi_internal_workspace.sql` — idempotent `INSERT ... ON CONFLICT DO NOTHING`.
**Steps**:
1. Dump live row: `SELECT * FROM workspaces WHERE slug='yagi-internal'`.
2. Generate migration with the exact row values (id, name, created_at, meta). Include comment explaining why this is seeded, not derived.
3. Apply via MCP. Verify `supabase db reset` no longer breaks preprod/team-chat triggers on a local test clone (optional — mark as verified-against-production-schema only).
4. Update `.yagi-autobuild/contracts.md` — move yagi-internal from "operational prerequisite" to "seeded in 20260423..._seed_yagi_internal_workspace".
**Est**: 45 min.

### G4 — POPBILL issueTaxInvoice guard hardening

**Scope reduction (vs. full real implementation)**: full SDK integration is deferred to Phase 2.2. G4 only hardens the guard so production cannot silently fail.

**In**: `.yagi-autobuild/phase-2-0/POPBILL_LIVE_FLIP.md`.
**Out**: `phase-2-1/G4_POPBILL_GUARDED.md` — diff summary.
**Steps**:
1. `src/lib/popbill/*`: `issueTaxInvoice()` throws explicit `PopbillNotImplementedError` with structured payload `{phase: "2.2", mode, intent}` — not a generic `throw new Error("NOT_IMPLEMENTED")`.
2. Caller in `src/app/api/invoices/[id]/issue/route.ts` catches `PopbillNotImplementedError` and returns HTTP 501 with a JSON body that i18n-renders in both locales.
3. Add one test: `POPBILL_MODE=production` + `issueTaxInvoice()` call → 501, not 500.
4. Update `contracts.md` — POPBILL entry now says "guarded; real impl deferred to Phase 2.2".
**Est**: 1.5 hours.

### G5 — G4 DEFER_TO_2_1 triage

**In**: `.yagi-autobuild/phase-2-0/G4_TRIAGE.md` second table (15 items).
**Out**: `phase-2-1/G5_TRIAGE_RESULT.md` with each of the 15 labeled:
- `FIX_NOW` — atomic commit in this phase.
- `DEFER_TO_2_2` — written into `phase-2-2/BACKLOG.md`.
- `WONTFIX` — justification recorded.
**Steps**: rapid pass. Target ≤ 5 FIX_NOW; if more, classify remainder as DEFER.
**Est**: 1 hour triage + up to 2 hours FIX_NOW atomic commits.

### G6 — Browser smoke tests (carryover)

**In**: six pending items from Phase 2.0:
1. Journal locale toggle (G4 #7)
2. Timezone save (G4 #3)
3. Invoice draft 404 (G4 #9)
4. RLS `WITH CHECK` enforcement live (G5 post-apply)
5. Showcase `/showcase/<slug>` not-found page (G6 L5)
6. YouTube Shorts `/shorts/ → /embed/` (G6 L4)

**Out**: `gates/phase-2-1/QA_SMOKE.md` — each item `PASS | FAIL | BLOCKED` with date + evidence pointer.
**Est**: 45 min.

### G7 — Engineering Review (K-05)

**In**: all G1–G6 artifacts + commit range for Phase 2.1.
**Out**: `gates/phase-2-1/ENGINEERING_APPROVED.md` — Codex K-05 output appended.
**Gate behavior**: ARCH §5 + ADR-005. `HIGH` → halt. `MEDIUM`/`LOW` → in-doc fix or defer to Phase 2.2 with explicit triage note.
**Est**: 30 min + whatever fixes.

### G8 — Phase 2.1 closeout

- Update `.yagi-autobuild/HANDOFF.md` — Phase 2.1 SHIPPED banner.
- Single Telegram notification (Phase 2.0 rule retained).
- Tag `git tag -a phase-2-1-shipped`.

## 2. Success criteria (binary)

- [ ] `notification_events` test row `email_sent_at` non-null.
- [ ] H1 resolved — publication membership documented, any needed migration applied.
- [ ] `workspaces.slug='yagi-internal'` seeded by a migration, not a manual prerequisite.
- [ ] POPBILL `issueTaxInvoice()` in production mode returns structured 501, not 500.
- [ ] G4 deferred 15 items all classified (`FIX_NOW` / `DEFER_TO_2_2` / `WONTFIX`).
- [ ] Six browser smoke tests logged, no `FAIL` outstanding without a P2.2 ticket.
- [ ] Codex K-05 returns `CLEAN` or `MEDIUM`-only with all addressed or deferred.

## 3. Non-goals

- Full POPBILL SDK integration (→ Phase 2.2).
- DEFER_TO_2_1 items reclassified as `FIX_NOW` beyond 5 — triage, don't scope-creep.
- Any new feature, schema change, or UI work.
- Rewriting `contracts.md` — only additive updates.

## 4. Constraints

- **Stack lock**: Next.js 15.5, shadcn@2.1.8, Supabase `jvamvbpxnztynsccvcmr`, port 3003. No bumps.
- **No new dependencies.**
- **Atomic commits.** One fix per commit, `pnpm tsc --noEmit` before commit.
- **Manual gate between groups** (Phase 2.X rule retained).

## 5. Gate artifacts (ADR-005 Expedited — gates 2/3/5 skipped)

| Gate | Artifact path                                           |
|------|---------------------------------------------------------|
| 1    | `gates/phase-2-1/CEO_APPROVED.md` (pre-filled below)    |
| 4    | `gates/phase-2-1/ENGINEERING_APPROVED.md`               |
| 6    | `gates/phase-2-1/QA_SMOKE.md`                           |

---

## Notes for Builder / Claude Code

- **Supabase project ID is `jvamvbpxnztynsccvcmr`.** Not `vvsyqcbplxjiqomxrrew` (that's legacy YAGI STUDIO).
- **Atomic commit rule inherited from Phase 2.0.** Each fix = `pnpm tsc --noEmit` → commit.
- **If a trigger fires** (new primitive needed, hardcoded value, new UI frame) — halt. Escalate to web-Claude per Phase 2.0 workflow rule #4.
- **Apply migrations via Supabase MCP `apply_migration`** — same pattern as Phase 2.0 G5.
