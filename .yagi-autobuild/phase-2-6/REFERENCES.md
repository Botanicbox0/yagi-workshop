# Phase 2.6 — References

**Companion to** `SPEC.md` **v3** + `IMPLEMENTATION.md`
**Status:** v3, 2026-04-24

> This document collects cross-references, ADR links, and historical
> context. Policy lives in `SPEC.md`. Implementation guide lives in
> `IMPLEMENTATION.md`.

---

## §1 ADRs that shape this phase

### ADR-008 — No breadcrumbs

**Location:** `docs/design/DECISIONS.md`
**Status:** Accepted (carried forward from SPEC v1)
**Summary:** Sidebar active state + page H1 communicate location
adequately at current route depth. Breadcrumbs add visual noise without
information. Revisit if 5-hop routes emerge in Phase 3+.

### ADR-009 — Role type system reconciliation

**Location:** `docs/design/DECISIONS.md`
**Status:** Accepted 2026-04-23
**Summary:** `WorkspaceRole` (Phase 1.1) and `ProfileRole` (Phase 2.5)
are distinct TypeScript types living side-by-side in `src/lib/app/context.ts`.
Shared literal `"creator"` is disambiguated by type, not by renaming.
Call sites must use `profile.role === 'creator'` or
`workspaceRoles.includes('creator')` — never a bare check.

**Phase 2.6 usage:** Both `getUserScopes` (server) and `useUserScopes`
(client hook) consume this split-type system. No new type work in
Phase 2.6.

### ADR-010 — Sidebar IA grouping + billing retirement + invoice consolidation

**Location:** `docs/design/DECISIONS.md` (authored by this phase, to be
committed with Phase 2.6 G1)
**Status:** Accepted (this SPEC)
**Summary:**
1. Flat operations tier → 4 groups (작업/소통/결제/시스템) with quiet
   uppercase labels. Role-dynamic auto-hide when group has <2 visible
   items.
2. `billing` aspirational Soon slot retired from sidebar. If SaaS
   usage billing becomes real, new ADR + mapping amendment.
3. `invoices` + `admin_invoices` consolidated under `결제` group.
   Unified money surface instead of split across tier.

Alternatives considered: keep billing (rejected, no roadmap); label-
only rename (rejected, doesn't solve Miller); label-less dividers
(rejected, learning curve); collapsible groups (deferred, state
persistence out of Phase 2.6 scope).


---

## §2 Cross-phase dependencies

### Phase 2.4

- **ADR-007** (Webflow blue accent token) → sidebar active state color
- **G1 closeout** (Pretendard + WF Visual Sans fonts) → `font-display`
  rendering on scope selector trigger. Pre-G1 visual baseline recommended.

### Phase 2.5

- **SPEC v2 §1.2** (role orthogonality) → basis for scope selector
  multi-kind design
- **G1** (profiles table role column) → profile scope eligibility
- **G2** (role selection onboarding) → ensures users have non-null
  `profile.role` when they reach app surfaces
- **G3-G5** (public + admin challenge routes) → new sidebar entries
- **G6** (`/u/[handle]` profile surface) → consumes `useUserScopes`
  hook from G0. **This is the fragility-guard target.**

### Phase 2.1

- **G6 middleware exclusion pattern** → `/u/[handle]` follows same
  pattern; no sidebar impact
- **Team channel infra** (`/app/team`) → existing route now surfaces
  under `소통` group

### Phase 1.x baseline

- `sidebar.tsx` 3-tier structure (preserved)
- `sidebar-workspace-switcher.tsx` → basis for `sidebar-scope-switcher.tsx`
- `AppContext` shape + `fetchAppContext` (Phase 2.5 extends with
  `profile.role` + `workspaceRoles` rename) → consumed by G0 resolver
- `src/components/ui/sheet.tsx` → mobile drawer primitive, reused in G4
- Journal infrastructure → help guides surface at `/journal/guide/<slug>`

---

## §3 Non-obvious design choices (answered once, linked here)

### Why preprod under `작업` not `소통`?

Preprod is YAGI-internal pre-production output (storyboarding, shot
planning). It produces artifacts consumed by `projects` and
`showcases`. Categorically: output, not communication.

### Why notifications under `소통` not `시스템`?

Notifications are events triggered by other humans/agents acting
toward the user (comment, meeting scheduled, challenge announced).
Inbound communication, not system configuration.

### Why keep `설정` under `시스템` when often alone?

Auto-hide handles it: when only 1 item visible, group label hides
and `설정` renders bare. Consistent structure across user roles, no
runtime category churn.

### Why server resolver AND client hook for scopes?

Sidebar root renders server-side (no hydration needed). Client
surfaces that need the same list (Phase 2.5 G6, future consumers) use
the hook. Both share resolver logic — single source of truth for
role→scope mapping.

### Why `published: false` gating instead of rendering broken links?

Broken links on ship day are outsized negative UX signal. Published
flag makes reservations structural (entry exists) without being
user-visible until content is ready. Paired with minimum viable
content requirement (at least 1 guide at ship) so feature isn't dead.

### Why D2C screenshot pending?

Reference screenshot (`d2c-campaign-saas-2026-04-23.png`) was analyzed
during Phase 2.6 v1 drafting. 2026-04-24 Downloads folder scan did
not locate a matching file. 야기 may re-capture; blocks nothing
critical because the 3 absorbed patterns (grouped labels / scope
selector / contextual help) are fully documented in SPEC.md without
visual reference.


---

## §4 External references

- **ARCHITECTURE.md v2.0** — directory convention + aspirational-slot-
  retirement principle (ADR-010 cites this)
- **DECISIONS_CACHE.md** — Q-014 (speed-first standing order) + Q-016
  (aspirational removal policy) + Q-018 (avoid speculation)
- **GATE_AUTOPILOT.md** — Phase 2.5 G6 entry step incorporates
  FU-SCOPES-1 check (Layer 2 of G0 fragility guard)

---

## §5 Source files touched

See `IMPLEMENTATION.md §6` for complete file inventory. Summary:

- 6 new files (2 lib + 3 components + 1 rename)
- 4 modified files (sidebar trio + layout + messages)
- 1 retired config entry (`billing` from `items` array + translation keys)

---

## §6 Related follow-ups

Tracked separately in `.yagi-autobuild/phase-2-6/FOLLOWUPS.md`:

- **FU-MTG-1** — Meeting workflow inversion (client-initiated requests,
  slot proposals, counter-propose/decline, agenda_md, 10min reminders,
  action_items). Phase 3+ scale. Schema change + new notification kinds
  + new routes.
- **FU-GUIDES-1** — Journal guide content authoring for remaining 3
  help entries (challenge-management, project-setup, showcase-publishing).
  Content work, ongoing.
- **FU-SIDEBAR-EN-1** — `messages/en.json` parity for group labels +
  help route labels. Korean-first per Phase 2.5 §0 precedent; en
  reintroduction is cross-Phase effort, not Phase 2.6 scope.

Tracked in `.yagi-autobuild/phase-2-5/FOLLOWUPS.md`:

- **FU-SCOPES-1 (BLOCKER for G6 entry)** — G0 pre-work execution.
  See SPEC §7 fragility guard.

---

## §7 Archived drafts

- `SPEC_v2_draft.archive.md` — single-file v2 DRAFT (2026-04-24
  morning). Superseded by 3-file v3 split. Preserved for history.

---

**END OF REFERENCES v3**
