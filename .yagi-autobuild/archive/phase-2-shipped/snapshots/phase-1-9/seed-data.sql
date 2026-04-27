-- Phase 1.9 seed-data snapshot — captured 2026-04-22 (Phase 2.0 G0)
--
-- Scope: ONLY configuration/reference tables that have no PII.
--
-- Captured tables:
--   - public.team_channels (3 rows — Phase 1.7 seed)
--   - public.notification_preferences (0 rows — no users have set prefs yet)
--
-- DELIBERATELY skipped (live user data — out of scope for snapshot;
-- rely on Supabase Dashboard backups for restoration if needed):
--   workspaces, profiles, projects, references, threads, messages, meetings,
--   preprod_*, invoices, showcases, notification_events,
--   notification_unsubscribe_tokens, team_channel_messages,
--   team_channel_message_attachments, workspace_members, workspace_invitations,
--   user_roles, supplier_profile, brands

-- ============================================================
-- public.team_channels (3 rows)
-- ============================================================

INSERT INTO public.team_channels (id, workspace_id, slug, name, topic, is_archived, created_at) VALUES
  ('391ac79b-3ce9-4047-86f1-e8ff4f0f65b0', '320c1564-b0e7-481a-871c-be8d9bb605a8', 'biz', '비즈니스', '클라이언트, 견적, 비즈니스 운영', false, '2026-04-21 18:44:57.609794+00'),
  ('cf0bdb95-4b78-4286-9e0a-2bbfc3695def', '320c1564-b0e7-481a-871c-be8d9bb605a8', 'ideas', '아이디어', '프로젝트 아이디어와 영감', false, '2026-04-21 18:44:57.609794+00'),
  ('6d702649-76d1-407d-899e-431afcb5e651', '320c1564-b0e7-481a-871c-be8d9bb605a8', 'general', '일반', '팀 전체 공지와 일상 대화', false, '2026-04-21 18:44:57.609794+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- public.notification_preferences (0 rows at snapshot time)
-- ============================================================

-- (no rows to dump)
