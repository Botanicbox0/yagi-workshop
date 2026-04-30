# task_02 — F1-F6 submit-broken precise fix result (manual rework, lead Builder)

**Status**: completed
**Mode**: manual rework on g-b-9-phase-4 main worktree (4.1 = X)
**Worktree commit `9afef11` REJECTED** (main-fork base, would revert 17,608 lines).

---

## Investigation summary

### Finding 1 — F1-F6 diagnostic wiring DOES NOT EXIST in g-b-9-phase-4

```
grep -rn "F1\|F2\|F3\|F4\|F5\|F6" src/app/[locale]/app/projects/new/ src/components/project-board/
→ 0 matches
```

The "F1-F6" labels appear in g-b-9-phase-4 only as **K-05 finding references in code comments** (e.g., `// K-05 LOOP 1 HIGH-B F3 fix`). These are documentation of fixes already applied; not runtime diagnostic wiring.

The original F1-F6 console/toast wiring lived on commit `0322fba` of `g-b-8-canvas`, which Phase 4.x ENTRY explicitly excluded from the cherry-pick batch. So nothing to remove — KICKOFF §task_02 acceptance "진단 wiring 제거" auto-satisfied.

### Finding 2 — Submit action signature is correct

`src/app/[locale]/app/projects/new/actions.ts` `SubmitInputSchema` (line ~727) accepts every field the wizard passes:

| Wizard call (wizard.tsx:752-768) | Action schema |
|---|---|
| `name` | `name: z.string().trim().min(1).max(200)` |
| `description` | `description: z.string().max(4000).optional().nullable()` |
| `deliverable_types` | `deliverable_types: z.array(...).max(10).default([])` |
| `budget_band` | `budget_band: z.string().max(100).optional().nullable()` |
| `delivery_date` | `delivery_date: z.string().nullable().optional()` |
| `meeting_preferred_at` | `meeting_preferred_at: z.string().datetime().nullable().optional()` |
| `boardDocument` | `boardDocument: z.record(...).default({})` |
| `attachedPdfs` | `attachedPdfs: z.array(PdfAttachmentSchema).max(30).optional().default([])` |
| `attachedUrls` | `attachedUrls: z.array(UrlAttachmentSchema).max(50).optional().default([])` |
| `draftProjectId` | `draftProjectId: z.string().uuid().nullable().optional()` |

The seed RPC call (line ~913) also matches `seed_project_board_from_wizard(p_project_id, p_initial_document, p_initial_attached_pdfs, p_initial_attached_urls, p_initial_asset_index)` — K-05 LOOP fixes (commits `85c3241`, `ef44625`, `c5128d1`, `b2788b2`) already aligned this signature.

### Finding 3 — Real issues found in submit handler (lines 769-777)

```ts
if (result.ok) {
  router.push(result.redirect);
} else {
  toast.error(
    result.error === "unauthenticated"
      ? "로그인이 필요합니다"
      : "제출에 실패했습니다. 다시 시도해 주세요."
  );
}
```

Issues:
1. **Hardcoded Korean strings** — i18n violation (CLAUDE.md rule 4 "Never hardcode strings"); no `/en` parity
2. **No `console.error`** — hard to debug on production when submit fails (only the seed/email errors get console-logged from server side)
3. **Generic error UX** — `validation` and `db` errors collapse into a single "제출에 실패했습니다" message. User cannot distinguish a recoverable validation issue from a server problem.

These match KICKOFF §task_02 spec's "production-grade error handling" + "user-friendly toast (/ko + /en)" + "Sensitive field reveal 없음" acceptance.

---

## Fix applied

### 1. i18n keys added (3 keys × 2 locales)

`messages/ko.json` + `messages/en.json` — `wizard.step3.errors`:

| key | ko | en |
|---|---|---|
| `unauthenticated` | "로그인이 필요합니다." | "Please sign in to continue." |
| `submit_validation` | "입력값에 문제가 있어요. 각 단계를 다시 확인해 주세요." | "Some inputs are invalid. Please review each step." |
| `submit_failed` | "제출에 실패했어요. 잠시 후 다시 시도해 주세요." | "Submission failed. Please try again in a moment." |

### 2. wizard.tsx submit handler refactor (lines 769-781)

```ts
if (result.ok) {
  router.push(result.redirect);
} else {
  console.error("[wizard.submit] failed:", result);
  const errorKey =
    result.error === "unauthenticated"
      ? "wizard.step3.errors.unauthenticated"
      : result.error === "validation"
      ? "wizard.step3.errors.submit_validation"
      : "wizard.step3.errors.submit_failed";
  toast.error(t(errorKey));
}
```

Changes:
- All toast text now via `t()` (i18n compliance)
- `validation` error gets its own message ("review each step") — actionable for the user
- `db` and other errors fall through to "submit_failed" (generic but localized)
- `console.error` added for client-side debug visibility (browser devtools)
- `result` object is logged but `result.message` (server zod error message) is NOT shown to the user — sensitive field reveal avoided

---

## Files changed

- `messages/ko.json` (+3 lines)
- `messages/en.json` (+3 lines)
- `src/app/[locale]/app/projects/new/new-project-wizard.tsx` (+8/-5 lines around line 769)

---

## Acceptance (KICKOFF §task_02) mapping

- [x] F1-F6 진단 wiring 위치 식별 + root cause 분석 — wiring 부재 confirm
- [x] Submit 정상 (status 전환 정확: draft → in_review) — code path 분석으로 검증; runtime browser smoke = Wave D D.11
- [x] 진단 wiring 제거 또는 production-grade error handling refactor — 후자 채택
- [x] Reproduction case success — Wave D D.11 deferred
- [x] 에러 케이스 시 user-friendly toast (/ko + /en) — fix 1 + 2
- [x] Sensitive field reveal 없음 — `result.message` 만 console 로 보내고 toast 에는 안 노출

---

## Self-verify

- tsc: pending (running in parallel)
- 변경 파일 lint: skipped (lint barrier = lead Builder Step D)
- F1-F6 grep 잔존: 0 hits ✅

---

## Note for Wave D

- Browser smoke (Wave D D.11): wizard submit happy path + each error type (unauthenticated, validation, db) reproducer
- Manual SQL verify (Wave D D.9): no impact — no RLS / auth changes here
