# Phase 5 Wave A — task_01 result

## Commit SHA
`cfab47d`

## Migration filename + line count
`supabase/migrations/20260504052541_phase_5_briefing_documents.sql` — 95 lines

## tsc/lint/build state
- `pnpm exec tsc --noEmit` → exit 0, no errors
- lint + build not run (pure DDL task, no `src/` changes)

## Ambiguity flags
None. Every line in the migration was copied literally from KICKOFF.md lines 334–426. No improvisation.

## K-05-relevant notes for Builder

### 1. `workspace_members.role` enum values
The INSERT policy uses `role IN ('owner', 'admin')`. Per task_plan.md §Builder grep audit, the wave-c5d audit confirmed `'owner'` and `'admin'` are the only legitimate values. K-05 should verify the actual enum/check constraint on `workspace_members.role` matches these two literals (no `'member'` escape, no `'editor'` gap).

### 2. `profiles.role` column for yagi_admin checks
SELECT, INSERT, and UPDATE policies all use `SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'yagi_admin'`. K-05 should confirm the `profiles.role` column allows the `'yagi_admin'` value (the Phase 4.x widen migration `20260501100806_phase_4_x_widen_profile_role_enum.sql` should cover this — verify it landed in prod).

### 3. UPDATE policy workspace_admin escape hatch
The KICKOFF UPDATE policy grants only `created_by = auth.uid() AND created_at > now() - interval '24 hours'` OR `yagi_admin`. Workspace admins/owners do NOT have UPDATE access on `briefing_documents` rows they did not create — this is intentional per the locking design ("Brief lock → tool lock"), but K-05 should confirm this asymmetry is deliberate vs. an omission (INSERT grants workspace admin; UPDATE does not).

### 4. DELETE — no yagi_admin escape hatch
The DELETE policy has no `yagi_admin` escape. Only the document's `created_by` can delete, and only while the project is in `status = 'draft'`. This means even yagi_admin cannot hard-delete a `briefing_document` without going to the service role. This is consistent with the KICKOFF spec text — K-05 should flag if this is unintended.

### 5. `category` CHECK — kind='brief' can store category='mood'
The schema allows `kind='brief'` with `category='mood'` — there is no DB-level constraint preventing this. The KICKOFF spec acknowledges this (K-05 focus point 6): "kind='brief' 일 때 category NULL 강제" is not enforced at DB level. Enforcement is app-side only. K-05 Tier 1 should assess whether a composite CHECK is needed or if app-side is acceptable.

### 6. `created_at` immutability (UPDATE 24h window)
The UPDATE policy's 24h window relies on `created_at` being immutable (no trigger updates it). No trigger on `briefing_documents` exists (this is a new table, no trigger authored in this migration). K-05 should verify no inherited trigger or supabase-level hook touches `created_at` on this table.

### 7. Cross-tenant leak surface
The SELECT policy joins via `workspace_members.workspace_id = projects.workspace_id`. A user who is a member of workspace A cannot see `briefing_documents` for workspace B's projects — the subquery scopes correctly. K-05 should confirm the join is non-leaky (no LATERAL, no correlated subquery that might fan out).
