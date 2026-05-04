-- Phase 5 Wave B task_04 v3 — projects briefing-canvas metadata columns
--
-- Schema decision: Option A (typed columns on projects) per yagi 2026-05-04.
-- Rationale (yagi verbatim): admin queue / filtering / sorting / project
-- overview will reach for these fields directly; jsonb adds friction for
-- those use cases relative to typed columns. Trade-off accepted: 9 new
-- columns on projects vs the simpler "single jsonb metadata" alternative.
--
-- Field map (Step 2 sidebar from KICKOFF v1.3 spec, plus Step 1 multi):
--   purpose                text[]   — Step 1 multi-select
--   channels               text[]   — Step 2 sidebar multi-select
--   mood_keywords          text[]   — Step 2 sidebar preset multi-select
--   mood_keywords_free     text     — Step 2 sidebar free-text complement
--   visual_ratio           text     — Step 2 sidebar single-select chip
--   visual_ratio_custom    text     — populated only when visual_ratio = 'custom'
--   target_audience        text     — Step 2 sidebar free-text
--   additional_notes       text     — Step 2 sidebar free-text
--   has_plan               text     — Step 2 sidebar (have/want_proposal/undecided)
--
-- Existing columns kept as-is (NOT touched by this migration):
--   title (Step 1 name), brief (Step 1 description), deliverable_types
--   (Step 1 multi), budget_band (Step 2 sidebar), target_delivery_at
--   (Step 2 sidebar), meeting_preferred_at (Step 2 sidebar),
--   interested_in_twin (Wave A sub_3a), twin_intent (DEPRECATED, kept).
--
-- Defaults: text[] columns default to '{}' (empty array, NOT NULL) so
-- existing rows back-fill cleanly without a separate UPDATE pass. text
-- scalars default to NULL.
--
-- has_plan CHECK constraint mirrors the zod enum on the client side
-- (have / want_proposal / undecided) so DB rejects malformed values
-- regardless of caller (server action, admin SQL, future ingestion).

ALTER TABLE projects
  ADD COLUMN purpose text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN channels text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN mood_keywords text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN mood_keywords_free text,
  ADD COLUMN visual_ratio text,
  ADD COLUMN visual_ratio_custom text,
  ADD COLUMN target_audience text,
  ADD COLUMN additional_notes text,
  ADD COLUMN has_plan text;

ALTER TABLE projects
  ADD CONSTRAINT projects_has_plan_check
  CHECK (has_plan IS NULL OR has_plan IN ('have', 'want_proposal', 'undecided'));

COMMENT ON COLUMN projects.purpose IS
  'Phase 5 Wave B task_04 v3 — Step 1 multi-select content purpose. text[] of preset enum keys (sns_ad/branding/sns_channel/event/offline/other) plus arbitrary user-typed values.';
COMMENT ON COLUMN projects.channels IS
  'Phase 5 Wave B task_04 v3 — Step 2 sidebar multi-select target channels (instagram/youtube/tiktok/facebook/website/offline/other).';
COMMENT ON COLUMN projects.mood_keywords IS
  'Phase 5 Wave B task_04 v3 — Step 2 sidebar preset multi-select mood (emotional/sophisticated/humorous/dynamic/minimal/warm/luxurious/trendy/friendly).';
COMMENT ON COLUMN projects.mood_keywords_free IS
  'Phase 5 Wave B task_04 v3 — Step 2 sidebar free-text mood input that complements mood_keywords[]. Comma-separated user input.';
COMMENT ON COLUMN projects.visual_ratio IS
  'Phase 5 Wave B task_04 v3 — Step 2 sidebar visual aspect ratio chip (1_1/16_9/9_16/4_5/239_1/custom).';
COMMENT ON COLUMN projects.visual_ratio_custom IS
  'Phase 5 Wave B task_04 v3 — populated only when visual_ratio = ''custom''.';
COMMENT ON COLUMN projects.target_audience IS
  'Phase 5 Wave B task_04 v3 — Step 2 sidebar free-text target audience description.';
COMMENT ON COLUMN projects.additional_notes IS
  'Phase 5 Wave B task_04 v3 — Step 2 sidebar free-text catch-all for anything else the briefing user wants to flag.';
COMMENT ON COLUMN projects.has_plan IS
  'Phase 5 Wave B task_04 v3 — Step 2 sidebar plan availability (have/want_proposal/undecided). NULL means not yet answered.';
