-- Phase 2.5 G7 — pg_cron job: challenges-closing-reminder
-- Runs every 15 minutes. Finds open challenges with close_at in ~24h
-- window and reminder_sent_at NULL, emits notification_events rows for
-- all ready submissions, stamps reminder_sent_at for idempotency.
-- Body/title left blank — notify-dispatch Edge Function renders localized copy.

SELECT cron.schedule(
  'challenges-closing-reminder',
  '*/15 * * * *',
  $$
  WITH expiring AS (
    SELECT id, slug, title
      FROM public.challenges
     WHERE state = 'open'
       AND close_at BETWEEN now() + interval '23h 45min'
                        AND now() + interval '24h 15min'
       AND reminder_sent_at IS NULL
     FOR UPDATE SKIP LOCKED
  ),
  emitted AS (
    INSERT INTO public.notification_events
      (user_id, kind, severity, title, body, url_path, payload)
    SELECT
      cs.submitter_id,
      'challenge_closing_soon',
      'high',
      '',
      '',
      '/challenges/' || e.slug,
      jsonb_build_object('challenge_title', e.title, 'challenge_slug', e.slug)
    FROM expiring e
    JOIN public.challenge_submissions cs ON cs.challenge_id = e.id
    WHERE cs.status = 'ready'
    RETURNING 1
  )
  UPDATE public.challenges
     SET reminder_sent_at = now()
   WHERE id IN (SELECT id FROM expiring);
  $$
);

-- To unschedule: SELECT cron.unschedule('challenges-closing-reminder');
