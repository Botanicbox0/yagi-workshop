# Phase 4.x — Followups

Captured during Wave C.5b. Each entry records the surface, the deferred
action, and the trigger that should pull it back into scope.

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

## FU-C5b-05 — `border-border` callsite sweep

- **Trigger**: Wave C.5c (yagi visual review of Wave C.5b).
- **Risk**: 264 explicit `border-border` callsites across 100 files
  bypass the new `* { border-color: hsl(var(--border) / 0.11); }`
  default and now resolve to solid white (loud against bg-base).
- **Action**: Sweep callsites and migrate to `border-edge-subtle` /
  remove explicit `border-border` where the default subtle ramp is
  what the surface actually wants. Components that genuinely need a
  visible divider stay on `border-border`.
- **Owner**: Builder.
- **Status**: Not started.
- **Registered**: 2026-05-01 (Wave C.5b sub_00).
