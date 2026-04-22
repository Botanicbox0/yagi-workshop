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
- Pre-commit secret scanner: `.husky/pre-commit` scans staged diffs for known credential patterns (Google OAuth client secret prefix, Resend key prefix, Anthropic API key prefix, JWT base64 header, specific leaked Telegram bot/chat ids). It rejects commits that match. Add new patterns by editing that file (the exact regex is inline there). Self/spec docs are excluded via `:(exclude)` pathspecs so pattern documentation does not false-positive. Do NOT bypass with `--no-verify` — redact to a placeholder and re-stage.
- New phase specs MUST start from `.yagi-autobuild/spec-template.md` (includes mandatory "Secret hygiene" header).
- Cross-phase env info lives in `.env.local.example` (placeholders + inline comments) and `.yagi-autobuild/HANDOFF.md` (current ops state). Real secret values only in `.env.local` (gitignored) or Supabase Vault.
- **Migration list cosmetic mismatch (Phase 2.0+):** `supabase migration list --linked` will show 23 historical entries marked "missing locally" (the pre-Phase-2.0 migrations that were archived to `.yagi-autobuild/archive/migrations-pre-2-0/`). The single `supabase/migrations/20260422120000_phase_2_0_baseline.sql` is the canonical fresh-clone reproducer; the 23 historical entries are inert forensic records preserved in remote `supabase_migrations.schema_migrations`. This is intentional per Phase 2.0 Option C (Free plan, no branching, truncate too risky). Do NOT attempt to "fix" the mismatch by truncating remote `schema_migrations` — that path was explicitly rejected. Baseline limitations + Phase 2.1+ re-dump checklist in `.yagi-autobuild/phase-2-0/BASELINE_LIMITATIONS.md`.

## What's built (as of 2026-04-21)
- Phase 1.0: bootstrap
- Phase 1.0.6: design system (white/black)
- Phase 1.1: auth + workspace/brand model + onboarding + app shell
- Phase 1.2: projects, references, threads, messaging, settings (IN PROGRESS)

## What's NOT yet built
- Meetings (Phase 1.3)
- Storyboards (Phase 1.4)
- Invoicing (Phase 1.5)
