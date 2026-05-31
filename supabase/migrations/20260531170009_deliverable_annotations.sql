-- Deliverable image annotations: normalized pin/box coordinates + per-pin threads.
-- Thread model: annotation threads use project_threads.annotation_id and keep
-- deliverable_id NULL so the existing "one thread per deliverable version"
-- invariant remains intact.

ALTER TABLE public.project_threads
  ADD COLUMN IF NOT EXISTS annotation_id uuid NULL;

DROP INDEX IF EXISTS public.project_threads_one_per_deliverable_idx;
CREATE UNIQUE INDEX IF NOT EXISTS project_threads_one_per_deliverable_idx
  ON public.project_threads(project_id, deliverable_id)
  WHERE deliverable_id IS NOT NULL AND annotation_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS project_threads_one_per_annotation_idx
  ON public.project_threads(annotation_id)
  WHERE annotation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS project_threads_annotation_idx
  ON public.project_threads(annotation_id)
  WHERE annotation_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.deliverable_annotation_coords_valid(
  p_shape text,
  p_coords jsonb
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_x numeric;
  v_y numeric;
  v_w numeric;
  v_h numeric;
BEGIN
  IF p_shape NOT IN ('pin', 'box') THEN
    RETURN false;
  END IF;

  IF p_coords IS NULL OR jsonb_typeof(p_coords) <> 'object' THEN
    RETURN false;
  END IF;

  IF NOT (p_coords ? 'x') OR NOT (p_coords ? 'y') THEN
    RETURN false;
  END IF;
  IF jsonb_typeof(p_coords->'x') <> 'number'
     OR jsonb_typeof(p_coords->'y') <> 'number' THEN
    RETURN false;
  END IF;

  v_x := (p_coords->>'x')::numeric;
  v_y := (p_coords->>'y')::numeric;

  IF v_x < 0 OR v_x > 1 OR v_y < 0 OR v_y > 1 THEN
    RETURN false;
  END IF;

  IF p_shape = 'pin' THEN
    RETURN true;
  END IF;

  IF NOT (p_coords ? 'w') OR NOT (p_coords ? 'h') THEN
    RETURN false;
  END IF;
  IF jsonb_typeof(p_coords->'w') <> 'number'
     OR jsonb_typeof(p_coords->'h') <> 'number' THEN
    RETURN false;
  END IF;

  v_w := (p_coords->>'w')::numeric;
  v_h := (p_coords->>'h')::numeric;

  RETURN v_w > 0
    AND v_w <= 1
    AND v_h > 0
    AND v_h <= 1
    AND v_x + v_w <= 1
    AND v_y + v_h <= 1;
EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$$;

CREATE TABLE IF NOT EXISTS public.deliverable_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  deliverable_id uuid NOT NULL,
  asset_index integer NOT NULL DEFAULT 0,
  seq integer NOT NULL,
  shape text NOT NULL DEFAULT 'pin',
  coords jsonb NOT NULL,
  timestamp_sec numeric NULL,
  thread_id uuid NOT NULL,
  visibility text NOT NULL DEFAULT 'client',
  status text NOT NULL DEFAULT 'open',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_by uuid NULL,
  resolved_at timestamptz NULL,
  CONSTRAINT deliverable_annotations_asset_index_check CHECK (asset_index >= 0),
  CONSTRAINT deliverable_annotations_seq_check CHECK (seq > 0),
  CONSTRAINT deliverable_annotations_shape_check CHECK (shape IN ('pin', 'box')),
  CONSTRAINT deliverable_annotations_visibility_check CHECK (visibility IN ('internal', 'client')),
  CONSTRAINT deliverable_annotations_status_check CHECK (status IN ('open', 'resolved')),
  CONSTRAINT deliverable_annotations_coords_check
    CHECK (public.deliverable_annotation_coords_valid(shape, coords)),
  CONSTRAINT deliverable_annotations_project_deliverable_fkey
    FOREIGN KEY (project_id, deliverable_id)
    REFERENCES public.project_deliverables(project_id, id)
    ON DELETE CASCADE,
  CONSTRAINT deliverable_annotations_thread_fkey
    FOREIGN KEY (thread_id)
    REFERENCES public.project_threads(id)
    ON DELETE CASCADE,
  CONSTRAINT deliverable_annotations_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES public.profiles(id),
  CONSTRAINT deliverable_annotations_resolved_by_fkey
    FOREIGN KEY (resolved_by)
    REFERENCES public.profiles(id),
  CONSTRAINT deliverable_annotations_thread_unique UNIQUE (thread_id),
  CONSTRAINT deliverable_annotations_seq_unique UNIQUE (deliverable_id, asset_index, seq)
);

ALTER TABLE public.project_threads
  DROP CONSTRAINT IF EXISTS project_threads_annotation_fkey;
ALTER TABLE public.project_threads
  ADD CONSTRAINT project_threads_annotation_fkey
  FOREIGN KEY (annotation_id)
  REFERENCES public.deliverable_annotations(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX IF NOT EXISTS deliverable_annotations_asset_idx
  ON public.deliverable_annotations(deliverable_id, asset_index);
CREATE INDEX IF NOT EXISTS deliverable_annotations_thread_idx
  ON public.deliverable_annotations(thread_id);
CREATE INDEX IF NOT EXISTS deliverable_annotations_project_idx
  ON public.deliverable_annotations(project_id);

ALTER TABLE public.deliverable_annotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deliverable_annotations_project_select ON public.deliverable_annotations;
CREATE POLICY deliverable_annotations_project_select
ON public.deliverable_annotations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = deliverable_annotations.project_id
      AND (
        public.is_ws_member(auth.uid(), p.workspace_id)
        OR public.is_yagi_admin(auth.uid())
      )
  )
);

DROP POLICY IF EXISTS deliverable_annotations_visibility_select ON public.deliverable_annotations;
CREATE POLICY deliverable_annotations_visibility_select
ON public.deliverable_annotations
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  visibility = 'client'
  OR public.is_yagi_admin(auth.uid())
  OR created_by = auth.uid()
);

DROP POLICY IF EXISTS deliverable_annotations_update ON public.deliverable_annotations;

DROP POLICY IF EXISTS project_threads_annotation_visibility_select ON public.project_threads;
CREATE POLICY project_threads_annotation_visibility_select
ON public.project_threads
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
    annotation_id IS NULL
    OR public.is_yagi_admin(auth.uid())
    OR EXISTS (
    SELECT 1
    FROM public.deliverable_annotations da
    JOIN public.projects p ON p.id = da.project_id
    WHERE da.id = project_threads.annotation_id
      AND (
        (
          da.visibility = 'client'
          AND public.is_ws_member(auth.uid(), p.workspace_id)
        )
        OR da.created_by = auth.uid()
      )
  )
);

DROP POLICY IF EXISTS project_threads_annotation_visibility_insert ON public.project_threads;
CREATE POLICY project_threads_annotation_visibility_insert
ON public.project_threads
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
    annotation_id IS NULL
    OR public.is_yagi_admin(auth.uid())
    OR EXISTS (
    SELECT 1
    FROM public.deliverable_annotations da
    JOIN public.projects p ON p.id = da.project_id
    WHERE da.id = project_threads.annotation_id
      AND (
        (
          da.visibility = 'client'
          AND public.is_ws_member(auth.uid(), p.workspace_id)
        )
        OR da.created_by = auth.uid()
      )
  )
);

DROP POLICY IF EXISTS project_threads_annotation_visibility_update ON public.project_threads;
CREATE POLICY project_threads_annotation_visibility_update
ON public.project_threads
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (
  annotation_id IS NULL
  OR public.is_yagi_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.deliverable_annotations da
    JOIN public.projects p ON p.id = da.project_id
    WHERE da.id = project_threads.annotation_id
      AND (
        (
          da.visibility = 'client'
          AND public.is_ws_member(auth.uid(), p.workspace_id)
        )
        OR da.created_by = auth.uid()
      )
  )
)
WITH CHECK (
  annotation_id IS NULL
  OR public.is_yagi_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.deliverable_annotations da
    JOIN public.projects p ON p.id = da.project_id
    WHERE da.id = project_threads.annotation_id
      AND (
        (
          da.visibility = 'client'
          AND public.is_ws_member(auth.uid(), p.workspace_id)
        )
        OR da.created_by = auth.uid()
      )
  )
);

DROP POLICY IF EXISTS project_threads_annotation_visibility_delete ON public.project_threads;
CREATE POLICY project_threads_annotation_visibility_delete
ON public.project_threads
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (
  annotation_id IS NULL
  OR public.is_yagi_admin(auth.uid())
);

DROP POLICY IF EXISTS thread_messages_annotation_visibility_select ON public.thread_messages;
CREATE POLICY thread_messages_annotation_visibility_select
ON public.thread_messages
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  NOT EXISTS (
    SELECT 1
    FROM public.project_threads t
    JOIN public.deliverable_annotations da ON da.id = t.annotation_id
    JOIN public.projects p ON p.id = da.project_id
    WHERE t.id = thread_messages.thread_id
      AND NOT (
        public.is_yagi_admin(auth.uid())
        OR da.created_by = auth.uid()
        OR (
          da.visibility = 'client'
          AND public.is_ws_member(auth.uid(), p.workspace_id)
        )
      )
  )
);

DROP POLICY IF EXISTS thread_messages_annotation_visibility_insert ON public.thread_messages;
CREATE POLICY thread_messages_annotation_visibility_insert
ON public.thread_messages
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1
    FROM public.project_threads t
    JOIN public.deliverable_annotations da ON da.id = t.annotation_id
    JOIN public.projects p ON p.id = da.project_id
    WHERE t.id = thread_messages.thread_id
      AND NOT (
        public.is_yagi_admin(auth.uid())
        OR da.created_by = auth.uid()
        OR (
          da.visibility = 'client'
          AND public.is_ws_member(auth.uid(), p.workspace_id)
        )
      )
  )
);

DROP POLICY IF EXISTS thread_messages_annotation_visibility_update ON public.thread_messages;
CREATE POLICY thread_messages_annotation_visibility_update
ON public.thread_messages
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (
  NOT EXISTS (
    SELECT 1
    FROM public.project_threads t
    JOIN public.deliverable_annotations da ON da.id = t.annotation_id
    JOIN public.projects p ON p.id = da.project_id
    WHERE t.id = thread_messages.thread_id
      AND NOT (
        public.is_yagi_admin(auth.uid())
        OR da.created_by = auth.uid()
        OR (
          da.visibility = 'client'
          AND public.is_ws_member(auth.uid(), p.workspace_id)
        )
      )
  )
)
WITH CHECK (
  NOT EXISTS (
    SELECT 1
    FROM public.project_threads t
    JOIN public.deliverable_annotations da ON da.id = t.annotation_id
    JOIN public.projects p ON p.id = da.project_id
    WHERE t.id = thread_messages.thread_id
      AND NOT (
        public.is_yagi_admin(auth.uid())
        OR da.created_by = auth.uid()
        OR (
          da.visibility = 'client'
          AND public.is_ws_member(auth.uid(), p.workspace_id)
        )
      )
  )
);

DROP POLICY IF EXISTS thread_messages_annotation_visibility_delete ON public.thread_messages;
CREATE POLICY thread_messages_annotation_visibility_delete
ON public.thread_messages
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (
  NOT EXISTS (
    SELECT 1
    FROM public.project_threads t
    JOIN public.deliverable_annotations da ON da.id = t.annotation_id
    JOIN public.projects p ON p.id = da.project_id
    WHERE t.id = thread_messages.thread_id
      AND NOT (
        public.is_yagi_admin(auth.uid())
        OR da.created_by = auth.uid()
        OR (
          da.visibility = 'client'
          AND public.is_ws_member(auth.uid(), p.workspace_id)
        )
      )
  )
);

CREATE OR REPLACE FUNCTION public.create_deliverable_annotation(
  p_project_id uuid,
  p_deliverable_id uuid,
  p_asset_index integer,
  p_shape text,
  p_coords jsonb,
  p_visibility text DEFAULT 'client',
  p_body text DEFAULT NULL
)
RETURNS TABLE(annotation_id uuid, annotation_thread_id uuid, annotation_seq integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_workspace_id uuid;
  v_is_yagi_admin boolean;
  v_thread_id uuid;
  v_annotation_id uuid;
  v_seq integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000';
  END IF;

  IF p_asset_index < 0 THEN
    RAISE EXCEPTION 'invalid_asset_index' USING ERRCODE = '22023';
  END IF;

  IF p_shape NOT IN ('pin', 'box')
     OR p_visibility NOT IN ('client', 'internal')
     OR NOT public.deliverable_annotation_coords_valid(p_shape, p_coords) THEN
    RAISE EXCEPTION 'invalid_annotation' USING ERRCODE = '22023';
  END IF;

  SELECT p.workspace_id
    INTO v_workspace_id
  FROM public.project_deliverables d
  JOIN public.projects p ON p.id = d.project_id
  WHERE d.id = p_deliverable_id
    AND d.project_id = p_project_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'deliverable_not_found' USING ERRCODE = 'P0002';
  END IF;

  v_is_yagi_admin := public.is_yagi_admin(v_uid);

  IF NOT (
    v_is_yagi_admin
    OR public.is_ws_member(v_uid, v_workspace_id)
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_visibility = 'internal' AND NOT v_is_yagi_admin THEN
    RAISE EXCEPTION 'internal_visibility_requires_yagi_admin' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_deliverable_id::text), p_asset_index);

  SELECT COALESCE(MAX(seq), 0) + 1
    INTO v_seq
  FROM public.deliverable_annotations
  WHERE deliverable_id = p_deliverable_id
    AND asset_index = p_asset_index;

  INSERT INTO public.project_threads(project_id, title, created_by, annotation_id)
  VALUES (p_project_id, 'Annotation #' || v_seq::text, v_uid, NULL)
  RETURNING id INTO v_thread_id;

  INSERT INTO public.deliverable_annotations(
    project_id,
    deliverable_id,
    asset_index,
    seq,
    shape,
    coords,
    thread_id,
    visibility,
    created_by
  )
  VALUES (
    p_project_id,
    p_deliverable_id,
    p_asset_index,
    v_seq,
    p_shape,
    p_coords,
    v_thread_id,
    p_visibility,
    v_uid
  )
  RETURNING id INTO v_annotation_id;

  UPDATE public.project_threads
  SET annotation_id = v_annotation_id
  WHERE id = v_thread_id;

  IF p_body IS NOT NULL AND length(btrim(p_body)) > 0 THEN
    INSERT INTO public.thread_messages(thread_id, author_id, body, visibility)
    VALUES (
      v_thread_id,
      v_uid,
      btrim(p_body),
      CASE WHEN p_visibility = 'internal' THEN 'internal' ELSE 'shared' END
    );
  END IF;

  RETURN QUERY SELECT v_annotation_id, v_thread_id, v_seq;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_deliverable_annotation_status(
  p_annotation_id uuid,
  p_status text
)
RETURNS TABLE(annotation_id uuid, status text, resolved_by uuid, resolved_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.deliverable_annotations%ROWTYPE;
  v_workspace_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000';
  END IF;

  IF p_status NOT IN ('open', 'resolved') THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_row
  FROM public.deliverable_annotations
  WHERE id = p_annotation_id;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'annotation_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT workspace_id
    INTO v_workspace_id
  FROM public.projects
  WHERE id = v_row.project_id;

  IF NOT (
    public.is_yagi_admin(v_uid)
    OR v_row.created_by = v_uid
    OR (v_row.visibility = 'client' AND public.is_ws_member(v_uid, v_workspace_id))
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.deliverable_annotations da
  SET
    status = p_status,
    resolved_by = CASE WHEN p_status = 'resolved' THEN v_uid ELSE NULL END,
    resolved_at = CASE WHEN p_status = 'resolved' THEN now() ELSE NULL END
  WHERE da.id = p_annotation_id
  RETURNING da.id, da.status, da.resolved_by, da.resolved_at
  INTO annotation_id, status, resolved_by, resolved_at;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_deliverable_annotation(uuid, uuid, integer, text, jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_deliverable_annotation(uuid, uuid, integer, text, jsonb, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.set_deliverable_annotation_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_deliverable_annotation_status(uuid, text) TO authenticated;

COMMENT ON TABLE public.deliverable_annotations IS
  'Coordinate annotations for immutable project_deliverables assets. Coordinates are normalized 0..1.';
COMMENT ON COLUMN public.project_threads.annotation_id IS
  'Annotation-scoped thread link. Annotation threads keep deliverable_id NULL to preserve one default thread per deliverable.';
