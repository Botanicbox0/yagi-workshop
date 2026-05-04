-- Phase 5 Wave B.5 — client recall (submitted/in_review -> draft).
--
-- Adds exactly two new rows to is_valid_transition's `client` CASE
-- block so a project creator can pull a project back into 'draft'
-- before YAGI starts work on it. Wave C will surface this via
-- RecallButton + AlertDialog on the detail page.
--
-- New transitions:
--
--   actor_role='client':
--     submitted   -> draft   (creator changes their mind / fixes typo
--                              before YAGI takes the queue)
--     in_review   -> draft   (creator pulls back during the brief
--                              YAGI-side review window — race-safe
--                              against trg_guard_projects_status +
--                              transition_project_status's row lock)
--
-- Forbidden (verified via SPEC verify steps 6-8):
--
--   actor_role='yagi_admin'      -> NO * -> draft
--   actor_role='workspace_admin' -> NO * -> draft
--   actor_role='client'          -> NO in_progress / in_revision /
--                                       delivered / approved -> draft
--   actor_role='system'          -> NO transitions other than
--                                       submitted -> in_review
--
-- The recall is therefore a one-way escape valve only available to
-- the creator while the project is still in the pre-work window
-- (submitted or in_review).
--
-- Composes with Wave B's creator-first role resolution patch
-- (20260504200001_phase_5_transition_project_status_creator_role.sql):
-- a workspace creator who also holds workspace_admin will be resolved
-- to 'client' by transition_project_status when acting on their own
-- project, so the new client rows trigger as intended.
--
-- All other rows of is_valid_transition's truth table are copied
-- verbatim from Phase 3.0 (20260427164421_phase_3_0_projects_lifecycle.sql,
-- section D). Function signature, language, immutability, security
-- definer, search_path, and grants are preserved by CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.is_valid_transition(
  from_status text,
  to_status   text,
  actor_role  text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE

    -- ---- client transitions ----
    WHEN actor_role = 'client' THEN
      CASE
        -- draft -> submitted
        WHEN from_status = 'draft'        AND to_status = 'submitted'   THEN true
        -- in_progress -> in_revision
        WHEN from_status = 'in_progress'  AND to_status = 'in_revision' THEN true
        -- delivered -> in_revision
        WHEN from_status = 'delivered'    AND to_status = 'in_revision' THEN true
        -- delivered -> approved (client-ONLY; this pair intentionally absent from admin block)
        WHEN from_status = 'delivered'    AND to_status = 'approved'    THEN true
        -- Wave B.5 NEW: submitted -> draft (recall before YAGI picks up the queue)
        WHEN from_status = 'submitted'    AND to_status = 'draft'       THEN true
        -- Wave B.5 NEW: in_review -> draft (recall during YAGI review window)
        WHEN from_status = 'in_review'    AND to_status = 'draft'       THEN true
        -- [pre-approved states] -> cancelled
        WHEN to_status = 'cancelled' AND from_status = ANY (ARRAY[
          'draft','submitted','in_review','in_progress','in_revision','delivered'
        ]) THEN true
        ELSE false
      END

    -- ---- admin transitions (yagi_admin OR workspace_admin) ----
    WHEN actor_role IN ('yagi_admin','workspace_admin') THEN
      CASE
        WHEN from_status = 'in_review'    AND to_status = 'in_progress' THEN true
        WHEN from_status = 'in_revision'  AND to_status = 'in_progress' THEN true
        WHEN from_status = 'in_progress'  AND to_status = 'delivered'   THEN true
        WHEN from_status = 'approved'     AND to_status = 'archived'    THEN true
        -- NOTE: admin may NOT set delivered->approved (that is client-only above).
        -- NOTE: admin may NOT set submitted->draft or in_review->draft
        --       (recall is client-only, Wave B.5).
        WHEN to_status = 'cancelled' AND from_status = ANY (ARRAY[
          'draft','submitted','in_review','in_progress','in_revision','delivered'
        ]) THEN true
        ELSE false
      END

    -- ---- system transition ----
    WHEN actor_role = 'system' THEN
      -- The ONLY system transition: submitted -> in_review (L-015 auto-transition).
      -- system is NOT permitted to recall (Wave B.5 client-only).
      CASE
        WHEN from_status = 'submitted' AND to_status = 'in_review' THEN true
        ELSE false
      END

    ELSE false
  END;
$$;

COMMENT ON FUNCTION public.is_valid_transition(text, text, text) IS
  'Phase 3.0 + Wave B.5 — pure truth-table guard for project state machine. '
  'IMMUTABLE. Called by transition_project_status() before any write. '
  'Wave B.5 added client recall: submitted -> draft and in_review -> draft. '
  'See migration headers for full allowed-transition table.';
