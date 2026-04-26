# K-PUX-1 Review Findings — YAGI Workshop vs Founder Framing

**Reviewer:** Codex GPT-5.5 (high reasoning)
**Date:** 2026-04-27 00:18 KST
**Total findings:** 19
**By severity:** HIGH-PUX-A=4, HIGH-PUX-B=4, MED-PUX=10, LOW-PUX=1
**Source:** `_codex_kpux_output.txt` (UTF-16 LE; this file is the human-readable consolidation)

---

## EXECUTIVE SUMMARY (Codex)

- The shipped public first impression reads as an AI entertainment studio / creator brand, not a private AI workshop OS for client projects.
- Workshop and Contest remain mixed in primary IA: sidebar, project hub tabs, commission landing CTA, and admin routes all expose challenge language too early.
- The core five-action workshop cycle is not visible as a system model; current statuses read as production pipeline states, not the founder-framed AI collaboration loop.
- Brief Board is the strongest aligned surface, but it is hidden behind tabs and placeholders, with feedback still routed through generic project threads.
- "Workspace" and "Team" terminology leaks throughout onboarding, scope switching, settings, and admin copy, weakening YAGI=host / client=guest asymmetry.

---

## RANKED FIX QUEUE (Codex top 10)

1. **F-PUX-002** — `/commission` challenge CTA breaks Workshop ↔ Contest separation — HIGH-PUX-A — XS
2. **F-PUX-010** — deliverable_types free-text chips render as enum translations — MED — XS
3. **F-PUX-015** — Brief Board empty hint advertises missing slash command — LOW — XS
4. **F-PUX-016** — YAGI request modal shows success copy before submit — MED — XS
5. **F-PUX-007** — Contest tab inside `/app/projects` private project IA — HIGH-PUX-A — S
6. **F-PUX-012** — Brief Board is secondary to legacy Overview tab — MED — S
7. **F-PUX-003** — Anonymous→signup transition drops commission intent — HIGH-PUX-B — M
8. **F-PUX-008** — Wizard Step 3 (Brief Board) is skip-only placeholder — HIGH-PUX-B — M
9. **F-PUX-011** — Project status model hides the AI collaboration cycle — HIGH-PUX-B — M
10. **F-PUX-004** — Admin commission queue cannot convert intake into a Project Workshop — HIGH-PUX-B — L

---

## ALL FINDINGS (full text)

### F-PUX-001 [HIGH-PUX-A] Public Landing — First viewport frames YAGI as an entertainment studio
**Surface:** `src/app/[locale]/page.tsx`, `src/components/home/*`
**Dimension:** D1 (Identity)
**Observation:** The home hero says YAGI is "an AI-native entertainment studio for independent artists." The service triad leads with AI Twin, Branding & IP, and Content Production.
**Gap vs framing:** Founder framing defines YAGI Workshop as an AI production workflow OS / private workshop, not a generic studio portfolio or creator-brand service menu.
**Fix proposal:** Rewrite the hero and first two sections around Private Workshop, Project, Brief Board, and AI collaboration workflow. Make the primary CTA "start a workshop/project," not generic contact.
**Effort:** M
**Phase:** Phase 2.10

### F-PUX-002 [HIGH-PUX-A] Public Commission — Challenge CTA breaks Workshop vs Contest separation
**Surface:** `src/app/[locale]/commission/page.tsx`
**Dimension:** D5 (Workshop vs Contest separation)
**Observation:** The commission landing hero includes a secondary CTA to "Browse challenges."
**Gap vs framing:** Founder framing separates Private Workshop from Public/Semi-public Contest and defers Contest to Phase 3.0+. This CTA gives commission users the wrong product branch.
**Fix proposal:** Remove the challenge CTA from `/commission`. Keep the commission page focused on private workshop intake.
**Effort:** XS
**Phase:** Phase 2.8.1

### F-PUX-003 [HIGH-PUX-B] Commission Intake — Anonymous-to-logged-in transition drops intent
**Surface:** `src/app/[locale]/commission/page.tsx`, `src/app/[locale]/app/commission/new/page.tsx`
**Dimension:** D2 (Five-action cycle)
**Observation:** Anonymous users clicking submit are sent to `/{locale}/signup`; the destination does not preserve a return path to `/app/commission/new`.
**Gap vs framing:** Commission intake is the entry point into the private workshop cycle. Dropping intent interrupts the path from inquiry to project workspace.
**Fix proposal:** Add a signed-in continuation target such as `next=/app/commission/new` and preserve commission intent through signup/onboarding.
**Effort:** M
**Phase:** Phase 2.8.1

### F-PUX-004 [HIGH-PUX-B] Admin Commission Queue — Intake cannot become a Project Workshop
**Surface:** `src/app/[locale]/app/admin/commissions/*`, `src/components/commission/admin-response-form.tsx`
**Dimension:** D2 (Five-action cycle)
**Observation:** Admins can review an intake and send a text response. No shipped action converts the accepted intake into a project, Brief Board, references, or workshop surface.
**Gap vs framing:** The vertical workflow stops at response. Founder framing needs intake to become a private Project/Workshop with persistent collaboration.
**Fix proposal:** Add a "Create Project Workshop" admin action. Map title, brief, budget, deadline, references, and client identity into `projects`, `project_briefs`, and reference rows.
**Effort:** L
**Phase:** Phase 2.8.1 ⭐ (vertical workflow missing link)

### F-PUX-005 [HIGH-PUX-A] Sidebar IA — Primary nav mixes generic SaaS and Contest language
**Surface:** `src/components/app/sidebar-nav.tsx`, `messages/*.json`
**Dimension:** D1 (Identity)
**Observation:** Sidebar groups are "Work / Communication / Billing / System"; the Work group contains Projects and Challenges, while Commission queue sits under System.
**Gap vs framing:** The IA does not communicate Private Workshop as the core product. Contest and admin queues bleed into the same primary navigation model.
**Fix proposal:** Rename the main work group to Workshop. Put Projects and Brief Boards under Workshop. Move Challenges under an admin-only Contest area with deferred framing.
**Effort:** M
**Phase:** Phase 2.8.1

### F-PUX-006 [MED-PUX] Sidebar Scope Switcher — Workspace/Profile/Admin implies flat membership
**Surface:** `src/components/app/sidebar-scope-switcher.tsx`, `src/lib/app/scopes.ts`
**Dimension:** D3 (Vendor-asymmetry)
**Observation:** The scope switcher exposes Workspaces, Profile, and Admin as peer scopes. Labels are hard-coded English, and `getUserScopes(ctx)` is called without `currentPath`.
**Gap vs framing:** Founder framing requires YAGI=host and client=guest asymmetry. The current model reads as multi-tenant SaaS membership.
**Fix proposal:** Rename client workspace scope to Workshop or Client Portal. Rename admin scope to YAGI Host. Localize labels and pass current path into scope resolution.
**Effort:** S
**Phase:** Phase 2.10 (covered partially by G_B1-D terminology sweep)

### F-PUX-007 [HIGH-PUX-A] Projects Hub — Contest tab is inside private project IA
**Surface:** `src/app/[locale]/app/projects/page.tsx`
**Dimension:** D5 (Workshop vs Contest separation)
**Observation:** `/app/projects` has "Direct commission" and "Contest brief" tabs. The contest tab renders an empty coming-soon state.
**Gap vs framing:** Founder framing explicitly separates Workshop from Contest. Putting Contest in the project hub teaches users that both are equivalent project types.
**Fix proposal:** Remove the Contest tab from `/app/projects`. Keep contest management only in admin challenge surfaces until Phase 3.0+.
**Effort:** S
**Phase:** Phase 2.8.1

### F-PUX-008 [HIGH-PUX-B] New Project Wizard — Brief Board step is a skip-only placeholder
**Surface:** `src/app/[locale]/app/projects/new/new-project-wizard.tsx`
**Dimension:** D4 (Visual-board principle)
**Observation:** Step 2 is labeled Brief Board but renders a dashed placeholder and a Skip button.
**Gap vs framing:** MVP framing includes Canvas/Brief Board collaboration. The wizard currently creates a project without a meaningful board interaction.
**Fix proposal:** Mount BriefBoardEditor in wizard mode or replace the placeholder with a minimal board/reference capture surface. Make Skip secondary.
**Effort:** M
**Phase:** Phase 2.8.1 (already in v1 SPEC as G_B1-B)

### F-PUX-009 [MED-PUX] New Project Wizard — Three steps do not express the five-action cycle
**Surface:** `src/app/[locale]/app/projects/new/new-project-wizard.tsx`
**Dimension:** D2
**Observation:** The wizard steps are Brief, Brief Board, and Review. No cycle position or next collaboration action is visible.
**Gap vs framing:** Founder framing centers a five-action vertical workflow. The wizard reduces the model to form progression.
**Fix proposal:** Add a compact cycle rail to the wizard using the founder-framed action names. Mark current step and next YAGI/client action.
**Effort:** S
**Phase:** Phase 2.10

### F-PUX-010 [MED-PUX] Deliverable Tags — Free-text chips later rendered as enum translations
**Surface:** `src/app/[locale]/app/projects/new/new-project-wizard.tsx`, `src/app/[locale]/app/projects/[id]/page.tsx`
**Dimension:** D6 (Copy & terminology)
**Observation:** The wizard stores free-text `deliverable_types`, but project detail renders each tag through `t(\`deliverable_${dt}\`)`.
**Gap vs framing:** Custom "Where it'll be used" tags can display as missing translation keys or wrong taxonomy, weakening the project brief.
**Fix proposal:** Render stored tags as raw user-entered labels on project detail. Reserve translation keys only for controlled enums.
**Effort:** XS
**Phase:** Phase 2.8.1

### F-PUX-011 [HIGH-PUX-B] Project Detail — Status model hides the AI collaboration cycle
**Surface:** `src/app/[locale]/app/projects/[id]/page.tsx`
**Dimension:** D2
**Observation:** Project statuses are draft, submitted, discovery, production, revision, delivered, approved, archived. The UI does not show the founder-framed five-action cycle or current cycle position.
**Gap vs framing:** The core "AI collaboration" workflow is not legible to clients or YAGI admins. Users see pipeline state, not what action is happening next.
**Fix proposal:** Add a cycle status rail above Overview and Brief Board. Map project status to current action, next action, owner, and locked/unlocked state.
**Effort:** M
**Phase:** Phase 2.10 (status machine)

### F-PUX-012 [MED-PUX] Project Detail — Brief Board is secondary to legacy Overview
**Surface:** `src/app/[locale]/app/projects/[id]/page.tsx`
**Dimension:** D7 (Information hierarchy)
**Observation:** Project detail defaults to Overview. Brief Board is a second tab, while Overview repeats legacy brief text, references, preprod boards, and thread.
**Gap vs framing:** The most important collaborative object is not first. The shipped hierarchy treats Brief Board as a subpage rather than the workshop center.
**Fix proposal:** Make Brief Board the default tab for active workshop projects. Collapse Overview into project summary, metadata, and current cycle status.
**Effort:** S
**Phase:** Phase 2.8.1

### F-PUX-013 [MED-PUX] Project Detail — Participants panel does not express host/guest roles
**Surface:** `src/app/[locale]/app/projects/[id]/page.tsx`
**Dimension:** D3
**Observation:** The Participants section uses the Settings "Team" label and shows only the creator profile.
**Gap vs framing:** Founder framing needs YAGI as host and client as visiting guest. The current panel implies flat team membership and omits the host relationship.
**Fix proposal:** Replace Participants with Host / Client blocks. Show YAGI owner, client contact, and visibility permissions.
**Effort:** M
**Phase:** Phase 2.10

### F-PUX-014 [MED-PUX] Brief Board — Comments are generic project threads, not board-anchored feedback
**Surface:** `src/components/brief-board/comment-panel.tsx`, `src/components/project/thread-panel*`
**Dimension:** D4
**Observation:** Brief Board comments reuse the generic project thread. The code comment states block-level inline anchoring is deferred.
**Gap vs framing:** The Frame.io/FigJam-like persistent feedback principle is weakened because feedback is not anchored to board blocks or visual references.
**Fix proposal:** Add block/frame anchor metadata to comments. Render comments beside the selected block or asset. Until then, label the section as "Project thread."
**Effort:** L
**Phase:** Phase 2.10

### F-PUX-015 [LOW-PUX] Brief Board — Empty hint advertises a missing slash command
**Surface:** `src/components/brief-board/editor.tsx`, `messages/*.json`
**Dimension:** D6
**Observation:** Empty state copy says "Type / to insert a block," while the editor comments state slash command picker is deferred.
**Gap vs framing:** The board promises an interaction that is not shipped.
**Fix proposal:** Remove the slash-command hint or ship the suggestion menu. Keep the hint limited to available typing, upload, paste, and embed actions.
**Effort:** XS
**Phase:** Phase 2.8.1

### F-PUX-016 [MED-PUX] Brief Board — YAGI request modal shows success copy before submit
**Surface:** `src/components/brief-board/yagi-request-modal.tsx`, `messages/*.json`
**Dimension:** D7
**Observation:** The modal description uses `yagi_request_sent`, which says the request was sent and YAGI responds in 1-2 business days.
**Gap vs framing:** The modal hierarchy confuses pre-submit explanation with post-submit confirmation.
**Fix proposal:** Add a distinct modal description key explaining what YAGI will draft. Use `yagi_request_sent` only after successful submission.
**Effort:** XS
**Phase:** Phase 2.8.1

### F-PUX-017 [MED-PUX] Admin Challenges — Console is hard-coded Korean and too prominent
**Surface:** `src/app/[locale]/app/admin/challenges/*`
**Dimension:** D5
**Observation:** Challenge list, create, edit, judge, and announce pages use hard-coded Korean labels and are exposed from the admin sidebar.
**Gap vs framing:** Contest is Phase 3.0+ deferred and separate from private workshop. Hard-coded Korean also breaks the `/en/app/admin/challenges` route.
**Fix proposal:** Move challenge strings into `messages/*.json`. Keep challenge navigation inside an admin-only deferred Contest section.
**Effort:** M
**Phase:** Phase 3.0+

### F-PUX-018 [MED-PUX] Settings/Profile — Client settings leak marketplace profile concepts
**Surface:** `src/app/[locale]/app/settings/*`, `messages/*.json`
**Dimension:** D3
**Observation:** Settings uses Workspace and Team tabs. Profile form always includes bio and Instagram handle fields.
**Gap vs framing:** Creator Profile is Phase 3.0+ deferred and client portal is not marketplace profile. Workspace terminology also leaks generic SaaS framing.
**Fix proposal:** Gate creator-profile fields to creator/studio roles. Rename client-facing Workspace settings to Workshop or Client account settings.
**Effort:** M
**Phase:** Phase 2.10

### F-PUX-019 [MED-PUX] Routing & i18n — Public challenges are locale-free while commission links use locale-prefixed challenge URLs
**Surface:** `src/i18n/*`, `src/middleware.ts`, `src/app/challenges/layout.tsx`, `src/app/[locale]/commission/page.tsx`
**Dimension:** D6
**Observation:** Middleware excludes locale-free `/challenges`, and the challenges layout seeds Korean-only messages. Commission links point to `/{locale}/challenges`.
**Gap vs framing:** Locale handling is inconsistent, and the public commission page can route users toward a contest URL shape that the route tree does not ship.
**Fix proposal:** Remove challenge links from commission. For challenge surfaces, use `/challenges` consistently or create real localized challenge routes.
**Effort:** S
**Phase:** Phase 2.8.1

---

## OUT-OF-SCOPE OBSERVATIONS (Codex)

- This review is source-level; no browser runtime or visual screenshot pass was executed.
- Database schema, RLS policy correctness, and server-action security were not audited.
- Preprod board tooling appears richer than the project-detail integration exposes.
- Several code comments reference future phase gates; this review treats only shipped UI as reality.

---

## YAGI MANUAL K-PUX vs CODEX K-PUX OVERLAP ANALYSIS

| Yagi finding | Codex match | Status |
|---|---|---|
| Wizard Step 3 placeholder feels temporary | F-PUX-008 | ✅ Confirmed |
| Brief Board feels weak / "텍스트만 넣을거면 Overview에서 봐도 될 듯" | F-PUX-012 + F-PUX-014 | ✅ Confirmed (but Codex pinpoints Overview-default + thread-not-anchored as the deeper cause) |
| Sidebar should prioritize realtime chat over version history | (partial — F-PUX-014 board-anchor issue) | Different framing — Yagi UX intuition not captured by Codex source review |
| Comment author name too small + no avatar | (not captured — visual issue) | Yagi-only finding |
| Project detail empty 화면 unfriendly | F-PUX-012 | ✅ Confirmed |
| "프로젝트 의뢰하기" 라벨 + 카테고리 워크플로우 안내 | (not captured — copy issue) | Yagi-only finding |
| Admin delete + 3-day undelete | (not captured) | Yagi-only finding |
| Signup → check-email panel transition | (already shipped this session) | Self-resolved |

**Codex 추가 발견 (yagi가 못 봄):**
- F-PUX-002 (commission challenge CTA — 즉시 fix)
- F-PUX-003 (anonymous→signup intent drop)
- **F-PUX-004 (admin commission → Create Project Workshop missing — vertical workflow 결정적 갭)** ⭐
- F-PUX-007 (projects hub Contest tab)
- F-PUX-010 (deliverable tags i18n)
- F-PUX-019 (locale routing)

**Yagi 추가 발견 (Codex가 못 봄):**
- Brief Board 사이드바 채팅 우선순위 (UX intuition)
- Comment author visual hierarchy (avatar + role badge)
- "/app/projects 카테고리별 워크플로우 설명" 첫 인상 UX
- Admin delete + 3-day undelete

→ **두 reviewer 가 상호 보완.** 합집합으로 가야 product 본질에 가장 가까움.
