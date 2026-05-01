# Phase 4.x — Followups

Captured during Wave C.5b. Each entry records the surface, the deferred
action, and the trigger that should pull it back into scope.

## FU-C5b-09 — Meeting type / duration UX rework

- **Trigger**: Phase 4.x ff-merge → hotfix-1, OR Phase 5 entry IA
  cleanup (paired with FU-C5b-08 brand-onboarding rework).
- **Risk**: yagi visual review (2026-05-01, post-rollback +
  post-amendments) flagged that `/ko/app/meetings/new`'s "소요 시간"
  radio (30 / 45 / 60 / 90분) is meaningless for the client. Every
  client meeting naturally lands at 1 hour; duration is admin-side
  scheduling info, not a client decision. The current control reads
  as "another mandatory radio with no real choice" UX.
- **Action**: NOT in scope for Wave C.5b (yagi locked as register-
  only, fix later — scope creep avoidance). Spec when picked up:
  - **Schema** (new migration):
    - `meetings.meeting_type text NOT NULL DEFAULT 'online'` with
      CHECK (`meeting_type IN ('online','offline')`).
    - `meetings.location_preference text NULL`.
    - `meetings.duration_minutes` retained (admin scheduling tool
      keeps using it); server-side default enforced at 60 so the
      UI no longer needs to ask.
  - **UI** (`/app/meetings/new` form):
    - Remove the duration radio.
    - Add a "선호 미팅 방식 / Preferred meeting format" radio with
      온라인 / 대면 (online / offline) options.
    - When 대면 (offline) is selected, conditionally render an
      optional input "선호 장소가 있으신가요?" / "Preferred location?"
      bound to `location_preference`.
  - **i18n** (KO + EN): new keys for label / options / conditional
    input copy.
  - **Google Calendar sync impact**: zero — `meeting_type` is metadata
    only, doesn't affect the event payload Google receives.
- **Recommended bundling**: pair with FU-C5b-08 brand-onboarding
  rework so a single hotfix-1 touches both `/onboarding/brand` and
  `/app/meetings/new` IA. Phase 5 entry is the alternative if Phase
  4.x ff-merges before hotfix windows open.
- **Owner**: yagi (decision), Builder (implementation when greenlit).
- **Status**: Not started. Locked as deferred for Wave C.5b scope.
- **Registered**: 2026-05-01 (Wave C.5b Codex amendments final step).

## FU-C5b-01 — Phase 5 Artist Roster intake surface

- **Trigger**: Phase 5 entry (셀럽/엔터에이전시 영입 시작).
- **Risk**: Without a dedicated UI, every Artist account must be
  manually created via `scripts/create-artist-account.ts` (sub_13).
  Onboarding flow is currently Brand-only.
- **Action**: Design a separate Artist intake / invite-link flow. Do
  NOT reuse the retired `/onboarding/role` self-registration shape —
  Artist Roster is curated, not self-served. Likely a yagi-admin tool
  that issues one-shot signup tokens.
- **Owner**: yagi (product) + Builder (implementation when greenlit).
- **Status**: Not started.
- **Registered**: 2026-05-01 (Wave C.5b sub_01).

## FU-C5b-02 — Supabase Dashboard Email Template manual sync

- **Trigger**: After Wave C.5b sub_06 commit lands and the next
  signup-confirm email goes out.
- **Risk**: `supabase config push` does NOT propagate inline
  `[auth.email.template]` HTML to the hosted dashboard. Yagi must
  paste the rendered HTML/Subject into the dashboard manually for the
  branded template to actually be sent.
- **Action**: yagi opens Supabase Dashboard → Authentication → Email
  Templates → Confirm Signup, pastes the HTML and subject from
  `supabase/templates/email/confirm.html`. Repeat for recovery + magic
  link if those flows are reintroduced.
- **Owner**: yagi.
- **Status**: Not started.
- **Registered**: 2026-05-01 (Wave C.5b sub_06).

## FU-C5b-03 — Phase 7+ "+50개 이상" placeholder → real client logos

- **Trigger**: Phase 7+ Reveal Layer (real client cohort confirmed
  with public-disclosure consent).
- **Risk**: Current `/app/projects` empty-state social-proof cluster
  shows 4 generic neutral circles + the "+50개 이상의 고객사가 YAGI와
  함께하고 있어요" line. Placeholder is acceptable for Phase 4 launch
  but reads as filler if shipped to Phase 7+.
- **Action**: Replace the 4 placeholder circles with real client
  brand marks (after each client signs a public-disclosure consent).
  If real-client count exceeds 4, cluster animates / cycles. If it
  drops below the claim, restate the copy or remove the claim.
- **Owner**: yagi (cohort + consent), Builder (replacement).
- **Status**: Not started.
- **Registered**: 2026-05-01 (Wave C.5b sub_12).

## FU-C5b-07 — Dark editorial canvas as future option

- **Trigger**: Phase 5+ if yagi changes the canvas-color verdict (e.g.
  reaches a "image-led, content-saturated" surface that benefits from
  dark) OR if an admin / inverse-hero section needs to opt into dark.
- **Risk**: Wave C.5b sub_00 originally flipped `:root` to dark
  editorial; yagi rolled it back to light per visual review. The
  vocabulary is retained — re-flipping is a one-file change in
  `globals.css` (swap the `:root` block with the `.dark` block) plus
  flipping `defaultTheme` to `"dark"` in `[locale]/layout.tsx`. Don't
  re-flip without yagi's explicit go.
- **Action**: when the trigger fires, refer to git sha `ef4e9c1` for
  the original sub_00 dark variant; copy the `:root` block from there
  into the current globals.css.
- **Owner**: yagi (decision), Builder (implementation).
- **Status**: Deferred indefinitely.
- **Registered**: 2026-05-01 (Wave C.5b sub_00 ROLLBACK).

## FU-C5b-04 — `.font-display` migration to Redaction (EN display)

- **Trigger**: When Redaction 10 / Redaction 50 Italic woff2 files
  are committed under `/public/fonts/`.
- **Risk**: yagi-design-system v1.0 specifies Redaction for EN
  display. Builder kept `.font-display` on Fraunces because the
  Redaction woff2 files are not yet self-hosted, and the existing
  italic-emphasis pattern ("Workflow that *thinks*") is threaded
  through landing/marketing surfaces. Switching `.font-display` to
  Redaction without the woff2 in place would silently fall through
  to Georgia, which mismatches the v1.0 brand voice.
- **Action**: Drop Redaction woff2 files into `/public/fonts/`,
  uncomment the `@font-face` declarations from
  `~/.claude/skills/yagi-design-system/references/globals.css`,
  switch `--ds-font-display` (and any direct `.font-display` callers)
  to use the new family. Audit landing/marketing italic emphasis to
  ensure visual continuity.
- **Owner**: yagi (asset acquisition), Builder (wiring).
- **Status**: Not started.
- **Registered**: 2026-05-01 (Wave C.5b sub_00).

## FU-C5b-06 — Supabase Dashboard auth redirect URLs + OTP expiry

- **Trigger**: Wave C.5b sub_04 lands and the new `/auth/expired`
  page becomes the target for expired-link bounces.
- **Risk**: This repo doesn't keep a checked-in `supabase/config.toml`,
  so allowlist/expiry settings live entirely in the hosted dashboard.
  If `studio.yagiworkshop.xyz/auth/expired` (and the localhost dev
  variant) are not in **Authentication → URL Configuration → Redirect
  URLs**, the email-link expired-bounce that depends on Supabase
  redirecting back to our origin will land on Supabase's default
  error page instead of the branded `/auth/expired` surface.
- **Action**: yagi opens the Supabase dashboard for studio (prod)
  and adds the following to the Redirect URLs allowlist (one per line):
    - `https://studio.yagiworkshop.xyz/auth/callback`
    - `https://studio.yagiworkshop.xyz/auth/expired`
    - `http://localhost:3001/auth/callback`
    - `http://localhost:3001/auth/expired`
    - `http://localhost:3003/auth/callback`
    - `http://localhost:3003/auth/expired`
  Optional: bump OTP expiry from default 1h to 24h on dev/test
  projects (Authentication → Email → OTP Expiry seconds).
- **Owner**: yagi.
- **Status**: Not started.
- **Registered**: 2026-05-01 (Wave C.5b sub_04).

## FU-C5b-08 — Brand onboarding step model rework

- **Trigger**: Phase 4.x ff-merge → hotfix-1, OR Phase 5 entry (when
  the IA is being re-laid out for Artist Roster anyway).
- **Risk**: yagi visual review (post-sub_00 rollback, 2026-05-01)
  flagged the `/onboarding/brand` step as a Phase 2.x leftover. It
  models a multi-brand agency onboarding shape — separate workspace
  → separate brands inside it — which the actual customer mix does
  not match. ~90% of clients are 1 workspace = 1 company = 1 brand.
  In that case the brand step reads as "another mandatory form" and
  the "건너뛰기" (skip) link becomes the de-facto default flow,
  which is awkward UX (the form-with-skip pattern signals "this is
  optional but you still need to acknowledge it").
- **Action**: NOT in scope for Wave C.5b — yagi locked the call as
  "register only, fix later" (Wave C.5b scope creep avoidance).
  Three options when the work is picked up:
  - **a.** Keep the route, strengthen the default-skip CTA (smallest
    change). Keeps the multi-brand affordance for the rare agency case.
  - **b.** Collapse 1 workspace = 1 brand into the workspaces row
    (drop or fold the `brands` table into `workspaces`). Needs
    migration + RLS update.
  - **c.** Delete `/onboarding/brand`, auto-create a default brand
    row at workspace bootstrap (`workspaces.name → brands.name`),
    move multi-brand management into `/app/settings/workspace`. This
    is the cleanest UX. Multi-brand agency case becomes a settings-
    surface power-user feature instead of an onboarding gate.
- **Recommended**: **c**. Reasons: matches the 90% case directly,
  doesn't penalize the 10% case (still possible from settings), and
  fits the editorial "first impression = workspace landing" goal of
  Wave C.5b's onboarding flow.
- **Affected surfaces**: `/onboarding/brand` route + page,
  `bootstrap_workspace` RPC (auto-insert default brand),
  `/app/settings/workspace` (new "brand 관리" section), `brands`
  RLS already keys off `workspace_id` so no policy change required.
- **Owner**: yagi (decision), Builder (implementation).
- **Status**: Not started. Locked as deferred for Wave C.5b scope.
- **Registered**: 2026-05-01 (Wave C.5b amend_04).

## FU-C5b-05 — `border-border` callsite sweep — ✅ OBSOLETE (sub_00 ROLLBACK)

- **Status**: Obsolete as of 2026-05-01 (Wave C.5b sub_00 ROLLBACK).
- **Why**: This followup was opened because sub_00's dark flip
  changed the global `* { border-color: ... }` rule from
  `hsl(var(--border))` (Phase 2.7.1 P12) to `hsl(var(--border) /
  0.11)` (alpha-11 white). After the rollback the global rule is
  back to the original solid alpha — `border-border` resolves to
  light gray `hsl(0 0% 90%)`, which is exactly what the 264
  explicit callsites expect. No sweep needed.
- **Registered**: 2026-05-01 (Wave C.5b sub_00).
- **Closed**: 2026-05-01 (Wave C.5b sub_00 ROLLBACK).
