# Phase 4.x — Wave C.5d Prompt (PKCE template + active workspace 권위화)

> Wave D task_D1 의 Codex 5.5 K-05 LOOP 1 NO-SHIP verdict 후속.
> 2 finding 모두 non-auto-fixable → Wave C.5d 신설.
> 4 sub-task sequential. lead Builder 직접 작업 (no spawn). 끝나면 STOP.

---

## ⬇⬇⬇ COPY FROM HERE ⬇⬇⬇

**WAVE C.5d — PKCE email template wired + active workspace authoritative source. Wave D 진입 전 ff-merge blocker fix. lead Builder 직접 작업 (no spawn). 끝나면 STOP.**

Wave D task_D1 의 Codex 5.5 K-05 LOOP 1 verdict = **NO-SHIP** (HIGH-B 1 + MED-C 1, 둘 다 non-auto-fixable). ff-merge blocker → Wave C.5d 신설.

## Codex finding 요약

| # | severity | 위치 | 결함 |
|---|---|---|---|
| 1 | HIGH-B | `supabase/templates/email/{confirm,magic_link,recovery}.html` line 42, 51 | CTA + fallback 이 `{{ .ConfirmationURL }}` 직접 link → mail-client preview crawler 가 OTP 먼저 소비 가능. Wave C.5b/C.5c PKCE 작업 보호 효과 0 |
| 2 | MED-C | `src/app/[locale]/app/projects/new/actions.ts:813-821` | submitProjectAction 의 first-membership fallback (`.order("created_at", asc).limit(1)`) → multi-workspace user 가 workspace B 선택 후 제출 시 A 로 misroute. Tenant data misrouting |

## 야기 결정 (chat lock 2026-05-02)

- Wave C.5d scope = **A (둘 다)** — Finding 1 + 2 모두 fix
- Layer 1 (repo template 3개) Builder 작업
- Layer 2 (Supabase Dashboard) 야기 manual — 단 Confirm signup *Korean template* 은 이미 PKCE format 으로 paste 됨 (chat verify). Magic Link / Reset Password / Change Email 도 동일 패턴 갱신 필요 (Builder paste-ready 만들어줌)
- Layer 3 (active workspace 권위화) Builder 작업

## Codex 5.5 K-05 protocol (active)

- model = `gpt-5.5`, reasoning effort = `"high"`
- LOOP 1 → 2 → 3 까지
- mandatory: sub_03 (active workspace 변경 — auth/RLS scope 영향)
- recommended: sub_01 (template 변경 — security-adjacent)
- skip: sub_02 (Supabase Dashboard paste-ready guide 작성 만), sub_04 (verify only)

## 우선 read

1. `.yagi-autobuild\phase-4-x\_wave_d_codex_final_loop1.md` (verdict + finding 상세)
2. `.yagi-autobuild\phase-4-x\_wave_c5c_v2_result.md` (baseline HEAD d3a30a2)
3. `supabase/templates/email/confirm.html` (line 42 + 51 의 `{{ .ConfirmationURL }}` 위치)
4. `supabase/templates/email/magic_link.html` (동일 패턴)
5. `supabase/templates/email/recovery.html` (동일 패턴)
6. `src/app/[locale]/app/projects/new/actions.ts:813-821` (first-membership fallback)
7. `src/app/[locale]/app/projects/new/page.tsx` (workspace 로드 path)
8. `src/middleware.ts` 또는 active-workspace cookie/header resolver (`yagi_active_workspace`)
9. `src/components/app/workspace-switcher.tsx` (active workspace 설정 위치)

## 작업 sequence (4 sub-task sequential)

각 sub 끝마다 commit. K-05 mandatory sub 는 LOOP 0 HIGH-A 후 진행.

---

### sub_01 — Repo email template 3개 PKCE format 갱신 (HIGH-B fix, Layer 1)

#### 작업

3 file 의 line 42 + 51 갱신:

**`supabase/templates/email/confirm.html`**:
```html
<!-- line 42 부근 (CTA button) -->
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next={{ .RedirectTo }}" style="...">
  이메일 인증하기
</a>

<!-- line 51 부근 (fallback URL display) -->
<span style="color: #B4B4B4; word-break: break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next={{ .RedirectTo }}</span>
```

**`supabase/templates/email/magic_link.html`**:
- type=`magiclink`
- next=`{{ .RedirectTo }}` (또는 default `/app/dashboard`)

**`supabase/templates/email/recovery.html`**:
- type=`recovery`
- next=`{{ .RedirectTo }}` (또는 default `/auth/reset-password`)

#### `{{ .RedirectTo }}` vs hardcoded next

Supabase 의 `{{ .RedirectTo }}` 는 *signup 시 옵션 으로 명시한 emailRedirectTo* 값. signUp action 에서 emailRedirectTo 를 명시했다면 이 값이 채워짐. fallback 으로 hardcoded path 사용 시 — *템플릿 자체가 default 결정* 이라 server-side 의도와 분리될 risk.

**권장**: `{{ .RedirectTo }}` 사용 + signUp action 에서 정확한 emailRedirectTo 명시 (sub_01 of Wave C.5c 에서 이미 처리됨 — Step 5/6 그대로 작동).

만약 `{{ .RedirectTo }}` 가 NULL/empty 일 가능성이 있으면 — Supabase default 가 Site URL 로 fallback 함 → /auth/confirm 의 query param 미명시 시 next 의 default 값을 server-side 에서 처리 (sub_01 of Wave C.5c 의 `next ?? '/onboarding/workspace'` 로 이미 처리됨).

#### README 갱신

`supabase/templates/email/README.md` (있다면 갱신, 없으면 NEW):
- PKCE flow 설명
- 각 template 의 type 매핑
- Production Supabase Dashboard 와 sync 방법

#### Codex K-05 LOOP

```bash
codex review supabase/templates/email/confirm.html supabase/templates/email/magic_link.html supabase/templates/email/recovery.html supabase/templates/email/README.md \
  --model gpt-5.5 --reasoning-effort high \
  --focus "PKCE token_hash format, type enum match, RedirectTo NULL safety, fallback URL identical to CTA, no Supabase variable typos" \
  --output _wave_c5d_sub01_codex_review_loop1.md
```

Focus areas:
1. CTA + fallback URL 정확히 일치 (drift 없는지)
2. type enum (signup/magiclink/recovery) 정확
3. `{{ .RedirectTo }}` NULL 시 fallback 동작
4. Supabase template variable 오타 (`{{ .Token Hash }}` 같은 잘못된 spacing 등)

#### Acceptance

- 3 file 의 line 42 + 51 모두 PKCE format
- README.md 신규 또는 갱신
- Codex K-05 LOOP 0 HIGH-A residual

#### Commit
`fix(phase-4-x): wave-c5d sub_01 — email templates PKCE format wiring (confirm/magic_link/recovery)`

---

### sub_02 — Supabase Dashboard paste-ready guide 작성 (Layer 2 야기 manual)

#### 현상

Production Supabase 의 Email Templates 가 source-of-truth (config.toml 부재 → repo file 은 dev local 만 영향). 야기가 *Confirm signup Korean template* 만 paste 한 상태. Magic Link / Reset Password / Change Email 은 아직 default 가능성.

#### 작업

`.yagi-autobuild\phase-4-x\_wave_c5d_dashboard_paste_guide.md` (NEW):

야기가 Supabase Dashboard 의 Authentication → Email Templates 에서 paste 할 *완성된 HTML* 4개:

1. **Confirm signup** (이미 paste 됨 — verify only):
   ```
   확인: Body 의 <a href> 가 다음 형태인지
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/onboarding/workspace
   ```

2. **Magic Link** (paste 필요):
   - Subject: `[YAGI Studio] 매직 링크 로그인`
   - Body: 한국어 template + link href = `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/app/dashboard`

3. **Reset Password** (paste 필요):
   - Subject: `[YAGI Studio] 비밀번호 재설정`
   - Body: 한국어 template + link href = `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/reset-password`

4. **Change Email Address** (paste 필요):
   - Subject: `[YAGI Studio] 이메일 주소 변경 확인`
   - Body: 한국어 template + link href = `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&next=/account/settings`

각 template 의 *완성된 HTML* (sub_01 의 repo template 그대로 + Korean 톤) paste-ready 형태로.

추가 안내:
- 각 template paste 후 *Save changes* 클릭 필수
- Authentication → URL Configuration 의 *Redirect URLs* 에 `/auth/reset-password`, `/account/settings` allowlist 추가 필요 (Magic Link 는 `/app/dashboard` 가 이미 allowlist 안)

#### Files in scope
- `.yagi-autobuild\phase-4-x\_wave_c5d_dashboard_paste_guide.md` (NEW)

#### K-05 SKIP (guide 문서 만)

#### Commit
`docs(phase-4-x): wave-c5d sub_02 — Supabase Dashboard paste guide (Magic Link / Recovery / Email Change PKCE)`

---

### sub_03 — Active workspace 권위화 (MED-C fix, K-05 mandatory)

#### 현상

`submitProjectAction` (`src/app/[locale]/app/projects/new/actions.ts:813-821`):
```ts
const { data: membership } = await supabase
  .from("workspace_members")
  .select("workspace_id")
  .eq("user_id", user.id)
  .order("created_at", { ascending: true })  // ⬅ first-membership fallback
  .limit(1)
  .single();
```

→ Multi-workspace user (예: 야기 = `yagi workshop` brand + `YAGI Internal` admin) 가 *workspace switcher* 로 B 선택 후 project 생성 → A 로 misroute.

#### 해결 — yagi_active_workspace authoritative

**Step 1 — `yagi_active_workspace` cookie/header resolver 식별**

Builder 가 grep `yagi_active_workspace` 로 현재 cookie 또는 header 가 어디서 set 되는지 식별:
- `src/middleware.ts` — cookie set/read?
- `src/components/app/workspace-switcher.tsx` — 사용자가 switch 시 cookie set?
- 또는 server-side resolver 함수 (`getActiveWorkspaceId(req)` 같은) 존재?

**Step 2 — 통일된 server-side helper 작성/확장**

`src/lib/active-workspace.ts` (NEW 또는 기존 확장):
```ts
import { cookies } from 'next/headers';
import { createSupabaseServer } from '@/lib/supabase/server';

/**
 * 현재 active workspace ID 를 cookie 에서 읽어, 사용자가 그 workspace 의 member 인지 검증.
 * 검증 fail 또는 cookie 없으면 → first-membership fallback (단, 이건 fresh signup 같은 edge case 만).
 */
export async function getActiveWorkspaceId(): Promise<string> {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const cookieStore = await cookies();
  const activeWsCookie = cookieStore.get('yagi_active_workspace')?.value;

  if (activeWsCookie) {
    // Verify user 가 그 workspace 의 member
    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .eq('workspace_id', activeWsCookie)
      .maybeSingle();

    if (member) return activeWsCookie;
    // member X (cookie stale 또는 revoked) → fallback
  }

  // First-membership fallback (cookie 부재 또는 invalid)
  const { data: firstMember } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!firstMember) throw new Error('No workspace membership');
  return firstMember.workspace_id;
}
```

**Step 3 — `submitProjectAction` 갱신**

```ts
// 기존 first-membership fallback 코드 (line 813-821) 제거
// 대신:
const workspaceId = input.workspaceId ?? await getActiveWorkspaceId();
// workspaceId 의 member 인지 final verify (RLS 가 catch 하긴 하지만 명시적)
```

**Step 4 — Wizard payload 에 workspaceId 명시 전달**

`src/app/[locale]/app/projects/new/page.tsx`:
- 서버 컴포넌트에서 `getActiveWorkspaceId()` 호출
- `<NewProjectWizard activeWorkspaceId={...} />` props 로 전달

`src/app/[locale]/app/projects/new/new-project-wizard.tsx`:
- props 로 받은 `activeWorkspaceId` 를 wizard state 에 저장
- `submitProjectAction({ ..., workspaceId: activeWorkspaceId })` 명시 호출

**Step 5 — 다른 first-membership fallback audit**

Builder 가 grep `.order("created_at", { ascending: true }).limit(1)` 로 비슷한 패턴 추가 발견:
- `src/app/[locale]/app/dashboard/page.tsx` (있다면)
- `src/app/[locale]/app/projects/page.tsx` (있다면)
- `src/components/support/*` (support widget 의 workspace context)

발견된 모든 곳 → `getActiveWorkspaceId()` 로 교체.

**Step 6 — Test**

- yagi 계정 (multi-workspace): YAGI Internal 선택 → 새 project 생성 시도 → workspace_id = YAGI Internal UUID 확인
- 또는 dev 환경에서 workspace_switcher click → cookie 변경 → submit → DB row 의 workspace_id 정확

#### Codex K-05 LOOP

```bash
codex review src/lib/active-workspace.ts \
  src/app/[locale]/app/projects/new/actions.ts \
  src/app/[locale]/app/projects/new/page.tsx \
  src/app/[locale]/app/projects/new/new-project-wizard.tsx \
  $(grep -rl 'created_at.*ascending: true.*limit(1)' src/) \
  --model gpt-5.5 --reasoning-effort high \
  --focus "active workspace authority, cookie tampering trust boundary, RLS impact, race condition member-verify, fallback safety" \
  --output _wave_c5d_sub03_codex_review_loop1.md
```

Focus areas:
1. Cookie tampering — `yagi_active_workspace` cookie value 가 user-supplied. member 검증 RLS 가 catch 하지만 server-side 명시 검증?
2. Race condition — member-verify 후 actual INSERT 사이에 membership 변경 (rare)
3. Fallback safety — first-membership fallback 이 *fresh signup* 외 case 에서 안 발동? (의도치 않은 misroute)
4. 다른 first-membership 사용처 모두 갱신?
5. Wizard payload 의 workspaceId 가 client-supplied 라 server 에서 또 verify

#### Files in scope
- `src/lib/active-workspace.ts` (NEW 또는 확장)
- `src/app/[locale]/app/projects/new/actions.ts`
- `src/app/[locale]/app/projects/new/page.tsx`
- `src/app/[locale]/app/projects/new/new-project-wizard.tsx`
- `src/middleware.ts` (필요 시)
- 기타 grep 결과 file 들

#### Acceptance

- multi-workspace user 의 active workspace 정확히 반영
- cookie tampering 안전 (RLS + server verify 이중)
- 모든 first-membership fallback 패턴 갱신
- Codex K-05 LOOP 0 HIGH-A residual

#### Commit (분할)
- `feat(phase-4-x): wave-c5d sub_03a — active workspace resolver helper`
- `fix(phase-4-x): wave-c5d sub_03b — submitProjectAction uses active workspace authoritative`
- `fix(phase-4-x): wave-c5d sub_03c — wizard payload includes workspaceId from active`
- `chore(phase-4-x): wave-c5d sub_03d — remove first-membership fallback in remaining surfaces`

---

### sub_04 — 통합 verify + STOP

```powershell
cd C:\Users\yout4\yagi-studio\yagi-workshop
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

3개 모두 exit 0.

`_wave_c5d_result.md` 작성:
- 4 sub-task 결과
- Codex K-05 LOOP 결과 (sub_01, sub_03)
- 야기 manual 작업 (sub_02 의 dashboard paste) 사후 확인 사항 명시

`_run.log`:
```
<ISO> phase-4-x WAVE_C5D SHIPPED sub_count=4 codex_k05_loops=<n> sha=<latest> tsc=ok lint=baseline build=ok
<ISO> phase-4-x WAVE_C5D_END_BEFORE_WAVE_D_RETRY sha=<latest> awaiting_yagi_dashboard_paste=true
```

**STOP** — Wave D 진입 X. 야기 가:
1. sub_02 의 dashboard paste guide 따라 Magic Link / Reset Password / Change Email 갱신 (~5분)
2. PKCE smoke (실제 가입 → email link → /auth/confirm) verify
3. Multi-workspace 시나리오 smoke (YAGI Internal 선택 후 project 생성 → DB row 정확)
4. Wave D retry prompt — Codex K-05 LOOP 1 재실행

## 사고 처리

- **MAJOR** (Codex K-05 LOOP 3 후 HIGH-A residual + 야기 confirm) → 그 sub STOP, 야기 보고
- **MINOR** → 진행 + `_hold/issues_c5d.md`
- sub_03 의 first-membership fallback grep 결과가 *예상 외 많은 위치* 발견 시 → 즉시 chat 보고 (scope creep 방지)
- sub_03 의 active workspace cookie 가 *없음* (resolver 미구현 상태) 발견 시 → cookie/header set 코드도 함께 작성 필요 (scope 확장, chat 보고)

## 제약 (CRITICAL)

- **L-027 BROWSER_REQUIRED gate** — main push 절대 X
- main 에 ff-merge 절대 X. g-b-9-phase-4 에만 commit
- spawn 사용 X
- migration 적용 X (sub_01-04 모두 schema 변경 0)
- L-001 PowerShell `&&` 금지

## Output expectations

`.yagi-autobuild\phase-4-x\` 안에:
- `_wave_c5d_sub01_codex_review_loop{1,2,3}.md`
- `_wave_c5d_sub03_codex_review_loop{1,2,3}.md`
- `_wave_c5d_dashboard_paste_guide.md`
- `_wave_c5d_result.md`
- `_run.log` 추가 라인

## 시작

sub_01 부터 즉시. Codex K-05 LOOP 1 결과 chat 보고. sub_03 의 grep 결과도 chat 공유 (scope visibility).

## ⬆⬆⬆ COPY UP TO HERE ⬆⬆⬆
