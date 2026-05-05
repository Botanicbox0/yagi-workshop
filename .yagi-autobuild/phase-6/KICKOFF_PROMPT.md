# Phase 6 KICKOFF (Builder execution prompt)

```
ROLE     = Builder (Opus 4.7) in worktree(s) per Phase dispatch
SOURCE   = .yagi-autobuild/phase-6/KICKOFF.md (vision, locked v2)
PROTOCOL = codex-review-protocol.md K-05 (Codex 5.5) + K-06 (Opus subagent)
LOOP_MAX = 2 per fail
HUMAN    = halt + chat 보고 on HALT trigger only
DISPATCH = HYBRID — A.1 lead solo base / A.2 + A.3 parallel x 2 / B.1 + B.2 parallel x 2
BASELINE = main (commit fc7c754, Phase 5 ff-merged)
PHASE_BRANCH = g-b-10-phase-6
```

---

## §0 — RUN ON ENTRY

Execute this block first. Do not deviate. Do not ask.

```bash
# 1. Read source-of-truth
cat .yagi-autobuild/phase-6/KICKOFF.md
cat .yagi-autobuild/PRODUCT-MASTER.md  # esp. §K (Artist scope) + §L (schema) + §M (워딩 룰)
cat ~/.claude/skills/yagi-design-system/SKILL.md
cat ~/.claude/skills/yagi-context/SKILL.md
cat ~/.claude/skills/yagi-lessons/SKILL.md  # esp. L-019, L-022, L-045, L-048, L-049, L-050, L-051
cat ~/.claude/skills/yagi-wording-rules/SKILL.md  # PRODUCT-MASTER §M mirror
cat .yagi-autobuild/codex-review-protocol.md  # K-05 + K-06 protocol

# 2. Verify clean entry state (Phase 5 main 머지 완료)
git -C C:/Users/yout4/yagi-studio/yagi-workshop status --short  # expect: clean
git -C C:/Users/yout4/yagi-studio/yagi-workshop branch --show-current  # expect: main
git -C C:/Users/yout4/yagi-studio/yagi-workshop log --oneline -5  # expect: fc7c754 at top

# 3. Branch off main for phase-6
git -C C:/Users/yout4/yagi-studio/yagi-workshop checkout -b g-b-10-phase-6

# 4. Verify schema baseline
test -f supabase/migrations/ && echo OK_MIGRATIONS_DIR
ls supabase/migrations/ | tail -5  # 최근 migration 확인
test -f src/lib/supabase/database.types.ts && echo OK_TYPES
test -f src/lib/supabase/service.ts && echo OK_SERVICE_CLIENT

# 5. Verify pre-existing components (Wave A.2 가 reference 할 것들)
test -f src/components/sidebar/ && echo OK_SIDEBAR_DIR
grep -l "DropdownMenu" src/components/ui/ -r | head -3  # shadcn dropdown
grep -l "AlertDialog" src/components/ui/ -r | head -3
grep -l "workspaces" src/lib/ -r | head -3  # active workspace logic
```

If any line above outputs a non-zero exit code or an error, transition to `HALT_E0_ENTRY_FAIL`.

---

## §1 — STATE MACHINE

```
STATES = [INIT, A_1, DISPATCH_A_PARALLEL, K05_A, K06_A, REVIEW_A,
          DISPATCH_B_PARALLEL, K05_B, K06_B, REVIEW_B, SHIPPED, HALT]

Sequence:
  INIT → A_1 → DISPATCH_A_PARALLEL{A_2, A_3}
       → K05_A + K06_A (parallel) → REVIEW_A
       → DISPATCH_B_PARALLEL{B_1, B_2}
       → K05_B + K06_B (parallel) → REVIEW_B
       → SHIPPED
```

| From | Event | To | Action |
|---|---|---|---|
| INIT | §0 success | A_1 | log GATE_ENTER A_1 |
| INIT | §0 fail | HALT | escalate E0_ENTRY_FAIL |
| A_1 | exit_passed | DISPATCH_A_PARALLEL | commit + push + spawn 2 worktrees per §3 |
| A_1 | fail_loop_3 | HALT | E_A1_LOOP_EXHAUSTED |
| DISPATCH_A_PARALLEL | both A_2 + A_3 exit_passed | K05_A+K06_A | barrier ff-merge to phase branch |
| DISPATCH_A_PARALLEL | any 1 fail_loop_3 | HALT | E_A_PARALLEL_FAIL |
| K05_A+K06_A | both PASS or LOW only | REVIEW_A | aggregate Wave A results |
| K05_A+K06_A | K05 HIGH-A/B | HALT | E_K05_A_BLOCKER (auth/RLS) |
| K05_A+K06_A | K06 HIGH/BLOCK | HALT | E_K06_A_BLOCKER (design must-fix) |
| K05_A+K06_A | MED only | REVIEW_A | scale-aware: <100 user → FU register |
| REVIEW_A | wave_a_verify_pass | DISPATCH_B_PARALLEL | log + spawn 2 worktrees per §4 |
| REVIEW_A | wave_a_verify_fail | A_(matched) | re-enter (loop budget 2) |
| DISPATCH_B_PARALLEL | both B_1 + B_2 exit_passed | K05_B+K06_B | barrier ff-merge to phase branch |
| DISPATCH_B_PARALLEL | any 1 fail_loop_3 | HALT | E_B_PARALLEL_FAIL |
| K05_B+K06_B | both PASS or LOW only | REVIEW_B | aggregate Wave B results |
| K05_B+K06_B | K05 HIGH-A/B | HALT | E_K05_B_BLOCKER |
| K05_B+K06_B | K06 HIGH/BLOCK | HALT | E_K06_B_BLOCKER |
| REVIEW_B | all_verify_pass | SHIPPED | report 야기 chat for ff-merge GO |
| REVIEW_B | verify_fail | B_(matched) | re-enter (loop budget 2) |

Transitions deterministic.

---

## §2 — GATES

### A_1 — artist_profile schema migration (lead solo base, 1d, Sonnet)

```
ENTRY:
  - working dir = main worktree on new branch g-b-10-phase-6
  - SPEC §"A.1" + L-019 (pre-flight prod data 확인) + L-022 (types regen) read
  - L-049 multi-role audit 패턴 적용 의무
EXIT (all required):
  - migration 파일 작성 (supabase/migrations/<timestamp>_phase_6_artist_profile.sql)
  - 모든 RLS policy 작성 (SELECT / INSERT / UPDATE / DELETE)
  - Column-level grant lockdown (twin_status / visibility_mode / bypass_*)
  - L-019 pre-flight: SELECT count workspaces WHERE kind='artist' = 0 확인
  - migration apply (Supabase MCP execute_sql 또는 supabase db push)
  - database.types.ts regen
  - RLS multi-role smoke (4 perspective: client / ws_admin / yagi_admin / different-user)
  - tsc + lint + build clean
FAIL on:
  - Column grant 누락 (Artist 가 twin_status 직접 update 가능)
  - RLS USING/WITH CHECK mismatch (insert 시 yagi_admin 외 user 가 row 만듦)
  - DELETE policy 누락 (Artist 가 본인 row 삭제 가능)
  - types regen 누락 (Phase 6 후속 wave 가 raw any-cast 로 우회)
ON_FAIL_LOOP:
  - loop 1: RLS policy 4-role 표 작성 + 누락 보강
  - loop 2: column grant 명시 + supabase MCP 로 verify
LOG: GATE_EXIT A_1 migration_applied=ok types_regen=ok rls_4role=PASS
COMMIT: feat(phase-6/A.1): artist_profile schema + RLS + column grants
```

### A_2 — workspaces.kind 'artist' + workspace switcher UI (parallel, 2d, Sonnet)

```
ENTRY:
  - A_1 SHIPPED + commit + push, parallel worktree spawned (g-b-10-phase-6-a2-switcher)
  - SPEC §"A.2" read
EXIT (all required):
  - migration: ALTER workspaces_kind_check IN ('brand', 'agency', 'artist')
  - workspace switcher UI 컴포넌트 — Linear 식 좌측 sidebar 하단 dropdown
  - dropdown content: 그룹 (Brand / Artist) + 현재 workspace 표시 + + 새 워크스페이스 만들기 (yagi_admin only)
  - Artist sign in 시 default = 본인 Artist workspace (workspace_members 의 last_active 또는 첫 row)
  - 워딩 cross-check: "Roster" → "소속 아티스트" / "아티스트 명단" (yagi-wording-rules skill cross-ref)
  - tsc + lint + build clean
FAIL on:
  - Internal 워딩 ("Routing" / "Roster" 영문 그대로 한국어 UI) i18n value 노출
  - workspace switcher trigger 가 yagi_admin 만 visible (Artist 도 본인 + Brand 확인 가능해야)
  - "+ 새 워크스페이스 만들기" 가 비-admin 에게 visible
ON_FAIL_LOOP:
  - loop 1: i18n key value grep + 워딩 cross-check
  - loop 2: dropdown gating (yagi_admin 조건) 명시 verify
LOG: GATE_EXIT A_2 kind_check=ok switcher_ui=ok wording_check=PASS
COMMIT: feat(phase-6/A.2): workspaces.kind=artist + workspace switcher (Linear 식)
```

### A_3 — Artist invite + 1-step onboarding (parallel, 2d, Sonnet)

```
ENTRY:
  - A_1 SHIPPED + commit + push, parallel worktree spawned (g-b-10-phase-6-a3-invite)
  - SPEC §"A.3" + L-048 (service-role for admin writes) + L-049 read
EXIT (all required):
  - inviteArtistAction server action (yagi_admin only verify, service-role client)
    * Supabase auth admin API 로 magic-link invite 생성
    * workspaces / workspace_members / artist_profile rows 생성 (instagram_handle = NULL)
    * email 자동 발송 verify
  - completeArtistOnboardingAction server action (workspace_member 본인 only)
    * artist_profile.instagram_handle UPDATE (NOT NULL after this point)
    * redirect to /[locale]/app/projects
    * instagram_handle IS NOT NULL 인 상태에서 재호출 시 idempotent 또는 forbidden
  - /admin/artists 페이지 + invite 폼 + 명단 list (Instagram + 상태 컬럼 — ⏳ invite / ⏳ onboarding / ✅ 활성)
  - /[locale]/onboarding/artist 1-step page + Instagram handle 입력 form
  - Onboarding gate (layout 또는 middleware): workspace.kind='artist' AND artist_profile.instagram_handle IS NULL → /onboarding/artist redirect
  - i18n keys (워딩 cross-check 통과)
  - yagi_admin only access for /admin/artists (다른 role notFound)
  - tsc + lint + build clean
FAIL on:
  - inviteArtistAction guard 누락 (anyone-invites-anyone)
  - completeArtistOnboardingAction 가 workspace_member 외 user 도 update 가능
  - Onboarding gate 누락 (instagram_handle IS NULL 인 Artist 가 /app/projects 직접 진입 가능)
  - magic-link email template 의 wording 이 internal (e.g., "Onboarding wizard" 노출)
ON_FAIL_LOOP:
  - loop 1: guard + multi-role audit walk
  - loop 2: gate 위치 (layout vs middleware) 명시 + chat 으로 야기에게 1줄 confirm
LOG: GATE_EXIT A_3 invite=ok onboarding_gate=ok admin_tool=ok
COMMIT: feat(phase-6/A.3): Artist invite + 1-step onboarding + admin tool
```

### K05_A + K06_A (parallel after Wave A barrier)

```
ENTRY:
  - A_1 + A_2 + A_3 all SHIPPED, ff-merged to g-b-10-phase-6
EXIT:
  - K05_A: Codex 5.5 review on Wave A diff. MANDATORY (HIGH tier — RLS + auth admin API).
    * Focus: artist_profile RLS 4-role audit + inviteArtistAction guard + completeArtistOnboardingAction gate + column grant lockdown
    * Result: .yagi-autobuild/phase-6/_wave_a_codex_review.md
    * Findings 파싱 → severity. HIGH-A/B → HALT inline fix. MED-B/C → FU. LOW → ignore.
  - K06_A: Fresh Opus subagent design review. MANDATORY (workspace switcher + admin tool + onboarding page).
    * 4-dimension + yagi-wording-rules cross-check
    * Result: .yagi-autobuild/phase-6/_wave_a_k06_design_review.md
    * Findings 파싱 → severity. HIGH/BLOCK → HALT. MED → FU.
LOG: GATE_EXIT K05_A verdict=<...> K06_A verdict=<...>
```

### B_1 — Briefing Canvas Artist regression smoke (parallel, 1-2d, Haiku/Sonnet)

```
ENTRY:
  - K05_A + K06_A PASS, parallel worktree spawned (g-b-10-phase-6-b1-regression)
  - SPEC §"B.1" read
EXIT (all required):
  - Artist sign in → /projects/new → Step 1~3 → 의뢰 정상 생성
  - Brand workspace 의뢰 생성 regression 0 (smoke)
  - workspace_id, created_by, intake_mode, kind 정확 기록
  - 변경 사항 0 또는 minor i18n 정정만 (큰 코드 변경 X)
  - tsc + lint + build clean
FAIL on:
  - Artist 의뢰 생성 시 workspace_id 가 다른 workspace 로 잘못 기록
  - Brand workspace regression 발생
  - intake_mode='brief', kind='direct' 이외 값 기록
ON_FAIL_LOOP:
  - loop 1: active workspace resolution 로직 grep + Artist case 추가 verify
  - loop 2: regression 의 정확한 case grep + i18n / wiring 정정만
LOG: GATE_EXIT B_1 artist_intake=ok brand_regression=0
COMMIT: chore(phase-6/B.1): Artist Briefing Canvas regression smoke
```

### B_2 — has_external_brand_party toggle (parallel, 2-3d, Sonnet)

```
ENTRY:
  - K05_A + K06_A PASS, parallel worktree spawned (g-b-10-phase-6-b2-toggle)
  - SPEC §"B.2" read
EXIT (all required):
  - migration: ALTER projects ADD COLUMN has_external_brand_party boolean NOT NULL DEFAULT false
  - column grant: GRANT UPDATE (has_external_brand_party) (sub_5 패턴, status='draft' 만)
  - types regen
  - Step 3 toggle UI (Builder 자율 위치) + i18n key (워딩 cross-check 통과)
  - 의뢰 detail 브리프 tab 에 read-only field 추가 ("외부 광고주 여부" 또는 야기-wording-rules 검색 후 결정)
  - status='draft' 이외에서 update 차단 verify (column grant + RLS)
  - tsc + lint + build clean
FAIL on:
  - column grant 누락 (status='in_review' 등에서 update 가능)
  - i18n key value 가 internal 워딩 ("External Brand Boost" / "Type 3" 노출)
  - 브리프 tab read-only 표시 누락
ON_FAIL_LOOP:
  - loop 1: column grant SQL grep + sub_5 패턴 재사용
  - loop 2: i18n value 워딩 cross-check + 야기 confirm 1줄
LOG: GATE_EXIT B_2 column_added=ok grant_lockdown=ok wording=PASS
COMMIT: feat(phase-6/B.2): has_external_brand_party + Step 3 toggle
```

### K05_B + K06_B (parallel after Wave B barrier)

```
ENTRY:
  - B_1 + B_2 all SHIPPED, ff-merged to g-b-10-phase-6
EXIT:
  - K05_B: Codex 5.5 review on Wave B diff. MED tier — column grant + RLS.
    * Focus: has_external_brand_party RLS 4-role + status='draft' guard + column grant
    * Result: .yagi-autobuild/phase-6/_wave_b_codex_review.md
  - K06_B: Fresh Opus subagent. MED tier — toggle UI + 브리프 tab read-only 표시.
    * 4-dimension + 워딩 cross-check
    * Result: .yagi-autobuild/phase-6/_wave_b_k06_design_review.md
LOG: GATE_EXIT K05_B verdict=<...> K06_B verdict=<...>
```

---

## §3 — DISPATCH_A_PARALLEL (after A_1)

```bash
PHASE_BASE=$(git -C C:/Users/yout4/yagi-studio/yagi-workshop branch --show-current)
EXPECTED="g-b-10-phase-6"

# CRITICAL (L-051): verify $PHASE_BASE before worktree add
if [ "$PHASE_BASE" != "$EXPECTED" ]; then
  echo "ERROR: PHASE_BASE not $EXPECTED (got $PHASE_BASE). Aborting."
  exit 1
fi

# A_2 worktree (Sonnet, 2d, switcher)
git worktree add -b g-b-10-phase-6-a2-switcher ../yagi-workshop-a2 $PHASE_BASE
cp .env.local ../yagi-workshop-a2/.env.local
cd ../yagi-workshop-a2 && pnpm install --frozen-lockfile

# A_3 worktree (Sonnet, 2d, invite + onboarding)
git worktree add -b g-b-10-phase-6-a3-invite ../yagi-workshop-a3 $PHASE_BASE
cp .env.local ../yagi-workshop-a3/.env.local
cd ../yagi-workshop-a3 && pnpm install --frozen-lockfile
```

**Cross-task dependency**:
- A_2 (workspace switcher) 와 A_3 (Artist sign in 후 본인 workspace 진입)
  이 *동일 active-workspace 로직* 의존. Lead Builder 가 A_2 결과 commit 후
  A_3 가 그것 위에 build (sequential dep) 또는 둘 다 placeholder 사용 후
  barrier merge 시 통합. 권장 = 후자 (placeholder + barrier 통합).

**Barrier (lead Builder 책임)**:
```bash
cd C:/Users/yout4/yagi-studio/yagi-workshop
git fetch . g-b-10-phase-6-a2-switcher g-b-10-phase-6-a3-invite
git merge --ff-only g-b-10-phase-6-a2-switcher
git merge --ff-only g-b-10-phase-6-a3-invite
git worktree remove ../yagi-workshop-a2 ../yagi-workshop-a3

# barrier verify
pnpm exec tsc --noEmit && pnpm lint && pnpm build
```

ff conflict 시: merge --no-ff with explicit message + manual resolve.

---

## §4 — DISPATCH_B_PARALLEL (after Wave A REVIEW)

```bash
PHASE_BASE=$(git -C C:/Users/yout4/yagi-studio/yagi-workshop branch --show-current)
EXPECTED="g-b-10-phase-6"

if [ "$PHASE_BASE" != "$EXPECTED" ]; then
  echo "ERROR: PHASE_BASE not $EXPECTED (got $PHASE_BASE). Aborting."
  exit 1
fi

# B_1 worktree (Haiku/Sonnet, 1-2d, regression smoke)
git worktree add -b g-b-10-phase-6-b1-regression ../yagi-workshop-b1 $PHASE_BASE
cp .env.local ../yagi-workshop-b1/.env.local
cd ../yagi-workshop-b1 && pnpm install --frozen-lockfile

# B_2 worktree (Sonnet, 2-3d, toggle + column)
git worktree add -b g-b-10-phase-6-b2-toggle ../yagi-workshop-b2 $PHASE_BASE
cp .env.local ../yagi-workshop-b2/.env.local
cd ../yagi-workshop-b2 && pnpm install --frozen-lockfile
```

**Barrier**: Wave A barrier 패턴 동일.

---

## §5 — HALT codes

| Code | Trigger | Recovery |
|---|---|---|
| `E0_ENTRY_FAIL` | §0 step 실패 | 야기 chat: missing file/branch/MCP |
| `E_A1_LOOP_EXHAUSTED` | A_1 fail loop 3 | 야기 review RLS strategy |
| `E_A_PARALLEL_FAIL` | A_2 또는 A_3 fail loop 3 | 야기 chat with sub_id |
| `E_A_BARRIER_FAIL` | Wave A ff-merge tsc/lint/build fail | 야기 chat with diff summary |
| `E_K05_A_BLOCKER` | Codex Wave A HIGH-A/B | 야기 chat: paste finding + fix plan |
| `E_K06_A_BLOCKER` | Opus Wave A BLOCK | 야기 chat: paste finding |
| `E_B_PARALLEL_FAIL` | B_1 또는 B_2 fail loop 3 | 야기 chat with sub_id |
| `E_B_BARRIER_FAIL` | Wave B ff-merge fail | 야기 chat with diff summary |
| `E_K05_B_BLOCKER` | Codex Wave B HIGH-A/B | 야기 chat |
| `E_K06_B_BLOCKER` | Opus Wave B BLOCK | 야기 chat |

---

## §6 — Reporting

After SHIPPED gate (or HALT):

Final report file: `.yagi-autobuild/phase-6/_phase_6_result.md`

Sections:
- Diffs summary (commits per gate + file count)
- Verify log summary (20 steps PASS/FAIL)
- K-05 Wave A + Wave B verdicts + findings
- K-06 Wave A + Wave B verdicts + findings
- Combined recommendation: GO / GO with FU / HOLD
- Open questions (있다면)
- Ready-to-merge: YES / NO

Then chat 야기 with:
- (a) commits made (hashes per gate)
- (b) verify summary (20 steps)
- (c) K-05 Wave A/B verdicts 1줄씩
- (d) K-06 Wave A/B verdicts 1줄씩
- (e) combined recommendation + ff-merge GO 여부

---

GO.
