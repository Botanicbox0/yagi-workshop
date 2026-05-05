# Phase 6 Hotfix-3 KICKOFF (Builder execution prompt)

```
ROLE     = Builder (Sonnet 4.5) — single instance, no parallel
SOURCE   = .yagi-autobuild/phase-6-hf3/SPEC.md (vision, locked v1)
PROTOCOL = simplified hotfix (K-05 SKIP, K-06 optional, manual smoke by 야기)
LOOP_MAX = 2 per fail
HUMAN    = halt + chat 보고 on HALT trigger only
BASELINE = main (Phase 6 ff-merged)
PHASE_BRANCH = g-b-10-hf3
```

## §0 — RUN ON ENTRY

```bash
# 1. Read source
cat .yagi-autobuild/phase-6-hf3/SPEC.md
cat ~/.claude/skills/yagi-design-system/SKILL.md  # logo dimension token check
cat ~/.claude/skills/yagi-wording-rules/SKILL.md  # 워딩 cross-check

# 2. Verify baseline
git -C C:/Users/yout4/yagi-studio/yagi-workshop status --short  # clean
git -C C:/Users/yout4/yagi-studio/yagi-workshop branch --show-current  # main

# 3. Branch
git -C C:/Users/yout4/yagi-studio/yagi-workshop checkout -b g-b-10-hf3

# 4. Verify pre-existing files
test -f src/components/app/sidebar-brand.tsx && echo OK_SIDEBAR_BRAND_REFERENCE
test -f src/app/[locale]/\(auth\)/layout.tsx && echo OK_AUTH_LAYOUT
test -f src/app/[locale]/auth/layout.tsx && echo OK_AUTH_CALLBACK_LAYOUT
test -f src/app/[locale]/onboarding/layout.tsx && echo OK_ONBOARDING_LAYOUT
test -f src/lib/app/signout-action.ts && echo OK_SIGNOUT_ACTION
test -f src/app/[locale]/page.tsx && echo OK_LANDING_PAGE
test -f public/brand/yagi-icon-logo-black.png && echo OK_NEW_LOGO_ICON
test -f public/brand/yagi-text-logo-black.png && echo OK_NEW_LOGO_TEXT
```

## §1 — STATE MACHINE

```
STATES = [INIT, HF3_1, HF3_2, HF3_3, HF3_4, SHIPPED, HALT]
Sequence: INIT → HF3_1 → HF3_2 → HF3_3 → HF3_4 → SHIPPED (sequential)
```

| From | Event | To |
|---|---|---|
| INIT | §0 success | HF3_1 |
| HF3_1 | exit_passed | HF3_2 |
| HF3_2 | exit_passed | HF3_3 |
| HF3_3 | exit_passed | HF3_4 |
| HF3_4 | exit_passed | SHIPPED |
| any | fail_loop_2 | HALT |

## §2 — GATES

### HF3_1 — Auth surface logo unification (15분)

```
ENTRY:
  - working dir = main worktree on g-b-10-hf3
  - SPEC §"HF3.1" + sidebar-brand.tsx 패턴 read
EXIT:
  - 3개 file (auth/layout, auth callback layout, onboarding layout) 의
    image block 을 sidebar-brand.tsx 패턴 (icon 28×28 + text 56×18 + gap-2.5) 으로 교체
  - yagi-wordmark.png import 0건 in 3개 file
  - tsc + lint clean
LOG: GATE_EXIT HF3_1 logo_files_updated=3
```

### HF3_2 — Logout redirect (10분)

```
ENTRY:
  - SPEC §"HF3.2" read
EXIT:
  - signout-action.ts 의 redirect target 가 /signin (locale-aware)
  - locale 보존 verify (`/ko/signin` 또는 `/en/signin` 자동 진입)
  - tsc + lint clean
LOG: GATE_EXIT HF3_2 redirect_target=/signin
```

### HF3_3 — 랜딩 삭제 + redirect (30분)

```
ENTRY:
  - SPEC §"HF3.3" read
EXIT:
  - src/app/[locale]/page.tsx 가 redirect-only (또는 삭제 + middleware redirect)
  - 미인증 user `/` 진입 → `/signin`
  - 인증 user `/` 진입 → `/app/projects`
  - src/components/home/ 사용처 grep 후 0건 시 디렉토리 삭제 (또는 FU 등록)
  - tsc + lint clean
LOG: GATE_EXIT HF3_3 home_dir_action=<deleted|kept>
```

### HF3_4 — Verify + cleanup (10분)

```
ENTRY:
  - HF3.1 + HF3.2 + HF3.3 SHIPPED
EXIT:
  - yagi-wordmark.png import 0건 grep verify
  - 다른 unused logo (yagi-mark, yagi-logo-combined, yagi-mark-white) 사용처 audit
    → 사용처 0건 시 FU 등록 (FU-Phase6-12)
  - 12-step verify list (SPEC §"Verification") 완료. 단 visual smoke step
    8-11 은 야기 manual (browser smoke).
  - tsc + lint + build clean
  - Single commit + push
LOG: GATE_EXIT HF3_4 verify_steps_passed=8 (4 yagi_pending)
COMMIT: hotfix(phase-6/hf3): auth logo unification + logout to /signin + 랜딩 삭제
```

## §3 — HALT codes

| Code | Trigger | Recovery |
|---|---|---|
| `E0_ENTRY_FAIL` | §0 step fail | 야기 chat |
| `E_LOOP_EXHAUSTED` | 어떤 gate 든 loop 2 fail | 야기 chat with diff |
| `E_HOME_DEPS` | home/ 디렉토리 사용처 0건 가정이 거짓 (다른 routes 가 import) | 야기 chat: SPEC update 필요 |

## §4 — Reporting

After SHIPPED:

Final report file: `.yagi-autobuild/phase-6-hf3/_hf3_result.md`

Sections:
- Diffs summary (single commit + file list)
- Verify log (8-step automated PASS, 4-step yagi pending)
- Open questions (if any)
- Ready-to-merge: YES / NO

Then chat 야기 with:
- (a) commit hash
- (b) verify summary (8 PASS, 4 야기 pending)
- (c) yagi-wordmark.png import count = 0 confirmed
- (d) home/ 디렉토리 처리 (deleted / kept + reason)
- (e) ff-merge GO 부탁

GO.
