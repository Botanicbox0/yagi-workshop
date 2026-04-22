# P2.1 Investigation — H1: preprod feedback realtime publication state

**Filed:** 2026-04-23 (deferred from Phase 2.0 G7 Codex K-05)
**Severity when filed:** HIGH (blocks G7 contracts.md sign-off under strict reading; deferred per Option B closeout decision)
**Status:** Open, awaiting investigation in Phase 2.1

---

## Original finding

Phase 2.0 G7 Codex K-05 review, 2026-04-22:

> `contracts.md` claims `preprod_frame_reactions` and `preprod_frame_comments` are Phase 1.4 realtime publication members, but the authoritative migrations only add `notification_events`, `team_channel_messages`, and `team_channel_message_attachments` to `supabase_realtime`; the shipped UI still subscribes to the preprod tables. This is a major cross-phase contract error for a realtime surface.
>
> Evidence:
> - `.yagi-autobuild/contracts.md:241-244` (H1 repro — claimed as realtime)
> - `supabase/migrations/20260422120000_phase_2_0_baseline.sql:4824-4836` (only 3 tables added)
> - `src/components/preprod/board-editor.tsx:1007-1041` (UI subscribes via `postgres_changes`)

After the Option B closeout, the contract wording has been corrected to note this is unverified in the baseline; the real runtime state question is captured here.

---

## What we know

1. **`src/components/preprod/board-editor.tsx` subscribes** via Supabase Realtime `postgres_changes` to INSERT/UPDATE/DELETE events on `preprod_frame_reactions` and `preprod_frame_comments`. If those tables are not in `supabase_realtime` publication, those events never fire — the subscription silently no-ops and the UI only updates on page reload.

2. **The baseline dump** (`supabase/migrations/20260422120000_phase_2_0_baseline.sql`) does not contain `alter publication supabase_realtime add table public.preprod_frame_reactions` or `...preprod_frame_comments`. Only three tables are added by the dump's publication block:
   - `notification_events`
   - `team_channel_messages`
   - `team_channel_message_attachments`

3. **G2 baseline was produced by raw `pg_dump v18`** (Docker-free path) with a manual supplement for realtime publication membership. The supplement was applied manually during Phase 2.0 G2 and was validated only against the three tables above. If the `preprod_*` tables were in the LIVE publication but omitted from the supplement, the baseline is incomplete. If they were never in the LIVE publication, the preprod feedback UI's realtime claim is broken.

---

## Two hypotheses

### Hypothesis A — Publication membership missing from LIVE DB

Phase 1.4 shipped `preprod_frame_reactions` + `preprod_frame_comments` tables + the UI subscription code, but the `alter publication supabase_realtime add table ...` statements were never applied to the live database. The subscription has been silently no-op in production since Phase 1.4 ship — preprod feedback badges only update on page reload / revalidation, not via push.

**Verification:**
```sql
-- Run in Supabase SQL Editor against jvamvbpxnztynsccvcmr
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
order by tablename;
```

Expected if A is true: `preprod_frame_reactions` / `preprod_frame_comments` NOT present.

**Fix if A:** Add a new migration `supabase/migrations/<ts>_phase_2_1_realtime_preprod.sql`:
```sql
alter publication supabase_realtime add table public.preprod_frame_reactions;
alter publication supabase_realtime add table public.preprod_frame_comments;
```
Then `supabase db push` to apply to live. Smoke-test: open a preprod board in two browser tabs, react/comment in tab A, confirm tab B updates without reload.

### Hypothesis B — Membership present in LIVE but missing from baseline dump

Phase 1.4 applied the `alter publication` correctly in production, but the G2 `pg_dump` didn't capture publication membership for these tables, and the manual supplement missed them. The UI works fine in production; the baseline would be non-reproducible against a fresh clone.

**Verification:** same SQL as A. Expected if B is true: both `preprod_*` tables PRESENT.

**Fix if B:** Amend the G2 baseline manual-supplement block to include the two `alter publication` statements. This is a non-invasive backfill — it doesn't change live state, just makes the baseline match reality.

---

## Likelihood

Hypothesis A is more likely given:
- The G2 baseline review captured the three explicit realtime members correctly (so the supplement author's checklist was complete for what they knew about).
- No historical migration file in `.yagi-autobuild/archive/migrations-pre-2-0/` references `preprod_frame_*` + `supabase_realtime` together (spot-check as part of investigation).

But we cannot resolve this without querying the live DB. Therefore the next step is a single diagnostic SQL query, not a fix.

---

## Related open questions

- Are there OTHER tables with UI subscriptions but missing publication membership? The investigation should enumerate every `postgres_changes` subscription in the codebase and cross-check against the live publication membership list.
- Should realtime publication membership be verified by Codex K-05 as part of every future phase's exit criteria? If so, add to the phase-spec template.

---

## Suggested next step

1. Run the `pg_publication_tables` SELECT above.
2. If A → write migration, smoke-test, commit.
3. If B → backfill baseline supplement block, commit.
4. Either way → update `.yagi-autobuild/contracts.md` Phase 1.4 realtime section to reflect ground truth.
5. Close this investigation file (move to `.yagi-autobuild/archive/` with resolution note).
