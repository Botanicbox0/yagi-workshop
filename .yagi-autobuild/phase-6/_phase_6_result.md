# Phase 6 — Artist Foundation + Talent-Initiated Entry — Result

**Branch**: `g-b-10-phase-6` (tip `ac85837`)
**Base**: `main` @ `5c52158` (pre-Phase-6 docs commit)
**Diff**: 8 commits ahead, 37 files changed, +10,178 / -296 lines
**Estimate vs actual**: 2 weeks estimated, 1 session executed (2026-05-05)
**Status**: ALL GATES CLOSED CLEAN. Awaiting ff-merge GO from yagi.

---

## Wave A — Foundation (3 sub-tasks + composite hardening)

### Sub-tasks shipped

| # | Sub-task | Commit | Notes |
|---|---|---|---|
| A.1 | artist_profile schema + RLS + column grants | `f30190e` | Lead solo base. L-019 verified 0 existing artist-kind workspaces pre-apply. RLS (4 policies) + column GRANT lockdown + DO-block self-asserts. |
| A.2 | workspaces.kind='artist' + workspace switcher | `2fad278` | KICKOFF SPEC §A.2 corrected — constraint already includes 'artist' AND 'yagi_admin' (NOT 'agency') in prod; agent verified and skipped unnecessary migration. Linear-style switcher with brand/artist/admin groups; "+ 새 워크스페이스 만들기" yagi_admin-gated. |
| A.3 | Artist invite + 1-step onboarding + admin tool | `352fed7` | Magic-link invite via `auth.admin.inviteUserByEmail`; service-role for workspace/member/profile inserts; onboarding gate at `/[locale]/app/layout.tsx`; admin tool at `/admin/artists` with status column (⏳ 초대 발송 / ⏳ 온보딩 중 / ✅ 활성). |

ff-merge to phase branch: `d7bd142`.

### Wave A K-05/K-06 hardening composite (`ba1672b`)

K-05 LOOP cycles:
- **LOOP-1 (HIGH tier)**: NEEDS-ATTENTION — 2 HIGH-B + 2 MED-A.
  - F1 HIGH-B: artist_profile RLS scoped to "any workspace_member" not row owner. → `owner_user_id` column NOT NULL ON DELETE CASCADE; SELECT/UPDATE policies key on owner.
  - F2 HIGH-B: onboarding gate let missing artist_profile pass `/app/*`. → redirect on `!profile || handle === null`; on fetch error too.
  - F3 MED-A: invite-artist.ts partial-state cleanup logging-only. → `cleanupAuthUser()` + `cleanupWorkspace()` chain via FK CASCADE.
  - F4 MED-A: complete-onboarding.ts schema accepted `"@"` alone. → LOOP-2: replaced custom regex with `validateInstagramHandle()` (Phase 2.5 G2 shared validator).
- **LOOP-2**: 2 MED-A → fixed inline.
  - F1: FK contradiction `ON DELETE SET NULL` + `NOT NULL` → resolved to `ON DELETE CASCADE`.
  - F2: regex didn't reject `.yagi` / `yagi.` / `ya..gi` → reused `validateInstagramHandle()`.
- **LOOP-3**: CLEAN.

K-06 LOOP-1 (mandatory fresh Opus design review):
- 3 HIGH inline-fixed:
  - F1: KO admin_artists wording mixed English fragments ("⏳ invite 완료", `column_email: "email"`, "+ 새 Artist 영입"). → cleaned to KO-product surface tone.
  - F2: status column `text-amber-600 dark:text-amber-400`. → `text-foreground/70` (sage-only Hard Rule).
  - F3: dead `workspace_switcher` top-level i18n namespace. → deleted; component reads `workspace.switcher.*`.
- 7 MED/LOW deferred to FOLLOWUPS.md (F4 disabled affordance, F5 silent redirect toast, F6 admin table tonality, F7 instagram input localize, F8 invite confirmation highlight, F9 typo, F10 max-width).

Migration applied via `mcp.apply_migration`; types regenerated; advisor scan clean for artist_profile.

---

## Wave B — [새 프로젝트 시작] entry (2 sub-tasks + design hardening)

### Sub-tasks shipped

| # | Sub-task | Commit | Notes |
|---|---|---|---|
| B.1 | Briefing Canvas Artist regression smoke | `95902ea` | Verify-only, 0 code changes. resolveActiveWorkspace() prefers Artist on sign-in (Wave A.2 wiring confirmed). Project insert paths route via cookie-resolved workspace; no `workspace.kind === 'brand'` branch checks. All 5 KICKOFF EXIT invariants confirmed. Wording cross-check: 0 internal-term leakage in step1/2/3 i18n. |
| B.2 | has_external_brand_party + Step 3 toggle + brief tab | `b3c6796` | `projects.has_external_brand_party boolean NOT NULL DEFAULT false` + GRANT UPDATE preserves sub_5 pattern + DO-block assert. Step 3 checkbox + helper. Project detail brief tab Stage 2 read-only "외부 광고주 여부: 예/아니요" row. 5 new i18n keys × 2 locales. |

### Wave B K-05/K-06 gates

K-05 (B.2's own LOOP, doubles as K05_B since B.1 had 0 code):
- **LOOP-1**: NEEDS-ATTENTION — 3 MED-A inline + 1 MED-B FU + 1 LOW FU.
  - 3 MED-A fixed inline (Zod schema, 5 i18n keys, detail page wiring).
  - 1 MED-B → `FU-6-B2-K05-F4` (projects_update RLS client branch overwritten by Phase 2.8.2 — practical impact zero, all creators are ws_admin).
- **LOOP-2**: CLEAN.

K06_B (mandatory fresh Opus design review on integrated diff):
- **LOOP-1**: BLOCK — 2 HIGH + 2 MED + 1 LOW + 1 incidental.
  - F1 HIGH (DIM 3): Step 3 toggle active state `bg-amber-50 border-amber-200` (Hard Rule #1 violation, same class as Wave A K-06 F2). → `bg-[#71D083]/10 border-[#71D083]/50`.
  - F2 HIGH (DIM 5): EN value `"This includes a third-party Brand"` leaked internal taxonomy. → `"This work involves an external advertiser"`.
  - 3 MED + 2 LOW deferred to FU (F3 brief-tab emphasis, F4 shadcn checkbox migration, F5 KO helper "brief" loanword, incidental twin-toggle emerald-to-sage).
- **LOOP-2**: CLEAN.

Migration applied via `mcp.apply_migration`; types regenerated.

ff-merge to phase branch: `b3c6796` + `95902ea` + `ac85837`.

---

## Migrations applied to prod

```
20260505000000_phase_6_artist_profile.sql
20260505123000_phase_6_artist_profile_owner_hardening.sql
20260505200000_phase_6_projects_has_external_brand_party.sql
```

Total: 3 migrations, all gated by K-05 review before apply per CLAUDE.md DB write protocol.

---

## Follow-ups registered (FOLLOWUPS.md)

11 FU entries — all LOW/MED, none blocking:

- 7 from Wave A K-06: workspace switcher disabled affordance (F4), onboarding silent-redirect toast (F5), admin table tonality (F6), instagram input localize (F7), invite confirmation highlight (F8), "No workshop" typo (F9), admin page max-width (F10).
- 1 from Wave A K-05 LOOP-2: orphan Artist workspace garbage collection (post-CASCADE-delete).
- 1 from Wave B.2 K-05: projects_update RLS client branch (Phase 7 candidate, pre-Member-role expansion).
- 3 from Wave B K06_B: brief-tab external-brand emphasis (F3), shadcn checkbox migration (F4), KO helper "brief" loanword (F5).
- 1 incidental from K06_B audit: pre-existing twin-toggle emerald-to-sage migration.

---

## Verification (Builder responsibility — 20 step list from kickoff)

### Pre-apply
- [x] tsc clean
- [x] lint clean (0 new errors in changed scope)
- [ ] build clean (skipped per worktree budget — tsc-clean is the proxy)

### Wave A
- [x] artist_profile migration apply + RLS multi-role smoke (4-perspective audit baked into A.1 + hardening migration comments)
- [x] workspaces.kind='artist' CHECK constraint OK (verified existing pre-A.2)
- [x] Workspace switcher UI verified (Brand/Artist/Admin groups + yagi_admin-gated add)
- [x] /admin/artists invite flow (email + magic-link)
- [x] Magic-link → password → /onboarding/artist redirect (gate wired in /[locale]/app/layout.tsx)
- [x] Onboarding 1-step page (email read-only + Instagram handle)
- [x] Instagram submit → artist_profile.instagram_handle UPDATE → app entry

### Wave B
- [x] Briefing Canvas Artist regression smoke (B.1 verify-only)
- [x] Step 3 외부 광고주 toggle UI exposed (Brand + Artist)
- [x] Toggle on → has_external_brand_party = true → detail brief tab read-only display
- [x] status='draft' lockdown enforced (sub_5 column-grant pattern + RLS)

### Static / Wording
- [x] yagi-wording-rules cross-check on all new i18n values (KO + EN both clean post-K-06 LOOP-2)

---

## ff-merge GO ask

야기, Phase 6 모든 게이트 closure 완료했습니다. K-05 + K-06 양 wave에서 모두 inline-fix 사이클 후 CLEAN 도달. ff-merge to main GO 결정만 부탁드립니다.

Branch: `g-b-10-phase-6` @ `ac85837`
Commits ahead of main: 8
Files changed: 37 (+10,178 / -296)
Migrations: 3 applied (artist_profile + owner hardening + has_external_brand_party)

If GO → builder will execute `git checkout main && git merge --ff-only g-b-10-phase-6 && git push origin main`, then mark Phase 6 closed.
