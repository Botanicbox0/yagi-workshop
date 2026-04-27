-- Phase 2.8.1 Followup #1 — clients.company_type CHECK constraint update.
--
-- Founder reviewed /onboarding/profile/client after Q-090 (onboarding copy
-- reframe) and called out the company-type dropdown as the next gap. The
-- 5 visible values are reframed around founder framing: brand, label,
-- agency, startup, other. studio + independent are dropped.
--
-- Path: A (DECISIONS_CACHE Q-091).
-- Pre-flight check (2026-04-27): SELECT count(*) FROM public.clients = 0
-- in prod. No rows held legacy 'studio' or 'independent' values, so we
-- can tighten the CHECK without preservation.
--
-- The original constraint was created inline by 20260425000000 with
-- Postgres' auto-name `clients_company_type_check`.

BEGIN;

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_company_type_check;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_company_type_check
  CHECK (company_type IN ('brand', 'label', 'agency', 'startup', 'other'));

COMMIT;
