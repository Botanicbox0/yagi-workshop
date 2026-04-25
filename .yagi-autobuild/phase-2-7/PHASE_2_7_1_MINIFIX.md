# Phase 2.7.1 — Visibility & Clarity Pass (FINAL)

**Status:** READY TO PASTE
**Decision:** P1-P6 + P9 + P11 + P12 (Webflow light tone polish, light mode only)
**Estimate:** 4-5h single chain

---

## Paste 시작 ↓↓↓

Phase 2.7.1 Visibility & Clarity Pass — visual review 후 9개 patch 일괄 처리.

### 전제

Phase 2.7 v2 SHIPPED 상태. main 브랜치. Schema 변경 없음. UI / token level only.

### Reference 톤 (G3 디자인 visual smoke 후 일부 정리)

**Light mode only.** Webflow.com의 light mode 톤 부분 참고:
- Off-white background (#FAFAFA-ish) — 눈 편안
- 거대한 typography hierarchy (heading 굵고 큼)
- Generous whitespace
- Subtle borders, shadow 거의 없음
- Single accent color 절제

Dark mode는 손대지 않음.

### Scope (9 patches, 합쳐서 2-3 commits)

#### P1. 🔴 BUG — `/projects/new` Select empty value (CRITICAL)

**Symptom:** `localhost:3003/ko/app/projects/new` 진입 시 `Application error: a client-side exception` — Radix Select 가 빈 string value 거부.

**File:** `src/app/[locale]/app/projects/new/new-project-wizard.tsx` line ~358

**Fix:**
```tsx
<SelectItem value="__none">{t("brand_none")}</SelectItem>
```

Controller render:
```tsx
<Select
  onValueChange={(v) => field.onChange(v === "__none" ? "" : v)}
  value={field.value || "__none"}
>
```

**Acceptance:** `/ko/app/projects/new` runtime error 없음. Brand "없음" 선택 시 form payload `brand_id: null`.

#### P2. 🟢 워드마크 italic 제거

**Search:** `grep -rn "italic\\|<em>\\|font-style.*italic" src/`

**Targets:**
- Sidebar scope switcher trigger ("yagi workshop" italic)
- Admin 페이지 헤더 ("관리자 대시보드" italic)
- Project wizard `<em>{t("intake_mode_label")}</em>` (line ~322)
- 기타 발견되는 italic UI

**보존:** `prose` 클래스 안의 사용자 input markdown italic.

**Acceptance:** UI 텍스트에 italic 없음.

#### P3. 🟡 KO/EN 언어 토글 — 모든 페이지

**New file:** `src/components/app/language-switcher.tsx`
```tsx
"use client";
import { Link, usePathname } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { Languages } from "lucide-react";

export function LanguageSwitcher() {
  const pathname = usePathname();
  const locale = useLocale();
  const next = locale === "ko" ? "en" : "ko";
  return (
    <Link
      href={pathname}
      locale={next}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      aria-label={`Switch to ${next.toUpperCase()}`}
    >
      <Languages className="w-3.5 h-3.5" />
      <span>{next.toUpperCase()}</span>
    </Link>
  );
}
```

**Mount:**
- App shell header (`src/app/[locale]/app/layout.tsx`) — PageHelpLink + PublicExitLink 옆 우상단
- Public layout (`src/app/[locale]/(public)/layout.tsx` 또는 home/commission/challenges header) — 우상단

야기 결정: 모든 페이지 노출.

**Acceptance:** KO ↔ EN 토글 작동, pathname 보존.

#### P4. 🟡 Role badge — sidebar user 옆

**Modify:** `src/components/app/sidebar-user-menu.tsx`

Props 확장:
```tsx
type Props = {
  profile: Profile;
  workspaceRoles: WorkspaceRole[];
  isYagiInternalMember: boolean;
};
```

**Logic:**
```tsx
function getRoleLabel(profile, workspaceRoles, isYagiInternalMember): string {
  if (workspaceRoles.includes("yagi_admin")) return "Yagi Admin";
  if (isYagiInternalMember) return "Internal";
  switch (profile.role) {
    case "creator": return "Creator";
    case "studio": return "Studio";
    case "client": return "Client";
    case "observer": return "Observer";
    default: return "";
  }
}
```

**Visual:**
```tsx
<div className="flex-1 text-left min-w-0">
  <p className="text-[13px] truncate font-medium">{profile.display_name}</p>
  <p className="text-[11px] text-muted-foreground truncate">
    @{profile.handle}
    {roleLabel && <span className="text-foreground/70"> · {roleLabel}</span>}
  </p>
</div>
```

**Update:** `src/components/app/sidebar.tsx` SidebarBody 에서 새 props 전달.

**Acceptance:** 야기 (yagi_admin) 로그인 시 sidebar 하단 "@yagi · Yagi Admin" 표시.

#### P5. 🟡 Content max-width

**Modify:** `src/app/[locale]/app/layout.tsx` main wrapper:

```tsx
<main className="flex-1 min-w-0">
  <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8 w-full">
    {children}
  </div>
</main>
```

**Note:** Admin queue / data table 페이지 wide 필요 시 page-level wrapper override 가능 (page 내부 최상단에 `<div className="-mx-6 lg:-mx-8 max-w-none">` 식). 현재 admin pages 무리 없으면 기본 max-w-6xl 유지.

**Acceptance:**
- `/ko/app/projects` (or any default app page) content centered, 좌우 균형
- 1920px monitor: 좌측 sidebar (240px) + content (max 1152px) + 균형 잡힌 우여백
- 1280px monitor: content 압축 없음

#### P6. 🟢 Sidebar 정리

**File:** `src/components/app/sidebar-nav.tsx`

`GROUPS` 의 `work` items 에서 제거:
- `projects` (FolderKanban)
- `preprod` (Frame)
- `showcases` (Presentation)
- `storyboards` (Clapperboard, disabled)
- `brands` (Store, disabled)

**유지:**
- `commission` (Briefcase, profileRoles: ["client"])
- `challenges` (Trophy, roles: ["yagi_admin"], children: 3)

**Acceptance:** Sidebar work group 에 commission + challenges 만 노출. `/app/projects` 등 URL 직접 진입은 그대로 작동.

#### P9. 🔵 용어 통일 (i18n)

**Files:** `messages/ko.json` + `messages/en.json` 전수 검토.

**용어 결정 (한글 UI 기준):**

| 영문 / DB 용어 | 한글 UI | 회피할 단어 |
|---|---|---|
| commission_intakes | **의뢰** | 프로젝트, 브리프 |
| challenges | **챌린지** | 공모전, 컨테스트 |
| profile.role 'client' | **의뢰인** | 클라이언트, 고객사 |
| profile.role 'creator' | **크리에이터** | 작가, 제작자 |
| profile.role 'studio' | **스튜디오** | 팀, 회사 |
| profile.role 'observer' | **관찰자** 또는 그대로 **Observer** | 게스트 |
| workspaceRoles 'yagi_admin' | **YAGI 관리자** | 어드민, 운영자 |
| workspaces | **공간** 또는 **Workspace** (영문 그대로) | 작업공간 (장황) |
| sponsor (challenge) | **후원사** | 스폰서, 협찬 |

**검색 + 일괄 교체:**

```bash
# Project wizard 의 "직접 의뢰 / 공모전 개설" 탭 라벨 검토
grep -rn "공모전\\|컨테스트\\|스폰서\\|작업공간" src/ messages/

# 기존 "프로젝트" 유지 (Phase 1.x workspace project 의 한글) 단, 의뢰 surface 에서는 "의뢰" 사용
```

**Targets (메시지 파일에서 변경되어야 할 곳):**
- `messages/ko.json` 의 `commission.*` 키들 — "프로젝트" 사용처 → "의뢰"
- `messages/ko.json` 의 `challenges.*` 키들 — "공모전" 발견 시 → "챌린지"
- Empty state, CTA 버튼 라벨, dashboard heading 등

**범위 제한:** Phase 1.x `projects.*` 키들의 "프로젝트" 단어는 보존 (Phase 1.x 인프라가 사용 중). 단 sidebar에서 빠지므로 사용자 노출 적음.

**Acceptance:** 사용자가 "이 플랫폼은 의뢰 + 챌린지 두 개" 라는 mental model 일관되게 받음. "공모전" 같은 옛 용어 0건.

#### P11. 🔵 Workspace / Scope switcher 명확화

**File:** `src/components/app/sidebar-scope-switcher.tsx`

**Issue:** 현재 dropdown 에서 "yagi workshop / YAGI Internal / Yagi Admin" 이 평면 list로 나열되어 의미 불명확. Workspaces 와 Admin scope 구분 안 됨.

**Fix:** Dropdown 내부를 section divider 로 분리:

```tsx
<DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
  Workspaces
</DropdownMenuLabel>
{workspaces.map(ws => (
  <DropdownMenuItem onClick={() => switchTo(ws)}>
    <Briefcase className="w-3.5 h-3.5 mr-2" />
    {ws.name}
    {currentScope.kind === "workspace" && currentScope.id === ws.id && (
      <Check className="w-3.5 h-3.5 ml-auto" />
    )}
  </DropdownMenuItem>
))}

{adminScopes.length > 0 && (
  <>
    <DropdownMenuSeparator />
    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
      Admin
    </DropdownMenuLabel>
    {adminScopes.map(scope => (
      <DropdownMenuItem onClick={() => switchTo(scope)}>
        <Shield className="w-3.5 h-3.5 mr-2" />
        {scope.name}
        {currentScope.kind === "admin" && (
          <Check className="w-3.5 h-3.5 ml-auto" />
        )}
      </DropdownMenuItem>
    ))}
  </>
)}

{profileScope && (
  <>
    <DropdownMenuSeparator />
    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
      Profile
    </DropdownMenuLabel>
    <DropdownMenuItem onClick={() => switchTo(profileScope)}>
      <User className="w-3.5 h-3.5 mr-2" />
      @{profileScope.handle}
      {currentScope.kind === "profile" && (
        <Check className="w-3.5 h-3.5 ml-auto" />
      )}
    </DropdownMenuItem>
  </>
)}
```

**Trigger 자체:**
- italic 제거 (P2)
- Icon 추가: 현재 active scope kind 에 따라 leading icon (Briefcase / Shield / User)
- Display: scope name (workspace name OR "YAGI 관리자" OR `@handle`)

**Acceptance:**
- Dropdown 열면 Workspaces / Admin / Profile 3 section divided
- Active scope 옆 ✓ 표시
- 각 항목 left icon 으로 kind 시각화
- yagi_admin 만 Admin section 보임

#### P12. 🔵 Webflow light tone polish (작은 범위)

**12-1. Background off-white**

`src/app/globals.css` 또는 `tailwind.config.ts` 에서 light mode `--background` 토큰 확인.

기존 `--background: 0 0% 100%` (pure white) 라면:
```css
--background: 0 0% 98%;  /* #FAFAFA 근처 */
```

또는 Tailwind level: `bg-background` → `bg-zinc-50` 로 layout root에 적용.

**Risk:** 다른 surface 의 contrast 영향. 신중히 변경, 검증 필수.

**12-2. Typography hierarchy 강화**

App page heading default size 키움:
- 기존 `text-2xl` (24px) 또는 `text-3xl` (30px) 사용처 → desktop 에서 `text-4xl md:text-5xl` (mobile 24px → desktop 48px)
- font-weight `font-semibold` → `font-bold` 또는 `font-semibold` 그대로 유지하되 letter-spacing `tracking-tight` 적용

**Search:**
```bash
grep -rn "text-2xl\\|text-3xl" src/app/\\[locale\\]/app/
```

상위 5개 page heading만 적용 (commission, challenges, dashboard, settings, etc).

**12-3. Sidebar contrast 향상**

`src/components/app/sidebar-group-label.tsx`:
- `text-[11px]` → `text-[12px]`
- `text-foreground/50` 또는 `text-muted-foreground` → `text-foreground/65` 또는 `text-zinc-500`
- `font-medium` 추가

`src/components/app/sidebar-nav.tsx`:
- Item text `text-foreground/70` → `text-foreground/85`
- Active item: 기존 `bg-accent` 유지 + `font-semibold` 추가
- Disabled item: `text-foreground/30` 정도 충분히 흐리게

**12-4. Border 명확화**

기존 `border-border` 토큰이 너무 흐리면:
```css
--border: 0 0% 90%;  /* #E5E5E5 근처 */
```

또는 sidebar / card 등 important separator는 직접 `border-zinc-200` 적용.

**Acceptance for P12:**
- `/ko/app/commission` 진입 시 background off-white 살짝 보임
- Heading 가시성 명확 (큰 글씨)
- Sidebar items 읽기 편함 (contrast 충분)
- "평평한 그레이 wall" 느낌 사라짐

### Execution policy

- Schema 변경 없음
- Dep 추가 없음 (lucide-react Languages, Briefcase, Shield, User, Check 활용)
- Commit 1 (P1+P2+P6): `fix(phase-2-7-1): projects/new Select bug + remove italics + sidebar cleanup`
- Commit 2 (P3+P4+P11): `feat(phase-2-7-1): language switcher + role badge + scope switcher clarity`
- Commit 3 (P5+P9+P12): `style(phase-2-7-1): max-width layout + i18n unification + Webflow light polish`
- 각 commit 후 tsc/lint EXIT=0
- Codex K-05 생략 (UI/token only, 보안 영향 없음)

### Stop triggers

- Schema 변경 시도
- Dep 추가 시도
- tsc/lint fail 2회 연속
- P12 token 변경이 다른 surface contrast 깨뜨릴 시 → halt + 야기 결정

### Telegram

- 9 patches SHIPPED 알림 후 야기 visual re-check 요청
- 각 commit 별 Telegram OFF (noise 방지)

### 시간 예상

- Commit 1 (bug + italic + sidebar 정리): 1-1.5h
- Commit 2 (language switcher + role badge + scope switcher): 1.5-2h
- Commit 3 (layout + i18n + light tone): 1.5-2h
- 합계: 4-5h

### 체인 종료

3 commits 적용 후 STOP. 야기 재검토. Issue 발견 시 추가 patch.

실행 개시.
```

---

## ↑↑↑ Paste 끝
