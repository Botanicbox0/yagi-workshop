# YAGI Workshop — Phase 1.9 Autonomous Build (B-O-E)

> **Scope:** Deliverable Showcase Mode — public portfolio page per project with slug URL, "Made with YAGI Workshop" badge (the viral loop), OG images, optional password gating (deferred from 1.4).
> **Prereq:** Phase 1.4 (Pre-production Board — source of deliverables), Phase 1.6 (public landing — where showcase list appears).
> **Estimated duration:** 3–4 hours.
> **Design decision:** ARCHITECTURE.md §13.

---

## Your Identity

Builder per `yagi-agent-design`. Load `/CLAUDE.md`, `/ARCHITECTURE.md` §13 + §8.3. `frontend-design` skill loaded for the public viewer UX (this is a YAGI brand surface).

Session: `--dangerously-skip-permissions`. Kill-switches below.

---

## Goal

By the end of Phase 1.9:

1. YAGI admin can convert an approved Pre-production Board → a published Showcase with a stable slug URL `/showcase/[slug]`.
2. Showcase renders: cover media, project narrative (markdown), media grid (inherited from the board), credits, YAGI badge.
3. Clients can request badge removal; YAGI admin approves/denies (DB flag + workflow).
4. OG images auto-generated per showcase for social link previews.
5. Showcase list surfaces on Phase 1.6 public landing's "Work" section.
6. Draft/published states; drafts are noindex + unlisted.
7. Password gating optional (deferred from Phase 1.4 — now implemented).

**Non-goals (explicit):**
- No showcase analytics dashboard in 1.9 (view count tracked but no UI yet — defer to 2.0+).
- No SEO optimization beyond OG + sitemap entry.
- No custom showcase templates / themes — single editorial template per YAGI brand.
- No client-side editing of showcases (YAGI admin only).

---

## Data model

Migration: `YYYYMMDDHHMMSS_phase_1_9_showcases.sql`

```sql
create table showcases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  board_id uuid references preprod_boards(id),   -- optional source board
  slug text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'),
  title text not null,
  subtitle text,
  narrative_md text,
  cover_media_storage_path text,
  cover_media_external_url text,
  cover_media_type text check (cover_media_type in ('image','video_upload','video_embed')),
  credits_md text,                     -- YAGI team member names/roles
  client_name_public text,             -- optional; null = hidden
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  -- "Made with YAGI" badge control
  made_with_yagi boolean not null default true,
  badge_removal_requested boolean not null default false,
  badge_removal_approved_at timestamptz,
  badge_removal_approved_by uuid references auth.users(id),
  -- Gating
  is_password_protected boolean not null default false,
  password_hash text,
  -- Observability
  view_count integer not null default 0,
  og_image_path text,                  -- rendered OG image in storage
  og_image_regenerated_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_showcases_slug on showcases(slug);
create index idx_showcases_published on showcases(status, published_at desc) where status = 'published';

create table showcase_media (
  id uuid primary key default gen_random_uuid(),
  showcase_id uuid references showcases(id) on delete cascade,
  sort_order integer not null,
  media_type text not null check (media_type in ('image','video_upload','video_embed')),
  storage_path text,
  external_url text,
  embed_provider text check (embed_provider is null or embed_provider in ('youtube','vimeo','tiktok','instagram')),
  caption text,
  created_at timestamptz not null default now(),
  unique (showcase_id, sort_order)
);

create index idx_showcase_media_showcase on showcase_media(showcase_id);

-- RLS
alter table showcases enable row level security;
alter table showcase_media enable row level security;

-- YAGI team creates/edits
create policy showcases_select_internal on showcases for select using (
  is_yagi_admin() or exists (
    select 1 from projects p where p.id = project_id and is_ws_member(p.workspace_id)
  )
);

create policy showcases_insert_internal on showcases for insert with check (
  is_yagi_admin()
);

create policy showcases_update_internal on showcases for update using (
  is_yagi_admin() or exists (
    select 1 from projects p where p.id = project_id and is_ws_admin(p.workspace_id)
  )
);

create policy showcase_media_select on showcase_media for select using (
  exists (select 1 from showcases s where s.id = showcase_id
          and (is_yagi_admin() or exists (
            select 1 from projects p where p.id = s.project_id and is_ws_member(p.workspace_id)
          )))
);

create policy showcase_media_insert on showcase_media for insert with check (
  exists (select 1 from showcases s where s.id = showcase_id and is_yagi_admin())
);

-- Public /showcase/[slug] path uses service-role client (no RLS) with status='published' filter

-- Storage bucket: showcase-media (public: false; served via signed URLs on public page — but OG images are public readable)
insert into storage.buckets (id, name, public) values ('showcase-media', 'showcase-media', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('showcase-og', 'showcase-og', true)
  on conflict (id) do nothing;
```

Regenerate types.

---

## Subtasks (7)

### 01 — i18n: `showcase` namespace

Keys for admin editor (title, subtitle, narrative, credits, cover picker, media reorder, publish/unpublish, badge control, password gating) + public viewer (client name toggle, "Made with YAGI" badge, share buttons, password prompt) + landing list ("Work", "View project").

### 02 — Migration + "Convert from board" Server Action

🛑 KILL-SWITCH before apply.

File: `src/app/[locale]/app/showcases/actions.ts`

```typescript
export async function createShowcaseFromBoard(boardId: string): Promise<{ showcaseId: string }>
export async function publishShowcase(showcaseId: string): Promise<{ slug: string; url: string }>
export async function unpublishShowcase(showcaseId: string): Promise<void>
export async function requestBadgeRemoval(showcaseId: string, reason: string): Promise<void>
export async function approveBadgeRemoval(showcaseId: string): Promise<void>  // yagi_admin only
export async function setShowcasePassword(showcaseId: string, password: string | null): Promise<void>
```

`createShowcaseFromBoard`:
1. Auth: yagi_admin
2. Load board + current-revision frames
3. Insert showcase row with status='draft', title from board
4. Copy each current-revision frame to `showcase_media` with preserved order
5. Set cover to first frame's media
6. Return showcase id

`publishShowcase`:
1. Validate: showcase has cover + at least 3 media items + narrative >200 chars + slug is valid
2. Generate slug if not manually overridden: slugify(title) + suffix if collision
3. Generate OG image (subtask 05)
4. Set `status='published'`, `published_at=now()`
5. Emit notification event (Phase 1.8 `showcase_published`)

### 03 — Admin editor page

File: `src/app/[locale]/app/showcases/page.tsx` — list
File: `src/app/[locale]/app/showcases/[id]/page.tsx` — editor
File: `src/components/showcases/showcase-editor.tsx`

Editor sections:
- Metadata: title, subtitle, client name toggle + field
- Cover picker (select from showcase_media or upload new)
- Narrative markdown editor (reuse Phase 1.6's MDX editor component if available, else plain textarea with live preview)
- Media grid (reorderable via @dnd-kit, same pattern as Phase 1.4)
- Credits markdown
- Badge control (toggle + "request removal" + admin approval flow)
- Password gating (optional password field; empty = no password)
- Publish button (with checklist — covers all validation requirements)

Access control: yagi_admin only; workspace admins can view showcases linked to their projects but cannot publish/edit.

### 04 — Public `/showcase/[slug]` viewer

File: `src/app/showcase/[slug]/page.tsx`

Special route: no locale prefix, uses service-role client to load showcase by slug where `status='published'`.

Layout (yagi-design-system skill loaded; editorial typography):
- Full-width cover (hero)
- Title + subtitle (Fraunces italic for subtitle)
- Narrative rendered from markdown
- Media grid (responsive: single column mobile, 2-col desktop for images; full-width for videos)
- Credits section at bottom
- "Made with YAGI Workshop" badge (if `made_with_yagi=true`) — bottom center, subtle but present, links to yagiworkshop.xyz/?ref=showcase-{slug}

Password gating: if `is_password_protected=true`, show password prompt before content. Use server action to verify; no client-side hash.

View counting: increment `view_count` on page load via an Edge Function call (fire-and-forget; failure doesn't affect page). Rate-limit to 1 increment per IP per 24h.

OG meta tags: title, description from narrative first sentence, image from `og_image_path` (public URL from `showcase-og` bucket).

robots.txt handling: `status='draft'` returns `x-robots-tag: noindex`; `status='published'` indexable.

### 05 — OG image generation

File: `src/app/api/showcases/[id]/og/route.ts` (server-side rendering endpoint)

Use `@vercel/og` or `next/og` to render a 1200×630 PNG:
- Background: dark (#0A0A0A)
- Showcase title in Migra or Fraunces italic, large
- Subtitle below in muted tone
- Small "YAGI WORKSHOP" wordmark top-right
- Cover thumbnail as subtle background image (with dark overlay)

Saved to `showcase-og/{showcase_id}.png`. Regenerated when title/subtitle/cover changes (check `og_image_regenerated_at` vs `updated_at`).

Acceptance: opening `/showcase/[slug]` in a Slack/Twitter preview debugger shows correct OG image.

### 06 — Landing integration

Extend Phase 1.6's landing page with a "Work" section.

- Query: `showcases WHERE status='published' ORDER BY published_at DESC LIMIT 12`
- Grid display with cover + title + optional client name
- Click → `/showcase/[slug]`
- "View all work" link → `/work` index page (similar grid, paginated)

Create `/work` index (`src/app/[locale]/work/page.tsx` — public, locale-aware).

### 07 — E2E runbook + summary

1. YAGI admin opens an approved Pre-production Board → "Create Showcase" → showcase editor opens with pre-populated media
2. YAGI writes narrative + credits, sets cover, sets client name to hidden
3. YAGI publishes → slug generated, OG image rendered, URL copied
4. Open `/showcase/[slug]` in incognito → see full viewer with YAGI badge
5. Client requests badge removal from their project page → YAGI admin approves → badge disappears on showcase page
6. Set password → incognito visit now prompts password → enter wrong → rejected → enter correct → content
7. Visit `/work` landing section → new showcase listed first
8. OG debug: use metatags.io to verify OG image on `/showcase/[slug]`

Final actions:
1. 🛑 Codex adversarial review (focus from `codex-review-protocol.md` Phase 1.9)
2. `pnpm build`
3. `summary-1-9.md`
4. Telegram: `✅ Phase 1.9 complete — Autopilot chain finished.`
5. No further Autopilot transition — Yagi manually decides next step (Phase 2.0+).

---

## Dependencies

```powershell
pnpm add @vercel/og slugify bcryptjs
```

🛑 KILL-SWITCH before install. `@vercel/og` for OG rendering; `slugify` for slug generation; `bcryptjs` for password hashing (if not already installed from earlier phase).

---

## Kill-switch triggers (5)

1. Before migration apply
2. Before `pnpm add @vercel/og slugify bcryptjs`
3. Before creating `showcase-media` and `showcase-og` buckets
4. Before first showcase publish (validate OG generation end-to-end with Yagi's verbal check)
5. Before final `pnpm build`
6. Before `/codex:adversarial-review`

---

## Success criteria

1. `pnpm build` clean
2. Migration clean
3. E2E all 8 scenarios pass
4. OG image renders correctly in Slack/Twitter preview
5. Password gating works; draft showcases are noindex; published showcases indexable
6. Landing "Work" section updates when a new showcase publishes
7. Badge removal workflow works (request → admin approve → page updates)
8. View count increments correctly (with 24h IP rate limit)
9. Codex review clean; no slug enumeration or XSS findings
10. RLS: non-yagi admin cannot insert/update showcases
11. `/showcase/[nonexistent]` returns 404 (not 500)

---

## Model routing

- Builder: Opus 4.7
- Orchestrator: Sonnet 4.7
- Executor 01 (i18n): Haiku 4.5
- Executor 02, 03 (migration + editor — complex form state): Sonnet 4.7
- Executor 04 (public viewer — brand-critical UX, loads frontend-design skill): Opus 4.7
- Executor 05 (OG image — edge rendering): Sonnet 4.7
- Executor 06 (landing integration): Sonnet 4.7
- Executor 07 (E2E): Sonnet 4.7
- Evaluator: Sonnet 4.7 fresh context

---

## Forbidden

- Letting a showcase publish with < 3 media items (thin portfolio looks unprofessional)
- Auto-filling `client_name_public` without explicit YAGI admin opt-in (client confidentiality)
- Removing the "Made with YAGI" badge without recording the approval row (`badge_removal_approved_at`, `badge_removal_approved_by`)
- Rendering `showcase_media.external_url` without URL sanitization / provider allowlist (XSS surface)
- Fetching showcase data from the public route without filtering `status='published'` (draft leak)
- Using a predictable slug scheme that enables enumeration (sequential IDs, incrementing numbers)
- Making the OG image bucket private (social previews won't load)
- Caching the OG image indefinitely — regenerate on showcase edit

---

## Notes for Yagi

- **Badge-free tier:** the `made_with_yagi=false` state is a **revenue lever** — premium clients can pay for badge-free showcases. Record the approval but don't mention pricing in product; that's a human sales conversation.
- **Slug strategy:** default slug from title (Hangul-to-latin via slugify with a Korean romanization library if needed, or manual override). First priority is **memorable URLs** — a shareable, typeable slug matters more than SEO keyword stuffing.
- **OG images are a visible quality signal.** When social platforms fetch them, people judge YAGI's brand. Don't ship this phase if OG rendering looks amateur — iterate until it looks editorial.
- **After 1.9 ships, Autopilot chain ends.** Manually decide what Phase 2.0 is based on what actually broke during 1.2–1.9. Don't plan 2.0 now.

**End of Phase 1.9 spec.**

**End of Autopilot chain. 🎉**
