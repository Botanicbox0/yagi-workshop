-- Phase 2.5 G1 — Challenge Platform MVP: DB schema + auth extension.
--
-- Executes SPEC v2 §3 G1 Task 1-8. Pre-flight verified on live DB
-- (jvamvbpxnztynsccvcmr) on 2026-04-23:
--   - profiles: 1 row, 0 case-dup handles, 0 bio>200 — citext + CHECK safe
--   - citext extension not installed; pgcrypto/pg_net/pg_cron already present
--   - notification_preferences has no challenge_updates_enabled column
--   - profiles RLS: profiles_read / profiles_update_self / profiles_upsert_self
--     already cover all columns (new columns inherit automatically)
--
-- SPEC-reality reconciliation (not in SPEC v2, logged here):
--   profiles already has handle / display_name / bio / avatar_url from Phase 1.1.
--   SPEC v2 Task 1 'ADD COLUMN' block treated the table as empty. Corrected:
--     - handle: ALTER TYPE → citext + ADD UNIQUE (not ADD COLUMN)
--     - bio: ADD CONSTRAINT (not ADD COLUMN — column exists, CHECK missing)
--     - avatar_url: reused as-is
--     - display_name: reused as-is; creators.display_name is the creator-persona
--       name which may legitimately differ from profiles.display_name (the
--       user's name). Both coexist per SPEC §1.
--
--   Web Claude pre-apply review (2026-04-23):
--     - Issue 2 (RLS): creators_delete_self / studios_delete_self removed
--       to enforce soft-delete invariant. Hard DELETE would CASCADE submissions
--       and orphan showcase winner display. profiles.role flip is the canonical
--       persona retirement path.
--     - Issue 3 (RLS): creators_insert_self / studios_insert_self gained
--       role consistency EXISTS check. Prevents user with role='studio' from
--       inserting creators row (or vice versa). Enforces SPEC §1 invariant
--       "One user = one role at a time" at DB level.
--     - Issue 1 (notification scope): challenge_updates_enabled DEFAULT TRUE
--       confirmed by yagi as covering BOTH transactional (joined challenge
--       progress) AND marketing (new challenge announcements). Korean
--       정보통신망법 §50 marketing-info opt-in compliance MUST be addressed
--       at G7 dispatch layer (collect explicit consent at signup, not
--       backfilled). DB column intent: master toggle; legal compliance is
--       a sender-side concern. See .yagi-autobuild/phase-2-5/FOLLOWUPS.md
--       §FU-1 for the G7 compliance plan.
--
--   First-apply failure fix (2026-04-23):
--     - Pre-flight missed that profiles.handle already has the UNIQUE
--       constraint `profiles_handle_key` from Phase 1.1 (pg_indexes confirms).
--       PostgreSQL auto-rebuilds the unique index when ALTER COLUMN TYPE runs,
--       adopting citext's case-insensitive equality for free. The separate
--       `ADD CONSTRAINT profiles_handle_key UNIQUE (handle)` block was
--       therefore redundant AND name-collided → removed.

-- ===========================================================================
-- 0. Extensions
-- ===========================================================================

CREATE EXTENSION IF NOT EXISTS citext;


-- ===========================================================================
-- 1. ALTER profiles (Phase 1.1 table) — Phase 2.5 identity fields
-- ===========================================================================

-- Convert handle to citext. Pre-existing UNIQUE index `profiles_handle_key`
-- (from Phase 1.1) is rebuilt automatically by ALTER COLUMN TYPE with
-- citext's case-insensitive equality — no separate ADD CONSTRAINT needed.
-- Safe: pre-flight confirmed 0 case-duplicate handles.
ALTER TABLE public.profiles
  ALTER COLUMN handle TYPE citext USING handle::citext;

-- New columns for Phase 2.5 identity model.
ALTER TABLE public.profiles
  ADD COLUMN role text CHECK (role IS NULL OR role IN ('creator','studio','observer')),
  ADD COLUMN instagram_handle text,
  ADD COLUMN role_switched_at timestamptz,
  ADD COLUMN handle_changed_at timestamptz;

-- Enforce 200-char bio cap per SPEC v2 §3 G1 Task 1. Column pre-exists.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_bio_length_check
  CHECK (bio IS NULL OR char_length(bio) <= 200);


-- ===========================================================================
-- 2. Role-specific tables (1:1 with profiles via id FK)
-- ===========================================================================

-- Creators: the public-facing creator persona. display_name may differ from
-- profiles.display_name (latter = user's real name; former = creator handle).
CREATE TABLE public.creators (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.creators IS 'Phase 2.5 — AI creator persona (role=creator). 1:1 with profiles.';

-- Studios: B2B role with distinct studio brand name + contact.
CREATE TABLE public.studios (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  studio_name text NOT NULL CHECK (char_length(studio_name) BETWEEN 1 AND 120),
  contact_email citext,
  member_count text CHECK (member_count IS NULL OR member_count IN ('1-5','6-10','11+')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.studios IS 'Phase 2.5 — AI studio org (role=studio). 1:1 with profiles.';

-- Observer: no child table. profiles.role='observer' alone signals the role.


-- ===========================================================================
-- 3. Challenge domain tables
-- ===========================================================================

-- Admin-editable core entity. Slug is URL-safe + reserved-list guarded.
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug citext UNIQUE NOT NULL CHECK (
    char_length(slug) BETWEEN 3 AND 80
    AND slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'
    AND slug !~ '^(new|gallery|submit|edit|judge|announce|admin)$'
  ),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description_md text,
  hero_media_url text,
  state text NOT NULL DEFAULT 'draft'
    CHECK (state IN ('draft','open','closed_judging','closed_announced','archived')),
  open_at timestamptz,
  close_at timestamptz,
  announce_at timestamptz,
  submission_requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  judging_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  reminder_sent_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    -- If open_at or close_at set, ordering is enforced.
    open_at IS NULL OR close_at IS NULL OR open_at < close_at
  )
);

CREATE INDEX challenges_state_idx ON public.challenges (state);
CREATE INDEX challenges_close_at_idx ON public.challenges (close_at)
  WHERE state = 'open' AND reminder_sent_at IS NULL;

COMMENT ON TABLE public.challenges IS 'Phase 2.5 — admin-managed challenge entities. Lifecycle: draft→open→closed_judging→closed_announced→archived.';

-- Submissions. One-per-user-per-challenge enforced by UNIQUE.
CREATE TABLE public.challenge_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  submitter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created','processing','ready','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, submitter_id)
);

CREATE INDEX challenge_submissions_challenge_status_idx
  ON public.challenge_submissions (challenge_id, status);

-- Votes. One-per-voter-per-challenge enforced by UNIQUE.
CREATE TABLE public.challenge_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES public.challenge_submissions(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, voter_id)
);

CREATE INDEX challenge_votes_submission_idx ON public.challenge_votes (submission_id);

-- Admin scoring notes. Multiple judgments per submission allowed (by design —
-- multi-admin panels could score independently; judging_config decides how
-- scores aggregate).
CREATE TABLE public.challenge_judgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES public.challenge_submissions(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  score numeric(5,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, admin_id)
);

-- Showcase winner pinning (junction — preserves Phase 1.9 showcases contract).
-- UNIQUE on submission_id prevents double-pin. submission_id NOT showcase_id
-- is the PK-equivalent because a submission pins once; a showcase can host
-- multiple pinned winners across challenges.
CREATE TABLE public.showcase_challenge_winners (
  submission_id uuid PRIMARY KEY
    REFERENCES public.challenge_submissions(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL
    REFERENCES public.challenges(id) ON DELETE CASCADE,
  showcase_id uuid
    REFERENCES public.showcases(id) ON DELETE SET NULL,
  rank int NOT NULL DEFAULT 1 CHECK (rank >= 1),
  announced_at timestamptz NOT NULL DEFAULT now(),
  announced_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT
);

CREATE INDEX showcase_challenge_winners_challenge_idx
  ON public.showcase_challenge_winners (challenge_id, rank);


-- ===========================================================================
-- 4. ALTER notification_preferences (Phase 1.8 table)
-- ===========================================================================

-- DEFAULT TRUE per SPEC v2 §253-254 acceptance prose — existing users are
-- opted-in to challenge notifications by default.
ALTER TABLE public.notification_preferences
  ADD COLUMN challenge_updates_enabled boolean NOT NULL DEFAULT TRUE;


-- ===========================================================================
-- 5. Row-Level Security
-- ===========================================================================

-- creators / studios: owner-UPDATE, public-SELECT, role-gated INSERT.
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
-- Note: no DELETE policy. Soft-delete via profiles.role change (set to NULL
-- or 'observer'). Hard DELETE not exposed at RLS level — preserves
-- referential integrity for showcase_challenge_winners + challenge_submissions
-- that may reference this row's submissions.

CREATE POLICY creators_select ON public.creators
  FOR SELECT USING (true);

-- Role consistency: a user can only create the `creators` row matching
-- their `profiles.role`. Prevents role=studio users from inserting a
-- creators row (or vice versa). Enforces SPEC §1 "one user = one role".
CREATE POLICY creators_insert_self ON public.creators
  FOR INSERT WITH CHECK (
    id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'creator'
    )
  );

CREATE POLICY creators_update_self ON public.creators
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;
-- Note: no DELETE policy. Soft-delete via profiles.role change (set to NULL
-- or 'observer'). Hard DELETE not exposed at RLS level — preserves
-- referential integrity for showcase_challenge_winners + challenge_submissions
-- that may reference this row's submissions.

CREATE POLICY studios_select ON public.studios
  FOR SELECT USING (true);

-- Role consistency: a user can only create the `studios` row matching
-- their `profiles.role`. Prevents role=creator users from inserting a
-- studios row (or vice versa). Enforces SPEC §1 "one user = one role".
CREATE POLICY studios_insert_self ON public.studios
  FOR INSERT WITH CHECK (
    id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'studio'
    )
  );

CREATE POLICY studios_update_self ON public.studios
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- challenges: public SELECT on non-draft states; admin-gated write.
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY challenges_select_public ON public.challenges
  FOR SELECT USING (state <> 'draft' OR public.is_yagi_admin(auth.uid()));

CREATE POLICY challenges_admin_insert ON public.challenges
  FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));

CREATE POLICY challenges_admin_update ON public.challenges
  FOR UPDATE USING (public.is_yagi_admin(auth.uid()))
  WITH CHECK (public.is_yagi_admin(auth.uid()));

CREATE POLICY challenges_admin_delete ON public.challenges
  FOR DELETE USING (public.is_yagi_admin(auth.uid()));

-- challenge_submissions: public SELECT; creator/studio INSERT own during open;
-- owner UPDATE until closed; admin read/update via is_yagi_admin.
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY challenge_submissions_select ON public.challenge_submissions
  FOR SELECT USING (true);

CREATE POLICY challenge_submissions_insert_self ON public.challenge_submissions
  FOR INSERT WITH CHECK (
    submitter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('creator','studio')
    )
    AND EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id AND c.state = 'open'
    )
  );

CREATE POLICY challenge_submissions_update_self ON public.challenge_submissions
  FOR UPDATE USING (
    submitter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id AND c.state = 'open'
    )
  ) WITH CHECK (
    submitter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id AND c.state = 'open'
    )
  );

CREATE POLICY challenge_submissions_admin_update ON public.challenge_submissions
  FOR UPDATE USING (public.is_yagi_admin(auth.uid()))
  WITH CHECK (public.is_yagi_admin(auth.uid()));

-- challenge_votes: public SELECT (counts); voter INSERT own during open.
ALTER TABLE public.challenge_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY challenge_votes_select ON public.challenge_votes
  FOR SELECT USING (true);

CREATE POLICY challenge_votes_insert_self ON public.challenge_votes
  FOR INSERT WITH CHECK (
    voter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id AND c.state = 'open'
    )
  );

-- challenge_judgments: admin-only.
ALTER TABLE public.challenge_judgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY challenge_judgments_admin_all ON public.challenge_judgments
  FOR ALL USING (public.is_yagi_admin(auth.uid()))
  WITH CHECK (public.is_yagi_admin(auth.uid()));

-- showcase_challenge_winners: public SELECT; admin write.
ALTER TABLE public.showcase_challenge_winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY showcase_challenge_winners_select ON public.showcase_challenge_winners
  FOR SELECT USING (true);

CREATE POLICY showcase_challenge_winners_admin_write ON public.showcase_challenge_winners
  FOR ALL USING (public.is_yagi_admin(auth.uid()))
  WITH CHECK (public.is_yagi_admin(auth.uid()));


-- ===========================================================================
-- 6. Realtime publication membership (Phase 2.1 H1 pattern — idempotent)
-- ===========================================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
      AND tablename = 'challenges'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
      AND tablename = 'challenge_submissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_submissions;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
      AND tablename = 'challenge_votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_votes;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
      AND tablename = 'showcase_challenge_winners'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.showcase_challenge_winners;
  END IF;
END $$;


-- ===========================================================================
-- 7. Triggers — auto-update updated_at
-- ===========================================================================

-- Reuse tg_touch_updated_at() from Phase 1.x (confirmed in baseline).
CREATE TRIGGER creators_updated_at BEFORE UPDATE ON public.creators
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE TRIGGER studios_updated_at BEFORE UPDATE ON public.studios
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE TRIGGER challenges_updated_at BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE TRIGGER challenge_submissions_updated_at BEFORE UPDATE ON public.challenge_submissions
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
