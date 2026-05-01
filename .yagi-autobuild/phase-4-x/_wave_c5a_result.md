# Phase 4.x — Wave C.5a result

**Window**: 2026-05-01T03:00Z → 2026-05-01T03:36Z (lead Builder direct, no spawn)
**Branch**: `g-b-9-phase-4` (NOT pushed; NOT ff-merged to main)
**HEAD after Wave C.5a**: `83e9a39`
**Verify**: `pnpm exec tsc --noEmit` exit 0 / `pnpm build` exit 0 / `pnpm lint` baseline-pinned (3155 errors, identical to pre-C.5a baseline)

---

## Sub-task summary (8 sub-tasks, 7 commits)

| sub | Subject | Commit | Files | Acceptance |
|---|---|---|---|---|
| 01 | wizard step3 errors i18n drift fix | `89bf391` | 3 | ✅ |
| 02 | sidebar user block hides DB handle | `c29c4d0` | 2 | ✅ |
| 03 | remove "공개 사이트" CTA | `353503e` | 4 | ✅ |
| 04 | settings handle removal + tabs rename + save unified | `77cf153` | 8 | ✅ |
| 05 | dashboard tone unified to 프로젝트 | `d74306d` | 3 | ✅ |
| 06 | projects list card vertical redesign | `f3c5c63` | 2 | ✅ |
| 07 | meetings empty state onboarding-styled | `83e9a39` | 3 | ✅ |
| 08 | integrated verify + result | (this commit) | 2 | ✅ |

---

## sub_01 — wizard step3 errors i18n drift fix (priority 1)

`new-project-wizard.tsx` lines 857-862 referenced `wizard.step3.errors.*`
but the JSON keys live at `wizard.errors.*` (sibling of `wizard.step3`,
not nested). Code swapped to match JSON. KO + EN parity preserved
(keys already present in both locales).

Root cause: Wave A task_02 placed the keys per the existing sibling
validation block (`name_required`, `description_required`, etc) at
`wizard.errors.*`, but the new submit-failure code-path was authored
from spec wording ("step3 submit errors") and the dot-path mirrored
the spec language rather than the actual JSON shape. tsc cannot catch
this — `t(string)` accepts any string.

Audit doc: `_wave_c5a_sub01_i18n_audit.md`.

---

## sub_02 — Sidebar user block hides DB handle (HIGH privacy)

`profiles.handle` (auto-generated `c_xxxxxxxx`) is an internal DB id,
not a user-facing identifier. The sidebar trigger and the dropdown
top item both displayed `@c_xxx` — fixed by:

- `AppContext.profile` gains `email: string | null` (sourced from
  `auth.getUser().email`).
- `SidebarUserMenu` resolves a visible name with the cascade
  display_name → email local-part → empty (no @handle, no email
  surface).
- DB handle is preserved unchanged for future @username work.

Files:
- `src/lib/app/context.ts` — added `email` field to AppContext.profile
- `src/components/app/sidebar-user-menu.tsx` — resolveVisibleName + UI

---

## sub_03 — "공개 사이트로 나가기" CTA removed (LOW UX)

The sidebar bottom held a small `Link href="/"` CTA that translated to
"공개 사이트로 나가기" / "Back to public site". Sole callsite of the
`SidebarPublicExit` component and the `app.publicExit` i18n key. All
three artifacts removed:

- Component file deleted.
- `app.publicExit` removed from both `messages/ko.json` and
  `messages/en.json`.
- Sidebar import + render call removed; the bottom container now holds
  only the user menu (no `space-y-1` wrapper needed).

If the "내 공개 페이지" surface is reintroduced in a later phase, it
should be a distinct CTA on a profile/settings surface — not a quiet
exit chrome on the workspace sidebar.

---

## sub_04 — Settings handle removal + tabs rename + save unified (HIGH + MEDIUM)

**1) Profile-form handle field deleted.** Input, 90-day lock note, and
the `handle` schema property removed. The `updateProfile` server
action keeps `handle` as an *optional* path (validateHandle +
change_handle RPC entered only if a caller supplies one) so any future
admin/internal surface can still drive change_handle through the same
entry point. Phase 4 client form omits it; server skips the RPC.

**2) Tab labels renamed.**
- `profile_tab`: "프로필" → "내 정보" / "Profile" → "My info"
- `workspace_tab`: "워크샵" → "워크스페이스" / "Workshop" → "Workspace"
- `team_tab`: unchanged ("팀" / "Team")

URL slug values (`?tab=workspace`) intentionally preserved — labels
moved, routing did not.

**3) Save button + toast unified.**
- New keys: `save_changes` / `save_success` / `save_failed` (KO + EN).
- Old `profile_save` key removed; both ProfileForm and WorkspaceForm
  use `save_changes` for the button and `save_success` / `save_failed`
  for the toasts. WorkspaceForm previously misused `t("workspace_tab")`
  as a toast title — fixed.

**4) Workspace name field uses dedicated `workspace_name_label` key**
(was reusing `workspace_tab` which now reads as just "워크스페이스" —
ambiguous as an input label).

**5) Global "워크샵" → "워크스페이스" pass.** YAGI Workshop brand name
preserved everywhere (lines like `app.name`, `landing.hero_line_1`,
`viewer_made_with_yagi`, etc). Workspace-concept usages in nav,
admin, dashboard, commission intake, onboarding all replaced. The
sole code-side string literal hit (`intake-state-pill.tsx`) also
flipped.

**6) Team panel @handle hidden** for consistency with sub_02 privacy
intent (member display now: `display_name?.trim() || user_id.slice(0,8)`,
no @handle line).

Files: `messages/{ko,en}.json`, settings/{actions.ts, page.tsx,
profile-form.tsx, team-panel.tsx, workspace-form.tsx},
commission/intake-state-pill.tsx.

---

## sub_05 — Dashboard tone unified to "프로젝트" (LOW copy)

`dashboard_v4.recent_rfps.*` namespace renamed to `recent_projects.*`.

Copy:
- "최근 RFP" → "최근 프로젝트" / "Recent RFPs" → "Recent projects"
- empty headline 추가: "아직 시작된 프로젝트가 없습니다" / "No projects yet"
- empty subtitle 신규: "새로운 작업을 시작해보세요" / "Start your first project"
- empty CTA + top-right CTA + view-all link unchanged.

Empty-state layout reworked to a 3-stack vertical:
- headline 22px sb (ls -0.01em, lh 1.2)
- 8px gap → subtitle 14px regular (ink secondary)
- 24px gap → CTA pill

Files: `messages/{ko,en}.json`, `src/app/[locale]/app/dashboard/page.tsx`.

---

## sub_06 — Projects list card vertical redesign (MEDIUM UX)

New `src/components/projects/project-list-card.tsx`. Layout:

```
┌────────────────────────────────────────┐
│ Title                  [Status pill]   │  ← row 1
│ 22px sb                                │
│                                        │
│ (24px gap)                             │
│                                        │
│                            4월 30일    │  ← row 2 (right-aligned)
│                            12px        │
└────────────────────────────────────────┘
```

Status pill mapping (sage discipline rule):
- `in_review` → bg `#71D083/0.12`, text `#71D083` (sole sage)
- `in_progress` / `in_revision` / `delivered` / `approved` →
  `bg-foreground/[0.06]` + ink primary
- `draft` / `archived` / `cancelled` / others → `bg-foreground/[0.04]`
  + muted-foreground

Container: `rounded-3xl border border-border/40 bg-foreground/[0.02]
p-6` with hover ramp to `bg-foreground/[0.05]`. Zero shadow.

Grid: `grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6` (was `xl:3
gap-4`). Two columns on tablet/desktop emphasizes the card's
selection-surface role.

Brand chip removed from this surface — direct-commission-only list
with no brand-mixed dimension at this moment, and the v1.0 grammar
wants the title to carry the card.

Dashboard's `RfpRowCard` (horizontal row) is intentionally unchanged
so the two surfaces read as different grammars (dashboard = summary
scan, projects = selection surface).

Files: `src/components/projects/project-list-card.tsx` (NEW),
`src/app/[locale]/app/projects/page.tsx`.

---

## sub_07 — Meetings empty state onboarding-styled (LOW UX)

`/app/meetings` empty surface upgraded from a dashed-border info
panel to a 4-stack invitation:
- Calendar icon (32px, ink tertiary)
- Headline 22-26px sb ("아직 예정된 미팅이 없습니다" / "No upcoming meetings yet")
- Subtitle 16px regular ink secondary, 480px max-width clamp, lh 1.37
- CTA "미팅 예약하기" / "Book a meeting" → /app/meetings/new

CTA copy intentionally distinct from the persistent top-right "새 미팅"
button (action vs invitation). New `meetings.empty.{headline,subtitle,cta}`
keys (KO + EN). Container: `rounded-3xl border-border/40` (was dashed
border).

Files: `messages/{ko,en}.json`, `src/app/[locale]/app/meetings/page.tsx`.

---

## Verify

```
pnpm exec tsc --noEmit  → exit 0
pnpm build              → exit 0 (Compiled successfully in 8.1s; 13/13 static pages)
pnpm lint               → exit 1 baseline (3155 errors, identical to pre-Wave-C.5a)
```

Lint baseline matches the autopilot summary's recorded value (3155).
No new errors introduced; the 3155 are the pre-existing repo baseline
already accepted by Wave A/B/C.

---

## Visual review checklist for yagi (client + Artist accounts)

When `pnpm dev` resumes:

- [ ] /ko/app/dashboard — section title "최근 프로젝트", empty state 3-stack
      with subtitle, no "RFP" / "의뢰" surfaces.
- [ ] /ko/app/projects — vertical card grid (title top-left, status
      pill top-right, date bottom-right). 검토 중 status renders sage;
      everything else achromatic. Grid 2-col desktop / 1-col mobile.
- [ ] /ko/app/meetings (with no meetings) — calendar icon + headline +
      subtitle + "미팅 예약하기" CTA.
- [ ] /ko/app/settings — tabs read 내 정보 / 워크스페이스 / 팀. Profile
      tab has no handle field. All save buttons say "변경사항 저장".
      Toast on save: "변경사항이 저장되었습니다".
- [ ] Sidebar bottom — user name + role only (no @c_xxx, no "공개
      사이트로 나가기" link).
- [ ] /en parity for all five surfaces.
- [ ] Wizard /app/projects/new — submit failure path (e.g. unauth) now
      surfaces the localized toast, not the raw key string.

---

## Hand-off

STOP point reached. Wave D not entered. Awaiting yagi Artist account
visual review → either Wave C.5b prompt (additional fixes) or Wave D
prompt (K-05 + manual SQL verify + browser smoke + ff-merge).

`push 절대 X. ff-merge 절대 X.` (L-027 BROWSER_REQUIRED gate)
