# Phase 2.4 G1 EXECUTION AMEND — Fonts (drift cleanup)

이 amend는 G1-EXECUTION-HANDOFF.md 의 **Step 2 (fonts.ts)** 를 **REPLACE** 한다.

## Amend 사유

Phase 2.4 사전 audit에서 다음이 확인됨:

- 현재 `src/app/fonts.ts`는 **Fraunces + Inter** (next/font/google) 를 export 중.
- 이 상태는 **ADR-002 "Pretendard sole font"** 결정과 **silent drift**.
- 결과적으로 `fonts-proposed.ts` v1 ("Append wfVisualSans to existing fonts.ts") 가정은
  성립하지 않음 — `pretendard` export가 존재하지 않으므로 단순 append로는 layout.tsx의
  `pretendard.variable` 참조가 깨짐.

→ `fonts-proposed-v2.ts` 가 v1을 supersede. **단순 merge가 아닌 full replacement** 필요.

---

## Step 2 (REVISED) — fonts.ts full replacement

OLD (v1): "Append wfVisualSans export to existing fonts.ts."
NEW (v2): "Replace entire fonts.ts with fonts-proposed-v2.ts content."

### Action

#### 1. 현재 fonts.ts 상태 확인

```powershell
Get-Content C:\Users\yout4\yagi-studio\yagi-workshop\src\app\fonts.ts
```

Expected: `Fraunces`, `Inter` (next/font/google imports). 이 상태가 아니면 STOP, 야기 confirm 받기.

#### 2. fonts.ts 전체 교체

`.yagi-autobuild/phase-2-4/fonts-proposed-v2.ts` 의 본문 (파일 상단 코멘트 블록 "Source/Target" 부분 제외) 을 `src/app/fonts.ts` 에 통째로 덮어쓰기.

#### 3. 코드베이스 전체에서 fraunces / inter 참조 검색

```powershell
Select-String -Path "C:\Users\yout4\yagi-studio\yagi-workshop\src\**\*.ts","C:\Users\yout4\yagi-studio\yagi-workshop\src\**\*.tsx" `
  -Pattern "fraunces|inter\.variable|font-fraunces|font-inter" `
  -CaseSensitive:$false
```

#### 4. 각 참조 update

| Old | New |
|---|---|
| `fraunces.variable` | `pretendard.variable` |
| `inter.variable`    | (제거 — Pretendard supersedes Latin role) |
| `--font-fraunces` (CSS)  | `--font-sans` |
| `--font-inter`    (CSS)  | `--font-sans` |
| `font-fraunces`   (Tailwind) | `font-sans` |
| `font-inter`      (Tailwind) | `font-sans` |

⚠️ **세션 리뷰 필수**: 만약 어느 파일에서 Fraunces가 의도적으로 serif display로 쓰인다면 (예: editorial 강조), 이는 ADR-007의 "WF Visual Sans for display only" 결정과 직접 충돌. 이럭 use case 발견 시 STOP, 야기 confirm.

#### 5. layout.tsx (또는 root html className 위치) 업데이트

```tsx
// Before
import { fraunces, inter } from '@/app/fonts';
<html lang={locale} className={`${fraunces.variable} ${inter.variable}`}>

// After
import { pretendard, wfVisualSans } from '@/app/fonts';
<html lang={locale} className={`${pretendard.variable} ${wfVisualSans.variable}`}>
```

#### 6. tailwind.config.ts (혹시 존재하면) fontFamily 업데이트

```ts
// Before
fontFamily: {
  sans: ['var(--font-inter)', ...defaultTheme.fontFamily.sans],
  serif: ['var(--font-fraunces)', ...defaultTheme.fontFamily.serif],
}

// After
fontFamily: {
  sans: ['var(--font-sans)', ...defaultTheme.fontFamily.sans],
  display: ['var(--font-display)', 'var(--font-sans)', ...defaultTheme.fontFamily.sans],
  // serif 제거 — ADR-002/ADR-007에 serif role 없음
}
```

---

## Step 10 (REVISED) — Visual sanity check 추가 항목

기존 v1 check에 추가:

### Network tab
- ❌ 차단되어야 함: `fonts.googleapis.com` 어떤 요청도 없어야 함
- ✅ 로드되어야 함: `PretendardVariable.woff2` (~1MB)
- ✅ 로드되어야 함: `WFVisualSansVF.woff2` (367KB)

### Computed style 검증
- `body` 의 computed `font-family` 첫 entry → `"Pretendard Variable"` (not Fraunces, not Inter)
- 랜딩 H1 의 computed `font-family` 첫 entry → `"WF Visual Sans"` (EN context)
- 한글 텍스트 (예: 시그니천 카피) 의 actual rendered font → Pretendard hangul glyphs

### 색감 sanity (v1 그대로)
- `--accent` HSL 적용 후 어색하면 L=48% darker / L=58% lighter try.

---

## Telegram 발송 시 추가 항목

기존 v1 메시지에 추가:

```
✅ fonts.ts drift cleanup 완료
   - Removed: Fraunces, Inter (next/font/google)
   - Added:   Pretendard (sole body), WF Visual Sans (display)
   - ADR-002 drift closed
```

---

## ADR follow-up

이번 G1 step 2 v2 amend는 코드 drift cleanup 성격이라 별도 ADR 발행하지 않음.
대신 **ADR-002 changelog 한 줄 추가** 필요 (Phase 2.4 G1 closeout 시):

```markdown
## ADR-002 Changelog
- 2026-04-23: Phase 2.4 G1에서 코드 drift (Fraunces+Inter) 발견 후 cleanup.
  ADR-002 결정 자체는 변경 없음 (Pretendard sole body font 유지). 코드만
  ADR과 일치하도록 reconcile.
```

이 changelog는 G1 closeout commit message에 함께 들어가면 충분.

---

## 영역 보장

이 amend의 작업 영역은 **strictly**:
- `src/app/fonts.ts`
- `src/app/**/layout.tsx` (root html className 위치만)
- `tailwind.config.ts` (존재 시)

다른 src/ 파일은 grep 결과에 따라서만 touch. **DB / API / Phase 2.5 G1 영역과 disjoint 보장**.
