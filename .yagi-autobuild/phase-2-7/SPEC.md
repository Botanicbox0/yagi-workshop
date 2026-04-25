# Phase 2.7 — Soft Launch (Commission Intake + Sponsored Challenge)

**Status:** v2 (web Claude 2026-04-25 morning, supersedes v1)
**Duration target:** 1.5-2 days (월요일 soft launch 목표)
**Strategy:** Option 1 — 축소 빌드 + 월요일 soft launch + Phase 2.8 진짜 의뢰 워크플로우 빌드.

---

## §0 — Why v2 (course correction)

### v1 의 문제

1. **Schema 충돌:** `projects`, `project_milestones`, `project_deliverables`는 Phase 1.2부터 존재하는 workspace-scoped 테이블 (10+ call sites: invoices/meetings/preprod/showcases). v1이 이를 의뢰 commission 의미로 덮어쓰려 함 → Phase 1.x 박살.
2. **Scope 과잉:** 9 gates × 33-46h 추정. 월요일 공개와 incompatible.
3. **AI VFX 의뢰의 본질을 놓침:** 야기가 명확화한 "타임라인 annotation 기반 brief (영상 + timestamp 마킹)"는 v1 의 "markdown brief + reference URL" 보다 훨씬 specific. 일반 commission marketplace 패턴 안 맞음.
4. **챌린지의 역할을 곡해:** 야기 명확화: "챌린지는 그대로. 삼양 같은 회사가 불닭챌린지 의뢰하면 우리가 공개 페이지에 게시." → **챌린지는 sponsored campaign이지, AI VFX 의뢰 marketplace 아님.**

### v2 의 핵심 결정

**두 의뢰 track을 구분, 각각 가장 가벼운 형태로 MVP에 진입:**

#### Track A — AI VFX 의뢰 (single-creator commission)
- **MVP 형태**: **Intake form** — 영상 링크/파일 + markdown brief + timestamp 텍스트 마킹 (예: "0:23 - 캐릭터 머리 위 불꽃")
- **NOT MVP**: 영상 player + interactive timeline annotation UI (Phase 2.8 진짜 빌드)
- **누가 처리?**: 야기 (또는 팀)이 yagi-vfx-studio에서 manual 작업. 의뢰 → 견적 → 작업 → 납품의 admin workflow는 manual.
- **MVP 데이터 흐름**: Client 폼 제출 → DB row → 야기 Telegram 알림 → 야기가 카톡/이메일로 manual 후속.

#### Track B — Sponsored Challenge (B2B 챌린지 캠페인)
- **MVP 형태**: 기존 Phase 2.5 challenges 인프라 그대로 + `challenges.sponsor_client_id uuid nullable` 1줄 schema 추가. Sponsored 표시만 노출.
- **누가 처리?**: 야기가 admin으로 챌린지 만들 때 sponsor 지정. 후원사 noting + 공개 페이지에서 "Sponsored by 삼양" 식 표시.
- **MVP 데이터 흐름**: 외부 sponsor 영업 → 야기 admin이 Phase 2.5 G5 챌린지 생성 surface에서 sponsor 입력 → 기존 챌린지 flow 그대로.

**결과:** 두 track 다 작동하는 platform이 월요일 공개. 진짜 자동화된 marketplace는 Phase 2.8+에서 사용자 반응 보고 빌드.

---

## §1 — What stays, what's added, what's deferred

### 그대로 유지 (전혀 손대지 않음)

- Phase 2.5 챌린지 전체 surface (`/challenges/*`, gallery, submit, admin)
- Phase 2.6 sidebar/scope-selector/help-link/public-exit/mobile-drawer
- Phase 1.x `projects` (workspace-scoped, invoice-coupled) — **commission 용도와 별개로 유지**
- `creators`, `studios` 테이블 (Phase 2.5 G2 추가 컬럼 그대로)
- 모든 기존 RLS 정책

### 추가 (최소)

#### Schema (3-table + 1-column)
1. `clients` — 의뢰인 회사 정보 (Phase 1.x `profiles`는 이미 존재, role enum에 `client` 추가)
2. `commission_intakes` — AI VFX 의뢰 폼 제출 단위 (NOT `projects`)
3. `commission_intake_messages` — admin ↔ client 후속 connection (선택, MVP에 안 들어가도 됨 — 카톡/이메일 outside 가능)
4. `challenges.sponsor_client_id uuid nullable` — sponsored challenge 표시용

#### UI surfaces (5개 페이지)
1. `/commission` — public landing (의뢰인용 sales page)
2. `/auth/sign-up?role=client` — client signup 분기
3. `/app/commission/new` — intake form (영상 링크 + brief + timestamp marks 텍스트)
4. `/app/commission/[id]` — client 본인 intake 진행 상황 (initial state, admin 후속 응답)
5. `/app/admin/commissions` — admin intake 큐 + 응답 상태 관리

#### Sidebar 추가
- Client role 일 때: "작업" 그룹에 "내 의뢰" 추가
- Admin role 일 때: "시스템" 그룹에 기존 "관리자" 하위 "의뢰 관리" 노드

#### Premium redesign (축소판)
- Landing `/` — Hero 강화 + Phase 2.5 challenges preview + commission CTA 섹션
- `/commission` — sales page (Webflow 톤, 1페이지)
- `/challenges` 와 `/u/[handle]` 은 **post-launch 정비**

#### Notification kinds (3개만)
- `commission_intake_received` — admin (야기) 받음, high
- `commission_intake_response_sent` — client 받음, high (admin이 manually trigger)
- `challenge_sponsor_announced` — public, medium (sponsored challenge 공개 시 — optional)

### Phase 2.8+ 로 deferred (명시)

- **Interactive timeline annotation player** (영상 위 클릭 마킹) — 진짜 AI VFX brief의 차별점, 빌드 시간 6-10h
- **Creator proposal marketplace** — `/app/discover` + `project_proposals` 테이블 + matching workflow
- **Contract PDF + 양측 sign flow** — 법적 effort, 양측 sign UI, escrow stub
- **Project workspace** (milestones/deliverables/messages) — full project execution surface
- **Portfolio surface** (`/u/[handle]/portfolio`) + ranking_tier auto-upgrade
- **Premium redesign 풀 적용** (`/challenges`, `/u/[handle]` cinematic redesign)
- **모든 v1 SPEC §3 의 7-table 모델** — 너무 큼. 사용자 보고 빌드.

---

## §2 — User journeys (MVP)

### Journey A — 대기업이 AI VFX 의뢰

1. 마케팅 담당자가 `yagiworkshop.xyz` 방문 → Hero에서 "AI VFX 의뢰" CTA 보임
2. `/commission` sales page → "이 플랫폼이 뭐 하는 곳" 30초 안에 파악 → "지금 의뢰하기" CTA
3. `/auth/sign-up?role=client` → email + 비밀번호 + 회사명 + 담당자명 + 회사 type
4. Signup 후 자동 redirect → `/app/commission/new`
5. Intake form 작성:
   - 프로젝트 제목
   - 카테고리 (음악비디오 / 광고 / 티저 / 기타)
   - 예산 범위 (under_5m / 5-15m / 15-30m / 30-50m / 50-100m / 100m+ / 협의)
   - 희망 납기 (date or "협의")
   - 영상 reference URL (YouTube/Vimeo/Instagram, 최대 3개)
   - 참고 파일 업로드 (R2 optional, max 5 files × 200MB)
   - **Brief markdown** — 자유 서술
   - **Timestamp marks textarea** — 한 줄당 "0:23 - 캐릭터 머리 위 불꽃" 형식 (free-form, 검증 없음)
6. Submit → `commission_intakes.state = 'submitted'` → 야기 Telegram + email
7. 야기가 1-2 영업일 내에 카톡/이메일로 client에게 답신 (manual). admin queue (`/app/admin/commissions`)에서 "응답 완료" 상태 stamp.
8. 후속 작업은 outside-of-platform (카톡/이메일/줌). 진짜 marketplace는 Phase 2.8.

### Journey B — 삼양이 챌린지 후원

1. 야기가 삼양과 outside 영업 → "불닭 챌린지" 합의
2. 야기 admin login → 기존 Phase 2.5 G5 `/app/admin/challenges/new` flow
3. 챌린지 생성 폼에 **"Sponsor (회사 선택)" dropdown 추가** — `clients` 테이블에서 회사 선택 (또는 새로 등록)
4. 챌린지 publish → `/challenges/[slug]` 공개 페이지에 "Sponsored by 삼양" 노출
5. Creator들이 기존 Phase 2.5 flow로 참여
6. 우승자 선정 + sponsor에게 결과 보고 (manual)

### Journey C — Creator 가 sponsored challenge 참여

기존 Phase 2.5 challenge 참여 flow 그대로. 사용자 입장에서 sponsor가 표시될 뿐 행동 변화 없음.

### Journey D — Observer 가 commission 보고 호기심

`/commission` 같은 public 페이지는 누구나 볼 수 있음. CTA 클릭 시 client signup 유도. Observer가 이 모든 걸 보고 "나도 의뢰 받고 싶다" 싶으면 Creator 회원가입.

---

## §3 — Schema (minimal additions)

### Section 1 — profiles role enum 확장

```sql
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('creator','studio','observer','client'));
```

### Section 2 — clients 테이블

```sql
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name text NOT NULL CHECK (char_length(company_name) BETWEEN 1 AND 120),
  company_type text NOT NULL CHECK (company_type IN (
    'label','agency','studio','independent','other'
  )),
  contact_name text NOT NULL CHECK (char_length(contact_name) BETWEEN 1 AND 60),
  contact_email citext NOT NULL,
  contact_phone text,
  website_url text,
  instagram_handle text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;
```

### Section 3 — commission_intakes 테이블

```sql
CREATE TABLE IF NOT EXISTS public.commission_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  category text NOT NULL CHECK (category IN (
    'music_video','commercial','teaser','lyric_video','performance','social','other'
  )),
  budget_range text NOT NULL CHECK (budget_range IN (
    'under_5m','5m_15m','15m_30m','30m_50m','50m_100m','100m_plus','negotiable'
  )),
  deadline_preference date,
  reference_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  reference_uploads jsonb NOT NULL DEFAULT '[]'::jsonb,
  brief_md text NOT NULL CHECK (char_length(brief_md) BETWEEN 50 AND 10000),
  timestamp_notes text CHECK (timestamp_notes IS NULL OR char_length(timestamp_notes) <= 5000),
  state text NOT NULL DEFAULT 'submitted' CHECK (state IN (
    'submitted','admin_responded','closed','archived'
  )),
  admin_response_md text,
  admin_responded_at timestamptz,
  admin_responded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_intakes FORCE ROW LEVEL SECURITY;
CREATE INDEX commission_intakes_client_idx ON public.commission_intakes(client_id);
CREATE INDEX commission_intakes_state_idx ON public.commission_intakes(state);
```

### Section 4 — challenges sponsor 컬럼

```sql
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS sponsor_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS challenges_sponsor_idx ON public.challenges(sponsor_client_id)
  WHERE sponsor_client_id IS NOT NULL;
```

### Section 5 — RLS policies

#### clients
```sql
CREATE POLICY clients_select_self_or_admin ON public.clients FOR SELECT TO authenticated
  USING (id = (select auth.uid()) OR public.is_yagi_admin((select auth.uid())));

CREATE POLICY clients_insert_self ON public.clients FOR INSERT TO authenticated
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY clients_update_self_or_admin ON public.clients FOR UPDATE TO authenticated
  USING (id = (select auth.uid()) OR public.is_yagi_admin((select auth.uid())))
  WITH CHECK (id = (select auth.uid()) OR public.is_yagi_admin((select auth.uid())));
```

#### commission_intakes
```sql
CREATE POLICY commission_intakes_select_owner_or_admin ON public.commission_intakes FOR SELECT TO authenticated
  USING (
    client_id = (select auth.uid())
    OR public.is_yagi_admin((select auth.uid()))
  );

CREATE POLICY commission_intakes_insert_self_client ON public.commission_intakes FOR INSERT TO authenticated
  WITH CHECK (
    client_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'client'
    )
  );

-- Owner can update title/brief/refs while in submitted state (자기 폼 수정)
CREATE POLICY commission_intakes_update_owner_pre_response ON public.commission_intakes FOR UPDATE TO authenticated
  USING (client_id = (select auth.uid()) AND state = 'submitted')
  WITH CHECK (client_id = (select auth.uid()) AND state = 'submitted');

-- Admin can update everything (response, state transitions)
CREATE POLICY commission_intakes_update_admin ON public.commission_intakes FOR UPDATE TO authenticated
  USING (public.is_yagi_admin((select auth.uid())));
```

#### challenges sponsor — 기존 RLS 그대로, sponsor_client_id는 admin만 INSERT/UPDATE 가능
- 기존 `challenges_admin_*` policy 가 이미 admin INSERT/UPDATE 전권 → 추가 policy 불필요

### Section 6 — State machine triggers (defense-in-depth, Phase 2.5 G8 패턴)

```sql
CREATE OR REPLACE FUNCTION public.validate_commission_intake_state_transition()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.state IS DISTINCT FROM NEW.state THEN
    IF NOT (
      (OLD.state = 'submitted' AND NEW.state IN ('admin_responded','archived'))
      OR (OLD.state = 'admin_responded' AND NEW.state IN ('closed','archived'))
      OR (OLD.state = 'closed' AND NEW.state = 'archived')
    ) THEN
      RAISE EXCEPTION 'invalid commission_intake state transition: % -> %', OLD.state, NEW.state
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER validate_commission_intake_state_transition_trigger
  BEFORE UPDATE ON public.commission_intakes
  FOR EACH ROW EXECUTE FUNCTION public.validate_commission_intake_state_transition();
```

### Section 7 — Realtime publication

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.commission_intakes;
-- clients 는 publication에 추가 안 함 (PII protection)
```

### Section 8 — Storage

새 R2 bucket: `yagi-commission-files` (Cloudflare ENAM, 야기 morning manual create)
- Upload prefix: `{intake_id}/{uuid}.{ext}`
- Max 200MB per file × 5 files
- CORS 기존 패턴

---

## §4 — Routes (additions only)

### Public

- `/commission` — sales landing for client persona

### Auth

- `/auth/sign-up?role=client` — client signup form (existing signup에 분기 추가)

### App (authenticated)

- `/app/commission/new` — intake form
- `/app/commission/[id]` — own intake detail (client view)
- `/app/commission` — own intakes list (client view)
- `/app/settings/client-profile` — edit clients row

### Admin

- `/app/admin/commissions` — all intakes queue, state filter
- `/app/admin/commissions/[id]` — admin response form (manually compose response_md, mark state)

### Existing (touched)

- `/app/admin/challenges/new` — sponsor dropdown 추가
- `/app/admin/challenges/[slug]/edit` — sponsor dropdown 추가
- `/challenges/[slug]` — sponsor display (있으면 "Sponsored by 삼양")
- Sidebar — client role 처리 + admin commission 노드

---

## §5 — Premium redesign (축소)

### G3 scope에 포함되는 페이지 2개만

#### `/` (Landing) — 재구성
- Hero: 거대 타이포 + cinematic background (image or subtle gradient, no video for perf)
- Section 1: "AI VFX, 의뢰부터 납품까지" → /commission CTA
- Section 2: "지금 진행 중인 챌린지" → 열린 challenges preview (Phase 2.5 query 재사용)
- Section 3: "크리에이터 합류하기" → signup CTA (creator/studio role)
- Footer

#### `/commission` (Sales)
- Hero: "Your music video, re-imagined."
- Section 1: 3-step process ("의뢰 → 견적 상담 → 작업 → 납품")
- Section 2: 카테고리 grid (Music Video / Commercial / Teaser / Lyric Video)
- Section 3: 가격 투명성 (예산 범위 example + brokerage 언급)
- Section 4: CTA "지금 의뢰 작성하기"

### Design tokens (minimal extension)

- 기존 Webflow blue accent 유지
- 새 추가 없음 (font, accent-warm 등 v1에서 제안한 것 전부 보류)
- Typography는 기존 Bricolage Grotesque + Pretendard 활용
- Tailwind class만으로 충분히 cinematic 가능

### NOT in G3
- `/challenges` redesign — post-launch
- `/u/[handle]` editorial redesign — post-launch
- 새 font 추가 — post-launch
- Scroll-driven motion library — Framer Motion 이미 있을 가능성 (확인 후 사용), 없으면 CSS-only

---

## §6 — Gate plan (5 gates)

### G1 — Schema + RLS + Sidebar adapter (3-4h)

- Migration: `20260425000000_phase_2_7_commission_soft_launch.sql` (§3 sections 전부)
- profiles role enum 'client' 추가
- clients 테이블 + RLS
- commission_intakes 테이블 + RLS + state trigger
- challenges.sponsor_client_id 컬럼
- Realtime publication addition
- TypeScript types regen
- Sidebar mapping에 client role 처리 추가 (Phase 2.6 ADR-010 minor extension):
  - Client role 일 때: "작업" 그룹에 `내 의뢰` 노드 (`/app/commission`)
  - Admin: 기존 admin 그룹에 `의뢰 관리` (`/app/admin/commissions`)

Commit: `feat(phase-2-7 g1): commission intake schema + sidebar adapter`

### G2 — Client signup + intake form (5-6h)

Tasks:
1. `/auth/sign-up?role=client` flow
   - 기존 signup form에 role=client 시 company info step 추가
   - Post-signup: `clients` row INSERT (Server Action)
2. `/app/commission/new` intake form
   - React Hook Form + Zod validation
   - Markdown editor (textarea + react-markdown preview tab — Phase 2.5 패턴 재사용)
   - Reference URL list (YouTube/Vimeo/Instagram regex validation, max 3)
   - File upload (R2, 5 files × 200MB, Phase 2.5 G4 R2 client 재사용)
   - Timestamp marks textarea (free-form, no parsing)
   - Submit → `commission_intakes.state = 'submitted'` + Telegram fanout to 야기
3. `/app/commission/[id]` own intake detail
   - 본인이 제출한 폼 + 진행 상태 + admin response (있으면)
4. `/app/commission` 본인 intake list
5. `/app/settings/client-profile` edit form
6. Notification kind 등록: `commission_intake_received` (admin), `commission_intake_response_sent` (client)
7. notify-dispatch에 두 kind 추가 (간단 inline template)

Commit: `feat(phase-2-7 g2): client signup + intake form + own dashboard`

### G3 — Admin commission management + sponsor challenge + redesign (6-8h)

Tasks:
1. `/app/admin/commissions` admin queue
   - State filter, recent first
   - Each row: company, title, category, budget, submitted_at
2. `/app/admin/commissions/[id]` admin response form
   - View intake details
   - Compose response_md (markdown editor)
   - Submit → `state = 'admin_responded'` + `admin_responded_at` + `admin_responded_by` + `commission_intake_response_sent` notification to client
3. **Sponsor 추가** at challenge admin:
   - `/app/admin/challenges/new` — Sponsor section: "후원사 있어요?" toggle → on이면 client dropdown (search + select existing client) + "새 client 등록" inline form
   - `/app/admin/challenges/[slug]/edit` — 동일
   - `/challenges/[slug]` 공개 페이지: sponsor 있으면 hero 영역에 작은 "Sponsored by {company_name}" 표시
4. **Premium redesign — Landing `/` + `/commission`** (`yagi-design-system` skill 로드)
   - `/` Hero 재작성, 3-axis sections, challenges preview, creator CTA, footer 재정비
   - `/commission` 신규 sales page (위 §5 spec)
   - 디자인 톤: Webflow premium, monochrome + Webflow blue accent, large typography
   - Framer Motion 검토 (이미 있으면 활용, 없으면 CSS only)
   - **공개 첫인상이 핵심** — 30초 안에 "이 플랫폼 뭐 하는 곳" 전달 + "신뢰감"

Commit: `feat(phase-2-7 g3): admin queue + sponsor challenge + landing redesign`

### G4 — Polish + integration smoke (2-3h)

Tasks:
1. End-to-end smoke 5개:
   - Client signup → intake submit → admin response → client receives
   - Admin sponsor challenge create → public page sponsor display
   - Phase 2.5 challenge 기존 flow regression check (제출 → 갤러리 → 우승자 발표)
   - Phase 2.6 sidebar/scope/help-link regression check
   - Mobile <768px 모든 새 surface
2. 404/500/loading state 일관성 점검 (Phase 2.6 G4 패턴 follow)
3. Empty state 점검:
   - Client `/app/commission` 비어있을 때 "첫 의뢰 작성하기" CTA
   - Admin `/app/admin/commissions` 비어있을 때 "아직 의뢰가 없어요" placeholder
4. tsc/lint EXIT=0
5. Manual visual review by 야기 (필수, redirect Telegram)

Commit: `chore(phase-2-7 g4): polish + smoke`

### G5 — Codex K-05 + closeout (2-4h + hardening loops)

- Full-phase Codex review
- Focus areas: clients RLS isolation (PII), commission_intakes cross-client leak, sponsor_client_id 잘못된 cascade, signup role 'client' bypass, R2 prefix ownership for commission files
- Hardening loop budget: 3-loop (Phase 2.5/2.6 패턴 동일)
- HIGH-C self-corruption MED auto-downgrade OK
- HIGH-A (cross-role/PII leak) 무조건 hardening
- CLOSEOUT.md + HANDOFF.md update + contracts.md Phase 2.7 section
- ADR-011 (course correction: v1 → v2 reasoning) 작성
- ADR-012 (commission intake form vs full marketplace, deferred decision)
- main 머지 (FF or merge commit)
- Telegram: 🚀 Phase 2.7 SHIPPED (soft launch ready)

Commit sequence: hardening loops as needed → `feat(phase-2-7 g5): Phase 2.7 SHIPPED`

### Total estimate

18-25h. 토요일 종일 + 일요일 저녁이면 가능. Ultra-chain 필수.

---

## §7 — Success criteria

1. Client가 signup → intake form 제출 → admin queue에 도착 → admin이 response 작성 → client가 response 받는 end-to-end flow 작동
2. Admin이 sponsor 지정해서 challenge 생성 → public 페이지에 sponsor 표시
3. Phase 2.5 challenge surface regression 0건
4. Phase 2.6 sidebar/scope/help-link/mobile-drawer regression 0건
5. Landing page `/` 재구성 — 30초 안에 "AI VFX 의뢰 + 챌린지" 전달
6. `/commission` sales page 작동 + CTA 명확
7. Mobile <768px 모든 새 surface 작동
8. `pnpm build` green
9. Codex K-05 verdict CLEAN (또는 MED-only after triage)
10. 모든 새 surface a11y 준수

---

## §8 — Out of scope (Phase 2.8+ 명시)

- **Interactive timeline annotation player** (영상 위 click-to-mark) → **Phase 2.8 핵심 feature**
- **Creator proposal marketplace** (`/app/discover`, project_proposals 테이블, 자동 매칭)
- **Contract PDF + 양측 sign flow**
- **Project workspace** (milestones, deliverables, 3-way messaging)
- **Portfolio surface** (`/u/[handle]/portfolio` + ranking_tier auto-upgrade)
- **Premium redesign 풀 적용** (`/challenges` redesign, `/u/[handle]` editorial)
- **Escrow payment** (TossPayments)
- **Premium client subscription billing**
- **다국어 en 본격 지원**
- **AI-assisted matching, advanced analytics**
- **Public review/rating system**

---

## §9 — ADRs to be filed

- **ADR-011** Course correction v1 → v2: SPEC drift detection + scope reduction.
- **ADR-012** Commission intake form (manual admin response) vs marketplace (creator proposals): MVP는 form, marketplace는 Phase 2.8.
- **ADR-013** Sponsored challenge column (`challenges.sponsor_client_id`) vs separate `sponsored_challenges` table: column 선택. Rationale: 기존 challenge surface 재사용, 1줄 schema, 자동 visibility, RLS 변경 없음.

---

## §10 — Pre-conditions for G1

- Phase 2.5 + 2.6 SHIPPED on main (확인됨)
- R2 bucket `yagi-commission-files` 생성 (Cloudflare dashboard, ENAM, CORS 기존 패턴) — 야기 morning manual
- `.env.local`에 `CLOUDFLARE_R2_COMMISSION_BUCKET=yagi-commission-files` 추가 — 야기 morning manual

---

## §11 — Changelog

- **2026-04-25 morning** — v2 authored. v1 (commission marketplace 9-gate) deprecated due to schema drift + scope mismatch. v2 = Option 1 축소 + 월요일 soft launch + Phase 2.8 진짜 의뢰 워크플로우. Builder G1 halt 직후 작성.

---

**END OF SPEC v2**
