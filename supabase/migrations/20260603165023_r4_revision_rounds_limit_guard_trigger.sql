CREATE OR REPLACE FUNCTION public.guard_revision_rounds_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.revision_rounds_limit IS DISTINCT FROM OLD.revision_rounds_limit
     AND current_setting('app.allow_rounds_limit_write', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'revision_rounds_limit_write_forbidden'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_revision_rounds_limit ON public.projects;
CREATE TRIGGER trg_guard_revision_rounds_limit
BEFORE UPDATE OF revision_rounds_limit ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.guard_revision_rounds_limit();

CREATE OR REPLACE FUNCTION public.set_project_revision_rounds_limit(
  p_project_id uuid,
  p_limit integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_yagi_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_limit IS NULL OR p_limit < 0 OR p_limit > 50 THEN
    RAISE EXCEPTION 'revision_rounds_limit_out_of_range' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('app.allow_rounds_limit_write', 'on', true);

  UPDATE public.projects
  SET revision_rounds_limit = p_limit
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'project_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_project_revision_rounds_limit(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_project_revision_rounds_limit(uuid, integer) TO service_role;
