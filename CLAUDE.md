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

## Database write protocol (non-negotiable)

Applies to any operation that writes to the linked Supabase project
(`supabase db push --linked`, `mcp apply_migration`, or manual SQL against
the live DB).

**Core principle:** Dual-model review (Claude Code + Codex K-05) is the
safety layer, not a manual kill-switch. Builder executes the full
migration lifecycle autonomously when Codex returns CLEAN. yagi
intervention is reserved for cases where the taxonomy in
`.yagi-autobuild/CODEX_TRIAGE.md` does not cleanly resolve the finding.

### 1. Codex K-05 adversarial review is mandatory before every prod DB write

Before the first `supabase db push --linked` or `mcp apply_migration`
call on any new migration/RPC/policy, Builder MUST:

- [ ] Run `/codex:adversarial-review --base main --background <prompt>`.
- [ ] Prompt follows `.yagi-autobuild/CODEX_PROMPT_TEMPLATE.md` format
      (Focus Areas by Gate Type + Already-deferred block mandatory).
- [ ] Triage every finding per `.yagi-autobuild/CODEX_TRIAGE.md`.

No exceptions. RLS/grants/SECURITY DEFINER changes are never small, and
Codex is the only systemic reviewer that is not Claude Code. Skipping
Codex is the single largest regression risk in this stack.

### 2. Composite review when main + hardening are unapplied

If main migration is local-only (not yet pushed to prod) and hardening
is being authored in response to prior Codex findings:

- Treat main + hardening as a single composite migration state.
- Run Codex K-05 once on the composite, not separately.
- Push all files together in one `supabase db push` batch. Migration
  chain stays linear, no revert needed.

This is G2's pattern. G1's `apply → hardening v1 apply → hardening v2
apply` three-stage chain was necessary because main was already in prod
when findings surfaced; don't default to that chain if you can avoid it.

### 3. Verdict → action (fully autonomous)

Builder decides apply/hold/escalate based on Codex verdict alone, per
CODEX_TRIAGE.md. Quick reference:

| Verdict | Action |
|---|---|
| **CLEAN** | Apply immediately. Then verify (§5). Then commit + push + Telegram. |
| **MEDIUM_ONLY**, all findings in {MED-A, MED-B} | Builder fixes or defers per category, re-runs Codex, applies on CLEAN. |
| **Any HIGH-A / MED-A / LOW-A** (auto-fixable) | Fix inline, re-run Codex. Max 2 auto-fix cycles. |
| **Any HIGH-B, HIGH-C, MED-C, LOW-C** (non-auto) | STOP + Telegram yagi with finding + proposed fix. |
| **Taxonomy mismatch** (finding doesn't fit any category) | STOP + Telegram yagi + web Claude. |
| **2nd consecutive auto-fix cycle fails** | STOP + Telegram yagi. The finding is structurally deeper than the pattern. |

yagi Telegram escalation is the exception path, not the default path.
The goal of this protocol is that Builder completes `migration authored
→ Codex → apply → verify → commit → push → Telegram summary` without
yagi intervention when the taxonomy resolves cleanly.

### 4. SPEC drift halt (separate from Codex)

If, while authoring a migration, Builder discovers that a field/table/
policy conflicts with an already-written downstream SPEC clause
(cross-gate or cross-phase), halt and escalate regardless of Codex
status. SPEC drift is not a Codex concern — it is a product/scope
concern. Amend SPEC first, then resume migration.

### 5. Post-apply verification

After successful apply:

- [ ] `mcp get_advisors(security)` — no new warnings
- [ ] `mcp get_advisors(performance)` — no regressions
- [ ] Smoke-test new RPCs via a live query (at minimum: auth NULL path,
      happy path, primary error path)
- [ ] Commit migration file(s) + any related app-layer changes
- [ ] Push to origin/main
- [ ] Telegram yagi with verdict summary, apply ID, deferred FU numbers

Deferred findings (MED-B, LOW-C) get appended to the phase's
`FOLLOWUPS.md` with `Trigger / Risk / Action / Owner / Status / Registered`
fields before Telegram dispatch.

### 6. yagi-initiated halt

yagi retains the ability to halt the chain at any point via Telegram
`abort` or `hold`. This is always respected. If received during an
in-flight Codex review, Builder finishes Codex (cheap to complete) but
does not apply. If received post-apply, Builder does not revert
automatically — yagi decides revert vs forward-fix.

Supporting docs: `.yagi-autobuild/CODEX_TRIAGE.md`,
`.yagi-autobuild/CODEX_PROMPT_TEMPLATE.md`,
`.yagi-autobuild/codex-review-protocol.md`,
`.yagi-autobuild/GATE_AUTOPILOT.md`.

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
- **POPBILL mode resolution:** `POPBILL_MODE` env var has three values (`mock`/`test`/`production`). Default in `src/lib/popbill/client.ts:5` is `"test"` (NOT mock — a missing env var lands in test). Real popbill SDK call in `issueTaxInvoice()` (client.ts:97-106) is currently NOT_IMPLEMENTED for test+production — only the mock path works end-to-end. Full flip procedure (mock → test → production) lives in `.yagi-autobuild/phase-2-0/POPBILL_LIVE_FLIP.md`. Test ↔ production is two separate 팝빌 accounts with NO data migration; never mirror production credentials to `.env.local`.
- **Cross-phase contracts:** see `.yagi-autobuild/contracts.md` for the per-phase table of published tables / RPCs / notification events / storage buckets / realtime publication members, plus cross-phase dependencies. Update this doc on EVERY new table, RPC, notification event, storage bucket, or realtime add — same PR.
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
