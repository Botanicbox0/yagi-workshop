-- Phase 8 contest prize/recruit display fields.
-- Brand requests keep desired values in request_metadata; these explicit
-- columns are YAGI-confirmed values and remain admin-write only.

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS prize_pool_krw integer,
  ADD COLUMN IF NOT EXISTS prize_tiers jsonb,
  ADD COLUMN IF NOT EXISTS recruit_target integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaigns_prize_pool_krw_nonnegative'
      AND conrelid = 'public.campaigns'::regclass
  ) THEN
    ALTER TABLE public.campaigns
      ADD CONSTRAINT campaigns_prize_pool_krw_nonnegative
      CHECK (prize_pool_krw IS NULL OR prize_pool_krw >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaigns_recruit_target_nonnegative'
      AND conrelid = 'public.campaigns'::regclass
  ) THEN
    ALTER TABLE public.campaigns
      ADD CONSTRAINT campaigns_recruit_target_nonnegative
      CHECK (recruit_target IS NULL OR recruit_target >= 0) NOT VALID;
  END IF;
END $$;

ALTER TABLE public.campaigns
  VALIDATE CONSTRAINT campaigns_prize_pool_krw_nonnegative;

ALTER TABLE public.campaigns
  VALIDATE CONSTRAINT campaigns_recruit_target_nonnegative;

REVOKE INSERT (prize_pool_krw, prize_tiers, recruit_target)
  ON public.campaigns FROM authenticated;

REVOKE UPDATE (prize_pool_krw, prize_tiers, recruit_target)
  ON public.campaigns FROM authenticated;

DO $$
BEGIN
  IF NOT has_column_privilege('authenticated', 'public.campaigns', 'request_metadata', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost INSERT on campaigns.request_metadata';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.campaigns', 'request_metadata', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated lost UPDATE on campaigns.request_metadata';
  END IF;

  IF has_column_privilege('authenticated', 'public.campaigns', 'prize_pool_krw', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has INSERT on campaigns.prize_pool_krw';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'prize_tiers', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has INSERT on campaigns.prize_tiers';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'recruit_target', 'INSERT') THEN
    RAISE EXCEPTION 'assert failed: authenticated has INSERT on campaigns.recruit_target';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'prize_pool_krw', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaigns.prize_pool_krw';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'prize_tiers', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaigns.prize_tiers';
  END IF;
  IF has_column_privilege('authenticated', 'public.campaigns', 'recruit_target', 'UPDATE') THEN
    RAISE EXCEPTION 'assert failed: authenticated has UPDATE on campaigns.recruit_target';
  END IF;
END $$;
