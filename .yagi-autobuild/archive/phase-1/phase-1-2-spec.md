# YAGI Workshop — Phase 1.2 Autonomous Build (B-O-E)

> **How to use this file:**
>
> 1. Complete Phase 1.1 smoke test first (see handoff doc Test 1–7)
> 2. Make sure you've granted yourself `yagi_admin` role (see handoff §5)
> 3. Sign up at https://resend.com → get API key → add to `.env.local` as `RESEND_API_KEY`
> 4. Open Warp, `cd C:\Users\yout4\yagi-studio\yagi-workshop`
> 5. Run: `claude --dangerously-skip-permissions`
> 6. Paste this entire file as first message
> 7. Expected duration: 3–4 hours
> 8. Final Telegram: "✅ Phase 1.2 complete" or "🛑 Halted at subtask NN"

---

## Your Identity

You are operating as **Builder** per the `yagi-agent-design` skill. Load it on first action — if not available, find it at `/mnt/skills/user/yagi-agent-design/SKILL.md` or equivalent Windows path and internalize.

**Builder definition:** Strategist. Interpret goal, decompose work, define acceptance criteria. No direct code execution. Spawn Executor and Evaluator sub-agents via Task tool. Communication via files under `.yagi-autobuild/` only.

Session is `--dangerously-skip-permissions`. You skip tool-use permissions but MUST explicitly pause at kill-switch points and wait for user input (`continue` or `abort`).

---

## Current Project State

**Location:** `C:\Users\yout4\yagi-studio\yagi-workshop`
**Phase 1.1 complete** per `.yagi-autobuild/summary.md` (verified by user smoke test)

**Key state from Phase 1.1:**

- 13 RLS-enabled tables, schema matches Phase 1.1 spec
- Magic-link auth working, middleware chained (next-intl + Supabase session refresh)
- Onboarding 5-step flow lands authenticated client users at `/ko/app`
- Sidebar shell with role-filtered nav; Projects/Storyboards/Brands/Team/Billing/Settings items (some disabled)
- Migration ID: `20260421094855_phase1_schema`
- Route group change: use `app/` literal folder (not `(app)` group) for authenticated routes — avoid URL collision with `/[locale]/page.tsx`
- **Hotfix applied before Phase 1.2**: onboarding guard bug fixed (Fix 1+2 in `/[locale]/onboarding/page.tsx` + `/[locale]/app/layout.tsx`) to prevent users stuck without workspace. yagi user re-completed onboarding and was granted `yagi_admin` role globally.

**Environment:**

- `RESEND_API_KEY` — filled (re_YEBHnSs8...)
- `ANTHROPIC_API_KEY` — filled but not used in 1.2
- Telegram bot + chat ID — for kill-switches
- `NEXT_PUBLIC_SITE_URL=http://localhost:3001`

**User's yagi_admin status:** Verify by querying `user_roles` — expect at least one row with `role='yagi_admin'` AND `workspace_id IS NULL`.

---

## Goal: Phase 1.2 — Projects (single pass)

Build the complete project intake, collaboration, and admin layer. By the end of Phase 1.2:

1. Client can create a new Direct Commission project with a structured brief
2. Client can upload image references AND paste external URLs (Instagram/Pinterest/etc.) which auto-unfurl to cache og:title, og:description, og:image
3. Client and YAGI team can exchange messages in a project thread with visibility toggle (internal = YAGI-only, shared = everyone)
4. Email notification sends on new message (via Resend)
5. Project status transitions work (draft → submitted → in_discovery → in_production → in_revision → delivered)
6. YAGI admin has cross-workspace project list with filters
7. Settings page exists: profile edit + workspace edit (logo upload, tax_id) + team management
8. Avatar, workspace logo, brand logo upload via Settings

**Success criteria (all must be true at completion):**

- `pnpm build` passes clean
- `pnpm dev` boots cleanly on :3001
- End-to-end: client creates project → fills brief → uploads 2 image refs + 1 Instagram URL (OG parsed) → posts message → YAGI admin sees it in admin view → replies internal (client doesn't see) → replies shared (client sees + gets email) → transitions status
- Supabase storage: private buckets reject unauthenticated reads; public buckets (avatars, logos) serve correctly
- Admin view shows all projects across workspaces when user has yagi_admin role
- `summary.md` written with subtask-by-subtask status and Evaluator loop counts
- Telegram receives "✅ Phase 1.2 complete"

---

## B-O-E Execution Protocol

Same as Phase 1.1:

1. Builder writes `task_plan.md` → Orchestrator reads it
2. Orchestrator creates `subtasks/NN_name.md` for each subtask → spawns Executor (Task tool)
3. Executor writes `results/NN_name.md`
4. Orchestrator spawns Evaluator (Task tool, fresh context) → `feedback/NN_name.md`
5. If fail, loop Executor up to 5 times
6. Halt if loop 5 reached → Telegram

**NEW in Phase 1.2:**

- **Parallel Executor spawning** — for subtasks with no dependencies, spawn in parallel (Task tool invocations in single response)
- **Context Reset trigger** — if your own context exceeds ~50% or tool calls exceed 30, write `checkpoint.md` with current subtask state + spawn fresh Orchestrator continuation
- **Evaluator "user-flow" simulation** — Evaluators should not just check files; they should simulate a user action (e.g., "insert test row with workspace_admin role, then query as client — does internal visibility filter work?")

---

## Kill-Switch Triggers (MANDATORY)

Same pattern as Phase 1.1. Telegram + terminal pause + wait for `continue`/`abort`.

**Phase 1.2 triggers:**

1. Before `pnpm install` of new packages (resend, react-dropzone, possibly @vercel/og or cheerio for OG parse)
2. Before ANY schema migration (Phase 1.2 should NOT need one — verify first)
3. Before `.env.local` modifications (e.g., confirming RESEND_API_KEY path)
4. Before final `pnpm build`
5. Before declaring Phase complete
6. Before any SQL containing `DROP`, `TRUNCATE`, `DELETE FROM`

**Telegram send template (PowerShell):**

```powershell
$envLocal = Get-Content .env.local
$token = ($envLocal | Select-String '^TELEGRAM_BOT_TOKEN=' | ForEach-Object { ($_ -split '=', 2)[1].Trim() })
$chatId = ($envLocal | Select-String '^TELEGRAM_CHAT_ID=' | ForEach-Object { ($_ -split '=', 2)[1].Trim() })
$msg = "🛑 YAGI Builder | Kill-switch`n`nAction: <desc>`nCommand: <preview>`n`nReply 'continue' or 'abort'."
Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/sendMessage" -Method Post -Body @{
    chat_id = $chatId
    text    = $msg
}
```

---

## Subtask Breakdown (14 subtasks)

### 01 — Project conventions: CLAUDE.md + yagi-nextjs-conventions skill

**Why first:** Every subsequent Executor should load these to follow project conventions without re-specifying every time.

**File 1:** `/CLAUDE.md` (project root, auto-loaded by Claude Code) — contents specified in companion doc. Covers: stack (Next.js 15.5 App Router, Tailwind v3, shadcn@2.1.8 strict, Supabase SSR, TanStack v5, RHF+Zod, next-intl ko/en, Sonner, Lucide, pnpm only), commands, architecture rules (Server Components by default, DB mutations via Server Actions, Supabase access only through `lib/supabase/server.ts` or `client.ts`, i18n everywhere, role helpers `is_yagi_admin`/`is_ws_member`/`is_ws_admin`, route structure `/[locale]/app/*` NOT route group), styling tokens (white/black, pill CTAs, Fraunces italic, keep-all Korean, ZERO warm tones).

**File 2:** `.claude/skills/yagi-nextjs-conventions/SKILL.md` — externalized coding rules: Supabase access pattern, Server Action template, RHF+Zod+shadcn form template, i18n pattern, Next.js 15 async page props, error handling, styling tokens, anti-patterns to reject.

**Acceptance:** both files exist on disk and are valid markdown.

**File 1 full content (`/CLAUDE.md`):**

```markdown
# YAGI Workshop — Claude Code Instructions

## Project
Bilingual (ko/en) AI creative production studio platform. Client portal + creator community hybrid.
Domain: studio.yagiworkshop.xyz. Deployment: Vercel.

## Stack (strict)
- Next.js 15.5 App Router + TypeScript (strict)
- Tailwind v3 + shadcn@2.1.8 (NEVER upgrade shadcn — breaks build)
- Supabase (SSR auth + RLS)
- TanStack Query v5
- React Hook Form + Zod
- next-intl (ko, en)
- Sonner (toasts) + Lucide (icons) + next-themes
- pnpm (never npm/yarn)

## Commands
- `pnpm dev` → :3001
- `pnpm build` → production build
- `pnpm dlx shadcn@2.1.8 add <component>` → NEVER use @latest
- `supabase db push` → apply migration (kill-switch first)
- `supabase gen types typescript --linked > src/lib/supabase/database.types.ts`

## Architecture rules (non-negotiable)
1. Server Components by default. Client Components ONLY when they need interaction, state, or browser APIs. Mark with `"use client"` at top.
2. Database mutations via Server Actions, not client-side fetch.
3. Supabase access ONLY through `src/lib/supabase/server.ts` (RSC/Server Actions) or `src/lib/supabase/client.ts` (Client Components). Never create clients inline.
4. i18n: every user-facing string in messages/ko.json + en.json. Never hardcode strings. Namespaces: home, brand, common, auth, onboarding, nav, dashboard, projects, settings, refs, threads, admin.
5. Forms: RHF + Zod. Errors as Sonner toast for mutations, inline for validation.
6. Errors: user-facing via Sonner toast; dev/critical via console.error + thrown Error.
7. Route structure: `/[locale]/app/*` for authenticated client pages (NOT route group `(app)`).
8. Roles: use `user_roles` table. Helpers: `is_yagi_admin`, `is_ws_member`, `is_ws_admin`.
9. RLS: write policies assuming malicious users. Test each policy with anon query.
10. Styling: Phase 1.0.6 design tokens. White bg, black text, pill CTAs, Fraunces italic for emphasis. Keep-all for Korean. NEVER use warm tones (no cognac, no bone).

## File conventions
- Component files: kebab-case (`workspace-switcher.tsx`)
- Server Actions: in `src/app/**/actions.ts`
- Shared types: `src/types/*.ts`
- DB types: `src/lib/supabase/database.types.ts` (auto-generated, don't edit)
- Utility: `src/lib/utils.ts` (cn, etc.)

## Known gotchas
- PowerShell `curl` is Invoke-WebRequest alias, use `Invoke-RestMethod` for real HTTP
- `.env.local` changes require `pnpm dev` restart
- Next.js 15: all page props are async (`params: Promise<{...}>`)
- shadcn components go to `src/components/ui/`

## What's built (as of 2026-04-21)
- Phase 1.0: bootstrap
- Phase 1.0.6: design system (white/black)
- Phase 1.1: auth + workspace/brand model + onboarding + app shell
- Phase 1.2: projects, references, threads, messaging, settings (IN PROGRESS)

## What's NOT yet built
- Meetings (Phase 1.3)
- Storyboards (Phase 1.4)
- Invoicing (Phase 1.5)
```

**File 2 full content (`.claude/skills/yagi-nextjs-conventions/SKILL.md`):**

YAML frontmatter:
```yaml
---
name: yagi-nextjs-conventions
description: >-
  YAGI Workshop project-specific Next.js conventions. Load for any task
  touching YAGI codebase. Auto-triggers on Next.js file creation,
  Supabase query writing, form building, i18n key addition, RLS policy
  authoring within YAGI Workshop.
---
```

Body must include: load order (CLAUDE.md first, then this skill), Supabase access pattern examples (server + client), Server Action template with Zod validation + redirect, RHF+Zod+shadcn form template with useTranslations, i18n rules (both locales always, 존댓말 for Korean, editorial English, CTA ALL CAPS TRACKED), Next.js 15 async page props, error handling taxonomy (inline validation / toast for mutations / notFound / throw), Phase 1.0.6 styling tokens (bg-background, text-foreground, border-border, pill CTAs with `rounded-full uppercase tracking-[0.12em]`, Fraunces italic via `font-serif italic`, keep-all utility for Korean, ZERO warm tones), anti-patterns to reject (`"use client"` overuse, inline Supabase clients, hardcoded strings, Client-side DB access, `any` types, shadcn@latest, skipping Zod, mixing locales).

---

### 02 — i18n: projects + refs + threads + settings + admin namespaces

Add keys to BOTH `messages/ko.json` and `messages/en.json`. Maintain all existing Phase 1.0.6/1.1 keys.

New namespaces required (Korean values; English file mirrors with English values):

**`projects` namespace keys:**
list_title, direct_tab, contest_tab, new, empty_direct, empty_direct_sub, empty_contest, brief_step, refs_step, review_step, title_label, title_ph, description_label, description_ph, brand_label, brand_none, tone_label, tone_ph, deliverable_types_label, deliverable_film, deliverable_still, deliverable_campaign, deliverable_editorial, deliverable_social, deliverable_other, budget_label, budget_ph, delivery_label, save_draft, submit_project, status_draft, status_submitted, status_in_discovery, status_in_production, status_in_revision, status_delivered, status_approved, status_archived, transition_submit, transition_start_discovery, transition_start_production, transition_request_revision, transition_mark_delivered, transition_approve, transition_archive

**`refs` namespace keys:**
title, add_image, add_url, url_ph, url_fetching, url_failed, caption_ph, drop_hint, remove

**`threads` namespace keys:**
title, new_message_ph, send, visibility_shared, visibility_internal, internal_badge, empty, attach

**`settings` namespace keys:**
title, profile_tab, workspace_tab, team_tab, billing_tab, profile_save, avatar_upload, workspace_logo_upload, tax_id_label, tax_id_ph, tax_invoice_email_label, team_invite, team_remove, team_role_admin, team_role_member

**`admin` namespace keys:**
title, projects_tab, workspaces_tab, cross_workspace_projects, filter_status, filter_workspace, filter_all

**`errors` namespace keys:**
generic, not_found, unauthorized, validation

Korean tone: 존댓말 (입력해 주세요), sentence case. English: editorial, sentence case except CTAs.

**Acceptance:** both JSON files valid, all listed keys present in both locales.

---

### 03 — Install new dependencies

🛑 **KILL-SWITCH** before install.

```powershell
pnpm add resend react-dropzone
pnpm add -D @types/react-dropzone
```

For OG unfurl, use native fetch + regex parsing (no extra dep). If you find a lightweight HTML parser necessary, use `node-html-parser` (no Puppeteer).

**Acceptance:** `package.json` updated, `pnpm-lock.yaml` regenerated, `pnpm install` clean.

---

### 04 — OG unfurl server utility

**File to create:** `src/lib/og-unfurl.ts`

Export: `type OgData = { og_title?: string; og_description?: string; og_image_url?: string }` and `async function unfurl(url: string): Promise<OgData>`.

Implementation requirements:
1. Validate URL is http(s) and not localhost/private IP (reject 10.*, 172.16-31.*, 192.168.*, 127.*, ::1)
2. `fetch(url, { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'YagiWorkshop/1.0' } })`
3. Read text up to ~500KB (truncate buffer to avoid huge HTML)
4. Regex: `<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']` etc. Handle property/name both.
5. Fallback: `<title>...</title>` if no og:title; first `<img>` if no og:image
6. Return object (empty on failure, never throw)

**API route wrapper:** `src/app/api/unfurl/route.ts` — POST { url } → OgData. Auth check: must be authenticated user (use Supabase server client).

**Acceptance:** unit-testable by calling the util with a known URL.

---

### 05 — Projects list page

**File to create:** `src/app/[locale]/app/projects/page.tsx`

- Server Component
- Fetches projects the current user can see (RLS handles scoping)
- Two tabs: Direct / Contest
- Direct tab: table/grid with title, brand, status badge, last activity, assignee
- Contest tab: disabled for now, show "Coming soon" empty state
- Filters (query params): status, brand_id
- "New project" button top-right → opens `/ko/app/projects/new`
- Empty state matches Phase 1.0.6 aesthetic

**Also update:** `src/components/app/sidebar-nav.tsx` — enable "Projects" nav item now.

**Acceptance:** `/ko/app/projects` renders, shows empty state for new user. After creating a project, it appears in the list.

---

### 06 — New project flow

**File to create:** `src/app/[locale]/app/projects/new/page.tsx`

Multi-step form (3 steps): Brief → References → Review.

**Step 1 Brief fields:**
- title (required, 1–200 chars)
- description (optional, max 4000)
- brand_id (dropdown, populated from workspaces.brands; default none)
- tone (text, optional, for now — future: chip multi-select)
- deliverable_types (multi-select checkboxes: film, still, campaign, editorial, social, other)
- estimated_budget_range (text, optional)
- target_delivery_at (date picker, optional)

**Step 2 References:** placeholder for subtask 08 — just "Skip for now" button.

**Step 3 Review:** read-only summary + submit button.

**Server Action:** `createProject` — inserts to `projects` with status='draft', project_type='direct_commission'. On submit: status='submitted' with confirm modal.

**Acceptance:** Client user can fill all fields, submit, lands on `/ko/app/projects/[id]`. Brand dropdown shows only brands within user's workspace. Validates required fields.

---

### 07 — Project detail page

**File to create:** `src/app/[locale]/app/projects/[id]/page.tsx`

Server Component, fetches:
- Project with brand join
- Count of references, messages
- User's role in workspace (for action button filtering)

**Layout:**
- Top: breadcrumb (Workspace > Brand > Project title), status badge, action dropdown
- Left column (2/3): brief (formatted), references grid (subtask 08 populates), thread (subtask 09 populates)
- Right column (1/3): metadata sidebar (created by, created at, target delivery, budget range, deliverable types as chips), participants list, milestones placeholder

**Status transitions:** Button in action dropdown shows allowed transitions based on current status + user role:
- workspace_admin sees: submit (if draft), approve/request_revision (if delivered)
- yagi_admin sees: start_discovery, start_production, mark_delivered, archive

**Server Action:** `transitionStatus(projectId, newStatus)` — validates allowed transition, writes.

**Acceptance:** Click into project, see brief. Try to transition status — only allowed transitions shown based on state.

---

### 08 — Reference collector

**Files to create:**
- `src/components/project/reference-uploader.tsx` (client component)
- `src/components/project/reference-grid.tsx` (server component for display)
- `src/app/[locale]/app/projects/[id]/actions.ts` — `addReference`, `removeReference`

**Uploader component:**
- Tabs: "Image" / "URL"
- Image tab: react-dropzone. Accepts jpg/png/webp/gif up to 10MB each, multi-upload. On drop: upload to `project-references` bucket, create `project_references` row with `storage_path`.
- URL tab: text input + paste button. On submit: call `/api/unfurl` → if ok, create `project_references` row with external_url + og_* fields. Show preview card with image + title.

**Grid:** responsive 3-col grid. Each card: thumbnail (from storage signed URL OR og_image_url), title (filename OR og_title), caption input (editable inline), remove button. Hover reveals remove.

**Acceptance:**
- Drag-drop 2 images → appear in grid
- Paste Instagram URL → OG fetched → appears in grid with thumbnail
- Remove works
- Client can only add refs to projects in workspaces they're member of (RLS verified)

---

### 09 — Thread messaging with visibility

**Files to create:**
- `src/components/project/thread-panel.tsx` (client component with Realtime subscription)
- `src/app/[locale]/app/projects/[id]/thread-actions.ts` — `sendMessage`, `updateMessage`

**Thread behavior:**
- Each project has at most one default thread (auto-created on first message if missing)
- Messages listed chronologically
- Each message: author avatar + name + timestamp + body + visibility badge (if internal)
- Visibility toggle at input: "Shared" (default) / "Internal (YAGI only)"
- Internal option only visible to users with `yagi_admin` role
- Realtime: subscribe to `thread_messages` changes, append new messages live

**Server Action `sendMessage`:**
- Inserts into `thread_messages` with visibility (defaults shared, internal only if yagi_admin)
- If visibility='shared': enqueue email notification to OTHER participants (subtask 10)
- Do NOT enqueue email for 'internal' messages

**Acceptance:**
- Client user sends message → visible in thread
- YAGI admin sees the message, replies with toggle internal
- Client user does NOT see the internal reply (RLS restrictive policy `thread_msgs_hide_internal_from_clients`)
- YAGI admin sees both internal and shared messages
- Realtime: open thread in two browsers (client + yagi_admin), send from one → other updates without refresh

---

### 10 — Email notifications (Resend)

**Files to create:**
- `src/lib/email/resend.ts` — Resend client singleton
- `src/lib/email/templates/new-message.tsx` — React Email-style template (or plain HTML string for now; React Email is fine if `@react-email/components` installed)
- `src/app/api/notifications/new-message/route.ts` — internal POST endpoint called by `sendMessage` Server Action

**Template content:**
- Subject: `[YAGI Workshop] {project_title} · 새 메시지 / New message`
- Body: sender name, message preview (first 200 chars), CTA button "View project" → link to `/ko/app/projects/[id]`
- Footer: unsubscribe link (placeholder URL for now — full implementation Phase 2+)
- FROM: for MVP, use `onboarding@resend.dev` unless user has verified domain. If `process.env.RESEND_FROM` is set, use that.

**Recipient logic:**
- For shared messages: notify all workspace_members + all yagi_admin
- Exclude the author
- Deduplicate emails

**Acceptance:**
- Send shared message → other participant receives email within ~30s
- Email has correct project title and link
- Email does NOT go out for internal messages
- If RESEND_API_KEY missing, log warning and continue (don't crash)

---

### 11 — YAGI admin view

**File to create:** `src/app/[locale]/app/admin/projects/page.tsx`

- Server Component
- Auth guard: require `yagi_admin` role. If not, redirect to `/ko/app`.
- Fetches ALL projects across workspaces (RLS allows because yagi_admin)
- Table columns: workspace (with logo), brand, project title, status (colored badge), created_at, last_activity, assignee (YAGI side)
- Filters: status dropdown, workspace dropdown, search by title
- Pagination: 50/page
- Click row → project detail

**Also:** Update sidebar to show "Admin" nav section when user has yagi_admin role, with "Projects" item.

**Acceptance:**
- As yagi_admin user, sidebar shows Admin section
- `/ko/app/admin/projects` shows ALL projects from any workspace
- Filters work
- As non-admin user, `/ko/app/admin/*` redirects to `/ko/app`

---

### 12 — Settings pages

**Files to create:**
- `src/app/[locale]/app/settings/layout.tsx` — tabbed shell (Profile / Workspace / Team / Billing). Billing tab disabled for now (Phase 1.5).
- `src/app/[locale]/app/settings/page.tsx` — Profile: handle (read-only after creation), display_name, bio, locale, avatar upload
- `src/app/[locale]/app/settings/workspace/page.tsx` — Workspace: name, logo upload, tax_id, tax_invoice_email (requires workspace_admin)
- `src/app/[locale]/app/settings/team/page.tsx` — List members + invites; remove member; invite new (reuses onboarding invite logic)
- `src/components/shared/avatar-uploader.tsx` — reusable; drag-drop, crop to square, upload to bucket

**Avatar uploader flow:**
- Drop/select image
- Client-side: preview + optional crop (use `react-image-crop` if small, or just force 256×256 resize via canvas)
- Upload to bucket with path `{user_id}/{uuid}.{ext}`
- Update profile.avatar_url

**Acceptance:**
- Profile updates save correctly
- Workspace admin can update workspace fields
- Workspace member (non-admin) can only view workspace settings
- Team tab shows members + resends invites
- Avatar/logo upload works → displayed in sidebar user menu / workspace switcher immediately

---

### 13 — Storage bucket policy refinements

Review Phase 1.1 storage policies (already created). Verify:
- `project-references` bucket: private, readable only by workspace members of the ref's project
- `project-deliverables`: same
- `avatars`, `workspace-logos`, `brand-logos`: public read, authenticated write with proper path constraints

If any policy is missing, add in migration `20260421_1200_phase1_2_storage_fixes.sql` (🛑 kill-switch before migrate).

**Acceptance:** Private bucket rejects anonymous fetch. Public bucket serves. Attempt to upload to `avatars/OTHER_USER_ID/...` as user A fails.

---

### 14 — E2E manual test script + summary

**File to create:** `.yagi-autobuild/phase-1-2-e2e.md` — runbook for user smoke test covering:
1. Create project (brief form, submit)
2. Add references (2 images + 1 URL with OG parse)
3. Thread conversation (client sends → YAGI admin sees in admin view → replies internal, client doesn't see → replies shared, client sees + email)
4. Status transitions (YAGI admin: submitted → in_discovery → in_production; client: approve/request_revision only when delivered)
5. Settings (avatar upload, workspace logo, tax_id)
6. RLS sanity (delete cookies, GET /rest/v1/projects → 401/empty)

**Final Builder actions:**
1. Run `pnpm build` (🛑 kill-switch first)
2. Write `.yagi-autobuild/summary.md` with all 14 subtasks status, Evaluator loop counts, files created/modified count, duration, deviations from spec + rationale
3. Telegram: "✅ YAGI Builder | Phase 1.2 complete. 14 subtasks pass. See summary.md + phase-1-2-e2e.md."

---

## Error Handling & Quality Gates

From `yagi-agent-design` skill — apply explicitly:

**Executor prompts must include:**
- "Read only the assigned subtask file from `.yagi-autobuild/subtasks/NN_name.md`. Do NOT read task_plan.md or other subtask files."
- "Before writing code, read `/CLAUDE.md` and `.claude/skills/yagi-nextjs-conventions/SKILL.md`."
- "If you need info not in the subtask spec, write 'BLOCKED: <reason>' in result file and stop."

**Evaluator prompts must include:**
- "Fresh context: do NOT read subtask files other than the one assigned. Do NOT read task_plan.md."
- "Simulate one end-user action to verify (e.g., write test SQL to insert test row, then query as anon/client to confirm RLS)."
- "Verdict: pass if ALL acceptance criteria met AND user-flow simulation works. Otherwise fail with specifics."

**Parallelism:**
- Subtasks 02, 03, 04 (i18n, deps, OG utility) have no dependencies → spawn Executors in parallel
- Subtasks 05, 06, 07 depend on each other → serial
- Subtasks 08 (refs), 09 (threads), 10 (email) depend on 07 but are mutually independent → parallel
- Subtask 11 (admin), 12 (settings), 13 (storage policy) mutually independent → parallel after core complete

**Context Reset:**
- Orchestrator: after every 4 completed subtasks, write checkpoint.md + consider fresh context continuation if context > 50%
- Checkpoint includes: completed subtasks list, pending subtasks list, important decisions made

**Model routing:**
- Builder: Claude Opus 4.7
- Orchestrator: Claude Sonnet 4.6
- Executor (code-heavy: 05, 06, 07, 08, 09, 10, 11, 12): Claude Sonnet 4.6
- Executor (messages/docs/simple refactors: 01, 02, 04, 13, 14): Claude Haiku 4.5
- Evaluator: Claude Sonnet 4.6 (fresh context)

---

## Begin

1. Confirm `yagi-agent-design` skill loaded (quote B-O-E diagram briefly)
2. Verify Phase 1.1 state (already done in kickoff prompt Step 2)
3. Create `.yagi-autobuild/` subdirectories (subtasks/, results/, feedback/ — may already exist from Phase 1.1)
4. Write `task_plan.md` with the 14 subtasks above
5. Telegram: "🚀 YAGI Builder | Starting Phase 1.2. 14 subtasks queued. Est 3–4 hours."
6. Begin subtask 01

Report subtask transitions in terminal. Do not dump full Executor output (keep readable). Surface only: subtask name, status, Evaluator verdict, loop count, key file outputs.
