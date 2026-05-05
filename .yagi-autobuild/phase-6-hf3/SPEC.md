# Phase 6 Hotfix-3 — Auth surface logo unification + logout default + landing 삭제

Status: LOCKED v1, ready for KICKOFF dispatch.
Author: 야기 + Web Claude (chat 2026-05-05)
Scope tier: HOTFIX (~1.5h, single Sonnet builder, no parallel)
Baseline: branch `main` (Phase 6 ff-merge 완료)
Trigger: 야기 post-Phase-6 browser smoke (2026-05-05). 3개 발견:

  1. **Auth 페이지 logo 잔존** — `/ko/signin` (그리고 signup / forgot /
     reset / onboarding / auth callback) 가 옛 `yagi-wordmark.png` 사용.
     로그인 후 sidebar 의 새 logo (`yagi-icon-logo-black.png` +
     `yagi-text-logo-black.png` icon + text 조합) 와 일관성 X.
  2. **Logout default redirect** — `signout-action.ts` 의 `redirect("/")` =
     랜딩페이지로. 야기 의도 = `/signin` 으로.
  3. **랜딩페이지 삭제** — `src/app/[locale]/page.tsx` (HeroBlock +
     ServicesTriad + 등) Phase 4.x 잔재. 0-user state + 공식 launch 전 =
     불필요. 삭제 + middleware/redirect 정리.

User pool state: **0 user (pre-launch)**. Schema breaking 자유. Migration 0.

## Decisions locked (야기 confirm 2026-05-05)

| # | 항목 | 결정 |
|---|---|---|
| H3D1 | Logo 통일 패턴 | sidebar-brand.tsx 의 `yagi-icon-logo-black.png` (28×28) + `yagi-text-logo-black.png` (56×18 wordmark) 조합. 모든 auth surface 의 layout 에 적용 |
| H3D2 | Logo file 변경 X | public/brand/ 의 기존 file 그대로 사용 (`yagi-icon-logo-black.png` + `yagi-text-logo-black.png`). 새 파일 추가 없음 |
| H3D3 | Logout redirect target | `/signin` (locale-aware: `/${locale}/signin`). next-intl `redirect` helper 사용 |
| H3D4 | 랜딩페이지 처리 | `src/app/[locale]/page.tsx` 삭제 + middleware 또는 root redirect 로 `/${locale}/signin` 진입. 인증 상태에서 `/` 진입 시 → `/${locale}/app/projects` (이미 인증된 user 의 자연 흐름) |
| H3D5 | Auth 인증 기반 redirect | `/` 진입 시 (locale 또는 locale-free): (a) 미인증 user → `/${locale}/signin` (b) 인증 user → `/${locale}/app/projects` |
| H3D6 | 삭제할 home 컴포넌트 | `src/components/home/` 디렉토리 = 랜딩 page 만 사용. **디렉토리 통째 삭제 권장** (사용처 grep 확인 후) — 또는 사용처 잔존 시 그대로 두고 page.tsx만 삭제 |

## Scope: 4 sub-tasks (HF3.1 ~ HF3.4)

### HF3.1 — Auth surface logo unification (15분)

3개 layout file 의 logo block 을 sidebar-brand.tsx 패턴으로 교체:

**File 1**: `src/app/[locale]/(auth)/layout.tsx`
- 현재: `<Image src="/brand/yagi-wordmark.png" alt="YAGI Workshop" width={140} height={26} ... />`
- 변경: 2-image 조합 (icon 28×28 + text 56×18, gap-2.5)

**File 2**: `src/app/[locale]/auth/layout.tsx`
- 동일 변경

**File 3**: `src/app/[locale]/onboarding/layout.tsx`
- 동일 변경

**구현 패턴 (sidebar-brand.tsx 참조)**:
```tsx
<Link href="/" className="inline-flex items-center gap-2.5" aria-label="YAGI Workshop">
  <Image
    src="/brand/yagi-icon-logo-black.png"
    alt=""
    width={28}
    height={28}
    priority
    className="h-7 w-7 flex-shrink-0"
  />
  <Image
    src="/brand/yagi-text-logo-black.png"
    alt="YAGI WORKSHOP"
    width={56}
    height={18}
    priority
    className="h-[18px] w-auto"
  />
</Link>
```

⚠️ Auth surface 의 logo 는 *로고 클릭 시 랜딩 X* (랜딩 삭제 예정). 클릭 시
`/signin` 으로 (또는 disabled — 의도 확정).

**EXIT**:
- 3개 file 의 image 1-block → 2-block 조합 교체
- yagi-wordmark.png import 0건 (grep verify)
- visual smoke (signin / signup / forgot / reset / onboarding / auth callback 페이지 모두 새 logo 노출)
- tsc + lint clean

### HF3.2 — Logout redirect 변경 (10분)

`src/lib/app/signout-action.ts`:

```ts
"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "@/i18n/routing"; // locale-aware
// 또는 next-intl 의 `getRequestConfig` 의 locale 사용 후 next/navigation redirect

export async function signOutAction() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/signin");
}
```

⚠️ Locale 처리 — next-intl 의 `redirect` (from `@/i18n/routing`) 가 자동 locale prefix.
또는 cookie 의 NEXT_LOCALE 읽어서 `redirect(`/${locale}/signin`)`. Builder
자율.

**EXIT**:
- signOut 후 redirect 가 `/${locale}/signin` 으로 (locale 보존)
- `/` 으로 redirect 안 됨
- tsc + lint clean

### HF3.3 — 랜딩페이지 삭제 + redirect (30분)

**3-1. page.tsx 처리**:

`src/app/[locale]/page.tsx` 의 두 가지 처리 옵션 (Builder 자율):

- (a) **파일 삭제** + middleware 에서 `/` 또는 `/[locale]` 진입 시 인증 상태 별 redirect
- (b) **page.tsx 를 redirect-only 로 교체** — server-side auth check 후 redirect

추천 = (b) (단순, middleware 변경 최소):

```tsx
// src/app/[locale]/page.tsx
import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "@/i18n/routing";

export default async function HomePage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect("/app/projects");
  } else {
    redirect("/signin");
  }
}
```

**3-2. home 컴포넌트 디렉토리 정리**:

`src/components/home/` 사용처 grep (Builder 가 verify):

```bash
grep -r "@/components/home" src/
```

만약 page.tsx 외 사용처 0건 → `src/components/home/` 디렉토리 통째 삭제 OK.
사용처 잔존 시 (e.g., showcase / journal / commission 등 다른 routes 가
import) → 그대로 두고 page.tsx 만 처리.

**3-3. WorkSection 컴포넌트** (page.tsx 가 import):

```tsx
import { WorkSection } from "@/components/marketing/work-section";
```

`src/components/marketing/work-section` 사용처 별도 grep. 사용처 0건 시
삭제 OK (또는 deprecation comment + FU 등록).

**EXIT**:
- `src/app/[locale]/page.tsx` 가 redirect-only (또는 삭제 + middleware redirect)
- 미인증 user 가 `/` 진입 → `/signin` redirect
- 인증 user 가 `/` 진입 → `/app/projects` redirect
- `src/components/home/` 의 사용처 0건 시 디렉토리 삭제 (또는 FU 등록)
- tsc + lint clean

### HF3.4 — Verify + 잔존 logo 사용처 cleanup (10분)

**4-1. yagi-wordmark.png 사용처 0건 grep verify**:

```bash
grep -r "yagi-wordmark" src/
# expect: 0 matches
```

**4-2. public/brand/ 의 yagi-wordmark.png 처리**:

- (a) 파일 그대로 두기 (안전, 100KB 정도)
- (b) 삭제 (cleanup) — 단 다른 곳에서 import 잔존 가능성 0건일 때

추천 = (a) 그대로. 다른 surface 가 미래 사용 가능성 또는 야기 brand kit 의 일부.

**4-3. 다른 logo file 사용처 audit**:
- `yagi-logo-combined.png`, `yagi-mark.png`, `yagi-mark-white.png` 사용처 grep
- 사용처 0건 + 새 logo 패턴 (icon + text 분리 조합) 으로 통일됐으면 → 삭제 후보 (FU 등록)

**4-4. visual smoke**:
- /ko/signin → 새 logo 노출
- /en/signin → 새 logo 노출 (영문 locale 도)
- /ko/signup → 새 logo
- /ko/forgot-password → 새 logo
- /ko/onboarding/artist (Phase 6 ship) → 새 logo
- /auth/expired → 새 logo
- 로그아웃 클릭 → /ko/signin 진입 (locale 유지)
- /ko/ 진입 (미인증) → /ko/signin redirect
- /ko/ 진입 (인증) → /ko/app/projects redirect

**EXIT**:
- yagi-wordmark.png import 0건
- 모든 auth surface visual smoke PASS
- /ko 또는 /en 진입 시 인증 상태 별 redirect 정상
- 잔존 unused logo file 의 FU 등록 (선택)

## Verification (Builder responsibility — 12 steps)

### Pre-apply
1. `pnpm exec tsc --noEmit` clean
2. `pnpm lint` clean

### Logo unification
3. /ko/signin → 새 logo (icon 28×28 + text 56×18) 노출
4. /ko/signup → 동일 logo
5. /ko/forgot-password + /ko/reset-password → 동일 logo
6. /ko/onboarding/artist (Phase 6) → 동일 logo
7. /auth/expired (locale-free) → 동일 logo

### Logout redirect
8. 로그인 후 sidebar user menu → [로그아웃] → /ko/signin 진입 (locale 보존)
9. /en locale 의 user 도 → /en/signin 진입

### 랜딩 삭제 + redirect
10. /ko/ 진입 (미인증) → /ko/signin redirect
11. /ko/ 진입 (인증) → /ko/app/projects redirect
12. yagi-wordmark.png import 0건 grep verify

## K-05 Codex review

- **Tier**: 1 LOW.
- **Routing**: SKIP (UI + redirect 만, 신규 보안 surface 0).
- **Justification**: signout-action 의 redirect 변경은 logic flow 정정만.
  새 server action 또는 RLS 변경 0.

## K-06 Design Review

- **Optional** (manual 또는 Web Claude review). UI surface 변경은 logo
  unification 만 = visual diff 명확. K-06 Opus subagent spawn 비용 대비
  finding 가치 낮음.

## Out-of-scope (FU 등록)

- **FU-Phase6-12** — 사용 안 하는 logo file (`yagi-wordmark.png`,
  `yagi-logo-combined.png`, `yagi-mark.png`, `yagi-mark-white.png`) cleanup.
  Phase 7+ 진입 시 brand kit audit 후 결정.
- **FU-Phase6-13** — `src/components/home/` 디렉토리 사용처 audit. 사용처
  0건 시 삭제. (HF3.3 에서 다룰 수 있음 — Builder 자율)
- **FU-Phase6-14** — 랜딩페이지 (Hero / Services 등) 의 *진짜* launch 시점에
  새로 design + ship. 현 home 컴포넌트 = Phase 4.x 잔재로 reference 만.

## Migration apply policy

DB schema 변경 0. Migration 0.

## Commit plan

Single commit (작은 hotfix).

```powershell
git checkout -b g-b-10-hf3
# Builder 자율 변경 (4 sub-tasks)
git add src/app/[locale]/(auth)/layout.tsx src/app/[locale]/auth/layout.tsx src/app/[locale]/onboarding/layout.tsx src/lib/app/signout-action.ts src/app/[locale]/page.tsx
# 만약 home 디렉토리 삭제 시 추가
git status
git commit -F .git\COMMIT_MSG.txt
git push -u origin g-b-10-hf3
```

ff-merge to main 은 야기 verify 후.

## Sign-off

야기 SPEC v1 LOCKED (chat 2026-05-05) → Builder execute (single Sonnet,
no parallel) → verify 12 step → 결과 chat 보고 → 야기 visual smoke →
ff-merge GO (g-b-10-hf3 → main).
