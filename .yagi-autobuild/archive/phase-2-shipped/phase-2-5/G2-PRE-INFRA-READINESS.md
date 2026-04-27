# G2 Pre-Infrastructure Readiness Report

Side session 3 work output, pre-yagi G2 entry. Documents what's ready
across two side sessions (#2 + #3), what changed from G2 Decision Package
v1 §G file inventory, and what Builder must still do at G2 entry time.

## Ready (web Claude / side #2 + #3 pre-built)

### Handles validation layer (side #2)
- `src/lib/handles/reserved.ts` — RESERVED_HANDLES const + isReservedHandle
- `src/lib/handles/validate.ts` — HANDLE_REGEX + validateHandle + types
- `src/lib/handles/instagram.ts` — validateInstagramHandle
- `src/lib/handles/change.ts` — canChangeHandle + 90-day lock
- `src/lib/handles/messages.ts` — Korean error messages (handle + IG)
- `src/lib/handles/index.ts` — barrel export

### Onboarding flow utilities (side #3)
- `src/lib/onboarding/role-redirects.ts` — resolveOnboardingRedirect + types
- `src/lib/onboarding/index.ts` — barrel export

Note: pre-existing `src/lib/onboarding/actions.ts` + `state.ts` (Phase 1.1
legacy onboarding) untouched. `role-redirects.ts` is additive; no conflict
at G2 adoption. G2 Builder may deprecate/migrate `actions.ts` per §G
"Modified files (existing)" line on `onboarding/profile/page.tsx`.

### Email templates (side #3)
- `src/lib/email/templates/signup-welcome.ts` — welcomeEmailSubject + Body, 3 roles
- `src/lib/email/templates/role-confirmation.ts` — roleConfirmationSubject + Body
- `src/lib/email/templates/index.ts` — barrel export

Structure note: existing `src/lib/email/*` uses flat file pattern
(`meeting-template.ts`, `new-message.ts`, `send-meeting.ts`). New G2
templates were placed in a `templates/` subdirectory to visually group
Phase 2.5 persona-centric emails. Dispatch layer (Resend) is unchanged;
templates return plain strings consumable by any sender.

### G3 status display layer (side #2)
- `src/lib/ui/status-pill.ts` — submission kind 추가
- `src/lib/ui/status-labels.ts` — Korean labels for all kinds
- `src/components/challenges/markdown-renderer.tsx` — react-markdown wrapper
- `package.json` — react-markdown + rehype-sanitize 추가됨

### Decision Package amendments (side #3)
- DECISION-PACKAGE-AUDIT MED #1 (workspace-skip semantic) — G2 DP §A 추가됨
- DECISION-PACKAGE-AUDIT LOW #2 (settings/profile-form.tsx) — G2 DP §G 추가됨
- DECISION-PACKAGE-AUDIT LOW #3 (Phase 1.1 onboarding/profile/page.tsx) — G2 DP §G 추가됨
- DECISION-PACKAGE-AUDIT COSMETIC #9 (㎚ typo) — Phase 2.6 SPEC fixed

### ADR finalized
- ADR-009 (Role type system reconciliation) — `docs/design/DECISIONS.md`
  appended + Index table entry added.

### SPEC enhancement
- Phase 2.5 SPEC v2 §3 G2 — task breakdown table 추가, Decision Package +
  pre-built infra cross-ref

## What G2 Builder still does at entry

1. Read G2 Decision Package + this readiness report
2. Adopt §A ADR-009 (codemod ~10-15 sites for `ctx.roles` → `ctx.workspaceRoles`)
   - `src/lib/app/context.ts` currently still exports `type Role` union and
     `roles` field. No rename yet (side #3 kept this outside scope per
     the lock-conflict-avoidance rule: `src/lib/app/*` is Builder turf at G2 entry).
3. Build pages:
   - `src/app/[locale]/onboarding/role/page.tsx`
   - `src/app/[locale]/onboarding/profile/creator/page.tsx`
   - `src/app/[locale]/onboarding/profile/studio/page.tsx`
   - `src/app/[locale]/onboarding/profile/observer/page.tsx`
4. Build API routes:
   - `src/app/api/onboarding/role/route.ts`
   - `src/app/api/onboarding/profile/route.ts`
5. Update existing:
   - `src/app/[locale]/app/settings/profile-form.tsx` — handle validation unification
   - `src/app/[locale]/onboarding/profile/page.tsx` — redirect to /onboarding/role
6. Migration: `handle_history` table per G2 DP §E (new migration file)
7. Wire welcome email at signup callback / role-confirmation at role change.
   - Once ADR-009 applied, remove the TODO + inline `ProfileRole` type
     in `src/lib/onboarding/role-redirects.ts` and
     `src/lib/email/templates/role-confirmation.ts`, import from
     `@/lib/app/context` instead.
8. Tsc + e2e smoke + commit

ETA reduced from SPEC's 3-4h to **estimated 2-2.5h** with pre-built infra.

## Verifications (sides #2 + #3)

- tsc --noEmit: clean (side #3 verified 2026-04-23)
- ESLint: clean on new side #3 files
- Existing src/lib/* regression: 0 (side #3 added directories only; no
  edits to existing files outside `.yagi-autobuild/` and `docs/design/`)
- New deps in package.json: react-markdown, rehype-sanitize (side #2)
- G2 DP file size grew ~+1.5KB (3 amendments)
- Phase 2.6 SPEC: typo fixed, file otherwise unchanged
- ADR-009 added to docs/design/DECISIONS.md (~120 lines appended) +
  Index table updated

## Not addressed (Builder picks up at G2 entry)

- Tailwind Typography plugin install (if MarkdownRenderer prose mode chosen) — see G3 readiness report
- Test data SQL run (G3 DP §I)
- Vitest setup (deferred — not needed for Phase 2.5 launch)
- handle_history table migration (G2 entry — straightforward ALTER + new table)
- `src/lib/app/context.ts` ADR-009 rename (Builder turf — side #3 did not
  touch to avoid cross-session lock conflict)

## Cross-session disjoint verification

Side #3 did NOT read or write:
- `src/lib/ui/status-pill.ts` (side #2 M)
- `src/lib/ui/status-labels.ts` (side #2 ??)
- `src/components/challenges/*` (side #2 ??)
- `src/lib/handles/*` (side #2 ??)
- `package.json` / `pnpm-lock.yaml` (side #2 M)
- `supabase/*`, `src/database.types.ts`, `src/app/*` (Builder turf / main track)

`git status --short` at side #3 session end will show only additive diffs
in: `.yagi-autobuild/phase-2-5/`, `.yagi-autobuild/phase-2-6/SPEC.md`,
`docs/design/DECISIONS.md`, `src/lib/onboarding/` (new files only),
`src/lib/email/templates/` (new dir).
