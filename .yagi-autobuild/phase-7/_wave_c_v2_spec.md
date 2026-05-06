# Wave C v2 — SPEC (LOCKED)

| Field | Value |
|---|---|
| **Phase** | 7 |
| **Base** | main HEAD `ac120741` (Phase 7 PIVOT, production live at studio.yagiworkshop.xyz) |
| **Branch** | `g-b-10-phase-7` 또는 새 worktree |
| **Loop policy** | Single re-author + LOOP-1 verify (K-05 Codex + K-06 design). LOOP cycle X. |
| **Date** | 2026-05-05 |
| **Status** | **LOCKED** — §11 open decisions 모두 결정. Builder dispatch 가능. |

---

## 1. Background

Wave A / A.HF4 / B / C가 K-05 + K-06 review에서 **5 HIGH로 HOLD**, ff-merge blocked. 모든 작업 revert 완료, main 깨끗.

핸드오프 문서가 K-06 MED 5개만 inline scope에 잡았으나 review 재독해 결과 **K-05 MED 5개도 존재** → SPEC v2는 양쪽 모두 inline scope.

추가로 SPEC v1 draft에서 **HIGH-4 typography 추천이 yagi-design-system v1.0 정본 위반** (Fraunces serif는 design system에 존재하지 않음. KO display = Pretendard 600 정본). 야기 reject 정확. SPEC v2 LOCKED:
- HIGH-4 = Pretendard 600 통일 (downgrade path)
- 새 **HIGH-6** = main 전반의 Fraunces 잔재 audit + 제거 (tailwind config + globals.css + 모든 className 사용처)

| Source | HIGH | MED | LOW | inline | FU |
|---|---|---|---|---|---|
| K-05 | 2 | 5 | 0 | HIGH 2 + MED 4 | MED 1 |
| K-06 | 3 | 5 | 6 | HIGH 3 + MED 5 | LOW 6 |
| Internal audit | 1 | 0 | 0 | HIGH 1 (Fraunces) | — |
| **합계** | **6** | **10** | **6** | **15 inline** | **7 FU** |

---

## 2. Scope

### 2.1 In (inline this wave)
- **6 HIGH**: K-05 #1 #2 + K-06 #1 #2 #3 + Internal #6 (Fraunces audit)
- **9 MED**: K-05 #3 #4 #5 #7 + K-06 #4 #5 #6 #7 #8

### 2.2 FU
- **1 MED**: K-05 #6 (workspace membership RLS)
- **6 LOW**: K-06 #9 #10 #11 + #12 #13 #14

### 2.3 Out
- Phase 8 (R2 lifecycle automation)
- §M wording extension ("Submission" EN)

---

## 3. HIGH Fixes (6)

### HIGH-1 — Public submit rate-limit + CAPTCHA
**Source:** K-05 FINDING 1
**File:** `submit-application-action.ts:302`

**Solution:**
1. **Upstash Ratelimit** (§11 #1): per-IP 5/h, per-email 3/h, per-(campaign,IP) 3/h. 초과 → 429 + `Retry-After`
2. **Cloudflare Turnstile** (§11 #2): widget on form, server-side verify (siteverify endpoint), 실패 → 400 `captcha_failed`
3. 둘 다 통과 후 invite/submit 진행

**Acceptance:** 동일 IP 6th → 429 / 동일 email 4th → 429 / CAPTCHA 누락 → 400 / 정상 흐름 통과
**Cost:** 2-3h

---

### HIGH-2 — R2 key binding (presign ↔ submit)
**Source:** K-05 FINDING 2
**Files:** `submit-application-action.ts:55`, `presign-submission-upload.ts:47`

**Solution:**
1. **HMAC signed JWT upload token** (§11 #3, 15분 TTL):
   ```
   payload: { campaign_id, nonce: uuid, ip_hash: sha256(ip), iat, exp }
   ```
   `WAVE_C_UPLOAD_TOKEN_SECRET` env (service-role과 분리)
2. **Presign**: token validate → R2 key 강제 prefix `tmp/campaigns/${campaign_id}/${nonce}/${sanitized_filename}`
3. **Submit**:
   - Regex `^tmp/campaigns/${campaign.id}/[a-f0-9-]{36}/[\w.\-]+$`
   - Token nonce ↔ key nonce 일치 검증
   - HEAD-check R2: 존재 + Length ≤ 200MB + Content-Type whitelist (image/*, video/*)
   - Mismatch → 400 specific code

**Acceptance:** Cross-campaign key → 400 / Token expired → 400 / IP mismatch → 400 / HEAD 404 → 400 / 정상 흐름 통과
**Cost:** 3-4h

---

### HIGH-3 — Work preview rendering
**Source:** K-06 FINDING 1
**File:** `my-submissions/[id]/page.tsx:170-182`

**Solution:** `<WorkPreview>` 컴포넌트 신설, channel/MIME 분기:

```tsx
function WorkPreview({ submission }: { submission: Submission }) {
  if (submission.content_r2_key) {
    const url = objectPublicUrl(submission.content_r2_key);
    const filename = submission.content_r2_key.split('/').pop() ?? 'work';
    const mime = submission.content_mime ?? '';

    if (mime.startsWith('image/')) {
      return (
        <figure className="overflow-hidden rounded-card border border-subtle bg-card-deep">
          <img src={url} alt={filename} className="w-full" />
          <figcaption className="px-4 py-2 text-12 ink-tertiary">{filename}</figcaption>
        </figure>
      );
    }
    if (mime.startsWith('video/')) {
      return (
        <div className="overflow-hidden rounded-card border border-subtle bg-black">
          <video controls src={url} className="w-full" />
          <p className="px-4 py-2 text-12 ink-tertiary">{filename}</p>
        </div>
      );
    }
    return <FilenameCard filename={filename} url={url} />;
  }

  if (submission.content_external_url) {
    const u = submission.content_external_url;
    const embed = detectEmbed(u);
    if (embed) {
      return (
        <div className="aspect-video overflow-hidden rounded-card border border-subtle">
          <iframe src={embed.src} className="h-full w-full" allowFullScreen />
        </div>
      );
    }
    return <HostnameChip url={u} />;
  }

  return (
    <p className="rounded-card border border-dashed border-subtle p-6 text-center text-14 ink-tertiary">
      {t('preview.empty')}
    </p>
  );
}
```

DB: `campaign_submissions.content_mime text` 추가 (HIGH-2 HEAD-check 결과 저장).

> classNames는 yagi-design-system v1.0 utility (`rounded-card`, `border-subtle`, `bg-card-deep`, `text-12`, `ink-tertiary`) 사용.

**Acceptance:** R2 image → `<img>` / R2 video → `<video controls>` / YouTube/Vimeo → iframe / 일반 URL → favicon + hostname chip + "새 탭에서 열기" / preview 없음 → muted placeholder / 모바일 360px OK
**Cost:** 2-3h

---

### HIGH-4 — Heading consistency (Pretendard 600 통일) [LOCKED §11 #4]
**Source:** K-06 FINDING 2
**Files:**
- `my-submissions/page.tsx:88-91`
- `my-submissions/[id]/page.tsx:152-157`
- `campaigns/[slug]/submit/page.tsx:83-87`

**Decision (LOCKED):** **All three → `font-semibold text-2xl md:text-3xl tracking-display-ko`** (Pretendard 600)

근거: yagi-design-system v1.0 SKILL.md 정본 — KO display = Pretendard 600 / lh 1.18 / ls -0.01em. Fraunces는 design system에 존재하지 않는 legacy 1.0.6 잔재. list page가 outlier → detail/submit 기준 downgrade.

**Acceptance:** 3 page heading className 동일 / KO/EN 모두 Pretendard 600 (EN locale Geist 600 swap) / Fraunces 렌더 X
**Cost:** 15min

---

### HIGH-5 — Submit page guard
**Source:** K-06 FINDING 3
**File:** `campaigns/[slug]/submit/page.tsx:57-71`

**Solution:** 기존 status guard 다음 third guard:

```tsx
if (campaign.status !== 'published') return <ClosedCard ... />;

if (!campaign.allow_r2_upload && !campaign.allow_external_url) {
  return (
    <ClosedCard
      title={t('submit.no_path_available_title')}
      body={t('submit.no_path_available_body')}
      cta={{ label: t('submit.no_path_available_cta'), href: `/campaigns/${campaign.slug}` }}
    />
  );
}
```

i18n:
```json
// ko
"no_path_available_title": "이 캠페인은 응모 마감되었습니다",
"no_path_available_body": "현재 응모 채널이 닫혀 있습니다. 캠페인 페이지에서 다음 일정을 확인해주세요.",
"no_path_available_cta": "캠페인 페이지로"
// en
"no_path_available_title": "This campaign is not accepting submissions",
"no_path_available_body": "No submission channels are currently open. Check the campaign page for updates.",
"no_path_available_cta": "Back to campaign"
```

**Acceptance:** allow 둘 다 false → ClosedCard / form 미렌더 / categories fetch X / 정상 campaign 영향 X
**Cost:** 30min

---

### HIGH-6 — Fraunces audit + 전 repo 제거 (NEW)
**Source:** Internal audit (§11 #4 결정 파생)
**Trigger:** legacy `font-display` token (Fraunces resolve)이 main 전반에 잔재. wave-local fix(HIGH-4)만으로 미완 — 전 repo audit + 제거 필수.

**Verified scope (직접 read 결과):**

| File | 잔재 |
|---|---|
| `tailwind.config.ts:14` | `display: ["var(--font-fraunces)", "Pretendard Variable", "ui-serif", "Georgia"]` |
| `src/app/globals.css` `@layer base` | `.font-display { font-family: var(--font-fraunces), ... }` + `.font-display em { font-variation-settings: "opsz" 144, "SOFT" 100; }` |
| `src/app/layout.tsx` 또는 `[locale]/layout.tsx` | next/font Fraunces import + `--font-fraunces` CSS var injection (Builder grep verify) |
| `src/**/*.tsx` | `className="... font-display ..."` 사용처 (Builder grep) |

**Solution:**

1. **Audit** (Builder LOOP-0 첫 step):
   ```bash
   grep -r -n "font-fraunces\|Fraunces\|font-display\|next/font.*[Ff]raunces" \
     --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.css" \
     src/ tailwind.config.ts > .yagi-autobuild/phase-7/_wave_c_v2_fraunces_audit.md
   ```

2. **Remove**:
   - `tailwind.config.ts` `display: [...]` token **삭제** (`display-ds`는 v1.0 정본이므로 유지)
   - `globals.css` `.font-display` rule + `.font-display em` rule **삭제**
   - layout file에서 Fraunces next/font import **삭제** + `--font-fraunces` CSS var injection **삭제**
   - 모든 `className="... font-display ..."` 사용처 → `font-semibold tracking-display-ko` 교체
   - `font-display em` italic emphasis 사용처 (있으면) → Pretendard 600 + `accent-sage` 강조 또는 `italic` 으로 대체

3. **Verify**:
   - 위 grep 재실행 → 0 hits 확인 (audit doc만 예외)
   - `pnpm build` 통과
   - Visual smoke: 3 Wave C surface + landing/marketing surface 모두 Pretendard 600

**Acceptance:**
- Fraunces grep = 0 hits
- `font-display` className = 0 hits
- next/font Fraunces import = 0 hits
- Build pass
- Visual: 모든 heading Pretendard 600

**Cost:** 1-2h (audit 30min + remove 30min + verify 30min, 사용처 N개 따라 변동)

---

## 4. MED Fixes (9)

### MED-1 — Auth schema portability (security-definer RPC)
**Source:** K-05 FINDING 3
**File:** `submit-application-action.ts:125`

```sql
create or replace function public.find_user_by_email(p_email text)
returns uuid language sql security definer
set search_path = public, auth
as $$ select id from auth.users where lower(email) = lower(p_email) limit 1; $$;
revoke all on function public.find_user_by_email(text) from public, anon, authenticated;
grant execute on function public.find_user_by_email(text) to service_role;
```

Server action: existing user 발견 시 `signInWithOtp({email, options: {shouldCreateUser: false}})`. 신규 user만 `inviteUserByEmail`.

**Acceptance:** existing user → magic_link_sent=true (또는 MED-4 fallback) / invite_failed 발생 X
**Cost:** 1h

---

### MED-2 — Distribution RLS multi-channel [LOCKED §11 #5]
**Source:** K-05 FINDING 4

```sql
drop policy if exists campaign_distributions_insert_applicant on campaign_distributions;
create policy campaign_distributions_insert_applicant on campaign_distributions
  for insert to authenticated
  with check (
    exists (
      select 1 from campaign_submissions cs
      where cs.id = submission_id
        and cs.applicant_user_id = auth.uid()
        and cs.status in ('approved_for_distribution', 'distributed')
    )
  );
```
distribution-panel.tsx CTA gate: status='distributed' 도 enabled.

**Acceptance:** approved → 1st channel → 'distributed' → 2nd channel 추가 가능
**Cost:** 30min

---

### MED-3 — Presign rate-limit + lifecycle
**Source:** K-05 FINDING 5
**File:** `presign-submission-upload.ts:47`

1. Rate-limit (HIGH-1 infra reuse): per-IP 10/h
2. Submission window: `campaign.status === 'published' && now() < campaign.end_at` 위반 → 400 `campaign_closed`
3. Token binding (HIGH-2 통합)
4. Size limit: 500MB → **200MB**
5. R2 lifecycle (manual, 야기 Cloudflare Dashboard, README): `tmp/*` 24h expiry

**Acceptance:** 11번째 → 429 / closed → 400 / 200MB 초과 → 400 / 24h tmp 자동 삭제
**Cost:** 1h

---

### MED-4 — magic_link_sent fallback UX
**Source:** K-05 FINDING 7
**File:** `submit-form.tsx:217`

```tsx
{magic_link_sent ? (
  <p className="text-14 ink-secondary">{t('submit.success.email_sent', { email })}</p>
) : (
  <div className="rounded-card border border-subtle bg-card-deep p-4">
    <p className="text-14 ink-primary">{t('submit.success.email_failed')}</p>
    <Link href={`/login?email=${encodeURIComponent(email)}`}
      className="mt-2 inline-flex items-center gap-1 text-14 accent-sage hover:underline">
      {t('submit.success.login_fallback_cta')} <ArrowRight className="w-3 h-3" />
    </Link>
  </div>
)}
```

i18n:
```json
// ko
"email_sent": "{email}로 로그인 링크를 보냈습니다.",
"email_failed": "이메일 발송이 일시적으로 실패했습니다. 아래 링크로 직접 로그인해주세요.",
"login_fallback_cta": "로그인 페이지로 이동"
// en
"email_sent": "We've sent a sign-in link to {email}.",
"email_failed": "Email delivery failed temporarily. Please sign in directly.",
"login_fallback_cta": "Go to sign-in"
```

**Acceptance:** Resend mock fail → fallback link 표시
**Cost:** 30min

---

### MED-5 — Sidebar CTA promotion
**Source:** K-06 FINDING 4
**File:** `sidebar-nav.tsx:334-350`

Resting state → sage fill:
```tsx
className="... bg-sage text-sage-ink border border-transparent hover:bg-sage/90 ..."
```
Active state 그대로 (`bg-foreground text-background`) — sage→black hover/active transition.

**Acceptance:** 사이드바 가장 두드러진 element가 CTA
**Cost:** 5min

---

### MED-6 — Distribution panel CTA escalation
**Source:** K-06 FINDING 5
**File:** `distribution-panel.tsx`

```tsx
const isPrimaryEmpty = status === 'approved_for_distribution' && distributions.length === 0;
<Button
  variant={isPrimaryEmpty ? undefined : 'outline'}
  className={cn('rounded-pill', isPrimaryEmpty && 'bg-sage text-sage-ink border-transparent hover:bg-sage/90')}
>
  {t('distribution.add_cta')}
</Button>
```

**Acceptance:** approved+0 channels → sage CTA 두드러짐 / approved+1+ / distributed → outline CTA
**Cost:** 15min

---

### MED-7 — Status pill sage swap (helper)
**Source:** K-06 FINDING 6
**Files:** `my-submissions/page.tsx:30-47`, `[id]/page.tsx:60-77`, `src/lib/ui/status-pill.ts` (existing? Builder verify)

Swap: approved → full sage, distributed → soft sage. Helper extract 또는 reuse.

```ts
export function statusPillClass(status: SubmissionStatus): string {
  const base = 'inline-flex items-center rounded-pill px-2.5 py-1 text-12 border';
  switch (status) {
    case 'submitted':
      return cn(base, 'bg-muted ink-secondary border-transparent');
    case 'approved_for_distribution':
      return cn(base, 'bg-sage text-sage-ink border-transparent');
    case 'distributed':
      return cn(base, 'bg-sage-soft accent-sage border-transparent');
    case 'rejected':
      return cn(base, 'bg-muted ink-secondary border-subtle');
    case 'cancelled':
      return cn(base, 'bg-muted/40 ink-disabled border-subtle');
    default:
      return cn(base, 'bg-muted ink-secondary border-transparent');
  }
}
```

**Acceptance:** list/detail 동일 status에 동일 className / approved = full sage
**Cost:** 20min

---

### MED-8 — "or" separator hr-flank
**Source:** K-06 FINDING 7
**File:** `submit-form.tsx:384-388`

```tsx
<div className="flex items-center gap-3 text-12 ink-tertiary">
  <hr className="flex-1 border-subtle" />
  <span>{t('submit.work_content.or')}</span>
  <hr className="flex-1 border-subtle" />
</div>
```

**Acceptance:** 데스크탑/모바일 360px 모두 두 hr이 "or" flank
**Cost:** 5min

---

### MED-9 — Metric edit affordance promotion
**Source:** K-06 FINDING 8
**File:** `distribution-panel.tsx:236-282`

```tsx
<Button variant="ghost" size="sm" className="rounded-pill gap-1.5">
  <Pencil className="w-3 h-3" />
  {t('distribution.metric.edit')}
</Button>
```

**Acceptance:** Resting state hit-target border + icon
**Cost:** 10min

---

## 5. FU Registry

| ID | Source | Description | Trigger to revisit |
|---|---|---|---|
| FU-W2 | K-05 #6 | submissions.applicant_user_id + W3/W4/W5 RLS 강화 | Workspace 2nd member 추가 시 |
| FU-D1 | K-06 #9 | metric grid mobile `grid-cols-1 md:grid-cols-3` | usage 측정 후 |
| FU-D2 | K-06 #10 | detail header campaign title link | nav 패턴 분석 후 |
| FU-D3 | K-06 #11 | sidebar `Coming soon` → `nav.coming_soon` i18n | brand kind 활성화 시 |
| FU-W3 | K-06 #12 | informational PASS | N/A |
| FU-W4 | K-06 #13 | informational PASS | N/A |
| FU-W5 | K-06 #14 | "Submission" EN noun §M extension | 야기 §M 결정 시 |
| **FU-EI1** | **STEP 1 audit Cat B + Cat C** | **Editorial Visual Identity Wave: marketing/landing/journal/work editorial surface (~25 hits, currently Pretendard fallback) + OG cards + email templates (~8 hits, runtime CDN Fraunces). v1.0 alignment = Redaction 10/50 italic for EN with locale-aware `[lang="en"]` swap, Pretendard 600 KO, OG/email font decision per yagi.** | **yagi visual review 또는 Phase 8** |

---

## 6. Migration Plan

**File:** `supabase/migrations/20260507000000_phase_7_wave_c_v2.sql`

Wave C v2 자체 migration은 다음 3개만 포함 (lean):
1. `find_user_by_email(text)` security-definer RPC (MED-1)
2. `campaign_distributions_insert_applicant` policy drop + recreate (MED-2)
3. `campaign_submissions.content_mime text` column 추가 (HIGH-3)

**Dependency:** Phase 7 base migration 2개가 main에서 revert되어 미적용 상태. Wave C v2 migration 적용 전 base 복원 필수:
- `20260506000000_phase_7_campaigns.sql` (campaigns/submissions/distributions tables + base RLS)
- `20260506200000_phase_7_workspaces_kind_creator.sql` (`workspaces.kind` 'creator' addition)

복원 방법: kickoff §STEP 0 (git worktree 추출 — PRODUCT-MASTER 복구 동일 패턴).

---

## 7. Implementation Order

1. **STEP 0** Phase 7 base migration 2개 복원 + apply
2. **STEP 1** HIGH-6 Fraunces audit + remove (전 repo, **첫 code change**)
3. **STEP 2** Wave C v2 migration apply
4. **STEP 3** Backend infra (HIGH-1 / HIGH-2 / MED-1 / MED-3)
   - `src/lib/ratelimit.ts` (Upstash) — HIGH-1, MED-3 공용
   - `src/lib/upload-token.ts` (HMAC sign/verify) — HIGH-2
   - `submit-application-action.ts` 재작성
   - `presign-submission-upload.ts` 재작성
5. **STEP 4** CAPTCHA integration (HIGH-1)
6. **STEP 5** Frontend Wave A (sidebar IA + MED-5)
7. **STEP 6** Frontend Wave B (route surfaces) — HIGH-4 + HIGH-5 + MED-7 + MED-8 + MED-4
8. **STEP 7** Frontend Wave C (distribution panel + work preview) — HIGH-3 + MED-6 + MED-9
9. **STEP 8** i18n (no_path_available, email_failed, login_fallback_cta, preview.empty, distribution.metric.edit)
10. **STEP 9** R2 lifecycle setup (manual, 야기) + README
11. **STEP 10** LOOP-1 verify (§8)
12. **STEP 11** Ship: main merge → studio.yagiworkshop.xyz auto-deploy
13. **STEP 12** lessons.md

---

## 8. Verification Plan (LOOP-1)

### 8.1 K-05 (Codex gpt-5.5 / Opus 4.7 fallback)
- 6 HIGH closed
- 4 K-05 MED closed
- K-05 #6 → FU-W2 명시

### 8.2 K-06 (Design)
- 3 K-06 HIGH closed
- 5 K-06 MED closed
- LOW informational PASS / LOW polish FU 등록

### 8.3 Smoke matrix

| # | Path | Expected |
|---|---|---|
| S1 | R2 image submit | success + `<img>` preview |
| S2 | R2 video submit | `<video controls>` |
| S3 | YouTube URL | iframe |
| S4 | Vimeo URL | iframe |
| S5 | 일반 URL | hostname chip |
| S6 | no_path | ClosedCard |
| S7 | 6th IP | 429 + Retry-After |
| S8 | 4th email | 429 |
| S9 | CAPTCHA missing | 400 |
| S10 | Cross-campaign key | 400 key_mismatch |
| S11 | Token expired | 400 token_expired |
| S12 | HEAD 404 | 400 object_not_found |
| S13 | 250MB presign | 400 file_too_large |
| S14 | Existing user (Resend OK) | success + email_sent |
| S15 | Existing user (Resend fail) | success + fallback |
| S16 | approved → 1st channel | 'distributed' |
| S17 | distributed → 2nd channel | success (multi) |
| S18 | approved + 0 ch | sage CTA |
| S19 | approved → distributed pill | full→soft sage |
| S20 | KO/EN heading 3 surface | Pretendard 600 / Geist 600 |
| S21 | Fraunces grep 전 repo | 0 hits |

### 8.4 Pass criteria
- S1-S21 모두 통과
- K-05 + K-06 verdict = PASS or NEEDS-MINOR (LOW only)
- Production smoke 5 random campaigns 정상

---

## 9. Rollback

- App: `git revert <merge-sha>` → main push (auto-deploy)
- Migration: footer rollback section. `workspaces.kind` drop은 data loss 가능, 야기 명시 confirm 후
- Vercel preview: PR preview deploy로 smoke

---

## 10. Out-of-Scope

- Phase 8 R2 lifecycle automation
- §M wording extension
- Codex CLI version upgrade

---

## 11. Open Decisions — ALL LOCKED ✅

| # | Decision | LOCKED | Note |
|---|---|---|---|
| 1 | Rate-limit infra | **Upstash Ratelimit** | Phase 7 sub_5 패턴 재사용 |
| 2 | CAPTCHA provider | **Cloudflare Turnstile** | free, R2/Vercel align |
| 3 | Upload token format | **HMAC signed JWT** | 야기 미답 → recommend default lock. 변경 원하면 LOOP-0 시작 전 통보 |
| 4 | Heading typography | **Pretendard 600 통일** | yagi-design-system v1.0 정본. Fraunces 잔재는 HIGH-6에서 전 repo 제거 |
| 5 | Distribution multi-channel | **RLS loosen + multi-channel** | §C.3 EXIT 의도 |

**SPEC LOCKED. Builder dispatch 가능.**

---

## 12. References

- Review docs: `.yagi-autobuild/phase-7/_wave_c_codex_review.md`, `_wave_c_k06_design_review.md`
- PRODUCT-MASTER §C.0.5, §C.3, §M v1.7
- Phase 7 SPEC v3 (`.yagi-autobuild/phase-7/SPEC.md`)
- yagi-design-system v1.0 (`C:\Users\yout4\.claude\skills\yagi-design-system\SKILL.md`)
- Memory rules: #10, #19, #20, #21, #23

---

## 13. Attachments

- `20260507000000_phase_7_wave_c_v2.sql` (Migration SQL — 동일 디렉토리)
- `_wave_c_v2_kickoff.md` (Builder kickoff prompt — 동일 디렉토리)

---

**END OF SPEC v2 (LOCKED) — 2026-05-05**
