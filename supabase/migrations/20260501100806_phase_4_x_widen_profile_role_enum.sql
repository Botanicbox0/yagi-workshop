-- Phase 4.x Wave C.5b amend_02 — widen profiles_role_check to include 'artist'.
--
-- Background: PRODUCT-MASTER §4 / DECISIONS Q-094 lock the persona model
-- as Brand + Artist + YAGI Admin. The profiles_role_check CHECK constraint
-- still only allowed creator/studio/observer/client. yagi visual review
-- (post-sub_00 ROLLBACK) needs the artist demo account live for review,
-- which requires this enum widening — originally deferred to Phase 5
-- entry (sub_13 HALT log) but now pulled into Phase 4.x because the
-- widening is purely additive and the only blocker for the demo account.
--
-- Scope: additive only. Existing rows (creator/studio/observer/client/NULL)
-- all continue to pass the constraint. No application-layer code path
-- assumes a closed-world enum — challenges-CTA + app/layout role guards
-- already fall through to the else branch for unknown roles, which is
-- a safe default.
--
-- Phase 5 entry will introduce the Artist Roster intake surface; this
-- migration unblocks the demo account ahead of that surface design and
-- does NOT lock-in any artist-specific RLS / RPC shape.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (
    (role IS NULL) OR
    (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
  );
