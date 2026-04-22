# Phase 2.1 G2 — H1 realtime publication investigation: FINDINGS

**Date:** 2026-04-23
**Status:** FINDINGS COMPLETE — awaiting CEO go-ahead on remediation (STOP POINT per SPEC)
**Source of truth:** live DB query against `jvamvbpxnztynsccvcmr`
**Upstream context:** `.yagi-autobuild/phase-2-1/INVESTIGATION-H1-realtime-live.md`

---

## (a) Current state

Query:
```sql
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY schemaname, tablename;
```

Result (live, 2026-04-23):

| schema | table |
|--------|-------|
| public | `notification_events` |
| public | `team_channel_message_attachments` |
| public | `team_channel_messages` |

Targeted check:
```sql
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('preprod_frame_reactions', 'preprod_frame_comments');
```

Result: **empty (0 rows).**

## (b) Expected state (per Phase 1.4 + 1.8 + 2.0 specs)

Per `contracts.md` (committed 2026-04-23):

- Phase 1.4 should publish `preprod_frame_reactions` and `preprod_frame_comments` to `supabase_realtime` (UI subscription model in `src/components/preprod/board-editor.tsx:1007-1041`).
- Phase 1.7 publishes `team_channel_messages`, `team_channel_message_attachments`. ✓ present.
- Phase 1.8 publishes `notification_events`. ✓ present.

**Gap:** Phase 1.4's 2 tables are missing from the live publication.

## (c) Root cause — Hypothesis A confirmed

`INVESTIGATION-H1-realtime-live.md` posed two hypotheses:
- **A.** Publication membership never applied to live DB. Phase 1.4 UI subscription has been a silent no-op in production since 1.4 ship.
- **B.** Membership present in live but missing from baseline dump (capture gap).

Live query proves **A**: the rows are absent from live DB. This is not a capture gap — it's a real missing DDL.

Operational impact: every preprod board share page since Phase 1.4 shipped has been updating feedback (reactions/comments) via **page revalidation only**. Reviewers leaving comments in tab A did not push updates to tab B (or to the board owner's editor); visibility required a manual reload.

Severity: MEDIUM (UX degradation, not data loss or security). The `postgres_changes` subscription in `board-editor.tsx` simply silently receives zero events — no error surface, no retry. This is consistent with the lack of user bug reports over the 1.4–2.0 window.

## (d) Remediation plan

### Recommended: Apply publication membership via Supabase MCP

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.preprod_frame_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.preprod_frame_comments;
```

Via `mcp__claude_ai_Supabase__apply_migration` with `name = h1_preprod_realtime_publication`. Local file naming follows the Phase 2.0 convention: `supabase/migrations/{ts}_h1_preprod_realtime_publication.sql`. Version string should be the file timestamp so the `schema_migrations` row matches on-disk naming (same alignment pattern used for Phase 2.0 G5 migration).

**Idempotency:** `ALTER PUBLICATION ... ADD TABLE` on a table already in the publication raises `SQLSTATE 42710 (duplicate_object)`. To keep the migration safe to rerun (fresh-clone scenarios), wrap in `DO` block that checks `pg_publication_tables` first — or accept the error on re-apply as a signal the step was already done. Simpler option for a one-shot live fix: unwrapped statements, never re-apply.

**No schema change, no data migration.** Publication membership is a pure bookkeeping primitive.

**Post-apply verification:**

1. Re-run the `pg_publication_tables` SELECT — both tables should now appear.
2. Smoke test (requires 야기 or a test account): open a preprod board share page in two tabs. In tab A add a reaction; tab B should receive the INSERT event within <1 s and update the feedback dot without reload.
3. No contracts.md update needed beyond marking H1 resolved; contracts.md already describes the expected state correctly (the Phase 1.4 "Realtime publication" table lists these two tables).

**Rollback plan:** if something goes wrong (unlikely with publication DDL, but for completeness):
```sql
ALTER PUBLICATION supabase_realtime DROP TABLE public.preprod_frame_comments;
ALTER PUBLICATION supabase_realtime DROP TABLE public.preprod_frame_reactions;
```

Single-statement DDL inside a transaction; no app-side restart needed. Safe to apply during business hours.

## (e) Alternative considered

**Do-nothing alternative** (`WONTFIX`): accept page-revalidation-only behavior for preprod feedback; update contracts.md + `board-editor.tsx` to remove the subscription code and document the polling/reload model. Rejected because:

- UI already assumes realtime; removing it is a UX regression.
- Migration is a 2-line ALTER — trivially cheaper than the code removal alternative.

## (f) SPEC alignment

SPEC §G2 expected exactly this outcome and prescribed the fix form above. Nothing new here; the value of this step was converting "unverified hypothesis" to "empirical finding with ready migration."

## (g) Applied

**Applied:** 2026-04-23 · migration: `supabase/migrations/20260423020000_h1_preprod_realtime_publication.sql` · pre-flight passed · post-apply verified.

Post-apply verification (SQL #4):
```sql
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('preprod_frame_reactions', 'preprod_frame_comments')
ORDER BY tablename;
```

Result:
```
public | preprod_frame_comments
public | preprod_frame_reactions
```

Both tables now in `supabase_realtime`. Version aligned to disk filename timestamp `20260423020000` via `supabase_migrations.schema_migrations` UPDATE (same pattern as Phase 2.0 G5). Hypothesis A fully remediated.

## (h) Open observations — defer to Phase 2.5 audit

Surfaced during G2 pre-flight; not in scope for Phase 2.1 G2 remediation but worth a dedicated audit pass:

1. **`preprod_frame_reactions`** — only SELECT policy. No INSERT / UPDATE / DELETE. Current write path is likely `/api/share/[token]/reactions/route.ts` via service-role client (bypasses RLS). Confirm whether this is intentional (service-role-only write path) or a Phase 1.4 oversight (missing INSERT policy would block a future authenticated-write path).
2. **`preprod_frame_comments`** — SELECT + UPDATE only. No INSERT / DELETE. Same question: if UPDATE exists for `is_resolved` flip, why no DELETE path, and is INSERT intentionally service-role-only? Presence of `resolveComment` / `unresolveComment` server actions implies UPDATE has an authenticated caller — asymmetry vs INSERT/DELETE worth checking.
3. Recommended audit: Phase 2.5 or a Phase 2.1 G6 smoke adjunct — confirm no authenticated-write path is silently dropping rows. If pattern is intentional, document in `contracts.md` Phase 1.4 section under "Write path".

## (i) Smoke test queue (야기-side, non-blocking for G3)

To confirm the UI subscription now works end-to-end:

1. Open a preprod board share page (`/s/<token>`) in two browser tabs / devices.
2. In tab A, add a reaction emoji on a frame.
3. Expected: tab B shows the reaction count change within <1 s without reload.
4. Repeat with a comment — same expectation.
5. If realtime does NOT update, re-query `pg_publication_tables` and report the observed state; otherwise log PASS in `gates/phase-2-1/QA_SMOKE.md` under Phase 2.1 G6 item 4 ("RLS WITH CHECK" entry already slotted; add this as "Preprod feedback realtime").

Smoke test is NOT a G3 blocker — G3 (yagi-internal seed migration) proceeds immediately after this commit.
