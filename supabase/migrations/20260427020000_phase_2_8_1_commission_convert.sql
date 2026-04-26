-- =============================================================================
-- Phase 2.8.1 G_B1-H — Commission → Project Workshop conversion
-- =============================================================================
-- Wires the commission intake queue to the Brief Board project hub.
-- Adds:
--   1. commission_intakes.converted_to_project_id (FK projects.id, ON DELETE
--      SET NULL) + index.
--   2. New legal state value 'converted'.
--   3. Trigger updated to permit submitted→converted AND admin_responded→
--      converted, and to block non-admin self-mutation of the new column.
--   4. SECURITY DEFINER RPC convert_commission_to_project(uuid):
--        - yagi_admin only
--        - finds client's primary workspace
--        - INSERT projects + project_briefs sibling + project_references
--          (one per commission_intakes.reference_urls element)
--        - flips commission_intakes.state='converted' with FK
--        - emits notification_events row (kind='commission_converted', high
--          severity, deep-links to /app/projects/[id]?tab=brief)
--        - returns { projectId, alreadyConverted }; idempotent on re-call.
--
-- SPEC §8.5 (G_B1-H) source.

BEGIN;

-- 1. Schema additions ---------------------------------------------------------

ALTER TABLE public.commission_intakes
  ADD COLUMN IF NOT EXISTS converted_to_project_id uuid
    REFERENCES public.projects(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.commission_intakes.converted_to_project_id IS
  'Phase 2.8.1 — populated by convert_commission_to_project(). Points at '
  'the Workshop project that absorbed this intake. ON DELETE SET NULL so '
  'project deletion does not cascade through the intake history.';

CREATE INDEX IF NOT EXISTS commission_intakes_converted_project_idx
  ON public.commission_intakes(converted_to_project_id)
  WHERE converted_to_project_id IS NOT NULL;

ALTER TABLE public.commission_intakes
  DROP CONSTRAINT IF EXISTS commission_intakes_state_check;
ALTER TABLE public.commission_intakes
  ADD CONSTRAINT commission_intakes_state_check
    CHECK (state IN ('submitted', 'admin_responded', 'closed', 'archived', 'converted'));

-- 2. Trigger update -----------------------------------------------------------
-- Replaces the pre-2.8.1 transition table with one row added:
--   submitted        → converted
--   admin_responded  → converted
-- and adds a column-guard that prevents non-admins from mutating
-- converted_to_project_id directly (RPC is the only legal write path).

CREATE OR REPLACE FUNCTION public.validate_commission_intake_state_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_admin boolean := false;
BEGIN
  IF v_caller IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_admin := public.is_yagi_admin(v_caller);

  IF TG_OP = 'UPDATE' AND NOT v_is_admin THEN
    IF NEW.admin_response_md      IS DISTINCT FROM OLD.admin_response_md
       OR NEW.admin_responded_at  IS DISTINCT FROM OLD.admin_responded_at
       OR NEW.admin_responded_by  IS DISTINCT FROM OLD.admin_responded_by
       OR NEW.converted_to_project_id IS DISTINCT FROM OLD.converted_to_project_id THEN
      RAISE EXCEPTION
        'only admin may modify admin response / conversion columns'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.state IS DISTINCT FROM NEW.state THEN
    IF NOT (
      (OLD.state = 'submitted'         AND NEW.state IN ('admin_responded', 'archived', 'converted'))
      OR (OLD.state = 'admin_responded' AND NEW.state IN ('closed', 'archived', 'converted'))
      OR (OLD.state = 'closed'         AND NEW.state = 'archived')
    ) THEN
      RAISE EXCEPTION
        'invalid commission_intake state transition: % -> %',
        OLD.state, NEW.state
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.validate_commission_intake_state_transition() FROM PUBLIC;

-- Trigger reference is unchanged — we just replaced the function body.

-- 3. Conversion RPC -----------------------------------------------------------

CREATE OR REPLACE FUNCTION public.convert_commission_to_project(
  p_commission_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_intake public.commission_intakes%ROWTYPE;
  v_workspace_id uuid;
  v_project_id uuid;
  v_ref_url text;
  v_ref_count int := 0;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_yagi_admin(v_caller) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Row-level lock so a double-click on the admin button doesn't create
  -- two projects. Concurrent callers serialize and the second observes
  -- state='converted'.
  SELECT * INTO v_intake
    FROM public.commission_intakes
   WHERE id = p_commission_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotent re-call: if already converted, return the existing project_id.
  IF v_intake.state = 'converted' AND v_intake.converted_to_project_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'projectId', v_intake.converted_to_project_id,
      'alreadyConverted', true,
      'referencesAdded', 0
    );
  END IF;

  -- Locate the client's workspace. Phase 2.7 onboarding seeds one
  -- workspace per client; the oldest membership is the canonical owner.
  SELECT wm.workspace_id INTO v_workspace_id
    FROM public.workspace_members wm
   WHERE wm.user_id = v_intake.client_id
   ORDER BY wm.created_at ASC
   LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'client_no_workspace' USING ERRCODE = '23503';
  END IF;

  -- 1. projects row (status='submitted' so the brief tab loads in the
  --    standard read+comment flow rather than the wizard draft state).
  INSERT INTO public.projects (
    workspace_id, created_by, project_type, status, title, brief,
    intake_mode, deliverable_types
  ) VALUES (
    v_workspace_id,
    v_intake.client_id,
    'direct_commission',
    'submitted',
    v_intake.title,
    v_intake.brief_md,
    'brief',
    ARRAY[v_intake.category]
  )
  RETURNING id INTO v_project_id;

  -- 2. project_briefs sibling. Trigger validate_project_brief_change
  --    enforces status='editing' / current_version=0 for non-admin
  --    INSERTs; this RPC is yagi_admin so the bypass branch applies.
  --
  -- Codex K-05 finding 1 (HIGH-B) — seed content_json from brief_md so
  -- the client lands on a non-empty Brief Board when they follow the
  -- commission_converted notification. The pre-fix migration left
  -- content_json at the column DEFAULT (empty doc), so /app/projects/[id]
  -- (Brief default tab in G_B1-I) read empty even though the original
  -- brief lived on `projects.brief`. We expand brief_md line-by-line
  -- into TipTap paragraph nodes — empty lines become empty paragraphs,
  -- which preserves visual spacing without forcing the client to
  -- re-author the content on first view.
  INSERT INTO public.project_briefs (project_id, updated_by, content_json)
  VALUES (
    v_project_id,
    v_caller,
    jsonb_build_object(
      'type', 'doc',
      'content', coalesce(
        (
          SELECT jsonb_agg(
            CASE
              WHEN line = '' THEN
                jsonb_build_object('type', 'paragraph')
              ELSE
                jsonb_build_object(
                  'type', 'paragraph',
                  'content', jsonb_build_array(
                    jsonb_build_object('type', 'text', 'text', line)
                  )
                )
            END
          )
          FROM regexp_split_to_table(coalesce(v_intake.brief_md, ''), E'\n') AS line
        ),
        '[]'::jsonb
      )
    )
  );

  -- 3. project_references — one row per URL in reference_urls jsonb.
  --    Same R2 bucket as Brief Board uploads; reference_uploads (R2 keys)
  --    are intentionally not imported here — they live on the intake's
  --    upload bucket and are linked separately by yagi if needed.
  FOR v_ref_url IN
    SELECT jsonb_array_elements_text(v_intake.reference_urls)
  LOOP
    INSERT INTO public.project_references (
      project_id, added_by, external_url, media_type
    ) VALUES (
      v_project_id, v_caller, v_ref_url, 'image'
    );
    v_ref_count := v_ref_count + 1;
  END LOOP;

  -- 4. Flip intake state. Trigger permits admin_responded→converted and
  --    submitted→converted; the column-guard branch is bypassed for
  --    yagi_admin.
  UPDATE public.commission_intakes
     SET state = 'converted',
         converted_to_project_id = v_project_id,
         updated_at = now()
   WHERE id = p_commission_id;

  -- 5. notification_events for the client. Severity high so it surfaces
  --    in both digest and immediate channels per notification_preferences.
  INSERT INTO public.notification_events (
    user_id, project_id, workspace_id, kind, severity, title, body, url_path
  ) VALUES (
    v_intake.client_id,
    v_project_id,
    v_workspace_id,
    'commission_converted',
    'high',
    'YAGI 가 작업실을 열었습니다',
    'YAGI 가 [' || v_intake.title || '] 의뢰를 받고 새 작업실을 열었습니다.',
    '/app/projects/' || v_project_id::text || '?tab=brief'
  );

  RETURN jsonb_build_object(
    'projectId', v_project_id,
    'alreadyConverted', false,
    'referencesAdded', v_ref_count
  );
END $$;

COMMENT ON FUNCTION public.convert_commission_to_project(uuid) IS
  'Phase 2.8.1 G_B1-H — atomically convert a commission_intakes row into a '
  'projects + project_briefs + project_references trio, mark the intake as '
  'converted, and notify the client. yagi_admin only. Idempotent on re-call.';

REVOKE ALL ON FUNCTION public.convert_commission_to_project(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_commission_to_project(uuid)
  TO authenticated, service_role;

COMMIT;
