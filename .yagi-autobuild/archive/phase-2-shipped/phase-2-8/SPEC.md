# Phase 2.8 — Brief Board (의뢰 시점 + 진행 중 협업 공간)

**Status:** v2 (web Claude 2026-04-25 evening, supersedes v1 same-day)
**Duration target:** 7 calendar days (1 worktree, scope-cut to fit)
**Predecessor:** Phase 2.7.2 (wizard 3-step + Step 1 picker 제거 + Step 3 placeholder)
**Branch:** `g-b-brief-board` (single worktree; G_B grouping)

---

## §0 — Why this exists

### Phase 2.7.2 가 만든 빈 공간

Phase 2.7.2 에서 wizard Step 3 "레퍼런스" 가 **"기획 보드 — 준비 중"** placeholder 로 바뀌었다. 같은 phase 에서 Step 0 "기획안 있다 / 없다" picker 도 제거됐다. 두 변경의 공통 전제는 같다 — **사용자에게 "지금부터 기획안의 형식이 뭔지 결정해라" 라고 묻지 말고, 기획을 자유롭게 담을 수 있는 공간을 주자.** Phase 2.8 은 그 공간을 짓는다.

### Karpathy-mode 첫 질문: 이게 단순 wizard step 인가, 살아있는 객체인가?

**살아있는 객체.** 두 신호:

1. **야기 직접 발화 (2026-04-25):** "프로젝트가 이제 만들어진 이후에 기획을 보고 같이 소통할 수 있어야 함. 그렇기에 기획안 버전을 나눠서 저장할 수도 있으면 좋을 것 같고."
2. **AI VFX 의뢰의 본질:** brief 는 한 번에 fix 되지 않는다. 의뢰 → discovery 미팅 → 1차 컨셉 → 클라이언트 피드백 → 2차 보드 → 합의 의 cycle. 정적 wizard form 은 이 cycle 을 담을 그릇이 못 된다.

→ Brief Board 는 **wizard 안에서 입력 시작 + project detail 안에서 계속 살아있는 객체** 두 surface 를 같이 가진다. 단일 데이터 객체.

### 차용한 글로벌 패턴

| Source | What we take | What we don't |
|---|---|---|
| **Figma version history** | 명시 snapshot ("v1 저장"), timeline sidebar, 시점 비교 | Auto branching, multi-cursor |
| **Notion blocks** | Block-based 자유 결합 (텍스트/이미지/파일/embed), drag-reorder, slash command | Database/relational blocks |
| **Are.na** | 시각 큐레이션 grid view, 이미지/embed 큐레이션 mindset | Public discovery |
| **Frame.io** | (Phase 2.9+) 영상 timestamp annotation | 풀 NLE workflow |
| **Linear comment thread** | Project-level thread, resolve flow, mention | Issue tracking |
| **Pinterest** | (Phase 2.9) Grid toggle view | Discovery feed |

> **Out of scope (반복):** Real-time multi-cursor, AI agent edit, 자동 brief generation. Phase 2.9+ 또는 별 product 단위.

### v1 의 좁은 정의 (scope-cut from v1 SPEC)

Phase 2.8 G_B v1 = **block editor (TipTap) + R2 업로드 (이미지/파일) + 임베드 2개 provider (YouTube + Vimeo) + 명시 버전 snapshot + project-level 댓글** 다섯 개. 이것만. v1.1 (Phase 2.8.1) 에 임베드 provider 확장 (Figma/Behance/Pinterest/Loom). 그 외는 §9 deferred.

### Why v2 — what changed from v1 SPEC

v1 SPEC 검토에서 발견한 9개 blocking 갭 + 5개 minor 갭 반영:

1. **Draft-project 패턴** 도입 (§3, §10 R5) — wizard 의 trans­actional 문제 해결 (asset orphan 차단)
2. **Asset GC v1 = 안 함** 결정 (§3 Note) — boring stack
3. **`embed_cache` table** 명시 (§3.4)
4. **Optimistic concurrency** (`If-Match-Updated-At`) 명시 (§5.5)
5. **Wizard 너비 결정** (§2.A) — 컨테이너 max-w-2xl 유지, Step 3 만 자체 max-w-4xl
6. **Embed sanitization** 명시 (§4.B4) — DOMPurify + iframe whitelist
7. **Slash command v1 scope** 명시 (§4.5, G_B-2 안)
8. **Lock/unlock semantics** 명시 (§5.4)
9. **Effort 재추정 + scope-cut** (§8) — embed YouTube+Vimeo only, 1 week 유지
10. **Codex review timing** (§8 K-05 gate) 명시
11. "비워두고 시작" 라벨 (§4.5 + Appendix B)
12. 비-회원 share link → Phase 2.9+ defer (§9)
13. TipTap IME 검증 책임 → G_B-2 DoD (§8)
14. Image auto-resize (browser longest-side 2400px) (§4.B2)
15. Embed paste loading UX (placeholder card swap) (§4.B4)

---

## §1 — User stories

### Client (의뢰인)

- **C1**: 새 프로젝트를 만들 때 wizard Step 3 에서 텍스트/이미지/파일/링크 자유롭게 올려 기획을 시작한다. 빈 칸인 채로 다음 단계로 가도 된다.
- **C2**: 프로젝트 생성 후 detail page 에서 brief board 를 계속 편집한다. 자동 저장.
- **C3**: 한 번 기획안을 정리하고 싶을 때 "v1 저장" 버튼을 눌러 그 시점의 보드를 snapshot 으로 박는다. snapshot 에 라벨을 단다 ("초안", "미팅 후 수정 v2").
- **C4**: YAGI 내부 멤버가 보드에 코멘트 남기면 알림 받는다. 답변 단다.
- **C5**: 기획이 막막할 때 보드 빈 상태에 보이는 "YAGI가 제안 드려요 →" CTA 를 눌러 goal/audience/budget 만 적고 YAGI에게 방향 요청 보낸다.

### YAGI internal (admin / member)

- **Y1**: client 가 만든 보드를 본다. 코멘트 단다 (보드 단위 thread).
- **Y2**: client 의 v1 vs 현재 보드를 비교한다 (v1: side-by-side toggle 만, true-diff 는 Phase 2.9).
- **Y3**: client 가 보낸 "YAGI 제안 요청" 을 보고 client 의 board 에 직접 첫 draft 를 채워 넣는다.
- **Y4**: 합의된 final brief 보드를 "Locked" 상태로 박아 production 단계로 넘어간다.

### Out-of-scope user stories (defer)

- ❌ Block 단위 인라인 코멘트 (Phase 2.9 — block id 필요한 데이터 모델 변경 동반)
- ❌ Frame.io 풍 영상 위 timestamp annotation (Phase 2.9+; FOLLOWUPS.md 의 annotation player 와 통합)
- ❌ Real-time co-editing (Phase 2.9+; Yjs/Liveblocks)
- ❌ 비-회원 client 가 share link 로 board 를 receive (Phase 2.9+; preprod `/s/[token]` 패턴 따름)
- ❌ 자동 AI brief generation from goal (Phase 3.0)
- ❌ True version diff (Phase 2.9 — JSON diff lib + UI)

---

## §2 — Information Architecture

### Surface A — Wizard Step 3 (project 생성 시)

Phase 2.7.2 의 placeholder 자리에 들어간다. **Wizard 컨테이너는 max-w-2xl 유지** (다른 step 과 일관) — Step 3 만 자체 wrapper 로 max-w-4xl 까지 확장하여 board canvas 가 ample. 즉 Step 1/2/4 는 좁고 Step 3 만 넓음. 각 Step 의 transition 은 same width 가 아니라 self-contained 라서 시각적 jump 없음 (header + indicator 는 max-w-2xl 컨테이너 안에 머묾).

#### Draft-project 패턴 (CRITICAL)

> **Wizard 진입 시점에 status='draft' project row 미리 INSERT.** Step 3 의 image / file 업로드는 그 project_id 에 묶임 (asset table 의 project_id FK 가 있음). Wizard "제출" = status='submitted' UPDATE. Wizard 중간 이탈 시: project 는 draft 로 남고 (기존 Phase 1.x 패턴), 사용자가 `/app/projects` 에서 다시 열어 이어서 작성.
>
> **Why this matters:** asset INSERT 는 project_id 를 요구. wizard submit 직전까지 project_id 가 없으면 asset 이 orphan 이 되거나, staging table 도입이 필요. Draft-project 패턴은 둘 다 피한다 — boring stack.

#### Wizard ↔ board state 통합

Wizard Step 3 의 board 컴포넌트는 detail page 의 board 컴포넌트와 **같은 컴포넌트**. props 만 다름:
- Wizard: `mode="wizard"` — version save 버튼 hidden, history sidebar collapsed-default, comments hidden
- Detail: `mode="full"` — 모두 visible

내부 데이터 흐름은 동일. wizard 안에서 typing 해도 server action 으로 debounced auto-save (3s) → `project_briefs.content_json` 에 저장. submit 클릭 시 단지 `projects.status` 를 'draft' → 'submitted' 로 flip.

### Surface B — `/app/projects/[id]` Brief tab (project 생성 후)

기존 `/app/projects/[id]` 페이지에 "Brief" tab 추가. 항상 latest brief 를 편집 모드로 연다. 좌측 collapsible sidebar 가 version history (default open) + comments thread (tab 으로 전환). 우측 board canvas.

> **단일 source of truth:** `project_briefs` 테이블 1개. `projects.id` 와 1:1. `project_briefs.content_json` 이 latest. `project_brief_versions` 가 snapshot history.

### Sidebar / Navigation

이 phase 에서 sidebar 변경 없음. Brief Board 는 project detail 안의 tab 이지 top-level surface 가 아니다. (글로벌 search 의 brief 본문 인덱싱은 Phase 2.9.)

### 빈 상태 (empty board) CTA

```
[ 텅 빈 보드 dashed border 영역 ]

  아직 기획이 없으신가요?
  목표만 알려주시면 YAGI 가 방향을 제안 드려요 →
  [ YAGI에게 제안 요청 ]
```

CTA 클릭 → 작은 modal — goal / target audience / budget range / desired timeline 4개 필드. 제출 시 board 에 system block 1개 ("[YAGI에게 제안 요청] {timestamp}") + thread message + 내부 알림 (admin 큐). YAGI 가 응답하면 자기가 직접 board content_json 에 block 추가 (collaborative edit) — 이때 client 에게 `project_brief_first_fill` 알림.

→ **이게 Phase 2.7.2 에서 Step 0 picker 를 제거한 정당화의 종착지다.**

---

## §3 — Schema

### Boring stack 원칙

- 새 테이블 4개. 인덱스 명시. RLS 명시. magic ORM trick 안 씀.
- `content_json` = TipTap 의 ProseMirror JSON document shape 그대로 저장. (단점: TipTap upgrade 시 migration 가능 → §10 R1)

### §3.1 `project_briefs` (1:1 with projects)

```sql
create table project_briefs (
  project_id      uuid primary key references projects(id) on delete cascade,
  content_json    jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  -- TipTap ProseMirror document. block array under content[].
  status          text not null default 'editing'
                    check (status in ('editing','locked')),
  -- 'locked' = 합의된 final brief, production 단계로 넘어가면 frozen
  current_version int not null default 0,
  -- 0 == "v1 저장 안 함, 편집 중". 1 부터 명시 snapshot.
  tiptap_schema_version int not null default 1,
  -- Future-proofing: TipTap upgrade 시 migration 식별자.
  updated_at      timestamptz not null default now(),
  updated_by      uuid not null references auth.users(id)
);

create index project_briefs_status_idx on project_briefs(status);
```

> **`projects.brief` (Phase 1.x existing column) 는 어떻게?** Legacy markdown text. 새 board 와 별개로 둠. wizard `description` field 는 `projects.brief` 에, board 는 `project_briefs.content_json` 에. UI 라벨로 구분 ("프로젝트 설명" vs "기획 보드"). 미래에 board 통합 검토.

### §3.2 `project_brief_versions` (snapshot history)

```sql
create table project_brief_versions (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  version_n       int not null,
  -- 1, 2, 3, ... — strictly increasing per project
  content_json    jsonb not null,
  -- frozen snapshot of project_briefs.content_json at save time
  label           text,
  -- optional client-supplied label, e.g. "초안", "킥오프 미팅 후"
  created_at      timestamptz not null default now(),
  created_by      uuid not null references auth.users(id),
  unique (project_id, version_n)
);

create index project_brief_versions_project_idx
  on project_brief_versions(project_id, version_n desc);
```

### §3.3 `project_brief_assets` (R2-uploaded files)

```sql
create table project_brief_assets (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  storage_key     text not null,
  -- R2 key, e.g. "project-briefs/{project_id}/{uuid}.png"
  mime_type       text not null,
  byte_size       bigint not null,
  original_name   text,
  uploaded_at     timestamptz not null default now(),
  uploaded_by     uuid not null references auth.users(id)
);

create index project_brief_assets_project_idx on project_brief_assets(project_id);
```

> **Orphan GC = v1 안 함.** content_json 에서 asset_id 가 빠진 이미지 block 의 R2 object 는 그냥 남는다. project 삭제 시 cascade 로 row 삭제 + R2 cleanup webhook (Phase 2.8.1 에서 추가). v1 의 R2 비용 추정: project 100개 × 평균 50MB asset = 5GB ≈ $0.075/월 (storage class 표준). egress 는 R2 무료. 미미함. v2 (Phase 2.9) 가 본격 GC.

### §3.4 `embed_cache` (oEmbed response cache)

```sql
create table embed_cache (
  url             text primary key,
  -- normalized URL after canonical mapping (e.g. youtube short-link → full)
  provider        text not null
                    check (provider in ('youtube','vimeo','generic')),
  -- v1: 2 official providers + generic OG fallback. Phase 2.8.1: figma/behance/pinterest/loom.
  response_json   jsonb not null,
  -- {title, thumbnail_url, html (sanitized), width, height, author_name}
  fetched_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '7 days')
);

create index embed_cache_expires_idx on embed_cache(expires_at);
```

> 7일 stale → background refresh job (Phase 2.8.1). v1 은 stale 그대로 표시.

### §3.5 Comment thread

기존 `threads` 인프라 재사용. 새 enum 값 1개 추가.

```sql
-- Phase 2.0 baseline 의 threads.kind enum 에 추가
alter type thread_kind add value 'project_brief';
-- threads.entity_id = projects.id 형태로 사용
```

새 테이블 추가 안 함.

> **Block 단위 inline comment 는 Phase 2.9.** 그 시점에 `threads.anchor_block_id text nullable` 컬럼 + TipTap node attribute 에 stable block id 부여. 지금은 안 함.

### §3.6 RLS 정책 (요약, 자세한 마이그레이션은 IMPLEMENTATION.md)

- `project_briefs`: `project_members.user_id = auth.uid()` — read/write
- `project_brief_versions`: 같은 조건; write 는 INSERT 만 (UPDATE/DELETE deny — append-only)
- `project_brief_assets`: 같은 조건; INSERT/SELECT/DELETE — DELETE 는 본인 업로드만
- `threads (kind='project_brief')`: `project_members.user_id = auth.uid()`
- `embed_cache`: read 는 authenticated user 모두, write 는 server-action 만 (RLS bypass via service role)

---

## §4 — Block types (v1 MVP)

TipTap default node 외에 우리가 의도적으로 정의하는 4개 block type. 그 외 마크업은 TipTap default (heading 1/2/3, bullet/ordered list, blockquote, horizontal rule, hard break).

### §4.B1 — Text (paragraph + inline marks)

기본. TipTap default. inline marks: bold / italic / strikethrough / inline code / link. 그 이상은 Phase 2.9.

### §4.B2 — Image

```jsonc
{ "type": "image", "attrs": {
    "asset_id": "uuid",        // → project_brief_assets.id
    "alt": "string",
    "width": 800                // optional, layout hint
}}
```

업로드 flow:
1. drag-drop 또는 toolbar `+` button → 파일 선택
2. **Browser-side resize** (최대 longest-side 2400px) — `createImageBitmap` + `OffscreenCanvas` + `toBlob('image/jpeg', 0.85)` 또는 PNG 유지 (mime 보존)
3. R2 presigned PUT URL 요청 → `project_brief_assets` INSERT with project_id
4. PUT to R2 → block 에 asset_id 박음
5. 표시 시 server action 으로 signed GET URL fetch (RLS check)

> **Why browser resize?** 원본 4K 이미지 1장 = 8MB. 보드에 5장 박으면 첫 로드 40MB. resize 후 longest-side 2400 = 평균 1MB. 95% 사용자가 차이 인지 못 함.

### §4.B3 — File (non-image attachment)

```jsonc
{ "type": "file", "attrs": {
    "asset_id": "uuid",
    "filename": "string",
    "mime_type": "string",
    "byte_size": 1234567
}}
```

PDF / AI / FIG / MP4 / etc. 파일 카드 형태 (icon + filename + size + download button). 200MB 제한 (commission intake 의 500MB 보다 보수적, embed 권장).

### §4.B4 — Embed (oEmbed URL)

```jsonc
{ "type": "embed", "attrs": {
    "url": "https://...",
    "provider": "youtube|vimeo|generic",
    // v1: 위 3개. Phase 2.8.1: figma|behance|pinterest|loom 추가.
    "title": "string",
    "thumbnail_url": "string",
    "fetched_at": "timestamp"
}}
```

> **html 필드 제거 (v1).** 보안상 server-side iframe HTML 캐싱 안 함. 대신 client 가 provider + URL 보고 안전한 iframe 을 *자체* 렌더 (whitelist provider 만).

#### Loading UX (paste → render)

1. URL paste → 즉시 placeholder block 렌더 (skeleton + URL hostname)
2. `fetchEmbed(url)` server action 호출 (oEmbed proxy)
3. 응답 도착 → block attrs 갱신 (title/thumbnail), placeholder swap
4. 실패 시 → block 에 `error` flag, "임베드를 불러올 수 없어요. URL 확인" 메시지

→ paste 후 1-3초 기다리는 동안 user 는 다음 줄 typing 가능. block 은 비동기 swap.

#### Sanitization

embed iframe 은 client 가 직접 만든다 (server cache 에 HTML 박지 않음). YouTube/Vimeo 의 official embed pattern 만 허용:

```jsx
// YouTube
<iframe src={`https://www.youtube.com/embed/${videoId}`}
        sandbox="allow-scripts allow-same-origin allow-presentation"
        allowFullScreen />

// Vimeo
<iframe src={`https://player.vimeo.com/video/${videoId}`}
        sandbox="allow-scripts allow-same-origin"
        allowFullScreen />
```

`videoId` 는 URL 에서 정규식으로 추출 (예: `/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/`). 추출 실패 → generic OG fallback (thumbnail card + external link 만, iframe 안 보임).

### §4.5 — Slash command (G_B-2 안에 포함)

`/` 입력 → block type picker. v1 menu:
- Heading 1, 2, 3
- Bullet list, Ordered list
- Divider
- Image (file picker open)
- File (file picker open)
- Embed (URL prompt)
- "비워두고 시작" — wizard 모드에서만 (=현재 board 비우고 다음 step)

Phase 2.9 가 column / callout / toggle / table / code block 추가.

---

## §5 — Versioning UX

### §5.1 — 명시 "v{n} 저장" only — 자동 버전 안 만든다

**Why explicit?** Figma history 가 자동 버전을 만들지만 noise 가 많아 사용자가 history sidebar 를 안 본다. 우리는 합의된 마일스톤만 박는다. 자동은 Phase 2.9 (시간 기반 hourly auto-save 옵션).

### §5.2 — Save flow

1. 우상단 `[ v{n+1} 저장 ]` 버튼 — primary action
2. 클릭 → small modal: "라벨 (선택): ___________ [ 저장 ]"
3. 저장 → INSERT into `project_brief_versions` (snapshot of current `content_json`, label, version_n = current+1) + UPDATE `project_briefs.current_version = n+1`
4. Toast: "v{n+1} 으로 저장됨"
5. version sidebar 갱신

### §5.3 — History sidebar (collapsible)

```
v3 · 2026-04-25 · "킥오프 후 합의안"  ← 현재
v2 · 2026-04-22 · "1차 안"
v1 · 2026-04-20 · "초안"
```

각 row 클릭 → 우측 canvas 가 그 버전 read-only 로 전환. 헤더에 노란 banner: "v{n} 보기 — 편집 불가. [ 최신 으로 돌아가기 ]". 두 버전 side-by-side toggle 만 (true-diff 는 Phase 2.9).

#### "이 버전으로 되돌리기"

Read-only viewer 헤더에 `[ 이 버전으로 복사 ]` 버튼. 클릭 시 그 버전의 content_json 을 latest 로 복사 (UPDATE), 다음 명시 저장 시 새 version snapshot 생성. 즉 v1 클릭 → 복사 → 편집 → "v4 저장" = label 자동 "v1 으로 복원 후 편집".

### §5.4 — Lock / Unlock

- **Lock**: `status='locked'` UPDATE. 모든 편집 차단 (RLS 가 status 검사). admin 만 가능. UI 헤더에 자물쇠 아이콘 + "프로덕션 진입 — 변경 불가". 알림 `project_brief_locked` 발송.
- **Unlock**: `status='locked' → 'editing'` UPDATE. admin 만. **Version snapshot 안 만든다 (status flip only).** unlock 사실은 history sidebar 의 audit log row 로 노출 (Phase 2.9 의 audit_log 테이블이 있을 때; v1 은 단순 status 만).
- **Locked 상태에서의 history**: 그대로 보존 (read-only). lock 자체가 latest 의 freeze.

### §5.5 — Optimistic concurrency control

두 사람이 같은 board 를 동시 편집. **Mechanism:**

1. Client 는 `updated_at` 을 local state 에 보관
2. 매 save server-action 호출 시 `If-Match-Updated-At: <timestamp>` 같이 보냄
3. Server 가 현재 DB 의 `updated_at` 과 비교
4. mismatch → `409 Conflict` 응답 + 현재 latest content_json
5. Client 는 toast: "다른 분이 방금 저장했습니다. [ 새로고침 ]" + 사용자 클릭 시 latest 로 reload
6. match → 정상 UPDATE + 새 `updated_at` 응답

**Limitation:** last-reload-wins. 실 사용 패턴 (client 혼자 채움, YAGI 혼자 draft, 그 외에는 코멘트로 소통) 에서 동시 편집 빈도 낮음. Phase 2.9+ Yjs 도입 시 이 패턴 폐기.

---

## §6 — Comment thread

### 어디?

board 좌측 collapsible sidebar (history 와 같은 자리, tab 으로 전환). viewport 좁으면 bottom sheet.

### 무엇이 보이나

```
[ 익명 아바타 + 이름 ]
[ 시각 ]
"이 부분 톤이 너무 무거운 것 같아요. 좀 더 라이트하게 가도 될까요?"
[ 답글 N개 ]
[ 해결 / 답글 달기 ]
```

기존 `threads` 인프라 그대로. visibility (`shared` vs `internal`) 그대로. resolve flow 그대로.

### 알림

기존 notifications kind 에 추가:
- `project_brief_comment_new` — high priority (immediate email)
- `project_brief_version_saved` — medium (digest)
- `project_brief_locked` — high
- `project_brief_first_fill` — high (YAGI 가 client 의 빈 board 에 첫 draft 채웠을 때)

---

## §7 — Tech stack

### Editor: TipTap (ProseMirror 기반)

**Why TipTap, not Lexical / Plate / Slate / BlockNote?**

| Editor | Pros | Cons | Verdict |
|---|---|---|---|
| **TipTap** | React-friendly, ProseMirror 의 검증된 모델, headless / fully customizable, 우리 design system 과 충돌 없음, 한국어 IME 처리 reasonable, 활발한 community | dependency 크기 (~80kb gzipped) | ✅ |
| Lexical (Meta) | 작고 빠름, official | React 통합 미성숙, 학습 곡선 가파름 | ❌ |
| Plate | TipTap 같은 추상화 + Slate 기반 | Slate 가 IME 와 nested block 에서 historically 약함 | ❌ |
| Slate | Customizable | TipTap 보다 boilerplate 많음, 한국어 IME 이슈 ongoing | ❌ |
| BlockNote | Notion-like out of box | 우리 design system 강제 conflict, 커스텀 영역 제한 | ❌ |

**Decision:** TipTap. boring 한 선택.

> **IME 검증 책임**은 G_B-2 의 DoD 에 명시 (§8). 한국어 typing 5분 manual smoke test (조합 중 깨짐, 입력 누락, double-space 이슈) → fail 시 G_B-2 marked stop.

### Embeds: 자체 oEmbed proxy (서버 사이드)

iframely API ($) 안 씀. 자체 구현:
- YouTube: `https://www.youtube.com/oembed?url={url}&format=json` → JSON parse → cache
- Vimeo: `https://vimeo.com/api/oembed.json?url={url}` → 같은 패턴
- Generic fallback: HTML fetch → OG meta (`og:title`, `og:image`) parse → cache

라이브러리: `cheerio` for OG parse. 신규 dependency 1개.

### Storage: R2 (already wired)

기존 R2 SDK 통합 (Phase 1.x). 새 prefix `project-briefs/{project_id}/{uuid}.{ext}`. presigned PUT/GET. 신규 dependency 0.

### Server actions

`app/[locale]/app/projects/[id]/brief/actions.ts`:
- `saveBrief(projectId, contentJson, ifMatchUpdatedAt)` — debounced auto-save (3s)
- `saveVersion(projectId, label?)` — 명시 snapshot
- `restoreVersion(projectId, versionId)` — 복원 (= content_json copy + new version on next save)
- `lockBrief(projectId)` — admin only
- `unlockBrief(projectId)` — admin only
- `uploadAsset(projectId, fileMeta)` → presigned PUT URL + asset_id
- `getAssetUrl(assetId)` → presigned GET URL (RLS check)
- `fetchEmbed(url)` — oEmbed proxy + cache lookup
- `requestYagiProposal(projectId, goal, audience, budget, timeline)` — empty-state CTA

### Real-time? — 안 함 (v1)

Auto-save = optimistic UI + If-Match-Updated-At collision detect (§5.5). Phase 2.9+ Yjs.

---

## §8 — Phased delivery (G_B internal phasing)

### Sub-gate breakdown (worktree 안에서)

| Sub | Scope | Effort |
|---|---|---|
| **G_B-1** | Schema migration (4 tables + thread_kind enum) + RLS + draft-project 패턴 + server actions skeleton | 1.5 day |
| **G_B-2** | TipTap 설치 + 기본 paragraph/heading/list block + 자동 저장 + Optimistic concurrency + **한국어 IME smoke test** + slash command basic menu | 2 day |
| **G_B-3** | Image / File 블록 + browser resize + R2 업로드 wiring + asset 메타 | 1 day |
| **G_B-4** | Embed block (YouTube + Vimeo only + generic OG fallback) + oEmbed proxy + cache + paste loading UX | 1 day |
| **G_B-5** | Version snapshot UX (저장 modal + history sidebar + read-only viewer + 복원) | 1 day |
| **G_B-6** | Comment thread (threads infra reuse) + empty-state YAGI 제안 요청 CTA + lock/unlock flow | 0.5 day |
| **G_B-7** | Wizard Step 3 integration (max-w-4xl Step wrapper) + project detail Brief tab + smoke e2e + **K-05 Codex review (gpt-5.5)** | 1 day |

**총합:** 8 days. **Buffer 0 day** — schedule 빠듯. v1.1 (Phase 2.8.1) 에서 Figma/Behance/Pinterest/Loom embed + GC 추가.

### K-05 Codex review

`.yagi-autobuild/codex-review-protocol.md` 따라 G_B-7 끝, ship 직전 호출. Codex (gpt-5.5) 에게 SPEC.md + diff 보내고 adversarial review. Pass 시 ship, fail 시 fix loop (max 2 회).

### Definition of Done

- [ ] Migration 적용 + RLS 검증 (cross-project access deny test)
- [ ] **TipTap editor 가 Korean IME 환경에서 5분 manual typing — 조합 중 깨짐/입력 누락/double-space 0건**
- [ ] 4개 block type 모두 insert / move / delete / undo 동작
- [ ] R2 upload 성공률 ≥ 95% (5MB 이미지 10번 시도, network 정상)
- [ ] Browser resize: 4K 원본 → 2400px longest-side, file size ≤ 1.5MB
- [ ] Embed YouTube + Vimeo + generic OG fallback 3개 케이스 통과
- [ ] Embed paste loading UX (placeholder swap) — manual smoke
- [ ] Version snapshot 1→2→3 + 복원 + 라벨 검색 + side-by-side toggle
- [ ] Comment thread 메시지 작성 / resolve / mention 알림 발송
- [ ] Empty-state CTA → modal → admin 큐 알림 도착
- [ ] Lock → 편집 시도 시 server action deny 응답
- [ ] Unlock 시 status flip 만, version 안 만들어짐
- [ ] Optimistic concurrency: 두 탭에서 동시 편집 시 한쪽 409 + reload toast
- [ ] tsc clean / lint no new errors / build pass
- [ ] **K-05 Codex review (gpt-5.5) PASS**
- [ ] e2e: Wizard Step 3 에서 텍스트 + 이미지 1장 + YouTube 임베드 1개 입력 → submit → project detail Brief tab 에서 동일 내용 + 새 코멘트 1개 → 다른 user 로 로그인 → 알림 + 코멘트 보임

---

## §9 — Out of scope (deferred)

### → Phase 2.8.1 (v1.1, follow-up worktree, ~3 days)

- **Figma / Behance / Pinterest / Loom embed providers** — provider whitelist 확장
- **Embed cache stale refresh** — background job + 7일 expiry
- **Asset orphan GC** — webhook 또는 nightly cron

### → Phase 2.9

- **Block 단위 inline comment** — `threads.anchor_block_id` 컬럼 + TipTap stable block id
- **True version diff** — JSON diff (visual side-by-side 가 아닌 inline diff)
- **Frame.io 풍 영상 위 timestamp annotation** — Phase 2.7 commission 의 timestamp textarea 와 통합
- **자동 시간 기반 auto-save snapshot** (옵션, 사용자 토글)
- **Slash command 확장** — column / callout / toggle / table / code block
- **글로벌 search 에 brief 본문 인덱싱**
- **비-회원 client share link** — `/s/[token]` 패턴, password 옵션

### → Phase 3.0+

- **Real-time co-editing** — Yjs / Liveblocks
- **AI-assisted brief generation** — goal/audience/budget → first draft block 들 자동 생성
- **Mobile-optimized editor** (v1 은 desktop 우선, mobile 은 read-only fallback)
- **Brief template library** — 카테고리별 (음악비디오 / 광고 / 티저 / etc.) 시작 template

---

## §10 — Risks & open questions

### R1 — TipTap 의존성

ProseMirror upgrade 또는 TipTap breaking change 시 content_json schema 깨질 수 있음. **Mitigation:**
- TipTap 버전 `package.json` 에 정확히 pin (caret 없음)
- `project_briefs.tiptap_schema_version int` 컬럼으로 future migration 식별

### R2 — `projects.brief` legacy column

Phase 2.7.2 wizard `description` field 가 `projects.brief` 에 저장됨. board 와 별개 객체. UI 라벨로 명확 구분 ("프로젝트 설명" vs "기획 보드"). 사용자 혼동 시 v2 에서 통합.

### R3 — File upload size

200MB 제한. 영상은 embed 권장. UI hint: "영상은 YouTube/Vimeo 임베드가 더 가벼워요".

### R4 — Concurrent edit collision

§5.5 의 If-Match-Updated-At + 409 + reload-toast 로 처리. 빈도 낮으면 그대로, 빈도 높으면 Phase 2.9 Yjs 가속.

### R5 — Wizard 중간 이탈 시 draft project 가 남음

Draft-project 패턴의 부작용. 사용자가 wizard 시작 후 닫으면 status='draft' 빈 project 가 `/app/projects` 에 노출됨. **Mitigation v1:**
- `/app/projects` 의 draft project 카드에 "이어서 작성" CTA + "삭제" action
- "비어있는 draft 가 7일 이상 → 자동 archive" cron (Phase 2.8.1)

### R6 — Embed iframe sandbox 호환성

`sandbox="allow-scripts allow-same-origin"` 가 일부 player feature 차단할 수 있음. **Mitigation:** YouTube / Vimeo official embed 는 모두 검증됨. generic fallback 은 iframe 안 쓰고 thumbnail card + external link 만.

### Q1 — Brief Board 가 "wizard step" 인가 "project tab" 인가?

**A:** 두 surface 다. 단 같은 데이터 객체. wizard 진입 시 draft project + brief INSERT. submit = status flip + redirect to project detail Brief tab.

### Q2 — Wizard Step 3 의 너비

**A:** Wizard 컨테이너 max-w-2xl 유지 (Step 1/2/4 와 일관). Step 3 만 자체 wrapper 로 max-w-4xl. 시각 jump 없음 — header + indicator 는 max-w-2xl 컨테이너 안에 머묾.

### Q3 — "v1 저장" 의 v0 (편집 중)

`current_version=0` = "아직 한 번도 명시 저장 안 함". UI 는 "아직 저장 안 됨" 또는 "자동 저장 중" 표시. 첫 명시 저장 = v1.

### Q4 — Locked brief 의 history

Lock 후에도 history 보존 (read-only). lock 자체가 latest 의 freeze. unlock = status flip only, version 안 만듦.

### Q5 — Empty-state CTA 의 YAGI 응답이 어떻게 board 에 들어가나?

**A:** YAGI 가 admin 큐에서 client 의 board 를 직접 열어 일반 collaborative edit (Y3). 첫 fill 시 `project_brief_first_fill` 알림 client 에게 발송.

---

## §11 — Open follow-ups for Phase 2.7.2 cleanup (G_B-1 안에 통합)

이건 Phase 2.8 G_B-1 migration 안에 같이 묶음 (v1 SPEC 은 별도 PR 권장이었지만, schema migration 흐름과 같이 가는 게 효율).

- [ ] `messages/ko.json`, `messages/en.json` 의 `intake_mode_*`, `proposal_*` keys 삭제 (Step 1 picker 제거 후 dead)
- [ ] `messages/*.json` 의 `nav.commission` key 삭제 (sidebar 에서 제거됨)
- [ ] `src/app/[locale]/app/projects/new/actions.ts` 의 `proposalSchema` + `discriminatedUnion` 단순화 (briefSchema 만 남김)
- [ ] `projects.intake_mode` 컬럼 — 모든 새 row 가 'brief'. v1 은 그대로 두고 v2 (Phase 2.9) 에서 deprecation 검토 (NULL 허용 또는 drop)

---

## Appendix A — TipTap content_json shape (예시)

```jsonc
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 1 }, "content": [
      { "type": "text", "text": "여름 캠페인 — 메이의 디지털 트윈" }
    ]},
    { "type": "paragraph", "content": [
      { "type": "text", "text": "타겟: 20–30 도시 거주 여성. 무드: " },
      { "type": "text", "marks": [{ "type": "bold" }], "text": "절제된 럭셔리" },
      { "type": "text", "text": "." }
    ]},
    { "type": "image", "attrs": {
      "asset_id": "11111111-1111-1111-1111-111111111111",
      "alt": "키 비주얼 reference 1"
    }},
    { "type": "embed", "attrs": {
      "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "provider": "youtube",
      "title": "Reference video",
      "thumbnail_url": "https://...",
      "fetched_at": "2026-04-25T12:30:00Z"
    }},
    { "type": "bulletList", "content": [
      { "type": "listItem", "content": [
        { "type": "paragraph", "content": [
          { "type": "text", "text": "납기: 6주 이내 1차 cut" }
        ]}
      ]}
    ]}
  ]
}
```

---

## Appendix B — 새 i18n keys

namespace: `brief_board`

```
title              "기획 보드" / "Brief board"
toolbar_save_v     "v{n} 저장" / "Save v{n}"
toolbar_saving     "자동 저장 중..." / "Auto-saving..."
toolbar_saved      "저장됨" / "Saved"
save_modal_label   "라벨 (선택)" / "Label (optional)"
save_modal_save    "저장" / "Save"
save_conflict      "다른 분이 방금 저장했습니다. 새로고침해 주세요" / "Someone else just saved. Please refresh"
save_conflict_btn  "새로고침" / "Refresh"
history_title      "버전 기록" / "Version history"
history_current    "현재" / "Current"
history_restore    "이 버전으로 복원" / "Restore this version"
history_compare    "현재와 나란히 보기" / "Compare with current"
viewer_banner      "v{n} 보기 — 편집 불가" / "Viewing v{n} — read-only"
viewer_back        "최신으로 돌아가기" / "Back to latest"
empty_title        "기획을 자유롭게 시작해 보세요" / "Start your brief however you like"
empty_skip         "비워두고 시작" / "Skip and continue"
empty_yagi_cta     "YAGI에게 제안 요청" / "Ask YAGI to propose"
yagi_request_modal_title "YAGI에게 방향 제안 요청" / "Request YAGI to propose"
yagi_request_goal_label  "프로젝트의 목표" / "Project goal"
yagi_request_audience_label "주요 타깃" / "Target audience"
yagi_request_budget_label "예산 범위" / "Budget range"
yagi_request_timeline_label "희망 일정" / "Preferred timeline"
yagi_request_submit "보내기" / "Send request"
yagi_request_sent "요청을 보냈어요. YAGI 답변까지 1-2 영업일이 걸려요" / "Request sent. YAGI responds within 1-2 business days"
lock_button        "기획 잠그기 (production 진입)" / "Lock brief (enter production)"
lock_banner        "이 보드는 잠겨 있어요. 변경하려면 admin 에게 요청하세요" / "This board is locked. Contact admin to unlock"
unlock_button      "잠금 해제" / "Unlock"
block_image_alt_ph "이미지 설명" / "Image description"
block_image_uploading "이미지 업로드 중..." / "Uploading image..."
block_file_download "다운로드" / "Download"
block_embed_loading "임베드 불러오는 중..." / "Loading embed..."
block_embed_failed "임베드를 불러올 수 없어요. URL 을 확인해 주세요" / "Could not load embed. Check the URL"
block_embed_unsupported "이 사이트는 아직 임베드를 지원하지 않아요. 링크로 표시됩니다" / "This site is not yet supported for embeds. Showing as link"
asset_too_large_image  "이미지가 50MB 제한을 초과해요" / "Image exceeds 50MB limit"
asset_too_large_file   "파일이 200MB 제한을 초과해요" / "File exceeds 200MB limit"
asset_unsupported  "지원하지 않는 파일 형식이에요" / "Unsupported file type"
slash_menu_heading "제목" / "Heading"
slash_menu_list    "목록" / "List"
slash_menu_image   "이미지" / "Image"
slash_menu_file    "파일" / "File"
slash_menu_embed   "임베드" / "Embed"
```

---

## Decision summary (one-liners) — v2

- **Stack**: TipTap (ProseMirror). cheerio (OG parse). 기존 R2 SDK.
- **Schema**: 새 테이블 4개 (`project_briefs`, `project_brief_versions`, `project_brief_assets`, `embed_cache`) + `threads.kind` enum 1개.
- **Surfaces**: Wizard Step 3 (max-w-4xl 자체 wrapper) + `/app/projects/[id]` Brief tab. 단일 데이터 객체.
- **Draft-project pattern**: wizard 진입 시 status='draft' project + brief 미리 INSERT. submit = status flip.
- **Versioning**: 명시 "v{n} 저장" only. 자동은 Phase 2.9.
- **Concurrency**: If-Match-Updated-At + 409 + reload-toast.
- **Comments**: project-level `threads` 재사용. block 단위 inline = Phase 2.9.
- **Embeds v1**: YouTube + Vimeo + generic OG fallback. Figma/Behance/Pinterest/Loom = Phase 2.8.1.
- **Image**: browser resize longest-side 2400px before R2 PUT.
- **Real-time**: 안 함. Phase 2.9+ Yjs.
- **GC**: v1 안 함. R2 cost 미미. Phase 2.8.1 추가.
- **Step 0 picker 의 inverse**: 빈 보드 empty-state "YAGI 제안 요청" CTA — Phase 2.7.2 의 picker 제거를 product 적으로 closure.
- **Duration**: 8 days, buffer 0. embed v1 scope-cut 으로 1 week 압박 안에 fit.
- **Codex K-05**: G_B-7 끝 ship 직전 호출. fail 시 max 2 fix loop.
