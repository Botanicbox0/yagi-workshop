-- Partial unique index for debounced events: at most one pending row per
-- (user, kind, project) at any time. Insert race losers will hit a unique
-- violation; the debounce code retries by re-reading and updating.
create unique index notif_events_debounce_uniq
  on notification_events(user_id, kind, project_id)
  where email_sent_at is null
    and in_app_seen_at is null
    and project_id is not null
    and kind in ('feedback_received', 'frame_uploaded_batch');
