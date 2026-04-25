# Phase 2.8 — Follow-ups

Tracker for non-blocking items deferred during the phase. Format mirrors
prior phases (`Trigger / Risk / Action / Owner / Status / Registered`).

---

## FU-2.8-comment-kind

**Trigger:** SPEC §3.5 prescribed `ALTER TYPE thread_kind ADD VALUE 'project_brief'`,
but the current schema has no `threads.kind` enum — comments live in
`project_threads` + `thread_messages` (Phase 1.x), already project-scoped.

**Risk:** Phase 2.9 plans block-level inline comments anchored by stable
TipTap node IDs. Without a `kind` or `anchor_block_id` column on
`project_threads` (or a new `thread_anchors` table), inline comments can't
be associated with a specific block. v1 is fine — only the brief-level
thread exists.

**Action:** When Phase 2.9 begins block-level comments, add an
`anchor_block_id text NULL` column on `project_threads` (or, if new
discussion surfaces emerge, introduce a `thread_kind` enum then). Update
SPEC v3 of Phase 2.9 to reflect the actual schema rather than the
hypothetical `threads` table from Phase 2.8 SPEC v2.

**Owner:** Phase 2.9 builder.

**Status:** Open.

**Registered:** 2026-04-25 (G_B-1 SPEC drift, logged via CACHE_MISS_DEFAULT).

---

## FU-2.8-rls-test-runtime

**Trigger:** KICKOFF G_B-1 EXIT specifies `scripts/test-rls-brief-board.ts`,
but worktree has no TS runtime (no `tsx` / `ts-node` in deps). Test was
authored as `.mjs` per existing `scripts/test-ipv6-classify.mjs`
convention.

**Risk:** Cosmetic — the test runs and asserts the same RLS predicates.
Future contributors looking for a `.ts` file at that path won't find it.

**Action:** Either (a) update KICKOFF docs to reflect `.mjs`, or
(b) install `tsx` as a devDependency in Phase 2.9 if any test in the
phase needs TypeScript-only features (current test uses no TS-specific
syntax).

**Owner:** Phase 2.9 builder or web Claude during next SPEC pass.

**Status:** Open.

**Registered:** 2026-04-25 (G_B-1 file extension reconciliation).

---

## FU-2.8-saveversion-rollback

**Trigger:** `saveVersion` server action inserts the version row, then
bumps `project_briefs.current_version` via CAS. If the bump fails (e.g.
concurrent save raced past us), the version row is committed but the
counter is not. The next save re-derives `current_version + 1` from the
brief row, so the orphaned version row would have the lowest expected
version_n — not crash, just visually mis-ordered in history sidebar
until re-sync.

**Risk:** Rare but visible. UI history sidebar could show duplicated
or out-of-order labels for ~ms while a second save converges.

**Action:** Wrap version INSERT + counter bump in an RPC `save_version`
that takes a single transaction (Supabase function or pg `LANGUAGE
plpgsql` SECURITY DEFINER). Phase 2.8.1 candidate.

**Owner:** Phase 2.8.1 builder (G_B-5 hardening if observed in QA).

**Status:** Open.

**Registered:** 2026-04-25 (G_B-1 design-time annotation in actions.ts).
