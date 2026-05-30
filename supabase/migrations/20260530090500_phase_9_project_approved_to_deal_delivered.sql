-- Phase 9 — Project approved -> deal delivered bridge.
--
-- Scope:
--   - Do not modify transition_project_status().
--   - AFTER UPDATE OF projects.status only.
--   - If an accepted deal is linked to the approved project, move it to
--     delivered as actor_role = system.

CREATE OR REPLACE FUNCTION public.deliver_linked_deals_on_project_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal record;
BEGIN
  IF NEW.status <> 'approved' OR OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  FOR v_deal IN
    SELECT d.id, d.status
    FROM public.deals d
    WHERE d.project_id = NEW.id
      AND d.status = 'accepted'
    FOR UPDATE
  LOOP
    IF NOT public.is_valid_deal_transition(v_deal.status, 'delivered', 'system') THEN
      RAISE EXCEPTION 'invalid_transition: % -> delivered for role system',
        v_deal.status
        USING ERRCODE = '23514';
    END IF;

    PERFORM set_config('local.transition_rpc_active', 'on', true);

    UPDATE public.deals
       SET status = 'delivered'
     WHERE id = v_deal.id;

    INSERT INTO public.deal_status_history (
      deal_id,
      from_status,
      to_status,
      actor_id,
      actor_role,
      comment
    ) VALUES (
      v_deal.id,
      v_deal.status,
      'delivered',
      NULL,
      'system',
      'project_approved'
    );

    PERFORM set_config('local.transition_rpc_active', 'off', true);
  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.deliver_linked_deals_on_project_approved() IS
  'Phase 9 SECURITY DEFINER bridge. AFTER projects.status approved, linked accepted deals become delivered as system.';

REVOKE ALL ON FUNCTION public.deliver_linked_deals_on_project_approved()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS projects_approved_to_deal_delivered
  ON public.projects;

CREATE TRIGGER projects_approved_to_deal_delivered
  AFTER UPDATE OF status ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.deliver_linked_deals_on_project_approved();

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.deliver_linked_deals_on_project_approved()', 'EXECUTE') THEN
    RAISE EXCEPTION 'project deal bridge grant assert failed: anon can execute trigger function';
  END IF;
  IF has_function_privilege('authenticated', 'public.deliver_linked_deals_on_project_approved()', 'EXECUTE') THEN
    RAISE EXCEPTION 'project deal bridge grant assert failed: authenticated can execute trigger function';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'projects_approved_to_deal_delivered'
      AND tgrelid = 'public.projects'::regclass
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'project deal bridge assert failed: trigger missing';
  END IF;
END $$;
