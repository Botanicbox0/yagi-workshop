# Phase 7 Hotfix-4 KICKOFF (Builder execution prompt)

```
ROLE     = Builder (Sonnet 4.5) — single instance, no parallel
SOURCE   = .yagi-autobuild/phase-7-hf4/SPEC.md (vision, locked v1)
PROTOCOL = simplified hotfix (K-05 SKIP, K-06 optional)
LOOP_MAX = 2 per fail
HUMAN    = halt + chat 보고 on HALT trigger only
BASELINE = g-b-10-phase-7 (Phase 7 Wave A ship 상태, 6 commits ahead of main)
PHASE_BRANCH = g-b-10-phase-7 (same — hotfix commit 같은 branch)
```

## §0 — RUN ON ENTRY

```bash
# 1. Read source-of-truth
cat .yagi-autobuild/phase-7-hf4/SPEC.md
cat .yagi-autobuild/PRODUCT-MASTER.md  # esp. §Z (v1.7 North Star) + §K v1.7 + §Q v1.7 + §M v1.7
cat ~/.claude/skills/yagi-design-system/SKILL.md
cat ~/.claude/skills/yagi-context/SKILL.md
cat ~/.claude/skills/yagi-wording-rules/SKILL.md
cat ~/.claude/skills/yagi-lessons/SKILL.md  # esp. L-022, L-045

# 2. Verify clean entry on Phase 7 branch
git -C C:/Users/yout4/yagi-studio/yagi-workshop status --short  # clean
git -C C:/Users/yout4/yagi-studio/yagi-workshop branch --show-current  # expect: g-b-10-phase-7
git -C C:/Users/yout4/yagi-studio/yagi-workshop log --oneline -10  # Wave A commits at top

# 3. Verify pre-existing files
test -f src/components/app/sidebar-nav.tsx && echo OK_SIDEBAR_NAV
test -f src/app/[locale]/app/admin/page.tsx && echo OK_ADMIN_DASHBOARD
test -f src/app/[locale]/app/admin/campaigns/new/page.tsx && echo OK_CAMPAIGN_NEW
test -f src/app/[locale]/campaigns/page.tsx && echo OK_PUBLIC_CAMPAIGNS
test -f messages/ko.json && test -f messages/en.json && echo OK_I18N

# 4. Find Phase 6 Briefing Canvas Step 1 카테고리 위치
grep -r "category" src/app/[locale]/app/projects/new/ -l 2>/dev/null | head -3
grep -r "category" src/components/brief/ -l 2>/dev/null | head -3

# 5. K-06 FU sweep — keep-all 사용처 12 occurrences grep
grep -rn "keep-all" src/ | wc -l
grep -rn "유포 중" src/ messages/ 2>/dev/null
```

If any line above fails → HALT_E0_ENTRY_FAIL.

## §1 — STATE MACHINE

```
STATES = [INIT, HF4_1, HF4_2, HF4_3, HF4_4, HF4_5, HF4_6, SHIPPED, HALT]
Sequential: INIT → HF4_1 → HF4_2 → HF4_3 → HF4_4 → HF4_5 → HF4_6 → SHIPPED
```

| From | Event | To |
|---|---|---|
| INIT | §0 success | HF4_1 |
| any | exit_passed | next gate |
| any | fail_loop_2 | HALT |

## §2 — GATES

### HF4_1 — Sidebar nav campaigns parent (30분)

```
ENTRY: SPEC §"HF4.1" + sidebar-nav.tsx 의 challenges 패턴 read
EXIT:
  - sidebar-nav.tsx 에 campaigns parent + 3 children (campaigns_all / campaigns_new / campaigns_published) 추가
  - i18n keys: nav.campaigns / nav.campaigns_all / nav.campaigns_new / nav.campaigns_published (KO + EN)
  - icon = Megaphone (or Sparkles / Radio, Builder 자율)
  - "공개 진행 중" 워딩 사용 (NOT "유포 중")
  - tsc + lint clean
LOG: GATE_EXIT HF4_1 sidebar=ok i18n_keys=4
```

### HF4_2 — Admin dashboard sub-tools grid (1h)

```
ENTRY: SPEC §"HF4.2" read
EXIT:
  - SubtoolCard 컴포넌트 생성 (src/components/admin/subtool-card.tsx)
  - /app/admin/page.tsx 에 7개 SubtoolCard grid (campaigns / challenges / commissions / artists / invoices / support / trash)
  - i18n keys: admin.subtools_title + admin.subtools.<key>.title + .description (7 keys × 3 = 21 keys per locale)
  - rounded-[24px] + no shadow + border-border (yagi-design-system)
  - hover state (sage accent)
  - yagi_admin only access 유지
  - tsc + lint clean
LOG: GATE_EXIT HF4_2 dashboard_grid=ok subtoolcard_component=ok
```

### HF4_3 — 신곡 뮤비 template (45분)

```
ENTRY: SPEC §"HF4.3" + admin_campaigns 기존 i18n keys read
EXIT:
  - /admin/campaigns/new page.tsx 의 form state default 변경:
    * brief default = template.musicvideo.brief_default
    * categories default = 2 cats (가로형 + 세로형)
    * reference assets default = 1 row with label
    * title placeholder = "[가수명] [신곡명] AI 뮤비 캠페인"
  - i18n keys: admin_campaigns.template.musicvideo.* (8 keys per locale)
  - 안내 banner 추가 (선택, 야기 자유 수정 가능 message)
  - tsc + lint clean
LOG: GATE_EXIT HF4_3 template=ok i18n_keys=8
```

### HF4_4 — Public landing hero v1.7 (1h)

```
ENTRY: SPEC §"HF4.4" + PRODUCT-MASTER v1.7 §Z hero copy read
EXIT:
  - /campaigns/page.tsx hero section update:
    * eyebrow "AI VISUAL STUDIO"
    * headline "AI VISUAL STUDIO FOR MUSICIANS" (display font, 2-line)
    * subheading 한글 "음악인을 위한 AI 비주얼 스튜디오"
    * sub-tagline 2줄
  - section divider "OUR CAMPAIGNS" + 한글 sub
  - empty state copy update v1.7 §Z 반영
  - i18n keys: campaigns_public.* (7 keys per locale)
  - yagi-design-system 적용 (display font, sage accent, radius 24, no shadow)
  - 워딩 cross-check (yagi-wording-rules)
  - tsc + lint clean
LOG: GATE_EXIT HF4_4 hero_v1_7=ok wording_check=PASS
```

### HF4_5 — Phase 6 Step 1 카테고리 (30분)

```
ENTRY: SPEC §"HF4.5" + Phase 6 Briefing Canvas 기존 카테고리 list grep 결과
EXIT:
  - Step 1 카테고리 list first item = "AI 뮤직비디오 제작"
  - description 음악 specific
  - 기존 카테고리 보존, order 만 조정 (Musicians-first priority)
  - i18n key category_music_video.label + description
  - tsc + lint clean
LOG: GATE_EXIT HF4_5 step1_first=ai_music_video
```

### HF4_6 — K-06 FU sweep (30분)

```
ENTRY: SPEC §"HF4.6" + keep-all grep 결과 + "유포 중" grep 결과
EXIT:
  - keep-all utility 정의 verify (globals.css 또는 tailwind.config.ts)
    또는 모든 keep-all → break-keep (Tailwind 4.x) consistent 변경
  - "유포 중" → "공개 진행 중" 변경 (UI text + i18n value 모두)
  - 사용처 grep verify 0 (before/after)
  - tsc + lint + build clean
LOG: GATE_EXIT HF4_6 keep_all_fix=12 wording_fix=ok build=clean
```

## §3 — HALT codes

| Code | Trigger | Recovery |
|---|---|---|
| `E0_ENTRY_FAIL` | §0 step fail | 야기 chat |
| `E_HF4_<n>_LOOP_EXHAUSTED` | gate fail loop 2 | 야기 chat with diff |
| `E_PHASE_6_CATEGORY_NOT_FOUND` | HF4.5 의 카테고리 list 위치 unfindable | 야기 chat: SPEC update 또는 skip |

## §4 — Reporting

After SHIPPED:

`.yagi-autobuild/phase-7-hf4/_hf4_result.md`:
- Single commit hash
- Diffs summary (file count + line +/-)
- Verify log (18 step PASS/FAIL, 야기 visual smoke pending)
- yagi-wording-rules cross-check 결과
- K-06 FU 잔존 list (sweep 후 12개 잔존)

Then chat 야기:
- (a) commit hash
- (b) verify summary (auto PASS + visual pending)
- (c) wording cross-check 결과
- (d) Wave B entry 가능 여부 (Wave A + HF4 baseline 위)

GO.
