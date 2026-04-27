# Subtask 01 — Project Conventions: CLAUDE.md + yagi-nextjs-conventions skill

**status:** pending
**assigned_to:** executor_haiku_45
**created:** 2026-04-21
**parallel_group:** A (serial — gate for everything after)
**spec source:** `.yagi-autobuild/phase-1-2-spec.md` §"Subtask Breakdown / 01"

---

## Executor preamble (READ FIRST, then execute)

You are an Executor for ONE task. Constraints:

1. Read ONLY this file. Do NOT read `task_plan.md`, `phase-1-2-spec.md`, or any other subtask file.
2. Use only the tools required for this subtask: Read (for verifying parent dirs exist), Write, Bash (only for `mkdir` / `ls` if needed).
3. If anything is unclear or you would need information not in this file, write `BLOCKED: <reason>` in `results/01_conventions.md` and stop.
4. Working directory: `C:\Users\yout4\yagi-studio\yagi-workshop` (Windows, bash shell available).
5. When done, write `.yagi-autobuild/results/01_conventions.md` with: files created (paths), byte sizes, and a 1-line acceptance check ("both files exist and are valid markdown — verified by re-reading").

## Task

Create exactly two files:

### File 1 — `/CLAUDE.md` (project root)

Auto-loaded by Claude Code when present. Write this **verbatim** (no edits, no additions):

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

### File 2 — `.claude/skills/yagi-nextjs-conventions/SKILL.md` (project-local skill)

Create the directory chain `.claude/skills/yagi-nextjs-conventions/` (relative to project root) if it does not already exist, then write the SKILL.md.

Frontmatter MUST be exactly:
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

Body must include the following sections with concrete code examples (concise but complete — aim for ~250–400 lines total):

1. **Load order** — `/CLAUDE.md` first, then this skill.
2. **Supabase access pattern** — Server example (`createSupabaseServer` from `@/lib/supabase/server` inside Server Component / Server Action) and Client example (`createSupabaseBrowser` from `@/lib/supabase/client` inside `"use client"` component). State explicitly: never instantiate `createClient` inline anywhere.
3. **Server Action template** — `"use server"`, Zod parse of input, `await createSupabaseServer()`, error returned as `{ error: string }`, success returns data; example with `revalidatePath` and/or `redirect`.
4. **RHF + Zod + shadcn form template** — `"use client"`, `useForm({ resolver: zodResolver(schema) })`, `useTranslations("namespace")`, `<Label>` + `<Input>` from `@/components/ui/*`, error rendering inline (`<p className="text-xs text-destructive">`), submit calls Server Action, on `res.error` → `toast.error`, on success → router.push or revalidate.
5. **i18n rules** — every string passes through `useTranslations` / `getTranslations`. Both `messages/ko.json` AND `messages/en.json` must always have the same keys. Korean tone: 존댓말, sentence case. English: editorial, sentence case except CTAs which are ALL CAPS with `tracking-[0.12em]`. Namespace list mirrors CLAUDE.md.
6. **Next.js 15 async props** — `params: Promise<{ locale: string; id?: string }>`, must `await params` inside the page. Same for `searchParams`.
7. **Error handling taxonomy** — inline validation errors (form), `toast.error(message)` for mutation failures, `notFound()` for 404, `throw new Error(...)` for dev/critical (logged then surfaced).
8. **Styling tokens (Phase 1.0.6)** — `bg-background` (white), `text-foreground` (black), `border-border`, pill CTAs use `rounded-full uppercase tracking-[0.12em]`, Fraunces italic via `font-serif italic`, keep-all utility `keep-all` for Korean text wrapping. Forbidden: any warm tone (no cognac, no bone, no amber background fills — accent gold is allowed only as a tiny inline emphasis if explicitly required, otherwise not on this surface).
9. **Anti-patterns to reject** — overusing `"use client"`, inline Supabase clients, hardcoded user-facing strings, fetching DB from Client Components, `any` types, `pnpm dlx shadcn@latest`, skipping Zod validation on Server Actions, mixing locales in one file.
10. **Self-improving footer** — "When Yagi says: 'update yagi-nextjs-conventions skill — [content]', edit this file directly and report the change in the response."

Write idiomatic markdown with code fences. Examples must compile against the existing project (paths `@/lib/supabase/server`, `@/lib/supabase/client`, `@/components/ui/*`, `@/i18n/routing`).

## Acceptance criteria

1. `/CLAUDE.md` exists at project root, content matches the verbatim block above (byte-for-byte except for trailing newline).
2. `.claude/skills/yagi-nextjs-conventions/SKILL.md` exists, has the exact frontmatter (name + description), and the body covers all 10 sections listed above with at least one code fence each (2, 3, 4, 6 require code; the rest may be prose).
3. Both files are valid UTF-8 markdown (no BOM).
4. No other files created or modified.

Result file format (`results/01_conventions.md`):

```markdown
# Subtask 01 result
status: complete
files_created:
  - /CLAUDE.md (NN bytes)
  - /.claude/skills/yagi-nextjs-conventions/SKILL.md (NN bytes)
acceptance: PASS — both files exist, frontmatter matches, all 10 SKILL sections present with code where required.
```

If anything blocks: `status: blocked` + `reason: <one line>`.
