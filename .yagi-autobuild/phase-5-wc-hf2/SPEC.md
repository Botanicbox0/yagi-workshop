# Phase 5 Wave C — Hotfix-2 (Detail page layout consolidation + 의뢰 삭제)

Status: LOCKED v1, ready for KICKOFF dispatch.
Author: 야기 + Web Claude (chat 2026-05-04)
Scope tier: HOTFIX (~1.5d wall-clock parallel)
Baseline: branch `g-b-10-phase-5` (Wave A+B+B.5+C+hotfix-1 SHIPPED to main)
Trigger: 야기 post-ff-merge browser smoke (2026-05-04). 두 가지 회귀/추가 발견:

  1. **Layout 회귀** — page.tsx 의 L2 (상단 StatusTimeline) + L3 (Hero card +
     InfoRail) 가 5-tab 안 status tab 의 콘텐츠와 *중복*. 페이지 세로 길이 ≈
     의도된 length × 2. 큰 status 카드 안의 빈 공간이 redundancy 결과.
     PRODUCT-MASTER §C.4 v1.2 의 의도 = "5-tab 구조 + status tab default
     콘텐츠가 모든 정보 책임"; 상단 L2/L3 = Phase 4.x 잔재. Wave C 가 정리
     안 한 회귀.
  2. **의뢰 삭제 기능 누락** — 디렉터 매칭 전 (status IN ('submitted',
     'in_review')) 단계에서 의뢰자가 의뢰 자체를 삭제하고 싶을 수 있음.
     현재 [의뢰 회수 후 수정] 만 있고 영구 삭제 X. 의뢰자 retention 측면
     (잘못 의뢰 후 깨끗하게 빠질 수 있는 escape hatch) 에서 필요.

⚠️ Hotfix-2 는 main 에 직접 적용 (Wave C+hotfix-1 ff-merge 완료 후). 별도
branch (`g-b-10-hf2`) 에서 작업 → 검증 후 main 으로 ff-merge.

## Decisions locked (야기 confirm 완료, chat 2026-05-04)

| # | 항목 | 결정 |
|---|---|---|
| H2D1 | Layout 방향 | **Option C** — 상단 L2 (timeline) + L3 (Hero card + InfoRail) 영역 *통째로 제거*. 5-tab + tab content 만 남김. status tab default 가 모든 핵심 정보 책임 |
| H2D2 | Status tab 내부 구조 | (a) 상단 status pill, (b) 좌측 vertical timeline (image 1 의 형태), (c) 메인 status 카드 (HF1.1 결과 그대로), (d) 우측 sticky InfoRail (sidebar), (e) 하단 cards (브리프 요약 + 첨부 자료 + 코멘트) |
| H2D3 | 다른 tab (브리프/보드/코멘트/결과물) 의 InfoRail | InfoRail = status tab 만. 다른 tab 은 메인 콘텐츠 full width (브리프 tab 의 read-only field 가 이미 정보 풍부; 보드 tab = canvas full width 필요) |
| H2D4 | 삭제 허용 status | **`status IN ('submitted', 'in_review')`** — 매칭 전 = in_progress 진입 전. in_progress 부터는 디렉터/팀 배정 = 비즈니스 commitment 발생 → 삭제 차단 |
| H2D5 | 삭제 UI 위치 | **Status 카드 안 dropdown menu (•••)** — 삭제 + 회수 둘 다 dropdown 안. trigger 버튼 = 일반 ghost icon button (•••), menu items = [의뢰 회수 후 수정] [의뢰 삭제] |
| H2D6 | 삭제 동작 | soft-delete (UPDATE projects SET deleted_at = now()). hard-delete X. 30일 후 cleanup cron 도입 가능성 (FU-Phase5-23) |
| H2D7 | 삭제 후 UX | project list 로 redirect + toast "의뢰가 삭제되었어요". project list 에서 deleted_at IS NOT NULL = 자동 제외 (RLS USING 또는 query filter) |
| H2D8 | RLS 패턴 | L-048 적용. service-role client (createSupabaseService) 로 deleted_at write. created_by + workspace_id .eq() filter 로 authorization 보장 |
| H2D9 | Destructive UI | yagi-design-system v1.0 의 calm tone 보존. trigger menu item = 일반 ghost. confirm dialog 의 submit button 만 destructive token (Builder 가 design-system token 검색 후 적용; 없으면 outline + "삭제" wording 으로 충분) |

## Scope: 3 sub-tasks (HF2.1 ~ HF2.3)

### HF2.1 — Layout consolidation (lead solo, 0.75d, Sonnet)

**현재 회귀 진단**:
`page.tsx` 의 layout (참조: line ~280-440):

```
1. Breadcrumb (L1)               ← 유지
2. <StatusTimeline> (L2)         ← 제거
3. <HeroCard /> + <InfoRail /> (L3) ← 제거
4. <DetailTabs /> (L4)            ← 유지
5. Tab content (L5)               ← StatusTab 내부 layout 재설계
6. Admin actions (L6)             ← 유지
```

**Spec**:

(A) `page.tsx` 수정:
- L2 (StatusTimeline 호출 + 감싸는 `<div className="mb-8">`) 제거
- L3 (Hero card + Info rail flex container `<div className="mb-10 flex flex-col md:flex-row gap-6">`) 제거
- 결과: Breadcrumb → DetailTabs → Tab content → Admin actions (4 layer)
- L5 의 StatusTab 호출 시 *추가 props 전달 필요* (info rail data: createdAt, budgetBand, targetDeliveryAt, twinIntent, meetingPreferredAt + 관련 i18n labels)

(B) `StatusTab` 컴포넌트 내부 layout 재설계 (`src/components/project-detail/status-tab.tsx`):

```
┌─────────────────────────────────────────────────────────┐
│ [status pill: 의뢰 접수]                                 │
├──────────────┬──────────────────────┬──────────────────┤
│              │                      │                  │
│  Vertical    │  Status 카드          │  InfoRail        │
│  timeline    │  (HF1.1 결과 그대로)  │  (sticky)        │
│  (작성중,    │  - title             │  - 의뢰 일자      │
│   의뢰접수,  │  - body              │  - 예산           │
│   검토중,    │  - 3 meta row        │  - 납기           │
│   작업진행,  │  - dual CTA + ⋯     │  - Twin intent    │
│   시안도착,  │                      │  - 미팅 희망       │
│   승인완료)  │                      │                  │
│              │                      │                  │
│  좌측 sticky │  메인 영역            │  우측 sticky     │
└──────────────┴──────────────────────┴──────────────────┘

(메인 아래 row, full width)
┌─────────────────────────────────────────────────────────┐
│ 브리프 요약 카드   첨부 자료 카드   야기 코멘트 카드     │
│ (3-col grid 또는 stack)                                  │
└─────────────────────────────────────────────────────────┘
```

- Layout 구현 = grid-cols-12 권장:
  - 좌측 timeline col-span-2 (~150-180px sticky)
  - 메인 status 카드 col-span-7 (~600px)
  - 우측 InfoRail col-span-3 (~280-320px sticky)
- 모바일 (< md): 1-column stack — timeline horizontal 또는 collapsed (Wave C C_2 가 이미 vertical stepper 라 모바일 horizontal 이 더 자연 — Builder 자율, FU 등록 가능)
- 하단 3 cards = grid grid-cols-1 md:grid-cols-3 gap-4

(C) Vertical timeline 컴포넌트:
- 기존 StatusTimeline 컴포넌트 (HF1.2 의 dot ring + connector half-fill) 재사용
- 상단 page.tsx L2 에서 사용하던 형태 그대로 — props 같음 (status + labels)
- 단 모바일 viewport 에서는 horizontal layout 도 자연; Builder 자율

(D) InfoRail 컴포넌트:
- 기존 InfoRail 컴포넌트 (page.tsx L3 에서 사용) 재사용
- props 동일 (createdAt, budgetBand, targetDeliveryAt, twinIntent, meetingPreferredAt + labels)
- sticky 동작 = top-N + max-height 조정 (yagi-design-system v1.0 token 안에서)

**EXIT**:
- page.tsx 의 L2/L3 영역 *완전 제거* (Breadcrumb 직후 DetailTabs)
- StatusTab 내부 grid 12-col layout (좌 timeline / 메인 카드 / 우 InfoRail)
- 하단 3 cards row 유지 (브리프 요약 / 첨부 / 코멘트)
- 모든 status (draft/submitted/in_review/in_progress/in_revision/delivered/approved) 에서 layout 정상 동작
- terminal status (cancelled/archived) 의 banner 는 status tab 안 상단으로 이동 (page.tsx L1 직후 위치도 OK — Builder 자율)
- 페이지 세로 길이 = 현재의 ~50% (visual diff 확인)
- tsc + lint + build clean
**FAIL on**:
- L2/L3 잔존
- timeline 또는 InfoRail 이 다른 tab (브리프/보드/...) 에 노출 (status tab 만)
- StatusTab 내부 grid 가 모바일에서 망가짐 (overflow / inaccessible)

### HF2.2 — 의뢰 삭제 기능 (parallel, 0.5d, Sonnet)

**Server action — `deleteProjectAction`**:

`src/app/[locale]/app/projects/[id]/_actions/delete-project.ts` (또는 기존 actions.ts 안에 추가):

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { resolveActiveWorkspace } from "@/lib/workspace/active";

const deleteProjectInput = z.object({
  projectId: z.string().uuid(),
});

export type DeleteProjectResult =
  | { ok: true }
  | { ok: false; error: "validation" | "unauthenticated" | "not_found"
                       | "forbidden_status" | "forbidden_owner" | "db" };

export async function deleteProjectAction(
  input: unknown,
): Promise<DeleteProjectResult> {
  const parsed = deleteProjectInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // Fetch project; verify owner + status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: project, error: selErr } = await sb
    .from("projects")
    .select("id, status, created_by, workspace_id, deleted_at")
    .eq("id", parsed.data.projectId)
    .maybeSingle();
  if (selErr || !project || project.deleted_at) {
    return { ok: false, error: "not_found" };
  }
  if (project.created_by !== user.id) {
    return { ok: false, error: "forbidden_owner" };
  }
  if (project.status !== "submitted" && project.status !== "in_review") {
    return { ok: false, error: "forbidden_status" };
  }

  // Soft-delete via service-role client (L-048).
  // Authorization preserved via .eq("created_by", user.id) +
  // .eq("id", projectId) filters.
  const sbAdmin = createSupabaseService();
  const { error: delErr } = await sbAdmin
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.projectId)
    .eq("created_by", user.id)
    .in("status", ["submitted", "in_review"])
    .is("deleted_at", null);
  if (delErr) {
    console.error("[deleteProjectAction] update error:", delErr);
    return { ok: false, error: "db" };
  }

  revalidatePath("/[locale]/app/projects", "page");
  return { ok: true };
}
```

⚠️ **L-048 / L-049 multi-role audit 적용**:
- `client` role: WITH CHECK 거부 → service-role 필수 ✓
- `ws_admin`: 거부 → service-role 필수 ✓
- `yagi_admin`: 통과하지만 일관성 위해 service-role ✓
- `different-user same-workspace`: `.eq("created_by", user.id)` 가 USING 방어 ✓

**UI — Status 카드 dropdown**:

기존 status 카드 component (HF1.1 결과 — `src/components/project-detail/status-card.tsx`) 안에:

```tsx
// existing dual CTA row
<div className="flex items-center justify-between">
  <div className="flex gap-3">
    {/* primary: [브리프 전체 보기 →] */}
    {/* secondary: [의뢰 회수 후 수정] (status IN draft/submitted/in_review only) */}
  </div>
  
  {/* NEW: dropdown menu */}
  {(status === "submitted" || status === "in_review") && isOwner && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="더 보기">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={openRecallDialog}>
          의뢰 회수 후 수정
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openDeleteDialog}>
          의뢰 삭제
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )}
</div>
```

⚠️ **HD5 v2 (HF1) 변경**: 기존 secondary CTA [의뢰 회수 후 수정] 의 위치 = dropdown 안으로 이동. 즉 dual CTA = 사실상 single primary CTA + dropdown. 야기 confirm: dropdown 깔끔, discovery 약간 약함 (수용).

→ Status 카드 footer = `[브리프 전체 보기 →] (primary) ............. [⋯ dropdown]`

**Confirm dialog**:

기존 RecallButton 의 AlertDialog 패턴 재사용 + 새 DeleteAlertDialog:

```tsx
<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>이 의뢰를 삭제할까요?</AlertDialogTitle>
      <AlertDialogDescription>
        삭제하면 복구할 수 없어요. 같은 내용으로 다시 의뢰하시려면
        새 프로젝트를 시작해주세요.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>취소</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleDelete}
        // destructive token if available; otherwise default
      >
        삭제
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Project list 의 deleted_at filter**:
- `src/app/[locale]/app/projects/page.tsx` (project list) 의 SELECT 에 `.is("deleted_at", null)` 추가 (이미 있으면 verify, 없으면 추가)
- 만약 RLS USING 에 이미 `deleted_at IS NULL` 조건이 있으면 query filter 중복 OK (defense-in-depth)

**EXIT**:
- `deleteProjectAction` server action 작성 + 타입 정확
- Status 카드 dropdown menu (•••) 추가 — status IN ('submitted', 'in_review') + isOwner 일 때만 visible
- Dropdown items = [의뢰 회수 후 수정] + [의뢰 삭제]
- 삭제 confirm dialog → `deleteProjectAction` 호출 → 성공 시 project list 로 redirect + toast
- Project list 에서 deleted projects 제외 (query filter 또는 RLS verify)
- L-048/L-049 service-role 패턴 정확 적용 (`.eq("created_by", user.id)` 필터 보존)
- tsc + lint + build clean
**FAIL on**:
- status IN ('in_progress', 'in_revision', 'delivered', 'approved') 일 때 삭제 가능 (forbidden_status 체크 누락)
- 다른 user 의 project 삭제 가능 (forbidden_owner 체크 누락)
- service-role client 안 쓰고 user-scoped client → 42501 회귀
- 삭제 후 project list 에 deleted project 표시 (filter 누락)

### HF2.3 — i18n + accessibility (parallel, 0.25d, Haiku/Sonnet)

**i18n keys 추가**:

`messages/ko.json` + `messages/en.json` 의 `project_detail.status.card.dropdown.*` namespace:

| key | KO | EN |
|---|---|---|
| `trigger_label` | 더 보기 | More options |
| `recall` | 의뢰 회수 후 수정 | Recall to edit |
| `delete` | 의뢰 삭제 | Delete brief |
| `delete_confirm.title` | 이 의뢰를 삭제할까요? | Delete this brief? |
| `delete_confirm.description` | 삭제하면 복구할 수 없어요. 같은 내용으로 다시 의뢰하시려면 새 프로젝트를 시작해주세요. | This action can't be undone. Start a new project to re-submit. |
| `delete_confirm.cancel` | 취소 | Cancel |
| `delete_confirm.submit` | 삭제 | Delete |
| `delete_success_toast` | 의뢰가 삭제되었어요 | Brief deleted |
| `delete_error_toast` | 의뢰를 삭제하지 못했어요. 잠시 후 다시 시도해주세요. | Could not delete brief. Try again shortly. |

**Accessibility**:
- Dropdown trigger button: `aria-label`="더 보기" (i18n)
- Dropdown menu: keyboard navigation (↑↓ Esc Enter — Radix UI / shadcn DropdownMenu 가 기본 제공)
- Confirm dialog: focus trap + Esc close (AlertDialog 기본)
- Destructive submit button: 가능하면 `aria-describedby` 로 description text 연결 (screen reader)
- Tab order: status 카드 primary CTA → dropdown trigger → 우측 InfoRail (또는 Builder 의도 layout 따름)

**EXIT**:
- 9 i18n key × 2 locale 추가 (ko + en)
- DropdownMenu + AlertDialog accessibility (keyboard nav, focus trap, aria-label) 정상
- screen reader 시 의도 명확 (e.g., "더 보기 버튼, 더보기 메뉴 열기" → "의뢰 삭제, 위험 액션, 확인 필요")
- tsc + lint + build clean

## Verification (Builder responsibility — 14 steps total)

### Pre-apply
1. `pnpm exec tsc --noEmit` clean
2. `pnpm lint` clean
3. `pnpm build` clean

### Layout verify (HF2.1)
4. submitted status detail page 진입 → 상단 L2 (timeline) + L3 (Hero card + InfoRail) *없음*
5. Breadcrumb 직후 → DetailTabs (5-tab bar) 즉시 노출
6. status tab default → 좌 timeline + 메인 status 카드 + 우 sticky InfoRail
7. 다른 tab (브리프/보드/코멘트/결과물) → 메인 콘텐츠 full width (InfoRail 없음)
8. 페이지 세로 길이 = HF1 대비 ~50% (visual diff 확인)

### Delete UX verify (HF2.2)
9. submitted status → status 카드 dropdown (⋯) trigger visible
10. dropdown 클릭 → [의뢰 회수 후 수정] [의뢰 삭제] 두 menu items
11. [의뢰 삭제] 클릭 → confirm dialog ("이 의뢰를 삭제할까요?")
12. confirm submit → success toast + project list redirect → 그 project 사라짐
13. status='in_progress' (또는 그 이후) project → dropdown trigger *visible 안 함* (또는 [의뢰 삭제] menu item disabled / hidden)

### Accessibility + static
14. Dropdown keyboard nav (Tab to trigger → Enter open → ↑↓ navigate → Enter select). Confirm dialog focus trap. yagi-design-system v1.0 compliance (sage only, zero shadow, border subtle, radius 24/999/12).

## K-05 Codex review

- **Tier**: 2 MED.
- **Routing**: MANDATORY for HF2.2 (server action + RLS-bound write to deleted_at).
- **Justification**: deleteProjectAction = new authorization surface. 잘못된 status guard / owner guard / service-role 필터 누락 = HIGH-A risk (다른 user 의 의뢰 삭제 또는 in_progress 의뢰 삭제). RLS multi-role audit (L-049) 강제.
- **Skip 가능 부분**: HF2.1 (UI only, no auth) + HF2.3 (i18n only). 해당 부분 K-05 review 에서 제외.

## K-06 Design Review

- **MANDATORY** (UI-heavy hotfix).
- Reviewer: fresh Opus subagent (codex-review-protocol.md 의 K-06 protocol 적용).
- Focus: 4-dimension review (information hierarchy / visual weight / layout rhythm / UX flow continuity)
- 특히 *layout consolidation 후* 정보 위계가 의도대로 보이는지 (status pill → timeline → 카드 → InfoRail → 하단 cards 순서 자연스러움?)

## Out-of-scope (FU 등록)

- **FU-Phase5-23** — 30일 후 deleted projects hard-delete cleanup cron (briefing_documents + R2 objects 함께)
- **FU-Phase5-24** — Status tab 내부 grid 의 모바일 viewport (< md) 최적화 (현재 1-col stack default, horizontal timeline 검토)
- **FU-Phase5-25** — Status 카드 dropdown 의 status='draft' 케이스 (draft 는 [브리프 완성하기 →] primary 만 있음. dropdown 필요한가? 추가 menu item 후보 e.g., [draft 그대로 삭제])
- **FU-Phase5-26** — Project list 에 "삭제됨" filter / view (의뢰자가 실수로 삭제한 의뢰 복구 surface — 30일 윈도우 안에서 [복구] button)

## Migration apply policy

DB schema 변경 0. Migration 파일 없음. (deleted_at column 은 이미 Phase 2.8.2 에서 도입됨.)

## Commit plan (PowerShell, one command at a time)

Sub-task 별 commit 권장.

```powershell
# HF2.1 (lead solo, base)
git add src/app/[locale]/app/projects/[id]/page.tsx src/components/project-detail/status-tab.tsx
git status
git commit -F .git\COMMIT_MSG.txt
# msg: refactor(phase-5/wc.hf2.1): layout consolidation — remove L2/L3 redundancy

# HF2.2 (parallel after HF2.1 lead branch)
git add src/app/[locale]/app/projects/[id]/_actions/ src/components/project-detail/status-card.tsx
git status
git commit -F .git\COMMIT_MSG.txt
# msg: feat(phase-5/wc.hf2.2): 의뢰 삭제 (submitted/in_review only) + dropdown UI

# HF2.3 (parallel)
git add messages/
git status
git commit -F .git\COMMIT_MSG.txt
# msg: feat(phase-5/wc.hf2.3): i18n + accessibility for delete dropdown
```

## Sign-off

야기 SPEC v1 LOCKED (chat 2026-05-04) → Builder execute (HF2.1 lead solo
base → HF2.2 + HF2.3 parallel x 2) → K-05 (HF2.2 only) + K-06 (UI-wide)
parallel → Verify 1–14 → 결과 chat 보고 → 야기 ff-merge GO (g-b-10-hf2 →
main).
