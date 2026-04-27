# Phase 2.5 G3 — Entry Decision Package (v2)

**Status:** READY FOR ADOPTION (web Claude pre-authored, 2026-04-23)
**Supersedes:** v1 (2026-04-23 earlier today). v2 incorporates yagi's
creator-centric copy addendum + web Claude micro-copy enhancements.
**Purpose:** Drop-in decisions + spec-grade artifacts for `/challenges`,
`/challenges/[slug]`, `/challenges/[slug]/gallery` (3 public surfaces).
**Adoption:** 야기 reviews each section, marks ADOPT / EDIT / REJECT, then
Builder consumes adopted sections as authoritative input.
**Reading order:** §A → §B → §C → §D (data) then §E → §F → §G (UI) then §H~§J (copy + checklist).
**Disjoint:** Pure documentation. Output is `.yagi-autobuild/phase-2-5/G3-ENTRY-DECISION-PACKAGE.md`.

---

## §0 — Tone principle (NEW in v2)

All user-facing copy on `/challenges/*` follows three rules:

1. **Action-driven** (행동 유도) — verbs, not descriptions
2. **Creator identity focused** (창작자 중심) — "작품"·"올리기"·"주인공" 어휘
3. **Emotional engagement** (감정 연결) — "응원"·"기다리고 있어요"·"빛난"

### Global vocabulary mapping (enforce everywhere)

| Old (system tone) | New (creator tone) |
|---|---|
| 제출 | **작품 올리기** |
| 로그인 | **참여 시작하기** |
| 갤러리 | **작품 보기** |
| 투표 | **응원하기** |
| 수상작 | **이번 챌린지의 주인공** |
| 우승자 | **주인공** |

### Position shift

YAGI is no longer a "기능 중심 챌린지 시스템" — it is **"AI 창작자가 작품을
올리고 인정받는 퍼블릭 무대"**. Every copy decision in this document derives
from this positioning.

---

## §A — G3 vs Phase 2.6 — merge decision

### Status: PROPOSED (야기 ADOPT/EDIT/REJECT)

### Context

Phase 2.6 (IA Revision) targets `/[locale]/app/*` (authenticated app shell)
— sidebar 3-tier, scope selector, contextual help. **Phase 2.5 G3 ships
3 public surfaces under `/challenges/*` with NO sidebar** (public surfaces
use a different chrome — header + footer pattern, like `/showcase/[slug]`).

→ **Phase 2.6 and Phase 2.5 G3 do NOT overlap on the same routes.**
G3 runs on public chrome; Phase 2.6 runs on app chrome. They are
disjoint surfaces.

### Decision

**Run G3 standalone first. Phase 2.6 runs after Phase 2.5 closeout.**

Rationale:
- Public surfaces have higher launch urgency (SEO + first impression)
- Phase 2.6 depends on Phase 2.4 G1 (font reconciliation) — additional
  precondition not blocking G3
- Phase 2.6 G2 (scope selector) wants `profile.role` populated → depends
  on Phase 2.5 G2 having shipped
- No code reuse between G3 components (public chrome) and Phase 2.6
  components (app chrome sidebar)

The **only Phase 2.6 work that should land at G3 time** is the Phase 2.5
admin route addition to the existing `sidebar-nav.tsx` items array — which
G5 (admin management) handles naturally. NOT a Phase 2.6 deliverable.

### Public chrome contract for G3

Three new routes share a layout. Pattern reused from `/showcase/[slug]`
(existing public surface):

```
src/app/challenges/layout.tsx          (NEW — public chrome wrapper)
src/app/challenges/page.tsx            (G3 Task 1 — list)
src/app/challenges/[slug]/layout.tsx   (NEW — slug-context wrapper)
src/app/challenges/[slug]/page.tsx     (G3 Task 2 — detail)
src/app/challenges/[slug]/gallery/page.tsx  (G3 Task 3 — gallery)
src/app/challenges/[slug]/not-found.tsx     (404)
```

Public chrome elements:
- Header: `yagi-symbol.png` (left, links `/`) + "챌린지" text + **context-aware CTA** (right)
- Footer: existing `<SiteFooter>` from `src/components/home/site-footer.tsx`
- No sidebar, no notification bell, no top-bar contextual help

### Header CTA — context-aware single button (v2)

Single CTA slot in header, label + href derived from auth state + role:

| State | Label | Href |
|---|---|---|
| Not signed in | **참여 시작하기** | `/signin?next=<current>` |
| Signed in, `profile.role IN (creator,studio)` | **작품 올리기** | first open challenge's submit page, or `/challenges` if none open |
| Signed in, `profile.role = observer` | **챌린지 둘러보기** | `/challenges` |
| Signed in, `is_yagi_admin` | **새 챌린지** | `/admin/challenges/new` |

Implementation: server-resolved at `<PublicChrome>` mount. Single component,
single slot, distinct labels. No two CTAs simultaneously.

### Decisions for 야기

1. ADOPT — G3 standalone (recommended)
2. Header CTA matrix above OK?
3. Header logo: `yagi-symbol.png` (recommended) or `yagi-wordmark.png`?

---

## §B — `/challenges` list — schema + query + page headline

### Status: PROPOSED (야기 ADOPT/EDIT/REJECT)

### Page headline (NEW in v2 — addendum §1.1)

```html
<h1>지금 가장 주목받는 AI 챌린지</h1>
```

Placement: above "진행 중" section. Match `/showcase` page hero spacing.
Use `font-display` (WF Visual Sans post Phase 2.4 G1, current Fraunces
fallback OK pre-Phase 2.4).

### Display states

Per SPEC §3 G3 Task 1, list shows challenges in 3 states:
`open`, `closed_announced`, `archived`.

**Refined ordering (web Claude addition)**: 3 visual sections, top to bottom:

1. **진행 중** — sorted by `close_at` ascending (urgency first)
2. **결과 발표** — sorted by `announce_at` descending (newest first)
3. **지난 챌린지** — sorted by `created_at` descending, **collapsed by default**
   (expand-on-click, max 12 visible after expand, then "더 보기" pagination)

(Section title "종료" → "지난 챌린지" per v2 status pill table §F.)

**Excluded states**: `draft` (admin-only via RLS), `closed_judging` (intentionally
hidden — judging in progress, no actionable surface for public).

**Edge case**: `closed_judging` challenges still have public gallery accessible
at `/challenges/[slug]/gallery` (per SPEC §1 lifecycle). They just don't
appear in the list. Direct link works (e.g. shared by submitter on social).

### Server-side query (RSC)

```typescript
// src/app/challenges/page.tsx
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";  // RLS-driven, real-time accuracy

export default async function ChallengesListPage() {
  const supabase = await createSupabaseServer();
  
  const [openRes, announcedRes, archivedRes] = await Promise.all([
    supabase
      .from("challenges")
      .select("id, slug, title, description_md, hero_media_url, open_at, close_at, announce_at, submission_requirements")
      .eq("state", "open")
      .order("close_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("challenges")
      .select("id, slug, title, hero_media_url, announce_at")
      .eq("state", "closed_announced")
      .order("announce_at", { ascending: false, nullsFirst: false })
      .limit(8),
    supabase
      .from("challenges")
      .select("id, slug, title, announce_at")
      .eq("state", "archived")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);
  
  // ... handle errors, render
}
```

### Submission count (per challenge, optional surface element)

Per challenge row, submission count is desirable in the list (social proof).
Implementation choice:

- **Option A**: SQL function `get_challenge_submission_counts(challenge_ids uuid[])`
  returns `[{challenge_id, count}]`. Single round-trip per page load.
- **Option B**: Each card runs separate count query. N+1 problem.
- **Option C**: Materialized view `challenge_stats` refreshed every 5min.

→ **Web Claude recommendation: Option A** (SQL function, ~20 line addition
to G1 hardening migration or as G3 prep migration). Simple, real-time,
no view maintenance.

**Decision deferred to Builder**: Add to hardening migration as section 7
or skip (G3 ships without count) — simpler MVP. Either is fine. **If shipping
with count**: rename label to "**참여작 N**" (not "제출 N개" — system tone violation).

### Decisions for 야기

1. Page headline copy "지금 가장 주목받는 AI 챌린지" OK?
2. Section ordering: 진행 중 → 결과 발표 → 지난 챌린지 OK?
3. "지난 챌린지" default collapsed?
4. Submission count surfaced on cards (label: "참여작 N")?

---

## §C — `/challenges/[slug]` detail — schema + sections + copy

### Status: PROPOSED (야기 ADOPT/EDIT/REJECT)

### Page sections (top to bottom)

```
[1] Hero
   ├─ hero_media_url image (or video)
   ├─ Title (h1) + state badge
   └─ Days remaining (if open)

[2] Status banner (conditional — see §C.2 below for v2 copy)

[3] Description (markdown rendered)
   └─ description_md → react-markdown (already in deps from journal)

[4] Requirements display
   └─ submission_requirements JSONB → readable Korean rendering
      (e.g. "60초 이내 mp4 영상 (최대 500MB), 텍스트 설명 50-2000자")

[5] Timeline
   ├─ 시작: open_at
   ├─ 마감: close_at
   └─ 발표: announce_at

[6] Primary CTA (see §C.3 below for v2 matrix)

[7] Secondary CTAs
   └─ "작품 보기" (always visible) + "공유" (Web Share API + clipboard fallback)
```

### §C.2 — Status banner copy matrix (v2)

| State | Banner copy |
|---|---|
| `open` (>24h until close) | **지금 참여 가능 · 마감까지 X일 X시간** |
| `open` (<24h, >1h) | **⏰ 마감까지 X시간 X분 남았어요** (urgency tone, h-orange not red — emotional but not alarming) |
| `open` (<1h) | **⚠️ 곧 마감입니다 — 지금 작품을 올려보세요** (action-forward urgency) |
| `closed_judging` | 심사 진행 중 · 결과 발표 예정: <announce_at> |
| `closed_announced` | 결과 발표 완료 — **이번 챌린지의 주인공을 확인하세요** |
| `archived` | 지난 챌린지 |

Urgency thresholds (24h, 1h) computed at render time. **Recommendation:
adopt** — pattern proven on Itch.io game jams, Kickstarter deadlines.
Generates submission spike in final hours, raises overall participation.

### §C.3 — Primary CTA matrix (v2 — addendum §2.2)

| Condition | Label | Action |
|---|---|---|
| `open` + auth + role IN (creator,studio) | **작품 올리기** | → `/challenges/[slug]/submit` |
| `open` + auth + role=observer | **창작자로 참여하기** | → `/onboarding/role` (upgrade flow) |
| `open` + no auth | **참여 시작하기** | → `/signin?next=/challenges/[slug]` |
| `closed_judging` | **작품 보기** | → `/challenges/[slug]/gallery` |
| `closed_announced` | **주인공 보기** | → `/challenges/[slug]/gallery#winners` |
| `archived` | **작품 보기** | → `/challenges/[slug]/gallery` |

(Observer label: addendum says "Creator로 업그레이드하기" — "창작자로 참여하기"
 is more action-driven and less feature-tone per §0 rule. Recommendation: adopt.)

### `submission_requirements` JSONB schema

Builder needs a typed shape. Web Claude proposes:

```typescript
// src/lib/challenges/types.ts
export type SubmissionRequirements = {
  native_video?: {
    required: boolean;
    max_duration_sec: number;     // default 60
    max_size_mb: number;          // default 500
    formats: ("mp4")[];           // MVP: mp4 only
  };
  youtube_url?: {
    required: boolean;
  };
  image?: {
    required: boolean;
    max_count: number;            // default 5
    max_size_mb_each: number;     // default 10
    formats: ("jpg" | "png")[];
  };
  pdf?: {
    required: boolean;
    max_size_mb: number;          // default 20
  };
  text_description: {
    required: true;               // always required per SPEC
    min_chars: number;            // default 50
    max_chars: number;            // default 2000
  };
};

export type JudgingConfig =
  | { mode: "admin_only" }
  | { mode: "public_vote" }
  | { mode: "hybrid"; admin_weight: number; /* 0-100, public_weight = 100 - admin_weight */ };
```

Builder validates JSONB at challenge create (G5) using Zod schema.
Read side (G3) trusts the shape.

### §C.4 — Empty state (no submissions yet, v2 NEW)

When `closed_judging` / `closed_announced` / `archived` and zero submissions
(possible for failed challenges) — show empty state in detail page CTA area:

```
참여한 작품이 없습니다
```

When `open` and zero submissions yet (most common edge):

```
첫 번째 작품을 기다리고 있어요
이 챌린지의 첫 주인공이 되어보세요

[작품 올리기]   ← prominent button
```

(의인화 "기다리고 있어요" + 희소성 "첫 주인공" — strongest known empty-state
pattern for participation conversion.)

### Decisions for 야기

1. Section order [1]~[7] OK?
2. Status banner copy matrix §C.2 — adopt all 6 rows?
   → **Urgency 24h/1h** rows are the conversion levers. Adopt or defer to A/B test post-launch?
3. Primary CTA matrix §C.3 — all 6 rows OK?
4. Empty state §C.4 — "기다리고 있어요" 의인화 OK?
5. Web Share API + clipboard fallback for "공유" OK?

---

## §D — `/challenges/[slug]/gallery` — realtime + grid + copy

### Status: PROPOSED (야기 ADOPT/EDIT/REJECT)

### Layout

3-column responsive grid (mobile: 1, tablet: 2, desktop: 3). Each card:

```
┌───────────────────────────┐
│ [Hero media — auto-play   │
│  on hover, mute, loop;    │
│  poster on idle]          │
│                           │
│ [Submitter handle]   [⏱]  │
│ [올린 지 X일 전]            │
│                           │
│ [♥ 응원하기] (gated)       │
└───────────────────────────┘
```

(Copy: "Submitted X days ago" → "올린 지 X일 전".)

Winners (in `closed_announced` / `archived` states): rank badge top-left
(🥇/🥈/🥉 + rank number from `showcase_challenge_winners.rank`).
Winner section pinned at top with anchor `#winners`.

### §D.1 — Winners section (v2)

Section header:

```html
<h2>이번 챌린지의 주인공</h2>
<p class="text-sm text-muted-foreground">창작자와 응원이 만난 작품들</p>
```

Each winner card additional row above submission card content:

```
🥇 1위 · 응원 1,234
🥈 2위 · 응원   892
🥉 3위 · 응원   445
```

(Rank + 응원 count = social proof. Both are conversion levers — winner
attribution + popular validation. Comma-formatted numbers.)

### §D.2 — Vote button (addendum §3.1 + web Claude refinement)

Use existing reaction-button pattern from `fast-feedback-bar.tsx`. Single
button, two visual states:

| State | Label | Visual |
|---|---|---|
| Default (can vote) | **♥ 응원하기** | `bg-background text-foreground border-input hover:border-foreground` |
| Voted (already cast) | **♥ 응원** | `bg-foreground text-background border-foreground` (filled) |

(Voted state label intentionally **shorter** than default — "응원함" reads
truncated; "응원" alone reads as identity badge "you have voted." Filled
color carries the state, text confirms it.)

Vote count rendered next to button:

```html
<button>♥ 응원하기 <span class="text-xs opacity-60">1,234</span></button>
```

### Vote UI gate matrix

| Auth state | Button | On click |
|---|---|---|
| Not signed in | Visible, default | Toast §D.3 + redirect to `/signin?next=...` |
| Signed in, role IN (creator,studio,observer) | Visible, default | API call (RLS allows) |
| Already voted in this challenge | Visible, voted state | Disabled (UNIQUE constraint at DB) |
| Challenge state ≠ open | Hidden | n/a |

(Note: per SPEC §1, ALL roles including observer can vote. UI no longer
gates by role for vote — only auth.)

### §D.3 — Auth gate toast (addendum §3.2 + refinement)

When unauthenticated user clicks "응원하기":

```
Toast title: 참여한 분만 응원할 수 있어요
Toast action button: [참여 시작하기]   ← redirects to /signin?next=...
```

(Sonner library supports action button in toast — `toast(message, { action })`.
Tells user "why" + "how" simultaneously. Better than redirect-without-toast
which feels abrupt.)

### Realtime subscription

Per SPEC §2 #6 (5-second SLA from INSERT to visible):

```typescript
// src/components/challenges/gallery-realtime.tsx
"use client";
import { useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

export function GalleryRealtime({ challengeId }: { challengeId: string }) {
  const router = useRouter();
  
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    const channel = supabase
      .channel(`gallery:${challengeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "challenge_submissions",
          filter: `challenge_id=eq.${challengeId}`,
        },
        () => {
          router.refresh();  // RSC re-fetches
        }
      )
      .subscribe();
    
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [challengeId, router]);
  
  return null;  // invisible component
}
```

Pattern reused from Phase 2.1 H1 (existing realtime gallery in `team`
channels). Builder verifies pattern matches; this is the canonical shape.

### Vote count realtime — skip for MVP

Vote counts update on next page navigation, not realtime. Avoids "viewer
sees count fluctuating" overstimulation pattern. Realtime SLA per SPEC §2 #6
is for **submission INSERT only** (gallery freshness), not vote count
updates. Reaffirmed.

### Empty state — gallery

When challenge `state IN (open, closed_judging)` and zero submissions:

```
첫 번째 작품을 기다리고 있어요
이 챌린지의 첫 주인공이 되어보세요

[작품 올리기]   ← if eligible per §C.3 matrix
[참여 시작하기] ← if not auth
```

(Same copy as §C.4 detail page empty — consistency.)

When `state IN (closed_announced, archived)` and zero submissions:

```
참여한 작품이 없습니다
```

### Decisions for 야기

1. Grid columns 1/2/3 OK? (Or 1/2/4 for desktop density?)
2. Hover-autoplay videos OK? (Recommendation: yes, muted)
3. Winners section title "이번 챌린지의 주인공" + 부제 "창작자와 응원이 만난 작품들" OK?
4. Vote button label scheme (default "♥ 응원하기" / voted "♥ 응원") OK?
5. Toast action button pattern OK?

---

## §E — Component inheritance from share-surface

### Status: REFERENCE (no decision required)

Web Claude verified post-X1-retoken share-surface state. G3 inherits
the following exact patterns:

### Buttons

```tsx
// Primary CTA (all "작품 올리기", "응원하기", "참여 시작하기")
<Button size="pill">{label}</Button>

// Secondary CTA (취소, 닫기)
<Button size="pill" variant="outline">{label}</Button>
```

`pill` size already added to button.tsx via X1 #12 retoken. Use as-is.

### Modals (auth gate, share dialog, confirmation)

```tsx
{open && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
    <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-xl space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{body}</p>
      {/* form / actions */}
    </div>
  </div>
)}
```

(For more complex modals, use existing `<Dialog>` from `src/components/ui/dialog.tsx`.
The inline pattern above is for lightweight confirmations matching share-surface.)

### Form fields

```tsx
<div className="space-y-1.5">
  <Label htmlFor={id}>{label}</Label>
  <Input id={id} type={type} value={value} onChange={onChange} required />
</div>

// Multi-line
<Textarea
  placeholder={ph}
  value={value}
  onChange={onChange}
  rows={3}
  className="resize-none"
/>
```

### Reaction-style buttons (vote button base pattern — used for §D.2)

```tsx
<button
  className={cn(
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border",
    "transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    voted
      ? "bg-foreground text-background border-foreground"
      : "bg-background text-foreground border-input hover:border-foreground",
    "disabled:opacity-50 disabled:cursor-not-allowed"
  )}
>
  <Heart className={cn("h-4 w-4", voted && "fill-current")} />
  <span>{voted ? "응원" : "응원하기"}</span>
  <span className="text-xs opacity-60">{voteCount.toLocaleString()}</span>
</button>
```

### Forbidden patterns (X1 audit reaffirmed)

NEVER do in G3:
- `text-gray-*` / `bg-gray-*` / `border-gray-*` → use `text-muted-foreground` / `bg-muted` / `border-border`
- `bg-black` / `text-white` → use `bg-foreground` / `text-background`
- `bg-blue-*` etc raw color scales → use `bg-primary` / semantic tokens
- `text-[10px]` / `text-[11px]` / `text-[13px]` → use `text-xs` (12px) or `text-sm` (14px)
- `rounded-xl` / `rounded-2xl` → use `rounded-lg` (8px) or `rounded-md` (6px) or `rounded-full`
- Raw `<input>` / `<textarea>` → always `<Input>` / `<Textarea>`
- `focus:outline-none` without paired `focus-visible:ring-1 focus-visible:ring-ring`

### Forbidden copy patterns (NEW in v2 per §J global rules)

NEVER use in G3 user-facing copy:
- "제출하다" / "제출하세요" → use "작품 올리기" / "작품을 올려보세요"
- "투표하다" / "투표하세요" → use "응원하기" / "응원해보세요"
- "로그인하세요" / "로그인 후 이용 가능" → use "참여 시작하기"
- "갤러리" → use "작품 보기"
- "수상작" / "우승자" → use "주인공"
- "기능을 이용할 수 있습니다" / "사용 가능합니다" → use action verb directly
- "제출 완료" / "제출됨" → use "작품 올렸어요" / "공개됨"

---

## §F — `/challenges` list table layout + status pill + submission status

### Status: PROPOSED (야기 ADOPT/EDIT/REJECT)

Per SPEC §3 G3 Task 1: "table, not cards". UI_FRAMES Frame-2 (Browse) default.

### Table columns per section

| Section | Columns |
|---|---|
| **진행 중** | Title (linked) · 마감일 (D-N display) · 참여작 N (if §B Option A adopted) · 상태 badge |
| **결과 발표** | Title (linked) · 발표일 · 주인공 N명 · 상태 badge |
| **지난 챌린지** | Title (linked) · 발표일 · 상태 badge |

Use existing `<Table>` from `src/components/ui/table.tsx` (shadcn baseline
already in repo).

### §F.1 — Status pill helper (NEW required by G3)

Consolidates X1 audit's "6 separate statusBadgeClass functions" finding.
**G3 introduces this util as the canonical source.**

```typescript
// src/lib/ui/status-pill.ts
export type ChallengeStatus =
  | "draft"
  | "open"
  | "closed_judging"
  | "closed_announced"
  | "archived";

export function challengeStatusPill(status: ChallengeStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "open":
      return {
        label: "진행 중",
        className: "bg-foreground text-background",
      };
    case "closed_judging":
      return {
        label: "심사 중",
        className: "bg-muted text-foreground border border-border",
      };
    case "closed_announced":
      return {
        label: "결과 발표",
        className: "bg-foreground/10 text-foreground border border-foreground/20",
      };
    case "archived":
      return {
        label: "지난 챌린지",
        className: "bg-muted text-muted-foreground",
      };
    case "draft":
      return {
        label: "준비 중",
        className: "bg-muted text-muted-foreground",
      };
  }
}
```

(Labels: minimal v2 changes — "종료" → "지난 챌린지" only. Other 4 retained.
"종료" reads as system-tone closing; "지난 챌린지" reads as historical/curated.)

### §F.2 — Submission status helper (NEW for creator's view of own work)

DB enum `created` / `processing` / `ready` / `rejected` shown on creator's
own profile + own submission detail (NOT in public gallery — public sees
ready only via RLS).

```typescript
// src/lib/ui/status-pill.ts (extension)
export type SubmissionStatus =
  | "created"
  | "processing"
  | "ready"
  | "rejected";

export function submissionStatusPill(status: SubmissionStatus): {
  label: string;
  className: string;
  description?: string;  // optional sub-text for clarity
} {
  switch (status) {
    case "created":
      return {
        label: "올렸어요",
        className: "bg-foreground/10 text-foreground border border-foreground/20",
      };
    case "processing":
      return {
        label: "확인 중",
        className: "bg-muted text-foreground border border-border",
        description: "영상/이미지 처리 중이에요",
      };
    case "ready":
      return {
        label: "공개됨",
        className: "bg-foreground text-background",
        description: "갤러리에 공개되었어요",
      };
    case "rejected":
      return {
        label: "확인 필요",
        className: "bg-muted text-muted-foreground border border-border",
        description: "관리자가 검토 중이에요. 곧 안내드릴게요.",
      };
  }
}
```

(Status copy: "확인 필요" instead of "거절됨" — softer, allows admin
manual review without immediately demotivating creator. "rejected" DB
state is operational truth; UI surface is psychological truth.)

### Mobile responsive

Table at `< 640px`: collapse to **stacked card** view (single column,
each row becomes a vertical card with key-value pairs). Use existing
Tailwind `hidden sm:table-cell` pattern.

### Decisions for 야기

1. Table columns OK per section?
2. Status pill labels (진행 중 / 심사 중 / 결과 발표 / 지난 챌린지) OK?
3. Submission status labels (올렸어요 / 확인 중 / 공개됨 / 확인 필요) OK?
4. "rejected" DB state surfaced as "확인 필요" with admin-review framing OK?
5. Mobile responsive: stacked cards OK?

---

## §G — File inventory (G3 deliverables)

For Builder reference — all G3 produces these files:

```
src/app/challenges/
  ├── layout.tsx                       (NEW — public chrome)
  ├── page.tsx                         (G3 Task 1 — list + headline)
  ├── [slug]/
  │   ├── layout.tsx                   (NEW — slug-context wrapper)
  │   ├── page.tsx                     (G3 Task 2 — detail with status banner + CTA matrix)
  │   ├── not-found.tsx                (404 with custom UX)
  │   └── gallery/
  │       └── page.tsx                 (G3 Task 3 — gallery + winners + empty state)

src/components/challenges/
  ├── public-chrome.tsx                (NEW — header + footer wrapper, context-aware CTA)
  ├── challenge-list-section.tsx       (NEW — table per state)
  ├── challenge-card-mobile.tsx        (NEW — stacked card mobile variant)
  ├── status-banner.tsx                (NEW — detail page state-aware banner with urgency tiers)
  ├── requirements-display.tsx         (NEW — JSONB → Korean rendering)
  ├── timeline-display.tsx             (NEW — open/close/announce display)
  ├── primary-cta-button.tsx           (NEW — auth + role + state aware CTA per §C.3 matrix)
  ├── share-button.tsx                 (NEW — Web Share API + clipboard)
  ├── gallery-grid.tsx                 (NEW — grid + cards)
  ├── gallery-realtime.tsx             (NEW — realtime subscription, client)
  ├── submission-card.tsx              (NEW — gallery card with rank for winners)
  ├── vote-button.tsx                  (NEW — gated vote action, "응원" copy)
  ├── empty-state.tsx                  (NEW — 의인화 empty state pattern)
  └── header-cta-resolver.tsx          (NEW — resolves header CTA per §A matrix)

src/lib/challenges/
  ├── types.ts                         (NEW — SubmissionRequirements + JudgingConfig)
  ├── queries.ts                       (NEW — list / detail / gallery queries)
  ├── urgency.ts                       (NEW — computes 24h/1h urgency tier from close_at)
  └── (no formatting helpers — use existing date-fns from package.json)

src/lib/ui/
  └── status-pill.ts                   (NEW — challenge status + submission status, both)

src/app/sitemap.ts
  └── (modified — add /challenges + /challenges/[slug] for open + announced)

middleware.ts
  └── (NO change — /challenges already excluded per SPEC §3 G3 Task 4 + commit 5855dd0)
```

### SEO + sitemap

Per SPEC §3 G3 Task 5: "MetadataRoute generation per challenge".

- `src/app/sitemap.ts` (already exists): extend to include `/challenges` 
  and dynamic `/challenges/[slug]` for `open` + `closed_announced` states only
  (skip `archived` from sitemap — they're old, prevent SEO dilution; 
  individual URLs still work for permalinks)
- Each challenge page exports `generateMetadata({ params })`:
  - `title`: `${challenge.title} · YAGI 챌린지`
  - `description`: first 160 chars of `description_md` stripped of markdown
  - `openGraph.images`: `challenge.hero_media_url` (or generated OG image
    if media is video — defer to Phase 2.7 OG image generation)
  - `robots.index`: true for `open`/`closed_announced`, false for `archived`/`closed_judging`

Skip `opengraph-image.tsx` (Next.js generated OG) for MVP — `hero_media_url`
direct reference is sufficient.

---

## §H — G3 entry checklist

When 야기 is ready to enter G3, run this checklist:

```
[ ] §0 — Tone principle adopted? (creator-centric, action-driven, emotional)
[ ] §A — G3 standalone (not Phase 2.6 merge)?
[ ] §A — Header CTA matrix (4 contexts) OK?
[ ] §A — Header logo: symbol or wordmark?
[ ] §B — Page headline "지금 가장 주목받는 AI 챌린지" OK?
[ ] §B — Section ordering / "지난 챌린지" collapsed / submission count "참여작 N"?
[ ] §C.2 — Status banner copy matrix (all 6 rows incl. urgency 24h/1h)?
[ ] §C.3 — Primary CTA matrix (all 6 rows) OK?
[ ] §C.4 — Empty state "기다리고 있어요" 의인화 OK?
[ ] §D.1 — Winners "이번 챌린지의 주인공" + 부제 OK?
[ ] §D.2 — Vote button (default "응원하기" / voted "응원" + filled) OK?
[ ] §D.3 — Toast action button pattern OK?
[ ] §F.1 — Status pill labels OK?
[ ] §F.2 — Submission status labels (올렸어요 / 확인 중 / 공개됨 / 확인 필요) OK?
[ ] §G — File inventory acceptable?

Preconditions verified:
[ ] Phase 2.5 G1 closeout (DB ready) — commit 58dbf6e + hardening
[ ] Phase 2.5 G2 closeout (auth + role selection shipped)
[ ] Share-surface X1 [BLOCKS 2.5] retoken — verified Web Claude (commit 7de7941)
[ ] R2 bucket yagi-challenge-submissions — created (G4 uses, G3 doesn't)
[ ] Phase 2.4 G1 (Webflow accent + fonts) — applied? If not, accents
    fallback to current shadcn defaults. NOT blocking.
```

When all `[ ]` resolved, 던지기:

```
GO G3.

Read .yagi-autobuild/phase-2-5/G3-ENTRY-DECISION-PACKAGE.md (v2).
Adopted decisions: §0 tone, §A standalone + header matrix, §B headline + ordering,
§C.2 status banner (incl urgency), §C.3 CTA matrix, §C.4 empty state,
§D.1 winners, §D.2 vote button, §D.3 toast pattern,
§F.1 status pill, §F.2 submission status, §G file inventory.
[edit any deviations here].

Execute G3 per SPEC v2 §3 G3 + Decision Package §G file inventory.
Stop point per SPEC: yagi visual review of /challenges + /challenges/[slug]
at localhost:3003 before /gallery realtime work.

Copy enforcement: §0 vocabulary mapping is global. Any violation in PR
diff (제출/로그인/투표/갤러리/수상작 vocabulary) → reject before commit.

Tsc + e2e smoke at completion (curl /challenges + /challenges/<test-slug>).
Commit message: "feat(phase-2-5): G3 — public challenge surfaces (creator-centric)".
Telegram on completion.
```

---

## §I — Test data prep (for visual review)

**Web Claude addition**: G3 visual review needs at least 1 challenge in
each state to verify rendering. 야기 manually creates test challenges
via SQL Editor before G3 visual stop point:

```sql
-- Run in Supabase SQL Editor as authenticated yagi_admin
-- Replace YOUR_AUTH_USER_ID below with output of: select auth.uid()
INSERT INTO public.challenges
  (slug, title, description_md, state, open_at, close_at, announce_at,
   submission_requirements, judging_config, created_by)
VALUES
  ('test-open-1', 'AI 영상 챌린지 (테스트)',
   '## 주제\n자유 주제로 60초 이내 AI 생성 영상을 올려주세요.',
   'open',
   now() - interval '3 days', now() + interval '7 days', now() + interval '10 days',
   '{"native_video":{"required":true,"max_duration_sec":60,"max_size_mb":500,"formats":["mp4"]},"text_description":{"required":true,"min_chars":50,"max_chars":2000}}'::jsonb,
   '{"mode":"hybrid","admin_weight":70}'::jsonb,
   'YOUR_AUTH_USER_ID'),
  ('test-open-urgent-24h', '마감 임박 테스트 (24h)',
   'urgency 24h 임박 테스트',
   'open',
   now() - interval '6 days', now() + interval '20 hours', now() + interval '5 days',
   '{}'::jsonb, '{"mode":"admin_only"}'::jsonb,
   'YOUR_AUTH_USER_ID'),
  ('test-open-urgent-1h', '마감 임박 테스트 (1h)',
   'urgency 1h 임박 테스트',
   'open',
   now() - interval '7 days', now() + interval '45 minutes', now() + interval '5 days',
   '{}'::jsonb, '{"mode":"admin_only"}'::jsonb,
   'YOUR_AUTH_USER_ID'),
  ('test-judging-1', '심사 중 챌린지 (테스트)',
   '심사 진행 중',
   'closed_judging',
   now() - interval '14 days', now() - interval '2 days', now() + interval '3 days',
   '{}'::jsonb, '{"mode":"admin_only"}'::jsonb,
   'YOUR_AUTH_USER_ID'),
  ('test-announced-1', '결과 발표 챌린지 (테스트)',
   '결과 발표 완료',
   'closed_announced',
   now() - interval '30 days', now() - interval '14 days', now() - interval '1 day',
   '{}'::jsonb, '{"mode":"admin_only"}'::jsonb,
   'YOUR_AUTH_USER_ID'),
  ('test-archived-1', '지난 챌린지 (테스트)',
   '아카이브',
   'archived',
   now() - interval '90 days', now() - interval '60 days', now() - interval '45 days',
   '{}'::jsonb, '{"mode":"admin_only"}'::jsonb,
   'YOUR_AUTH_USER_ID');
```

(Two extra "open" rows — one with 20h to close, one with 45min to close —
let visual review verify all 3 urgency tiers in §C.2.)

Cleanup (post-G3 review):

```sql
DELETE FROM public.challenges WHERE slug LIKE 'test-%';
```

---

## §J — Copy consistency enforcement (NEW in v2 — addendum §5)

These rules are **globally enforced** across all G3 surfaces. Any violation
in PR diff is a reject-before-commit signal for code review.

### §J.1 — Hard substitutions (never mix)

The following substitutions are **all-or-nothing** at the surface level.
Mixing the two halves of any pair within a single page is a copy bug.

| Forbidden (system tone) | Required (creator tone) |
|---|---|
| 제출 / 제출하다 / 제출하세요 / 제출됨 | **올리기 / 올리다 / 올려보세요 / 올렸어요** |
| 투표 / 투표하다 / 투표하세요 / 투표함 | **응원 / 응원하다 / 응원해보세요 / 응원** |
| 로그인 / 로그인하세요 / 로그인 필요 | **참여 시작하기 / 참여한 분만** |
| 갤러리 | **작품 보기** |
| 수상작 / 우승자 | **이번 챌린지의 주인공 / 주인공** |

### §J.2 — Tone preferences (avoid → prefer)

| Avoid (description tone) | Prefer (action tone) |
|---|---|
| "로그인 후 이용 가능" | "참여 시작하기" |
| "제출할 수 있습니다" | "작품을 올려보세요" |
| "기능을 사용할 수 있습니다" | (action verb directly) |
| "투표가 가능합니다" | "응원해보세요" |
| "X일 X시간 남음" (passive) | "마감까지 X일 X시간" (X시 < 24h: 강조) |

### §J.3 — Prohibited patterns

- System-announcement framing: "안내드립니다" / "공지" → use direct second person
- Apologetic over-formality: "죄송합니다만" / "양해 부탁드립니다" → 자연스러운 한국어
- Feature documentation phrasing: "X 기능을 통해" / "다음과 같이" → action directly
- English-mixed labels: "Vote" / "Submit" / "Login" → 한국어 only

### §J.4 — Encouraged patterns

- 의인화 (personification): "기다리고 있어요" / "응원이 만난 작품"
- 희소성 (scarcity): "첫 주인공" / "이번 챌린지의 주인공"
- 행동 유도 (call-to-action): 모든 CTA는 동사로 끝남
- 정서 연결 (emotional connection): "응원" / "주인공" / "빛난"
- 친근한 종결: "올려보세요" / "확인하세요" (공식 + 친근 균형)

### Implementation hook

Builder adds a CI lint rule (or pre-commit hook):

```bash
# scripts/lint-copy.sh — runs on src/app/challenges/* + src/components/challenges/*
grep -E "(제출|투표|갤러리|수상작|우승자|로그인 후)" src/app/challenges/ src/components/challenges/ -r
# Exit non-zero if any match. Acceptable false positives: comments, type names.
```

(Optional. Manual code review enforcement is also acceptable for MVP.)

---

## §K — Status

This Decision Package v2 authored by web Claude during G1 hardening
window (2026-04-23). Designed for ZERO turn-around at G3 entry — 야기
reads, adopts, Builder runs.

Supersedes v1. v2 changes: §0 tone principle, §B page headline,
§C.2 status banner with urgency tiers, §C.3 CTA matrix all 6 rows,
§C.4 empty state, §D.1 winners section, §D.2 vote button refinement,
§D.3 toast action pattern, §F.1 status pill (지난 챌린지),
§F.2 submission status helper (NEW), §J copy consistency enforcement (NEW).

Save as `.yagi-autobuild/phase-2-5/G3-ENTRY-DECISION-PACKAGE.md`
after 야기 review. v1 file (if already on disk) is overwritten — no
versioning artifact needed since v1 was never committed.

End.
