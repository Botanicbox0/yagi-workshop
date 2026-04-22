-- Phase 2.1 G5 FIX_NOW #2 — atomic meeting+attendees insert.
--
-- Addresses Phase 1.3 M1 (orphan meetings): before this RPC, createMeeting
-- Server Action inserted a row into `meetings` first, then bulk-inserted
-- rows into `meeting_attendees`. If the attendee insert failed (constraint
-- violation, network blip), the meeting row persisted alone — UI showed
-- "0 invitees"; Google Calendar retry path may still fire to nobody;
-- `suggestLineItems` picked up garbage rows for invoice candidates.
--
-- The plpgsql function body runs in a single implicit transaction, so any
-- error inside (attendee row violating a CHECK, RLS rejection, duplicate
-- PK, ...) rolls the entire unit back atomically — no orphan possible.
--
-- SECURITY INVOKER: existing RLS policies on both tables already gate
-- inserts to ws_admin / yagi_admin, and the caller has already been
-- verified in the Server Action via app-side authz. No search_path pin
-- needed for INVOKER (inherits from caller).
--
-- Attendees are passed as a JSONB array of { email, display_name } so the
-- shape mirrors the Server Action's existing attendeeRows mapping.
--
-- `p_description` is the only nullable-by-default parameter (DEFAULT NULL);
-- keeping it trailing satisfies Postgres's rule that defaults must be
-- contiguous at the end of the signature. The TypeScript generator
-- marks only this param as nullable on the client side.

-- Defensive drop: if a previous migration run created the function with a
-- different positional type signature, PG would leave that variant behind
-- (overload semantics). Drop any prior shape before we recreate so the
-- client's supabase.rpc(...) call resolves unambiguously.
DROP FUNCTION IF EXISTS public.create_meeting_with_attendees(
  uuid, uuid, text, text, timestamptz, integer, uuid, jsonb
);

CREATE OR REPLACE FUNCTION public.create_meeting_with_attendees(
  p_project_id uuid,
  p_workspace_id uuid,
  p_title text,
  p_scheduled_at timestamptz,
  p_duration_minutes integer,
  p_created_by uuid,
  p_attendees jsonb,
  p_description text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_meeting_id uuid;
  v_attendee jsonb;
BEGIN
  -- Insert meeting. The meetings_sync_workspace_id_ins BEFORE INSERT
  -- trigger re-derives workspace_id from the project row; passing
  -- p_workspace_id is still useful for explicit NOT NULL satisfaction
  -- and keeps the RPC signature self-describing.
  INSERT INTO public.meetings (
    project_id, workspace_id, title, description, scheduled_at,
    duration_minutes, created_by, status, calendar_sync_status
  ) VALUES (
    p_project_id, p_workspace_id, p_title, p_description, p_scheduled_at,
    p_duration_minutes, p_created_by, 'scheduled', 'pending'
  )
  RETURNING id INTO v_meeting_id;

  -- Insert attendees. Any failure (CHECK constraint, unique-violation on
  -- (meeting_id, email), RLS rejection, NULL on NOT NULL column, ...)
  -- raises and the whole function rolls back, including the meeting row
  -- we just inserted above.
  FOR v_attendee IN SELECT jsonb_array_elements(p_attendees)
  LOOP
    INSERT INTO public.meeting_attendees (
      meeting_id, email, display_name, user_id, is_organizer
    ) VALUES (
      v_meeting_id,
      v_attendee->>'email',
      v_attendee->>'display_name',
      NULL,
      FALSE
    );
  END LOOP;

  RETURN v_meeting_id;
END;
$$;
