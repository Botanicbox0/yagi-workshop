# Phase 2.8.3 — Brand identity restoration + onboarding/projects copy polish

**Status:** v1 (web Claude 2026-04-27, post Phase 2.8.2 SHIPPED + hotfix)
**Predecessor:** main HEAD includes Phase 2.8.2 SHIPPED (5 gates) + hotfix (client redirect → /app/projects + tippy.js install)
**Successor:** Phase 2.10 KICKOFF
**Branch:** `g-b-3-brand-polish` (single worktree, linear)
**Target:** 4 working days

---

## §0 — Why this phase

Yagi visual smoke after Phase 2.8.2 SHIPPED + hotfix surfaced 5 issues that share one root: **Phase 2.8.x sweep work prioritized structure (RLS, schema, IA) and let brand identity + UX copy regress.** The hotfix already fixed two (build error, client redirect). This phase covers the remaining five.

```
1. Logo missing — Phase 2.8.1 G_B1-D / G_B1-E sweep removed brand mark/wordmark display
2. Workspace switcher absent — sidebar scope switcher hidden or removed
3. Creator profile copy weak — 6 specific edits requested by yagi
4. Projects hub headline + sample cases off-framing — "AI VFX" leaked back, sample cases generic
5. Logo asset placement — yagi has logo PNGs in ~/Downloads, need to live in repo public/
```

These are **product polish issues**, not architectural. No new tables, no RPC changes, no migration. UI + i18n + asset handling only.

---

## §1 — Sub-gates

| Sub | Theme | Effort |
|---|---|---|
| **G_B3-A** | Brand asset import + favicon + brand mark | 1d |
| **G_B3-B** | Sidebar brand mark + workspace switcher restoration | 0.5d |
| **G_B3-C** | Creator profile copy (6 edits per yagi) | 0.5d |
| **G_B3-D** | Projects hub hero rewrite (headline + 3 bullets + sample cases) | 1d |
| **G_B3-E** | Public landing brand check (no scope creep — confirm logo loads, no other change) | 0.5d |
| **G_B3-F** | Codex K-05 lite + REVIEW + SHIPPED | 0.5d |

**총합:** 4 days target. SOFT_CAP 5d. HARD_CAP 6d.

---

## §2 — G_B3-A — Brand asset import + favicon

### Trigger
Yagi reports logos disappeared from sidebar (Phase 2.8.1/2 sweep regression). Original asset files exist on yagi's Downloads folder:
- `C:\Users\yout4\Downloads\이미지 로고.png` — symbol/mark only (480KB)
- `C:\Users\yout4\Downloads\텍스트 로고.png` — wordmark "YAGI Workshop" (210KB)

### Scope

1. **Asset import** — copy both PNGs into the repo's public assets directory:
   - Decide canonical path. Recommendation: `public/brand/yagi-mark.png` and `public/brand/yagi-wordmark.png`. Lowercase, hyphen-separated, no spaces (avoids URL encoding issues on Windows-Linux deploy boundary).
   - Original Korean filenames are fine as build-time source but DO NOT use them as final asset paths in code (i18n separation).
2. **Optimize sizes** — current files are too large for inline header use:
   - mark: target 48x48 + 96x96 (retina) PNG, plus 32x32 favicon
   - wordmark: target ~200px wide, height auto, PNG with transparent bg
   - If yagi-provided originals are not transparent / wrong aspect ratio, log a finding and proceed with raw original at `<Image fill>` — do not block the gate. Yagi can re-export later.
3. **Favicon update** — replace existing `/favicon.ico` (or `app/icon.png`) with the new mark.
   - Check Next.js 15 App Router favicon convention (`app/icon.png` 32x32 OR `app/favicon.ico`). Use whichever already exists.
4. **OG image refresh** — `src/app/api/og/route.tsx` and `src/app/api/showcases/[id]/og/route.tsx` currently print "YAGI WORKSHOP" as text. Add the wordmark as `<img>` reference in those Edge Function templates if asset URL is publicly accessible at OG-render time. Else keep text but use the new font/style consistent with brand.
5. **Asset versioning** — append `?v=<commit-hash-short>` query string in `<Image>` src to bust cache on first deploy after Phase 2.8.3.

### EXIT
- [ ] `public/brand/yagi-mark.png` (or equivalent path) exists, ≤100KB
- [ ] `public/brand/yagi-wordmark.png` exists, ≤60KB
- [ ] `app/icon.png` (or `app/favicon.ico`) updated with new mark
- [ ] OG endpoints reference new asset (if practical) or keep text fallback
- [ ] tsc + lint + build exit 0
- [ ] manual smoke: favicon visible in browser tab, no broken image references

### FAIL on
- assets >200KB (page weight regression)
- OG endpoint breaks (returns 500)

### Rationale
Brand identity is the cheapest, highest-visibility touchpoint. Phase 2.8.x's sweep optimizations should not have collateral-damaged it.

---

## §3 — G_B3-B — Sidebar brand mark + workspace switcher restoration

### Trigger
Yagi: "왼쪽에 있던 내 워크스페이스를 고를 수 있게 하는게 없어져있는데."

Codex K-PUX F-PUX-006 also flagged this surface ("scope switcher Workspace/Profile/Admin"). Phase 2.8.1 G_B1-D terminology sweep may have hidden or relabeled the switcher in a way that broke its visibility for client roles.

### Scope

1. **Sidebar header restoration** — top of left sidebar:
   - Brand mark (yagi-mark.png, 32x32) + wordmark (yagi-wordmark.png next to it, or hide on collapsed sidebar)
   - Click → navigate to `/app/projects` (default app route)
2. **Workspace / scope switcher** — present for ALL roles that have multiple scopes:
   - Client with one workspace → no switcher needed (single workspace badge instead, e.g., "[company name]")
   - Yagi admin with workspace + admin scopes → dropdown switcher
   - Creator/studio (legacy) → profile + workspace switcher
3. **Locate prior implementation** — grep `src/components/app/sidebar-scope-switcher.tsx` (existing per K-PUX). Determine if it was deleted or just hidden:
   ```
   git log --diff-filter=D --name-only --pretty=format: | grep scope-switcher
   ```
   If deleted, restore from git history (`git show <hash>:path`).
   If hidden, find the conditional rendering bug.
4. **Single-workspace UX** — for clients with one workspace, show **read-only workspace badge**, not a dropdown. Reduces mental load for the most common case.
5. **Q-084 alignment** — labels say "Workshop" (not "Workspace") — hold the line on Phase 2.8.1 G_B1-D wins.

### EXIT
- [ ] Sidebar shows brand mark + wordmark at top
- [ ] Workspace badge or switcher visible per role
- [ ] Click brand mark → `/app/projects` for logged-in users; `/` for guests
- [ ] Client with single workspace → badge form (not dropdown)
- [ ] tsc + lint + build exit 0

### FAIL on
- workspace switcher exposes other tenants' workspaces (cross-tenant leak — RLS test)
- brand mark missing on mobile sidebar

### Rationale
Wayfinding. Without brand presence + workspace context, the user feels like they entered a generic SaaS rather than YAGI Workshop.

---

## §4 — G_B3-C — Creator profile copy (6 edits)

### Trigger
Yagi reviewed `/ko/onboarding/profile/creator` (image 1) and listed 6 specific copy fixes.

### Scope

Per yagi's exact requests:

#### 1. 페이지 헤드라인 (WHY 강화)

**Before:**
```
크리에이터 프로필
프로필은 /u/<handle> 경로로 공개됩니다.
```

**After:**
```
크리에이터 프로필 설정
클라이언트가 이 프로필을 보고 협업을 요청합니다
```

i18n keys: `profile_v2_creator_title`, `profile_v2_creator_sub`. **Update VALUES only, keep key names.** The current sub key may have a different value text — replace.

If `profile_v2_creator_sub` doesn't exist, add it. Check messages/ko.json + en.json.

#### 2. 핸들 입력 UX 개선

**Before:**
```
핸들
[input]
studio.yagiworkshop.xyz/u/...
3-30자, 영문 소문자, 숫자, 밑줄(_) 만 가능
```

**After:**
```
핸들
[input]
yagi_works  → 사용 가능 ✔  (live-validation badge)

3–30자 · 영문, 숫자, . _ 만 사용 가능
```

Implementation:
- Live availability check on debounced input (300ms). Use existing `is_handle_available` RPC.
- Show ✔ green if available, ✖ red if taken, neutral hint while typing.
- Hide the long URL preview "studio.yagiworkshop.xyz/u/..." — too noisy.
- Help text simplified to one line.

NOTE: yagi's "."  in the rule text suggests period is allowed. Verify against `validateHandle` in `src/lib/handles/validate.ts`. If period is NOT currently allowed, the rule text must accurately reflect the regex (regex is the source of truth). Surface the discrepancy as a finding, do not silently change validation.

#### 3. 표시 이름 설명 명확화

**Before:**
```
표시 이름
작품에 표시될 이름
```

**After:**
```
표시 이름
프로필과 작업에 표시될 이름입니다
```

i18n key: `profile_v2_creator_display_name_help` (or whatever exists — value-only update).

#### 4. Instagram 입력 필드 개선

**Before:**
```
Instagram 핸들
[input]
URL 없이 @ 뒤의 핸들만 입력해 주세요
[ ] Instagram 계정이 없습니다
```

**After:**
```
Instagram (선택)
작업 레퍼런스를 연결하면 신뢰도가 올라갑니다

[input]
@ 없이 입력해주세요
```

Changes:
- Remove the "Instagram 계정이 없습니다" checkbox entirely. The (선택) marker on the field already signals optionality.
- Add 1-line WHY description above the input.
- Simpler placeholder/help text.
- Schema: keep `instagram_handle` nullable. Removing the checkbox does NOT change validation — empty input is still allowed.

#### 5. 전체 톤 — top-of-form description

Add ONE line above the form (between page header and first field):

```
클라이언트가 이 프로필을 보고 협업을 요청합니다
```

(This duplicates the page sub-header from edit #1. If yagi's edit #1 puts that copy in the page sub, edit #5 is redundant — pick one location. Recommendation: put it in the sub-header per #1; don't duplicate.)

#### 6. CTA 버튼

**Before:**
```
계속
```

**After:**
```
프로필 만들기
```

i18n key: reuse `next_step` if appropriate, or add new `create_profile_cta`. Don't touch global `continue` key (Phase 2.8.1 hotfix established this rule — see DECISIONS_CACHE Q-090 spirit).

### EXIT
- [ ] All 6 copy edits applied (i18n value updates, no key renames)
- [ ] Handle live-validation badge functional (calls `is_handle_available`)
- [ ] Instagram checkbox removed; field kept optional
- [ ] CTA button shows "프로필 만들기" / "Create profile"
- [ ] EN translations match KO intent
- [ ] tsc + lint + build exit 0

### FAIL on
- removing Instagram checkbox without migrating any user state that depended on it (probably none — verify the form state)
- live-validation hits `is_handle_available` RPC on every keystroke (must debounce 300ms minimum)
- handle help text claims a character class that the regex rejects

### Rationale
Yagi-direct copy edits. Don't second-guess wording — apply verbatim.

---

## §5 — G_B3-D — Projects hub hero rewrite

### Trigger
Yagi reviewed `/ko/app/projects` empty-state hero (G_B2-A SHIPPED) and called out two regressions:

(1) "AI VFX" leaked back into headline despite Q-090 ("AI 비주얼" on user-selection surfaces).
(2) Bullets are too generic — "다른 플랫폼도 할 수 있어 보임."
(3) Sample cases reference VFX-only — yagi explicitly said "왜 너는 vfx에 꽃혔는지 모르겠어." YAGI Workshop is broader.

### Scope

#### Headline

**Before:**
```
AI 비주얼 작업, 야기와 함께 시작해보세요
```
(generic)

**After (yagi-provided):**
```
AI 비주얼 작업을 한 곳에서 의뢰하고
결과까지 완성하세요
```

Two-line H1. Apply to `<ProjectsHubHero>` component. EN equivalent:
```
Commission AI visual work in one place
and ship the result
```

#### Three bullets

**Before:**
```
• AI 시각물 자유 의뢰
• 기획부터 납품까지 한 흐름
• YAGI 전담 디렉터 매칭
```

**After (yagi-provided):**
```
• 의뢰부터 결과물까지 한 흐름으로 진행
• 기획, 피드백, 수정까지 보드에서 관리
• 프로젝트에 맞게 YAGI 스튜디오 제작 / 크리에이터 매칭
```

Note: "보드" must appear in bullet 2 — this is the YAGI core mechanic (Brief Board). Don't paraphrase it away.

#### Sample case cards

**Before (Phase 2.8.2):** placeholder "VFX 합성" / "AI 디지털 휴먼" generic cards.

**After (yagi-provided framing):**

Card 1:
```
브랜드 AI 비주얼 캠페인
완성도 높은 이미지와 영상을 전달하며,
실제 모델 기반 제작도 가능합니다.
```

Card 2:
```
뮤직비디오 / 영상 제작
실사 영상에 AI 기반 연출을 더해
완성도를 높입니다.
```

Image side: keep placeholder gradient or neutral pattern for now. Phase 2.10 / Phase 3 will populate with real case images. Do NOT add VFX-only stock images.

#### Section header above cards

Update from "이런 작업을 의뢰할 수 있어요" (or whatever the current copy is) to:

```
이런 프로젝트가 가능해요
```

EN: `Projects you can run here` (or similar — don't translate literally to "These projects are possible").

#### 4-step workflow strip

Already shipped in Phase 2.8.2 G_B2-A. **Do NOT touch.** Yagi's feedback didn't mention it; leave alone.

### EXIT
- [ ] Headline 2-line update applied
- [ ] 3 bullets verbatim per yagi (especially "보드" word in bullet 2)
- [ ] 2 sample case cards rewrite (no VFX-only framing)
- [ ] Section header "이런 프로젝트가 가능해요"
- [ ] EN translations match KO intent
- [ ] tsc + lint + build exit 0

### FAIL on
- "AI VFX" appears anywhere in the hero (Q-090 violation)
- "보드" missing from bullet 2

### Rationale
Yagi explicitly framed 4 anti-patterns:
- generic headline (any startup could write it)
- generic bullets (any platform could deliver)
- "보드" missing — the actual product mechanic
- VFX-only sample cases — narrows the addressable market

This gate fixes all 4.

---

## §6 — G_B3-E — Public landing brand check

### Trigger
After G_B3-A/B land, the public landing (`src/app/[locale]/page.tsx`) may also lose brand mark or have stale references. This gate is a CHECK, not a rewrite — Phase 2.10 owns the landing rewrite (per K-PUX F-PUX-001).

### Scope
1. Verify favicon loads on `/`
2. Verify any logo references on the landing page resolve to the new asset paths
3. NO copy changes on the landing — that's Phase 2.10 work (F-PUX-001)
4. If broken references found, fix and log; if none, log "PASS — landing brand intact"

### EXIT
- [ ] Landing page loads without broken images
- [ ] Favicon visible
- [ ] No 404s in network tab on `/` and `/ko`
- [ ] tsc + lint + build exit 0

### FAIL on
- new asset path 404s on landing
- inadvertent landing copy change (must be 0 lines diff in landing copy files)

### Rationale
Defensive sweep. Phase 2.10 will rewrite the landing; this gate just makes sure the brand assets are wired so 2.10 doesn't trip on a regression.

---

## §7 — G_B3-F — Codex K-05 lite + REVIEW + SHIPPED

### Trigger
End of phase. UI/copy/asset work has narrow blast radius — full Codex K-05 may be overkill. Choose between:

- **Option A:** Skip K-05, rely on yagi visual smoke (per Phase 2.8.1 followup-1 precedent — small scope, optional review)
- **Option B:** Run K-05 with narrow prompt (focus: brand asset paths, i18n key consistency, no security regression)

### Decision rule
- If G_B3-B touches RLS or workspace-switching logic in any way → run K-05 (security surface)
- If G_B3-A through E are pure UI/copy/static-asset → skip K-05, rely on yagi smoke + tsc/lint/build clean
- Builder logs the decision and rationale to `_run.log` at REVIEW state entry

### EXIT
- [ ] tsc + lint + build all exit 0 across the whole branch diff
- [ ] yagi visual smoke checklist included in commit message
- [ ] (Option B taken) K-05 PASS or LOOP_2_PASS
- [ ] (Option A taken) Builder logs justification

### Rationale
Codex K-05 cost (~$2-4) is justified for security/data-shape changes. Pure UI polish doesn't need it.

---

## §8 — Out of scope (deferred)

### → Phase 2.10
- Public landing rewrite (F-PUX-001) — full hero/sections rewrite per founder framing
- Status machine + approval flow + invoicing
- Wizard 5-action cycle rail (F-PUX-009)
- Block-anchored comments (F-PUX-014)
- Project detail Host/Client blocks (F-PUX-013)
- Settings cleanup (F-PUX-018)

### → Phase 3.0+
- ProfileRole type narrow + DB cleanup (Q-088)
- Contest surface beyond admin
- Creator Profile public pages (Q-087)
- Anonymous OTP voting (Q-089)

---

## §9 — Risks & open questions

### R1 — Logo aspect ratio mismatch
Yagi-provided PNGs may not match expected sidebar height (typically 32-40px). If wordmark is e.g. 1200x300, scaling to 200x50 may render too-thin text.
**Mitigation:** if visual quality is poor at target size, log a finding, ship with raw asset, document re-export request.

### R2 — Asset path Korean characters
Original filenames contain "이미지 로고" and "텍스트 로고" (Korean). Windows handles fine, but bundlers + URL resolution on Linux deploy may break. Recommendation in §2 is to copy + rename to ASCII path.
**Mitigation:** the spec mandates ASCII canonical paths. Builder uses Korean originals as source only.

### R3 — Workspace switcher restoration scope
If the switcher was hidden behind a Phase 2.8.1 conditional that now returns false unconditionally, restoring it requires understanding the original logic. May find broader IA cleanup needed.
**Mitigation:** if the restoration requires touching scope-resolution logic in `src/lib/app/scopes.ts`, treat as a finding and either ship a minimal restoration OR escalate to yagi for a Phase 2.10 sub-gate.

### R4 — Handle live-validation rate-limit
Debounced calls to `is_handle_available` could still fire many times if user types slowly. Existing RPC may not be rate-limited.
**Mitigation:** 300ms debounce + cancel-in-flight on new keystroke. If RPC backend protection is missing, log FU.

### Q1 — When to run K-05?
See §7 decision rule.

### Q2 — Does G_B3-D's sample case section need image assets now?
Yagi didn't provide case-study images. Use placeholder (gradient or neutral pattern).
**Decision:** placeholder for now, real images in Phase 3.0 alongside Creator Profile / Contest launch.

---

## §10 — Definition of Done

- [ ] G_B3-A: brand assets imported + favicon
- [ ] G_B3-B: sidebar brand mark + workspace switcher
- [ ] G_B3-C: creator profile 6 copy edits
- [ ] G_B3-D: projects hub hero rewrite
- [ ] G_B3-E: landing brand check
- [ ] G_B3-F: REVIEW + SHIPPED
- [ ] tsc + lint + build exit 0
- [ ] yagi smoke — favicon visible, sidebar logo visible, switcher works, profile page reads right, projects hub hero reads right

---

## §11 — Timeline

```
TARGET   = 4 working days
SOFT_CAP = 5 days
HARD_CAP = 6 days → HALT E_TIMELINE_OVERRUN

PER GATE (target h):
  G_B3-A =  8
  G_B3-B =  4
  G_B3-C =  4
  G_B3-D =  8
  G_B3-E =  4
  G_B3-F =  4 (most/all is REVIEW + SHIPPED, may compress)
```

Total ≈ 32h work + 0-2h review = 4d. Buffer 0d.

---

## §12 — END

```
ON SHIPPED: brand identity restored, onboarding/projects copy matches yagi framing
            Phase 2.10 SPEC starts immediately on yagi signal
            Phase 2.10 = Workshop 본체 100% (status machine + approval + invoicing + landing rewrite)
```
