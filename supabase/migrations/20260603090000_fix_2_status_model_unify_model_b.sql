-- FIX-2 — Status model Model B.
--
-- Unify all client submissions at projects.status='submitted'. The submitted
-- state is the YAGI intake inbox. Only yagi_admin may explicitly accept a
-- submitted project into in_review. workspace_admin and client cannot perform
-- submitted -> in_review.
--
-- Also allow seed_project_board_from_wizard to run while the project is still
-- submitted, because submitted is now the canonical post-submit landing state.

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
        -- Wave B.5: submitted -> draft (recall before YAGI picks up the queue)
        WHEN from_status = 'submitted'    AND to_status = 'draft'       THEN true
        -- Wave B.5: in_review -> draft (recall during YAGI review window)
        WHEN from_status = 'in_review'    AND to_status = 'draft'       THEN true
        -- [pre-approved states] -> cancelled
        WHEN to_status = 'cancelled' AND from_status = ANY (ARRAY[
          'draft','submitted','in_review','in_progress','in_revision','delivered'
        ]) THEN true
        ELSE false
      END

    -- ---- yagi_admin-only explicit accept gate ----
    WHEN actor_role = 'yagi_admin'
         AND from_status = 'submitted'
         AND to_status   = 'in_review' THEN true

    -- ---- admin transitions (yagi_admin OR workspace_admin) ----
    WHEN actor_role IN ('yagi_admin','workspace_admin') THEN
      CASE
        WHEN from_status = 'in_review'    AND to_status = 'in_progress' THEN true
        WHEN from_status = 'in_revision'  AND to_status = 'in_progress' THEN true
        WHEN from_status = 'in_progress'  AND to_status = 'delivered'   THEN true
        WHEN from_status = 'approved'     AND to_status = 'archived'    THEN true
        -- NOTE: admin may NOT set delivered->approved (that is client-only above).
        -- NOTE: workspace_admin may NOT set submitted->in_review.
        -- NOTE: admin may NOT set submitted->draft or in_review->draft
        --       (recall is client-only, Wave B.5).
        WHEN to_status = 'cancelled' AND from_status = ANY (ARRAY[
          'draft','submitted','in_review','in_progress','in_revision','delivered'
        ]) THEN true
        ELSE false
      END

    -- ---- system transition ----
    WHEN actor_role = 'system' THEN
      -- The legacy system transition remains for compatibility, but Model B
      -- no longer auto-runs it from app code.
      CASE
        WHEN from_status = 'submitted' AND to_status = 'in_review' THEN true
        ELSE false
      END

    ELSE false
  END;
$$;

COMMENT ON FUNCTION public.is_valid_transition(text, text, text) IS
  'Phase 3.0 + Wave B.5 + FIX-2 Model B — pure truth-table guard for project '
  'state machine. Client submissions land at submitted; yagi_admin-only '
  'explicit accept gate allows submitted -> in_review. workspace_admin/client '
  'cannot accept submitted projects. Legacy system submitted -> in_review row '
  'is retained for compatibility.';

DO $$
BEGIN
  IF NOT public.is_valid_transition('submitted', 'in_review', 'yagi_admin') THEN
    RAISE EXCEPTION 'FIX-2 assert failed: yagi_admin submitted -> in_review must be true';
  END IF;
  IF public.is_valid_transition('submitted', 'in_review', 'workspace_admin') THEN
    RAISE EXCEPTION 'FIX-2 assert failed: workspace_admin submitted -> in_review must be false';
  END IF;
  IF public.is_valid_transition('submitted', 'in_review', 'client') THEN
    RAISE EXCEPTION 'FIX-2 assert failed: client submitted -> in_review must be false';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
  p_project_id            uuid,
  p_initial_document      jsonb,
  p_initial_attached_pdfs jsonb DEFAULT '[]'::jsonb,
  p_initial_attached_urls jsonb DEFAULT '[]'::jsonb,
  p_initial_asset_index   jsonb DEFAULT '[]'::jsonb  -- ignored; kept for backwards compat
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_board_id          uuid;
  v_existing_board_id uuid;
  v_project_status    text;
  v_caller_id         uuid := auth.uid();
  v_pdf               jsonb;
  v_url               jsonb;
  v_url_text          text;
  v_pdf_entries       jsonb := '[]'::jsonb;
  v_url_entries       jsonb := '[]'::jsonb;
  v_asset_index       jsonb;
BEGIN
  -- Auth gate (unchanged from prior migration).
  IF NOT is_yagi_admin(v_caller_id) AND NOT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = p_project_id AND p.created_by = v_caller_id
  ) THEN
    RAISE EXCEPTION 'seed_project_board_from_wizard: unauthorized';
  END IF;

  SELECT status INTO v_project_status
  FROM projects
  WHERE id = p_project_id;

  IF v_project_status IS NULL THEN
    RAISE EXCEPTION 'project not found: %', p_project_id;
  END IF;

  IF v_project_status NOT IN ('submitted', 'in_review') THEN
    RAISE EXCEPTION 'project % must be submitted or in_review to seed board; current status: %',
      p_project_id, v_project_status;
  END IF;

  -- Resolve / pre-create the board id so caller-bound checks for
  -- `project-board/<v_board_id>/...` storage_keys can run before we
  -- accept any client-supplied attachments.
  SELECT id INTO v_existing_board_id
  FROM project_boards WHERE project_id = p_project_id;
  v_board_id := COALESCE(v_existing_board_id, gen_random_uuid());

  -- ---------- LOOP 2 F3b: reject non-array attachment payloads ----------
  -- The original validation skipped non-array values, but the upsert
  -- below still wrote `COALESCE(p_initial_attached_pdfs, '[]'::jsonb)`
  -- which would have persisted a malformed scalar/object as-is.
  -- Reject early so the upsert only ever sees a NULL or a real array.
  IF p_initial_attached_pdfs IS NOT NULL
     AND jsonb_typeof(p_initial_attached_pdfs) != 'array' THEN
    RAISE EXCEPTION
      'seed_project_board_from_wizard: p_initial_attached_pdfs must be a jsonb array or null (got %)',
      jsonb_typeof(p_initial_attached_pdfs);
  END IF;
  IF p_initial_attached_urls IS NOT NULL
     AND jsonb_typeof(p_initial_attached_urls) != 'array' THEN
    RAISE EXCEPTION
      'seed_project_board_from_wizard: p_initial_attached_urls must be a jsonb array or null (got %)',
      jsonb_typeof(p_initial_attached_urls);
  END IF;

  -- ---------- Validate attached_pdfs ----------
  IF p_initial_attached_pdfs IS NOT NULL THEN
    FOR v_pdf IN SELECT * FROM jsonb_array_elements(p_initial_attached_pdfs)
    LOOP
      PERFORM assert_caller_bound_pdf_storage_key(
        v_pdf->>'storage_key',
        v_caller_id,
        v_board_id
      );
    END LOOP;
  END IF;

  -- ---------- Validate attached_urls (http/https only) ----------
  IF p_initial_attached_urls IS NOT NULL THEN
    FOR v_url IN SELECT * FROM jsonb_array_elements(p_initial_attached_urls)
    LOOP
      v_url_text := v_url->>'url';
      IF v_url_text IS NULL
         OR length(v_url_text) = 0
         OR length(v_url_text) > 2000
         OR NOT (v_url_text ~* '^https?://') THEN
        RAISE EXCEPTION 'seed_project_board_from_wizard: attached_url scheme must be http or https (got %)',
          coalesce(left(v_url_text, 80), '<null>');
      END IF;
    END LOOP;
  END IF;

  -- ---------- Server-recompute asset_index from arrays ----------
  -- (sub_03f_5 F3 option A) Canvas-derived entries are not built here;
  -- the first saveBoardDocumentAction call rebuilds asset_index from
  -- the document via the TypeScript extractAssetIndex helper.
  -- p_initial_asset_index is intentionally ignored.
  IF p_initial_attached_pdfs IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id',           pdf->>'id',
        'source',       'attached_pdf',
        'kind',         'pdf',
        'url',          pdf->>'storage_key',
        'title',        pdf->>'filename',
        'thumbnail_url', NULL,
        'filename',     pdf->>'filename',
        'size_bytes',   (pdf->>'size_bytes')::bigint,
        'note',         NULL,
        'added_at',     pdf->>'uploaded_at'
      )
      ORDER BY pdf->>'uploaded_at'
    ), '[]'::jsonb)
    INTO v_pdf_entries
    FROM jsonb_array_elements(p_initial_attached_pdfs) AS pdf;
  END IF;

  IF p_initial_attached_urls IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id',           u->>'id',
        'source',       'attached_url',
        'kind',         'url',
        'url',          u->>'url',
        'title',        u->>'title',
        'thumbnail_url', u->>'thumbnail_url',
        'provider',     u->>'provider',
        'note',         u->>'note',
        'added_at',     u->>'added_at'
      )
      ORDER BY u->>'added_at'
    ), '[]'::jsonb)
    INTO v_url_entries
    FROM jsonb_array_elements(p_initial_attached_urls) AS u;
  END IF;

  v_asset_index := v_pdf_entries || v_url_entries;

  -- ---------- Upsert ----------
  INSERT INTO project_boards (
    id, project_id, document, attached_pdfs, attached_urls, asset_index, source
  )
  VALUES (
    v_board_id,
    p_project_id,
    p_initial_document,
    COALESCE(p_initial_attached_pdfs, '[]'::jsonb),
    COALESCE(p_initial_attached_urls, '[]'::jsonb),
    v_asset_index,
    'wizard_seed'
  )
  ON CONFLICT (project_id) DO UPDATE
    SET document      = EXCLUDED.document,
        attached_pdfs = EXCLUDED.attached_pdfs,
        attached_urls = EXCLUDED.attached_urls,
        asset_index   = EXCLUDED.asset_index,
        source        = 'wizard_seed',
        updated_at    = now()
  RETURNING id INTO v_board_id;

  RETURN v_board_id;
END;
$$;

COMMENT ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb, jsonb, jsonb) IS
  'Wave C.5d sub_03f_5 F3 + FIX-2 Model B: caller-bound storage_key validation '
  'on every attached_pdf entry, http/https-only attached_url, server-recomputed '
  'asset_index from arrays. Accepts submitted or in_review projects so boards '
  'can be seeded at the canonical post-submit state.';
