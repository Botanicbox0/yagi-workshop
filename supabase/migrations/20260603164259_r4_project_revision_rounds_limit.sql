ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS revision_rounds_limit integer NOT NULL DEFAULT 2;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'projects_revision_rounds_limit_check'
      AND conrelid = 'public.projects'::regclass
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_revision_rounds_limit_check
      CHECK (revision_rounds_limit >= 0 AND revision_rounds_limit <= 50);
  END IF;
END $$;

UPDATE public.projects
SET revision_rounds_limit = 2
WHERE revision_rounds_limit IS NULL;
