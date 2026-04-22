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
