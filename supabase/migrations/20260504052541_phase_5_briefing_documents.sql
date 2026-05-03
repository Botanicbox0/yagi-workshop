-- Phase 5 Wave A task_01 — briefing_documents table for the new Briefing Canvas paradigm (replaces the projects.attached_pdfs/urls jsonb pattern). Schema + 4 RLS policies. Data migration from the legacy jsonb columns lands in task_02.

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

-- SELECT: workspace member 또는 yagi_admin
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

-- INSERT: project 의 created_by 본인 또는 workspace_admin (yagi_admin 도)
CREATE POLICY "briefing_documents_insert" ON briefing_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.created_by = auth.uid()
        OR p.workspace_id IN (
          SELECT workspace_id FROM workspace_members
          WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

-- UPDATE: 같은 워크스페이스 admin/owner 또는 본인이 INSERT 한 row + 24h 이내
-- (의뢰자가 무한정 자료 수정 못 하게 — Brief 가 lock 되면 도구도 lock)
CREATE POLICY "briefing_documents_update" ON briefing_documents
  FOR UPDATE TO authenticated
  USING (
    (created_by = auth.uid() AND created_at > now() - interval '24 hours')
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

-- DELETE: created_by 본인 (project 가 in_review 또는 그 이후면 deny)
CREATE POLICY "briefing_documents_delete" ON briefing_documents
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    AND project_id IN (
      SELECT id FROM projects WHERE status IN ('draft')
    )
  );
