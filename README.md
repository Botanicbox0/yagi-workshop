# YAGI Workshop

> AI Native Entertainment Studio — private client portal for YAGI Workshop.

## What this is

Private B2B portal for YAGI Workshop's client engagements. Covers intake, project management, meetings with auto-calendar integration, pre-production boards with fast feedback loops, Korean e-tax invoicing (전자세금계산서), internal team chat, notifications, and a public deliverable showcase mode.

**Not a public marketplace.** Access is invite-only for existing and prospective clients.

## Stack

- Next.js 14 (App Router) · TypeScript · Tailwind · shadcn/ui
- Supabase (Postgres + Auth + Storage + Edge Functions + Realtime)
- Resend (email) · Google Calendar API · Popbill (전자세금계산서)
- Vercel (deploy) · Cloudflare R2 (media)
- `next-intl` for Korean/English

## Quick start

```powershell
# 1. Install
pnpm install

# 2. Copy env template and fill in values
cp .env.local.example .env.local
# Then edit .env.local with your credentials

# 3. Run dev server (port 3003)
pnpm dev
```

See `.env.local.example` for required environment variables. Phase-specific setup docs in `docs/`.

## Architecture

Append-only decision log: [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Build methodology

This project is built with a Builder-Orchestrator-Executor (B-O-E) multi-agent Claude Code setup running in autopilot phases. Phase specs and handoff docs live in `.yagi-autobuild/`:

- `ROADMAP.md` — phase sequence
- `AUTOPILOT.md` — chain execution protocol
- `phase-1-*-spec.md` — per-phase build specs
- `summary-phase-*.md` — completion summaries
- `codex-review-protocol.md` — dual-model adversarial review

Dual-model review (Claude Opus Builder + OpenAI Codex `gpt-5.4` adversarial) runs at each phase K-05 checkpoint.

## Phases shipped

- ✅ 1.0 / 1.0.6 / 1.1 — Foundations, auth, workspace model
- ✅ 1.2 / 1.2.5 — Projects, threads, attachments (video/PDF/intake)
- ✅ 1.3 — Meetings (Google Calendar + .ics fallback + summary email)
- ✅ 1.4 — Pre-production Board with fast feedback loop
- ✅ 1.5 — Invoicing (mock mode pending Popbill approval)
- ✅ 1.6 — Public landing + Journal
- ✅ 1.7 — Internal team chat
- ✅ 1.8 — Notifications (email digest + in-app badges)
- ✅ 1.9 — Deliverable Showcase Mode (viral loop)

## Design principles

- **First principles** — each phase opens with explicit Non-goals
- **Escape hatches** — every external API has a fallback (`.ics` for Calendar, mock mode for Popbill)
- **Boring stack** — new libraries minimized
- **Schema-first** — DB model is the skeleton
- **Cost-aware** — `ai_usage_events` tracks spend
- **Failure isolation** — main mutations first, side effects second
- **No magic** — decisions logged append-only in `ARCHITECTURE.md`
- **Dual-model review** — single-family review breeds false confidence

## License

Proprietary. © YAGI Workshop Co., Ltd.
