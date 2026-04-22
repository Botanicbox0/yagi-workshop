# YAGI Workshop — Architecture Decision Log

> **Purpose:** Authoritative record of system-level decisions so future Phases (and future Builders) don't re-relitigate settled questions. Each decision has context, alternatives considered, and rationale. When a decision changes, we don't delete — we supersede and keep the history.
>
> **Audience:** Claude Code Builder/Orchestrator/Executor, future contributors, future Yagi.
>
> **Update rule:** New decisions get appended at the bottom of their section with `**Date:** YYYY-MM-DD` and `**Status:** active | superseded by #N`.

---

## 0. First Principles

The entire product is derived from three axioms. When in doubt, return here.

1. **The product is a private client portal, not a marketplace.** Every design choice optimizes for a small number of high-trust relationships (YAGI ↔ independent celebrity/artist clients), not for discovery or network effects.
2. **YAGI is the vendor. Clients are guests.** The data model puts YAGI on one side of the trust boundary and clients on the other. RLS policies enforce this at the database level, not at the application level.
3. **Ship boring. Let the product be weird.** The infrastructure is deliberately conventional (Next.js + Supabase + Resend). The weirdness lives in the creative output (AI-generated content, storyboards, branding), not in the platform.

---

## 1. Stack decisions (locked)

### 1.1 Runtime & framework

| Layer | Choice | Version | Rationale |
|---|---|---|---|
| Framework | Next.js App Router | 15.5.0 | RSC + Server Actions eliminate a whole class of state-sync bugs. App Router is now stable. |
| Language | TypeScript | strict | Every boundary (DB, forms, i18n) is typed. `any` is banned. |
| Runtime | Node.js via Vercel | — | Edge runtime avoided for DB-touching routes (node-postgres + RLS works better in Node). |
| Package manager | pnpm | — | Locked. npm/yarn commands in docs get rewritten. |
| Port (dev) | 3003 | — | 3000-3002 often collided with other local tools. Site URL env reflects this. |

### 1.2 Data layer

| Layer | Choice | Rationale |
|---|---|---|
| Database | Supabase Postgres | Managed Postgres + Auth + Storage + Realtime in one. RLS is the security backbone. |
| Auth | Supabase Auth (email+password) | Magic link was tried first; UX friction (inbox latency) outweighed the security gain for this user base. Password auth with email verification is the current choice. |
| Storage | Supabase Storage | Private buckets for project refs/deliverables, public for avatars/logos. |
| Realtime | Supabase Realtime | Used only for thread messaging. Do not over-subscribe — each subscription is a websocket connection. |
| SSR client pattern | `lib/supabase/server.ts` + `client.ts` | Inline client creation is banned — every call goes through these two modules. |

### 1.3 UI layer

| Layer | Choice | Rationale |
|---|---|---|
| Styling | Tailwind v3 | v4 was considered; migration cost not justified yet. |
| Components | shadcn@2.1.8 (locked) | `@latest` breaks. Components copied into `src/components/ui/`. |
| Forms | React Hook Form + Zod | Same Zod schema runs on client (validation) and server (Server Action). |
| Tables/Data | TanStack Query v5 | Used sparingly — prefer RSC + revalidation over client queries. |
| Icons | Lucide | One icon family, no exceptions. |
| Toasts | Sonner | Errors from mutations → toast; validation errors → inline. |
| Date | date-fns | No moment.js. |

### 1.4 Design tokens

Phase 1.0.6 design system. **Locked.**

- Background: `#FFFFFF` (light) / `#0A0A0A` (dark, future)
- Text: `#0A0A0A` / `#FAFAFA`
- Accent lime: `#C8FF8C` — used sparingly, only for brand/active states
- Type: Pretendard Variable (UI), Fraunces italic (editorial emphasis)
- Korean: `word-break: keep-all` everywhere
- **Banned:** warm tones (cognac, bone, beige), glassmorphism, blue gradients, spinner loaders

### 1.5 External services

| Service | Purpose | Phase introduced | Escape hatch |
|---|---|---|---|
| Supabase | DB + Auth + Storage + Realtime | 1.0 | None (core dependency) |
| Resend | Transactional email | 1.2 | Log warning + continue if `RESEND_API_KEY` missing |
| fal.ai | FLUX image generation | 1.4 | Storyboard editor works without generation (manual upload path must exist) |
| Google Calendar | Meeting scheduling | 1.3 | Manual meeting entry must remain functional |
| 팝빌 (Popbill) | 전자세금계산서 발행 | 1.5 | Draft invoice generation must work without live tax filing |
| Recall.ai | Auto meeting summaries | 2.0+ | Manual summary entry is the Phase 1.3 default |

---

## 2. Data model invariants

These invariants hold across all Phases. Migrations that would break them require a decision record here.

### 2.1 Tenancy model

- **`workspace`** is the tenancy boundary for client-side data.
- Every client-side table has either a direct `workspace_id` FK or reaches one via a parent FK (e.g., `thread_messages.thread_id → project_threads.project_id → projects.workspace_id`).
- **`yagi_admin`** is a global role that bypasses workspace scoping. Stored as `user_roles` row with `role='yagi_admin'` AND `workspace_id IS NULL`.
- RLS policies use three helper functions:
  - `is_yagi_admin()` — bypasses workspace checks
  - `is_ws_member(ws_id uuid)` — any role in workspace
  - `is_ws_admin(ws_id uuid)` — admin role in workspace

### 2.2 RLS policy style

- **Default deny.** No table ships without RLS enabled.
- **Use RESTRICTIVE for visibility-hiding rules.** The `thread_msgs_hide_internal_from_clients` policy demonstrates the pattern — an internal row must be impossible to SELECT for non-yagi users, even if another PERMISSIVE policy would allow it.
- **Server Actions use service role only for specific privileged operations.** Default is anon key with user JWT so RLS stays in effect.
- **Storage buckets mirror table-level policies.** Path-prefix constraints (`{user_id}/...`, `{workspace_id}/...`) are enforced in storage RLS, not just in application code.

### 2.3 ID and timestamp conventions

- All PKs are `uuid` (gen_random_uuid) unless there's a compelling reason.
- All tables have `created_at timestamptz default now()`.
- All mutable tables have `updated_at timestamptz default now()` + trigger.
- Soft deletes via `archived_at timestamptz null` where retention matters (projects, invoices). Hard deletes for ephemeral data (draft messages).

### 2.4 Status enums

Status fields are Postgres `text` with a `CHECK` constraint enumerating valid values. We don't use Postgres ENUM types because adding values requires a migration and we iterate on workflow states.

Current status fields:
- `projects.status` — draft | submitted | in_discovery | in_production | in_revision | delivered | approved | archived
- `invoices.status` — draft | issued | paid | void (Phase 1.5)
- `meetings.status` — scheduled | in_progress | completed | cancelled (Phase 1.3)

### 2.5 i18n in the data layer

- User-facing strings in the DB (e.g., error messages returned from RPC functions) are stored in English only. Translation happens in the UI layer via the `errors` i18n namespace mapping error codes.
- User-generated content (project titles, messages) is stored as-is. No forced language.
- `profiles.locale` is the user's preferred UI locale (`ko` | `en`).

---

## 3. Route architecture

### 3.1 URL structure

```
/                                  → redirect to /{detected-locale}
/[locale]                          → public landing (Phase 1.6)
/[locale]/journal                  → public MDX journal (Phase 1.6)
/[locale]/journal/[slug]           → journal article

/[locale]/(auth)/signin            → auth layout
/[locale]/(auth)/signup
/auth/callback                     → Supabase callback (no locale prefix — session-only)

/[locale]/onboarding/*             → 5-step onboarding (Phase 1.1)

/[locale]/app                      → authenticated app shell (Phase 1.1)
/[locale]/app/projects             → list (Phase 1.2)
/[locale]/app/projects/new
/[locale]/app/projects/[id]
/[locale]/app/meetings             → list (Phase 1.3)
/[locale]/app/meetings/[id]
/[locale]/app/storyboards          → list (Phase 1.4 — YAGI internal only)
/[locale]/app/storyboards/[id]
/[locale]/app/invoices             → list (Phase 1.5)
/[locale]/app/invoices/[id]
/[locale]/app/settings/*           → tabs (Phase 1.2)
/[locale]/app/admin/*              → yagi_admin only (Phase 1.2+)

/s/[storyboard_share_token]        → public storyboard share (no locale, no auth) (Phase 1.4)
```

### 3.2 Route group conventions

- `(auth)` route group used for signin/signup (shared layout, no `/auth` URL prefix).
- `/app` is a **literal folder**, not a route group. Phase 1.1 discovered that `(app)` collides with the public landing page at `/[locale]`.
- `/s/*` is outside the locale segment because public share links should be language-neutral (locale inferred from recipient's browser).

### 3.3 Middleware chain

Current: `next-intl` middleware → Supabase session refresh middleware.

Order matters. next-intl rewrites the request to add the locale prefix before Supabase reads cookies. Don't reorder without verifying both still work.

---

## 4. Server Action conventions

Every mutation goes through a Server Action. No client-side Supabase writes.

```typescript
// src/app/[locale]/app/projects/actions.ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { z } from "zod"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

const schema = z.object({ /* ... */ })

export async function createProject(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "validation", issues: parsed.error.flatten() }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "unauthorized" }

  const { data, error } = await supabase.from("projects").insert({ /* ... */ }).select().single()
  if (error) return { error: "db", message: error.message }

  revalidatePath(`/app/projects`)
  redirect(`/app/projects/${data.id}`)
}
```

Rules:
1. Always re-validate with Zod on the server, even if client validated first.
2. Always call `supabase.auth.getUser()` before privileged operations (don't trust session cookies alone).
3. Return discriminated error unions; never throw for expected errors.
4. `revalidatePath` before `redirect`.
5. Never import a Server Action into a Client Component — pass it as a prop or use a form action.

---

## 7. Operational notes

### 7.1 Environments

| Env | Supabase project | Site URL |
|---|---|---|
| Development | `jvamvbpxnztynsccvcmr` (ap-southeast-1) | http://localhost:3003 |
| Production | TBD (same region) | https://studio.yagiworkshop.xyz |

Staging env is deferred until Phase 1.5 — adds operational overhead not justified by a pre-revenue stage.

### 7.2 Secrets management

All secrets live in `.env.local` (dev) and Vercel env vars (prod). Never committed, never logged.

Required env vars by Phase:

| Phase | Var | Notes |
|---|---|---|
| 1.1 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Core |
| 1.1 | `NEXT_PUBLIC_SITE_URL` | For auth callback redirects |
| 1.2 | `RESEND_API_KEY`, `RESEND_FROM` | Email sending |
| 1.2 | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Builder kill-switches (dev only) |
| 1.3 | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN` | YAGI single-account OAuth (see §8.1) |
| 1.4 | `FAL_KEY` | fal.ai API |
| 1.5 | `POPBILL_LINK_ID`, `POPBILL_SECRET_KEY`, `POPBILL_CORP_NUM` | 전자세금계산서 |
| 2.0+ | `RECALL_API_KEY` | Meeting bot |

### 7.3 Logging

- `console.error` for system-level failures (external API down, RLS violation surfaced as error)
- `console.warn` for degraded-mode operation (missing env var, fallback engaged)
- No `console.log` in committed code (ESLint rule enforces)
- Production: Vercel log drains are sufficient until volume justifies a dedicated observability stack

### 7.4 Migrations

- Every migration is reversible or explicitly flagged as one-way (with comment).
- Migration filenames: `YYYYMMDDHHMMSS_snake_case_description.sql`.
- Apply via `supabase db push` OR Supabase MCP `apply_migration` (both write to `supabase_migrations.schema_migrations`).
- Never apply a migration from the UI — always from file so it's versioned.

---

## 8. Decision records (append-only)

### 8.1 Google Calendar — single-account OAuth instead of restricted scopes

**Date:** 2026-04-21
**Status:** active
**Context:** Phase 1.3 needs to create Google Calendar events with Meet links for meetings between YAGI and clients. The standard `calendar` OAuth scope is Google-classified as restricted, requiring a third-party security assessment (multi-week review) before production use.

**Decision:** Use a single YAGI-owned Google account authenticated once via OAuth (`calendar.events` scope), stored as a refresh token in env vars. All meetings are created as events owned by this account. Clients are added as `attendees[]` — they receive standard Google Calendar invites via email without needing to connect their own Google account.

**Alternatives considered:**
- **Standard per-user OAuth:** Requires security assessment. Deferred — not worth the review cost at this stage.
- **Google Workspace Service Account with Domain-Wide Delegation:** Requires Workspace admin and is designed for impersonating users within an organization. Overkill for a single-account scenario.
- **Pure `.ics` file attachment via Resend:** Works with zero external dependencies but loses the native calendar integration, Meet link quality, and automated reminders that Google handles. Kept as fallback (see §8.2).

**Consequences:**
- YAGI internal calendar becomes the source of truth for all client meetings (nice side effect — team visibility).
- The refresh token is a single point of failure. Document recovery procedure: re-run the one-time OAuth consent flow locally and update env var.
- Scope is narrow (`calendar.events` only) — we cannot read clients' calendars for availability. Acceptable; availability is coordinated manually.

**Implementation constraints:**
- OAuth consent flow runs once, locally, during initial setup. The refresh token is copied into `.env.local` and Vercel env vars.
- Token refresh is handled by the `google-auth-library` on each API call.
- `conferenceDataVersion=1` + `conferenceData.createRequest.conferenceSolutionKey.type = 'hangoutsMeet'` is required to auto-generate Meet links.

### 8.2 Google Calendar — `.ics` fallback path

**Date:** 2026-04-21
**Status:** active
**Context:** If the Google Calendar integration (§8.1) is unavailable (refresh token revoked, Google API outage, initial setup incomplete), meeting creation must still work.

**Decision:** Meeting creation always commits to our DB first. The Google Calendar side effect is attempted second. If it fails, we fall back to:
1. Generating an `.ics` file server-side from the meeting record
2. Attaching it to the Resend email sent to attendees
3. Storing the Meet link as `null` (user will see "Link will be sent separately")

**Consequences:**
- Meeting detail UI must handle `meeting.meet_link === null` gracefully.
- The `.ics` fallback loses auto-reminders and native cross-device sync, but preserves the "event shows up on client's calendar" property.
- Meeting record schema includes `calendar_sync_status: 'synced' | 'fallback_ics' | 'failed'` for observability.

### 8.3 Storyboards — YAGI-internal authoring, public share links for clients

**Date:** 2026-04-21
**Status:** active (supersedes earlier implicit design where clients could author storyboards)
**Context:** Early design assumed storyboards were a collaborative artifact. Clarification: YAGI is the creative vendor; storyboards are part of the deliverable, not a client input. Clients provide references (text + image + video) and YAGI produces storyboards.

**Decision:**
- Storyboard authoring UI is accessible only to users with `yagi_admin` OR `workspace_member` role **where the workspace is the YAGI internal workspace** (a specific workspace owned by the YAGI team).
- Clients never see a storyboard editor. They see published storyboards via a **public share link** (`/s/[share_token]`) that requires no authentication.
- Share links are revocable and optionally password-protected (Phase 1.4 ships without password, Phase 2+ adds it if needed).
- Clients on the share page can leave frame-level comments (identified by email, no account required).

**Consequences:**
- Storyboard table has `workspace_id` pointing to the YAGI internal workspace, plus a `project_id` FK pointing to the client's project (the latter is what couples a storyboard to a client relationship).
- RLS policies on `storyboards` are **restrictive** — only YAGI internal workspace members can SELECT via the authenticated path. The `/s/[token]` route uses the service role client with a token-based authorization check bypassing normal RLS.
- Client-visible "storyboard status" (draft / shared / approved) is visible on the project detail page in the client app, but the actual frames are only accessible via the share link.

**Alternatives considered:**
- **Client-authorable storyboards:** Rejected. Would require teaching clients a complex tool for work they're hiring YAGI to do.
- **Storyboards as a first-class client-visible app section:** Rejected. Adds nav clutter for a feature clients don't interact with in authoring mode.

### 8.4 References — images + URLs + videos + video URLs (Phase 1.2.5 expansion)

**Date:** 2026-04-21
**Status:** active
**Context:** Phase 1.2 ships references as images + external URLs (with OG parse for Instagram/Pinterest/etc.). Since storyboards are now fully YAGI-side (§8.3), the client's only authoring surface is the reference collector, and clients often work in video references (TikTok, YouTube, Reels, sample edits).

**Decision:** Extend references to support:
- Image file upload (Phase 1.2 — already planned)
- Image/page URL unfurl (Phase 1.2 — already planned)
- **Video file upload** (Phase 1.2.5 — new)
- **Video URL unfurl** with thumbnail + title extraction for YouTube, Vimeo, TikTok, Instagram Reels (Phase 1.2.5 — new)

Video uploads up to 500MB per file. MP4, MOV, WebM. Playback inline on the project detail page via HTML5 `<video>`. No transcoding pipeline in Phase 1.2.5 — we store whatever the client uploads.

**Consequences:**
- `project_references` table gains `media_type text check (media_type in ('image','video'))` and `duration_seconds int null` columns. Both nullable / with defaults so Phase 1.2 data stays valid.
- Supabase Storage `project-references` bucket already exists (Phase 1.1) — no new bucket. Path convention unchanged.
- `lib/og-unfurl.ts` extended with oEmbed detection for video platforms (see Phase 1.2.5 spec).
- Uploaded video files count against Supabase Storage quota — acceptable for MVP scale.

**Alternatives considered:**
- **Transcoding pipeline (ffmpeg worker):** Deferred. Premature optimization — HTML5 video plays MP4/WebM natively, MOV is iffy on some browsers but clients uploading MOV can be asked to upload MP4 instead via a small warning.
- **Streaming via Mux/Cloudflare Stream:** Deferred. External dep, extra cost, solving a problem we don't have yet.
- **Only video URLs, no uploads:** Rejected. Clients often have raw footage not on any platform.

---

## 9. What this document is NOT

- Not a changelog of code changes (`summary.md` per phase handles that).
- Not a product spec (phase `-spec.md` files handle that).
- Not a roadmap (`ROADMAP.md` handles that).

It's the "why" layer. Code + specs answer "how" and "what". This file answers "why this and not that".

### 8.5 Meeting summaries — AI-assisted structured drafting (Anthropic API)

**Date:** 2026-04-21
**Status:** active (supersedes the earlier "manual summary only" decision in §1.5 escape hatch table)
**Context:** Phase 1.3 originally specified manual summary entry by YAGI. Summaries are high-value but tedious — YAGI writes what was discussed, what's confirmed, what's pending. Anthropic API (already configured in `.env.local` as `ANTHROPIC_API_KEY`) can generate a structured draft from rough meeting notes, massively reducing write time while preserving human judgment.

**Decision:** Implement AI-assisted summaries as a **drafting layer** that ALWAYS requires YAGI review before being sent to client. Flow:
1. YAGI pastes rough meeting notes (or in Phase 2+ uploads a transcript) into a summary dialog
2. Server calls Anthropic API with a strict JSON schema (tool use / structured output) returning categorized items:
   - `confirmed`: items both parties agreed on
   - `tentative`: discussed but not finalized
   - `undecided`: items flagged as needing decision (often "next meeting")
   - `action_items`: `{ owner, description, due }` tuples
   - `notes`: remaining context
3. UI shows the draft in editable sections; YAGI can edit any field, re-generate, or discard
4. Only after explicit YAGI "Approve & send" does the summary email go out via Resend

**Alternatives considered:**
- **Free-form AI summary (unstructured text):** Rejected. Too easy for AI to confidently state something as "confirmed" that was only mentioned. The structured schema forces the AI to classify each claim's certainty level.
- **Auto-send AI summaries without review:** Strongly rejected. Calls AI hallucinations into YAGI's legal record with clients. Human-in-the-loop is non-negotiable.
- **Recall.ai transcript first, then summarize:** Phase 2.0 path. Phase 1.3 accepts rough notes as input because it's a lower-lift first version.

**Consequences:**
- All AI summary costs logged to `ai_usage_events` (schema from ARCHITECTURE §5.4, introduced in Phase 1.4 but created earlier in Phase 1.3 if needed)
- Model choice: `claude-sonnet-4-6` default (cheap enough, quality high for structured extraction). Opus option if Sonnet quality insufficient — YAGI can toggle per-summary.
- Prompt includes project context (brief, prior summaries, reference titles) to improve extraction accuracy — but NOT full reference contents (token cost, PII surface)
- Draft summaries stored as rows in `meeting_summary_drafts` table separate from the final `meetings.summary_md`. Drafts are kept for audit trail.
- Approved summary = `meetings.summary_md` populated + `summary_approved_at` timestamp + `summary_approved_by` user ref.

**Safety / quality rails:**
- **Schema-enforced output** via Anthropic tool use. If model returns malformed JSON, retry once with a reminder, then fall back to "write manually" path (no silent failures)
- **Confidence markers in UI**: each `tentative` and `undecided` item visually distinct (muted color + icon). YAGI sees at a glance what the AI was unsure about.
- **Never send unreviewed**: the "Send to client" button is disabled until `summary_approved_at` is set
- **Audit trail**: `meeting_summary_drafts` row stores both the raw YAGI input and the AI output, joined by meeting_id. This means we can retroactively audit any AI claim against what YAGI actually gave it.
- **Client-visible disclaimer (Korean + English)** in the summary email footer: "이 요약은 AI가 초안을 작성하고 YAGI 팀이 검토·확정한 내용입니다." / "This summary was drafted with AI assistance and reviewed by the YAGI team."


### 8.6 Dual-model review via Codex plugin for Claude Code

**Date:** 2026-04-21
**Status:** active
**Context:** B-O-E is entirely Claude-family (Opus Builder, Sonnet Orchestrator, Sonnet/Haiku Executors). Same-family reviewers share blind spots — Opus-written code reviewed by Sonnet frequently passes issues that a different model architecture would catch (particularly RLS visibility leaks, concurrency races, auth edge cases). `--dangerously-skip-permissions` + kill-switches provide human checkpoints but no automated code-quality gate.

**Decision:** Install the OpenAI Codex plugin for Claude Code (`openai/codex-plugin-cc`). Use Codex as a **read-only adversarial reviewer** only — Claude Code remains the sole builder. Runbook is `.yagi-autobuild/codex-review-protocol.md`.

**Alternatives considered:**
- **Multi-Anthropic model review (Opus reviewing Sonnet work):** Rejected. Same-family blind spots persist — Anthropic has confirmed empirically that same-family review catches less than cross-family.
- **Manual review only (Yagi reads all diffs):** Unsustainable at the Phase-per-day pace; also Yagi is not a full-time developer.
- **GitHub Copilot code review / Cursor review / other IDE-embedded reviewers:** Rejected. They lack the adversarial-review mode that actively tries to break the code, and they don't integrate with the B-O-E session context.
- **Enable Codex review gate (`--enable-review-gate`):** Rejected. Creates Claude↔Codex loops that drain usage limits (documented limitation in plugin README).

**Consequences:**
- Adds one step before each Phase's final build kill-switch: `/codex:adversarial-review --base main --background <phase-specific focus>`.
- Adds ~$0.50–$2 per Phase in Codex API costs. Trivial.
- Requires OpenAI API key or ChatGPT sub in addition to Anthropic setup.
- Requires a tailored adversarial prompt per Phase (stored in `codex-review-protocol.md`) — generic "find bugs" prompts are ~60% noise.
- A validation pattern filters Codex output before Builder acts on findings — prevents the ~50% fluff from becoming Executor work.

**Implementation constraints:**
- Codex is forbidden from writing code as a builder — `/codex:rescue` allowed only when Claude Code is stuck on a specific bug after 2 failed attempts.
- Kill-switches continue to gate human approval; Codex review is between the last Executor wave and the final `pnpm build`.
- If Codex is unavailable, Phase can still ship with a Telegram-logged warning. External dep outage must not block.

**Per-phase adversarial focus areas (authoritative list):**

| Phase | Focus surfaces |
|---|---|
| 1.2.5 | RLS visibility leaks on internal thread attachments; signed URL expiry; intake_mode Zod discriminated union bypass |
| 1.3 | Google refresh token failure modes; ICS fallback when Resend down; AI summary malformed JSON; meeting cancel race |
| 1.4 | Share token rotation; frame reaction upsert races; revision history consistency; public /s/ route RLS bypass |
| 1.5 | 팝빌 failure mid-issuance; KRW rounding; tax period edges; invoice issuance idempotency |
| 1.7 | Cross-workspace message leakage; realtime subscription ID leakage; team-channel storage path collisions |
| 1.8 | Digest cron idempotency; digest timezone; notification queue buildup; unsubscribe verification |
| 1.9 | Slug enumeration; OG image caching; password-gated showcase bypass; external_url XSS |

---

## 10. Autopilot & continuous Phase sequencing

**Date:** 2026-04-21
**Status:** active
**Context:** Through Phase 1.1, Yagi manually kicked off each Phase after the previous completed. Between-Phase idle time was 1–3 hours of Yagi needing to be present to paste the next kickoff prompt into Claude Code. For Phase 1.2 onward the queue is known (1.2 → 1.2.5 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7 → 1.8 → 1.9), specs are pre-written, and only the kill-switches require human input.

**Decision:** Implement Autopilot — after a Phase's "✅ complete" Telegram message, the Builder automatically reads the next Phase spec and kicks off B-O-E for it without waiting for Yagi. Kill-switches inside each Phase still require Telegram continue. Runbook is `.yagi-autobuild/AUTOPILOT.md`.

**Consequences:**
- Yagi does not need to be present during Phase transitions — can sleep / attend meetings / travel during a Phase chain run.
- Kill-switches are still the human gate — Yagi can abort any Phase mid-chain by replying `abort` to a kill-switch.
- Autopilot explicitly skipped for Phase 1.5 (팝빌 requires env vars + business verification) and 1.3 (Google OAuth requires env vars). These Phases pause at a pre-start kill-switch awaiting env setup.
- Phase dependency graph is validated at each transition — if prerequisites aren't met, the chain halts gracefully with a Telegram notice.

**Implementation constraints:**
- Autopilot is a **prompt template** plus a Phase-completion trigger inside the Builder — NOT a new cron / daemon / server process. Reduces operational surface to zero.
- Each Phase's "final actions" include running `/codex:adversarial-review --background` → waiting → filtering → writing summary → **then** reading the next Phase spec and transitioning.
- Autopilot can be disabled for a single Phase with a `--no-autopilot` flag in the kickoff prompt.

---

## 11. Fast Feedback Loop (Phase 1.4 core UX)

**Date:** 2026-04-21
**Status:** active (influences Phase 1.4 spec redesign — supersedes earlier fal.ai-centric Phase 1.4 design)
**Context:** Pre-production Board (formerly "Storyboards") is the main iteration surface between YAGI and client. Traditional agency feedback loops are email + attachment + reply chains, typically 2–3 days per round-trip. The premium product experience YAGI is building requires same-day feedback cycles to feel qualitatively different from incumbent agencies.

**Decision:** Frame-level reactions (👍 / 👎 / needs_change) + optional comment, with versioned revisions (v1 → v2 → …) that preserve the feedback trail. Client acts via `/s/[share_token]` without needing an account. YAGI sees reactions in realtime on the board editor.

**Key UX principles:**
- **One-tap reaction is sufficient feedback.** Clients often know "this isn't right" without knowing "what would be right" — refusing a feedback channel that doesn't require articulation loses 80% of useful signal.
- **A 👎 alone is valid.** No required justification. The signal is the reaction; the reason can come in the optional comment if the client has one.
- **v1 → v2 diff is explicit.** When YAGI uploads a new revision of a frame, the board shows side-by-side (or toggle) between the previous and new version. Clients don't have to ask "what changed."
- **Reactions are upsert per (frame, email).** Each client has one current reaction per frame; changing it updates rather than accumulates.

**Alternatives considered:**
- **Free-form comments only (no reactions):** Rejected. Forces clients to articulate when a one-tap signal would do. Loses signal from the subset of clients who dislike something but can't explain why.
- **5-star rating:** Rejected. Overly precise for binary "ship it / not yet" decisions.
- **Approve / reject at storyboard level only (not per-frame):** Rejected. Loses granularity — a storyboard often has 10 frames, 2 of which need work.

**Consequences:**
- `storyboard_frames` gains `revision` and `parent_frame_id` for versioning.
- New table `frame_reactions` with unique index on `(frame_id, reactor_email)` for upsert-per-email semantics.
- Public /s/ page renders a reaction bar per frame (pre-filled if the email cookie remembers a previous visit — no auth, just localStorage).
- Editor side shows a dashboard per frame: count of 👍, count of 👎, list of comments, revision history.

---

## 12. Notification strategy (email + in-app, carve out kakao for later)

**Date:** 2026-04-21
**Status:** active
**Context:** Product generates ~5–20 discrete events per project per week (new frame, new message, new milestone, invoice issued, meeting scheduled, feedback received). Without a strategy, this becomes notification spam → inbox fatigue → client disengagement. The Korean market default channel is KakaoTalk, but Kakao 알림톡 requires template approval + dealer agreement + per-message cost.

**Decision:** Email (via Resend, already configured) + in-app realtime badges (via Supabase Realtime, already configured). Events are classified by severity and delivered through matching channels with digest-based batching for medium/low severity.

**Severity × channel matrix:**

| Severity | Event examples | Email | In-app badge |
|---|---|---|---|
| High | meeting scheduled, summary sent, invoice issued, showcase public | immediate | yes |
| Medium | new frame uploaded (batch), revision completed, feedback received | digest (hourly) | yes |
| Low | new thread message, minor status update | digest (daily) | yes |

**Digest rules:**
- Max 1 email per recipient per hour for medium severity.
- Max 1 email per recipient per day for low severity (configurable time).
- Quiet hours: 22:00–08:00 local time (no email during these hours; queued to morning digest).
- Per-user preferences via `notification_preferences` table.

**Alternatives considered:**
- **KakaoTalk 알림톡 from Phase 1.8:** Rejected for now. Requires Kakao business channel verification (2–5 day审查), dealer (Solapi/비즈고/NHN) contract, per-template approval (2–3 days each), per-message fee (~5–10 KRW). Template approval overhead exceeds actual send volume while client count is single digits. Revisit at Phase 2.0+ when client count >10.
- **SMS (CoolSMS / NHN Cloud):** Rejected. Fee structure similar to 알림톡 without the Kakao UX benefit. Only meaningful for 2FA, which YAGI doesn't need yet.
- **Slack integration:** Rejected. Clients are independent celebrities/artists, not agencies — they don't live in Slack.
- **Push notifications (web push / PWA):** Deferred. Adds service worker complexity; email + in-app is enough for MVP.

**Consequences:**
- New tables `notification_preferences` and `notification_events` (schema in Phase 1.8 spec).
- Edge Function cron (Supabase) runs every 10 minutes to dispatch pending notifications based on severity rules.
- Email template system uses Resend + bilingual templates (ko/en) similar to Phase 1.3 meeting emails.
- Unsubscribe link in every digest email — single-click, sets `email_immediate=false` and `email_digest=false` for the user.

**Kakao 알림톡 (Phase 2.0+):**
- Gated on client count reaching 10+.
- Limited to 3 high-severity templates initially (meeting reminder, invoice issued, showcase public).
- Integrated via Solapi or 비즈고 — both provide TypeScript SDKs. No direct Kakao API.
- All templates pre-approved; product code cannot improvise message content at runtime.

---

## 13. Deliverable Showcase Mode (Phase 1.9)

**Date:** 2026-04-21
**Status:** active
**Context:** The private client portal has a discovery problem — it's deliberately invisible, which starves the acquisition funnel. Meanwhile, completed client projects are a natural portfolio asset that clients themselves often want to share. A client-facing "public showcase" doubles as YAGI's viral channel.

**Decision:** Each project can optionally become a public showcase with a shareable slug URL (`/showcase/[slug]`). Showcases are portfolio pages for the client featuring a cover visual, project narrative, and the deliverables. A "Made with YAGI Workshop" badge appears at the bottom by default; clients can request its removal (YAGI admin approval required).

**Why this is a viral loop, not just a portfolio feature:**
- Client wants to share their completed work → they post the showcase URL to their own socials / portfolio site.
- Every visitor sees the "Made with YAGI" badge + link to yagiworkshop.xyz.
- The badge is the acquisition funnel.
- Clients get professional portfolio pages they would have had to build separately — so the trade is real value, not dark pattern.

**Public page structure:**
- `/showcase/[slug]` — full viewer, no locale prefix (like `/s/` share links)
- Header: project title, client name (optional — hidden by default for IP-sensitive projects)
- Cover hero (image or video)
- Story narrative (markdown, rendered with YAGI editorial typography — Fraunces italic for pull quotes)
- Media grid (images, videos, embedded YouTube/Vimeo)
- Credits section (YAGI team members by role, client name if enabled)
- "Made with YAGI Workshop" badge bottom-center linking to yagiworkshop.xyz
- OG image auto-generated per showcase (first media item, or explicit cover)

**Controls:**
- Slug generated from project title (ko) or manual override. Unique constraint.
- Password gating optional (for in-progress previews before full public reveal).
- Draft / published states. Only published showcases are SEO-indexable; drafts noindex.
- Edit-after-publish preserves slug; timestamp tracks last-updated.

**Alternatives considered:**
- **Showcases as part of Phase 1.6 journal:** Rejected. Journal is YAGI-authored editorial; showcases are client-deliverable. Different data model, different edit flow.
- **Auto-publish every completed project:** Rejected. Some clients have confidentiality constraints; opt-in preserves trust.
- **No "Made with YAGI" badge (pure client portfolio):** Rejected. The badge is the entire strategic value — without it, showcases are a cost center with no return.

**Consequences:**
- New tables `showcases` and `showcase_media` (Phase 1.9 spec).
- Public route `/showcase/[slug]` in addition to the authenticated app.
- OG image generation via `next/og` + Vercel ImageResponse or a dedicated edge function.
- Badge removal workflow: client request → YAGI admin review → field toggle on `showcases.made_with_yagi`. Tracked separately from business logic to enable revenue negotiation around it (premium tier: badge-free).

**Integration with Phase 1.6 landing:**
- Phase 1.6 public landing has a "Work" section that lists published showcases.
- Showcases drive traffic to the landing, landing drives inbound leads back to `/signup` or contact form.
- This is the explicit acquisition loop: showcase visitor → landing → new client intake.

---
