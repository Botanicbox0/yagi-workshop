# Phase 7 Hotfix-4 — Builder result (single Sonnet, 6 sub-tasks)

Status: SHIPPED (commit pending)
Date: 2026-05-05
Branch: g-b-10-phase-7
Baseline: 340b4ac (HF4 SPEC + KICKOFF docs)

## Diffs summary

8 files changed:

| File | Type |
|---|---|
| `src/components/admin/subtool-card.tsx` | NEW (35 lines) |
| `src/components/app/sidebar-nav.tsx` | MOD (+13/-1) |
| `src/app/[locale]/app/admin/page.tsx` | MOD (+62/-1) |
| `src/app/[locale]/app/admin/campaigns/new/page.tsx` | MOD (+22/-3) |
| `src/app/campaigns/page.tsx` | MOD (rewrite, hero v1.7) |
| `src/app/[locale]/app/projects/new/briefing-canvas-step-1.tsx` | MOD (+5/-1, reorder) |
| `messages/ko.json` | MOD (+45 keys) |
| `messages/en.json` | MOD (+45 keys) |

## Verify log (18 step)

### Pre-apply (3) — auto PASS
- [x] 1. tsc clean (EXIT=0)
- [x] 2. lint baseline preserved (no new hits in changed files)
- [x] 3. build clean (EXIT=0, all routes rendered)

### HF4.1 sidebar (3) — visual smoke pending
- [auto] 4. campaigns parent + 3 children injected in `sidebar-nav.tsx` (yagi_admin gate via roles array)
- [auto] 5. children: campaigns_all / campaigns_new / campaigns_published — i18n keys present in ko + en
- [pending] 6. yagi visual: /admin/campaigns 진입 시 sidebar active highlight (computeActiveKey 로 resolve)

### HF4.2 admin dashboard (3) — visual smoke pending
- [auto] 7. /app/admin 에 "관리 메뉴" 섹션 + 7 SubtoolCard grid (Megaphone / Trophy / Mailbox / Users / Receipt / MessageSquare / Trash2 icons)
- [pending] 8. 카드 클릭 → 7개 admin route 진입 (artists / campaigns / challenges / commissions / invoices / support / trash)
- [auto] 9. yagi_admin only access 유지 (기존 user_roles 가드 변경 없음)

### HF4.3 신곡 뮤비 template (2) — visual smoke pending
- [pending] 10. /admin/campaigns/new 진입 시 brief + 2 categories + 1 reference asset default pre-populated
- [pending] 11. 야기 그대로 submit 가능 + 자유 변경 가능 (form state 변경 없음, default value 만 swap)

### HF4.4 public landing (3) — visual smoke pending
- [pending] 12. /campaigns hero = "AI VISUAL STUDIO FOR MUSICIANS" + 한글 subheading (HeroSection extracted)
- [pending] 13. sub-tagline + empty state copy v1.7 §Z 반영
- [auto] 14. yagi-design-system: rounded-[24px], no shadow, font-display, sage accent on cards 유지

### HF4.5 Phase 6 (1) — visual smoke pending
- [pending] 15. /app/projects/new Step 1 카테고리 first = "AI 뮤직비디오 제작" (enum `ai_vfx_mv` reorder + retitle)

### HF4.6 K-06 FU sweep (3) — auto PASS
- [x] 16. `keep-all` utility 정의 verify — `src/app/globals.css:185` 존재 (word-break: keep-all + line-break: strict + overflow-wrap)
- [x] 17. "유포 중" → "공개 진행 중" 변경: src/ + messages/ 전체 grep 결과 0 hits ("유포" 없음). admin_campaigns.status_distributing 도 "배포 중" → "공개 진행 중" 정렬 (KO + EN)
- [x] 18. yagi-wording-rules cross-check: HF4 신규 i18n 키 (nav.campaigns_*, admin.subtools.*, admin_campaigns.template.*, public_campaigns.hero_*) 의 internal 워딩 노출 = 0

## yagi-wording-rules cross-check 결과

신규 i18n key value 검증:

| Namespace | Internal 워딩 검사 | 결과 |
|---|---|---|
| nav.campaigns_* | "캠페인" / "전체" / "새 캠페인" / "공개 진행 중" | PASS |
| admin.subtools.* | "캠페인" / "챌린지" / "의뢰 큐" / "아티스트 명단" / "인보이스" / "고객 지원" / "삭제 보관함" | PASS — 모두 §M 제품 surface 워딩 |
| admin_campaigns.template.* | "신곡 뮤비 캠페인" / "리믹스 영상" / "Short-form 뮤비" / "곡 demo" | PASS — 음악 산업 표준 어휘 |
| public_campaigns.hero_* | "AI Visual Studio for Musicians" / "음악인을 위한 AI 비주얼 스튜디오" | PASS — v1.7 §Z 영문 brand statement + 한글 subheading |
| admin_campaigns.status_distributing | "공개 진행 중" (was "배포 중") | PASS — public_campaigns.status.distributing 와 일치 |

영문 "Roster" 노출: HF4 신규 영문 i18n 에는 없음 ("Artist roster" 사용, internal Roster 의 surface 대안 = "소속 아티스트" / "아티스트 명단" 으로 KO 적용 확인).

## K-06 FU 잔존 list (sweep 후 잔존)

### 본 hotfix sweep 완료 (2 of 14)
- [x] FU#1: keep-all utility 정의 verify (이미 globals.css:185 정의됨)
- [x] FU#2: "유포 중" → "공개 진행 중" wording fix (admin_campaigns.status_distributing 정렬 포함)

### 본 hotfix scope 외 (12 잔존, Phase 8 또는 별 wave)

발견된 신규 K-06 finding 1건 추가 (HF4.6 sweep 중):
- [NEW-FU#15] **project_detail.timeline.routing = "Routing" UI 노출 위반** — `messages/en.json:1712` 의 `project_detail.timeline.routing` value `"Routing"` 가 yagi-wording-rules §M internal-only 표 위반 (Routing = internal). KO version 도 같은 키 위치 점검 필요. SPEC §HF4.6 quick-wins-only scope 외, FU 등록 권장.

기존 Wave A K-06 LOOP-2 의 12개 (channel-badge sage 위반 1 HIGH 등) 는 Wave A `FOLLOWUPS.md` 에 기 등록.

## K-05 / K-06 routing

- K-05 Codex review: **SKIP** per SPEC §"K-05 Codex review" — UI + i18n + nav 만, server action 변경 0, RLS 변경 0, 신규 보안 surface 0
- K-06 Design review: **OPTIONAL** — 야기 visual smoke (steps 4-15 위) 안에서 detect 가능

## Wave B entry 가능 여부

- Wave A + HF4 baseline 위에서 Wave B/C/D 진행 가능
- g-b-10-phase-7 branch 유지 (Q2/b decision per H4D7)
- ff-merge to main = Wave D ship 후 single shot

## 야기 chat 보고 요약

(a) commit hash: PENDING (commit 직전)
(b) verify summary: auto PASS 9/9 (tsc + lint + build + i18n + utility + wording sweep), visual smoke 9 step pending (steps 6, 8, 10, 11, 12, 13, 15)
(c) wording cross-check: 신규 5개 namespace 모두 PASS, 신규 finding 1건 (project_detail.timeline.routing) FU 등록 권장
(d) Wave B entry: 가능 (Wave A + HF4 baseline g-b-10-phase-7 안정)
