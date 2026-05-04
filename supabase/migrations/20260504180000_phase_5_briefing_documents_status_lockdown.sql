-- Phase 5 Wave B task_05 v3 sub_5 — briefing_documents RLS hardening.
--
-- K-05 LOOP 1 (Tier 1 high) findings F2 + F3 (HIGH-B race + missing parent
-- status check on UPDATE):
--
--   F2: addBriefingDocumentAction in the action layer pre-checks parent
--       project status='draft' and then runs INSERT, but the gap between
--       the SELECT and the INSERT is a TOCTOU window — if the project
--       transitions to 'in_review' between the two statements, the
--       INSERT still lands because the briefing_documents_insert RLS
--       policy never inspects parent status.
--   F3: updateBriefingDocumentNoteAction never checks parent project
--       status at all. The briefing_documents_update RLS policy from the
--       Wave A baseline only enforces (created_by + workspace_member +
--       24h window), so note/category can mutate after the project has
--       transitioned out of draft.
--
-- This migration tightens the briefing_documents INSERT and UPDATE
-- policies so the parent project's status='draft' invariant is enforced
-- at the database layer, atomically with the row write. The race window
-- closes because RLS evaluates the predicate against the project row at
-- the time of the INSERT/UPDATE itself, in the same transaction.
--
-- yagi_admin bypass branch is preserved AS-IS (status-agnostic) so the
-- admin support / migration path can still mutate briefing rows on
-- non-draft projects when needed.
--
-- The DELETE policy already includes p.status='draft' (Wave A baseline),
-- so we re-assert it via the verify DO block at the bottom rather than
-- DROP+CREATE.
--
-- The Wave A column-grant lockdown (REVOKE table UPDATE + GRANT
-- (note,category) only) is unaffected and remains active.

-- ---------------------------------------------------------------------------
-- INSERT — add parent project status='draft' predicate
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "briefing_documents_insert" ON briefing_documents;
CREATE POLICY "briefing_documents_insert" ON briefing_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      created_by = auth.uid()
      AND project_id IN (
        SELECT p.id FROM projects p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE wm.user_id = auth.uid()
          AND p.status = 'draft'
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

-- ---------------------------------------------------------------------------
-- UPDATE — add parent project status='draft' predicate to both USING +
-- WITH CHECK. The 24h authoring window is preserved.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "briefing_documents_update" ON briefing_documents;
CREATE POLICY "briefing_documents_update" ON briefing_documents
  FOR UPDATE TO authenticated
  USING (
    (
      created_by = auth.uid()
      AND created_at > now() - interval '24 hours'
      AND project_id IN (
        SELECT p.id FROM projects p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE wm.user_id = auth.uid()
          AND p.status = 'draft'
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  )
  WITH CHECK (
    (
      created_by = auth.uid()
      AND project_id IN (
        SELECT p.id FROM projects p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE wm.user_id = auth.uid()
          AND p.status = 'draft'
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Verify — assert all three policies (INSERT/UPDATE/DELETE) now reference
-- p.status, the table-level UPDATE revoke is still in force, and the
-- column-level UPDATE re-grant on (note, category) is still in force.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  ins_check text;
  upd_using text;
  upd_check text;
  del_using text;
BEGIN
  SELECT pg_get_expr(polwithcheck, polrelid) INTO ins_check
    FROM pg_policy
    WHERE polrelid = 'public.briefing_documents'::regclass
      AND polname = 'briefing_documents_insert';
  IF ins_check IS NULL OR ins_check NOT LIKE '%p.status%' THEN
    RAISE EXCEPTION 'sub_5 F2 assert failed: briefing_documents_insert WITH CHECK does not reference p.status';
  END IF;

  SELECT pg_get_expr(polqual, polrelid),
         pg_get_expr(polwithcheck, polrelid)
    INTO upd_using, upd_check
    FROM pg_policy
    WHERE polrelid = 'public.briefing_documents'::regclass
      AND polname = 'briefing_documents_update';
  IF upd_using IS NULL OR upd_using NOT LIKE '%p.status%' THEN
    RAISE EXCEPTION 'sub_5 F3 assert failed: briefing_documents_update USING does not reference p.status';
  END IF;
  IF upd_check IS NULL OR upd_check NOT LIKE '%p.status%' THEN
    RAISE EXCEPTION 'sub_5 F3 assert failed: briefing_documents_update WITH CHECK does not reference p.status';
  END IF;

  SELECT pg_get_expr(polqual, polrelid) INTO del_using
    FROM pg_policy
    WHERE polrelid = 'public.briefing_documents'::regclass
      AND polname = 'briefing_documents_delete';
  IF del_using IS NULL OR del_using NOT LIKE '%p.status%' THEN
    RAISE EXCEPTION 'sub_5 verify failed: briefing_documents_delete USING no longer references p.status (Wave A regression)';
  END IF;

  -- Wave A column-grant lockdown sanity (table UPDATE denied + selective
  -- column re-grant intact). Belt-and-suspenders — the Wave A migration
  -- already locked these in, but a future PUBLIC inheritance regression
  -- would slip past without re-asserting here.
  IF has_table_privilege('authenticated', 'public.briefing_documents', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_5 verify failed: authenticated regained table-level UPDATE on briefing_documents';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.briefing_documents', 'note', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_5 verify failed: authenticated lost UPDATE on briefing_documents.note';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.briefing_documents', 'category', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_5 verify failed: authenticated lost UPDATE on briefing_documents.category';
  END IF;
END $$;
