-- Phase 5 Wave A task_01 + sub_4 patch — briefing_documents table for the
-- new Briefing Canvas paradigm (replaces the project_boards.attached_pdfs/urls
-- jsonb pattern). Schema + 4 RLS policies + column-grant lockdown. Data
-- migration from the legacy jsonb columns lands in task_02.
--
-- Wave A K-05 LOOP 1 verdict (Tier 1 high) layered patches:
--   F1 (HIGH-B): INSERT policy now requires (a) the caller is a current
--       workspace_member of the project's workspace AND (b) the row's
--       created_by equals auth.uid() — both via WITH CHECK.
--   F2 (HIGH-B): UPDATE + DELETE policies now require the caller is a
--       current workspace_member of the project's workspace; an
--       ex-member who originally created the row no longer retains
--       mutation rights after being removed from the workspace.
--   F3 (MED-B): table-level UPDATE revoked from authenticated; only
--       (note, category) re-granted because those are the only
--       client-editable fields after first INSERT. created_at /
--       created_by / project_id / kind / source_type / storage_key /
--       url / etc. flow through the action layer (or service-role)
--       and stay immutable from PostgREST. has_table_privilege +
--       has_column_privilege assertions in the DO block at the bottom
--       lock the privilege state in.
-- (workspace_members.role enum is `'admin' | 'member'` — see Phase 2.0
--  baseline line 1825. KICKOFF spec said `'owner' | 'admin'`; that's
--  fixed here to use the actual enum, with `'admin'` as the elevated
--  role and any member can write to projects they belong to.)

-- briefing_documents — Phase 5 신규 테이블
-- 분리: 기획서 (의뢰자가 직접 만든 자료) vs 레퍼런스 (외부 참고 자료)
CREATE TABLE briefing_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  -- 분류: 기획서 vs 레퍼런스
  kind text NOT NULL CHECK (kind IN ('brief', 'reference')),
  -- 자료 source
  source_type text NOT NULL CHECK (source_type IN ('upload', 'url')),
  -- upload (PDF, image 등)
  storage_key text,
  filename text,
  size_bytes bigint,
  mime_type text,
  -- url (영상/사이트 레퍼런스)
  url text,
  provider text,  -- 'youtube' / 'vimeo' / 'instagram' / 'generic'
  thumbnail_url text,
  oembed_html text,
  -- 의뢰자 메모 + 분류 (reference 만 의미)
  note text,
  category text CHECK (category IS NULL OR category IN ('mood', 'composition', 'pacing', 'general')),
  -- meta
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id),
  -- source_type 별 required field 강제
  CONSTRAINT briefing_documents_source_check CHECK (
    (source_type = 'upload' AND storage_key IS NOT NULL AND filename IS NOT NULL) OR
    (source_type = 'url' AND url IS NOT NULL)
  )
);

CREATE INDEX idx_briefing_documents_project_kind ON briefing_documents(project_id, kind);
CREATE INDEX idx_briefing_documents_created ON briefing_documents(created_at DESC);

-- RLS — project 의 workspace member 만 access
ALTER TABLE briefing_documents ENABLE ROW LEVEL SECURITY;

-- SELECT: project 의 workspace member 또는 yagi_admin
CREATE POLICY "briefing_documents_select" ON briefing_documents
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

-- INSERT: caller MUST be a current workspace_member of the project's
-- workspace AND created_by MUST equal auth.uid() (no spoof). yagi_admin
-- bypass for support/migration paths.
-- (sub_4 F1 fix — KICKOFF v1.2 spec was scoped only via projects.created_by,
--  which left an ex-member with project ownership able to keep inserting.)
CREATE POLICY "briefing_documents_insert" ON briefing_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      created_by = auth.uid()
      AND project_id IN (
        SELECT p.id FROM projects p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE wm.user_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

-- UPDATE: caller MUST be a current workspace_member of the project's
-- workspace AND own the row AND be inside the 24h authoring window.
-- yagi_admin bypass.
-- (sub_4 F2 fix — without the workspace_members predicate an ex-member
--  could still mutate a row they originally inserted.)
-- created_at immutability is enforced at the column-grant level below
-- (REVOKE UPDATE + selective GRANT excludes created_at) so the 24h
-- window cannot be extended via PostgREST UPDATE.
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
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

-- DELETE: caller MUST be a current workspace_member of the project's
-- workspace AND own the row AND the project must still be in 'draft'.
-- yagi_admin not granted DELETE here (admin destructive action goes
-- through service-role / RPC explicitly).
-- (sub_4 F2 fix — same workspace-membership predicate added.)
CREATE POLICY "briefing_documents_delete" ON briefing_documents
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    AND project_id IN (
      SELECT p.id FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.user_id = auth.uid()
        AND p.status = 'draft'
    )
  );

-- ============================================================
-- sub_4 F3 — Column-level grant lockdown.
--
-- Mirrors the Phase 4.x sub_03f_2 pattern that was applied to
-- project_boards. authenticated keeps SELECT + INSERT + DELETE at
-- table-level (RLS gates row scope), but UPDATE is REVOKE'd at the
-- table level and re-granted only on the two columns the action
-- layer is intended to mutate after first INSERT — `note` and
-- `category`. Everything else (created_at, created_by, project_id,
-- kind, source_type, storage_key, filename, size_bytes, mime_type,
-- url, provider, thumbnail_url, oembed_html) stays untouchable from
-- PostgREST UPDATE; the briefing canvas action layer rewrites
-- entire rows via INSERT (or service-role for admin paths) instead
-- of in-place column edits.
--
-- Without this revoke, the 24h UPDATE window in the policy above
-- would be extendable by a malicious caller setting created_at to
-- now() via a direct PostgREST UPDATE on the column.
-- ============================================================

REVOKE UPDATE ON public.briefing_documents FROM authenticated;
GRANT UPDATE (note, category) ON public.briefing_documents TO authenticated;

DO $$
BEGIN
  -- Effective table-level UPDATE must be denied to authenticated.
  IF has_table_privilege('authenticated', 'public.briefing_documents', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has effective UPDATE on briefing_documents';
  END IF;

  -- Effective column-level UPDATE must remain on the two client-editable
  -- columns the action layer relies on.
  IF NOT has_column_privilege('authenticated', 'public.briefing_documents', 'note', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated lost UPDATE on briefing_documents.note';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.briefing_documents', 'category', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated lost UPDATE on briefing_documents.category';
  END IF;

  -- Effective column-level UPDATE must be denied on every server-managed
  -- column. The 24h authoring window in the UPDATE policy above relies
  -- on created_at being immutable from PostgREST.
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'created_at', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.created_at (24h window bypass)';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'created_by', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.created_by';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'project_id', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.project_id';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'id', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.id';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'kind', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.kind';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'source_type', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.source_type';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'storage_key', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.storage_key';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'url', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.url';
  END IF;
  -- sub_4 LOOP 2 PARTIAL closure — extend the deny list to every
  -- server-managed column the schema defines. The REVOKE / selective
  -- GRANT above already denies these at the privilege layer, but the
  -- assertion list left them unverified, so a future PUBLIC inheritance
  -- regression on any of them would have escaped the migration's own
  -- guardrail.
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'filename', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.filename';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'size_bytes', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.size_bytes';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'mime_type', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.mime_type';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'provider', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.provider';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'thumbnail_url', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.thumbnail_url';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'oembed_html', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.oembed_html';
  END IF;
END $$;
