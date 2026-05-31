-- Phase 9 role-consistency blocker #9
-- Prevent duplicate creator submissions per campaign by workspace and email.

DO $$
DECLARE
  duplicate_workspace_groups integer;
  duplicate_email_groups integer;
BEGIN
  SELECT count(*)
  INTO duplicate_workspace_groups
  FROM (
    SELECT campaign_id, applicant_workspace_id
    FROM public.campaign_submissions
    WHERE applicant_workspace_id IS NOT NULL
      AND status <> 'withdrawn'
    GROUP BY campaign_id, applicant_workspace_id
    HAVING count(*) > 1
  ) duplicates;

  IF duplicate_workspace_groups > 0 THEN
    RAISE EXCEPTION
      'duplicate active campaign submissions by workspace exist: %',
      duplicate_workspace_groups
      USING ERRCODE = '23505';
  END IF;

  SELECT count(*)
  INTO duplicate_email_groups
  FROM (
    SELECT campaign_id, lower(applicant_email)
    FROM public.campaign_submissions
    WHERE status <> 'withdrawn'
    GROUP BY campaign_id, lower(applicant_email)
    HAVING count(*) > 1
  ) duplicates;

  IF duplicate_email_groups > 0 THEN
    RAISE EXCEPTION
      'duplicate active campaign submissions by email exist: %',
      duplicate_email_groups
      USING ERRCODE = '23505';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS campaign_submissions_unique_active_workspace
  ON public.campaign_submissions (campaign_id, applicant_workspace_id)
  WHERE applicant_workspace_id IS NOT NULL
    AND status <> 'withdrawn';

CREATE UNIQUE INDEX IF NOT EXISTS campaign_submissions_unique_active_email
  ON public.campaign_submissions (campaign_id, lower(applicant_email))
  WHERE status <> 'withdrawn';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'campaign_submissions'
      AND indexname = 'campaign_submissions_unique_active_workspace'
  ) THEN
    RAISE EXCEPTION 'missing campaign_submissions_unique_active_workspace';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'campaign_submissions'
      AND indexname = 'campaign_submissions_unique_active_email'
  ) THEN
    RAISE EXCEPTION 'missing campaign_submissions_unique_active_email';
  END IF;
END $$;
