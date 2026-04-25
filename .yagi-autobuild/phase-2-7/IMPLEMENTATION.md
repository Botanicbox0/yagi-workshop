# Phase 2.7 — Implementation Guide v2

**Companion to** `SPEC.md` v2 (soft launch + commission intake)
**Status:** v2, 2026-04-25 morning

---

## §1 — Schema canonical migration

File: `supabase/migrations/20260425000000_phase_2_7_commission_soft_launch.sql`

전체 SQL은 SPEC §3 sections 1-7 그대로 사용. 추가 detail:

### Default RLS access pattern

```sql
-- Confirm FORCE RLS active for both new tables
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class WHERE relname IN ('clients', 'commission_intakes');
-- expect: both relrowsecurity=t and relforcerowsecurity=t
```

### Migration ordering

Section 순서 중요:
1. profiles role enum 확장 (다른 테이블의 role check 의존)
2. clients (commission_intakes의 FK)
3. commission_intakes
4. challenges sponsor_client_id (clients FK)
5. RLS policies
6. State machine triggers
7. Realtime publication

### Post-migration: types regen

```bash
pnpm supabase gen types typescript --project-id <project_id> --schema public > src/lib/supabase/database.types.ts
```

types regen 후 tsc EXIT=0 확인.

---

## §2 — Library files (new)

### `src/lib/commission/types.ts`
```ts
export type CommissionIntakeState = 'submitted' | 'admin_responded' | 'closed' | 'archived';
export type ClientCompanyType = 'label' | 'agency' | 'studio' | 'independent' | 'other';
export type CommissionCategory = 'music_video' | 'commercial' | 'teaser' | 'lyric_video' | 'performance' | 'social' | 'other';
export type BudgetRange = 'under_5m' | '5m_15m' | '15m_30m' | '30m_50m' | '50m_100m' | '100m_plus' | 'negotiable';

export type CommissionIntake = {
  id: string;
  client_id: string;
  title: string;
  category: CommissionCategory;
  budget_range: BudgetRange;
  deadline_preference: string | null;
  reference_urls: string[];
  reference_uploads: { object_key: string; file_name: string; size_bytes: number }[];
  brief_md: string;
  timestamp_notes: string | null;
  state: CommissionIntakeState;
  admin_response_md: string | null;
  admin_responded_at: string | null;
  admin_responded_by: string | null;
  created_at: string;
  updated_at: string;
};
```

### `src/lib/commission/schemas.ts` (Zod)
```ts
import { z } from "zod";

export const commissionIntakeFormSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.enum(['music_video','commercial','teaser','lyric_video','performance','social','other']),
  budget_range: z.enum(['under_5m','5m_15m','15m_30m','30m_50m','50m_100m','100m_plus','negotiable']),
  deadline_preference: z.string().date().optional().nullable(),
  reference_urls: z.array(z.string().url()).max(3).default([]),
  reference_uploads: z.array(z.object({
    object_key: z.string(),
    file_name: z.string(),
    size_bytes: z.number().int().nonnegative(),
  })).max(5).default([]),
  brief_md: z.string().min(50).max(10000),
  timestamp_notes: z.string().max(5000).optional().nullable(),
});

export const clientSignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  company_name: z.string().min(1).max(120),
  company_type: z.enum(['label','agency','studio','independent','other']),
  contact_name: z.string().min(1).max(60),
  contact_phone: z.string().optional().nullable(),
  website_url: z.string().url().optional().nullable(),
});

export const commissionAdminResponseSchema = z.object({
  intake_id: z.string().uuid(),
  response_md: z.string().min(20).max(20000),
});
```

### `src/lib/commission/queries.ts`
- `listOwnIntakes(userId)` — client 본인 intake list
- `getIntakeById(id, userId)` — RLS 의존, 본인 또는 admin만
- `listAdminQueue(state?, limit?, offset?)` — admin commission queue
- `listClientsForSponsor(query?)` — admin sponsor dropdown 검색

### `src/lib/commission/actions.ts`
- `submitCommissionIntakeAction(formData)` — server action, validates with Zod, INSERT
- `updateCommissionIntakeAction(id, formData)` — owner pre-response edit
- `respondToCommissionIntakeAction(intake_id, response_md)` — admin response + state transition + notification
- `archiveCommissionIntakeAction(id)` — admin archive

### `src/lib/commission/r2.ts`
Phase 2.5 G4 R2 client 패턴 재사용. New bucket: `yagi-commission-files`.

---

## §3 — Routes

### Public
- `/commission/page.tsx` — sales landing (G3 redesign)

### Auth
- `/auth/sign-up/page.tsx` — 기존, role=client 분기 추가
- `/auth/sign-up/client-info/page.tsx` — client-specific step (또는 같은 페이지에 분기)

### App
- `/app/commission/page.tsx` — 본인 intake list
- `/app/commission/new/page.tsx` — intake form
- `/app/commission/[id]/page.tsx` — own intake detail
- `/app/settings/client-profile/page.tsx` — clients row edit

### Admin
- `/app/admin/commissions/page.tsx` — queue
- `/app/admin/commissions/[id]/page.tsx` — admin response form

### Touched (existing)
- `/app/admin/challenges/new/page.tsx` — sponsor section 추가
- `/app/admin/challenges/[slug]/edit/page.tsx` — sponsor section
- `/challenges/[slug]/page.tsx` — sponsor display

---

## §4 — Sidebar mapping (extends Phase 2.6 ADR-010)

`src/components/app/sidebar.tsx` items 배열 확장:

```ts
// 작업 group
{
  label: "작업",
  items: [
    // 기존: projects, preprod, showcases, challenges, storyboards, brands
    // 추가:
    {
      key: "commission",
      label: "내 의뢰",
      href: "/app/commission",
      roleGate: (ctx) => ctx.profile.role === 'client',
    },
  ],
},

// 시스템 group → admin items
{
  label: "시스템",
  items: [
    // 기존: settings, admin
    // admin sub-items 안에:
    {
      key: "admin_commissions",
      label: "의뢰 관리",
      href: "/app/admin/commissions",
      roleGate: (ctx) => ctx.workspaceRoles.includes('yagi_admin'),
    },
  ],
}
```

자동 hide rule (Phase 2.6 G1) 그대로 적용. Client는 다른 작업 항목들 안 보이고 "내 의뢰" 만 보임.

---

## §5 — Notification kinds

`src/lib/notifications/kinds.ts` 확장:

```ts
export type NotificationKind =
  | // ... 기존 13개
  | "commission_intake_received"        // admin (yagi_admin) 받음, high
  | "commission_intake_response_sent";  // client 받음, high

export const SEVERITY_BY_KIND: Record<NotificationKind, "high" | "medium" | "low"> = {
  // ...기존
  commission_intake_received: "high",
  commission_intake_response_sent: "high",
};
```

`messages/ko.json` 추가:
```json
"notifications": {
  "events": {
    "commission_intake_received": {
      "title": "새로운 의뢰가 도착했어요",
      "body": "{company_name}에서 \"{intake_title}\" 의뢰를 보냈습니다."
    },
    "commission_intake_response_sent": {
      "title": "YAGI에서 답변이 왔어요",
      "body": "\"{intake_title}\" 의뢰에 대해 YAGI가 답변을 남겼어요. 확인해보세요."
    }
  }
}
```

`messages/en.json` 동일 stub.

`supabase/functions/notify-dispatch/index.ts` 두 kind 인라인 template 추가 (Phase 2.5 G7 패턴 follow).

---

## §6 — Premium redesign details (G3)

### Landing `/` 재구성

기존 landing 의 hero 다듬기 + 새 sections 추가. 전체 다시 쓰기보다 **기존 컴포넌트 활용 + 섹션 재배치 + 카피 강화**.

#### Hero
- 거대 타이포: `text-display-2xl` (clamp 64-128px), `font-display`, letter-spacing tight
- 배경: 검정 + subtle dark gradient (no video for perf)
- 헤드라인 (한국어): "음악비디오, AI로 다시 태어나다." (또는 야기 톤에 맞게 변형)
- Sub: "엔터 레이블, 광고 에이전시, 아티스트를 위한 AI VFX 플랫폼"
- Dual CTA: "AI VFX 의뢰하기" (primary) + "챌린지 둘러보기" (secondary)

#### Section 1: 의뢰 인트로
- "어떻게 작동하나요?" 3-step diagram
- 1. 의뢰 작성 → 2. YAGI 견적 상담 → 3. 작업 + 납품
- /commission 으로 이동 CTA

#### Section 2: 진행 중인 챌린지
- Phase 2.5 `listPublicChallenges({ state: 'open', limit: 2 })` 재사용
- 카드 2개 가로 배치 (모바일 세로)
- "전체 챌린지 보기" CTA → /challenges

#### Section 3: Creator 가입 유도
- "당신의 작품을 알릴 무대" 헤드라인
- "챌린지 참여하고 의뢰 받기" CTA → /auth/sign-up?role=creator

#### Footer
- YAGI Workshop 로고
- 사업자번호, 주소, 대표
- 약관/개인정보처리방침/문의 링크

### `/commission` (sales page)

#### Hero
- 거대 타이포 "Your music video, re-imagined."
- Sub Korean: "AI 비주얼 이펙트로 새로운 차원의 뮤직비디오를 만들어드립니다."
- CTA "지금 의뢰 작성하기" → /auth/sign-up?role=client (or /app/commission/new if logged in)

#### Section 1: Process timeline
4-step horizontal flow (mobile vertical):
1. **Brief** — 의뢰 작성 (5분)
2. **Quote** — YAGI 견적 상담 (1-2 영업일)
3. **Create** — AI VFX 작업 (협의된 일정)
4. **Deliver** — 결과물 납품 + 수정 1회 무료

#### Section 2: Categories
4 카드 grid:
- Music Video — "뮤직비디오 전체/부분 비주얼"
- Commercial — "광고/캠페인 영상"
- Teaser — "신곡 발매 티저, 컴백 영상"
- Lyric Video — "가사 영상"

#### Section 3: 가격 & 신뢰
- "예산은 협의 가능합니다" 톤
- 카테고리별 예산 reference range 표 (under_5m ~ 100m_plus)
- "투명한 수수료, 명확한 계약서" 메시지

#### Section 4: Final CTA
- "지금 의뢰 작성하기" 큰 버튼
- "또는 [info@yagiworkshop.xyz](mailto:...)로 문의" 링크

### Design tokens

기존 그대로:
- `--accent-primary`: Webflow blue (Phase 2.4 G1)
- `--font-display-sans`: Bricolage Grotesque
- `--font-body`: Pretendard

추가 typography utility (Tailwind class):
```ts
// tailwind.config.ts
fontSize: {
  'display-2xl': ['clamp(4rem, 10vw, 8rem)', { lineHeight: '0.95', letterSpacing: '-0.04em' }],
  'display-xl': ['clamp(3rem, 7vw, 6rem)', { lineHeight: '1', letterSpacing: '-0.03em' }],
  'display-lg': ['clamp(2.25rem, 5vw, 4rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
}
```

`globals.css`에 add — 변수가 아닌 Tailwind theme extension만으로 충분.

### Motion

Framer Motion 이미 있는지 확인. 없으면 CSS-only로 진행:
- Hero entrance: `animate-fade-in-up` (1s ease-out)
- Section reveal on scroll: IntersectionObserver + `opacity-0 translate-y-8` → in-view 시 `opacity-100 translate-y-0`

GSAP, ScrollTrigger 등 새 dep 추가 금지.

---

## §7 — Pre-conditions (G1 entry)

- [x] Phase 2.5 + 2.6 SHIPPED on main (확인됨)
- [ ] R2 bucket `yagi-commission-files` 생성 (야기 morning manual, Cloudflare ENAM)
- [ ] `.env.local`: `CLOUDFLARE_R2_COMMISSION_BUCKET=yagi-commission-files`
- [x] Phase 2.5 R2 client 코드 재사용 가능 (`src/lib/r2/client.ts` 패턴)
- [x] notify-dispatch Edge Function 패턴 확립
- [x] Phase 2.6 sidebar IA 그대로

R2 bucket 누락 시 G2 file upload 단계까지 유예 가능 (G1/G2 schema/form 진행 후 첨부 기능만 stub).

---

## §8 — Verification (G4 closeout smoke)

End-to-end 5개:

1. **Client signup → intake**
   - 새 익명 브라우저로 `/commission` 방문
   - "지금 의뢰 작성하기" 클릭
   - signup 진행 (회사명, 담당자 등)
   - 자동 redirect `/app/commission/new`
   - intake form 제출 (50자+ brief, 1 ref URL)
   - state submitted 확인

2. **Admin response**
   - admin login으로 `/app/admin/commissions` 방문
   - 위 intake 보임
   - response form에 "안녕하세요, 견적 상담 일정 잡겠습니다 ..." 작성
   - state admin_responded 확인
   - client 받은 알림 in-app 표시 확인

3. **Sponsor challenge create**
   - admin `/app/admin/challenges/new`
   - sponsor section toggle on
   - existing client 검색하여 선택 (또는 새 client 등록)
   - 챌린지 publish
   - public `/challenges/[slug]` 에 sponsor 표시 확인

4. **Phase 2.5 regression**
   - 기존 challenge submit/gallery/announce flow 그대로 작동 확인
   - 챌린지 close → winner 발표 → notification fanout

5. **Phase 2.6 regression**
   - sidebar 4-group + scope selector + first-use tooltip
   - public exit link
   - help link at /app/admin/challenges/new
   - mobile drawer

추가 mobile <768px 모든 새 surface 작동 확인.

---

## §9 — Edge cases

### Client without commission intake
- `/app/commission` empty state: "첫 의뢰 작성하기" CTA

### Admin queue empty
- "아직 의뢰가 없어요" placeholder

### Reference upload during signup-in-progress
- Server action에서 user.id check, signup 미완료 시 reject

### Sponsor delete cascade
- `clients` row 삭제 시 `challenges.sponsor_client_id` SET NULL (FK 정의 그대로)
- challenge 자체는 보존, sponsor 표시만 사라짐

### Client 가 자기 intake 삭제
- MVP에 delete 없음. archive 만 (admin only).
- Client는 own intakes 에서 archive 신청 → admin이 수동 archive

---

**END OF IMPLEMENTATION v2**
