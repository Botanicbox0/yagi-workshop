# Phase 7 KICKOFF v4 — Distributed Campaign + IA refactor (Builder execution prompt)

```
ROLE     = Builder (Opus 4.7) in worktree(s) per Phase dispatch
SOURCE   = .yagi-autobuild/phase-7/KICKOFF.md (vision, locked v4 — IA refactor 흡수)
PROTOCOL = codex-review-protocol.md K-05 (Codex 5.5) + K-06 (Opus subagent)
LOOP_MAX = per gate (L-052): HIGH=3, MED=2, LOW=1
HUMAN    = halt + chat 보고 on HALT trigger only
DISPATCH = HYBRID — wave 별 lead solo base + parallel sub-tasks
BASELINE = g-b-10-phase-7 (Wave A + HF4 + Wave B SHIPPED, 9 commits ahead of main)
PHASE_BRANCH = g-b-10-phase-7 (continue same branch)
```

⚠️ **CURRENT STATE (2026-05-05)**:
- Wave A SHIPPED (commit 5b932d4 + Hotfix-4)
- Wave B SHIPPED (commits c820056 + e3c4276)
- **Wave C ENTRY** ← 본 dispatch
- Wave D pending
- Wave E (ff-merge to main) = Wave D ship 후

⚠️ **SPEC v3 → v4 변경**: Wave C 에 **C.0 (IA refactor) 추가** (lead solo before C.1, 0.5d). 5 sub-items 자세한 detail 은 SPEC §"C.0".

## §0 — RUN ON ENTRY

```bash
# 1. Read source-of-truth
cat .yagi-autobuild/phase-7/KICKOFF.md
cat .yagi-autobuild/PRODUCT-MASTER.md  # esp. §K v1.7 priority + §Z v1.7 North Star + §W + §X + §V v1.6 + §Y
cat ~/.claude/skills/yagi-design-system/SKILL.md
cat ~/.claude/skills/yagi-context/SKILL.md
cat ~/.claude/skills/yagi-lessons/SKILL.md  # esp. L-019, L-022, L-045, L-048, L-049, L-050, L-051, L-052
cat ~/.claude/skills/yagi-wording-rules/SKILL.md
cat .yagi-autobuild/codex-review-protocol.md

# 2. Verify clean entry
git -C C:/Users/yout4/yagi-studio/yagi-workshop status --short
git -C C:/Users/yout4/yagi-studio/yagi-workshop branch --show-current  # expect: g-b-10-phase-7
git -C C:/Users/yout4/yagi-studio/yagi-workshop log --oneline -10  # 9 commits ahead of main 확인

# 3. Verify Wave A + HF4 + Wave B baseline
test -f src/components/admin/subtool-card.tsx && echo OK_HF4_SUBTOOLCARD
test -f src/app/[locale]/app/campaigns/request/page.tsx && echo OK_WAVE_B_REQUEST
test -f src/app/[locale]/app/admin/campaigns/[id]/review/page.tsx && echo OK_WAVE_B_REVIEW
test -f src/components/app/sidebar-nav.tsx && echo OK_SIDEBAR_NAV
grep -n "campaigns" src/components/app/sidebar-nav.tsx | head -5  # current 캠페인 parent 위치 확인
grep -n "challenges" src/components/app/sidebar-nav.tsx | head -5  # current 챌린지 parent 위치 확인
grep -n "admin_commissions\|admin_trash\|admin_support" src/components/app/sidebar-nav.tsx
grep -n "useWorkspace\|workspaceKind\|workspace.kind" src/lib/app/context.ts src/components/app/ -r | head -10

# 4. workspace.kind context expose 확인
grep -rn "workspace.kind\|workspaceKind" src/lib/app/ src/app/ | head -10
```

If any line above fails → HALT_E0_ENTRY_FAIL.

## §1 — STATE MACHINE (Wave C + D)

```
STATES = [INIT,
          C_0, K06_C_0, REVIEW_C_0,
          C_1, DISPATCH_C{C_2, C_3}, K05_C, K06_C, REVIEW_C,
          D_1, DISPATCH_D{D_2, D_3}, K05_D, K06_D, REVIEW_D,
          SHIPPED, HALT]
```

| Gate | Lead | Parallel | LOOP_MAX |
|---|---|---|---|
| **C.0 IA refactor** | lead solo | none | 2 (MED) — K-06 mandatory |
| C.1 응모 + creator workspace | lead solo | none | 3 (HIGH) — K-05 + K-06 |
| C.2 R2 / C.3 dashboard | parallel | parallel | 2 (MED) |
| D.1 검수 admin | lead solo | none | 2 (MED) |
| D.2 distribution / D.3 sponsor dashboard + email | parallel | parallel | 2 (MED) |

## §2 — GATES

### C_0 — IA refactor (MED, LOOP_MAX=2) ⭐ NEW

```
ENTRY: g-b-10-phase-7 main worktree. SPEC §"C.0" 5 sub-items + workspace.kind matrix read.
EXIT:
  - sidebar-nav.tsx 의 "캠페인" parent + 3 children 제거 → "+ 캠페인 요청" entry 만
    (work group 안 위치, workspace.kind='brand'/'artist' 만 visible)
  - "챌린지" parent + 3 children 완전 제거 (Phase 9 deferred, Hotfix-4 의 admin dashboard 7-card grid 안 챌린지 카드는 유지)
  - "의뢰 관리" / "휴지통" / "지원 채팅" sidebar entry 완전 제거 (admin dashboard sub-tool 만 진입)
  - 그룹 label 정리:
    * GROUPS 배열 = [work, communication, billing, system, operations]
    * i18n nav.groups: 작업 / 소통 / 정산 / 시스템 / 운영
    * "운영" group = yagi_admin 만 visible. items = [admin] (YAGI 관리)
  - [+ 새 프로젝트 시작] entry 사이드바 최상단 (workspace switcher 직후, group 밖 standalone)
    * workspace.kind='brand'/'artist' 만 visible
    * Phase 6 의 [새 프로젝트 시작] route 사용
  - workspace.kind 권한 matrix 정확:
    * brand/artist: + 새 프로젝트 시작 / 작업(대시보드/프로젝트/+ 캠페인 요청/추천 Artist) / 소통(미팅) / 정산(인보이스) / 시스템(설정)
    * creator: 작업(내 응모작 ← C.3 추가 시) / 시스템(설정)
    * yagi_admin: 위 모든 + 운영(YAGI 관리)
  - sidebar 가 client component 라 workspace.kind context expose 보장 (없으면 expose)
  - i18n keys 모두 KO + EN
  - Hotfix-4 의 admin dashboard /app/admin 의 7-card grid 그대로 (변경 X)
  - tsc + lint clean
FAIL on:
  - "챌린지" parent / sub-pages 잔존
  - "캠페인" parent / sub-pages 잔존
  - "의뢰 관리" / "휴지통" / "지원 채팅" sidebar entry 잔존
  - workspace.kind 권한 matrix 위반 (creator 가 [+ 새 프로젝트 시작] 노출 등)
  - 그룹 label 한글 정정 누락 ("워크스페이스" 잔존)
ON_FAIL_LOOP (L-052 cascade-vs-cycle):
  - 같은 finding 반복 → cycle, count=1
  - 새 finding from previous fix → cascade, count=0.5
  - HALT only when same-finding cycle exhausts at MAX=2

K06_C_0:
  - K-06 MANDATORY (sidebar = main IA)
  - Reviewer: fresh Opus subagent
  - Focus: 4-dimension + workspace.kind 별 sidebar (3 kind: brand/artist/creator + yagi_admin) screenshot review +
    그룹 label 워딩 + empty state (creator 의 매우 simple sidebar)
  - LOOP_MAX=2

LOG: GATE_EXIT C_0 ia_refactor=ok kind_matrix=PASS k06=PASS
```

### C_1 — workspaces.kind 'creator' + 응모 form (HIGH, LOOP_MAX=3)

```
ENTRY: C_0 + K06_C_0 PASS
EXIT:
  - workspaces.kind 'creator' 추가 (CHECK constraint update)
  - /campaigns/[slug]/submit (anon + authenticated)
  - submitCampaignApplicationAction (자동 magic-link, Talenthouse 패턴):
    * 기존 user (email match) 시 본인 workspace
    * 없으면 auth.users + workspaces (kind='creator') + workspace_members + campaign_submissions
    * magic-link 자동 발송
  - applicant_phone field required
  - allow_r2_upload + allow_external_url 결정에 따라 file path 분기
LOG: GATE_EXIT C_1 응모=ok creator_workspace=ok magic_link=ok
```

### C_2 — R2 응모작 upload (MED, LOOP_MAX=2, parallel)

```
EXIT:
  - presigned URL + direct upload + callback (Phase 5 R2 Hybrid 패턴 재사용)
  - allow_r2_upload=false 차단
  - thumbnail 자동 생성
LOG: GATE_EXIT C_2 r2_upload=ok thumbnail=ok
```

### C_3 — Creator dashboard + distribution URL 등록 (MED, LOOP_MAX=2, parallel)

```
EXIT:
  - /app/my-submissions (Creator workspace default)
  - 본인 응모작 list + status badge (submitted / approved_for_distribution / declined / distributed / withdrawn)
  - submission detail page:
    * 작품 preview
    * 검수 결과 (decision + comment)
    * status='approved_for_distribution' 시 [+ 유포 채널 추가] CTA
      - channel select (tiktok/instagram/youtube/youtube_shorts/x/other)
      - URL input + posted_at default now
      - → campaign_distributions INSERT + status='distributed' transition
    * status='distributed' 시 본인 distribution list + metric log
  - multi-distribution per submission OK
  - **C.0 의 sidebar matrix 의 creator 컬럼 — "내 응모작" entry 추가 (work group 안 1 entry only)**
  - 다른 user 응모작 read X (RLS)
LOG: GATE_EXIT C_3 dashboard=ok distribution_url=ok creator_sidebar_simple=ok
```

### D_1 — 검수 admin tool (MED, LOOP_MAX=2)

(이전 v3 동일)

### D_2 — Distribution tracking admin (MED, LOOP_MAX=2, parallel)

(이전 v3 동일)

### D_3 — Sponsor dashboard + email (MED, LOOP_MAX=2, parallel)

(이전 v3 동일)

### K05_X / K06_X — Wave 별 review

각 wave 종료 시:
- K-05 LOOP_MAX = wave 의 tier
- K-06 LOOP_MAX = 2
- Result file: `.yagi-autobuild/phase-7/_wave_<X>_codex_review.md` + `_wave_<X>_k06_design_review.md`
- L-052 cascade-vs-cycle 명시
- C.0 = K06 only (K05 SKIP — UI + workspace.kind 권한 만, server-side leak 가능성 낮음)

## §3 — DISPATCH_PARALLEL pattern (L-051 fail-fast)

C.2/C.3 parallel 시 + D.2/D.3 parallel 시 (Wave A/B 의 패턴 동일):

```bash
PHASE_BASE=$(git -C C:/Users/yout4/yagi-studio/yagi-workshop branch --show-current)
EXPECTED="g-b-10-phase-7"

if [ "$PHASE_BASE" != "$EXPECTED" ]; then
  echo "ERROR: PHASE_BASE not $EXPECTED (got $PHASE_BASE). Aborting."
  exit 1
fi

# C.2/C.3 예시 (C.1 SHIPPED 후)
git worktree add -b g-b-10-phase-7-c2-r2 ../yagi-workshop-c2 $PHASE_BASE
cp .env.local ../yagi-workshop-c2/.env.local
cd ../yagi-workshop-c2 && pnpm install --frozen-lockfile

git worktree add -b g-b-10-phase-7-c3-dashboard ../yagi-workshop-c3 $PHASE_BASE
cp .env.local ../yagi-workshop-c3/.env.local
cd ../yagi-workshop-c3 && pnpm install --frozen-lockfile

# Barrier (lead Builder)
cd C:/Users/yout4/yagi-studio/yagi-workshop
git fetch . g-b-10-phase-7-c2-r2 g-b-10-phase-7-c3-dashboard
git merge --ff-only g-b-10-phase-7-c2-r2
git merge --ff-only g-b-10-phase-7-c3-dashboard
git worktree remove ../yagi-workshop-c2 ../yagi-workshop-c3
pnpm exec tsc --noEmit && pnpm lint && pnpm build
```

C.0 + C.1 = lead solo (parallel X). D wave 도 동일 패턴.

## §4 — HALT codes

| Code | Trigger | Recovery |
|---|---|---|
| `E0_ENTRY_FAIL` | §0 step fail | 야기 chat |
| `E_C_0_LOOP_EXHAUSTED` | C.0 IA refactor fail at MAX=2 cycle | 야기 chat |
| `E_C_0_K06_BLOCKER` | K-06 BLOCK | 야기 chat |
| `E_<wave>_<gate>_LOOP_EXHAUSTED` | gate fail at LOOP_MAX (cycle) | 야기 chat |
| `E_<wave>_PARALLEL_FAIL` | parallel sub-task fail | 야기 chat |
| `E_<wave>_BARRIER_FAIL` | ff-merge fail | 야기 chat |
| `E_K05_<wave>_BLOCKER` | Codex HIGH-A/B | 야기 chat |
| `E_K06_<wave>_BLOCKER` | Opus BLOCK | 야기 chat |

## §5 — Reporting

After SHIPPED (Wave C 또는 Wave D 완료):

`.yagi-autobuild/phase-7/_wave_<X>_result.md`:
- Diffs summary
- Verify log (Wave 별 step PASS/FAIL)
- K-05 + K-06 verdicts
- FU 누적
- Combined: GO / GO with FU / HOLD

Then chat 야기:
- (a) commits per wave
- (b) verify summary
- (c) K-05 + K-06 verdicts
- (d) Wave 다음 entry 결정 또는 ff-merge GO 여부

GO.
