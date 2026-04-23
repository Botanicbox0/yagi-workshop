# Decision Package Audit — Cross-ref with side audit (G2-G8-PRE-AUDIT)

> Side-session output 2026-04-23. Compares web Claude Decision Packages
> (G2/G3 + Phase 2.6 SPEC v1) against side-session audit
> (`.yagi-autobuild/phase-2-5/G2-G8-PRE-AUDIT/` 9 files) for coverage,
> conflicts, drift, and missing decisions.
>
> **Cross-ref inputs:**
> - `G2-ENTRY-DECISION-PACKAGE.md` (29,915 B, 760 lines) — §A-§I
> - `G3-ENTRY-DECISION-PACKAGE.md` v2 (37,710 B, 1,011 lines) — §0-§K
> - `phase-2-6/SPEC.md` v1 (19,289 B, 417 lines) — §0-§8 + ADR-008/009
> - Side audit 9 files in `G2-G8-PRE-AUDIT/` (88 KB, 1,545 lines)

---

## §1 — G2 cross-ref

### Coverage map: side audit G2 decision items → DP §A-§F

| Side audit decision (G2-auth-flow.md §6) | DP covers? | Location | Note |
|---|---|---|---|
| D1 ADR-009 direction (A/B/C) | ✓ ADOPT | §A | DP picks "Option C (type discrimination + scope hook)". **Naming collision with side audit's option labels:** side audit's Option A = DP's Option C (same concept: rename + add ProfileRole type). Aligned at recommendation level. |
| D2 Phase 1.1 "client" concept fate | ⚠ PARTIAL | §A checklist #4 | DP adoption checklist tells Builder to "audit each site". Does not specify whether the `"client"` literal in `src/lib/onboarding/actions.ts:13` is migrated, dropped, or remapped to a 2.5 role. **Missing explicit decision.** |
| D3 Workspace-skip privilege for 2.5 Creator/Studio | ⚠ IMPLICIT | §F | DP §F Step 5 redirects to `/u/<handle>` (locale-free, no workspace gate). Implicit decision: 2.5 Creator/Studio do NOT get `user_roles.role='creator'` inserted → no `hasPrivilegedGlobalRole` → redirected to `/onboarding/workspace` if they navigate to `/[locale]/app/*`. **DP does not explicitly document this semantic.** For MVP where their entire surface is locale-free (`/u/<handle>` + `/challenges/*` + `/settings/profile` if also locale-free), this is fine. Worth surfacing. |
| D4 Handle validation unification (2-40 vs 3-30, dash vs no-dash) | ✓ ADOPT | §C | DP picks 3-30, lowercase+digits+underscore only. No dash. Matches SPEC §3 G2 Task 3. Existing `src/app/[locale]/app/settings/profile-form.tsx:19` (2-40 chars) will need updating — **DP §G file inventory does not flag this modification.** |
| D5 Instagram verification vs trust-based | ✓ ADOPT | §D | DP picks trust-based for MVP. Explicit `_no_instagram_` placeholder OR skip checkbox. Aligns with side audit. |
| D6 Handle change cooldown semantics | ✓ ADOPT | §E | DP picks 90 days + `handle_history` table (Option A from DP §E). Side audit didn't prescribe; DP extends. Good expansion. |

### Additional DP decisions not in side audit

DP extends beyond side audit's open-question list:
- **§B 100+ entry reserved handles list** categorized (side audit only pointed to SPEC §6 Q4's 35-entry seed)
- **§E Old handle anti-squatting via `handle_history` table** + 301 redirect from `/u/old` (new, not in side audit)
- **§F ASCII signup flow diagram** 5 steps + resumption semantics (side audit had outline only)

### Missing decisions / drift

| # | Finding | Severity | Fix |
|---|---|---|---|
| 1 | DP §A implicit semantic "2.5 Creator/Studio get no workspace-skip" not documented. Hidden coupling with layout.tsx:28-29 `hasPrivilegedGlobalRole`. | MED | Add 1-line clarification to DP §A "Decision for 야기" or post-G2 amendment: "Phase 2.5 Creator/Studio do NOT insert `user_roles.role='creator'`. Their product surfaces are locale-free; `/[locale]/app/*` redirects to workspace onboarding remains current behavior." |
| 2 | DP §C does not reference existing `src/app/[locale]/app/settings/profile-form.tsx` which validates 2-40 chars (conflict with DP's 3-30). | LOW | Amend DP §G file inventory: add `src/app/[locale]/app/settings/profile-form.tsx` (modified — handle validation unified via new `validate.ts`). |
| 3 | DP §F does not address existing `src/app/[locale]/onboarding/profile/page.tsx` (Phase 1.1) fate when new `/onboarding/profile/<role>/page.tsx` routes are introduced. | LOW | Amend DP §G: "Phase 1.1 `onboarding/profile/page.tsx` — deprecated, redirect to `/onboarding/role` at G2 merge." |
| 4 | DP §A adoption checklist step #3-4 assumes ~10 call sites for `ctx.roles` rename; side audit survey noted ~15 sites (`Role[]` type usage, imports, etc). | INFO | Builder verifies grep count at G2 entry. |

### File inventory cross-ref

DP §G lists Builder deliverables for G2. Side audit's src/ survey confirms:
- `src/lib/supabase/{server,client,middleware,service}.ts` — reused (no change) ✓
- `src/middleware.ts` — reused (no change at G2; G6 adds `/u` exclusion) ✓
- `src/app/[locale]/(auth)/signup/page.tsx` — reused (no change; only post-signup flow changes) ✓ (DP correctly implies unchanged)
- shadcn primitives: DP §F assumes all form primitives present → side audit confirmed (Input, Textarea, Label, Button, Form, Select, Radio-group, Dialog) ✓

Side audit observation missing from DP: **14 existing Server Actions** (`src/app/[locale]/app/*/actions.ts`) are reference patterns for new `/api/onboarding/{role,profile}/route.ts`. DP §G uses `/api/` route handlers but could alternatively use Server Actions (existing codebase pattern). Worth noting.

### §1 verdict

G2 DP is **ADOPTION-READY with 4 minor amendments (all non-blocking)**.

---

## §2 — G3 cross-ref

### Coverage map: side audit G3 decision items → DP §A-§J

| Side audit decision (G3-public-surfaces.md §6) | DP covers? | Location | Note |
|---|---|---|---|
| D1 Locale-prefix vs locale-free for `/challenges` | ✓ ADOPT | §A | DP confirms locale-free (mirroring showcase). `src/app/challenges/` NOT `src/app/[locale]/challenges/`. Consistent with middleware matcher. |
| D2 Gallery layout: Frame-2 table vs grid-card-variant ADR | ⚠ IMPLICIT | §D vs §F | DP §D gallery uses **3-col responsive grid** (mobile 1 / tablet 2 / desktop 3). DP §F `/challenges` LIST uses table. **SPEC §3 G3 Task 1 says "table, not cards" (for list); Task 3 says "grid of submissions" (for gallery).** DP correctly splits. However **ADR-005 forbidden-trigger (no new variant mid-build) is not invoked or documented.** Grid is a new card variant. DP relies on SPEC's implicit sanction ("grid" in SPEC §3 G3 Task 3). |
| D3 Markdown renderer pick (react-markdown + rehype-sanitize vs marked + DOMPurify) | ⚠ WRONG ASSUMPTION | §C | DP §C claims "react-markdown (already in deps from journal)". **VERIFIED FALSE:** `package.json` has NO `react-markdown`, `rehype-*`, or `remark-*` deps. Journal uses **content-collections** (MDX build-time compilation via `content-collections.ts`), NOT runtime markdown rendering. Challenge `description_md` is DB-stored (runtime) and requires a renderer that is NOT currently in the codebase. |
| D4 Empty state copy "/challenges with zero published challenges" | ✓ ADOPT | §C.4 | DP §C.4 "기다리고 있어요" + "첫 주인공" + eligibility-aware CTA. Strong pattern. Side audit had this as open question; DP adopts solution. |
| D5 Gallery realtime scope — INSERT only, or also UPDATE/DELETE | ✓ ADOPT | §D | DP §D implementation filters to INSERT-only. Explicit: "Vote count realtime — skip for MVP". Aligns with side audit recommendation. |
| D6 SEO robots directive per challenge state | ✓ ADOPT | §G | DP §G: `robots.index=true` for open/announced, false for archived/closed_judging. Granular pattern, better than side audit's "robots.txt deferred to Phase 2.6". |

### BLOCKS 2.5 precondition verification

Side audit verified [BLOCKS 2.5] items #1, #2, #10 CLEAN in commits f2815f1, c6040bc, 8121538, ade027f (all ancestors of 58dbf6e).

DP §H checklist cites **commit 7de7941** ("GO-B fix-all — HIGH-1 + MED-1 + MED-2 closed"). This is the later hardening commit that closed an additional Codex GO-B HIGH finding on share-surface completeness.

Both citations are correct. DP's citation is **more current** (captures the full retoken trajectory including GO-B fix). Side audit's citation captures the initial [BLOCKS 2.5] resolution.

Current HEAD verified: Grep in `src/components/share` + `src/app/s` for `text-gray-|bg-gray-|bg-black|border-gray-` returns **zero matches**. ✅ CLEAN.

Additional hardening migration `supabase/migrations/20260423030001_phase_2_5_g1_hardening.sql` (17:17 main-track) — confirmed untouched by side session.

### Share-surface inheritance alignment

DP §E enumerates exact reusable patterns:
- `<Button size="pill">` primary CTA
- `<Input>` / `<Textarea>` + `<Label>` form fields
- Reaction-button base (for vote button in §D.2)
- Forbidden pattern list (comprehensive: `text-gray-*`, `bg-black`, `text-[11px]`, `rounded-2xl`, raw `<input>`, etc.)

Side audit G3 §1 listed showcase + share as reference surfaces. **DP §E is a strict superset** of side audit's inheritance expectation. No conflict.

### Additional DP layers beyond side audit

- **§0 Tone principle** — entirely new governance layer. Side audit had design-system compliance but no copy-tone layer.
- **§C.2 Status banner urgency tiers** (24h / 1h) — product conversion feature not in SPEC or side audit.
- **§D.2 Vote button default/voted label asymmetry** — micro-UX I didn't surface.
- **§F.2 Submission status helper** (creator-own-view) — new scope: DB enum `created/processing/ready/rejected` → creator-psychology Korean labels ("올렸어요"/"확인 중"/"공개됨"/"확인 필요"). Side audit did not flag this as G3 deliverable.
- **§I test data SQL** — practical visual-review prep with urgency tier test rows.
- **§J copy consistency enforcement** + optional lint hook — new governance.

### Missing / conflicts

| # | Finding | Severity | Fix |
|---|---|---|---|
| 5 | DP §C claims "react-markdown already in deps from journal" — **VERIFIED FALSE**. No react-markdown, rehype-sanitize, remark-* in package.json. Journal uses content-collections (MDX build-time), not runtime markdown. Challenge `description_md` is DB-stored, requires runtime renderer that is NOT present. | **HIGH** | Amend DP §C: "Add `react-markdown` + `rehype-sanitize` to `package.json` dependencies at G3 entry (or before). Sanitization is REQUIRED — admin-authored markdown is untrusted input to public viewers." Alternative: `marked` + `DOMPurify`. Either requires a dep add. |
| 6 | DP §D gallery grid layout does not invoke ADR-005 "no new variant mid-build" exemption language. SPEC §3 G3 Task 3 uses "grid" literally, providing implicit sanction, but formal ADR hygiene untouched. | LOW | Optional: add 1-line in DP §D: "Grid layout is distinct from card/table variant — a gallery-specific visual container for media-first surfaces. Not governed by ADR-005 list/card exclusion." |
| 7 | DP §I test data SQL uses `'YOUR_AUTH_USER_ID'` placeholder. If yagi's `auth.users.id` is known, pre-fill. Otherwise documented substitution is fine. | INFO | (no change needed; instruction to replace is explicit) |
| 8 | DP §F.2 submission status helper semantics (rejected → "확인 필요") — depends on admin workflow around rejection. Not in SPEC §2 acceptance criteria. | LOW | Confirm with yagi whether "rejected" UI should match "soft review" framing or hard "거절됨" framing. DP's soft framing is the recommendation. |

### §2 verdict

G3 DP v2 is **ADOPTION-READY with 1 HIGH + 3 LOW amendments**. The HIGH finding (#5, markdown renderer dependency missing) is **blocking for G3 Task 2** (challenge detail page). Must resolve BEFORE G3 implementation starts — but does NOT require DP rewrite, only a dep add + 1-line clarification.

---

## §3 — Phase 2.6 cross-ref

### Coverage: side audit 4 sidebar findings → SPEC v1 §0-§2

| Side audit finding (_summary.md §"Web Claude additional findings") | SPEC v1 covers? | Location | Note |
|---|---|---|---|
| #1 Sidebar already structurally 3-tier (WorkspaceSwitcher + Nav + UserMenu) | ✓ | §0 | SPEC v1 §0 quotes: "The current sidebar is already structurally 3-tier... Visual delimiters exist (border-b, border-t, divider line)." **Exact inheritance** of side audit finding. |
| #2 `sidebar-workspace-switcher.tsx` dropdown pattern exists (P2 base) | ✓ | §1, §4 G2 | SPEC §1: "Existing SidebarWorkspaceSwitcher becomes SidebarScopeSwitcher." §4 G2 Task 1 rename path — `sidebar-scope-switcher.tsx` (kebab-case, correct per CLAUDE.md convention). |
| #3 Layout header has only NotificationBell → P4 (PageHelpLink) slot | ✓ | §1 P4 | SPEC §1 P4: "Wire `<PageHelpLink>` into app/layout.tsx header slot" with explicit layout.tsx diff. |
| #4 `hasPrivilegedGlobalRole` uses 'creator' literal — PRE-1 collision site | ✓ | §2 PRE-1 | SPEC §2 PRE-1 explicitly names `src/lib/app/context.ts`, explains the collision, lists 3 resolution options, recommends Option C (matches G2 DP §A). |

### PRE-1 through PRE-4 independent verification

| PRE | Claim | Verified? |
|---|---|---|
| PRE-1 | `Role` in `context.ts` includes 'creator' literal (Phase 1.1); collides with Phase 2.5 `profiles.role='creator'` | ✓ CONFIRMED (side audit earlier this session — `src/lib/app/context.ts:3` + `src/app/[locale]/app/layout.tsx:28-29`) |
| PRE-2 | Phase 2.4 G1 (Webflow accent tokens) is a dependency for sidebar active-state rendering | ✓ PLAUSIBLE (SPEC-level, not code-verified at side audit scope) |
| PRE-3 | `sidebar-nav.tsx` items array has `disabled: true` entries for storyboards/brands/billing | ✓ CONFIRMED THIS SESSION — `src/components/app/sidebar-nav.tsx:36-38` exactly these 3 entries marked `disabled: true` |
| PRE-4 | `font-display` class in use on workspace switcher → Phase 2.4 G1 re-binds to WF Visual Sans, visual diff expected | ⚠ NOT CODE-VERIFIED (SPEC claim; side audit didn't inspect) |

### SPEC v1 mapping accuracy

SPEC §1 "Operations tier mapping" lists challenges parent with 3 children (전체 / 새 챌린지 / 진행 중). Correctly classifies as admin-only (matches SPEC 2.5 §3 G5). No collision with existing disabled routes (icons disjoint). ✓

### SPEC v1 typo / issue

- **§1 Operations tier mapping line**: `챌린지 ▾              [parent, no href]            (Phase 2.5 ㎚ admin only)`
  - Character `㎚` (U+339A, SQUARE NM unit symbol) is a **typo** — likely intended `—` (em dash) or `;` separator.
  - Severity: COSMETIC. Zero functional impact. Fix at v1.1.

### Additional SPEC v1 sections beyond side audit

- **§4 G1-G4 Gate structure** — side audit's G6 doc cross-referenced sidebar findings as "Phase 2.6 territory" but did not propose gate structure. SPEC v1 provides full gate breakdown with duration targets + stop points.
- **§5 ADR-008 (no breadcrumbs)** — new decision not in side audit.
- **§5 ADR-009 candidate** — SPEC defers to G1 entry. Aligns with G2 DP §A which provides the concrete resolution.

### Missing / drift

| # | Finding | Severity | Fix |
|---|---|---|---|
| 9 | SPEC §1 `㎚` character typo (should be "—" or similar separator) | COSMETIC | Fix at SPEC v1.1 |
| 10 | PRE-4 claim about `font-display` rebinding not independently verified at side audit scope | INFO | Non-blocking; verify at Phase 2.6 G1 entry visual baseline |
| 11 | SPEC v1 §3 #10 responsive behavior claim "existing pattern via `Sheet` component if present, or new pattern" — side audit did not enumerate whether `Sheet` exists for mobile drawer. Uncertain. | LOW | Builder audits at G4 entry; SPEC allows fallback path explicitly. |
| 12 | SPEC v1 §1 scope selector behavior for Observer: "Observers see only their workspace scopes (if any)" — PRE-1 interaction: Observer has `profiles.role='observer'` but may have `user_roles.role='creator'` (legacy Phase 1.1). Double-role consumer would show workspace + hidden profile. Worth clarifying whether legacy 'creator' role grants profile scope visibility. | LOW | SPEC v1.1 amend §1 note: "Observer with legacy user_roles.role='creator' is a hybrid edge case; treat per Phase 1.1 semantics (workspace-skip entitlement only, no profile scope surfaced)." |

### §3 verdict

Phase 2.6 SPEC v1 correctly consumes all 4 side-audit sidebar findings. **ADOPTION-READY with 1 cosmetic fix (typo) + 3 low-severity clarifications.**

---

## §4 — Storage decision reference (G4)

Decision Packages G2 and G3 do NOT address G4 storage. The authoritative artifact remains:

- `.yagi-autobuild/phase-2-5/G2-G8-PRE-AUDIT/G4-storage-decision.md` (369 lines, post-bucket-creation amendment applied)
- R2 bucket `yagi-challenge-submissions` — **CREATED** at location ENAM (not APAC — MCP schema limitation). Yagi G4 entry decision pending on (a) accept ENAM / (b) delete+recreate via dashboard / (c) wrangler CLI.
- CORS + lifecycle spec documented in G4-storage-decision.md for 1-minute dashboard application OR wrangler CLI at G4 entry.
- Cost first month: effectively $0.

No cross-ref conflicts. G4 decision gate cleanly isolated. G3 DP §H checklist correctly notes "R2 bucket yagi-challenge-submissions — created (G4 uses, G3 doesn't)".

---

## §5 — 종합 권고

### Adoption status

| Artifact | Status | Adoption score (1-10) |
|---|---|---|
| G2 DP | Adoption-ready with 4 minor amendments | **9/10** |
| G3 DP v2 | Adoption-ready with 1 HIGH (markdown dep) + 3 LOW amendments | **8/10** |
| Phase 2.6 SPEC v1 | Adoption-ready with 1 cosmetic fix + 3 clarifications | **8.5/10** |

### Critical drift/conflict list (야기 adoption-level)

| Severity | # | Artifact | Item | Action |
|---|---|---|---|---|
| **HIGH** | 5 | G3 DP §C | "react-markdown already in deps" — FALSE | Add dep before G3 Task 2 |
| MED | 1 | G2 DP §A | Workspace-skip semantic for 2.5 Creator/Studio not documented | Clarify at G2 entry |
| LOW | 2 | G2 DP §G | Existing `settings/profile-form.tsx` regex conflict | Amend file inventory |
| LOW | 3 | G2 DP §G | Existing Phase 1.1 `onboarding/profile/page.tsx` fate | Amend file inventory |
| LOW | 6 | G3 DP §D | ADR-005 grid-variant exemption language absent | Add 1-line clarification |
| LOW | 8 | G3 DP §F.2 | "rejected" → "확인 필요" copy framing | Confirm with yagi |
| COSMETIC | 9 | Phase 2.6 §1 | `㎚` typo in mapping | Fix at v1.1 |
| LOW | 11 | Phase 2.6 §3 | `Sheet` component presence for mobile drawer unverified | Builder check at G4 |
| LOW | 12 | Phase 2.6 §1 | Observer + legacy 'creator' role edge case unaddressed | SPEC v1.1 amend |
| INFO | 4 | G2 DP §A | Actual codemod site count ~15 (not ~10) | Builder verifies |
| INFO | 10 | Phase 2.6 PRE-4 | `font-display` usage not code-verified | Visual baseline at G1 |

### Non-conflicts (confirmed alignment)

- ADR-009 direction: G2 DP Option C = side audit Option A = Phase 2.6 SPEC §2 PRE-1 Option C (all three recommend the SAME resolution — TypeScript type discrimination + new field on AppContext. Label mismatch is cosmetic.)
- BLOCKS 2.5 retoken: G3 DP cites 7de7941, side audit cites f2815f1+c6040bc+8121538+ade027f — both correct, DP citation is later/more-complete. Current HEAD CLEAN on grep.
- Sidebar findings: SPEC v1 §0 + §2 exactly mirrors side audit _summary.md findings #1-#4.
- Share-surface inheritance: DP §E pattern list is a strict superset of side audit expectation.

### Recommendation

**ADOPT with amendments** (not "ADOPT as-is" and not "major rework").

**Pre-adoption actions (야기 before sending GO):**
1. **G3 DP §C markdown dep — resolve before G3**: either (a) accept `react-markdown + rehype-sanitize` (recommended) or `marked + DOMPurify`, (b) verify no existing runtime markdown renderer I missed, or (c) defer description_md rendering (plain-text fallback) for MVP.
2. **G2 DP §A clarification**: 1-sentence addendum on workspace-skip semantics for 2.5 Creator/Studio.
3. **Phase 2.6 SPEC §1 typo fix** (`㎚` → `—`).

**Post-adoption actions (Builder at G2/G3/Phase 2.6 entries):**
- G2 Builder: verify codemod site count (grep precise); adds `settings/profile-form.tsx` to §G modification list; decides Phase 1.1 `onboarding/profile/page.tsx` migration path.
- G3 Builder: ADR-005 grid exemption language; test data SQL with real yagi auth.uid().
- Phase 2.6 Builder: `Sheet` presence check at G4; observer+legacy-creator hybrid edge case at G1 entry.

### Adoption workflow

```
야기 (pre-adoption):
  1. Resolve HIGH finding #5 (markdown dep) — pick renderer + sanitizer
  2. Amend G2 DP §A with 1-line workspace-skip clarification
  3. Fix SPEC 2.6 §1 typo

야기 (adoption at gate entries):
  G2 entry: GO command per G2 DP §H checklist
  G3 entry: GO command per G3 DP §H checklist
  Phase 2.6 G1 entry: GO command per SPEC v1 §4 G1

Builder:
  - Consumes adopted sections as authoritative
  - Applies amendments #2/#3/#6/#8/#11/#12 during respective gate
  - Commits per DP commit-message conventions
```

---

## §6 — Artifact integrity check

All 3 files written to disk intact:
- `G2-ENTRY-DECISION-PACKAGE.md`: 29,915 B / 760 lines (vs ~22 KB estimated = +36% from estimate; content bodies preserved verbatim)
- `G3-ENTRY-DECISION-PACKAGE.md`: 37,710 B / 1,011 lines (v2 expansion explains size vs ~21 KB v1 estimate)
- `phase-2-6/SPEC.md`: 19,289 B / 417 lines (vs ~15 KB estimated = +29%; skeleton at 12,137 B superseded)

Size variance vs yagi's pre-paste estimates is within acceptable tolerance (estimates were rough KB orders-of-magnitude, not strict). All file contents preserved without truncation.

---

## §7 — Status

Cross-ref audit complete. Side session is disjoint from main G1 hardening track throughout. No src/, supabase/, public/ writes from side session (independently verified).

Next side action: G2 or G3 entry in a new session (per yagi instruction).

End.
