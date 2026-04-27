-- Phase 2.8.6 Task B.1 — support chat (workspace-scoped, yagi-staffed).
--
-- New tables. NOT extending brief_threads / project_threads — the
-- support chat is workspace-scoped and unrelated to a project. Cleaner
-- to keep models separate; RLS surface stays smaller. Realtime via the
-- same supabase_realtime publication pattern as Phase 2.8.2 G_B2_D.
--
-- Model:
--   support_threads — one per (workspace, client) under UNIQUE
--     constraint so the FAB widget always finds the same thread for a
--     given client. Status open|closed; closed threads stay readable
--     but the composer disables.
--   support_messages — author_id can be the client (workspace_member)
--     or a yagi_admin. Body up to 4000 chars; image_url is the public
--     R2 URL when an image attachment was uploaded (R2 path lives in
--     /support/<thread>/<msg>.<ext>).
--
-- RLS:
--   Clients (workspace_member): SELECT/INSERT only their own threads
--     and messages within them.
--   yagi_admin: full access.
--   Workspace admins: SELECT-only (audit visibility — they can read
--     what their team has asked yagi but cannot reply on behalf).
--
-- Realtime: thread + message tables added to supabase_realtime so the
-- FAB and the admin reply surface receive INSERT events. Thread
-- last_message_at updates also flow through (used to refresh unread
-- indicators / sort the admin queue).
--
-- last_message_at is bumped via AFTER INSERT trigger on support_messages.
-- updated_at touch trigger on threads.

BEGIN;

-- 1. support_threads ---------------------------------------------------

CREATE TABLE IF NOT EXISTS public.support_threads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'open',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_threads_status_check CHECK (status IN ('open', 'closed')),
  CONSTRAINT support_threads_unique_per_client UNIQUE (workspace_id, client_id)
);

CREATE INDEX IF NOT EXISTS support_threads_workspace_idx
  ON public.support_threads (workspace_id);
CREATE INDEX IF NOT EXISTS support_threads_last_message_at_idx
  ON public.support_threads (last_message_at DESC);

ALTER TABLE public.support_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_threads FORCE ROW LEVEL SECURITY;

-- 2. support_messages --------------------------------------------------

CREATE TABLE IF NOT EXISTS public.support_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   uuid NOT NULL REFERENCES public.support_threads(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body        text,
  image_url   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_messages_body_or_image CHECK (
    (body IS NOT NULL AND char_length(body) BETWEEN 1 AND 4000)
    OR image_url IS NOT NULL
  ),
  CONSTRAINT support_messages_image_url_format CHECK (
    image_url IS NULL OR image_url ~ '^https?://'
  )
);

CREATE INDEX IF NOT EXISTS support_messages_thread_created_idx
  ON public.support_messages (thread_id, created_at DESC);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages FORCE ROW LEVEL SECURITY;

-- 3. RLS on support_threads -------------------------------------------

DROP POLICY IF EXISTS support_threads_select ON public.support_threads;
CREATE POLICY support_threads_select ON public.support_threads
  FOR SELECT TO authenticated
  USING (
    public.is_yagi_admin(auth.uid())
    OR client_id = auth.uid()
    OR public.is_ws_admin(auth.uid(), workspace_id)
  );

DROP POLICY IF EXISTS support_threads_insert ON public.support_threads;
CREATE POLICY support_threads_insert ON public.support_threads
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_yagi_admin(auth.uid())
    OR (
      public.is_ws_member(auth.uid(), workspace_id)
      AND client_id = auth.uid()
      AND status = 'open'
    )
  );

DROP POLICY IF EXISTS support_threads_update ON public.support_threads;
CREATE POLICY support_threads_update ON public.support_threads
  FOR UPDATE TO authenticated
  USING (
    public.is_yagi_admin(auth.uid())
    OR client_id = auth.uid()
  )
  WITH CHECK (
    public.is_yagi_admin(auth.uid())
    OR (client_id = auth.uid() AND status IN ('open', 'closed'))
  );

-- 4. RLS on support_messages ------------------------------------------

DROP POLICY IF EXISTS support_messages_select ON public.support_messages;
CREATE POLICY support_messages_select ON public.support_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_threads t
      WHERE t.id = thread_id
        AND (
          public.is_yagi_admin(auth.uid())
          OR t.client_id = auth.uid()
          OR public.is_ws_admin(auth.uid(), t.workspace_id)
        )
    )
  );

DROP POLICY IF EXISTS support_messages_insert ON public.support_messages;
CREATE POLICY support_messages_insert ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_threads t
      WHERE t.id = thread_id
        AND t.status = 'open'
        AND (
          public.is_yagi_admin(auth.uid())
          OR t.client_id = auth.uid()
        )
    )
  );

-- Workspace admins are intentionally NOT granted INSERT — they have
-- read-only audit access. Only the client-owner and yagi_admin can post.

-- 5. last_message_at trigger ------------------------------------------

CREATE OR REPLACE FUNCTION public.support_messages_bump_thread()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- SECURITY DEFINER so the bump succeeds regardless of caller's
  -- RLS write rights on threads (the existing policy already allows
  -- the inserting author to UPDATE, but yagi_admin replies should
  -- not depend on that lane being matched). Search-path pinned.
  UPDATE public.support_threads
     SET last_message_at = NEW.created_at,
         updated_at = now()
   WHERE id = NEW.thread_id;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.support_messages_bump_thread() FROM PUBLIC;

DROP TRIGGER IF EXISTS support_messages_bump_thread ON public.support_messages;
CREATE TRIGGER support_messages_bump_thread
  AFTER INSERT ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.support_messages_bump_thread();

-- 6. Touch trigger on threads -----------------------------------------

CREATE OR REPLACE FUNCTION public.support_threads_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS support_threads_touch_updated_at ON public.support_threads;
CREATE TRIGGER support_threads_touch_updated_at
  BEFORE UPDATE ON public.support_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.support_threads_touch_updated_at();

-- 7. Realtime publication ---------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'support_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'support_threads'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.support_threads';
  END IF;
END $$;

COMMIT;
