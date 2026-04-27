# Phase 2.5 G2-G8 Pre-Audit — Summary

> Generated 2026-04-23 by side-session (main track = G1 closeout Codex review).
> Read-only survey of src/ + supabase/migrations/ + SPEC.md + commit 58dbf6e.
> Scope: strictly prep artifacts for G2-G8 entry. NO main-track files touched.

---

## Precondition check (SPEC §3 G3)

**SPEC §3 G3 Precondition:** "Share-surface retoken (X1 `[BLOCKS 2.5]` items) must be committed before G3 starts."

**CRITICAL.md `[BLOCKS 2.5]` items** (3 total):
- #1 Hardcoded Tailwind grays on `src/app/s/[token]/page.tsx` public share surface
- #2 Hardcoded black/white colors in `src/components/share/{approve-button,comment-form,fast-feedback-bar}.tsx`
- #10 Form inputs bypass `<Input>` / `<Textarea>` primitives in same share components

**Verification:** commits f2815f1 + c6040bc + 8121538 + ade027f (all ancestors of 58dbf6e) address these. Grep in src/app/s and src/components/share at HEAD returns **zero matches** for `text-gray-|bg-gray-|bg-black|border-gray-`. ✅

**Status: G3 PRECONDITION PASS.** Phase 2.5 G3 may start whenever sequencing allows.

---

## 🚨 PRE-1 — CRITICAL drift (web Claude discovery, confirmed this session)

**File:** `src/lib/app/context.ts:3`
```typescript
export type Role = "creator" | "workspace_admin" | "workspace_member" | "yagi_admin";
```

**Collision:** literal string `'creator'` means two different things:
- Phase 1.1 `user_roles.role='creator'` — privileged global role (grants workspace-skip)
- Phase 2.5 `profiles.role='creator'` — challenge persona (alongside studio, observer)

Both are now live after commit 58dbf6e. SPEC §1.2 claims orthogonality (true at DB/RLS level) but TypeScript literal types conflate them.

**Call sites affected:**
- `src/lib/app/context.ts:3` — Role union declaration
- `src/app/[locale]/app/layout.tsx:28-29` — `hasPrivilegedGlobalRole = ctx.roles.includes("creator")` (reads user_roles)
- `src/lib/onboarding/actions.ts:13` — hardcoded `"client" | "creator"` (must change for 2.5)
- `src/lib/onboarding/actions.ts:30-34` — INSERTs `user_roles.role='creator'` on Phase 1.1 signup

**Impact per gate:**
| Gate | Impact |
|---|---|
| G2 | BLOCKING — must resolve type ambiguity before extending signup to write `profiles.role` |
| G3 | None direct (public surfaces auth-less) |
| G4 | Role-gate for submit must read `profiles.role`, not `user_roles.role` — doc the source explicitly |
| G5 | None (admin gate is `is_yagi_admin` RPC, Phase 1.1 territory) |
| G6 | Profile badge reads `profiles.role` only — no collision |
| G7 | None (severity + preference reading agnostic of role) |
| G8 | Codex likely flags as HIGH if unresolved → autopilot halt |

**ADR-009 candidate (recommended: Option A):**
Rename `Role` (context.ts) → `UserRolesRole` or `PrivilegedRole`; add new `ProfilePersona = 'creator'|'studio'|'observer'` in `src/types/profile.ts`; extend `AppContext` with `persona: ProfilePersona | null` field reading from `profiles.role`. Phase 1.1 semantics preserved (zero behavior change). Mechanical rename across ~15 files.

Alternatives (B: drop `user_roles='creator'`, C: rename Phase 2.5 profiles.role) documented in `G2-auth-flow.md` §3.

**Action required:** yagi / Builder to approve ADR-009 direction BEFORE G2 starts. If deferred, G2 cannot reason correctly about role semantics.

---

## Web Claude additional findings (confirmed)

### Finding #1 — Sidebar already 3-tier (Phase 2.6 P1 partial)
`src/components/app/sidebar.tsx` composes `SidebarWorkspaceSwitcher` + `SidebarNav` + `SidebarUserMenu`. Phase 2.6 P1 target partially met. **Cross-ref:** G6 must NOT modify sidebar — strictly Phase 2.6 domain.

### Finding #2 — Workspace switcher dropdown (Phase 2.6 P2 base)
`src/components/app/sidebar-workspace-switcher.tsx` — dropdown pattern already present. Phase 2.6 P2 starts from a base rather than scratch.

### Finding #3 — Header only has NotificationBell (Phase 2.6 P4 slot)
`src/app/[locale]/app/layout.tsx:48-52`:
```tsx
<header className="flex items-center justify-end h-12 px-4 border-b border-border">
  <NotificationBell ... />
</header>
```
Phase 2.6 P4 (PageHelpLink) has a clean slot. **Cross-ref:** G6 must NOT modify this layout — strictly Phase 2.6 domain.

### Finding #4 — `hasPrivilegedGlobalRole` already uses 'creator'
`src/app/[locale]/app/layout.tsx:28-29`:
```tsx
const hasPrivilegedGlobalRole =
  ctx.roles.includes("yagi_admin") || ctx.roles.includes("creator");
```
Phase 2.5 user_roles + creator integration flow pre-installed. **This IS the PRE-1 collision risk site.** G2 must decide: do Phase 2.5 Creator persona users also get this privilege (workspace-skip), or only Phase 1.1 user_roles 'creator' users? Affects onboarding flow semantics.

---

## Cross-gate drift / blocker / decision summary

### Blockers (must resolve before gate entry)
| Blocker | Owner | Before gate | Resolution |
|---|---|---|---|
| PRE-1 (ADR-009 direction) | yagi / Builder | G2 | Pick Option A / B / C |
| G4 storage backend (R2 vs Supabase) | yagi | G4 | See `G4-storage-decision.md` — recommend R2 |
| R2 bucket provisioning (CORS + creds) | yagi / Builder | G4 | See `G4-storage-decision.md` commands |
| Markdown renderer + sanitizer pick | Builder | G3 | Recommend `react-markdown` + `rehype-sanitize` |
| Locale-prefix decision (/challenges /u routes) | yagi / Builder | G3 | Recommend locale-free (mirror showcase) |

### Drift (document, schedule fix)
| Drift | Impact | Resolution |
|---|---|---|
| `src/lib/onboarding/actions.ts:13` role union wrong (`client\|creator`) | G2 blocks until fixed | G2 scope |
| Handle validation regex divergence (onboarding vs settings) | G2 + G6 | G2 unifies in `src/lib/handles/validation.ts` |
| contracts.md has no Phase 2.5 section | G8 pre-compliance fail | Update at G2 entry (side task) |
| Phase 2.5 G1 commit (58dbf6e) shipped without contracts.md update | Silent drift | Catch up in G2 |
| Inline email templates drift from React Email components | Accept as tech debt | FOLLOWUPS entry |

### Decision points (yagi agency required)
| # | Decision | Gate | Ref |
|---|---|---|---|
| D1 | ADR-009 direction (A/B/C) for PRE-1 | G2 | G2 doc §3 |
| D2 | Storage backend (R2 / Supabase Storage) | G4 | G4-storage-decision.md |
| D3 | Locale-prefix scheme for public routes (/challenges, /u) | G3 | G3 doc §3 |
| D4 | Gallery layout: Frame-2 table vs grid-card variant ADR | G3 | G3 doc §6 |
| D5 | Markdown renderer + sanitizer pick | G3/G4 | G3 doc §6 |
| D6 | First admin bootstrap method | G8 | FU-4 |
| D7 | Handle holds (30-day) table — MVP or defer | G6 | G6 doc §6 |
| D8 | Image crop dep (react-image-crop) — adopt | G6 | G6 doc §6 |
| D9 | Role-switch UI placement (settings tab vs separate route) | G6 | G6 doc §6 |
| D10 | Fan-out delivery model for announce (sync vs async) | G5/G7 | G5 doc §3 |

---

## Artifact map (this side-session)

```
.yagi-autobuild/phase-2-5/G2-G8-PRE-AUDIT/
├── _summary.md                  ← this file (cross-cutting)
├── G2-auth-flow.md              ← PRE-1 + ADR-009 candidate + handle validation unification
├── G3-public-surfaces.md        ← /challenges + /challenges/[slug] + gallery + realtime first-mover
├── G4-submission-flow.md        ← submit form + signed-URL upload + role gate
├── G4-storage-decision.md       ← R2 vs Supabase Storage (recommendation: R2)
├── G5-admin-management.md       ← admin gate + JSONB forms + state machine
├── G6-profile-surface.md        ← /u/<handle> + settings edit + avatar + middleware patch
├── G7-notifications.md          ← 4 new kinds + cron + dispatch preferences
└── G8-closeout.md               ← CLOSEOUT + contracts.md + Phase 2.6 entry check
```

---

## Sequencing graph (from audit inferences)

```
G2 (auth + role) 
 ├── BLOCKS G4 (role gate needs profiles.role semantics)
 ├── BLOCKS G6 (settings edit needs handle validation + 90-day lock)
 └── Independent of G3
G3 (public surfaces) — can start anytime after X1 [BLOCKS 2.5] (DONE)
G4 (submissions) — after G2 + storage decision (D2)
G5 (admin) — parallel with G4; admin can exist without submissions
G6 (profile) — after G2
G7 (notifications) — after G5 (announce emit site) + G3 (realtime smoke)
G8 (closeout) — after all
```

Critical path: G1 (DONE) → G2 → {G3 ‖ G4 ‖ G5 ‖ G6} → G7 → G8

---

## Next actions (ordered)

1. **yagi decides ADR-009 direction** (PRE-1 resolution)
2. **yagi picks D2** (storage backend); if R2, this side-session can create bucket on GO
3. **Main session resumes G1 Codex review closeout** — unaffected by this side-session (disjoint artifacts)
4. **G2 entry** — main session starts G2 with ADR-009 direction in hand
5. Side-session remains available for storage provisioning + doc updates while G2 runs

---

**Git verification:** all 8 files in `.yagi-autobuild/phase-2-5/G2-G8-PRE-AUDIT/` uncommitted (per audit scope instructions). `src/` and `supabase/` untouched. See final report for git status diff.
