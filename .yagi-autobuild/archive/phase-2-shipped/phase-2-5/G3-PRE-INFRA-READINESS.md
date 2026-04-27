# G3 Pre-Infrastructure Readiness Report

Side session 2 work output, pre-yagi G3 entry. Documents what's ready,
what changed from G3 Decision Package v2 §G file inventory, and what
Builder must still do at G3 entry time.

**Authored:** 2026-04-23, web Claude side session #2.
**Status:** draft — 야기 review pending.

## Ready (web Claude / side #2 pre-built)

### Handles validation layer (G2 prep but stable)
- `src/lib/handles/reserved.ts` (+ 5 sibling files = 6 total)
- `src/lib/handles/validate.ts`
- `src/lib/handles/instagram.ts`
- `src/lib/handles/change.ts`
- `src/lib/handles/messages.ts`
- `src/lib/handles/index.ts` (barrel export — NEW vs G2 DP §G)
- All G2 DP §G handles inventory complete (sans Server Actions and pages).

### G3 status display layer
- `src/lib/ui/status-pill.ts` **UPDATED**
  - Added `"submission"` to `StatusKind` union
  - Added `submission` entry to `KIND_TONE` mapping
    - `created` → info / `processing` → warning / `ready` → emphasis / `rejected` → neutral
  - Existing 5 kinds (project, invoice, meeting, challenge, showcase) untouched — regression: 0
- `src/lib/ui/status-labels.ts` **NEW**
  - Korean labels for all 6 kinds (~28 entries)
  - i18n-ready: `LABELS_KO` can extend to `LABELS_EN` later without API churn
  - `description` field carried for submission status (creator psychology framing per G3 DP §F.2)
  - Exports: `statusLabel(kind, status)`, `statusDescription(kind, status)`

### G3 markdown renderer
- `src/components/challenges/markdown-renderer.tsx` **NEW**
- Dependency: `react-markdown@10.1.0` + `rehype-sanitize@6.0.0` installed (HIGH blocker #5 closed)
- Sanitization enabled by default (rehype-sanitize built-in schema strips scripts/event handlers)
- Styling: inline child selectors, semantic tokens only (no `text-gray-*`, no `rounded-xl/2xl`, no fixed px font-size) — X1 audit rules preserved
- **No Tailwind Typography plugin** in repo (verified); prose mode NOT used

## Decision Package §G changes (Builder must update at G3 entry)

| Original (G3 DP v2 §G) | Reality |
|---|---|
| `src/lib/ui/status-pill.ts` (NEW) | UPDATED (extended), not new |
| (not in §G) | `src/lib/ui/status-labels.ts` (NEW — label registry split from §F.1/§F.2) |
| (not in §G) | `src/components/challenges/markdown-renderer.tsx` (NEW — for §C [3]) |

Rationale for status-pill split: existing file is the Phase 2.5 X1
centralized helper (tone-based architecture, semantic tokens). G3 DP
§F.1/§F.2 wrote a from-scratch replacement with different API. **Option C
adopted** — preserve X1 architecture, split label/description into a
separate registry file, extend status-pill with `submission` kind.

## Adoption guidance for Builder

When Builder consumes G3 Decision Package §F.1/§F.2:
- ❌ Do NOT use `challengeStatusPill(status)` API as written in DP §F
- ❌ Do NOT use `submissionStatusPill(status)` API as written in DP §F
- ✅ Use `statusPillClass("challenge", status)` + `statusLabel("challenge", status)`
- ✅ Use `statusPillClass("submission", status)` + `statusLabel("submission", status)`
- ✅ Optional: `statusDescription("submission", status)` for helper/tooltip text

Example:
```tsx
import { statusPillClass } from "@/lib/ui/status-pill";
import { statusLabel, statusDescription } from "@/lib/ui/status-labels";

<span className={statusPillClass("challenge", c.state)}>
  {statusLabel("challenge", c.state)}
</span>

<span className={statusPillClass("submission", s.status)}>
  {statusLabel("submission", s.status)}
</span>
{statusDescription("submission", s.status) && (
  <p className="text-xs text-muted-foreground mt-1">
    {statusDescription("submission", s.status)}
  </p>
)}
```

When Builder consumes G3 Decision Package §C [3] (description rendering):
- ✅ Use `<MarkdownRenderer content={challenge.description_md} />`
- ✅ rehype-sanitize pre-configured — XSS safe by default
- Storage column: `challenges.description_md` (G1 migration — confirm at G3 entry)

## Verifications (side session #2)

- `pnpm exec tsc --noEmit` — clean (0 errors) after all changes
- `pnpm exec eslint src/lib/handles/ src/lib/ui/ src/components/challenges/` — clean
- Existing status-pill consumers (project, invoice, meeting, showcase pages): regression 0 — kind union only grew
- Lock file: `pnpm-lock.yaml` updated with 4 new packages
- No touches: `src/database.types.ts`, `supabase/**`, `src/components/share/**`, `src/app/**`, `src/lib/app/context.ts`

## Not addressed (Builder picks up at G3 entry)

- ADR for status-labels.ts split decision (candidate: ADR-010)
  - Web Claude recommendation: `docs/design/DECISIONS.md` append after G3 kickoff
- Tailwind Typography plugin — NOT installed; MarkdownRenderer uses child selectors
  - If richer styling desired later: `pnpm add -D @tailwindcss/typography` + plugin in `tailwind.config.ts`
- Test data SQL run (G3 DP §I)
- React-markdown component-level tests (Phase 2.5 does NOT introduce vitest per 야기 decision)
- ADR-009 role type reconciliation (G2 entry task, not G3 concern)

## File inventory (this session's additions)

```
src/lib/handles/                              (6 files, 245 lines — G2 side #1)
  ├── reserved.ts
  ├── validate.ts
  ├── instagram.ts
  ├── change.ts
  ├── messages.ts
  └── index.ts

src/lib/ui/status-pill.ts                     (UPDATED — +1 kind, +1 KIND_TONE entry)
src/lib/ui/status-labels.ts                   (NEW — ~90 lines)
src/components/challenges/markdown-renderer.tsx (NEW — ~25 lines)

package.json + pnpm-lock.yaml                 (UPDATED — 2 new deps)

.yagi-autobuild/phase-2-5/G3-PRE-INFRA-READINESS.md  (NEW — this file)
```

## Commit status

None of the above is committed. 야기 reviews → decides ADOPT / EDIT / REJECT
per side session protocol. Commit message suggestion if adopted wholesale:

```
feat(phase-2-5): G2+G3 pre-infrastructure (handles, status labels, markdown)

- src/lib/handles/ — handle validation layer per G2 DP §B-§E
- src/lib/ui/status-pill.ts — extend with submission kind
- src/lib/ui/status-labels.ts — i18n-ready label registry
- src/components/challenges/markdown-renderer.tsx — sanitized markdown
- deps: react-markdown, rehype-sanitize
```

End.
