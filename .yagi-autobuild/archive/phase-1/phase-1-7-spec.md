# YAGI Workshop — Phase 1.7 Autonomous Build (B-O-E)

> **Scope:** YAGI internal team chat — Slack-like channels that are project-independent, visible only to YAGI internal workspace members. Clients never see them.
> **Prereq:** Phase 1.2 complete (reuses thread message + attachment infra). Phase 1.6 complete (public landing doesn't block this but logical order is after).
> **Estimated duration:** 2–3 hours.
> **Design decision:** Yagi requirement that YAGI team needs private channels independent of projects (project threads from 1.2 are scoped to a single project).

---

## Your Identity

Builder per `yagi-agent-design`. Load `/CLAUDE.md`, `/ARCHITECTURE.md`.

Session: `--dangerously-skip-permissions`. Kill-switches below.

---

## Goal

By the end of Phase 1.7:

1. YAGI admin / workspace member-of-YAGI-internal can create team channels (e.g., `#general`, `#ideas`, `#biz`).
2. Members can post messages with text + file/image attachments (reuses Phase 1.2.5 attachment infra).
3. Realtime updates via Supabase Realtime.
4. Channel visibility: only YAGI internal workspace members. Clients NEVER see channels, nor are even notified these exist.
5. Per-channel settings: topic, archive, member list.
6. No threading in 1.7 (flat message list; threads deferred to 2.0+ if needed).
7. No DMs in 1.7 (use channels; DMs deferred).

**Non-goals (explicit):**
- No threading / reply chains (flat messages).
- No DMs.
- No reactions (emoji). Defer to 2.0+.
- No mentions / @notifications inside messages (defer).
- No Slack integration or import.
- No external guest access to channels.

---

## Data model

Migration: `YYYYMMDDHHMMSS_phase_1_7_team_channels.sql`

```sql
create table team_channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  -- workspace_id MUST be the YAGI internal workspace. Enforced at app layer + trigger below.
  name text not null check (length(name) between 1 and 50),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'),
  topic text check (length(topic) <= 200),
  is_archived boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

create index idx_team_channels_workspace on team_channels(workspace_id);

create table team_channel_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references team_channels(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null check (length(body) between 1 and 5000),
  edited_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_team_channel_messages_channel on team_channel_messages(channel_id, created_at desc);

-- Reuses Phase 1.2.5 attachment pattern but scoped to team channels
create table team_channel_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references team_channel_messages(id) on delete cascade,
  kind text not null check (kind in ('image','video','pdf','file')),
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  thumbnail_path text,
  created_at timestamptz not null default now()
);

create index idx_tc_attachments_message on team_channel_message_attachments(message_id);

-- RLS: strictly YAGI internal workspace members
alter table team_channels enable row level security;
alter table team_channel_messages enable row level security;
alter table team_channel_message_attachments enable row level security;

-- Helper: check if this is the YAGI internal workspace (via workspaces.handle = 'yagi-internal')
create or replace function is_yagi_internal_ws(ws_id uuid) returns boolean
language sql stable security definer as $$
  select exists (select 1 from workspaces where id = ws_id and handle = 'yagi-internal')
$$;

create policy team_channels_select on team_channels for select using (
  is_yagi_internal_ws(workspace_id) and (is_ws_member(workspace_id) or is_yagi_admin())
);

create policy team_channels_insert on team_channels for insert with check (
  is_yagi_internal_ws(workspace_id) and (is_ws_admin(workspace_id) or is_yagi_admin())
);

create policy team_channels_update on team_channels for update using (
  is_yagi_internal_ws(workspace_id) and (is_ws_admin(workspace_id) or is_yagi_admin())
);

create policy team_channel_messages_select on team_channel_messages for select using (
  exists (select 1 from team_channels c where c.id = channel_id
          and is_yagi_internal_ws(c.workspace_id)
          and (is_ws_member(c.workspace_id) or is_yagi_admin()))
);

create policy team_channel_messages_insert on team_channel_messages for insert with check (
  author_id = auth.uid() and
  exists (select 1 from team_channels c where c.id = channel_id
          and is_yagi_internal_ws(c.workspace_id)
          and is_ws_member(c.workspace_id))
);

create policy team_channel_messages_update on team_channel_messages for update using (
  author_id = auth.uid()
);

create policy tc_attachments_select on team_channel_message_attachments for select using (
  exists (select 1 from team_channel_messages m
          join team_channels c on c.id = m.channel_id
          where m.id = message_id
          and is_yagi_internal_ws(c.workspace_id)
          and (is_ws_member(c.workspace_id) or is_yagi_admin()))
);

create policy tc_attachments_insert on team_channel_message_attachments for insert with check (
  exists (select 1 from team_channel_messages m
          where m.id = message_id
          and m.author_id = auth.uid())
);

-- Storage bucket
insert into storage.buckets (id, name, public) values ('team-channel-attachments', 'team-channel-attachments', false)
  on conflict (id) do nothing;

-- Storage RLS: YAGI internal workspace members only; path convention {workspace_id}/{channel_id}/{message_id}/{uuid}__{filename}
create policy "tc-attachments read" on storage.objects for select
  to authenticated using (
    bucket_id = 'team-channel-attachments' and
    is_yagi_internal_ws((storage.foldername(name))[1]::uuid) and
    is_ws_member((storage.foldername(name))[1]::uuid)
  );

create policy "tc-attachments write" on storage.objects for insert
  to authenticated with check (
    bucket_id = 'team-channel-attachments' and
    is_yagi_internal_ws((storage.foldername(name))[1]::uuid) and
    is_ws_member((storage.foldername(name))[1]::uuid)
  );
```

Regenerate types after apply.

### Seed data

Migration should also INSERT 3 starter channels for the YAGI internal workspace: `#general`, `#ideas`, `#biz` (Korean names: 일반 / 아이디어 / 비즈니스 — store Korean name in `name`, latin-only in `slug`).

---

## Subtasks (5)

### 01 — i18n: `team_chat` namespace

Add `team_chat` keys for channel list, message composer, attachment UI, member list. Korean 존댓말 for internal UI. Both ko/en.

### 02 — Migration + seed channels

🛑 **KILL-SWITCH before apply.** Full SQL posted to Telegram.

Verify: YAGI internal workspace row exists (lookup by handle). If not, migration INSERTs it with Yagi as admin. Then INSERT 3 starter channels.

Acceptance: 3 channels visible to yagi user; non-YAGI-internal users cannot see them via RLS.

### 03 — Channel list + channel view UI

Files:
- `src/app/[locale]/app/team/page.tsx` — redirect to `/app/team/general`
- `src/app/[locale]/app/team/[slug]/page.tsx` — channel view (Server Component shell)
- `src/components/team/channel-sidebar.tsx` — left rail with channel list (Client, subscribes to Realtime for unread badges)
- `src/components/team/channel-view.tsx` — main message list + composer (Client)

Layout: Slack-like 2-column. Sidebar (channels list) + main (current channel messages + composer at bottom).

Access control: if user is not YAGI internal workspace member, entire `/app/team/*` route returns 404.

### 04 — Message composer + attachment reuse

File: `src/components/team/message-composer.tsx`

Reuses Phase 1.2.5's attachment upload helper (from `src/lib/threads/attachments.ts` if it was generalized in 1.2.5; if not, create `src/lib/team-channels/attachments.ts` with the same signed-URL pattern).

- Text input (max 5000 chars)
- Plus icon → file picker (image/video/pdf/file, same caps as 1.2.5: image 10MB, video 500MB, pdf 25MB, file 50MB)
- Multi-attach up to 5 per message
- Drag-drop onto composer area
- Send blocked while attachments uploading

### 05 — Realtime + admin channel settings + E2E

- Realtime subscribe on channel view mount; unsubscribe on unmount
- Sidebar shows unread indicator (last-seen timestamp per user stored in `profiles.team_chat_last_seen jsonb`)
- Admin dialog: edit channel name/topic, archive channel
- Member list dialog: shows current YAGI internal workspace members

E2E runbook covers: create new channel → post message with image attachment → post message from another YAGI user → realtime update → archive a channel → it disappears from sidebar.

Final actions:
1. 🛑 Codex adversarial review (focus from `codex-review-protocol.md` Phase 1.7 section)
2. `pnpm build` (🛑 kill-switch)
3. Write `summary-1-7.md`
4. Telegram: `✅ Phase 1.7 complete`
5. Autopilot: read `phase-1-8-spec.md`, check no env prereqs, kick off B-O-E for 1.8

---

## Dependencies

No new packages. Reuses Phase 1.2.5 attachment infra and Supabase Realtime.

---

## Kill-switch triggers (4)

1. Before migration apply (SQL to Telegram)
2. Before creating `team-channel-attachments` storage bucket
3. Before `/codex:adversarial-review`
4. Before final `pnpm build`

---

## Success criteria

1. `pnpm build` clean
2. Migration clean, 3 seed channels visible
3. E2E: YAGI user A posts message with image → YAGI user B sees within 5 seconds via Realtime
4. Non-YAGI user gets 404 on `/app/team/*` and `/rest/v1/team_channels` returns 0
5. Archived channel disappears from sidebar
6. Attachments upload and render correctly
7. Codex review clean; no cross-workspace leakage findings

---

## Model routing

- Builder: Opus 4.7
- Orchestrator: Sonnet 4.7
- Executor 01, 02 (config/migration): Haiku 4.5
- Executor 03, 04, 05 (UI + realtime): Sonnet 4.7
- Evaluator: Sonnet 4.7 fresh context

---

## Forbidden

- Allowing non-YAGI-internal-workspace users to SELECT any `team_*` row.
- DMs or 1-to-1 private channels (deferred).
- Message threading/reply chains (deferred).
- Posting to team channels from API keys / webhooks (only authenticated YAGI users).
- Storing channel messages in the same bucket as project references — different RLS, different path prefix.

---

## Notes for Yagi

- After Phase 1.7 ships, you'll want to invite 남다나 as a YAGI internal workspace member (if not already). Do this via the existing workspace invite flow from Phase 1.2.
- If you later want Slack import or DMs, those are Phase 2.0+ — don't retrofit here.

**End of Phase 1.7 spec.**
