# Phase 7 Hotfix-4 — Admin nav integration + North star surface + K-06 FU sweep

Status: LOCKED v1, ready for KICKOFF dispatch.
Author: 야기 + Web Claude (chat 2026-05-05)
Scope tier: HOTFIX (~3-4h, single Sonnet builder, no parallel)
Baseline: branch `g-b-10-phase-7` (Phase 7 Wave A 만 ship 상태, 6 commits ahead of main)
Source-of-truth: PRODUCT-MASTER v1.7 (§Z North Star, §K v1.7 priority,
§Q v1.7 첫 캠페인 template, §M v1.7 워딩 확장) + Wave A K-06 FU list

Trigger: 야기 Wave A browser smoke (2026-05-05). 3개 발견 + north star
v1.7 amendment 반영 + Wave A K-06 FU sweep:

  1. **G1 Critical** — sidebar nav 에 `campaigns` parent 누락 (admin tool
     unreachable). Wave A.2 가 admin tool 자체는 ship 했지만 sidebar
     integration 빠짐.
  2. **G2 Critical** — /app/admin page (admin dashboard) 가 meetings 만
     보여주고 admin sub-tools (challenges / campaigns / commissions /
     artists / trash / support / invoices) 진입 카드 없음. yagi_admin 이
     URL 직접 manual 입력해야 진입 가능.
  3. **G3 Important** — 야기 manual 생성한 캠페인이 list 에서 안 보임 (진단 진행 중).
  4. **North star v1.7 반영** — Phase 7 Wave A.2/A.3 가 v1.6 §V 기준으로
     ship 됐지만 v1.7 amendment (AI Visuals for Musicians, 신곡 뮤비
     캠페인 template, 한글 워딩 확장) 미반영. 일관성 보강.
  5. **Wave A K-06 FU 흡수** — 14 FU 중 quick wins (word-break-keep-all
     미정의 클래스 12 occurrences + Q2 워딩 lock 위반) 같이 sweep.

User pool state: **0 user (pre-launch)**. Manual 영입 진행 중. Schema
breaking 자유.

## Decisions locked (야기 confirm 2026-05-05)

| # | 항목 | 결정 |
|---|---|---|
| H4D1 | Sidebar nav `campaigns` parent | challenges 패턴 그대로 — parent + 3 children (전체/신규/공개) |
| H4D2 | /app/admin sub-tools navigation grid | challenges / campaigns / commissions / artists / trash / support / invoices entry 카드 (각 카드 = title + 1줄 description + 진입 link) |
| H4D3 | /admin/campaigns/new default template | "신곡 뮤비 캠페인" pre-populated (title placeholder + brief default + 2 categories default + reference assets 1 row) |
| H4D4 | /campaigns public landing hero | "AI Visuals for Musicians" + "음악인을 위한 AI 비주얼 스튜디오" + sub-tagline 반영 |
| H4D5 | Phase 6 Briefing Canvas Step 1 카테고리 first item | "AI 뮤직비디오 제작" 추가 (existing 카테고리 list 의 first position) |
| H4D6 | K-06 FU sweep scope | quick wins only — word-break-keep-all 미정의 클래스 fix + "유포 중" → "공개 진행 중" 워딩 fix. 다른 12 FU 는 Phase 8 또는 별 wave |
| H4D7 | ff-merge timing | g-b-10-phase-7 branch 유지 (Option Q2/b). Hotfix-4 commit 같은 branch 안. Wave B/C/D 모두 ship 후 main 한 번 ff-merge |

## Scope: 6 sub-tasks (HF4.1 ~ HF4.6, sequential)

### HF4.1 — Sidebar nav `campaigns` parent (Critical, 30분)

**File**: `src/components/app/sidebar-nav.tsx`

`challenges` 직후 `campaigns` parent 추가:

```tsx
{
  // Phase 7 Wave A — yagi_admin campaign console.
  key: "campaigns",
  icon: Megaphone,                    // 또는 Sparkle / Radio
  roles: ["yagi_admin"],
  children: [
    { key: "campaigns_all", href: "/app/admin/campaigns" },
    { key: "campaigns_new", href: "/app/admin/campaigns/new" },
    { key: "campaigns_published", href: "/app/admin/campaigns?status=published" },
  ],
},
```

**i18n keys** (messages/ko.json + en.json):
```json
"nav": {
  ...
  "campaigns": "캠페인",
  "campaigns_all": "전체",
  "campaigns_new": "새 캠페인",
  "campaigns_published": "공개 진행 중"
}
```

⚠️ "공개 진행 중" = K-06 워딩 fix (was "유포 중").

**Icon import** — lucide-react 의 `Megaphone` 또는 `Sparkles` (이미 사용 중) 또는 `Radio`. challenges = `Trophy`, campaigns 는 visual 다른 아이콘.

**EXIT**:
- sidebar 의 yagi_admin user 에 "캠페인" parent 노출
- 3 children expand 정상
- active 상태 (현재 페이지 = /admin/campaigns 시 highlight)
- tsc + lint clean

### HF4.2 — Admin dashboard sub-tools grid (Critical, 1h)

**File**: `src/app/[locale]/app/admin/page.tsx`

기존 page.tsx 의 header 직후 + Integrations 위에 *Admin sub-tools navigation grid* 추가:

```tsx
{/* Admin sub-tools */}
<section className="mb-12">
  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
    {t("subtools_title")}
  </h2>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <SubtoolCard
      href="/app/admin/campaigns"
      title={t("subtools.campaigns.title")}
      description={t("subtools.campaigns.description")}
      icon={Megaphone}
    />
    <SubtoolCard
      href="/app/admin/challenges"
      title={t("subtools.challenges.title")}
      description={t("subtools.challenges.description")}
      icon={Trophy}
    />
    <SubtoolCard
      href="/app/admin/commissions"
      title={t("subtools.commissions.title")}
      description={t("subtools.commissions.description")}
      icon={Mailbox}
    />
    <SubtoolCard
      href="/app/admin/artists"
      title={t("subtools.artists.title")}
      description={t("subtools.artists.description")}
      icon={Users}
    />
    <SubtoolCard
      href="/app/admin/invoices"
      title={t("subtools.invoices.title")}
      description={t("subtools.invoices.description")}
      icon={Receipt}
    />
    <SubtoolCard
      href="/app/admin/support"
      title={t("subtools.support.title")}
      description={t("subtools.support.description")}
      icon={MessageSquare}
    />
    <SubtoolCard
      href="/app/admin/trash"
      title={t("subtools.trash.title")}
      description={t("subtools.trash.description")}
      icon={Trash2}
    />
  </div>
</section>
```

**SubtoolCard 컴포넌트** (`src/components/admin/subtool-card.tsx`):

```tsx
import Link from "next/link";
import { type LucideIcon } from "lucide-react";

export function SubtoolCard({
  href, title, description, icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="rounded-[24px] border border-border bg-card p-5 transition-colors hover:bg-accent/50 group"
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold mb-1 keep-all">{title}</h3>
          <p className="text-xs text-muted-foreground keep-all">{description}</p>
        </div>
      </div>
    </Link>
  );
}
```

**i18n keys** (messages/ko.json + en.json, admin namespace):

```json
"admin": {
  ...
  "subtools_title": "관리 메뉴",
  "subtools": {
    "campaigns": {
      "title": "캠페인",
      "description": "AI 뮤직비디오 캠페인을 만들고 관리합니다."
    },
    "challenges": {
      "title": "챌린지",
      "description": "공모전 형태의 챌린지를 관리합니다."
    },
    "commissions": {
      "title": "의뢰 큐",
      "description": "공개 의뢰 폼으로 들어온 요청을 응대합니다."
    },
    "artists": {
      "title": "아티스트 명단",
      "description": "소속 아티스트를 영입하고 관리합니다."
    },
    "invoices": {
      "title": "인보이스",
      "description": "결제 내역과 송장을 관리합니다."
    },
    "support": {
      "title": "고객 지원",
      "description": "사용자 문의에 응대합니다."
    },
    "trash": {
      "title": "삭제 보관함",
      "description": "삭제된 프로젝트를 복구하거나 영구 삭제합니다."
    }
  }
}
```

⚠️ 워딩 cross-check (yagi-wording-rules + v1.7 §M):
- "캠페인" / "챌린지" / "아티스트 명단" / "의뢰 큐" 모두 surface 워딩 OK
- "Roster" 영문 노출 X (한글 = "소속 아티스트" / "아티스트 명단")

**EXIT**:
- /app/admin 에 7개 SubtoolCard grid 노출
- 각 카드 클릭 → 해당 admin page 진입
- yagi_admin only access (notFound for non-admin) 유지
- yagi-design-system 적용 (rounded 24px, no shadow, sage accent on hover)
- tsc + lint + build clean

### HF4.3 — /admin/campaigns/new 신곡 뮤비 template (Important, 45분)

**File**: `src/app/[locale]/app/admin/campaigns/new/page.tsx`

현재 form state 의 default 를 "신곡 뮤비 캠페인" template 로 pre-populate:

```tsx
// 현재
const [title, setTitle] = useState("");
const [brief, setBrief] = useState("");
const [categories, setCategories] = useState<CategoryInput[]>([
  { name: "", description: "", format_spec: "" },
]);

// 변경
const t = useTranslations("admin_campaigns");
const [title, setTitle] = useState("");                      // placeholder 만 변경
const [brief, setBrief] = useState(t("template.musicvideo.brief_default"));
const [categories, setCategories] = useState<CategoryInput[]>([
  {
    name: t("template.musicvideo.cat1_name"),
    description: t("template.musicvideo.cat1_description"),
    format_spec: t("template.musicvideo.cat1_format_spec"),
  },
  {
    name: t("template.musicvideo.cat2_name"),
    description: t("template.musicvideo.cat2_description"),
    format_spec: t("template.musicvideo.cat2_format_spec"),
  },
]);
const [referenceAssets, setReferenceAssets] = useState<ReferenceAsset[]>([
  { url: "", label: t("template.musicvideo.asset_label_default") },
]);
```

Title input 의 placeholder = `[가수명] [신곡명] AI 뮤비 캠페인`.

**i18n keys** (admin_campaigns.template.musicvideo namespace):

```json
"admin_campaigns": {
  ...
  "template": {
    "musicvideo": {
      "title_placeholder": "[가수명] [신곡명] AI 뮤비 캠페인",
      "brief_default": "신곡 [곡명]의 AI 뮤직비디오를 다양한 angle로 제작합니다.\n각 창작자가 본인 채널(TikTok / Instagram / YouTube Shorts) 에 유포해\n신곡의 멀티채널 노출을 극대화합니다.",
      "cat1_name": "리믹스 / 재해석 영상 (가로형)",
      "cat1_description": "유튜브 채널 게시용 가로형 AI 뮤비 영상",
      "cat1_format_spec": "16:9, 1080p+, 1-3분",
      "cat2_name": "Short-form 뮤비 (세로형)",
      "cat2_description": "TikTok / Instagram Reels / YouTube Shorts 게시용 세로형 영상",
      "cat2_format_spec": "9:16, 60초 이내",
      "asset_label_default": "곡 demo / 가사 / 콘셉트 reference"
    }
  }
}
```

**상단 안내 banner** (선택):

```tsx
<div className="rounded-[24px] border border-border bg-muted/30 p-4 mb-6">
  <p className="text-xs text-muted-foreground keep-all">
    💡 신곡 뮤비 캠페인 기본 템플릿입니다. 자유롭게 수정하거나 처음부터
    작성하실 수 있어요.
  </p>
</div>
```

⚠️ 야기 자체 hosting (Route A) 외 future Route B (sponsor request → admin
draft) 진입 시에도 동일 default 적용 OK (admin 가 자유 변경).

**EXIT**:
- /admin/campaigns/new 진입 시 brief / 2 categories / 1 reference asset
  default pre-populated
- 야기가 그대로 submit 또는 자유 변경 가능
- i18n keys 모든 KO/EN 작성
- tsc + lint clean

### HF4.4 — /campaigns public landing hero (Important, 1h)

**File**: `src/app/[locale]/campaigns/page.tsx` (public list) + `src/app/[locale]/campaigns/[slug]/page.tsx` (public detail)

list page 의 hero copy 를 v1.7 §Z 반영:

```tsx
{/* Hero */}
<section className="px-10 py-16 md:py-24 max-w-5xl">
  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
    AI VISUAL STUDIO
  </p>
  <h1 className="font-display text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[1.05] mb-3 keep-all">
    AI VISUAL STUDIO
    <br />
    FOR MUSICIANS
  </h1>
  <p className="text-2xl md:text-3xl font-display text-muted-foreground mb-6 keep-all">
    음악인을 위한 AI 비주얼 스튜디오
  </p>
  <p className="text-base md:text-lg text-muted-foreground max-w-2xl keep-all">
    뮤직비디오는 더 빠르게, 더 다양하게.
    <br />
    AI와 창작자 네트워크가 만드는 음악인의 비주얼 콘텐츠.
  </p>
</section>

{/* Section divider */}
<section className="px-10 max-w-5xl mb-8">
  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
    OUR CAMPAIGNS
  </h2>
  <p className="text-xs text-muted-foreground keep-all">현재 진행 중인 캠페인</p>
</section>

{/* 기존 캠페인 list */}
```

**Empty state 도 update**:

```tsx
// rows.length === 0 시
<div className="rounded-[24px] border border-border bg-card p-12 text-center">
  <p className="text-sm text-muted-foreground keep-all">
    곧 첫 캠페인이 시작됩니다. 새로운 캠페인 알림을 받고 싶다면 가입해주세요.
  </p>
</div>
```

**i18n keys** (campaigns_public namespace):

```json
"campaigns_public": {
  "hero_eyebrow": "AI VISUAL STUDIO",
  "hero_title_line1": "AI VISUAL STUDIO",
  "hero_title_line2": "FOR MUSICIANS",
  "hero_subtitle_kr": "음악인을 위한 AI 비주얼 스튜디오",
  "hero_tagline": "뮤직비디오는 더 빠르게, 더 다양하게.\nAI와 창작자 네트워크가 만드는 음악인의 비주얼 콘텐츠.",
  "section_title_eyebrow": "OUR CAMPAIGNS",
  "section_title_kr": "현재 진행 중인 캠페인",
  "list_empty": "곧 첫 캠페인이 시작됩니다.\n새로운 캠페인 알림을 받고 싶다면 가입해주세요."
}
```

**EXIT**:
- /campaigns hero 가 v1.7 §Z 반영
- 영문 brand statement + 한글 subheading + sub-tagline
- empty state copy 도 update
- yagi-design-system 적용
- 워딩 cross-check (yagi-wording-rules)
- tsc + lint clean

### HF4.5 — Phase 6 Briefing Canvas Step 1 카테고리 (Important, 30분)

**File**: Phase 6 ship 의 Briefing Canvas Step 1 카테고리 list 위치 grep
필요. `src/components/brief/` 또는 `src/app/[locale]/app/projects/new/`
디렉토리 안.

**작업**:
- Step 1 의 categories list 의 first 위치 = "AI 뮤직비디오 제작"
- description = "신곡 뮤비, 콘셉트 영상, 컴백 콘텐츠, AI VFX 합성 등"
- 기존 카테고리 list (있다면) 의 order 조정 — Musicians-first priority

**i18n key** (briefing 또는 projects_new namespace):

```json
"category_music_video": {
  "label": "AI 뮤직비디오 제작",
  "description": "신곡 뮤비, 콘셉트 영상, 컴백 콘텐츠, AI VFX 합성 등"
}
```

**EXIT**:
- Step 1 카테고리 list first = "AI 뮤직비디오 제작"
- description 음악 specific
- 기존 카테고리 (Type 1-4 흡수 의 description) 보존, 단 order 조정
- tsc + lint clean

### HF4.6 — K-06 FU sweep (Polish, 30분)

**Wave A K-06 LOOP-2 의 14 FU 중 quick wins**:

**6.1 word-break-keep-all 미정의 클래스 fix (12 occurrences)**:
- `keep-all` Tailwind 클래스가 Tailwind 기본에 없음 (custom utility 또는 CSS 직접)
- yagi-design-system v1.0 의 `keep-all` utility 정의 위치 확인 필요
- 만약 정의 안 됐으면 `tailwind.config.ts` 또는 `globals.css` 에 추가:

```css
/* globals.css */
.keep-all {
  word-break: keep-all;
  word-wrap: break-word;
}
```

- 또는 모든 `keep-all` 사용처를 Tailwind 표준 `break-keep` 으로 교체:

```tsx
// before
className="... keep-all"
// after (Tailwind 4.x)
className="... break-keep"
```

12 occurrences grep + 일괄 fix.

**6.2 워딩 lock 위반 fix**:
- "유포 중" → "공개 진행 중" (Q2 워딩 lock — yagi-wording-rules cross-check)
- 사용처 grep + i18n key value 변경

**EXIT**:
- `keep-all` 또는 `break-keep` consistent 적용
- "유포 중" → "공개 진행 중" 변경 (i18n + UI text)
- yagi-wording-rules cross-check pass
- tsc + lint + build clean

## Verification (Builder responsibility — 18 step)

### Pre-apply (3)
1. tsc clean
2. lint clean
3. build clean

### HF4.1 sidebar (3)
4. yagi_admin user 의 sidebar 에 "캠페인" parent 노출
5. 3 children (전체 / 새 캠페인 / 공개 진행 중) expand 정상
6. /admin/campaigns 진입 시 sidebar active highlight

### HF4.2 admin dashboard (3)
7. /app/admin 에 "관리 메뉴" 섹션 + 7개 SubtoolCard
8. 각 카드 클릭 → 해당 page 진입 (campaigns / challenges / commissions / artists / invoices / support / trash)
9. yagi_admin only (다른 role notFound 유지)

### HF4.3 신곡 뮤비 template (2)
10. /admin/campaigns/new 진입 시 brief + 2 categories + 1 reference asset default pre-populated
11. 야기 그대로 submit 가능 + 자유 변경 가능

### HF4.4 public landing (3)
12. /campaigns hero = "AI VISUAL STUDIO FOR MUSICIANS" + 한글 subheading
13. sub-tagline + empty state copy v1.7 §Z 반영
14. yagi-design-system 적용 (sage / radius 24 / shadow X)

### HF4.5 Phase 6 (1)
15. /app/projects/new (Phase 6 Briefing Canvas) Step 1 카테고리 first = "AI 뮤직비디오 제작"

### HF4.6 K-06 FU sweep (3)
16. `keep-all` / `break-keep` 12 occurrences fix
17. "유포 중" → "공개 진행 중" UI text + i18n value
18. yagi-wording-rules cross-check (internal 워딩 노출 0)

## K-05 Codex review

- **Tier**: LOW.
- **Routing**: SKIP. UI + i18n + nav 만, 신규 보안 surface 0.
- **Justification**: server action 변경 0. RLS 변경 0. K-05 effort 가치 0.

## K-06 Design Review

- **Optional** (manual 또는 Web Claude review).
- 이미 Wave A K-06 LOOP-2 통과. Hotfix-4 의 변경 = wording / nav / hero copy
  중심. K-06 Opus subagent spawn 비용 대비 finding 가치 낮음.
- 야기 visual smoke 18-step 안에서 detect 가능.

## Out-of-scope (FU 등록 또는 별 wave)

- **Wave A K-06 FU 12개 잔존** — 본 hotfix 의 quick wins (HF4.6) 외 12개:
  channel-badge sage 위반 (1 HIGH FU), Q2 워딩 lock 위반 다른 occurrences,
  empty state polish 등. Phase 8 또는 별 wave.
- **G3 진단 결과** — 야기 SQL 결과 받은 후 hotfix 안 또는 별 처리. 코드
  변경 가능성 낮음 (default filter 'all', 정상 작동 추정).
- **Hotfix-4 의 다른 surface 검토** — 미래 Phase 7 ship 후 다른 north star
  surface 보강 가능 (e.g., dashboard 의 [+ 캠페인 요청] CTA, sidebar entry
  description 음악 specific, etc.).

## Migration apply policy

DB schema 변경 0. Migration 0.

## Commit plan

Single commit (작은 hotfix, 6 sub-tasks 묶음).

```powershell
git checkout g-b-10-phase-7  # Phase 7 branch 유지
# Builder 자율 변경 (6 sub-tasks)
git add src/components/app/sidebar-nav.tsx src/app/[locale]/app/admin/page.tsx src/components/admin/ src/app/[locale]/app/admin/campaigns/new/page.tsx src/app/[locale]/campaigns/page.tsx messages/
# 만약 Phase 6 Briefing Canvas 변경 시 추가
git add src/app/[locale]/app/projects/new/  # 또는 src/components/brief/
# K-06 FU sweep
git add globals.css tailwind.config.ts  # keep-all utility 정의 시
git status
git commit -F .git\COMMIT_MSG.txt
```

ff-merge to main = Wave B/C/D ship 후 (g-b-10-phase-7 single source).

## Sign-off

야기 SPEC v1 LOCKED (chat 2026-05-05) → Builder execute (single Sonnet,
sequential 6 sub-tasks) → verify 18 step → 결과 chat 보고 → 야기 visual
smoke (steps 4-15) → Wave B entry 진행.
