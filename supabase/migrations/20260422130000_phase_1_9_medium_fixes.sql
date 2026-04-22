-- Phase 2.0 G5 — Phase 1.9 MEDIUM + G2-review findings.
--
-- Incrementally built: each commit appends one fix. Intermediate states are
-- valid runnable migrations — every ALTER below is independently idempotent
-- against the baseline state captured in 20260422120000_phase_2_0_baseline.sql.
--
-- Contents (in order applied):
--   #1  public.recalc_invoice_totals()        SECURITY DEFINER: SET search_path
--   #2  public.meetings.meetings_update               UPDATE: add WITH CHECK
--   #3  public.showcase_media.showcase_media_update   UPDATE: add WITH CHECK
--   #4  public.team_channels.team_channels_update     UPDATE: add WITH CHECK
--   #5  storage.objects.avatars_update                UPDATE: add WITH CHECK
--   #6  storage.objects."showcase-media update"       UPDATE: add WITH CHECK
--   #7  storage.objects."showcase-og update"          UPDATE: add WITH CHECK

-- #1 — recalc_invoice_totals SECURITY DEFINER missing search_path.
-- Found during G2 baseline review (Codex K-05 oversight). A SECURITY DEFINER
-- trigger function without an explicit search_path is vulnerable to schema
-- hijacking if a caller is able to prepend a malicious schema to search_path
-- before the trigger fires. Pin to `public, pg_temp` — all object references
-- in the function body are already fully qualified, so this is the minimal
-- safe value.
ALTER FUNCTION public.recalc_invoice_totals() SET search_path = public, pg_temp;

-- #2 — public.meetings.meetings_update FOR UPDATE missing WITH CHECK.
-- Phase 1.9 MEDIUM M2 extension. A policy with only USING lets a privileged
-- caller UPDATE a row they already qualify to see, but does NOT re-check the
-- resulting row. That means an admin could, e.g., swap workspace_id to a
-- workspace they don't admin and still land the write. Mirror the USING
-- expression into WITH CHECK so the post-image is re-validated.
ALTER POLICY meetings_update ON public.meetings
  WITH CHECK (
    public.is_ws_admin(auth.uid(), workspace_id)
    OR public.is_yagi_admin(auth.uid())
  );

-- #3 — public.showcase_media.showcase_media_update FOR UPDATE missing WITH CHECK.
-- Same shape as #2: USING limits WHICH rows a yagi_admin can UPDATE, but
-- without WITH CHECK an admin could rewrite showcase_id to point at a
-- showcase that no longer satisfies the EXISTS subselect (e.g. a deleted or
-- foreign showcase row). Mirror the USING into WITH CHECK.
ALTER POLICY showcase_media_update ON public.showcase_media
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.showcases s
      WHERE s.id = showcase_media.showcase_id
        AND public.is_yagi_admin(auth.uid())
    )
  );

-- #4 — public.team_channels.team_channels_update FOR UPDATE missing WITH CHECK.
-- Specifically dangerous here because the USING clause enforces BOTH
-- is_yagi_internal_ws(workspace_id) AND admin — without WITH CHECK a channel
-- could be UPDATE'd out of the yagi-internal workspace (workspace_id flipped
-- to a client workspace) while still satisfying the pre-image check. Mirror
-- the USING expression into WITH CHECK.
ALTER POLICY team_channels_update ON public.team_channels
  WITH CHECK (
    public.is_yagi_internal_ws(workspace_id)
    AND (
      public.is_ws_admin(auth.uid(), workspace_id)
      OR public.is_yagi_admin(auth.uid())
    )
  );

-- #5 — storage.objects.avatars_update FOR UPDATE missing WITH CHECK.
-- The policy authorizes owners to UPDATE their own avatar bucket objects,
-- but without WITH CHECK an owner could swap owner or bucket_id to escape
-- the avatars scope (e.g. flip bucket_id to a private bucket whose write
-- policy would have denied a direct INSERT). Mirror USING into WITH CHECK.
ALTER POLICY avatars_update ON storage.objects
  WITH CHECK (
    bucket_id = 'avatars'::text
    AND owner = auth.uid()
  );

-- #6 — storage.objects."showcase-media update" FOR UPDATE missing WITH CHECK.
-- Same class of gap: a yagi_admin authorized to UPDATE a showcase-media
-- object could rewrite bucket_id onto another bucket whose own write/update
-- policy would have rejected the object directly. Mirror USING into WITH CHECK.
ALTER POLICY "showcase-media update" ON storage.objects
  WITH CHECK (
    bucket_id = 'showcase-media'::text
    AND public.is_yagi_admin(auth.uid())
  );

-- #7 — storage.objects."showcase-og update" FOR UPDATE missing WITH CHECK.
-- Last of the 6 UPDATE-policy gaps. The showcase-og bucket is public-read,
-- so a cross-bucket flip here is lower impact than #6, but the WITH CHECK
-- gap is the same shape and leaving it open is inconsistent with the rest
-- of this migration. Mirror USING into WITH CHECK.
ALTER POLICY "showcase-og update" ON storage.objects
  WITH CHECK (
    bucket_id = 'showcase-og'::text
    AND public.is_yagi_admin(auth.uid())
  );
