# AGENTS.md — src/ (application code)

> Scoped rules for `src/`. Inherits top-level `AGENTS.md`. On conflict, `CLAUDE.md` wins.

## Stack & structure
- Next.js 15.5 App Router + TypeScript (strict). React Server Components by default.
- `"use client"` ONLY for interaction / state / browser APIs.
- Route structure: `/[locale]/app/*` for authenticated client pages (NOT route group `(app)`).
- All page props are async in Next 15 (`params: Promise<{...}>`).

## Naming
- Files: **kebab-case** (`workspace-switcher.tsx`).
- Components: **PascalCase**.
- Server Actions live in `src/app/**/actions.ts`. Shared types in `src/types/*.ts`. `cn` etc. in `src/lib/utils.ts`.
- shadcn components go to `src/components/ui/` (add via `pnpm dlx shadcn@2.1.8 add <c>` — NEVER `@latest`).

## Design tokens — NO hardcoded literals
v1.2 토큰만 사용. 절대 hex/`text-black`/`bg-white` 직접 X. 토큰 경유:
- bg `var(--ds-bg-base)` · surface `var(--ds-surface)` · ink `var(--ds-ink-primary)` · muted `var(--ds-ink-tertiary)`/`--ds-ink-muted` · border `var(--ds-border)`
- brand red `var(--ds-red)` → Tailwind `bg-brand` / `text-brand-on` (on-fill) / `bg-brand-soft` / `text-brand` (`--ds-red-ink`)
- gold `var(--ds-gold)` → Tailwind `bg-gold` / `text-gold-on`
- Tailwind semantic state colors (`amber-500`/`red-500`/`green-500`, `destructive`) are preserved — NOT brand colors.
- v1.1 잔재 (`#9A361F`/`#F3D174`/`#FBEAE6`, warm-ivory) 발견 시 v1.2 토큰으로 정정.

## Supabase access
- ONLY through `src/lib/supabase/server.ts` (RSC/Server Actions) or `src/lib/supabase/client.ts` (Client Components). Never inline clients.
- DB mutations via **Server Actions**, not client-side fetch.
- `src/lib/supabase/database.types.ts` is auto-generated — don't edit.

## Server Action pattern
- Validate input with **Zod**; return a **structured error map** (field → message), not throws for user errors.
- Forms: React Hook Form + Zod. Validation errors inline; mutation errors as **Sonner toast**.
- dev/critical errors: `console.error` + thrown `Error`.

## i18n (locale-free routes per §AP/§AD)
- Every user-facing string in `messages/ko.json` + `en.json`. Never hardcode strings.
- Namespaces: home, brand, common, auth, onboarding, nav, dashboard, projects, settings, refs, threads, admin.
- next-intl. Korean = `keep-all` word-break.

## Roles & RLS
- Use `user_roles` table. Helpers: `is_yagi_admin`, `is_ws_member`, `is_ws_admin`.
- Write RLS policies assuming malicious users; test each with an anon query.

## Verify after change
- `pnpm lint` + `pnpm tsc --noEmit`. UI/route/component touch → Playwright smoke (375px + 1280px, console errors 0).
