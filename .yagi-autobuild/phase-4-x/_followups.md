# Phase 4.x — Followups

Captured during Wave C.5b. Each entry records the surface, the deferred
action, and the trigger that should pull it back into scope.

## FU-C5c-04 — Phase 5 Briefing Canvas (briefing-as-conversation)

- **Trigger**: Phase 5 KICKOFF (immediately after Wave D ff-merges
  Phase 4.x). yagi locked this as the swap-in for Phase 5 — the
  original "Artist Roster intake first" plan moves to Phase 6 entry.
- **Risk**: The wizard form-only paradigm (3-step linear form ending
  in 프로젝트 의뢰하기) does not match how real briefs flow — clients
  iterate, attach references, and converse with yagi to refine
  scope. Wave C.5c sub_03 (Twin intent UX redesign) was deferred
  here for the same reason: polishing a doomed surface is wasted
  energy.
- **Action**: Replace `/app/projects/new` wizard with a multi-stage
  Briefing Canvas (briefing-as-conversation paradigm). Spec is being
  authored in chat with yagi; KICKOFF doc lands as Phase 5 enters.
  Twin intent UX, brand allowlist additions, and any other wizard
  micro-fixes get folded into the canvas spec.
- **Owner**: yagi (product spec) + Builder (implementation when
  greenlit).
- **Status**: Not started. Phase 5 KICKOFF prerequisite.
- **Registered**: 2026-05-03 (Wave C.5c v2 final).

## FU-C5c-03 — yagi_admin workspace (320c1564) RLS surface

- **Trigger**: Phase 5+ Artist intake or yagi-internal admin
  surfaces.
- **Risk**: The YAGI Internal workspace (id 320c1564-...) was
  reclassified to `kind='yagi_admin'` via chat MCP on 2026-05-01,
  but no dedicated RLS pathway distinguishes admin-internal data
  from regular Brand workspaces yet. Today the workspace renders
  through the same Brand surfaces with no special treatment.
- **Action**: When Phase 5+ work lands a dedicated admin tool (Artist
  intake invite-token issuance, internal commission queue, etc.),
  carve out RLS that targets `workspaces.kind='yagi_admin'` rows
  separately from the Brand surfaces.
- **Owner**: Builder when greenlit.
- **Status**: Not started.
- **Registered**: 2026-05-03 (Wave C.5c v2 final).

## FU-C5c-02 — yagi-talk-icon.png + yagi-text-logo-black.png → SVG

- **Trigger**: Phase 6+ when the brand asset library gets a real
  SVG-first refresh.
- **Risk**: The Wave C.5c sub_04/05 brand assets are PNG (1254×1254
  for icons, 3180×1030 for the wordmark). next/image will WebP-
  optimise on the fly, but the flexbox sidebar header would render
  crisper at all DPRs with vector. The talk FAB icon is the worst
  offender (large square PNG, used at small render size).
- **Action**: Replace the three PNGs in `public/brand/` with SVG
  equivalents. SidebarBrand + SupportWidget can keep next/image with
  the same dimensions; <img> with `inline-block` works too.
- **Owner**: yagi (asset acquisition) + Builder (swap).
- **Status**: Not started.
- **Registered**: 2026-05-03 (Wave C.5c v2 final).

## FU-C5c-01 — Supabase Dashboard email templates + redirect URLs (PKCE)

- **Trigger**: Wave C.5c sub_01 ships. yagi MUST do this before any
  user can sign up via PKCE; otherwise the email link still uses the
  old /auth/callback?code= shape and the Gmail crawler bug recurs.
- **Risk**: PKCE flowType is set in code, but the email template body
  is dashboard-state. Without the paste, the `{{ .ConfirmationURL }}`
  default (or any prior YAGI-branded variant) still ships
  /auth/callback?code=… which DOES NOT trigger the new
  /auth/confirm intermediate page.
- **Action** (Supabase Dashboard → Authentication → Email Templates):
  - Confirm signup template body — change the link to:
      `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}">`
  - Same change for Magic Link + Reset Password templates.
  - Authentication → URL Configuration → Redirect URLs allowlist
    additions (each origin):
      `<origin>/auth/confirm`
      `<origin>/auth/callback` (kept for legacy OAuth code grant)
      `<origin>/onboarding/workspace`
      `<origin>/onboarding/brand`
      `<origin>/onboarding/invite`
      `<origin>/app`
      `<origin>/app/**` (or per-page entries)
      `<origin>/reset-password`
    Origins: `http://localhost:3001`, `http://localhost:3003`,
    `https://studio.yagiworkshop.xyz`.
- **Owner**: yagi.
- **Status**: Not started — production blocker for Wave C.5c.
- **Registered**: 2026-05-03 (Wave C.5c v2 sub_01).

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

## FU-C5d-05 — Brief-mode PDF upload via presigned URL (20MB body limit)

- **Trigger**: Codex generic K-05 review (Phase 4.x branch, 2026-05-04)
  P2 finding on `src/app/[locale]/app/projects/[id]/board-actions.ts:451-454`.
- **Risk**: Brief-mode PDF uploads pass the `File` object into a Server
  Action, then upload to R2 from there. Next.js default Server Action
  body limit (1MB without explicit override) rejects PDFs well below
  the advertised 20MB cap; users see a generic 413 / failed upload
  with no recovery hint.
- **Action**: Migrate brief-mode PDF upload to the same presigned PUT
  pattern the wizard already uses (`getBoardAssetPutUrlAction` ->
  client `fetch(putUrl, PUT, file)` -> `add_project_board_pdf` RPC).
  Server Action body never carries the file payload, so the body
  limit becomes irrelevant. Or, if presigned migration is too
  invasive, raise the body limit explicitly in `next.config.ts`.
- **Owner**: Builder.
- **Status**: Not started. Deferred to Phase 5 Wave A — the briefing
  canvas rewrite naturally adopts the presigned pattern across all
  attachment surfaces, so this finding gets resolved as a side-effect
  of that work.
- **Registered**: 2026-05-04 (Wave C.5d sub_03f_3 generic K-05).

## FU-C5d-06 — `attached_pdf` admin download URL conversion

- **Trigger**: Codex generic K-05 review (Phase 4.x branch, 2026-05-04)
  P2 finding on `src/components/admin/asset-list-panel.tsx:172-175`.
- **Risk**: `asset_index` entries of `source: 'attached_pdf'` carry the
  R2 storage key (`board-assets/<user>/<uuid>.pdf` after sub_03f_1) in
  their `url` field, but the admin asset-list panel pipes that string
  straight into an `<a href>` for download. The browser interprets it
  as a relative app path — `https://studio.yagiworkshop.xyz/board-assets/...`
  — so the click hits Next.js routing instead of R2 and admins get a
  404 or HTML response.
- **Action**: Convert `asset_index[].url` for `attached_pdf` entries to
  a presigned R2 GET URL or to the public R2 URL (depending on the
  bucket's ACL) before rendering the link. The existing `briefObjectPublicUrl`
  helper in `src/lib/r2/client.ts` is the right primitive. Defer
  selection of presigned vs public to the Phase 5 Wave A briefing
  canvas rewrite (R2 ACL strategy is decided there).
- **Compensating control**: yagi can still retrieve the PDF directly
  from the R2 console using the storage key copied from the panel,
  so this is a UX bug, not a data-loss bug.
- **Owner**: Builder.
- **Status**: Not started. Deferred to Phase 5 Wave A entry.
- **Registered**: 2026-05-04 (Wave C.5d sub_03f_3 generic K-05).

## FU-C5d-07 — `project_licenses` RLS uses `profiles.role` (yagi_admin path broken)

- **Trigger**: Codex generic K-05 review (Phase 4.x branch, 2026-05-04)
  P2 finding on `supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:73-76`.
- **Risk**: The `project_licenses_select` and `project_licenses_insert`
  policies look for `profiles.role = 'yagi_admin'` to grant admin
  override. yagi_admin is modeled in `user_roles.role` (and resolved
  through the `is_yagi_admin(uid)` SQL helper); `profiles.role` does
  not currently include `yagi_admin` in its CHECK constraint enum.
  Net effect: actual admins cannot SELECT or INSERT `project_licenses`
  rows even though the policy comments claim they can.
- **Action**: Rewrite both policies to use `is_yagi_admin(auth.uid())`
  instead of the `profiles.role` check, matching the rest of the
  codebase's admin-gate pattern.
- **Compensating control**: `project_licenses` is empty in production
  (the surface that writes to it has not shipped yet), so no admin is
  blocked today.
- **Owner**: Builder.
- **Status**: Not started. Deferred to Phase 6 entry when the licenses
  surface lands and admins actually need the policy.
- **Registered**: 2026-05-04 (Wave C.5d sub_03f_3 generic K-05).

## FU-C5d-08 — `save_project_board_document` SECURITY DEFINER RPC

- **Trigger**: Wave C.5d sub_03f_2 service-role split (board-actions.ts).
- **Risk**: Three actions in `board-actions.ts` (`updateProjectBoardAction`,
  `restoreVersionAction`, `recomputeAndUpdateAssetIndex` helper) write
  `asset_index` via the service-role client because the user-bound
  client lost UPDATE permission on that column in sub_03f_2. The
  service-role pattern works but bypasses RLS entirely; future
  authorization changes in `project_boards_update_client` are silently
  ignored on this path. A `save_project_board_document(board_id,
  document)` SECURITY DEFINER RPC would centralise the auth + lock
  + asset_index recomputation in one place and let RLS continue to
  govern the row scope.
- **Action**: Author the RPC, validate caller (workspace member +
  not-locked + creator/admin), recompute asset_index server-side from
  document + attached_*, UPDATE atomically with `is_locked=false`
  WHERE clause. Switch the three actions to call the RPC instead of
  service-role UPDATE. Drop the `createSupabaseService` calls in those
  actions.
- **Owner**: Builder.
- **Status**: Not started. Deferred to Phase 5 entry (Briefing Canvas
  rewrite touches all three call sites anyway).
- **Registered**: 2026-05-04 (Wave C.5d sub_03f_2 yagi decision).

## FU-C5d-09 — `assert_caller_bound_pdf_storage_key` mutable search_path

- **Trigger**: Supabase advisor (security) after Wave C.5d sub_03f_5
  prod migration apply, 2026-05-04. New WARN.
- **Risk**: The `assert_caller_bound_pdf_storage_key` helper function
  introduced by migration `20260504010151` is declared `IMMUTABLE` but
  does not include `SET search_path = public, pg_temp`. Advisor flags
  this as a function-search-path WARN. Because the function performs
  only text comparisons against caller arguments and constants (no
  table/function lookups by unqualified name), the practical exploit
  surface is essentially nil — but the codebase convention is to
  always pin `search_path` on SECURITY-sensitive helpers, and the
  advisor warning is a CI signal we want to keep clean.
- **Action**: `ALTER FUNCTION assert_caller_bound_pdf_storage_key(...)
  SET search_path = public, pg_temp;` (or recreate via `CREATE OR
  REPLACE FUNCTION ... SET search_path = public, pg_temp`). Two-line
  migration.
- **Compensating control**: Function body has no schema-resolved
  identifiers, so search_path manipulation cannot redirect any call.
- **Owner**: Builder.
- **Status**: Not started. Bundled into the next "lint sweep"
  migration (Phase 5+).
- **Registered**: 2026-05-04 (Wave C.5d sub_03f_5 prod apply advisor).

## FU-C5d-10 — Email template KO/EN visual mixing cleanup

- **Trigger**: yagi visual review of received signup confirmation
  email (2026-05-04, after Wave C.5d sub_01 + dashboard paste).
- **Risk**: All three production email templates (Confirm signup,
  Magic Link, Reset Password) ship a header block with English
  brand copy ("YAGI WORKSHOP" / "AI NATIVE ENTERTAINMENT STUDIO")
  and a Korean body underneath. yagi flagged this as inconsistent
  and noted it should be cleaned up later. Two interpretations are
  possible: (a) the English header is intentional brand
  identity (treat as wordmark, leave EN regardless of locale), or
  (b) the entire template should follow the recipient locale. The
  current state implicitly assumes (a) but the design has not been
  explicitly locked, so the visual reads as a bug to non-yagi
  reviewers.
- **Action**: Decide which of (a) / (b) is the brand stance, then:
  - If (a): document the policy in
    `supabase/templates/email/README.md` so future template authors
    know the EN header is wordmark-by-design and not subject to
    locale switching. No code change needed.
  - If (b): add a locale parameter to each template. Supabase email
    templates do not natively branch on user locale, so the path is
    likely two separate template files (`confirm.ko.html` /
    `confirm.en.html`) wired up via the
    `signUp({ options: { emailRedirectTo, data: { locale } } })`
    metadata + a Supabase Edge Function or Auth Hook that routes by
    locale. Bigger lift, but cleaner long-term.
- **Compensating control**: Korean readers understand "YAGI
  WORKSHOP" as a brand mark; English readers see the entire mail
  in English already (subject is currently KO-only — separate
  consideration). The mixing is an aesthetic concern, not a
  comprehension bug.
- **Owner**: yagi (brand decision) → Builder (implementation if (b)
  is selected).
- **Status**: Not started. Deferred to Phase 5+ when locale strategy
  for email is decided alongside the broader Briefing Canvas i18n
  work.
- **Registered**: 2026-05-04 (Wave C.5d sub_02 dashboard paste +
  yagi visual review).

## FU-C5d-11 — Onboarding /brand polish + Twin-only user carve-out

- **Trigger**: yagi visual review of `/ko/onboarding/brand` after
  fresh signup smoke test, 2026-05-04.
- **Risk**: Two distinct UX issues stack on the same surface:
  1. **Brand logo placeholder absent.** When the workspace has not
     yet uploaded a brand logo, the page header renders only the
     plain "YAGI WORKSHOP / AI NATIVE ENTERTAINMENT STUDIO" text
     wordmark — there is no graceful empty-state slot for the
     incoming brand identity. The page reads as YAGI's own
     branding hijacking the user's onboarding screen.
  2. **Twin-only user mismatch.** The "첫 브랜드를 추가하시겠어요?"
     copy and the [브랜드 이름 / 건너뛰기] button pair assume the
     user is a Brand-side client (one who is commissioning work
     against their own brand). PRODUCT-MASTER v1.1 §C explicitly
     names a second user shape — the Twin-curating customer,
     whose entry point is "we extend who you are" rather than "add
     your brand." For that user the brand step is a confusing
     barrier; the "건너뛰기" CTA does not signal "this step is
     optional for your use case" — it signals "this step is
     required but you can punt."
- **Action** (paired with FU-C5b-08 brand-onboarding rework):
  1. Brand logo header — add a square placeholder slot for the
     workspace logo above the page heading. When `brands.logo_url`
     is null, render a sage-tinted empty placeholder with helper
     text ("브랜드 로고는 나중에 추가할 수 있어요"). When set, swap
     in `next/image` at the same dimensions.
  2. Twin-aware copy + CTA — either:
     - **Option A** (small): rewrite the heading to "첫 브랜드를
       추가해 볼까요?" and add helper copy underneath ("Twin 활용이
       주 목적이라면 이 단계를 건너뛰고 바로 시작할 수 있어요"),
       or
     - **Option B** (preferred, paired with FU-C5b-08-c):
       redesign onboarding around the question "어떤 작업으로
       시작할까요?" with three primary cards (의뢰 / Twin / 둘 다)
       at the workspace-creation step. The chosen path drives the
       remaining onboarding sequence: 의뢰 → keeps current brand
       step, Twin → skips brand and goes straight to first Twin
       intake, 둘 다 → current flow with twin-aware copy.
- **Recommended bundling**: pair with FU-C5b-08 (brand onboarding
  rework, recommended option **c** = delete `/onboarding/brand`,
  auto-create default brand at workspace bootstrap, move multi-
  brand to `/app/settings/workspace`). Combined fix touches the
  same surface in one PR.
- **Affected surfaces**: `/onboarding/brand` route + page, possible
  new `/onboarding/intent` step (Option B), `bootstrap_workspace`
  RPC (auto-default brand if intent=Twin), i18n keys for the
  three-card copy.
- **Owner**: yagi (decision: Option A vs B), Builder (implementation
  when greenlit).
- **Status**: Not started. Deferred to Phase 5 Wave A as a polish
  task or — preferably — bundled with FU-C5b-08 into a single
  hotfix after Phase 4.x ff-merge. Phase 5 Wave A KICKOFF should
  add a `task_03c (onboarding/brand polish + twin-only carve-out)`
  entry to the task list, sequenced after task_03b (status copy
  i18n) so the three i18n+UX adjustments ship together.
- **Registered**: 2026-05-04 (Wave C.5d smoke test, yagi visual
  review of fresh signup `/ko/onboarding/brand`).

## FU-C5d-12 — Magic link signin UI + user-friendly 워딩 lock

- **Trigger**: Magic link signin 기능을 UI 에 처음 노출하는 시점
  (현재 미구현; PKCE intermediate page 의 `type='magiclink'` 처리
  코드는 defense-in-depth 로 유지 중).
- **Risk**: Wave D task_D3 Smoke 2 진행 시 발견 — `/ko/signin` page
  가 password-only (`signInWithPassword` 만). Magic link CTA 자체가
  UI 에 없음. 즉 *현재 PKCE 자동 verify path 의 `type='magiclink'`*
  는 dead code (admin tool 또는 미래 도입 시 fallback). 이 상태에서
  미래 magic link 도입 시 *dev-jargon 워딩* ("매직 링크 보내기" 같은)
  을 *그대로 사용할 risk*. yagi 가 명시적으로 reject —
  yagi-studio 의 target 은 비개발자 (셀럽 / 배우 / 아티스트 + brand
  의뢰자). "매직 링크" = sketchy, trust 깨뜨림.
- **Action**: Magic link UI 도입 시점에 다음 review 강제:
  1. **워딩 후보** — 셋 중 yagi visual review 로 1개 선택:
     - "이메일로 로그인 링크 받기" (직관적, 한국 users 의 카카오/
       네이버 OTP pattern 과 유사)
     - "비밀번호 없이 로그인" (clear, friction-free 강조)
     - "이메일 인증으로 바로 시작" (CTA-driven, signup 과 통합 가능)
  2. **디자인** — 메인 CTA (검정 "로그인" 버튼) 와의 위계 + 진입
     affordance 재설계. Secondary 한 *option* 위치 (예: signin form
     하단 "또는 이메일 링크로 로그인" 같은) 권장.
  3. **Email template** — `type='magiclink'` 의 Resend / Supabase
     template body 의 한국어 copy 재검토 (sub_03i 의 intermediate
     page copy "로그인 링크 확인" 과 일관 강제).
  4. **route handler** — `src/app/auth/confirm/route.ts` 의
     `getIntermediateCopy()` 의 `case "magiclink"` 가 이미 있음.
     도입 시 연결만 검증.
- **Compensating control**: 현재 `type='magiclink'` 가 user-facing
  trigger 0. Dead code 처럼 보이지만 *defense-in-depth*. Admin tool
  또는 future feature 에서 magic link 발급 시 fallback path 로 작동.
  코드 cleanup 비용 미미 (`getIntermediateCopy` case + route handler
  branch ~10 lines), 도입 시 워딩만 review.
- **Recommended bundling**: 미래 magic link 도입이 *passwordless
  authentication* push 와 묶일 가능성이 큼 (Phase 6+ Artist Roster
  intake 에서 invite-token 1-shot signup + magic link signin 조합).
  그 시점에 워딩 + 디자인 + email template 동시 review.
- **Owner**: yagi (워딩 + 디자인 결정) + Builder (구현) + Codex K-05
  Tier 2 (auth flow review).
- **Status**: Not started. Deferred to magic link 도입 시점 (Phase 6
  Artist Roster 또는 더 이른 시점에서 yagi product 결정 시).
- **Registered**: 2026-05-04 (Wave C.5d task_D3 Smoke 2 N/A 결정 +
  yagi 워딩 catch).
