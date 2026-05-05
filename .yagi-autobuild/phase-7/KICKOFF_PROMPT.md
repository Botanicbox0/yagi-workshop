# Phase 7 KICKOFF v3 — Distributed Campaign (Builder execution prompt)

```
ROLE     = Builder (Opus 4.7) in worktree(s) per Phase dispatch
SOURCE   = .yagi-autobuild/phase-7/KICKOFF.md (vision, locked v3 PIVOT)
PROTOCOL = codex-review-protocol.md K-05 (Codex 5.5) + K-06 (Opus subagent)
LOOP_MAX = per gate (L-052): HIGH=3, MED=2, LOW=1
HUMAN    = halt + chat 보고 on HALT trigger only
DISPATCH = HYBRID — wave 별 lead solo base + parallel sub-tasks
BASELINE = main (Phase 6 + Hotfix-3 + v1.6 amendment ff-merged)
PHASE_BRANCH = g-b-10-phase-7
```

⚠️ **PIVOT NOTE**: SPEC v2 (Challenge MVP) deprecated. v3 = Distributed
Campaign (PRODUCT-MASTER §W + §X + §Y, v1.6 amendment).

## §0 — RUN ON ENTRY

```bash
# 1. Read source-of-truth
cat .yagi-autobuild/phase-7/KICKOFF.md
cat .yagi-autobuild/PRODUCT-MASTER.md  # esp. §K v1.6 update + §W (Distributed Campaign) + §X (schema) + §V v1.6 + §Y
cat ~/.claude/skills/yagi-design-system/SKILL.md
cat ~/.claude/skills/yagi-context/SKILL.md
cat ~/.claude/skills/yagi-lessons/SKILL.md  # esp. L-019, L-022, L-045, L-048, L-049, L-050, L-051, L-052
cat ~/.claude/skills/yagi-wording-rules/SKILL.md
cat .yagi-autobuild/codex-review-protocol.md

# 2. Verify clean entry
git -C C:/Users/yout4/yagi-studio/yagi-workshop status --short
git -C C:/Users/yout4/yagi-studio/yagi-workshop branch --show-current  # main
git -C C:/Users/yout4/yagi-studio/yagi-workshop log --oneline -5

# 3. Branch
git -C C:/Users/yout4/yagi-studio/yagi-workshop checkout -b g-b-10-phase-7

# 4. Verify pre-existing baseline
test -f src/app/[locale]/onboarding/artist/page.tsx && echo OK_PHASE_6
test -f src/components/sidebar/workspace-switcher.tsx && echo OK_SWITCHER
test -f src/lib/supabase/service.ts && echo OK_SERVICE_CLIENT
grep -l "presigned" src/lib/ -r | head -3 && echo OK_R2_PATTERN
test -f src/middleware.ts && grep -c "showcase\\|challenges" src/middleware.ts
```

If any line fails → HALT_E0_ENTRY_FAIL.

## §1 — STATE MACHINE

```
STATES = [INIT,
          A_1, DISPATCH_A{A_2, A_3, A_4}, K05_A, K06_A, REVIEW_A,
          B_1, DISPATCH_B{B_2}, K05_B, K06_B, REVIEW_B,
          C_1, DISPATCH_C{C_2, C_3}, K05_C, K06_C, REVIEW_C,
          D_1, DISPATCH_D{D_2, D_3}, K05_D, K06_D, REVIEW_D,
          SHIPPED, HALT]
```

| Wave | Lead | Parallel | LOOP_MAX |
|---|---|---|---|
| A | A.1 schema | A.2 admin / A.3 public landing / A.4 middleware | A.1=3 / A.2~A.4=2 |
| B | B.1 sponsor request entry | B.2 admin queue + approval | B.1,B.2=3 |
| C | C.1 응모 + creator workspace | C.2 R2 / C.3 dashboard | C.1=3 / C.2,C.3=2 |
| D | D.1 검수 admin | D.2 distribution / D.3 sponsor dashboard + email | D=2 |

## §2 — GATES

### A_1 — Schema (HIGH, LOOP_MAX=3)

```
ENTRY: g-b-10-phase-7. SPEC §"A.1" + L-019 + L-049 + L-052 read.
EXIT:
  - 5 테이블 (campaigns + categories + submissions + review_decisions + distributions)
  - RLS 4-role audit (admin / sponsor brand+artist / applicant / public)
  - sponsor_workspace_id RLS 가 'brand' + 'artist' 둘 다 허용
  - campaign_distributions = NEW entity (creator 본인 채널 유포 metadata)
  - column-level grant lockdown (campaigns 의 status/decision_metadata, submissions 의 status, distributions 의 metric)
  - L-019 pre-flight (sponsor 후보 0건)
  - migration apply (Supabase MCP)
  - types regen
  - tsc + lint + build clean
ON_FAIL_LOOP (L-052 cascade-vs-cycle):
  - 같은 finding 반복 → cycle, count=1
  - 새 finding from previous fix → cascade, count=0.5
LOG: GATE_EXIT A_1 schema=ok rls_4role=PASS distributions_table=ok
```

### A_2 — Admin campaign create/edit + publish (MED, LOOP_MAX=2, parallel)

```
EXIT:
  - /admin/campaigns list + create/edit
  - title + brief + reference_assets (URL list editor) + multi-category + file policy + compensation_model
  - publishCampaignAction (draft → published)
  - yagi_admin only access
  - 워딩 cross-check (Sponsor/Submission/Track/Roster 영문 노출 0)
LOG: GATE_EXIT A_2 admin_tool=ok wording_check=PASS
```

### A_3 — Public campaign landing (MED, LOOP_MAX=2, parallel)

```
EXIT:
  - /campaigns (locale-free list) + /campaigns/[slug] (detail)
  - status IN ('published','submission_closed','distributing','archived') 만 노출
  - distributed showcase gallery (status='distributing'/'archived' 시 creator distribution URL 노출 — 본 product 의 핵심 가치)
  - yagi-design-system 적용
  - empty state placeholder (캠페인 0 / submission 0 / distribution 0)
LOG: GATE_EXIT A_3 public_landing=ok showcase_gallery=ok empty_state=ok
```

### A_4 — Middleware update (MED, LOOP_MAX=2, parallel)

```
EXIT:
  - src/middleware.ts matcher 에 'campaigns' 추가 (locale-free)
  - "/((?!api|_next|_vercel|auth/callback|auth/confirm|showcase|challenges|campaigns|.*\\..*).*)"
  - /campaigns 진입 시 locale prefix X
LOG: GATE_EXIT A_4 middleware_campaigns_locale_free=ok
```

### B_1 — [+ 캠페인 요청] entry (HIGH, LOOP_MAX=3)

```
ENTRY: K05_A + K06_A PASS
EXIT:
  - Brand workspace 사이드바 [+ 캠페인 요청] entry 노출
  - **Artist workspace 사이드바 third entry [+ 캠페인 요청]** (PRODUCT-MASTER v1.6 §Y)
  - Brand workspace 의 [브랜드 협업 제안] (Phase 10 까지 hidden 또는 Coming Soon)
  - workspace.kind='creator' 노출 X (creator 는 sponsor 불가)
  - /app/campaigns/request 폼:
    * title (required)
    * brief (required)
    * reference_assets (URL list, optional)
    * 일정 의도
    * 후원 의도
    * compensation 의도 (exposure_only / fixed_fee + amount)
    * 추가 메모
    * **담당자 번호 phone (required)**
  - requestCampaignAction (RLS WITH CHECK 가 workspace.kind IN ('brand', 'artist') 검증)
  - 본인 요청 list 확인 (sponsor SELECT policy)
LOG: GATE_EXIT B_1 entry_brand+artist=ok phone_required=ok
```

### B_2 — Admin queue + approval (HIGH, LOOP_MAX=3, parallel)

```
EXIT:
  - /admin/campaigns list 의 status='requested' filter
  - 4-action (review/approve/decline/request_more_info)
  - decision_metadata audit trail
  - sponsor email notification (4 status transition)
LOG: GATE_EXIT B_2 admin_queue=ok email_notif=ok
```

### C_1 — workspaces.kind 'creator' + 응모 form (HIGH, LOOP_MAX=3)

```
ENTRY: K05_B + K06_B PASS
EXIT:
  - workspaces.kind 'creator' 추가
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
    * **status='approved_for_distribution' 시 [+ 유포 채널 추가] CTA**
      - channel select (tiktok/instagram/youtube/youtube_shorts/x/other)
      - URL input
      - posted_at default now
      - → campaign_distributions INSERT + status='distributed' transition
    * **status='distributed' 시 본인 distribution list + metric log**
      - view/like/comment 수 manual 입력
  - multi-distribution per submission OK (한 작품 → 여러 채널 유포)
  - 다른 user 응모작 read X (RLS)
LOG: GATE_EXIT C_3 dashboard=ok distribution_url_registration=ok multi_channel=ok
```

### D_1 — 검수 admin tool (MED, LOOP_MAX=2)

```
ENTRY: K05_C + K06_C PASS
EXIT:
  - /admin/campaigns/[id]/review
  - 응모작 list per category + 작품 preview + 검수 form (approved / declined / revision_requested + comment)
  - bulk action
  - campaign_review_decisions audit trail
LOG: GATE_EXIT D_1 review=ok single_round=ok
```

### D_2 — Distribution tracking admin (MED, LOOP_MAX=2, parallel)

```
EXIT:
  - /admin/campaigns/[id]/distributions
  - distributed submissions list per channel + URL + posted_at + metric
  - admin metric log (creator 가 안 한 경우 admin manual 입력)
  - aggregate dashboard (view 합계, channel 분포, top creator)
LOG: GATE_EXIT D_2 distribution_admin=ok aggregate_dashboard=ok
```

### D_3 — Sponsor dashboard + email (MED, LOOP_MAX=2, parallel)

```
EXIT:
  - sponsor (brand/artist workspace) campaign detail dashboard:
    * 본인 sponsor 캠페인의 distribution status
    * aggregate metrics (view 합계, channel 분포)
    * creator distribution list (link 클릭 가능)
  - email notification:
    * creator: status='approved_for_distribution' / 'declined' / 'revision_requested'
    * sponsor: 첫 distribution / 'distributing' → 'archived' final 결과
  - 워딩 cross-check
LOG: GATE_EXIT D_3 sponsor_dashboard=ok email=ok wording_check=PASS
```

### K05_X / K06_X — Wave 별 review

각 wave 종료 시:
- K-05 LOOP_MAX = wave 의 tier
- K-06 LOOP_MAX = 2
- Result file: `.yagi-autobuild/phase-7/_wave_<X>_codex_review.md` + `_wave_<X>_k06_design_review.md`
- L-052 cascade-vs-cycle 명시

## §3 — DISPATCH_PARALLEL pattern (L-051 fail-fast)

```bash
PHASE_BASE=$(git -C C:/Users/yout4/yagi-studio/yagi-workshop branch --show-current)
EXPECTED="g-b-10-phase-7"

if [ "$PHASE_BASE" != "$EXPECTED" ]; then
  echo "ERROR: PHASE_BASE not $EXPECTED (got $PHASE_BASE). Aborting."
  exit 1
fi

# Wave A 예시 (A_1 SHIPPED 후, 3 parallel)
git worktree add -b g-b-10-phase-7-a2-admin ../yagi-workshop-a2 $PHASE_BASE
cp .env.local ../yagi-workshop-a2/.env.local
cd ../yagi-workshop-a2 && pnpm install --frozen-lockfile

git worktree add -b g-b-10-phase-7-a3-landing ../yagi-workshop-a3 $PHASE_BASE
cp .env.local ../yagi-workshop-a3/.env.local
cd ../yagi-workshop-a3 && pnpm install --frozen-lockfile

git worktree add -b g-b-10-phase-7-a4-middleware ../yagi-workshop-a4 $PHASE_BASE
cp .env.local ../yagi-workshop-a4/.env.local
cd ../yagi-workshop-a4 && pnpm install --frozen-lockfile

# Barrier (lead Builder)
cd C:/Users/yout4/yagi-studio/yagi-workshop
git fetch . g-b-10-phase-7-a2-admin g-b-10-phase-7-a3-landing g-b-10-phase-7-a4-middleware
git merge --ff-only g-b-10-phase-7-a2-admin
git merge --ff-only g-b-10-phase-7-a3-landing
git merge --ff-only g-b-10-phase-7-a4-middleware
git worktree remove ../yagi-workshop-a2 ../yagi-workshop-a3 ../yagi-workshop-a4
pnpm exec tsc --noEmit && pnpm lint && pnpm build
```

각 wave 동일 패턴 (Wave B/C/D 도 lead solo + parallel x 1-2).

## §4 — HALT codes

| Code | Trigger | Recovery |
|---|---|---|
| `E0_ENTRY_FAIL` | §0 step fail | 야기 chat |
| `E_<wave>_<gate>_LOOP_EXHAUSTED` | gate fail at LOOP_MAX (cycle) | 야기 chat |
| `E_<wave>_PARALLEL_FAIL` | parallel sub-task fail | 야기 chat |
| `E_<wave>_BARRIER_FAIL` | ff-merge fail | 야기 chat |
| `E_K05_<wave>_BLOCKER` | Codex HIGH-A/B | 야기 chat |
| `E_K06_<wave>_BLOCKER` | Opus BLOCK | 야기 chat |

## §5 — Reporting

After SHIPPED:

`.yagi-autobuild/phase-7/_phase_7_result.md`:
- Diffs summary
- Verify log (35 step PASS/FAIL)
- K-05 + K-06 verdicts per wave (4 waves × 2 = 8 verdicts)
- FU 누적
- Combined: GO / GO with FU / HOLD

Then chat 야기:
- (a) commits per wave
- (b) verify summary
- (c) K-05 + K-06 verdicts
- (d) ff-merge GO 여부

GO.
