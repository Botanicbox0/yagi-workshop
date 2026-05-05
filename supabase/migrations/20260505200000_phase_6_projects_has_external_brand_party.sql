-- Phase 6 Wave B.2 — projects.has_external_brand_party
-- (Step 3 toggle for "외부 광고주가 있는 작업입니다" — Artist 의 외부
-- Brand 와 따온 광고 작업 인지. Internal flag for Type 3 routing,
-- never exposed in UI as "Type 3".)

ALTER TABLE projects
  ADD COLUMN has_external_brand_party boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN projects.has_external_brand_party IS
  'Artist 의 외부 Brand 와 따온 광고 작업 인지 (Type 3 internal flag). '
  'UI 노출 = "외부 광고주가 있는 작업입니다" (yagi-wording-rules). '
  'Set during Briefing Canvas Step 3; locked after status moves out of draft.';

GRANT UPDATE (has_external_brand_party) ON projects TO authenticated;

DO $$
BEGIN
  IF NOT has_column_privilege('authenticated', 'public.projects',
                              'has_external_brand_party', 'UPDATE') THEN
    RAISE EXCEPTION 'B.2 column grant assert failed';
  END IF;
END $$;
