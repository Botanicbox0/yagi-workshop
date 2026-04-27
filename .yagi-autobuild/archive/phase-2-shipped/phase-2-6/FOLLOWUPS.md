# Phase 2.6 — Follow-ups

**Purpose:** Items deferred from Phase 2.6 scope or discovered during
Phase 2.6 execution. Triaged into phase-scale backlog or logged for
revisit.

---

## FU-MTG-1 — Meeting workflow inversion (client-initiated requests)

**Priority:** HIGH (core B2B workflow)
**Size:** Phase-scale (~1 week)
**Dependencies:** Phase 2.6 closeout
**Trigger:** 야기 user research 2026-04-24 (meeting tab UX discussion)

### Problem

Current `/app/meetings` is YAGI-initiated: only yagi_admin / ws_admin can
call `createMeeting`. Client users can't propose meetings, so workflow
still requires email back-and-forth for time coordination. Defeats
purpose of in-app meeting management.

### Desired workflow

Client proposes meeting with요지 + 2-3 preferred time slots → YAGI receives
notification → 1-click approve (one slot) OR counter-propose / decline.

### Required changes

Schema:
- `meetings.status` — add values: `requested`, `counter_proposed`, `declined`
- `meetings.proposed_slots jsonb` — array of `{start_at, duration}`
- `meetings.counter_proposal jsonb` — YAGI's counter-propose payload
- `meetings.decline_reason text`
- New notification kinds: `meeting_requested`, `meeting_counter_proposed`,
  `meeting_declined`, `meeting_approved`

Routes:
- `/app/meetings/request/new` — client-initiated request form
- `/app/meetings/[id]/approve` — YAGI approval UI with slot selection
- `/app/meetings/[id]/counter-propose` — YAGI counter-propose UI

Nice-to-haves (if time permits):
- `agenda_md` field on `meetings` — client writes요지 ahead of meeting
- pg_cron 10-min-before reminder
- `action_items jsonb[]` on `meetings` — post-meeting to-dos

### Estimate

3 days (1 schema, 1 client flow, 1 YAGI flow) + Codex review + QA.

---

## FU-GUIDES-1 — Remaining journal guide content

**Priority:** MEDIUM
**Size:** ongoing content work
**Dependencies:** Phase 2.6 G3 closeout

### Problem

Phase 2.6 G3 ships with 1 published guide (`challenge-creation`). Three
more `HELP_ROUTES` entries remain `published: false`:
- `challenge-management` (`/app/admin/challenges/:id`)
- `project-setup` (`/app/projects/new`)
- `showcase-publishing` (`/app/showcases/new`)

Each requires ~300-500 word guide post at `/journal/guide/<slug>`, then
flip `published: true` in `src/lib/app/help-routes.ts` (single-line PR).

### Authoring

야기 or Dana writes, as context demands. No deadline, but tracking here
so future sessions don't forget.

---

## FU-SIDEBAR-EN-1 — English i18n parity

**Priority:** LOW
**Size:** small
**Dependencies:** general en reintroduction (cross-phase effort)

### Problem

Phase 2.5 §0 established "Korean only" for MVP. Phase 2.6 inherits this
— en.json stubs are placeholder or Korean fallback.

When en is reintroduced systematically (Phase 3+?), audit these keys:

- `messages.nav.groups.{work|communication|billing|system}`
- `messages.app.help.routes.{challengeCreation|challengeManagement|projectSetup|showcasePublishing}`
- `messages.app.publicExit`
- `messages.app.scopeSelector.firstUseTooltip`

### Estimate

~1h for translation pass + QA.

---

## FU-SIDEBAR-STORYBOARD-1 — Storyboards / Brands enablement

**Priority:** LOW
**Size:** phase-scale each
**Dependencies:** actual feature builds

### Problem

Phase 2.6 keeps `storyboards` + `brands` in sidebar as `disabled: true`
with "(Soon)" tooltips. At some point these become real features. Each
requires:

- Route authoring (`/app/storyboards/*`, `/app/brands/*`)
- RLS policies
- Flip `disabled: false` in sidebar items array
- Remove "(Soon)" tooltip

No decision point — activated when those phases happen.

---

## FU-SIDEBAR-PIN-1 — User-pinned sidebar items (Phase 3+)

**Priority:** LOW
**Size:** phase-scale
**Dependencies:** Phase 3+

### Problem

Growth trigger "any group >5 items" or "user feedback 'I can't find X'"
may fire in Phase 3. Expansion hierarchy (SPEC §5) says step 4:
per-user pinned/recent items.

Schema:
- `user_sidebar_prefs` table or `profiles.sidebar_prefs jsonb`

UI:
- Right-click item → pin / unpin
- Pinned section at top of sidebar nav

### Estimate

3-4 days. Deferred.

---

## Registered (appended at phase closeout)

(Additional FUs appended here as Phase 2.6 execution surfaces new items.)
